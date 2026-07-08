import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import {
  buildTasteProfile,
  deterministicJitter,
  tasteBoost,
} from '@/lib/recommendations'
import {
  discoveryQualityScore,
  isHighQualityDiscoveryItem,
} from '@/lib/discovery-quality'

type FeedRow = {
  id: string
  category?: string | null
  platform?: string | null
  title?: string | null
  summary?: string | null
  artist_name?: string | null
  image_url?: string | null
  url?: string | null
  published_at?: string | null
  created_at?: string | null
  [key: string]: unknown
}

type ScoredFeedRow = FeedRow & {
  _score: number
  discovery_mode?: 'for_you' | 'outside_bubble'
}

function scoreItem(item: FeedRow, weights: Record<string, number>, dwellWeights: Record<string, number>) {
  const cat = item.category || 'design'
  const catWeight = weights[cat] ?? 0.65
  const dwellBoost = Math.min(0.35, (dwellWeights[cat] || 0) / 45)

  const published = item.published_at || item.created_at || new Date().toISOString()
  const hoursAgo = (Date.now() - new Date(published).getTime()) / 3600000
  const freshness = Math.max(0.55, 1 - (hoursAgo / 24 / 45) * 0.35)

  const platformBoost =
    item.platform === 'arena' ? 0.92 :
    item.platform === 'unsplash' ? -0.12 :
    item.platform === 'pexels' ? -0.18 :
    -2

  const categoryBoost =
    ['branding', 'typography', 'design', 'web', 'fashion', 'interior_design', 'art'].includes(cat)
      ? 0.34
      : -0.65

  const imageBoost = item.image_url ? 0.18 : -3

  const qualityBoost = discoveryQualityScore(item) * 0.32

  return (catWeight + dwellBoost + platformBoost + categoryBoost + imageBoost + qualityBoost) * freshness
}

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')
  const limit = Math.min(parseInt(searchParams.get('limit') || '40'), 60)
  const offset = parseInt(searchParams.get('offset') || '0')
  const seed = parseInt(searchParams.get('seed') || String(Math.floor(Date.now() / 86400000)))

  try {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const weights: Record<string, number> = profile?.category_weights || {
      branding: 0.95,
      typography: 0.92,
      design: 0.90,
      web: 0.82,
      fashion: 0.78,
      interior_design: 0.76,
      art: 0.72,
      social_design: 0.66,
      ai: 0.55,
      lifestyle: 0.45,
      growth: 0.35,
    }

    const dwellWeights: Record<string, number> = profile?.dwell_weights || {}

    const { data: recentInteractions } = await supabase
      .from('interactions')
      .select('content_id, action, read_seconds, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(400)

    const interactionIds = [
      ...new Set((recentInteractions || []).map((row) => row.content_id).filter(Boolean)),
    ]
    const { data: signalItems } = interactionIds.length
      ? await supabase
          .from('content_items')
          .select('id, category, platform, title, summary, artist_name')
          .in('id', interactionIds)
      : { data: [] }
    const taste = buildTasteProfile(recentInteractions || [], signalItems || [])

    // Home/Scopri deve essere SOLO piattaforme immagini/reference.
    // Niente RSS, niente articoli, niente news.
    if (typeFilter === 'image' || !typeFilter) {
      const totalNeeded = offset + limit
      const fetchLimit = Math.max(180, totalNeeded * 8)

      const { data, error } = await supabase
        .from('content_items')
        .select('*, sources(name, category)')
        .eq('type', 'image')
        .in('platform', ['arena', 'unsplash', 'pexels'])
        .not('image_url', 'is', null)
        .order('published_at', { ascending: false })
        .limit(fetchLimit)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const raw = (data || []) as FeedRow[]

      const scored = raw
        .filter(isHighQualityDiscoveryItem)
        .map((item) => ({
          ...item,
          _score:
            scoreItem(item, weights, dwellWeights) +
            tasteBoost(item, taste) +
            deterministicJitter(String(item.id), seed) * 0.14,
        }))
        .filter((item) => item.image_url && item._score > 0.8)
        .sort((a, b) => b._score - a._score)

      const exploration = raw
        .filter((item) => item.image_url && !taste.negativeIds.has(item.id))
        .filter(isHighQualityDiscoveryItem)
        .map((item) => {
          const familiarCategory = Math.max(
            0,
            taste.categories[item.category || ''] || 0
          )
          const familiarArtist = Math.max(
            0,
            taste.artists[item.artist_name || ''] || 0
          )
          return {
            ...item,
            _score:
              scoreItem(item, {}, {}) -
              familiarCategory / 22 -
              familiarArtist / 16 +
              discoveryQualityScore(item) * 0.36 +
              deterministicJitter(String(item.id), seed + 97) * 0.55,
          }
        })
        .sort((a, b) => b._score - a._score)

      // Mantiene il ranking appreso. Il piccolo jitter sopra evita un feed immobile.
      const arena = scored.filter((item) => item.platform === 'arena')
      const unsplash = scored.filter((item) => item.platform === 'unsplash')
      const pexels = scored.filter((item) => item.platform === 'pexels')

      const personalized: ScoredFeedRow[] = []
      let ai = 0
      let ui = 0
      let pi = 0

      for (let i = 0; i < totalNeeded + 40; i++) {
        // Are.na prima. Stock solo come accento raro, mai come base del gusto.
        if (i % 14 === 6 && ui < unsplash.length) personalized.push(unsplash[ui++])
        else if (i % 14 === 13 && pi < pexels.length) personalized.push(pexels[pi++])
        else if (ai < arena.length) personalized.push(arena[ai++])
        else if (ui < unsplash.length && personalized.length < limit) personalized.push(unsplash[ui++])
        else if (pi < pexels.length && personalized.length < limit) personalized.push(pexels[pi++])
      }

      // 80% gusto appreso, 20% caos controllato di qualità.
      const mixed: ScoredFeedRow[] = []
      const selected = new Set<string>()
      let personalIndex = 0
      let explorationIndex = 0
      const takeNext = (pool: ScoredFeedRow[], start: number) => {
        let index = start
        while (index < pool.length && selected.has(pool[index].id)) index++
        return { item: pool[index], next: index + 1 }
      }

      for (let index = 0; index < totalNeeded + 40; index++) {
        const useExploration = index % 5 === 4
        let picked = useExploration
          ? takeNext(exploration, explorationIndex)
          : takeNext(personalized, personalIndex)
        if (useExploration) explorationIndex = picked.next
        else personalIndex = picked.next

        if (!picked.item) {
          picked = useExploration
            ? takeNext(personalized, personalIndex)
            : takeNext(exploration, explorationIndex)
          if (useExploration) personalIndex = picked.next
          else explorationIndex = picked.next
        }
        if (!picked.item) break
        selected.add(picked.item.id)
        mixed.push({
          ...picked.item,
          discovery_mode: useExploration ? 'outside_bubble' : 'for_you',
        })
      }

      // De-duplica anche URL/immagini equivalenti.
      const seen = new Set<string>()
      const unique = mixed.filter((item) => {
        const key = item.url || item.image_url || item.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const page = unique.slice(offset, offset + limit)

      return NextResponse.json({
        items: page,
        total: unique.length,
        hasMore: offset + limit < unique.length,
      })
    }

    // Fallback per altre pagine che chiedono type diversi
    const { data, error } = await supabase
      .from('content_items')
      .select('*, sources(name, category)')
      .eq('type', typeFilter)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      items: data || [],
      total: data?.length || 0,
      hasMore: Boolean(data && data.length === limit),
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
