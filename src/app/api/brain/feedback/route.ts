import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import {
  BRAIN_FEEDBACK_SIGNALS,
  type BrainFeedbackSignal,
} from '@/lib/brain/daily-brief'

const ALLOWED_SIGNALS = new Set<string>(BRAIN_FEEDBACK_SIGNALS)

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const signal =
    body && ALLOWED_SIGNALS.has(body.signal)
      ? (body.signal as BrainFeedbackSignal)
      : null
  const sourceType =
    typeof body?.source_type === 'string'
      ? body.source_type.trim().slice(0, 30)
      : ''
  const sourceId =
    typeof body?.source_id === 'string'
      ? body.source_id.trim().slice(0, 120)
      : ''
  const title =
    typeof body?.title === 'string' ? body.title.trim().slice(0, 240) : ''
  const contentId =
    typeof body?.content_id === 'string'
      ? body.content_id.trim().slice(0, 120)
      : ''

  if (!signal || !sourceType || !sourceId || !title) {
    return NextResponse.json(
      { error: 'Feedback incompleto' },
      { status: 400 }
    )
  }

  const memory = [
    '[GROW_BRAIN_FEEDBACK]',
    `signal=${signal}`,
    `source_type=${sourceType}`,
    `source_id=${sourceId}`,
    `title=${JSON.stringify(title)}`,
  ].join(' ')

  const { error: memoryError } = await supabase
    .from('memories')
    .insert({ user_id: user.id, content: memory })

  if (memoryError) {
    return NextResponse.json({ error: memoryError.message }, { status: 500 })
  }

  const interactionAction =
    signal === 'not_for_me'
      ? 'less_like_this'
      : signal === 'useful_now'
        ? 'more_like_this'
        : signal === 'nourishment' || signal === 'keep'
          ? 'like'
          : signal === 'used'
            ? 'open'
            : null

  if (contentId && interactionAction) {
    await supabase.from('interactions').insert({
      user_id: user.id,
      content_id: contentId,
      action: interactionAction,
    })
  }

  return NextResponse.json({ ok: true })
}
