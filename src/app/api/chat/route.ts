import { NextResponse } from 'next/server'

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
- Per immagini: una frase introduttiva, poi [GENERA_IMMAGINE: prompt dettagliato in inglese, stile fotografico, lighting, mood, composizione cinematografica]`

function enhancePrompt(prompt: string): string {
  return `${prompt}, editorial photography, cinematic lighting, high resolution, professional color grading, sharp focus, authentic mood, 8K quality`
}

export async function POST(request: Request) {
  const { message, history } = await request.json()
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const groqKey = process.env.GROQ_API_KEY
  const hfToken = process.env.HF_TOKEN
  if (!groqKey) return NextResponse.json({ error: 'No Groq key' }, { status: 500 })

  try {
    const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
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

    if (!chatRes.ok) return NextResponse.json({ error: await chatRes.text() }, { status: 500 })

    const chatData = await chatRes.json()
    const reply = chatData.choices?.[0]?.message?.content || ''

    const match = reply.match(/\[GENERA_IMMAGINE:\s*(.+?)\]/)
    if (match) {
      const enhanced = enhancePrompt(match[1])
      const cleanReply = reply.replace(/\[GENERA_IMMAGINE:.+?\]/, '').trim() || 'Ecco.'

      if (hfToken) {
        try {
          const imgRes = await fetch(
            'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev/v1/text-to-image',
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                inputs: enhanced,
                parameters: { width: 1024, height: 1024, num_inference_steps: 28, guidance_scale: 3.5 },
              }),
            }
          )
          if (imgRes.ok) {
            const buffer = Buffer.from(await (await imgRes.blob()).arrayBuffer())
            const imageUrl = `data:image/png;base64,${buffer.toString('base64')}`
            return NextResponse.json({ reply: cleanReply, imageUrl })
          }
        } catch {}
      }

      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=1024&height=1024&nologo=true&enhance=true&model=flux`
      return NextResponse.json({ reply: cleanReply, imageUrl })
    }

    return NextResponse.json({ reply: reply || 'Nessuna risposta.' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
