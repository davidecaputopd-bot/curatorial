import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ items: [] })

  const [savedInteractions, inbox, calendar] = await Promise.all([
    supabase
      .from('interactions')
      .select('content_id')
      .eq('user_id', user.id)
      .eq('action', 'save')
      .limit(1000),
    supabase.from('inbox_items').select('id, content, url, client').eq('user_id', user.id).ilike('content', `%${q}%`).limit(8),
    supabase.from('calendar_items').select('id, title, client, status').eq('user_id', user.id).ilike('title', `%${q}%`).limit(8),
  ])

  const savedIds = [
    ...new Set(
      (savedInteractions.data || [])
        .map((interaction) => interaction.content_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const saved = savedIds.length
    ? await supabase
        .from('content_items')
        .select('id, title, category, image_url, url')
        .in('id', savedIds)
        .ilike('title', `%${q}%`)
        .limit(8)
    : { data: [] }

  const items = [
    ...(saved.data || []).map((i) => ({ type: 'archivio' as const, id: i.id, title: i.title, meta: i.category, image_url: i.image_url, url: i.url })),
    ...(inbox.data || []).map((i) => ({ type: 'inbox' as const, id: i.id, title: i.content, meta: i.client, url: i.url })),
    ...(calendar.data || []).map((i) => ({ type: 'calendario' as const, id: i.id, title: i.title, meta: `${i.client} · ${i.status}` })),
  ]

  return NextResponse.json({ items })
}
