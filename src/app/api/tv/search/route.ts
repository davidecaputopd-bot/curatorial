import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { searchShows } from '@/lib/tv/tvmaze'

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ items: [] })

  const results = ((await searchShows(q)) || []).slice(0, 12)
  // Segna le serie già seguite, così la ricerca porta direttamente alla scheda.
  const { data: mine } = await supabase
    .from('tv_shows')
    .select('id, tvmaze_id')
    .eq('user_id', user.id)
    .eq('followed', true)
    .in('tvmaze_id', results.map(({ show }) => show.id))
  const followedId = new Map((mine || []).map((row) => [row.tvmaze_id, row.id]))

  return NextResponse.json({
    items: results.map(({ show }) => ({
      tvmaze_id: show.id,
      title: show.name,
      poster: show.image?.medium || null,
      network: show.network?.name || show.webChannel?.name || null,
      status: show.status,
      year: show.premiered?.slice(0, 4) || null,
      show_id: followedId.get(show.id) ?? null,
    })),
  })
}
