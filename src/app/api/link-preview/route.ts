import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { fetchLinkPreview } from '@/lib/link-preview'

export async function GET(request: Request) {
  const { user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const preview = await fetchLinkPreview(url)
  console.log('[link-preview]', url, preview ? 'ok' : 'null')
  if (!preview) return NextResponse.json({ error: 'Could not fetch' }, { status: 422 })

  return NextResponse.json(preview, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
