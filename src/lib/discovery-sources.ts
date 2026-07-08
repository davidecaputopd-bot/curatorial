export type DiscoveryTopic = {
  query: string
  category: string
  lane: 'core' | 'client' | 'wildcard'
}

export type DiscoveryChannelSeed = {
  slug: string
  title: string
  category: string
  lane: 'core' | 'client' | 'wildcard'
}

export const ARENA_CURATED_CHANNELS: DiscoveryChannelSeed[] = [
  { slug: 'visual-identity', title: 'Visual identity', category: 'branding', lane: 'core' },
  { slug: 'brand-identity', title: 'Brand identity', category: 'branding', lane: 'core' },
  { slug: 'graphic-design', title: 'Graphic design', category: 'design', lane: 'core' },
  { slug: 'editorial-design', title: 'Editorial design', category: 'design', lane: 'core' },
  { slug: 'typography', title: 'Typography', category: 'typography', lane: 'core' },
  { slug: 'poster-design', title: 'Poster design', category: 'typography', lane: 'core' },
  { slug: 'book-design', title: 'Book design', category: 'typography', lane: 'core' },
  { slug: 'packaging-design', title: 'Packaging design', category: 'branding', lane: 'client' },
  { slug: 'wine-labels', title: 'Wine labels', category: 'branding', lane: 'client' },
  { slug: 'restaurant-identity', title: 'Restaurant identity', category: 'branding', lane: 'client' },
  { slug: 'hospitality-design', title: 'Hospitality design', category: 'branding', lane: 'client' },
  { slug: 'fashion-editorial', title: 'Fashion editorial', category: 'fashion', lane: 'client' },
  { slug: 'still-life-photography', title: 'Still life photography', category: 'design', lane: 'core' },
  { slug: 'art-direction', title: 'Art direction', category: 'branding', lane: 'core' },
  { slug: 'signage', title: 'Signage', category: 'interior_design', lane: 'client' },
  { slug: 'italian-graphic-design', title: 'Italian graphic design', category: 'design', lane: 'wildcard' },
  { slug: 'modernist-graphic-design', title: 'Modernist graphic design', category: 'design', lane: 'wildcard' },
  { slug: 'exhibition-design', title: 'Exhibition design', category: 'art', lane: 'wildcard' },
]

export const ARENA_DISCOVERY_TOPICS: DiscoveryTopic[] = [
  { query: 'art direction campaign identity', category: 'branding', lane: 'core' },
  { query: 'visual identity system case study', category: 'branding', lane: 'core' },
  { query: 'editorial typography magazine layout', category: 'typography', lane: 'core' },
  { query: 'experimental typography poster print', category: 'typography', lane: 'wildcard' },
  { query: 'wine label packaging design archive', category: 'branding', lane: 'client' },
  { query: 'Mediterranean hospitality visual identity', category: 'branding', lane: 'client' },
  { query: 'fashion editorial lookbook art direction', category: 'fashion', lane: 'client' },
  { query: 'vintage fashion retail identity', category: 'fashion', lane: 'client' },
  { query: 'restaurant identity menu typography', category: 'branding', lane: 'client' },
  { query: 'contemporary editorial design publication', category: 'design', lane: 'core' },
  { query: 'creative coding graphic poster', category: 'web', lane: 'wildcard' },
  { query: 'motion identity title sequence frames', category: 'branding', lane: 'core' },
  { query: 'material texture print design archive', category: 'design', lane: 'wildcard' },
  { query: 'retail interior visual identity signage', category: 'interior_design', lane: 'client' },
  { query: 'contemporary art installation documentation', category: 'art', lane: 'wildcard' },
  { query: 'book cover experimental typography', category: 'typography', lane: 'core' },
  { query: 'photography direction still life product', category: 'design', lane: 'core' },
  { query: 'Italian modernist graphic design archive', category: 'design', lane: 'wildcard' },
  { query: 'brand campaign still life composition', category: 'branding', lane: 'core' },
  { query: 'luxury beverage packaging typography', category: 'branding', lane: 'client' },
  { query: 'olive oil wine label mediterranean design', category: 'branding', lane: 'client' },
  { query: 'gallery invitation poster typography', category: 'typography', lane: 'wildcard' },
  { query: 'architectural signage identity system', category: 'interior_design', lane: 'client' },
  { query: 'restaurant photography art direction still life', category: 'design', lane: 'client' },
]

export function topicsForToday(date = new Date(), count = 6) {
  const day = Math.floor(date.getTime() / 86_400_000)
  const start = (day * count) % ARENA_DISCOVERY_TOPICS.length
  return Array.from(
    { length: Math.min(count, ARENA_DISCOVERY_TOPICS.length) },
    (_, index) => ARENA_DISCOVERY_TOPICS[(start + index) % ARENA_DISCOVERY_TOPICS.length]
  )
}

export function curatedChannelsForToday(date = new Date(), count = 8) {
  const day = Math.floor(date.getTime() / 86_400_000)
  const start = (day * 3) % ARENA_CURATED_CHANNELS.length
  return Array.from(
    { length: Math.min(count, ARENA_CURATED_CHANNELS.length) },
    (_, index) => ARENA_CURATED_CHANNELS[(start + index) % ARENA_CURATED_CHANNELS.length]
  )
}
