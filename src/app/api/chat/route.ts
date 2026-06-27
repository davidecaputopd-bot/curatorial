import { NextResponse } from 'next/server'

export const maxDuration = 60

const SYSTEM = `Sei un assistente creativo specializzato in: grafica, comunicazione visiva, art direction, moda, design editoriale, social media, branding, AI generativa, prompting, stampa 3D, arredamento, scenografia, marketing creativo.

COME RISPONDI:
- Italiano sempre salvo richiesta
- Diretto e immediatamente utilizzabile — niente intro né conclusioni
- Copy e caption: scrivi subito senza spiegazioni
- Hook Reels: 3 varianti (provocazione, domanda, dato concreto)
- Idee: 3 concrete non 10 vaghe
- Prompt AI: ottimizzati, tecnici, pronti all'uso
- Mai: autentico, storytelling, straordinario, percorso, viaggio, ecosistema
- Mai liste infinite
- Per immagini: una frase introduttiva concisa, poi obbligatoriamente [GENERA_IMMAGINE: prompt dettagliato in inglese, stile fotografico preciso, lighting specifico, mood, composizione, riferimenti estetici]`

function buildImageUrl(prompt: string): string {
  const enhanced = `${prompt}, editorial photography, cinematic lighting, high resolution, professional color grading, sharp focus, film grain, 8K quality`
  const encoded = encodeURIComponent(enhanced)
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true&model=flux&seed=${Math.floor(Math.random() * 999999)}`
}

export async function POST(request: Request) {
  const { message, history } = await request.json()
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return NextResponse.json({ error: 'No Groq key' }, { status: 500 })

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.82,
        messages: [
          { role: 'system', content: SYSTEM },
          ...(history || []).slice(-12).map((m: any) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
    })

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || ''

    const match = reply.match(/\[GENERA_IMMAGINE:\s*([\s\S]+?)\]/)
    if (match) {
      const imageUrl = buildImageUrl(match[1].trim())
      const cleanReply = reply.replace(/\[GENERA_IMMAGINE:[\s\S]+?\]/, '').trim() || 'Ecco.'
      return NextResponse.json({ reply: cleanReply, imageUrl })
    }

    return NextResponse.json({ reply: reply || 'Nessuna risposta.' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
