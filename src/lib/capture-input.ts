export type CaptureInput = {
  content?: string
  url?: string
  image_base64?: string
  image_mime?: string
  client?: string
  source?: string
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i
const MAX_BODY_BYTES = 12_000_000
const MAX_CONTENT_LENGTH = 20_000
const MAX_URL_LENGTH = 4_000

function cleanText(value: unknown, maxLength = MAX_CONTENT_LENGTH) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function sanitizeCaptureInput(value: CaptureInput | null) {
  if (!value || typeof value !== 'object') return null
  return {
    content: cleanText(value.content),
    url: cleanText(value.url, MAX_URL_LENGTH),
    image_base64: cleanText(value.image_base64, 11_000_000),
    image_mime: cleanText(value.image_mime, 100),
    client: cleanText(value.client, 100),
    source: cleanText(value.source, 40),
  } satisfies CaptureInput
}

export function extractSharedUrl(value: string) {
  const match = value.match(URL_PATTERN)?.[0]
  return match?.replace(/[),.;!?]+$/, '') || null
}

export function normalizeSharedUrl(value: string) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null

    url.hash = ''
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    const isSocial =
      hostname === 'instagram.com' ||
      hostname.endsWith('.instagram.com') ||
      hostname === 'tiktok.com' ||
      hostname.endsWith('.tiktok.com')

    if (isSocial) {
      url.search = ''
    } else {
      for (const key of [...url.searchParams.keys()]) {
        if (
          key.startsWith('utm_') ||
          ['fbclid', 'gclid', 'igshid', 'si'].includes(key)
        ) {
          url.searchParams.delete(key)
        }
      }
    }

    return url.toString()
  } catch {
    return null
  }
}

export function detectCaptureSource(url: string | null, fallback?: string) {
  if (fallback && fallback !== 'shortcut') return fallback
  if (!url) return fallback || 'shortcut'

  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('instagram.com')) return 'instagram'
    if (host.includes('tiktok.com')) return 'tiktok'
  } catch {}

  return fallback || 'shortcut'
}

export async function parseCaptureInput(request: Request): Promise<CaptureInput | null> {
  const contentType = request.headers.get('content-type') || ''
  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (declaredLength > MAX_BODY_BYTES) return null

  if (contentType.includes('application/json')) {
    const value = (await request.json().catch(() => null)) as CaptureInput | null
    return sanitizeCaptureInput(value)
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await request.formData().catch(() => null)
    if (!form) return null
    return {
      content: cleanText(form.get('content') || form.get('text')),
      url: cleanText(form.get('url'), MAX_URL_LENGTH),
      client: cleanText(form.get('client'), 100),
      source: cleanText(form.get('source'), 40),
    }
  }

  if (contentType.includes('text/plain')) {
    const text = cleanText(await request.text())
    return text ? { content: text } : null
  }

  const value = (await request.json().catch(() => null)) as CaptureInput | null
  return sanitizeCaptureInput(value)
}
