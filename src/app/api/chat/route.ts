import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { routeAI, type AIChatMessage } from '@/lib/ai/router'

const SYSTEM_PROMPT = `Sei GROW AI. Parli con Davide Caputo, art director freelance a Leverano (Salento).

CHI SEI: un collega senior creativo con opinioni nette. Non sei un assistente — sei un pari che ha già fatto quello che Davide sta cercando di fare. Quando vedi un errore lo dici. Il tuo istinto è criticare prima di elogiare.

CONTESTO DAVIDE:
- Ha lavorato con Vivienne Westwood, Warner Music, Dries Van Noten
- Vuole costruire un'attività da creative director indipendente in Salento
- Design system personale: Bebas Neue, DM Mono, DM Sans Light, Imperial Crimson #AF0E1E
- Clienti attivi: ANventitre / AN23, Exousia, Cantina Don Carlo, ACI Copertino, Stazione di Posta, Agorà Digitale, TRAMA
- Sta costruendo GROW: app personale visual first per reference, archivio creativo, AI editoriale e piano operativo
- GROW non serve ad accumulare contenuti. Serve a trasformarli in lavoro.

COME DEVI USARE GROW:
- Se Davide passa una reference salvata, trattala come materiale creativo.
- Proponi output concreti: copy, prompt, caroselli, moodboard, brief, piano contenuti.
- Non fare risposte generiche da chatbot.
- Ragiona come un direttore creativo che conosce il suo archivio.

TONO — REGOLE FERREE:
- Mai dire "sono qui per aiutarti", "non esitare", "sono pronto", "certamente", "assolutamente"
- Mai iniziare con "Certo!" o "Ottima domanda!"
- Rispondi come risponderesti a un collega in una call — diretto, senza intro vuote
- Se la domanda è vaga, interpretala e rispondi comunque
- Italiano. Inglese solo se Davide scrive in inglese.
- Risposte dense. Niente padding.

ESEMPI:

Domanda: "come stai?"
SBAGLIATO: "Sto bene, grazie! Come posso aiutarti oggi?"
GIUSTO: "Bene. Cosa c'è?"

Domanda: "idee per il lancio di TRAMA"
SBAGLIATO: "Ecco alcune idee! 1) Social media 2) Evento 3) Collaborazioni..."
GIUSTO: "Il pubblico locale non è il tuo cliente primario ma determina il passaparola. Preview chiusa su invito, 20 persone, niente social prima. Il giorno dopo esplodi con il contenuto."

Domanda su AI o design: opinione netta, non panoramica bilanciata.`

const IMAGE_TRIGGERS = [
  "genera un'immagine",
  'genera immagine',
  'generami',
  "crea un'immagine",
  'crea immagine',
  'disegna',
  'illustra',
  'generate an image',
  'draw',
  'render',
  'foto di ',
  'immagine di ',
]

function isImageRequest(msg: string): boolean {
  const lower = msg.toLowerCase()
  return IMAGE_TRIGGERS.some((trigger) => lower.includes(trigger))
}

async function expandImagePrompt(userPrompt: string): Promise<string> {
  try {
    const result = await routeAI({
      system:
        'You write image prompts for FLUX AI. Natural language only, no keyword lists, no weight syntax. Subject first. Under 60 words. Describe what light DOES. Name camera for photorealism. Write ONLY the prompt. In English. No explanation.',
      message: userPrompt,
      history: [],
      temperature: 0.5,
      maxTokens: 220,
    })

    return result.reply.trim() || userPrompt
  } catch {
    return userPrompt
  }
}

function buildImageUrl(prompt: string): string {
  const params = new URLSearchParams({
    model: 'flux',
    width: '1024',
    height: '1024',
    nologo: 'true',
    seed: String(Math.floor(Math.random() * 999999999)),
  })

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`
}

async function saveHistory(
  supabase: SupabaseClient,
  userId: string,
  rows: { role: string; content: string; image_url?: string; provider?: string; model?: string }[]
) {
  try {
    await supabase.from('chat_history').insert(
      rows.map((row) => ({
        ...row,
        user_id: userId,
      }))
    )
  } catch {}
}

async function getMemories(message: string): Promise<string> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://grow-eight-kappa.vercel.app'}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, action: 'search' }),
    })

    const data = await res.json()

    if (!data.memories?.length) return ''

    const relevant = data.memories.filter((memory: any) => memory.similarity > 0.75)

    if (!relevant.length) return ''

    return '\n\nCONTESTO DA MEMORIA:\n' + relevant.map((memory: any) => `- ${memory.content}`).join('\n')
  } catch {
    return ''
  }
}

async function saveMemory(text: string): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://grow-eight-kappa.vercel.app'}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, action: 'save' }),
    })
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history = [] } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const cleanHistory: AIChatMessage[] = (history || [])
      .filter((item: any) => item?.role && item?.content)
      .map((item: any) => ({
        role: item.role === 'user' ? 'user' : 'assistant',
        content: String(item.content),
      }))

    if (isImageRequest(message)) {
      const expandedPrompt = await expandImagePrompt(message)
      const imageUrl = buildImageUrl(expandedPrompt)
      const reply = `Ecco la tua immagine 🎨\n\n**Prompt:** ${expandedPrompt}`

      await saveHistory(supabase, user.id, [
        { role: 'user', content: message },
        { role: 'assistant', content: reply, image_url: imageUrl, provider: 'pollinations', model: 'flux' },
      ])

      return NextResponse.json({
        type: 'image',
        reply,
        imageUrl,
        provider: 'pollinations',
        model: 'flux',
      })
    }

    const memories = await getMemories(message)

    const routed = await routeAI({
      system: SYSTEM_PROMPT + memories,
      message,
      history: cleanHistory,
      temperature: 0.75,
      maxTokens: 1200,
    })

    const reply = routed.reply

    if (message.length > 100 || reply.length > 200) {
      saveMemory(`Davide ha chiesto: ${message.slice(0, 200)}. Risposta: ${reply.slice(0, 300)}`)
    }

    await saveHistory(supabase, user.id, [
      { role: 'user', content: message },
      {
        role: 'assistant',
        content: reply,
        provider: routed.provider,
        model: routed.model,
      },
    ])

    return NextResponse.json({
      type: 'text',
      reply,
      provider: routed.provider,
      providerLabel: routed.providerLabel,
      model: routed.model,
      mode: routed.mode,
      attempts: routed.attempts,
    })
  } catch (error) {
    console.error('Chat API error:', error)

    return NextResponse.json(
      {
        error: 'Errore interno',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const { user } = await getAuthenticatedSupabase()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ status: 'ok' })
}
