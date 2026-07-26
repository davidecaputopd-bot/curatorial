export type CaptureInput = {
  content?: string
  url?: string
  image_base64?: string
  image_mime?: string
  client?: string
  source?: string
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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

  if (contentType.includes('application/json')) {
    return (await request.json().catch(() => null)) as CaptureInput | null
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await request.formData().catch(() => null)
    if (!form) return null
    return {
      content: cleanText(form.get('content') || form.get('text')),
      url: cleanText(form.get('url')),
      client: cleanText(form.get('client')),
      source: cleanText(form.get('source')),
    }
  }

  if (contentType.includes('text/plain')) {
    const text = (await request.text()).trim()
    return text ? { content: text } : null
  }

  return (await request.json().catch(() => null)) as CaptureInput | null
}
