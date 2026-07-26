import { isIP } from 'node:net'
import { resolve4, resolve6 } from 'node:dns/promises'

export type LinkPreview = {
  title: string | null
  description: string | null
  image: string | null
  domain: string
}

const MAX_REDIRECTS = 3
const MAX_HTML_BYTES = 1_000_000

function isPrivateIpv4(value: string) {
  const parts = value.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIp(value: string) {
  const ip = value.toLocaleLowerCase('en-US').replace(/^\[|\]$/g, '')
  if (isIP(ip) === 4) return isPrivateIpv4(ip)
  if (isIP(ip) !== 6) return true

  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice('::ffff:'.length)
    return isIP(mapped) !== 4 || isPrivateIpv4(mapped)
  }

  return (
    ip === '::' ||
    ip === '::1' ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    /^fe[89ab]/.test(ip)
  )
}

async function assertPublicUrl(value: string) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL')
  if (url.username || url.password) throw new Error('URL credentials are not allowed')

  const hostname = url.hostname.toLocaleLowerCase('en-US').replace(/^\[|\]$/g, '')
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Private host')
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('Private IP')
    return url
  }

  const [ipv4, ipv6] = await Promise.all([
    resolve4(hostname).catch(() => []),
    resolve6(hostname).catch(() => []),
  ])
  const addresses = [...ipv4, ...ipv6]
  if (!addresses.length || addresses.some(isPrivateIp)) throw new Error('Unsafe host')

  return url
}

async function readLimitedText(response: Response) {
  const declaredLength = Number(response.headers.get('content-length') || '0')
  if (declaredLength > MAX_HTML_BYTES) throw new Error('Response too large')
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let output = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_HTML_BYTES) {
      await reader.cancel()
      throw new Error('Response too large')
    }
    output += decoder.decode(value, { stream: true })
  }

  return output + decoder.decode()
}

async function safeFetch(input: string) {
  let current = await assertPublicUrl(input)

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (compatible; GrowBot/1.0; +https://grow-eight-kappa.vercel.app)',
      },
    })

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: current }
    }

    const location = response.headers.get('location')
    if (!location || redirect === MAX_REDIRECTS) throw new Error('Unsafe redirect')
    current = await assertPublicUrl(new URL(location, current).toString())
  }

  throw new Error('Too many redirects')
}

function safeMetadataUrl(value: string | null, base: URL) {
  if (!value) return null
  try {
    const url = new URL(value, base)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const { response, finalUrl } = await safeFetch(url)
    const domain = finalUrl.hostname.replace(/^www\./, '')
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok || !contentType.toLocaleLowerCase('en-US').includes('text/html')) {
      return { title: null, description: null, image: null, domain }
    }

    const html = await readLimitedText(response)
    const get = (property: string) => {
      const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const match =
        html.match(new RegExp(`<meta[^>]+property=["']og:${escaped}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${escaped}["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'))
      return match?.[1] ? decode(match[1]).slice(0, 1_000) : null
    }

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = get('title') || (titleTag?.[1] ? decode(titleTag[1]).slice(0, 500) : null)
    const description = get('description')
    const image = safeMetadataUrl(get('image'), finalUrl)

    return { title, description, image, domain }
  } catch {
    return null
  }
}

export async function fetchLinkTitle(url: string): Promise<string | null> {
  const preview = await fetchLinkPreview(url)
  return preview?.title ?? null
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)))
    .trim()
}
