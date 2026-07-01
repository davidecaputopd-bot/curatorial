import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

export async function GET() {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('content_items')
    .select('id, title, type, platform, category, image_url, published_at, source_id')
    .order('published_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = data || []

  const counts = items.reduce((acc: any, item: any) => {
    const type = item.type || 'null'
    const platform = item.platform || 'null'
    const key = `${type} / ${platform}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const imagePlatforms = items.filter((item: any) =>
    item.type === 'image' &&
    ['arena', 'unsplash', 'pexels'].includes(item.platform) &&
    item.image_url
  )

  return NextResponse.json({
    totalChecked: items.length,
    counts,
    imagePlatformItems: imagePlatforms.length,
    latestImagePlatformItems: imagePlatforms.slice(0, 20).map((item: any) => ({
      title: item.title,
      type: item.type,
      platform: item.platform,
      category: item.category,
      hasImage: Boolean(item.image_url),
      published_at: item.published_at,
    })),
  })
}
