import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { runAgent } from '@/lib/ai/agent-router'

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

Se Davide chiede cosa ha salvato, cosa ha in programma, o ti chiede di modificare qualcosa, chiama la funzione prima di rispondere — non descrivere cosa dovrebbe fare lui, fallo. Se cita o allega un riferimento specifico (una reference, un'idea, un contenuto), trattalo come materiale concreto su cui ragionare, non un link generico.

TONO:
- Mai "sono qui per aiutarti", "non esitare", "certamente", "assolutamente". Mai iniziare con "Certo!" o "Ottima domanda!".
- Rispondi come a un collega in una call — diretto, denso, senza intro vuote.
- Italiano, salvo quando Davide scrive in inglese o quando generi un prompt tecnico per immagini.
- Dopo aver eseguito funzioni, di' cosa hai fatto o trovato in una riga, non descrivere il processo.
- Se una richiesta e' ambigua (es. titolo non trovato), chiedi chiarimento invece di inventare.
- Su domande di design/AI/strategia: opinione netta, non panoramica bilanciata.`
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message : ''
    const history = Array.isArray(body.history) ? body.history : []
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null

    if (!message.trim()) {
      return NextResponse.json({ error: 'message richiesto' }, { status: 400 })
    }
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId richiesto' }, { status: 400 })
    }

    const result = await runAgent(buildAgentSystemPrompt(), message, history, supabase, user.id)

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

    return NextResponse.json({
      reply: result.reply,
      actions: result.actions,
      provider: result.provider,
      imageUrl: result.imageUrl,
    })
  } catch (error) {
    console.error('[AGENT]', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore agente' },
      { status: 500 }
    )
  }
}
