import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY

const QUERIES = [
  { q: 'editorial photography', cat: 'fashion' },
  { q: 'minimalist interior design', cat: 'interior_design' },
  { q: 'brand identity typography', cat: 'branding' },
  { q: 'fashion editorial', cat: 'fashion' },
  { q: 'brutalist architecture', cat: 'interior_design' },
  { q: 'product design minimal', cat: 'design' },
  { q: 'graphic design poster', cat: 'branding' },
  { q: 'mediterranean architecture', cat: 'interior_design' },
  { q: 'contemporary art installation', cat: 'art' },
  { q: 'motion design abstract', cat: 'design' },
  { q: 'packaging design', cat: 'branding' },
  { q: 'street photography urban', cat: 'art' },
  { q: 'vintage fashion', cat: 'fashion' },
  { q: 'textile pattern craft', cat: 'design' },
  { q: 'industrial design object', cat: '3d_printing' },
]

export async function GET() {
    return NextResponse.json({ error: 'Missing UNSPLASH_ACCESS_KEY' }, { status: 500 })
  }

  let totalSaved = 0

  for (const { q, cat } of QUERIES) {
    try {
      const res = await fetch(
        'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(q) + '&per_page=8&order_by=relevant&content_filter=high',
        {
          headers: {
            Authorization: 'Client-ID ' + UNSPLASH_KEY,
            'Accept-Version': 'v1',
          },
        }
      )

      const data = await res.json()
      const photos = data.results || []

      for (const photo of photos) {
        const { error } = await supabase
          .from('content_items')
          .upsert({
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

      }

      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.error('Errore query ' + q + ':', err)
    }
  }

  return NextResponse.json({ success: true, saved: totalSaved })
}
