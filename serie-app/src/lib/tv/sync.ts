import type { SupabaseClient } from '@supabase/supabase-js'
import { getEpisodes, getShow } from './tvmaze'

type ShowRow = { id: number; user_id: string; tvmaze_id: number | null }

// Scarica episodi e stato aggiornati da TVmaze per una serie e li salva.
export async function syncShow(supabase: SupabaseClient, show: ShowRow) {
  if (!show.tvmaze_id) return 0
  const [info, episodes] = await Promise.all([
    getShow(show.tvmaze_id),
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

  const { error } = await supabase
    .from('tv_shows')
    .update({
      synced_at: new Date().toISOString(),
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
