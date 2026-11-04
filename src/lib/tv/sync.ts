import type { SupabaseClient } from '@supabase/supabase-js'
import { getEpisodes, getShowWithSeasons, type TvmazeEpisode, type TvmazeShowFull } from './tvmaze'

type ShowRow = { id: number; user_id: string; tvmaze_id: number | null }

// La prossima stagione nuova: quella che TVmaze conosce dopo l'ultima andata in onda,
// con la data del primo episodio o della premiere se c'è. Le concluse non tornano.
export function computeReturn(info: TvmazeShowFull | null, episodes: TvmazeEpisode[], now = Date.now()) {
  const aired = episodes.filter((episode) => episode.airstamp && new Date(episode.airstamp).getTime() <= now)
  const lastAiredAt = aired.reduce<string | null>(
    (latest, episode) => (!latest || (episode.airstamp as string) > latest ? (episode.airstamp as string) : latest),
    null
  )
  if (!info || info.status === 'Ended') return { last_aired_at: lastAiredAt, return_season: null, return_date: null }

  const lastSeason = aired.reduce((max, episode) => Math.max(max, episode.season), 0)
  const season =
    info._embedded?.seasons?.find((item) => item.number > lastSeason)?.number ??
    episodes.find((episode) => episode.season > lastSeason)?.season ??
    null
  const firstEpisode = episodes
    .filter((episode) => episode.season === season && episode.airstamp)
    .sort((a, b) => String(a.airstamp).localeCompare(String(b.airstamp)))[0]
  const premiere = info._embedded?.seasons?.find((item) => item.number === season)?.premiereDate
  return {
    last_aired_at: lastAiredAt,
    return_season: season,
    return_date: firstEpisode?.airstamp || (premiere ? `${premiere}T00:00:00Z` : null),
  }
}

export const returnKey = (row: { return_season: number | null; return_date: string | null }) =>
  row.return_season ? `${row.return_season}:${row.return_date?.slice(0, 10) ?? 'tba'}` : ''

// Scarica episodi e stato aggiornati da TVmaze per una serie e li salva.
export async function syncShow(supabase: SupabaseClient, show: ShowRow) {
  if (!show.tvmaze_id) return 0
  const [info, episodes] = await Promise.all([
    getShowWithSeasons(show.tvmaze_id),
    getEpisodes(show.tvmaze_id),
  ])

  if (episodes.length) {
    const rows = episodes.map((episode) => ({
      id: episode.id,
      user_id: show.user_id,
      show_id: show.id,
      season: episode.season,
      number: episode.number as number,
      name: episode.name,
      airstamp: episode.airstamp,
      runtime: episode.runtime,
      image: episode.image?.medium || null,
    }))
    // notified_at non è nelle righe: l'upsert non lo azzera.
    const { error } = await supabase
      .from('tv_episodes')
      .upsert(rows, { onConflict: 'user_id,id' })
    if (error) throw new Error(error.message)
  }

  const comeback = computeReturn(info, episodes)
  // La prima volta registra il ritorno senza notificarlo: avvisa solo delle novità.
  const { data: current } = await supabase.from('tv_shows').select('return_notified').eq('id', show.id).single()

  const { error } = await supabase
    .from('tv_shows')
    .update({
      synced_at: new Date().toISOString(),
      ...comeback,
      ...(current && current.return_notified === null ? { return_notified: returnKey(comeback) } : {}),
      ...(info
        ? {
            show_status: info.status,
            poster: info.image?.medium || null,
            network: info.network?.name || info.webChannel?.name || null,
          }
        : {}),
    })
    .eq('id', show.id)
  if (error) throw new Error(error.message)
  return episodes.length
}

// Sincronizza in sequenza, rispettando il limite di TVmaze. Si ferma a `budgetMs`
// per restare sotto il limite di durata delle funzioni Vercel: il resto al giro dopo.
export async function syncShows(supabase: SupabaseClient, shows: ShowRow[], budgetMs = 45_000) {
  const startedAt = Date.now()
  const results: { id: number; episodes?: number; error?: string }[] = []
  for (const show of shows) {
    if (Date.now() - startedAt > budgetMs) break
    try {
      results.push({ id: show.id, episodes: await syncShow(supabase, show) })
    } catch (error) {
      results.push({ id: show.id, error: String(error) })
    }
    await new Promise((resolve) => setTimeout(resolve, 600))
  }
  return results
}
