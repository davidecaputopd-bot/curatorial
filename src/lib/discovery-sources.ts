export type DiscoveryTopic = {
  query: string
  category: string
  lane: 'core' | 'client' | 'wildcard'
}

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
