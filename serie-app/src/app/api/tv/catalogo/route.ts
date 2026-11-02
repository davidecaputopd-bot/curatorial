import { NextResponse } from 'next/server'
import { getTvSupabase } from '@/lib/supabase/server'
import { searchShows } from '@/lib/tv/tvmaze'

const PAGINA = 60

type Voce = {
  tvmaze_id: number
  title: string
  poster: string | null
  network: string | null
  status: string | null
  year: string | null
}

// Catalogo da cui si scelgono le serie all'ingresso.
// Senza ricerca: le più seguite, in ordine di popolarità TVmaze.
// Con ricerca: prima il catalogo locale, e se non basta si chiede a TVmaze,
// così resta raggiungibile qualsiasi serie esista, anche la più oscura.
export async function GET(request: Request) {
  const { supabase, user } = await getTvSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const q = params.get('q')?.trim() || ''
  const genere = params.get('genere')?.trim() || ''
  const pagina = Math.max(0, Number(params.get('pagina') || 0))

  let query = supabase
    .from('tv_catalog')
    .select('tvmaze_id, title, poster, network, show_status, premiered')
    .order('weight', { ascending: false })
    .order('title', { ascending: true })
    .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1)

  if (q) query = query.ilike('title', `%${q}%`)
  if (genere) query = query.contains('genres', [genere])

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let items: Voce[] = (data || []).map((row) => ({
    tvmaze_id: row.tvmaze_id,
    title: row.title,
    poster: row.poster,
    network: row.network,
    status: row.show_status,
    year: row.premiered?.slice(0, 4) || null,
  }))

  // Il catalogo si riempie col tempo: finché è magro, la ricerca passa da TVmaze.
  let fonte = 'catalogo'
  if (q && items.length < 6) {
    const trovate = ((await searchShows(q)) || []).slice(0, 20)
    const gia = new Set(items.map((item) => item.tvmaze_id))
    for (const { show } of trovate) {
      if (gia.has(show.id)) continue
      items.push({
        tvmaze_id: show.id,
        title: show.name,
        poster: show.image?.medium || null,
        network: show.network?.name || show.webChannel?.name || null,
        status: show.status,
        year: show.premiered?.slice(0, 4) || null,
      })
    }
    fonte = 'tvmaze'
  }

  // Le serie già in archivio non si ripropongono.
  const { data: mie } = await supabase
    .from('tv_shows')
    .select('tvmaze_id')
    .eq('user_id', user.id)
    .not('tvmaze_id', 'is', null)
  const mieIds = new Set((mie || []).map((row) => row.tvmaze_id))
  items = items.filter((item) => !mieIds.has(item.tvmaze_id))

  return NextResponse.json({ items, fonte, fine: items.length < PAGINA })
}
