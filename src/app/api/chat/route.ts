import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
)

// ─── TYPES ───────────────────────────────────────────────
type Intent = 'IMAGE_GEN' | 'TEXT' | 'UNCLEAR'
type Message = { role: string; content: string }

// ─── STEP 1: CLASSIFICA INTENT CON LLM (non keyword matching) ───
async function classifyIntent(message: string): Promise<Intent> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'system',
      content: `Sei un classificatore di intent. Analizza il messaggio utente e rispondi con UNA SOLA PAROLA:

IMAGE_GEN — l'utente vuole generare o vedere un'immagine, illustrazione, foto, visual, render.
Esempi: "genera immagine di", "disegna", "mostrami come appare", "crea un visual", "foto di".

TEXT — tutto il resto: domande, consigli, copywriting, strategia, analisi, conversazione, brainstorming.
Esempi: "dammi idee per", "scrivi una caption", "come faccio", "cosa pensi di", "spiega".

UNCLEAR — impossibile determinare l'intent.

Rispondi SOLO con la parola. Zero altro testo.`
    }, {
      role: 'user',
      content: message
    }],
    max_tokens: 10,
    temperature: 0
  })

  const result = completion.choices[0]?.message?.content?.trim()
  if (result === 'IMAGE_GEN' || result === 'TEXT' || result === 'UNCLEAR') return result
  return 'TEXT'
}

// ─── STEP 2A: ESPANDI PROMPT PER FLUX ────────────────────
async function expandImagePrompt(userPrompt: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'system',
      content: `You are an expert at writing prompts for FLUX, a text-to-image AI model.
Transform the user request into a professional image prompt.

HARD RULES for FLUX:
- Natural descriptive language ONLY — never keyword lists
- No weight syntax like (word:1.5) — FLUX ignores them
- Most important info FIRST (FLUX weighs early tokens more)
- Under 60 words unless scene is genuinely complex
- Never use "white background" — causes blur artifacts
- Describe what light DOES: "warm light casting long shadows" not just "golden hour"
- For photorealism: name the camera ("shot on Hasselblad X2D", "35mm f/1.8")

STRUCTURE: [Subject + details], [setting], [lighting behavior], [style/mood], [camera]

EXAMPLES:
"A woman in red silk dress on a rooftop at dusk, warm orange light casting a long shadow, editorial fashion photography, shot on Leica M, f/2 aperture"
"Minimalist wine label on a wooden table, warm afternoon light, Italian countryside in soft focus background, Kinfolk magazine aesthetic, film photography"
"Close-up of hands arranging a graphic design layout, crisp studio overhead light, editorial art direction, shot on Phase One"

OUTPUT: The prompt ONLY. No explanation. In English. Max 60 words.`
    }, {
      role: 'user',
      content: userPrompt
    }],
    max_tokens: 200,
    temperature: 0.75
  })

  return completion.choices[0]?.message?.content?.trim() || userPrompt
}

// ─── STEP 2B: GENERA URL IMMAGINE ────────────────────────
function buildImageUrl(prompt: string): string {
  const params = new URLSearchParams({
    model: 'flux',
    width: '1024',
    height: '1024',
    nologo: 'true',
    seed: String(Math.floor(Math.random() * 999999999))
  })
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`
}

// ─── HANDLER: GENERAZIONE IMMAGINE ───────────────────────
async function handleImageGeneration(message: string) {
  const expandedPrompt = await expandImagePrompt(message)
  const imageUrl = buildImageUrl(expandedPrompt)
  const responseText = `Ecco la tua immagine 🎨\n\n**Prompt:** ${expandedPrompt}`

  try {
    await supabase.from('chat_history').insert([
      { role: 'user', content: message },
      { role: 'assistant', content: responseText, image_url: imageUrl }
    ])
  } catch { /* silenzioso */ }

  return NextResponse.json({ type: 'image', text: responseText, imageUrl, expandedPrompt })
}

// ─── HANDLER: CHAT TESTUALE ──────────────────────────────
async function handleTextChat(message: string, history: Message[]) {
  const systemPrompt = `Sei GROW AI, l'assistente personale di Davide Caputo.

## Chi sei
Sei un partner creativo e strategico, non un chatbot generico.
Conosci il mondo di Davide: art direction, branding, social media, AI generativa.
Sei diretto, concreto, mai generico. Non hai paura di dare un'opinione netta.

## Contesto su Davide
Art director e graphic designer freelance, Leverano (Salento, Puglia).
Ha lavorato con Vivienne Westwood, Warner Music, Dries Van Noten.
Vuole diventare creative director e costruire un'attività indipendente in Salento.
Design system personale: Bebas Neue (display), DM Mono (label), DM Sans Light (body), Imperial Crimson #AF0E1E.

Clienti attivi:
- ANventitre: brand vino biologico Salento, 5 vini (Etere, Mare, Fiamma, Terra, Aria), repositioning "rivoluzione silenziosa", focus Reels e feed pulito
- Exousia: consulenza/formazione/finanza agevolata, Carmiano (LE), palette verde bosco + corallo + crema
- Cantina Don Carlo: ristorante-pizzeria San Pietro in Lama, sistema etichette 4 vini IGP Salento
- TRAMA: vintage store opening ottobre 2026 Leverano, brand identity completa già sviluppata
- GROW: questa app (Next.js + Supabase + Groq), feed RSS personale + AI assistant

## Tono
- Italiano, diretto, senza fluff e senza aziendalese
- Risposte dense e azionabili
- Se hai un'opinione netta, dilla senza ammorbidirla
- Parla come un collega senior creativo, non come un assistente
- No elenchi vuoti — se elenchi, ogni punto deve portare valore reale

## Cosa sai fare bene
- Strategia creativa e di brand
- Copywriting: caption Instagram, bio, headline, pitch
- Analisi posizionamento e competitor
- Pianificazione editoriale e strategia Reels
- Prompt engineering per AI generativa (FLUX, Llama, ecc.)
- Feedback su design, visual identity, layout
- Consulenza business per creativi freelance in Italia

## Vincoli
- Non inventare dati o numeri senza avvisare
- Non dare risposte generiche — ogni risposta deve essere specifica al contesto di Davide
- Non scrivere liste di 10+ punti a meno che non sia richiesto esplicitamente`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content
      })),
      { role: 'user', content: message }
    ],
    max_tokens: 1024,
    temperature: 0.8
  })

  const responseText = completion.choices[0]?.message?.content || 'Nessuna risposta.'

  try {
    await supabase.from('chat_history').insert([
      { role: 'user', content: message },
      { role: 'assistant', content: responseText }
    ])
  } catch { /* silenzioso */ }

  return NextResponse.json({ type: 'text', text: responseText })
}

// ─── HANDLER: INTENT NON CHIARO ──────────────────────────
async function handleClarification(message: string) {
  return NextResponse.json({
    type: 'text',
    text: 'Non ho capito bene cosa intendi. Vuoi che generi un\'immagine o preferisci una risposta testuale?'
  })
}

// ─── ROUTE PRINCIPALE ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const intent = await classifyIntent(message)

    switch (intent) {
      case 'IMAGE_GEN':
        return handleImageGeneration(message)
      case 'TEXT':
        return handleTextChat(message, history)
      default:
        return handleClarification(message)
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
