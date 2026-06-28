import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('interactions')
      .select('content_id, created_at')
      .eq('action', 'save')
      .order('created_at', { ascending: false })

    if (error) throw error

    const ids = [...new Set((data || []).map((i: any) => i.content_id))]

    if (ids.length === 0) return NextResponse.json({ items: [] })

    const { data: items, error: err2 } = await supabase
      .from('content_items')
      .select('*, sources(name)')
      .in('id', ids)

    if (err2) throw err2

    // Ordina per data di salvataggio
    const savedAt: Record<string, string> = {}
    data?.forEach((i: any) => { if (!savedAt[i.content_id]) savedAt[i.content_id] = i.created_at })
    const sorted = (items || []).sort((a: any, b: any) =>
      new Date(savedAt[b.id]).getTime() - new Date(savedAt[a.id]).getTime()
    )

    return NextResponse.json({ items: sorted })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { content_id } = await request.json()
    await supabase
      .from('interactions')
      .delete()
      .eq('content_id', content_id)
      .eq('action', 'save')
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
