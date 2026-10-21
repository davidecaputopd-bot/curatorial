import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

// Dettaglio serie: stato, episodi per stagione e visioni datate.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [show, episodes, watches] = await Promise.all([
    supabase.from('tv_show_overview').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase
      .from('tv_episodes')
      .select('id, season, number, name, airstamp, runtime, image')
      .eq('show_id', id)
      .eq('user_id', user.id)
      .order('season')
      .order('number')
      .limit(2000),
    supabase
      .from('tv_episode_watches')
      .select('season, episode, watched_at, source')
      .eq('show_id', id)
      .eq('user_id', user.id),
  ])

  if (show.error) return NextResponse.json({ error: show.error.message }, { status: 404 })
  return NextResponse.json({ show: show.data, episodes: episodes.data || [], watches: watches.data || [] })
}
