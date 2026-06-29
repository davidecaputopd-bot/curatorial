import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const listMode = searchParams.get('list')
    const conversationId = searchParams.get('conversation_id')

    if (listMode) {
      const { data } = await supabase
        .from('chat_history')
        .select('conversation_id, content, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      const map = new Map<string, { conversation_id: string; title: string; updated_at: string }>()
      for (const row of data || []) {
        const existing = map.get(row.conversation_id)
        if (!existing) {
          map.set(row.conversation_id, {
            conversation_id: row.conversation_id,
            title: row.role === 'user' ? row.content.slice(0, 60) : 'Conversazione',
            updated_at: row.created_at,
          })
        } else {
          existing.updated_at = row.created_at
        }
      }

      const conversations = Array.from(map.values()).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      return NextResponse.json({ conversations })
    }

    let query = supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (conversationId) query = query.eq('conversation_id', conversationId)

    const { data } = await query
    return NextResponse.json({ messages: (data || []).reverse() })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role, content, imageUrl, conversationId } = await request.json()
    if (!conversationId) return NextResponse.json({ error: 'conversationId richiesto' }, { status: 400 })

    await supabase.from('chat_history').insert({
      role,
      content,
      image_url: imageUrl || null,
      conversation_id: conversationId,
      user_id: user.id,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({} as { conversationId?: string }))
    let query = supabase.from('chat_history').delete().eq('user_id', user.id)
    if (body.conversationId) query = query.eq('conversation_id', body.conversationId)

    await query
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
