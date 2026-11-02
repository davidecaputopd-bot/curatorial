import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

const after = (a: [number, number], b: [number, number]) =>
  a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])

// Segna un episodio come visto. Con upTo: true segna anche tutti i precedenti
// (come "segna gli episodi precedenti" di TV Time) spostando la posizione.
export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { show_id, season, episode, upTo } = await request.json()
  const { data: show, error } = await supabase
    .from('tv_shows')
    .select('id, progress_season, progress_episode')
    .eq('id', show_id)
    .eq('user_id', user.id)
    .single()
  if (error || !show) return NextResponse.json({ error: 'Serie non trovata' }, { status: 404 })

  const { error: watchError } = await supabase.from('tv_episode_watches').upsert(
    { user_id: user.id, show_id, season, episode, watched_at: new Date().toISOString(), source: 'grow' },
    { onConflict: 'user_id,show_id,season,episode' }
  )
  if (watchError) return NextResponse.json({ error: watchError.message }, { status: 500 })

  const current: [number, number] = [show.progress_season ?? 0, show.progress_episode ?? 0]
  const target: [number, number] = [season, episode]

  // Avanza la posizione se è il prossimo episodio, se si segnano i precedenti
  // o se la posizione non era ancora nota.
  let advance = upTo || show.progress_season === null
  if (!advance && after(target, current)) {
    const { data: next } = await supabase
      .from('tv_episodes')
      .select('season, number')
      .eq('show_id', show_id)
      .lte('airstamp', new Date().toISOString())
      .or(`season.gt.${current[0]},and(season.eq.${current[0]},number.gt.${current[1]})`)
      .order('season')
      .order('number')
      .limit(1)
      .maybeSingle()
    advance = !next || (next.season === season && next.number === episode)
  }

  if (advance && (upTo || show.progress_season === null || after(target, current))) {
    await supabase
      .from('tv_shows')
      .update({ progress_season: season, progress_episode: episode, last_watched_at: new Date().toISOString().slice(0, 10) })
      .eq('id', show_id)
  }

  return NextResponse.json({ ok: true, advanced: advance })
}

// Annulla la visione di un episodio; se era l'ultimo visto, la posizione torna indietro di uno.
export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { show_id, season, episode } = await request.json()
  await supabase
    .from('tv_episode_watches')
    .delete()
    .eq('user_id', user.id)
    .eq('show_id', show_id)
    .eq('season', season)
    .eq('episode', episode)

  const { data: show } = await supabase
    .from('tv_shows')
    .select('progress_season, progress_episode')
    .eq('id', show_id)
    .eq('user_id', user.id)
    .single()

  if (show && show.progress_season === season && show.progress_episode === episode) {
    const { data: previous } = await supabase
      .from('tv_episodes')
      .select('season, number')
      .eq('show_id', show_id)
      .or(`season.lt.${season},and(season.eq.${season},number.lt.${episode})`)
      .order('season', { ascending: false })
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle()
    await supabase
      .from('tv_shows')
      .update({ progress_season: previous?.season ?? 0, progress_episode: previous?.number ?? 0 })
      .eq('id', show_id)
  }

  return NextResponse.json({ ok: true })
}
