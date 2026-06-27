import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
)

function isImageRequest(msg: string): boolean {
  const triggers = [
    'genera', 'crea', 'disegna', 'immagine', 'foto', 'illustra',
    'generate', 'create', 'draw', 'image', 'picture', 'visual',
    'mostrami', 'show me', 'visualizza', 'dipingi', 'render'
  ]
  const lower = msg.toLowerCase()
  return triggers.some(t => lower.includes(t))
}

async function expandImagePrompt(userPrompt: string): Promise<string> {
  const systemMsg = `Sei un esperto di prompt engineering per generazione immagini AI (FLUX / Stable Diffusion).
Trasforma la richiesta dell'utente in un prompt immagine professionale.

REGOLE:
- Scrivi SOLO il prompt, niente spiegazioni
- Sempre in inglese
- Includi: soggetto, stile visivo, illuminazione, composizione, qualità
- Usa termini tecnici: "cinematic lighting", "shallow depth of field", "8k ultra detailed", ecc.
- Per editoriale/fashion: aggiungi "editorial photography, high fashion, clean background"
- Per paesaggi: aggiungi "golden hour, dramatic sky, architectural photography"
- Per arte: specifica il medium (oil painting, digital art, watercolor, ecc.)
- Massimo 150 parole`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 250,
    temperature: 0.7
  })

  return completion.choices[0]?.message?.content?.trim() || userPrompt
}

function buildImageUrl(expandedPrompt: string): string {
  const params = new URLSearchParams({
    model: 'flux',
    width: '1024',
    height: '1024',
    enhance: 'true',
    nologo: 'true',
    seed: String(Math.floor(Math.random() * 999999999))
  })
  const encoded = encodeURIComponent(expandedPrompt)
  return `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // --- Immagine ---
    if (isImageRequest(message)) {
      const expandedPrompt = await expandImagePrompt(message)
      const imageUrl = buildImageUrl(expandedPrompt)

      const responseText = `Ecco la tua immagine! 🎨\n\n**Prompt:** ${expandedPrompt}`

      await supabase.from('chat_history').insert([
        { role: 'user', content: message },
        { role: 'assistant', content: responseText, image_url: imageUrl }
      ]).catch(() => {})

      return NextResponse.json({
        type: 'image',
        text: responseText,
        imageUrl,
        expandedPrompt
      })
    }

    // --- Testo ---
    const systemPrompt = `Sei GROW AI, assistente personale di Davide Caputo — art director e creative director freelance in Salento.
Tono: diretto, creativo, concreto. Zero fluff. Rispondi in italiano salvo richiesta diversa.
Aiuti con: strategia creativa, copywriting, social media, branding, design, AI generativa, business creativo.`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content
      })),
      { role: 'user' as const, content: message }
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.8
    })

    const responseText = completion.choices[0]?.message?.content || 'Nessuna risposta.'

    await supabase.from('chat_history').insert([
      { role: 'user', content: message },
      { role: 'assistant', content: responseText }
    ]).catch(() => {})

    return NextResponse.json({
      type: 'text',
      text: responseText
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
