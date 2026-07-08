import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAuthorizedCron } from '@/lib/cron-auth'
import {
  curatedChannelsForToday,
  topicsForToday,
  type DiscoveryChannelSeed,
  type DiscoveryTopic,
} from '@/lib/discovery-sources'
import { isHighQualityDiscoveryItem } from '@/lib/discovery-quality'

export const maxDuration = 60

type ArenaChannel = {
  slug: string
  title: string
  category?: string
  lane?: 'core' | 'client' | 'wildcard'
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
      return (payload.data || [])
        .filter((channel) => isUsefulChannel(channel, topic))
        .slice(0, 2)
    }
  }

  // Compatibilità temporanea: la ricerca v3 è Premium, i contenuti sono già letti via v3.
  const response = await fetch(
    `https://api.are.na/v2/search/channels?q=${encodeURIComponent(topic.query)}&per=2`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!response.ok) return []
  const payload = (await response.json()) as { channels?: ArenaChannel[] }
  return (payload.channels || [])
    .filter((channel) => isUsefulChannel(channel, topic))
    .slice(0, 2)
}

function isUsefulChannel(channel: ArenaChannel, topic: DiscoveryTopic) {
  if (!channel.slug) return false
  const text = `${channel.title || ''} ${channel.slug}`.toLocaleLowerCase('it-IT')
  const strong =
    text.includes('identity') ||
    text.includes('typography') ||
    text.includes('poster') ||
    text.includes('editorial') ||
    text.includes('publication') ||
    text.includes('packaging') ||
    text.includes('label') ||
    text.includes('wine') ||
    text.includes('hospitality') ||
    text.includes('restaurant') ||
    text.includes('art-direction') ||
    text.includes('art direction') ||
    text.includes('still-life') ||
    text.includes('still life') ||
    text.includes('signage') ||
    text.includes('modernist') ||
    text.includes('graphic') ||
    text.includes('generative-art') ||
    text.includes('generative art') ||
    text.includes('ai-art') ||
    text.includes('ai art') ||
    text.includes('new-media') ||
    text.includes('new media') ||
    text.includes('computational-art') ||
    text.includes('computational art') ||
    text.includes('digital art')

  const weak =
    text.includes('meme') ||
    text.includes('ai generated') ||
    text.includes('prompt') ||
    text.includes('midjourney prompt') ||
    text.includes('stable diffusion prompt') ||
    text.includes('crypto') ||
    text.includes('startup') ||
    text.includes('marketing tips') ||
    text.includes('social media')

  return strong && !weak && Boolean(topic.category)
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

function seedToChannel(seed: DiscoveryChannelSeed): ArenaChannel {
  return {
    slug: seed.slug,
    title: seed.title,
    category: seed.category,
    lane: seed.lane,
  }
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let saved = 0
  let failed = 0
  let skipped = 0
  const topics = topicsForToday()
  const curatedSeeds = curatedChannelsForToday()
  const channelsSeen = new Set<string>()

  const channelJobs: Array<{
    channel: ArenaChannel
    category: string
    query: string
    source: 'curated' | 'search'
  }> = curatedSeeds.map((seed) => ({
    channel: seedToChannel(seed),
    category: seed.category,
    query: seed.title,
    source: 'curated',
  }))

  for (const topic of topics) {
    try {
      const channels = await searchChannels(topic)
      for (const channel of channels) {
        channelJobs.push({
          channel,
          category: topic.category,
          query: topic.query,
          source: 'search',
        })
      }
    } catch {
      failed++
    }
  }

  for (const job of channelJobs) {
    if (channelsSeen.has(job.channel.slug)) continue
    channelsSeen.add(job.channel.slug)
    try {
      const blocks = await readChannel(job.channel)
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
        const candidate = {
          title: block.title || description || job.channel.title || job.query,
          image_url: imageUrl,
          summary: description,
          artist_name: author,
          category: job.category,
          platform: 'arena',
          width: block.image?.width || null,
          height: block.image?.height || null,
        }
        if (!isHighQualityDiscoveryItem(candidate)) {
          skipped++
          continue
        }

        const { error } = await supabase.from('content_items').upsert(
          {
            source_id: null,
            title: candidate.title,
            url: `https://www.are.na/block/${block.id}`,
            image_url: imageUrl,
            summary: description,
            author,
            artist_name: author,
            published_at: block.created_at || new Date().toISOString(),
            category: job.category,
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
    } catch {
      failed++
    }
  }

  return NextResponse.json({
    success: true,
    saved,
    failed,
    skipped,
    channels: channelsSeen.size,
    curatedChannels: curatedSeeds.map((channel) => channel.slug),
    topics: topics.map((topic) => topic.query),
    api: process.env.ARENA_ACCESS_TOKEN ? 'v3' : 'v3-contents-v2-search-fallback',
  })
}
