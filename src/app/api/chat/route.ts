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
  return triggers.some(t => msg.toLowerCase().includes(t))
}

async function expandImagePrompt(userPrompt: string): Promise<string> {
  const systemMsg = `You are an expert at writing prompts for FLUX, a text-to-image AI model.

FLUX is fundamentally different from Stable Diffusion. Follow these rules strictly:

FLUX RULES:
- Write in natural, descriptive language — NOT keyword lists
- Never use weight syntax like (word:1.5) or (emphasis)++ — FLUX ignores them
- Put the most important information FIRST (subject, then context, then style)
- Keep prompts under 50 words unless the scene is truly complex
- Use phrases like "with emphasis on" or "focus on" instead of weights
- Never use "white background" — it causes blur in FLUX
- Describe lighting by what it DOES, not just its name
- For photorealism: mention the camera/lens ("shot on Hasselblad", "35mm lens", "f/1.8 aperture")

STRUCTURE: [Subject + key details], [setting/context], [lighting], [style/mood], [camera if relevant]

EXAMPLES:
- "A woman in a red silk dress standing on a rooftop at dusk, warm orange light casting a long shadow, editorial fashion photography, shot on Leica M, f/2 aperture"
- "Minimalist creative studio interior, concrete floors and tall windows, soft diffused daylight, calm professional atmosphere, Kinfolk magazine aesthetic"
- "Close-up of a glass of red wine on a wooden table outdoors, warm afternoon light, vineyard in soft focus background, film photography"

OUTPUT: Write ONLY the prompt. No explanations. In English. Max 60 words.`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 200,
    temperature: 0.75
  })

  return completion.choices[0]?.message?.content?.trim() || userPrompt
}

function buildImageUrl(expandedPrompt: string): string {
  const params = new URLSearchParams({
    model: 'flux',
    width: '1024',
    height: '1024',
    nologo: 'true',
    seed: String(Math.floor(Math.random() * 999999999))
  })
  const encoded = encodeURIComponent(expandedPrompt)
  return `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`
}

async function saveToHistory(rows: { role: string; content: string; image_url?: string }[]) {
  try {
    await supabase.from('chat_history').insert(rows)
  } catch {
    // non bloccare se fallisce
  }
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

      await saveToHistory([
        { role: 'user', content: message },
        { role: 'assistant', content: responseText, image_url: imageUrl }
      ])

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

    await saveToHistory([
      { role: 'user', content: message },
      { role: 'assistant', content: responseText }
    ])

    return NextResponse.json({ type: 'text', text: responseText })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
