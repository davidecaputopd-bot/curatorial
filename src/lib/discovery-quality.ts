type DiscoveryCandidate = {
  category?: string | null
  platform?: string | null
  title?: string | null
  summary?: string | null
  artist_name?: string | null
  image_url?: string | null
  width?: number | null
  height?: number | null
  tags?: string[] | string | null
}

const STRONG_CATEGORIES = new Set([
  'branding',
  'typography',
  'design',
  'fashion',
  'interior_design',
  'art',
  'web',
  'ai',
])

const WEAK_CATEGORIES = new Set([
  'growth',
  'lifestyle',
  'social_design',
  '3d_printing',
])

const CURATED_TERMS = [
  'art direction',
  'campaign',
  'identity',
  'visual identity',
  'typography',
  'editorial',
  'layout',
  'poster',
  'book cover',
  'publication',
  'packaging',
  'label',
  'wine',
  'hospitality',
  'restaurant',
  'menu',
  'still life',
  'photography direction',
  'lookbook',
  'fashion editorial',
  'installation',
  'modernist',
  'archive',
  'type',
  'print',
  'motion identity',
  'ai art',
  'generative art',
  'digital art',
  'computational art',
  'algorithmic art',
  'new media art',
  'media art',
  'synthetic photography',
  'ai cinema',
  'ai film',
  'latent space',
]

const SLOP_TERMS = [
  'machine learning',
  'neural network',
  'technology abstract',
  'futuristic technology',
  'data visualization',
  'social media',
  'instagram',
  'content creator',
  'business',
  'startup',
  'office',
  'laptop',
  'phone',
  'coffee',
  'slow living',
  'travel',
  'minimal aesthetic',
  'lifestyle',
  'smiling',
  'teamwork',
  'influencer',
  'prompt',
  'midjourney prompt',
  'stable diffusion prompt',
  'chatgpt',
  'robot',
  'cyber',
  'metaverse',
]

const GENERIC_TITLES = new Set([
  'untitled',
  'image',
  'photo',
  'design',
  'branding',
  'typography',
  'art',
])

function textFor(item: DiscoveryCandidate) {
  const tags = Array.isArray(item.tags) ? item.tags.join(' ') : item.tags || ''
  return `${item.title || ''} ${item.summary || ''} ${tags}`.toLocaleLowerCase('it-IT')
}

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word))
}

function hasUsefulTitle(title?: string | null) {
  if (!title) return false
  const clean = title.trim().toLocaleLowerCase('it-IT')
  if (clean.length < 5) return false
  return !GENERIC_TITLES.has(clean)
}

export function discoveryQualityScore(item: DiscoveryCandidate) {
  if (!item.image_url) return -10

  const platform = item.platform || ''
  const category = item.category || ''
  const text = textFor(item)
  let score = 0

  if (platform === 'arena') score += 3.2
  else if (platform === 'unsplash') score += 0.35
  else if (platform === 'pexels') score += 0.2
  else score -= 4

  if (STRONG_CATEGORIES.has(category)) score += 1.2
  if (WEAK_CATEGORIES.has(category)) score -= 2.4

  if (hasUsefulTitle(item.title)) score += 0.55
  if (item.summary && item.summary.trim().length > 18) score += 0.35
  if (item.artist_name && item.artist_name.trim().length > 2) score += 0.35

  if (includesAny(text, CURATED_TERMS)) score += 1.15
  if (
    category === 'ai' &&
    includesAny(text, [
      'ai art',
      'generative art',
      'digital art',
      'computational art',
      'algorithmic art',
      'new media art',
      'media art',
      'synthetic photography',
      'ai cinema',
      'ai film',
    ])
  ) {
    score += 1.25
  }
  if (includesAny(text, SLOP_TERMS)) score -= platform === 'arena' ? 1.4 : 3.2

  if (item.width && item.height) {
    const minSide = Math.min(item.width, item.height)
    const ratio = Math.max(item.width, item.height) / Math.max(1, minSide)
    if (minSide >= 700) score += 0.35
    if (minSide < 360) score -= 1.2
    if (ratio > 2.8) score -= 0.45
  }

  return score
}

export function isHighQualityDiscoveryItem(item: DiscoveryCandidate) {
  const score = discoveryQualityScore(item)
  if (item.platform === 'arena') return score >= 2.6
  return score >= 2.9
}

export function isDisplayableDiscoveryItem(item: DiscoveryCandidate) {
  const score = discoveryQualityScore(item)
  if (item.platform === 'arena') return score >= 1.15
  return score >= 0.65
}

export function isAllowedStockQuery(query: string, category: string) {
  const haystack = `${query} ${category}`.toLocaleLowerCase('it-IT')
  if (includesAny(haystack, SLOP_TERMS)) return false
  return includesAny(haystack, CURATED_TERMS)
}
