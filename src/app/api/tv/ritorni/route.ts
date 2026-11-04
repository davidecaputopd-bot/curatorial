import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

// Le serie seguite non concluse con il loro ritorno, calcolato dal sync notturno.
// Serve a "In arrivo" per le serie ferme da tempo.
export async function GET() {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()
  const { data: shows, error } = await supabase
    .from('tv_shows')
    .select('id, title, poster, network, show_status, last_aired_at, return_season, return_date')
    .eq('user_id', user.id)
    .eq('followed', true)
    .or('show_status.is.null,show_status.neq.Ended')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const ids = (shows || []).map((show) => show.id)
  if (!ids.length) return NextResponse.json({ items: [] })

  // Il prossimo episodio datato, anche a metà stagione (le pause invernali).
  const { data: future } = await supabase
    .from('tv_episodes')
    .select('show_id, season, number, airstamp')
    .eq('user_id', user.id)
    .in('show_id', ids)
    .gt('airstamp', now)
    .order('airstamp')
    .limit(5000)

  const items = (shows || []).map((show) => {
    const next = (future || []).find((episode) => episode.show_id === show.id)
    return {
      id: show.id,
      title: show.title,
      poster: show.poster,
      network: show.network,
      status: show.show_status,
      next: next
        ? { season: next.season, number: next.number, airstamp: next.airstamp }
        : show.return_season && show.return_date
          ? { season: show.return_season, number: 1, airstamp: show.return_date }
          : null,
      tba_season: show.return_season && !show.return_date ? show.return_season : null,
      last_aired: show.last_aired_at,
    }
  })
  return NextResponse.json({ items })
}
