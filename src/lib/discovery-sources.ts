export type DiscoveryTopic = {
  query: string
  category: string
  lane: 'core' | 'client' | 'wildcard'
}

export const ARENA_DISCOVERY_TOPICS: DiscoveryTopic[] = [
  { query: 'art direction campaign', category: 'branding', lane: 'core' },
  { query: 'visual identity system', category: 'branding', lane: 'core' },
  { query: 'editorial typography layout', category: 'typography', lane: 'core' },
  { query: 'experimental typography poster', category: 'typography', lane: 'wildcard' },
  { query: 'wine label packaging design', category: 'branding', lane: 'client' },
  { query: 'Mediterranean hospitality branding', category: 'branding', lane: 'client' },
  { query: 'fashion editorial photography', category: 'fashion', lane: 'client' },
  { query: 'vintage fashion retail', category: 'fashion', lane: 'client' },
  { query: 'restaurant identity menu design', category: 'branding', lane: 'client' },
  { query: 'contemporary editorial design', category: 'design', lane: 'core' },
  { query: 'creative coding graphic design', category: 'web', lane: 'wildcard' },
  { query: 'motion identity title sequence', category: 'branding', lane: 'core' },
  { query: 'material texture print design', category: 'design', lane: 'wildcard' },
  { query: 'retail interior visual identity', category: 'interior_design', lane: 'client' },
  { query: 'contemporary art installation', category: 'art', lane: 'wildcard' },
  { query: 'book cover experimental design', category: 'typography', lane: 'core' },
  { query: 'photography direction still life', category: 'design', lane: 'core' },
  { query: 'Italian modernist graphic design', category: 'design', lane: 'wildcard' },
]

export function topicsForToday(date = new Date(), count = 6) {
  const day = Math.floor(date.getTime() / 86_400_000)
  const start = (day * count) % ARENA_DISCOVERY_TOPICS.length
  return Array.from(
    { length: Math.min(count, ARENA_DISCOVERY_TOPICS.length) },
    (_, index) => ARENA_DISCOVERY_TOPICS[(start + index) % ARENA_DISCOVERY_TOPICS.length]
  )
}
