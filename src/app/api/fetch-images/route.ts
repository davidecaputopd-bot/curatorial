import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY

const QUERIES = [
  { q: 'editorial photography fashion', cat: 'fashion' },
  { q: 'fashion editorial magazine', cat: 'fashion' },
  { q: 'vintage fashion style', cat: 'fashion' },
  { q: 'minimalist interior design', cat: 'interior_design' },
  { q: 'brutalist architecture interior', cat: 'interior_design' },
  { q: 'mediterranean home interior', cat: 'interior_design' },
  { q: 'scandinavian interior minimal', cat: 'interior_design' },
  { q: 'brand identity design', cat: 'branding' },
  { q: 'packaging design minimal', cat: 'branding' },
  { q: 'graphic design poster', cat: 'branding' },
  { q: 'logo design typography', cat: 'branding' },
  { q: 'typography letter font', cat: 'typography' },
  { q: 'typographic poster design', cat: 'typography' },
  { q: 'editorial layout magazine', cat: 'typography' },
  { q: 'web design interface UI', cat: 'web' },
  { q: 'website design minimal', cat: 'web' },
  { q: 'digital interface dark', cat: 'web' },
  { q: 'artificial intelligence technology', cat: 'ai' },
  { q: 'machine learning data visualization', cat: 'ai' },
  { q: 'futuristic technology abstract', cat: 'ai' },
  { q: 'contemporary art installation', cat: 'art' },
  { q: 'street photography urban', cat: 'art' },
  { q: 'fine art photography', cat: 'art' },
  { q: 'product design minimal object', cat: 'design' },
  { q: 'industrial design furniture', cat: 'design' },
  { q: 'motion design abstract', cat: 'design' },
  { q: '3d printing object sculpture', cat: '3d_printing' },
  { q: 'industrial design prototype', cat: '3d_printing' },
  { q: 'social media design content', cat: 'social_design' },
  { q: 'carousel post design', cat: 'social_design' },
  { q: 'lifestyle minimal aesthetic', cat: 'lifestyle' },
  { q: 'slow living coffee book', cat: 'lifestyle' },
  { q: 'travel architecture landscape', cat: 'lifestyle' },
]

export async function GET() {
  if (!UNSPLASH_KEY) {
    return NextResponse.json({ error: 'Missing UNSPLASH_ACCESS_KEY' }, { status: 500 })
  }

  let totalSaved = 0

  for (const item of QUERIES) {
    try {
      const res = await fetch(
        'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(item.q) + '&per_page=6&order_by=relevant&content_filter=high',
        { headers: { Authorization: 'Client-ID ' + UNSPLASH_KEY, 'Accept-Version': 'v1' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      const photos = data.results || []

      for (const photo of photos) {
        const { error } = await supabase.from('content_items').upsert({
          source_id: null,
          title: photo.alt_description || photo.description || item.q,
          url: photo.links.html,
          image_url: photo.urls.regular,
          summary: photo.description || null,
          author: photo.user?.name || null,
          artist_name: photo.user?.name || null,
          published_at: photo.created_at,
          category: item.cat,
          type: 'image',
          platform: 'unsplash',
          dominant_color: photo.color || null,
          width: photo.width || null,
          height: photo.height || null,
          read_time_minutes: null,
        }, { onConflict: 'url' })
        if (!error) totalSaved++
      }
      await new Promise(r => setTimeout(r, 400))
    } catch (err) {
      console.error('Errore:', err)
    }
  }

  return NextResponse.json({ success: true, saved: totalSaved })
}