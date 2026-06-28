import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const SEARCHES = [
  { q: 'fashion editorial', cat: 'fashion' },
  { q: 'typography poster', cat: 'typography' },
  { q: 'graphic design', cat: 'branding' },
  { q: 'interior architecture', cat: 'interior_design' },
  { q: 'art direction', cat: 'branding' },
  { q: 'photography', cat: 'art' },
  { q: 'packaging design', cat: 'branding' },
  { q: 'minimal design', cat: 'design' },
  { q: 'contemporary art', cat: 'art' },
  { q: 'web design', cat: 'web' },
  { q: 'color palette', cat: 'design' },
  { q: 'brutalist', cat: 'interior_design' },
]

export async function GET() {
  let totalSaved = 0

  for (const search of SEARCHES) {
    try {
      // Cerca canali pubblici per keyword
      const searchRes = await fetch(
        'https://api.are.na/v2/search/channels?q=' + encodeURIComponent(search.q) + '&per=5',
        { headers: { 'Content-Type': 'application/json' } }
      )
      if (!searchRes.ok) continue

      const searchData = await searchRes.json()
      const channels = searchData.channels?.slice(0, 3) || []

      for (const channel of channels) {
        try {
          const contRes = await fetch(
            'https://api.are.na/v2/channels/' + channel.slug + '/contents?per=15&page=1',
            { headers: { 'Content-Type': 'application/json' } }
          )
          if (!contRes.ok) continue

          const contData = await contRes.json()
          const blocks = (contData.contents || []).filter(
            (b: any) => b.class === 'Image' && b.image
          )

          for (const block of blocks) {
            const imageUrl =
              block.image?.display?.url ||
              block.image?.large?.url ||
              block.image?.original?.url
            if (!imageUrl) continue

            const { error } = await supabase.from('content_items').upsert({
              source_id: null,
              title: block.title || block.description || channel.title || search.q,
              url: 'https://www.are.na/block/' + block.id,
              image_url: imageUrl,
              summary: block.description || null,
              author: block.user?.username || null,
              artist_name: block.user?.username || null,
              published_at: block.created_at || new Date().toISOString(),
              category: search.cat,
              type: 'image',
              platform: 'arena',
              dominant_color: null,
              width: block.image?.original?.width || null,
              height: block.image?.original?.height || null,
              read_time_minutes: null,
            }, { onConflict: 'url' })

            if (!error) totalSaved++
          }

          await new Promise(r => setTimeout(r, 400))
        } catch {}
      }

      await new Promise(r => setTimeout(r, 600))
    } catch (err) {
      console.error('Errore search:', search.q)
    }
  }

  return NextResponse.json({ success: true, saved: totalSaved })
}
