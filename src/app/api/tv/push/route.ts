import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { sendPush } from '@/lib/tv/push'

// Registra questo dispositivo per le notifiche delle nuove puntate.
export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription, test } = await request.json()
  if (subscription) {
    const { error } = await supabase.from('tv_push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'endpoint' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (test) {
    const result = await sendPush(supabase, user.id, {
      title: 'GROW Serie',
      body: 'Notifiche attive: ti avviso quando esce una nuova puntata.',
      url: '/serie',
    })
    return NextResponse.json(result)
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await request.json()
  await supabase.from('tv_push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
  return NextResponse.json({ ok: true })
}
