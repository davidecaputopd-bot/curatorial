export function isTikTokUrl(value: string | null | undefined) {
  if (!value) return false
  try {
    const hostname = new URL(value).hostname.toLocaleLowerCase('en-US')
    return (
      hostname === 'tiktok.com' ||
      hostname.endsWith('.tiktok.com') ||
      hostname === 'tiktokv.com' ||
      hostname.endsWith('.tiktokv.com')
    )
  } catch {
    return false
  }
}

export function tiktokVideoId(value: string | null | undefined) {
  if (!value || !isTikTokUrl(value)) return null
  return value.match(/\/(?:share\/)?video\/(\d+)/i)?.[1] || null
}

type TikTokOEmbed = {
  title?: string
  author_name?: string
  thumbnail_url?: string
}

export async function fetchTikTokPreview(value: string) {
  if (!isTikTokUrl(value)) return null

  try {
    const videoId = tiktokVideoId(value)
    const previewUrl =
      videoId && new URL(value).hostname.includes('tiktokv.com')
        ? `https://www.tiktok.com/@/video/${videoId}`
        : value
    const endpoint = new URL('https://www.tiktok.com/oembed')
    endpoint.searchParams.set('url', previewUrl)
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(6_000),
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null

    const payload = (await response.json()) as TikTokOEmbed
    return {
      title: payload.title?.trim().slice(0, 500) || null,
      description: payload.author_name
        ? `TikTok di ${payload.author_name.trim().slice(0, 150)}`
        : null,
      image: payload.thumbnail_url || null,
      domain: 'tiktok.com',
    }
  } catch {
    return null
  }
}
