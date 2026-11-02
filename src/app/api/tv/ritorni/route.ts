import { NextResponse } from 'next/server'
import { getTvSupabase } from '@/lib/supabase/server'
import { getSeasons } from '@/lib/tv/tvmaze'

export const maxDuration = 60

// Le serie seguite non concluse: prossima data nota, stagione annunciata senza data,
// ultima puntata andata in onda. Serve a "In arrivo" per le serie ferme da tempo.
export async function GET() {
  const { supabase, user } = await getTvSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()
  const { data: shows, error } = await supabase
    .from('tv_shows')
    .select('id, title, poster, network, show_status, synced_at, tvmaze_id')
    .eq('user_id', user.id)
    .eq('followed', true)
    .or('show_status.is.null,show_status.neq.Ended')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const ids = (shows || []).map((show) => show.id)
  if (!ids.length) return NextResponse.json({ items: [] })

  // Episodi futuri e annunciati senza data: pochi per serie.
  const { data: future } = await supabase
    .from('tv_episodes')
    .select('show_id, season, number, airstamp')
    .eq('user_id', user.id)
    .in('show_id', ids)
    .or(`airstamp.is.null,airstamp.gt.${now}`)
    .order('season')
    .order('number')
    .limit(5000)

  // Ultima puntata andata in onda: una richiesta minima per serie, a gruppi.
  const lastAiredAt = new Map<number, string>()
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20)
    const rows = await Promise.all(
      chunk.map((id) =>
        supabase
          .from('tv_episodes')
          .select('airstamp')
          .eq('user_id', user.id)
          .eq('show_id', id)
          .lte('airstamp', now)
          .order('airstamp', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    )
    rows.forEach(({ data }, index) => data?.airstamp && lastAiredAt.set(chunk[index], data.airstamp))
  }

  // TVmaze non elenca gli episodi di una stagione annunciata senza data: la si vede solo
  // tra le stagioni. Le chiediamo per le serie senza date future, poche alla volta.
  const announced = new Map<number, { season: number; premiere: string | null }>()
  const undated = (shows || []).filter(
    (show) => show.tvmaze_id && !(future || []).some((episode) => episode.show_id === show.id && episode.airstamp)
  )
  for (let i = 0; i < undated.length; i += 8) {
    const chunk = undated.slice(i, i + 8)
    const lists = await Promise.all(chunk.map((show) => getSeasons(show.tvmaze_id as number).catch(() => [])))
    lists.forEach((seasons, index) => {
      const lastAired = lastAiredAt.get(chunk[index].id)?.slice(0, 10)
      const lastSeason = seasons.filter((season) => season.premiereDate && lastAired && season.premiereDate <= lastAired).at(-1)?.number ?? 0
      const fresh = seasons.find((season) => season.number > lastSeason && (!season.premiereDate || season.premiereDate > now))
      if (fresh) announced.set(chunk[index].id, { season: fresh.number, premiere: fresh.premiereDate })
    })
  }

  const items = (shows || []).map((show) => {
    const own = (future || []).filter((episode) => episode.show_id === show.id)
    const next = own
      .filter((episode) => episode.airstamp)
      .sort((a, b) => String(a.airstamp).localeCompare(String(b.airstamp)))[0]
    const fresh = announced.get(show.id)
    const tba = own.find((episode) => !episode.airstamp && (!next || episode.season > next.season))
    return {
      id: show.id,
      title: show.title,
      poster: show.poster,
      network: show.network,
      status: show.show_status,
      synced_at: show.synced_at,
      // Una stagione con la data della premiere ma ancora senza episodi conta come data nota.
      next: next
        ? { season: next.season, number: next.number, airstamp: next.airstamp }
        : fresh?.premiere
          ? { season: fresh.season, number: 1, airstamp: fresh.premiere }
          : null,
      tba_season: tba?.season ?? (fresh && !fresh.premiere ? fresh.season : null),
      last_aired: lastAiredAt.get(show.id) ?? null,
    }
  })
  return NextResponse.json({ items })
}
