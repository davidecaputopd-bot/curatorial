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
  premiered?: string | null
  weight?: number
  genres?: string[]
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

export type TvmazeSeason = {
  number: number
  episodeOrder: number | null
  premiereDate: string | null
  endDate: string | null
}

export type TvmazeShowFull = TvmazeShow & {
  ended?: string | null
  genres?: string[]
  summary?: string | null
  _embedded?: { seasons?: TvmazeSeason[]; episodes?: TvmazeEpisode[] }
}

// Scheda completa con stagioni ed episodi in una sola richiesta, per l'anteprima.
export const getShowFull = (id: number) =>
  get<TvmazeShowFull>(`/shows/${id}?embed[]=seasons&embed[]=episodes`)

// Stagioni di una serie, in cache 12 ore: servono solo a sapere se ne è stata annunciata una nuova.
export async function getSeasons(id: number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${API}/shows/${id}/seasons`, { next: { revalidate: 43_200 } })
    if (response.status === 404) return []
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
      continue
    }
    if (!response.ok) return []
    return (await response.json()) as TvmazeSeason[]
  }
  return []
}

// Indice completo di TVmaze: 250 serie per pagina, ordinate per id.
// Serve a costruire il catalogo locale da cui si sceglie all'ingresso.
// Oltre l'ultima pagina risponde 404, cioè null: è la condizione di fine.
export const getIndexPage = (page: number) => get<TvmazeShow[]>(`/shows?page=${page}`)
