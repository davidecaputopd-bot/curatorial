export type LinkPreview = {
  title: string | null
  description: string | null
  image: string | null
  domain: string
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrowBot/1.0; +https://grow-eight-kappa.vercel.app)' },
    })
    clearTimeout(timeout)

    if (!res.ok) return { title: null, description: null, image: null, domain }

    const html = await res.text()

    const get = (property: string) => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
      return m?.[1] ? decode(m[1]) : null
    }

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = get('title') || (titleTag?.[1] ? decode(titleTag[1]) : null)
    const description = get('description')
    const image = get('image')

    return { title, description, image, domain }
  } catch {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '')
      return { title: null, description: null, image: null, domain }
    } catch {
      return null
    }
  }
}

// kept for backward compat
export async function fetchLinkTitle(url: string): Promise<string | null> {
  const p = await fetchLinkPreview(url)
  return p?.title ?? null
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim()
}
