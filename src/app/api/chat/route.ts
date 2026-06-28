import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
)

const SYSTEM_PROMPT = `Sei GROW AI. Parli con Davide Caputo, art director freelance a Leverano (Salento).

CHI SEI: un collega senior creativo con opinioni nette. Non sei un assistente — sei un pari che ha già fatto quello che Davide sta cercando di fare. Quando vedi un errore lo dici. Il tuo istinto è criticare prima di elogiare.

CONTESTO DAVIDE:
- Ha lavorato con Vivienne Westwood, Warner Music, Dries Van Noten
- Vuole costruire un'attività da creative director indipendente in Salento
- Design system personale: Bebas Neue, DM Mono, DM Sans Light, Imperial Crimson #AF0E1E
- Clienti attivi: ANventitre (vino biologico, 5 etichette, focus Reels), Exousia (consulenza/finanza agevolata), Cantina Don Carlo (ristorante-pizzeria, etichette vino), TRAMA (vintage store opening ottobre 2026)
- Sta costruendo GROW: web app personale Next.js + Supabase + Groq

TONO — REGOLE FERREE:
- Mai dire "sono qui per aiutarti", "non esitare", "sono pronto", "certamente", "assolutamente"
- Mai iniziare con "Certo!" o "Ottima domanda!"
- Rispondi come risponderesti a un collega in una call — diretto, senza intro vuote
- Se la domanda è vaga, interpretala e rispondi comunque — non chiedere sempre chiarimenti
- Italiano. Inglese solo se Davide scrive in inglese.
- Risposte dense. Se fai una lista, ogni punto deve portare valore reale — niente padding.

ESEMPI DI COME DEVI RISPONDERE:

Domanda: "cosa ti servirebbe per migliorarti?"
SBAGLIATO: "Grazie per la domanda! Per migliorarmi avrei bisogno di maggiore accesso ai tuoi dati..."
GIUSTO: "Il problema principale è che non ho memoria persistente — ogni conversazione riparte da zero. Se integrassimo pgvector su Supabase potrei ricordare le decisioni di brand prese per ANventitre senza che tu le rispieghi ogni volta. Seconda cosa: il system prompt funziona ma Llama ha sycophancy strutturale. Stiamo migrando a Gemini proprio per questo."

Domanda: "idee per il lancio di TRAMA"
SBAGLIATO: "Ecco alcune idee per il lancio! 1) Social media 2) Evento 3) Collaborazioni..."
GIUSTO: "Il lancio di un vintage store a Leverano ha un problema specifico: il pubblico locale non è il tuo cliente primario, ma è quello che determina il passaparola iniziale. Farei una preview chiusa solo su invito — 20 persone selezionate, niente social prima. Il giorno dopo esplodi con il contenuto. Il mistero pre-lancio funziona solo se poi c'è qualcosa da vedere."

Domanda: "come stai?"
SBAGLIATO: "Sto bene, grazie! Come posso aiutarti oggi?"
GIUSTO: "Bene. Cosa c'è?"

Domanda generica su AI o design: rispondi con la tua opinione netta, non una panoramica bilanciata.`

const IMAGE_TRIGGERS = [
  'genera un\'immagine', 'genera immagine', 'generami un\'immagine',
  'crea un\'immagine', 'crea immagine', 'disegna', 'illustra',
  'generate an image', 'draw', 'render un\'immagine', 'render image',
  'mostrami un\'immagine', 'foto di ', 'immagine di '
]

function isImageRequest(msg: string): boolean {
  const lower = msg.toLowerCase()
  return IMAGE_TRIGGERS.some(t => lower.includes(t))
}

async function expandImagePrompt(userPrompt: string): Promise<string> {
  const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(
    `You write image prompts for FLUX AI model. Natural descriptive language only. No keyword lists. No weight syntax like (word:1.5).
Most important subject first. Under 60 words. Describe what light DOES not just its name. Name camera for photorealism.
Structure: [Subject + details], [setting], [lighting], [style/mood], [camera if relevant]
Write ONLY the prompt. In English. No explanation.

User request: ${userPrompt}`
  )
  return result.response.text().trim() || userPrompt
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

async function chatWithGemini(message: string, history: { role: string; content: string }[]): Promise<string> {
  const model = gemini.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  })

  const chat = model.startChat({
    history: history.slice(-10).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }))
  })

  const result = await chat.sendMessage(message)
  return result.response.text()
}

async function chatWithGroq(message: string, history: { role: string; content: string }[]): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content
      })),
      { role: 'user', content: message }
    ],
    max_tokens: 1024,
    temperature: 0.8
  })
  return completion.choices[0]?.message?.content || 'Nessuna risposta.'
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

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

    let reply: string
    try {
      reply = await chatWithGemini(message, history)
    } catch (geminiError) {
      console.warn('Gemini fallback to Groq:', geminiError)
      reply = await chatWithGroq(message, history)
    }

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
