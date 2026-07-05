import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAuthorizedCron } from '@/lib/cron-auth'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY
const PEXELS_KEY = process.env.PEXELS_API_KEY

const QUERIES: { q: string; cat: string }[] = [
  // FASHION
  { q: 'editorial photography fashion', cat: 'fashion' },
  { q: 'fashion editorial magazine', cat: 'fashion' },
  { q: 'vintage fashion style', cat: 'fashion' },
  { q: 'haute couture runway', cat: 'fashion' },
  { q: 'fashion portrait dark', cat: 'fashion' },
  // INTERIOR DESIGN
  { q: 'minimalist interior design', cat: 'interior_design' },
  { q: 'brutalist architecture interior', cat: 'interior_design' },
  { q: 'mediterranean home interior', cat: 'interior_design' },
  { q: 'scandinavian interior minimal', cat: 'interior_design' },
  { q: 'japanese wabi sabi interior', cat: 'interior_design' },
  { q: 'modern architecture space', cat: 'interior_design' },
  // BRANDING
  { q: 'brand identity design', cat: 'branding' },
  { q: 'packaging design minimal', cat: 'branding' },
  { q: 'graphic design poster', cat: 'branding' },
  { q: 'logo design typography', cat: 'branding' },
  { q: 'swiss poster design', cat: 'branding' },
  { q: 'bauhaus graphic design', cat: 'branding' },
  // TYPOGRAPHY
  { q: 'typography letter font', cat: 'typography' },
  { q: 'typographic poster design', cat: 'typography' },
  { q: 'editorial layout magazine', cat: 'typography' },
  { q: 'neon sign lettering', cat: 'typography' },
  { q: 'book cover design typography', cat: 'typography' },
  // WEB
  { q: 'web design interface UI', cat: 'web' },
  { q: 'website design minimal', cat: 'web' },
  { q: 'digital interface dark', cat: 'web' },
  { q: 'app design mobile screen', cat: 'web' },
  // AI
  { q: 'artificial intelligence technology', cat: 'ai' },
  { q: 'machine learning data visualization', cat: 'ai' },
  { q: 'futuristic technology abstract', cat: 'ai' },
  { q: 'neural network digital art', cat: 'ai' },
  // ART
  { q: 'contemporary art installation', cat: 'art' },
  { q: 'street photography urban', cat: 'art' },
  { q: 'fine art photography', cat: 'art' },
  { q: 'film noir cinematic still', cat: 'art' },
  { q: 'cinematic portrait lighting', cat: 'art' },
  { q: 'color palette street photography', cat: 'art' },
  // DESIGN
  { q: 'product design minimal object', cat: 'design' },
  { q: 'industrial design furniture', cat: 'design' },
  { q: 'motion design abstract', cat: 'design' },
  { q: 'color palette architecture', cat: 'design' },
  { q: 'design object still life', cat: 'design' },
  // 3D PRINTING
  { q: '3d printing object sculpture', cat: '3d_printing' },
  { q: 'industrial design prototype', cat: '3d_printing' },
  { q: '3d render product design', cat: '3d_printing' },
  // SOCIAL DESIGN
  { q: 'social media design content', cat: 'social_design' },
  { q: 'carousel post design', cat: 'social_design' },
  { q: 'instagram design aesthetic', cat: 'social_design' },
  // LIFESTYLE
  { q: 'lifestyle minimal aesthetic', cat: 'lifestyle' },
  { q: 'slow living coffee book', cat: 'lifestyle' },
  { q: 'travel architecture landscape', cat: 'lifestyle' },
  { q: 'salento puglia mediterranean', cat: 'lifestyle' },
]

async function fetchUnsplash(q: string, cat: string): Promise<number> {
  if (!UNSPLASH_KEY) return 0
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
  if (!PEXELS_KEY) return 0
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
