import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Parser from 'rss-parser'
import { isAuthorizedCron } from '@/lib/cron-auth'

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ]
  }
})

function extractImage(item: any): string | null {
  // Prova tutti i campi possibili dove può nascondersi un'immagine
  if (item.mediaContent?.$.url) return item.mediaContent.$.url
  if (item.mediaThumbnail?.$.url) return item.mediaThumbnail.$.url
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) return item.enclosure.url

  // Cerca nel contenuto HTML
  const html = item.contentEncoded || item.content || item.summary || ''
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (imgMatch) return imgMatch[1]

  return null
}


async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GROWBot/1.0)' }
    })
    const html = await res.text()
    const match = html.match(/<meta[^>]+(?:property=["']og:image["']|name=["']twitter:image["'])[^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property=["']og:image["']|name=["']twitter:image["'])/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .eq('is_active', true)

    if (!sources) return NextResponse.json({ error: 'No sources' }, { status: 500 })

    let totalSaved = 0

    for (const source of sources) {
      try {
        const feed = await parser.parseURL(source.rss_url)
        const items = feed.items.slice(0, 10)

        for (const item of items) {
          if (!item.title || !item.link) continue

          let imageUrl = extractImage(item)
          if (!imageUrl && item.link) {
            imageUrl = await fetchOgImage(item.link)
          }
          const wordCount = item.contentSnippet?.split(' ').length || 200
          const readTime = Math.ceil(wordCount / 200)

          const { error } = await supabase
            .from('content_items')
            .upsert({
              source_id: source.id,
              title: item.title,
              url: item.link,
              summary: item.contentSnippet?.slice(0, 300),
              author: (item as any).creator || (item as any).author,
              published_at: item.pubDate
                ? new Date(item.pubDate).toISOString()
                : new Date().toISOString(),
              category: source.category,
              type: source.type,
              video_id: source.type === 'video'
                ? item.link?.split('watch?v=')[1]
                : null,
              image_url: imageUrl,
              read_time_minutes: readTime,
            }, { onConflict: 'url' })

          if (!error) totalSaved++
        }

        await supabase
          .from('sources')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', source.id)

      } catch (err) {
        console.error(`Errore su ${source.name}:`, err)
      }
    }

    return NextResponse.json({ success: true, saved: totalSaved })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
