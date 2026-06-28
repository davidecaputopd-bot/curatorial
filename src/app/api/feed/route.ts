import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '40')

  try {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('name', 'Davide')
      .single()

    const weights: Record<string, number> = profile?.category_weights || {
      branding: 0.90, typography: 0.85, web: 0.80,
      fashion: 0.80, interior_design: 0.75, social_design: 0.80,
      design: 0.85, art: 0.70, ai: 0.85,
      '3d_printing': 0.60, lifestyle: 0.65
    }

    const dwellWeights: Record<string, number> = profile?.dwell_weights || {}

    // CORE: peso >= 0.65
    const coreCategories = Object.entries(weights)
      .filter(([, w]) => w >= 0.65)
      .sort(([, a], [, b]) => b - a)
      .map(([cat]) => cat)

    // SERENDIPITY ZONE: peso 0.30–0.64
    const surpriseCategories = Object.entries(weights)
      .filter(([, w]) => w >= 0.30 && w < 0.65)
      .map(([cat]) => cat)

    const mainLimit = Math.floor(limit * 0.80)
    const surpriseLimit = limit - mainLimit

    // Fetch core
    let mainQuery = supabase
      .from('content_items')
      .select('*, sources(name, category)')
      .order('published_at', { ascending: false })
      .limit(mainLimit * 3)

    if (category) {
      mainQuery = mainQuery.eq('category', category)
    } else {
      mainQuery = mainQuery.in('category', coreCategories)
    }

    const { data: mainRaw } = await mainQuery

    // Scoring con dwell time + freshness
    const mainScored = (mainRaw || [])
      .map(item => {
        const catWeight = weights[item.category] || 0.5
        const dwellBoost = Math.min(0.25, (dwellWeights[item.category] || 0) / 60)
        const hoursAgo = (Date.now() - new Date(item.published_at).getTime()) / 3600000
        const freshness = Math.max(0.3, 1 - (hoursAgo / 72) * 0.7)
        const hasImage = item.image_url ? 0.05 : 0 // boost per chi ha immagine
        return {
          ...item,
          _score: (catWeight + dwellBoost + hasImage) * freshness,
          is_serendipity: false
        }
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, mainLimit)

    // Fetch serendipity — random genuino dalla zona grigia
    let surpriseItems: any[] = []
    if (!category) {
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

        surpriseItems = (surpriseRaw || [])
          .sort(() => Math.random() - 0.5)
          .slice(0, surpriseLimit)
          .map(i => ({ ...i, is_serendipity: true }))
      }
    }

    // Interleave: sorpresa ogni ~5 card core, mai in prima posizione
    const surprisePositions = new Set([4, 9, 14, 20, 27, 33, 38])
    const combined: any[] = []
    let mainIdx = 0
    let surpriseIdx = 0

    for (let i = 0; i < limit; i++) {
      if (surprisePositions.has(i) && surpriseIdx < surpriseItems.length) {
        combined.push(surpriseItems[surpriseIdx++])
      } else if (mainIdx < mainScored.length) {
        combined.push(mainScored[mainIdx++])
      }
    }

    // Aggiungi eventuali sorprese rimaste in fondo
    while (surpriseIdx < surpriseItems.length) {
      combined.push(surpriseItems[surpriseIdx++])
    }

    return NextResponse.json({ items: combined, total: combined.length })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
