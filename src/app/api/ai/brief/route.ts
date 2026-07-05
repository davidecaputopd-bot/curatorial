import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { routeAI } from '@/lib/ai/router'

type CalendarRow = {
  title: string
  client: string
  status: string
  scheduled_date?: string | null
  notes?: string | null
}

type DailyBrief = {
  focus: string
  risk: string
  opportunity: string
  prompt: string
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function fallbackBrief(items: CalendarRow[]): DailyBrief {
  const today = dateKey(new Date())
  const open = items.filter((item) => item.status !== 'pubblicato')
  const urgent = open.find(
    (item) => item.scheduled_date && item.scheduled_date <= today
  )
  const active = open.find(
    (item) => item.status === 'in_produzione' || item.status === 'pronto'
  )
  const focusItem = urgent || active || open[0]

  return {
    focus: focusItem
      ? `${focusItem.title} · ${focusItem.client}`
      : 'Scegli un lavoro concreto da far avanzare oggi.',
    risk: urgent
      ? `“${urgent.title}” è arrivato alla data prevista e non risulta pubblicato.`
      : 'Nessuna urgenza evidente nei dati disponibili.',
    opportunity: active
      ? `Puoi chiudere o far avanzare “${active.title}” prima di aprire altro.`
      : 'Usa una nota Inbox come punto di partenza, senza organizzare tutto.',
    prompt: focusItem
      ? `Aiutami a far avanzare oggi questo lavoro: ${focusItem.title} per ${focusItem.client}.`
      : 'Aiutami a scegliere la priorità creativa più utile per oggi.',
  }
}

function parseBrief(value: string, fallback: DailyBrief): DailyBrief {
  try {
    const match = value.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match?.[0] || value) as Partial<DailyBrief>
    return {
      focus: typeof parsed.focus === 'string' ? parsed.focus : fallback.focus,
      risk: typeof parsed.risk === 'string' ? parsed.risk : fallback.risk,
      opportunity:
        typeof parsed.opportunity === 'string'
          ? parsed.opportunity
          : fallback.opportunity,
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : fallback.prompt,
    }
  } catch {
    return fallback
  }
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [calendarResult, inboxResult, memoriesResult] = await Promise.all([
    supabase
      .from('calendar_items')
      .select('title, client, status, scheduled_date, notes')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .limit(24),
    supabase
      .from('inbox_items')
      .select('content, url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('memories')
      .select('content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const calendar = (calendarResult.data || []) as CalendarRow[]
  const fallback = fallbackBrief(calendar)
  const context = JSON.stringify({
    date: dateKey(new Date()),
    calendar,
    recent_inbox: inboxResult.data || [],
    confirmed_memories: memoriesResult.data || [],
  })

  try {
    const result = await routeAI({
      taskType: 'strategy',
      temperature: 0.2,
      maxTokens: 500,
      system: `Sei il direttore operativo personale di Davide. Produci il briefing di oggi usando esclusivamente i dati forniti.
Scegli un solo focus concreto. Segnala un rischio reale, non generico. Trova una piccola opportunita' utile.
Non inventare clienti, date o lavori. Output SOLO JSON valido:
{"focus":"...","risk":"...","opportunity":"...","prompt":"prompt pronto da inviare a GROW AI"}`,
      message: context,
    })

    return NextResponse.json({
      ok: true,
      brief: parseBrief(result.reply, fallback),
      source: 'ai',
    })
  } catch {
    return NextResponse.json({ ok: true, brief: fallback, source: 'fallback' })
  }
}
