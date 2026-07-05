import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const rating = body.rating === 'positive' || body.rating === 'negative'
    ? body.rating
    : null
  const content = typeof body.content === 'string'
    ? body.content.trim().slice(0, 700)
    : ''
  const project = typeof body.project === 'string'
    ? body.project.trim().slice(0, 80)
    : ''

  if (!rating || !content) {
    return NextResponse.json(
      { error: 'rating e content richiesti' },
      { status: 400 }
    )
  }

  const memory = [
    rating === 'positive'
      ? 'Feedback positivo di Davide: considera utile questo approccio.'
      : 'Feedback negativo di Davide: evita di ripetere questo approccio.',
    project ? `Progetto: ${project}.` : '',
    `Risposta valutata: ${content}`,
  ].filter(Boolean).join(' ')

  const { error } = await supabase
    .from('memories')
    .insert({ user_id: user.id, content: memory })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
