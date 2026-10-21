// Catalogo serie da TVmaze (API pubblica, senza chiave, max ~20 richieste ogni 10 secondi).
const API = 'https://api.tvmaze.com'

export type TvmazeEpisode = {
  id: number
  season: number
  number: number | null
  name: string | null
  airstamp: string | null
  runtime: number | null
  image: { medium?: string } | null
}

export type TvmazeShow = {
  id: number
  name: string
  status: string | null
  image: { medium?: string; original?: string } | null
  network: { name: string } | null
  webChannel: { name: string } | null
  externals?: { thetvdb?: number | null }
}

async function get<T>(path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${API}${path}`, { cache: 'no-store' })
    if (response.status === 404) return null
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
      continue
    }
    if (!response.ok) throw new Error(`TVmaze ${response.status} ${path}`)
    return (await response.json()) as T
  }
  return null
}

export const getShow = (id: number) => get<TvmazeShow>(`/shows/${id}`)

// Solo episodi regolari (gli speciali hanno number null e vengono scartati).
export async function getEpisodes(id: number) {
  const episodes = (await get<TvmazeEpisode[]>(`/shows/${id}/episodes`)) || []
  return episodes.filter((episode) => episode.number !== null)
}

export function searchShows(query: string) {
  return get<{ show: TvmazeShow }[]>(`/search/shows?q=${encodeURIComponent(query)}`)
}
