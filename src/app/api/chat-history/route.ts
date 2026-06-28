import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50)
    return NextResponse.json({ messages: data || [] })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role, content, imageUrl } = await request.json()
    await supabase.from('chat_history').insert({
      role,
      content,
      image_url: imageUrl || null,
      user_id: user.id,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabase.from('chat_history').delete().eq('user_id', user.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
