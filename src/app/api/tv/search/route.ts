import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { searchShows } from '@/lib/tv/tvmaze'

export async function GET(request: Request) {
  const { user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ items: [] })

  const results = (await searchShows(q)) || []
  return NextResponse.json({
    items: results.slice(0, 12).map(({ show }) => ({
      tvmaze_id: show.id,
      title: show.name,
      poster: show.image?.medium || null,
      network: show.network?.name || show.webChannel?.name || null,
      status: show.status,
    })),
  })
}
