import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { topicsForToday, type DiscoveryTopic } from '@/lib/discovery-sources'

export const maxDuration = 60

type ArenaChannel = {
  slug: string
  title: string
}

type MarkdownContent = {
  plain?: string
}

type ArenaImage = {
  src?: string
  width?: number | null
  height?: number | null
  large?: { src?: string; url?: string }
  medium?: { src?: string; url?: string }
}

type ArenaImageBlock = {
  id: number
  type: string
  title?: string | null
  description?: MarkdownContent | null
  created_at?: string
  user?: { name?: string; slug?: string }
  image?: ArenaImage
}

async function searchChannels(topic: DiscoveryTopic): Promise<ArenaChannel[]> {
  const token = process.env.ARENA_ACCESS_TOKEN

  if (token) {
    const params = new URLSearchParams({
      query: topic.query,
      type: 'Channel',
      sort: 'score_desc',
      per: '2',
    })
    const response = await fetch(`https://api.are.na/v3/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) {
      const payload = (await response.json()) as { data?: ArenaChannel[] }
      return (payload.data || []).filter((channel) => channel.slug).slice(0, 2)
    }
  }

  // Compatibilità temporanea: la ricerca v3 è Premium, i contenuti sono già letti via v3.
  const response = await fetch(
    `https://api.are.na/v2/search/channels?q=${encodeURIComponent(topic.query)}&per=2`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!response.ok) return []
  const payload = (await response.json()) as { channels?: ArenaChannel[] }
  return (payload.channels || []).filter((channel) => channel.slug).slice(0, 2)
}

async function readChannel(channel: ArenaChannel): Promise<ArenaImageBlock[]> {
  const response = await fetch(
    `https://api.are.na/v3/channels/${encodeURIComponent(channel.slug)}/contents?per=24&page=1&sort=created_at_desc`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!response.ok) return []
  const payload = (await response.json()) as { data?: ArenaImageBlock[] }
  return (payload.data || []).filter(
    (block) => block.type === 'Image' && Boolean(block.image?.src)
  )
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let saved = 0
  let failed = 0
  const topics = topicsForToday()

  for (const topic of topics) {
    try {
      const channels = await searchChannels(topic)
      for (const channel of channels) {
        const blocks = await readChannel(channel)
        for (const block of blocks) {
          const imageUrl =
            block.image?.large?.src ||
            block.image?.large?.url ||
            block.image?.medium?.src ||
            block.image?.medium?.url ||
            block.image?.src
          if (!imageUrl) continue

          const author = block.user?.name || block.user?.slug || null
          const description = block.description?.plain || null
          const { error } = await supabase.from('content_items').upsert(
            {
              source_id: null,
              title: block.title || description || channel.title || topic.query,
              url: `https://www.are.na/block/${block.id}`,
              image_url: imageUrl,
              summary: description,
              author,
              artist_name: author,
              published_at: block.created_at || new Date().toISOString(),
              category: topic.category,
              type: 'image',
              platform: 'arena',
              dominant_color: null,
              width: block.image?.width || null,
              height: block.image?.height || null,
              read_time_minutes: null,
            },
            { onConflict: 'url' }
          )
          if (error) failed++
          else saved++
        }
      }
    } catch {
      failed++
    }
  }

  return NextResponse.json({
    success: true,
    saved,
    failed,
    topics: topics.map((topic) => topic.query),
    api: process.env.ARENA_ACCESS_TOKEN ? 'v3' : 'v3-contents-v2-search-fallback',
  })
}
