import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { deterministicJitter, referenceSimilarity } from '@/lib/recommendations'

type ReferenceRow = {
  id: string
  title?: string | null
  summary?: string | null
  category?: string | null
  platform?: string | null
  artist_name?: string | null
  dominant_color?: string | null
  tags?: string[] | string | null
  image_url?: string | null
  url?: string | null
  width?: number | null
  height?: number | null
}

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })

  const fields =
    'id, title, summary, category, platform, artist_name, dominant_color, tags, image_url, url, width, height'
  const { data: reference, error: referenceError } = await supabase
    .from('content_items')
    .select(fields)
    .eq('id', id)
    .single()

  if (referenceError || !reference) {
    return NextResponse.json({ error: 'Reference non trovata' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('content_items')
    .select(fields)
    .eq('type', 'image')
    .in('platform', ['arena', 'unsplash', 'pexels'])
    .not('image_url', 'is', null)
    .neq('id', id)
    .order('published_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const seed = Math.floor(Date.now() / 86_400_000)
  const items = ((data || []) as ReferenceRow[])
    .map((item) => ({
      ...item,
      discovery_mode: 'for_you' as const,
      similarity:
        referenceSimilarity(reference as ReferenceRow, item) +
        deterministicJitter(item.id, seed) * 0.2,
    }))
    .filter((item) => item.similarity >= 2)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 40)

  return NextResponse.json({
    ok: true,
    reference: { id: reference.id, title: reference.title },
    items,
  })
}
