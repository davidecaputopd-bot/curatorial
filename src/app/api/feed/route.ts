import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    let query = supabase
      .from('content_items')
      .select('*, sources(name)')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data || [], total: data?.length || 0 })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
