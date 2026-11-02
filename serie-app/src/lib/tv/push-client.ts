// Iscrizione del dispositivo alle notifiche push (lato browser).
function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function currentPushSubscription() {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  return registration ? registration.pushManager.getSubscription() : null
}

export async function enablePush() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!pushSupported()) throw new Error('Questo browser non supporta le notifiche push.')
  if (!key) throw new Error('Chiave VAPID mancante: aggiungi NEXT_PUBLIC_VAPID_PUBLIC_KEY.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permesso notifiche negato.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }))

  const response = await fetch('/api/tv/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), test: true }),
  })
  if (!response.ok) throw new Error('Registrazione non riuscita.')
  return subscription
}

export async function disablePush() {
  const subscription = await currentPushSubscription()
  if (!subscription) return
  await fetch('/api/tv/push', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
}
