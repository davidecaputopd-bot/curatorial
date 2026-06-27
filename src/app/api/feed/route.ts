import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('name', 'Davide')
      .single()

    const weights = profile?.category_weights || {
      branding: 0.25, typography: 0.20, social: 0.20,
      ai: 0.20, lifestyle: 0.10, growth: 0.05
    }

    const topCategories = Object.entries(weights)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .map(([cat]) => cat)

    const mainLimit = Math.floor(limit * 0.80)
    const surpriseLimit = limit - mainLimit

    let mainQuery = supabase
      .from('content_items')
      .select('*, sources(name)')
      .order('published_at', { ascending: false })
      .limit(mainLimit)

    if (category) {
      mainQuery = mainQuery.eq('category', category)
    } else {
      mainQuery = mainQuery.in('category', topCategories.slice(0, 4))
    }

    const { data: mainItems } = await mainQuery

    let surpriseItems: any[] = []
    if (!category) {
      const surpriseCategories = topCategories.slice(4)
      if (surpriseCategories.length > 0) {
        const { data } = await supabase
          .from('content_items')
          .select('*, sources(name)')
          .in('category', surpriseCategories)
          .order('published_at', { ascending: false })
          .limit(surpriseLimit)
        surpriseItems = data || []
      }
    }

    const combined = []
    const main = mainItems || []
    const surprise = [...surpriseItems]

    for (let i = 0; i < main.length; i++) {
      combined.push({ ...main[i], is_serendipity: false })
      if ((i + 1) % 4 === 0 && surprise.length > 0) {
        combined.push({ ...surprise.shift(), is_serendipity: true })
      }
    }

    return NextResponse.json({ items: combined, total: combined.length })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
