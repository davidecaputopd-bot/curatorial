import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { getShowFull } from '@/lib/tv/tvmaze'

// Anteprima di una serie da TVmaze, senza aggiungerla: stagioni, stato e ritorno.
export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  const show = await getShowFull(id)
  if (!show) return NextResponse.json({ error: 'Serie non trovata' }, { status: 404 })

  const now = Date.now()
  const episodes = (show._embedded?.episodes || []).filter((episode) => episode.number !== null)
  const aired = episodes.filter((episode) => episode.airstamp && new Date(episode.airstamp).getTime() <= now)
  const future = episodes
    .filter((episode) => episode.airstamp && new Date(episode.airstamp).getTime() > now)
    .sort((a, b) => String(a.airstamp).localeCompare(String(b.airstamp)))
  const lastAiredSeason = aired.reduce((max, episode) => Math.max(max, episode.season), 0)

  const seasons = (show._embedded?.seasons || []).map((season) => {
    const own = episodes.filter((episode) => episode.season === season.number)
    return {
      number: season.number,
      episodes: own.length || season.episodeOrder || 0,
      aired: aired.filter((episode) => episode.season === season.number).length,
      premiere: season.premiereDate,
      end: season.endDate,
    }
  })
  // Una stagione oltre l'ultima andata in onda, senza episodi datati: annunciata.
  const tba = seasons.find(
    (season) => season.number > lastAiredSeason && season.aired === 0 && !future.some((episode) => episode.season === season.number)
  )

  const { data: mine } = await supabase
    .from('tv_shows')
    .select('id')
    .eq('user_id', user.id)
    .eq('followed', true)
    .eq('tvmaze_id', id)
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    tvmaze_id: show.id,
    title: show.name,
    poster: show.image?.original || show.image?.medium || null,
    network: show.network?.name || show.webChannel?.name || null,
    status: show.status,
    premiered: show.premiered || null,
    genres: show.genres || [],
    summary: show.summary ? show.summary.replace(/<[^>]+>/g, '').trim() : null,
    seasons: seasons.filter((season) => season.episodes > 0 || season.number === tba?.number),
    next: future[0]
      ? { season: future[0].season, number: future[0].number, airstamp: future[0].airstamp }
      : tba?.premiere
        ? { season: tba.number, number: 1, airstamp: tba.premiere }
        : null,
    last_aired: aired.length ? aired[aired.length - 1].airstamp : null,
    tba_season: tba && !tba.premiere ? tba.number : null,
    show_id: mine?.id ?? null,
  })
}
