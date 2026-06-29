export async function fetchLinkTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrowBot/1.0)' },
    })
    clearTimeout(timeout)

    if (!res.ok) return null

    const html = await res.text()
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = ogTitle?.[1] || titleTag?.[1]

    return title ? decodeHtmlEntities(title.trim()) : null
  } catch {
    return null
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}
