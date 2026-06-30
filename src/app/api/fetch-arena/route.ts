import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const SEARCHES = [
  { q: 'graphic design reference', cat: 'design' },
  { q: 'visual identity design', cat: 'branding' },
  { q: 'brand identity system', cat: 'branding' },
  { q: 'typography layout poster', cat: 'typography' },
  { q: 'editorial design layout', cat: 'typography' },
  { q: 'packaging design wine label', cat: 'branding' },
  { q: 'art direction campaign', cat: 'branding' },
  { q: 'fashion editorial photography', cat: 'fashion' },
  { q: 'interior design moodboard', cat: 'interior_design' },
  { q: 'restaurant branding', cat: 'branding' },
  { q: 'web design inspiration', cat: 'web' },
  { q: 'color palette graphic design', cat: 'design' },
  { q: 'creative direction moodboard', cat: 'design' },
  { q: 'minimal poster design', cat: 'typography' },
  { q: 'luxury packaging design', cat: 'branding' },
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
