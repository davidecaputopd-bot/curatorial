import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

let configured = false

function configure() {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:grow@example.com',
    publicKey,
    privateKey
  )
  configured = true
  return true
}

export type PushPayload = { title: string; body: string; url: string; tag?: string }

// Invia a tutti i dispositivi registrati dell'utente; elimina le iscrizioni scadute.
export async function sendPush(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
) {
  if (!configure()) return { sent: 0, reason: 'VAPID non configurato' }

  const { data: subscriptions } = await supabase
    .from('tv_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  let sent = 0
  for (const subscription of subscriptions || []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload)
      )
      sent++
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('tv_push_subscriptions').delete().eq('id', subscription.id)
      }
    }
  }
  return { sent }
}
