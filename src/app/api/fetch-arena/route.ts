import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const CHANNELS = [
  { slug: 'typography-references', cat: 'typography' },
  { slug: 'fashion-references', cat: 'fashion' },
  { slug: 'editorial-design', cat: 'branding' },
  { slug: 'graphic-design-inspiration', cat: 'branding' },
  { slug: 'brutalist-architecture', cat: 'interior_design' },
  { slug: 'art-direction', cat: 'branding' },
  { slug: 'poster-design', cat: 'branding' },
  { slug: 'photography-references', cat: 'art' },
  { slug: 'fashion-editorial', cat: 'fashion' },
  { slug: 'minimal-design', cat: 'design' },
  { slug: 'packaging-design', cat: 'branding' },
  { slug: 'contemporary-art', cat: 'art' },
  { slug: 'web-design-inspiration', cat: 'web' },
  { slug: 'color-palette', cat: 'design' },
]

export async function GET() {
  let totalSaved = 0

  for (const channel of CHANNELS) {
    try {
      const res = await fetch(
        'https://api.are.na/v2/channels/' + channel.slug + '/contents?per=20&page=1',
        { headers: { 'Content-Type': 'application/json' } }
      )
      if (!res.ok) continue

      const data = await res.json()
      const blocks = (data.contents || []).filter((b: any) => b.class === 'Image' && b.image)

      for (const block of blocks) {
        const imageUrl = block.image?.display?.url || block.image?.large?.url || block.image?.original?.url
        if (!imageUrl) continue

        const { error } = await supabase.from('content_items').upsert({
          source_id: null,
          title: block.title || block.description || channel.slug,
          url: 'https://www.are.na/block/' + block.id,
          image_url: imageUrl,
          summary: block.description || null,
          author: block.user?.username || null,
          artist_name: block.user?.username || null,
          published_at: block.created_at || new Date().toISOString(),
          category: channel.cat,
          type: 'image',
          platform: 'arena',
          dominant_color: null,
          width: block.image?.original?.width || null,
          height: block.image?.original?.height || null,
          read_time_minutes: null,
        }, { onConflict: 'url' })

        if (!error) totalSaved++
      }

      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.error('Errore canale ' + channel.slug)
    }
  }

  return NextResponse.json({ success: true, saved: totalSaved })
}
