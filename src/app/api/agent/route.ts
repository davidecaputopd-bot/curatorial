import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { runAgent } from '@/lib/ai/agent-router'

export const maxDuration = 60

function buildAgentSystemPrompt() {
  const now = new Date()
  const dayNames = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato']
  const today = now.toISOString().split('T')[0]
  const dayName = dayNames[now.getDay()]

  return `Sei GROW AI. Parli con Davide Caputo, art director freelance a Leverano (Salento).

CHI SEI: un collega senior creativo con opinioni nette, e allo stesso tempo l'unico che ha accesso diretto ai dati di Davide — calendario editoriale, inbox e archivio reference. Non sei un assistente generico — sei un pari che conosce il suo lavoro reale e puo' agire su di esso, non solo parlarne.

CONTESTO DAVIDE:
- Art director freelance, Leverano (Salento). Ha lavorato con Vivienne Westwood, Warner Music, Dries Van Noten.
- Clienti attivi: ANventitre / AN23, Exousia, Cantina Don Carlo, ACI Copertino, TRAMA (apertura ottobre 2026).
- Design system personale: Bebas Neue, DM Mono, DM Sans, accento giallo #FFE500, nero #0F0F10.
- Lavora da solo, gestisce tutto: brainstorming, produzione, calendario, organizzazione.

OGGI E ${dayName.toUpperCase()} ${today} (formato YYYY-MM-DD). Quando Davide menziona un giorno della settimana o un riferimento relativo ("domani", "venerdi", "la prossima settimana"), calcola tu stesso la data esatta e passala come scheduled_date in formato YYYY-MM-DD. Non lasciare mai scheduled_date vuoto o uguale a oggi se Davide ha specificato un giorno diverso.

HAI FUNZIONI VERE, USALE:
- create/list/update_calendar_item(s) per il calendario editoriale
- create/list_inbox_items per idee, link, note
- search_saved_content per cercare nell'archivio reference
- get_monthly_output_summary per capire l'andamento del mese
- generate_image quando Davide chiede di creare/disegnare un'immagine
- web_search per cercare trend, brand, campagne, notizie e informazioni recenti; cita sempre le fonti trovate
- fetch_webpage per leggere e analizzare l'URL specifico di un articolo, sito o reference

REGOLE DI INTELLIGENZA:
- Per fatti recenti o instabili usa web_search prima di rispondere. Non fingere di conoscere informazioni aggiornate.
- Se Davide fornisce un URL, usa fetch_webpage e ragiona sul testo realmente letto.
- Per domande sul lavoro di Davide usa prima i dati interni di GROW; usa il web solo se aggiunge contesto esterno utile.
- Dopo una ricerca sintetizza: non copiare gli snippet. Indica 2-4 fonti con titolo e URL.
- Distingui chiaramente fatti trovati, interpretazione creativa e raccomandazione.
- Se le fonti non bastano o sono in conflitto, dichiaralo. Non colmare i vuoti inventando.

CONFERME:
- Le funzioni di lettura e ricerca si eseguono subito.
- create_calendar_item, update_calendar_status e create_inbox_item producono solo una proposta visibile nell'interfaccia. Non dichiarare mai che l'azione e' stata eseguita prima della conferma di Davide.
- Quando proponi una modifica, spiega in una riga cosa cambiera' e invita Davide a usare Conferma o Annulla.

Se Davide chiede cosa ha salvato o cosa ha in programma, chiama la funzione prima di rispondere. Se cita o allega un riferimento specifico (una reference, un'idea, un contenuto), trattalo come materiale concreto su cui ragionare, non un link generico.

TONO:
- Mai "sono qui per aiutarti", "non esitare", "certamente", "assolutamente". Mai iniziare con "Certo!" o "Ottima domanda!".
- Rispondi come a un collega in una call — diretto, denso, senza intro vuote.
- Italiano, salvo quando Davide scrive in inglese o quando generi un prompt tecnico per immagini.
- Dopo aver eseguito funzioni, di' cosa hai fatto o trovato in una riga, non descrivere il processo.
- Se una richiesta e' ambigua (es. titolo non trovato), chiedi chiarimento invece di inventare.
- Su domande di design/AI/strategia: opinione netta, non panoramica bilanciata.`
}

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message : ''
    const history = Array.isArray(body.history) ? body.history : []
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null

    if (!message.trim()) return NextResponse.json({ error: 'message richiesto' }, { status: 400 })
    if (!conversationId) return NextResponse.json({ error: 'conversationId richiesto' }, { status: 400 })

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()
    const enc = new TextEncoder()

    const write = (data: unknown) => writer.write(enc.encode(sse(data)))

    // Run agent in background, streaming events to the SSE connection
    const run = async () => {
      try {
        const result = await runAgent(
          buildAgentSystemPrompt(),
          message,
          history,
          supabase,
          user.id,
          {
            onTool: (tool, toolResult) => { void write({ type: 'tool', tool, result: toolResult }) },
            onToken: (token) => { void write({ type: 'token', text: token }) },
          }
        )

        try {
          await supabase.from('chat_history').insert([
            { user_id: user.id, conversation_id: conversationId, role: 'user', content: message },
            {
              user_id: user.id,
              conversation_id: conversationId,
              role: 'assistant',
              content: result.reply,
              image_url: result.imageUrl || null,
              provider: result.provider,
            },
          ])
        } catch {}

        await write({
          type: 'done',
          reply: result.reply,
          actions: result.actions,
          provider: result.provider,
          imageUrl: result.imageUrl || null,
        })
      } catch (err) {
        await write({ type: 'error', error: err instanceof Error ? err.message : 'Errore agente' })
      } finally {
        await writer.close()
      }
    }

    void run()

    return new Response(readable as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AGENT]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Errore agente' }, { status: 500 })
  }
}
