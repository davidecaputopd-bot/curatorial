import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const contentId = body.content_id || body.itemId
  const action = typeof body.action === 'string' ? body.action : ''
  const readSeconds = Number(body.read_seconds ?? body.seconds ?? 0)
  const allowedActions = new Set([
    'save',
    'like',
    'dwell',
    'skip',
    'more_like_this',
    'less_like_this',
  ])

  if (!contentId || !allowedActions.has(action)) {
    return NextResponse.json({ error: 'Interazione non valida' }, { status: 400 })
  }

  try {
    const { error: interactionError } = await supabase.from('interactions').insert({
      content_id: contentId,
      action,
      read_seconds: action === 'dwell' ? Math.min(Math.max(readSeconds, 0), 300) : null,
      user_id: user.id,
    })
    if (interactionError) throw interactionError

    // Profilo compatto per compatibilità; il feed usa anche gli eventi recenti in dettaglio.
    if (action !== 'dwell' || readSeconds >= 3) {
      const { data: item } = await supabase
        .from('content_items')
        .select('category')
        .eq('id', contentId)
        .single()

      if (item?.category) {
        const { data: profile } = await supabase
          .from('user_profile')
          .select('category_weights, dwell_weights')
          .eq('user_id', user.id)
          .single()

        const weights = { ...(profile?.category_weights || {}) }
        const dwellWeights = { ...(profile?.dwell_weights || {}) }
        const delta =
          action === 'more_like_this' ? 0.14 :
          action === 'save' ? 0.09 :
          action === 'like' ? 0.07 :
          action === 'less_like_this' ? -0.16 :
          action === 'skip' ? -0.05 :
          Math.min(0.06, readSeconds / 500)
        weights[item.category] = Math.min(
          1.5,
          Math.max(0.15, (weights[item.category] ?? 0.65) + delta)
        )
        if (action === 'dwell') {
          const previous = Number(dwellWeights[item.category] || 0)
          dwellWeights[item.category] = Math.min(
            120,
            previous ? previous * 0.75 + readSeconds * 0.25 : readSeconds
          )
        }

        await supabase
          .from('user_profile')
          .update({
            category_weights: weights,
            dwell_weights: dwellWeights,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
