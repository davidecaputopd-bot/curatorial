import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    // Prendi profilo utente
    const { data: profile } = await supabase
      .from('user_profile')
      .select('*')
      .single()

    const weights = profile?.category_weights || {
      branding: 0.30, typography: 0.20, social: 0.15,
      lifestyle: 0.15, ai: 0.10, growth: 0.10
    }

    // Categorie ordinate per peso
    const topCategories = Object.entries(weights)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .map(([cat]) => cat)

    const mainLimit = Math.floor(limit * 0.80)
    const surpriseLimit = limit - mainLimit

    // 80% — contenuti allineati al profilo
    let mainQuery = supabase
      .from('content_items')
      .select('*, sources(name)')
      .order('published_at', { ascending: false })
      .limit(mainLimit)

    if (category) {
      mainQuery = mainQuery.eq('category', category)
    } else {
      mainQuery = mainQuery.in('category', topCategories.slice(0, 3))
    }

    if (type) mainQuery = mainQuery.eq('type', type)

    const { data: mainItems } = await mainQuery

    // 20% — sorpresa: categorie meno viste
    const surpriseCategories = topCategories.slice(3)
    let surpriseItems: any[] = []

    if (surpriseCategories.length > 0 && !category) {
      const { data } = await supabase
        .from('content_items')
        .select('*, sources(name)')
        .in('category', surpriseCategories)
        .order('published_at', { ascending: false })
        .limit(surpriseLimit)

      surpriseItems = data || []
    }

    // Mescola 80% e 20% in modo intelligente
    const combined = []
    const main = mainItems || []
    const surprise = surpriseItems || []

    for (let i = 0; i < main.length; i++) {
      combined.push({ ...main[i], is_serendipity: false })
      // Inserisci una sorpresa ogni 4 contenuti
      if ((i + 1) % 4 === 0 && surprise.length > 0) {
        combined.push({ ...surprise.shift(), is_serendipity: true })
      }
    }

    return NextResponse.json({ items: combined, total: combined.length })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}