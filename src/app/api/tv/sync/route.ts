import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { syncShows } from '@/lib/tv/sync'
import { sendPush } from '@/lib/tv/push'
import { isAuthorizedCron } from '@/lib/cron-auth'

export const maxDuration = 60

const STALE_HOURS = 20

// Sincronizzazione manuale dalla pagina Serie: poche serie per chiamata,
// prima quelle mai sincronizzate. Il client richiama finché remaining > 0.
export async function POST() {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staleBefore = new Date(Date.now() - STALE_HOURS * 3600_000).toISOString()
  const { data: shows, count } = await supabase
    .from('tv_shows')
    .select('id, user_id, tvmaze_id', { count: 'exact' })
    .eq('user_id', user.id)
    .not('tvmaze_id', 'is', null)
    .or(`synced_at.is.null,and(synced_at.lt.${staleBefore},show_status.neq.Ended)`)
    .order('synced_at', { ascending: true, nullsFirst: true })
    .limit(12)

  const results = await syncShows(supabase, shows || [])
  return NextResponse.json({ synced: results.length, remaining: Math.max((count || 0) - results.length, 0) })
}

// Cron giornaliero (vercel.json): aggiorna le serie in corso e manda le notifiche
// per gli episodi usciti nelle ultime 36 ore e non ancora segnalati.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminSupabaseClient()

  const staleBefore = new Date(Date.now() - STALE_HOURS * 3600_000).toISOString()
  const { data: candidates } = await supabase
    .from('tv_shows')
    .select('id, user_id, tvmaze_id, show_status, synced_at')
    .eq('followed', true)
    .not('tvmaze_id', 'is', null)
    .or(`synced_at.is.null,synced_at.lt.${staleBefore}`)
    .order('synced_at', { ascending: true, nullsFirst: true })
    .limit(500)
  // Le serie mai scaricate vanno sincronizzate almeno una volta, anche se concluse.
  const shows = (candidates || []).filter((show) => !show.synced_at || show.show_status !== 'Ended').slice(0, 60)
  const results = await syncShows(supabase, shows)

  const now = new Date()
  const since = new Date(now.getTime() - 36 * 3600_000).toISOString()
  const { data: fresh } = await supabase
    .from('tv_episodes')
    .select('id, user_id, show_id, season, number, name, tv_shows!inner(title, notify, followed, progress_season, progress_episode)')
    .is('notified_at', null)
    .gte('airstamp', since)
    .lte('airstamp', now.toISOString())
    .eq('tv_shows.followed', true)
    .eq('tv_shows.notify', true)
    .order('season')
    .order('number')

  type Fresh = NonNullable<typeof fresh>[number]
  const byShow = new Map<number, Fresh[]>()
  for (const episode of fresh || []) {
    const show = episode.tv_shows as unknown as { progress_season: number | null; progress_episode: number | null }
    const seen =
      show.progress_season !== null &&
      (episode.season < show.progress_season ||
        (episode.season === show.progress_season && episode.number <= (show.progress_episode ?? 0)))
    if (seen) continue
    byShow.set(episode.show_id, [...(byShow.get(episode.show_id) || []), episode])
  }

  let notified = 0
  for (const [showId, episodes] of byShow) {
    const first = episodes[0]
    const title = (first.tv_shows as unknown as { title: string }).title
    const code = `S${String(first.season).padStart(2, '0')} | E${String(first.number).padStart(2, '0')}`
    const body =
      episodes.length === 1
        ? `${code}${first.name ? ` · ${first.name}` : ''} è disponibile`
        : `${episodes.length} nuovi episodi da ${code}`
    const { sent } = await sendPush(supabase, first.user_id, {
      title,
      body,
      url: `/serie/${showId}`,
      tag: `tv-${showId}`,
    })
    notified += sent
    await supabase
      .from('tv_episodes')
      .update({ notified_at: now.toISOString() })
      .in('id', episodes.map((episode) => episode.id))
      .eq('user_id', first.user_id)
  }

  return NextResponse.json({ synced: results.length, newShows: byShow.size, notified })
}
