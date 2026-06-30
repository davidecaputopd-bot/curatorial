import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const typeFilter = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '40')
  const offset = parseInt(searchParams.get('offset') || '0')
  const seed = parseInt(searchParams.get('seed') || String(Math.floor(Date.now() / 86400000)))

  try {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const weights: Record<string, number> = profile?.category_weights || {
      branding: 0.90, typography: 0.85, web: 0.80,
      fashion: 0.80, interior_design: 0.75, social_design: 0.80,
      design: 0.85, art: 0.70, ai: 0.85,
      '3d_printing': 0.60, lifestyle: 0.65
    }

    const dwellWeights: Record<string, number> = profile?.dwell_weights || {}

    const coreCategories = Object.entries(weights)
      .filter(([, w]) => w >= 0.65)
      .sort(([, a], [, b]) => b - a)
      .map(([cat]) => cat)

    const surpriseCategories = Object.entries(weights)
      .filter(([, w]) => w >= 0.30 && w < 0.65)
      .map(([cat]) => cat)

    const totalNeeded = offset + limit
    const mainLimit = Math.floor(totalNeeded * 0.80)
    const surpriseLimit = totalNeeded - mainLimit

    // Main query
    let mainQuery = supabase
      .from('content_items')
      .select('*, sources(name, category)')
      .order('published_at', { ascending: false })
      .limit(mainLimit * 3)

    // Filtro type
    if (typeFilter) {
      mainQuery = mainQuery.eq('type', typeFilter)
    }

    // Filtro category
    if (category) {
      mainQuery = mainQuery.eq('category', category)
    } else if (!typeFilter) {
      mainQuery = mainQuery.in('category', coreCategories)
    }

    const { data: mainRaw } = await mainQuery

    const mainScored = (mainRaw || [])
      .map(item => {
        const catWeight = weights[item.category] || 0.5
        const dwellBoost = Math.min(0.25, (dwellWeights[item.category] || 0) / 60)
        const hoursAgo = (Date.now() - new Date(item.published_at).getTime()) / 3600000
        const freshness = Math.max(0.3, 1 - (hoursAgo / 72) * 0.7)
        const hasImage = item.image_url ? 0.05 : 0
        return {
          ...item,
          _score: (catWeight + dwellBoost + hasImage) * freshness,
          is_serendipity: false
        }
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, mainLimit)

    let surpriseItems: any[] = []
    if (!category && !typeFilter) {
      const allCategories = Object.keys(weights)
      const zonaGrigia = surpriseCategories.length > 0
        ? surpriseCategories
        : allCategories.filter(c => !coreCategories.includes(c))

      if (zonaGrigia.length > 0) {
        const { data: surpriseRaw } = await supabase
          .from('content_items')
          .select('*, sources(name, category)')
          .in('category', zonaGrigia)
          .order('published_at', { ascending: false })
          .limit(surpriseLimit * 8)

        surpriseItems = seededShuffle(surpriseRaw || [], seed)
          .slice(0, surpriseLimit)
          .map(i => ({ ...i, is_serendipity: true }))
      }
    }

    const surprisePositions = new Set([4, 9, 14, 20, 27, 33, 38])
    const combined: any[] = []
    let mainIdx = 0
    let surpriseIdx = 0

    for (let i = 0; i < totalNeeded; i++) {
      if (surprisePositions.has(i) && surpriseIdx < surpriseItems.length) {
        combined.push(surpriseItems[surpriseIdx++])
      } else if (mainIdx < mainScored.length) {
        combined.push(mainScored[mainIdx++])
      }
    }

    while (surpriseIdx < surpriseItems.length) {
      combined.push(surpriseItems[surpriseIdx++])
    }

    const page = combined.slice(offset, offset + limit)

    return NextResponse.json({ items: page, total: combined.length, hasMore: offset + limit < combined.length })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
