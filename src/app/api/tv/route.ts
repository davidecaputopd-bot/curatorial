import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { getShow } from '@/lib/tv/tvmaze'
import { syncShow } from '@/lib/tv/sync'

// Serie con prossimo episodio + uscite dei prossimi 30 giorni.
export async function GET() {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const from = new Date(now.getTime() - 24 * 3600_000).toISOString()
  const to = new Date(now.getTime() + 30 * 24 * 3600_000).toISOString()

  const [shows, upcoming] = await Promise.all([
    supabase
      .from('tv_show_overview')
      .select('*')
      .eq('user_id', user.id)
      .order('title', { ascending: true }),
    supabase
      .from('tv_episodes')
      .select('id, show_id, season, number, name, airstamp, tv_shows!inner(title, poster, network, followed)')
      .eq('user_id', user.id)
      .eq('tv_shows.followed', true)
      .gte('airstamp', from)
      .lte('airstamp', to)
      .order('airstamp', { ascending: true })
      .limit(200),
  ])

  if (shows.error) return NextResponse.json({ error: shows.error.message }, { status: 500 })
  if (upcoming.error) return NextResponse.json({ error: upcoming.error.message }, { status: 500 })
  return NextResponse.json({ shows: shows.data || [], upcoming: upcoming.data || [] })
}

// Segui una nuova serie da TVmaze.
export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tvmaze_id } = await request.json()
  const info = await getShow(Number(tvmaze_id))
  if (!info) return NextResponse.json({ error: 'Serie non trovata' }, { status: 404 })

  // Se la serie è già in archivio (anche non seguita) torna a seguirla senza toccare la posizione.
  const findBy = (column: 'tvmaze_id' | 'title', value: number | string) =>
    supabase.from('tv_shows').select('id').eq('user_id', user.id).eq(column, value).limit(1).maybeSingle()
  const existing = (await findBy('tvmaze_id', info.id)).data || (await findBy('title', info.name)).data

  const { data, error } = existing
    ? await supabase
        .from('tv_shows')
        .update({ followed: true, tvmaze_id: info.id })
        .eq('id', existing.id)
        .select('id, user_id, tvmaze_id')
        .single()
    : await supabase
        .from('tv_shows')
        .insert({
          user_id: user.id,
          title: info.name,
          tvmaze_id: info.id,
          tvdb_id: info.externals?.thetvdb || null,
          followed: true,
          followed_at: new Date().toISOString().slice(0, 10),
          progress_season: 0,
          progress_episode: 0,
          imported_from: 'grow',
        })
        .select('id, user_id, tvmaze_id')
        .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await syncShow(supabase, data)
  return NextResponse.json({ show: data })
}

// Aggiorna posizione, notifiche o follow di una serie.
export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const fields: Record<string, unknown> = {}
  for (const key of ['progress_season', 'progress_episode', 'notify', 'followed', 'favorite', 'for_later']) {
    if (key in body) fields[key] = body[key]
  }

  const { data, error } = await supabase
    .from('tv_shows')
    .update(fields)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ show: data })
}
