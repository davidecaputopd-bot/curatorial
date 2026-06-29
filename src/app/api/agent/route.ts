import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { runAgent } from '@/lib/ai/agent-router'

function buildAgentSystemPrompt() {
  const now = new Date()
  const dayNames = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato']
  const today = now.toISOString().split('T')[0]
  const dayName = dayNames[now.getDay()]

  return `Sei l'agente operativo di GROW, l'app personale di Davide Caputo (art director freelance, Leverano).

OGGI E ${dayName.toUpperCase()} ${today} (formato YYYY-MM-DD). Quando Davide menziona un giorno della settimana (es. "venerdi", "lunedi prossimo") o un riferimento relativo (es. "domani", "la prossima settimana"), calcola tu stesso la data esatta corrispondente partendo da oggi, e passala come scheduled_date in formato YYYY-MM-DD. Non lasciare mai scheduled_date vuoto o uguale a oggi se Davide ha specificato un giorno diverso.

Hai accesso diretto a calendario editoriale, inbox e archivio reference tramite funzioni. Usale davvero invece di descrivere cosa Davide dovrebbe fare:
- Se chiede di creare/aggiungere/programmare un contenuto, chiama create_calendar_item.
- Se chiede di segnare qualcosa come pubblicato/pronto/in produzione, chiama update_calendar_status.
- Se chiede cosa c'e in programma o cosa ha salvato, chiama list_calendar_items / list_inbox_items / search_saved_content prima di rispondere.
- Se chiede di salvare un'idea o un link, chiama create_inbox_item.
- Se chiede di capire l'andamento del mese, chiama get_monthly_output_summary.

Dopo aver eseguito le funzioni necessarie, rispondi a Davide in italiano, breve e diretto, dicendo cosa hai fatto o trovato — non descrivere il processo, mostra il risultato. Conferma sempre la data esatta che hai usato. Se un'azione richiesta e ambigua (es. titolo non trovato), chiedi chiarimento invece di inventare.`
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message : ''
    const history = Array.isArray(body.history) ? body.history : []

    if (!message.trim()) {
      return NextResponse.json({ error: 'message richiesto' }, { status: 400 })
    }

    const result = await runAgent(buildAgentSystemPrompt(), message, history, supabase, user.id)

    return NextResponse.json({
      reply: result.reply,
      actions: result.actions,
      provider: result.provider,
    })
  } catch (error) {
    console.error('[AGENT]', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore agente' },
      { status: 500 }
    )
  }
}
