import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
)

const IMAGE_TRIGGERS = [
  'genera', 'generami', 'crea un\'immagine', 'crea immagine', 'disegna',
  'illustra', 'generate', 'draw', 'render', 'mostrami un\'immagine',
  'foto di', 'immagine di', 'visual di'
]

function isImageRequest(msg: string): boolean {
  const lower = msg.toLowerCase()
  return IMAGE_TRIGGERS.some(t => lower.includes(t))
}

async function expandImagePrompt(userPrompt: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'system',
      content: `You write prompts for FLUX image model. Natural language only, no keyword lists, no weight syntax.
Most important info first. Under 60 words. Describe what light DOES. Name camera for photorealism.
Structure: [Subject + details], [setting], [lighting behavior], [style/mood], [camera]
Output ONLY the prompt. In English.`
    }, {
      role: 'user', content: userPrompt
    }],
    max_tokens: 150,
    temperature: 0.7
  })
  return completion.choices[0]?.message?.content?.trim() || userPrompt
}

function buildImageUrl(prompt: string): string {
  const params = new URLSearchParams({
    model: 'flux', width: '1024', height: '1024',
    nologo: 'true', seed: String(Math.floor(Math.random() * 999999999))
  })
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`
}

async function saveHistory(rows: { role: string; content: string; image_url?: string }[]) {
  try { await supabase.from('chat_history').insert(rows) } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    // IMAGE
    if (isImageRequest(message)) {
      const expandedPrompt = await expandImagePrompt(message)
      const imageUrl = buildImageUrl(expandedPrompt)
      const reply = `Ecco la tua immagine 🎨\n\n**Prompt:** ${expandedPrompt}`
      await saveHistory([
        { role: 'user', content: message },
        { role: 'assistant', content: reply, image_url: imageUrl }
      ])
      return NextResponse.json({ type: 'image', reply, imageUrl })
    }

    // TEXT
    const systemPrompt = `Sei GROW AI, assistente personale di Davide Caputo — art director freelance, Leverano (Salento).
Ha lavorato con Vivienne Westwood, Warner Music, Dries Van Noten. Vuole costruire un'attività da creative director indipendente.

Clienti attivi: ANventitre (vino biologico Salento, 5 etichette, focus Reels), Exousia (consulenza/finanza agevolata, Carmiano), Cantina Don Carlo (ristorante-pizzeria, etichette vino), TRAMA (vintage store opening ottobre 2026 Leverano).

Tono: diretto, creativo, concreto. Zero fluff. Parla come un collega senior, non come un assistente. Rispondi in italiano. Risposte dense e azionabili, no elenchi vuoti.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map((h: { role: string; content: string }) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content
        })),
        { role: 'user', content: message }
      ],
      max_tokens: 1024,
      temperature: 0.8
    })

    const reply = completion.choices[0]?.message?.content || 'Nessuna risposta.'
    await saveHistory([
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    ])
    return NextResponse.json({ type: 'text', reply })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
