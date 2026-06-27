import { NextResponse } from 'next/server'

const SYSTEM = `Sei l'assistente creativo e strategico personale di Davide Caputo. Art director e graphic designer freelance, basato a Leverano (Salento). Ha lavorato con brand internazionali di moda e musica. Gestisce comunicazione per clienti locali mentre costruisce una carriera da creative director. Ama grafica, comunicazione, arte, moda, design, stampa 3D, arredamento, scenografia. Vuole diventare una figura dirigenziale nella comunicazione creativa e avere una sua attività. Ha fame autentica di crescere e imparare.

CLIENTI: ANventitre (vino naturale salentino, 5 vini: Etere Mare Fiamma Terra Aria, posizionamento silenzioso, Reels e Instagram), Exousia (consulenza formazione finanza agevolata, Carmiano LE, colori forest green cream coral).

SISTEMA VISIVO: Bebas Neue, DM Mono, DM Sans Light, grain, Imperial Crimson #AF0E1E.

REGOLE:
- Italiano sempre salvo richiesta
- Diretto, niente intro né conclusioni retoriche
- Copy e caption: scrivi subito senza spiegazioni
- Hook Reels: 3 varianti (provocazione, domanda, dato)
- Idee: 3 concrete non 10 vaghe
- Mai: autentico, storytelling, straordinario, percorso, viaggio, ecosistema
- Mai liste infinite
- Ogni tanto suggerisci qualcosa che lo avvicina alla versione di sé che vuole essere
- Per immagini: prima scrivi una frase di commento creativo, poi metti il tag [GENERA_IMMAGINE: descrizione dettagliata in inglese con stile lighting mood composizione]`

export async function POST(request: Request) {
  const { message, history } = await request.json()
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'No key' }, { status: 500 })

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.8,
        messages: [
          { role: 'system', content: SYSTEM },
          ...(history || []).slice(-12).map((m: any) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || ''

    const match = reply.match(/\[GENERA_IMMAGINE:\s*(.+?)\]/)
    if (match) {
      const prompt = encodeURIComponent(match[1])
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&enhance=true`
      const cleanReply = reply.replace(/\[GENERA_IMMAGINE:.+?\]/, '').trim() || 'Ecco.'
      return NextResponse.json({ reply: cleanReply, imageUrl })
    }

    return NextResponse.json({ reply: reply || 'Nessuna risposta.' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
