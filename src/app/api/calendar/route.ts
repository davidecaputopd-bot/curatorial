import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const client = searchParams.get('client')
  const week = searchParams.get('week')

  let query = supabase
    .from('calendar_items')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })

  if (client) query = query.eq('client', client)
  if (week) {
    const start = new Date(week)
    const end = new Date(week)
    end.setDate(end.getDate() + 7)
    query = query.gte('scheduled_date', start.toISOString().split('T')[0])
                 .lt('scheduled_date', end.toISOString().split('T')[0])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.client || !body.title)
    return NextResponse.json({ error: 'client e title richiesti' }, { status: 400 })

  const { data, error } = await supabase
    .from('calendar_items')
    .insert({ user_id: user.id, ...body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...fields } = await request.json()
  const { data, error } = await supabase
    .from('calendar_items')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase
    .from('calendar_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
