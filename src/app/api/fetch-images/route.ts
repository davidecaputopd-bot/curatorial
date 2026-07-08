import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { isAllowedStockQuery } from '@/lib/discovery-quality'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY
const PEXELS_KEY = process.env.PEXELS_API_KEY

const QUERIES: { q: string; cat: string }[] = [
  { q: 'fashion editorial lookbook art direction', cat: 'fashion' },
  { q: 'fashion editorial magazine layout', cat: 'fashion' },
  { q: 'wine label packaging design', cat: 'branding' },
  { q: 'restaurant menu typography identity', cat: 'branding' },
  { q: 'hospitality visual identity signage', cat: 'branding' },
  { q: 'typographic poster print design', cat: 'typography' },
  { q: 'editorial layout magazine typography', cat: 'typography' },
  { q: 'book cover design typography', cat: 'typography' },
  { q: 'contemporary art installation documentation', cat: 'art' },
  { q: 'product still life art direction', cat: 'design' },
  { q: 'brand campaign still life composition', cat: 'branding' },
  { q: 'architectural signage identity system', cat: 'interior_design' },
  { q: 'retail interior visual identity', cat: 'interior_design' },
  { q: 'creative coding graphic poster', cat: 'web' },
  { q: 'motion identity title sequence frames', cat: 'branding' },
]

async function fetchUnsplash(q: string, cat: string): Promise<number> {
  if (!UNSPLASH_KEY || !isAllowedStockQuery(q, cat)) return 0
  let saved = 0
  try {
    const res = await fetch(
      'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(q) + '&per_page=6&order_by=relevant&content_filter=high',
      { headers: { Authorization: 'Client-ID ' + UNSPLASH_KEY, 'Accept-Version': 'v1' } }
    )
    if (!res.ok) return 0
    const data = await res.json()
    for (const photo of data.results || []) {
      const { error } = await supabase.from('content_items').upsert({
        source_id: null,
        title: photo.alt_description || photo.description || q,
        url: photo.links.html,
        image_url: photo.urls.regular,
        summary: photo.description || null,
        author: photo.user?.name || null,
        artist_name: photo.user?.name || null,
        published_at: photo.created_at,
        category: cat,
        type: 'image',
        platform: 'unsplash',
        dominant_color: photo.color || null,
        width: photo.width || null,
        height: photo.height || null,
        read_time_minutes: null,
      }, { onConflict: 'url' })
      if (!error) saved++
    }
  } catch {}
  return saved
}

async function fetchPexels(q: string, cat: string): Promise<number> {
  if (!PEXELS_KEY || !isAllowedStockQuery(q, cat)) return 0
  let saved = 0
  try {
    const res = await fetch(
      'https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) + '&per_page=6&orientation=portrait',
      { headers: { Authorization: PEXELS_KEY } }
    )
    if (!res.ok) return 0
    const data = await res.json()
    for (const photo of data.photos || []) {
      const { error } = await supabase.from('content_items').upsert({
        source_id: null,
        title: photo.alt || q,
        url: photo.url,
        image_url: photo.src.large,
        summary: null,
        author: photo.photographer || null,
        artist_name: photo.photographer || null,
        published_at: new Date().toISOString(),
        category: cat,
        type: 'image',
        platform: 'pexels',
        dominant_color: photo.avg_color || null,
        width: photo.width || null,
        height: photo.height || null,
        read_time_minutes: null,
      }, { onConflict: 'url' })
      if (!error) saved++
    }
  } catch {}
  return saved
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let totalSaved = 0

  for (const { q, cat } of QUERIES) {
    const [u, p] = await Promise.all([
      fetchUnsplash(q, cat),
      fetchPexels(q, cat),
    ])
    totalSaved += u + p
    await new Promise(r => setTimeout(r, 300))
  }

  return NextResponse.json({ success: true, saved: totalSaved })
}
