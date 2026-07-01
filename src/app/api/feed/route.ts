import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function scoreItem(item: any, weights: Record<string, number>, dwellWeights: Record<string, number>) {
  const cat = item.category || 'design'
  const catWeight = weights[cat] ?? 0.65
  const dwellBoost = Math.min(0.35, (dwellWeights[cat] || 0) / 45)

  const published = item.published_at || item.created_at || new Date().toISOString()
  const hoursAgo = (Date.now() - new Date(published).getTime()) / 3600000
  const freshness = Math.max(0.55, 1 - (hoursAgo / 24 / 45) * 0.35)

  const platformBoost =
    item.platform === 'arena' ? 0.62 :
    item.platform === 'unsplash' ? 0.16 :
    item.platform === 'pexels' ? 0.12 :
    -2

  const categoryBoost =
    ['branding', 'typography', 'design', 'web', 'fashion', 'interior_design', 'art'].includes(cat)
      ? 0.20
      : -0.15

  const imageBoost = item.image_url ? 0.18 : -3

  return (catWeight + dwellBoost + platformBoost + categoryBoost + imageBoost) * freshness
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

      const raw = data || []

      const scored = raw
        .map((item: any) => ({
          ...item,
          _score: scoreItem(item, weights, dwellWeights),
        }))
        .filter((item: any) => item.image_url && item._score > -1)
        .sort((a: any, b: any) => b._score - a._score)

      // Mix controllato: Are.na resta principale, stock solo supporto.
      const arena = seededShuffle(scored.filter((i: any) => i.platform === 'arena'), seed)
      const unsplash = seededShuffle(scored.filter((i: any) => i.platform === 'unsplash'), seed + 17)
      const pexels = seededShuffle(scored.filter((i: any) => i.platform === 'pexels'), seed + 31)

      const mixed: any[] = []
      let ai = 0
      let ui = 0
      let pi = 0

      for (let i = 0; i < totalNeeded + 40; i++) {
        // Pattern: Are.na, Are.na, Unsplash/Pexels, Are.na...
        if (i % 5 === 2 && ui < unsplash.length) mixed.push(unsplash[ui++])
        else if (i % 7 === 4 && pi < pexels.length) mixed.push(pexels[pi++])
        else if (ai < arena.length) mixed.push(arena[ai++])
        else if (ui < unsplash.length) mixed.push(unsplash[ui++])
        else if (pi < pexels.length) mixed.push(pexels[pi++])
      }

      // De-duplica URL/immagini
      const seen = new Set<string>()
      const unique = mixed.filter((item: any) => {
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
