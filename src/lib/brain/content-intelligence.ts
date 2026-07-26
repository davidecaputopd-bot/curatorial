export const CONTENT_ROLES = [
  'work_direct',
  'creative_nourishment',
  'personal',
  'uncertain',
] as const

export type ContentRole = (typeof CONTENT_ROLES)[number]

export const CRAFT_TAGS = [
  'typography',
  'brand_identity',
  'packaging',
  'photography',
  'lighting',
  'video_editing',
  'camera_movement',
  'color',
  'composition',
  'illustration',
  'art_direction',
  'social_format',
  'ai_art',
  'creative_tools',
  'fashion',
  'interiors',
  'culture',
  'food_styling',
] as const

export type CraftTag = (typeof CRAFT_TAGS)[number]

export const CONTENT_ROLE_LABELS: Record<ContentRole, string> = {
  work_direct: 'Lavoro',
  creative_nourishment: 'Nutrimento',
  personal: 'Personale',
  uncertain: 'Da capire',
}

export const CRAFT_TAG_LABELS: Record<CraftTag, string> = {
  typography: 'Tipografia',
  brand_identity: 'Brand',
  packaging: 'Packaging',
  photography: 'Fotografia',
  lighting: 'Luce',
  video_editing: 'Montaggio',
  camera_movement: 'Movimento camera',
  color: 'Colore',
  composition: 'Composizione',
  illustration: 'Illustrazione',
  art_direction: 'Art direction',
  social_format: 'Formato social',
  ai_art: 'AI art',
  creative_tools: 'Strumenti',
  fashion: 'Moda',
  interiors: 'Spazi',
  culture: 'Cultura visiva',
  food_styling: 'Food styling',
}

export type ContentSignalInput = {
  content?: string | null
  title?: string | null
  description?: string | null
  tags?: string[] | string | null
  category?: string | null
  artist?: string | null
  source?: string | null
  url?: string | null
}

export type ContentIntelligence = {
  role: ContentRole
  role_label: string
  craft_tags: CraftTag[]
  craft_labels: string[]
  confidence: number
  needs_review: boolean
  rationale: string
  explicit_project: string | null
  understood: boolean
}

type SignalRule = {
  tag: CraftTag
  terms: string[]
}

const CRAFT_RULES: SignalRule[] = [
  {
    tag: 'typography',
    terms: ['typography', 'typeface', 'font ', '#font', 'lettering', 'editorial type', 'tipografia', 'carattere'],
  },
  {
    tag: 'brand_identity',
    terms: ['branding', 'brand identity', 'visual identity', 'logo', 'rebrand', 'identity design', 'marchio'],
  },
  {
    tag: 'packaging',
    terms: ['packaging', 'bottle', 'bottiglia', 'label design', 'etichetta', 'wine label', 'box design', 'mockup'],
  },
  {
    tag: 'photography',
    terms: ['photography', 'photo shoot', 'photoshoot', 'fotografia', 'shot on iphone', 'iphone photography', 'still life', 'product photo'],
  },
  {
    tag: 'lighting',
    terms: ['lighting', 'light setup', 'natural light', 'studio light', 'luce naturale', 'illuminazione', 'flash photography'],
  },
  {
    tag: 'video_editing',
    terms: ['video editing', 'editing', 'edit tutorial', 'montaggio', 'davinci resolve', 'premiere pro', 'after effects', 'transition'],
  },
  {
    tag: 'camera_movement',
    terms: ['camera movement', 'camera motion', 'push-in', 'push in', 'tracking shot', 'handheld', 'camera angle', 'movimento camera'],
  },
  {
    tag: 'color',
    terms: ['color grade', 'color grading', 'palette', 'colour palette', 'gradient map', 'color theory', 'colore', 'cromia'],
  },
  {
    tag: 'composition',
    terms: ['composition', 'layout', 'grid system', 'visual hierarchy', 'composizione', 'impaginazione', 'artboard'],
  },
  {
    tag: 'illustration',
    terms: ['illustration', 'illustrator', 'drawing', 'illustrazione', 'disegno', 'vector art', 'adobeillustrator'],
  },
  {
    tag: 'art_direction',
    terms: ['art direction', 'creative direction', 'campaign', 'editorial', 'lookbook', 'set design', 'direzione artistica'],
  },
  {
    tag: 'social_format',
    terms: ['reel', 'carousel', 'carosello', 'tiktok', 'instagram', 'content tips', 'social media', 'hook', 'storytelling'],
  },
  {
    tag: 'ai_art',
    terms: ['ai art', 'generative art', 'midjourney', 'comfyui', 'flux', 'stable diffusion', 'recraft', 'ideogram', 'synthetic photography'],
  },
  {
    tag: 'creative_tools',
    terms: ['photoshop', 'illustrator', 'indesign', 'figma', 'after effects', 'davinci', 'creative tool', 'design tool', 'adobe'],
  },
  {
    tag: 'fashion',
    terms: ['fashion', 'runway', 'styling', 'lookbook', 'outfit', 'streetwear', 'moda', 'editorial fashion'],
  },
  {
    tag: 'interiors',
    terms: ['interior', 'architecture', 'furniture', 'retail space', 'hospitality design', 'architettura', 'arredo', 'spazio'],
  },
  {
    tag: 'culture',
    terms: ['exhibition', 'gallery', 'museum', 'cinema', 'film still', 'sculpture', 'installation', 'mostra', 'cultura', 'arte contemporanea'],
  },
  {
    tag: 'food_styling',
    terms: ['food styling', 'food photography', 'plating', 'table setting', 'mise en place', 'impiattamento', 'still life food'],
  },
]

const WORK_TERMS = [
  'graphic design',
  'design tutorial',
  'poster design',
  'brand',
  'typography',
  'packaging',
  'marketing',
  'campaign',
  'content tips',
  'creative director',
  'art direction',
  'social strategy',
  'photoshop',
  'illustrator',
  'indesign',
  'after effects',
  'davinci',
  'figma',
  'mockup',
  'workflow',
  'client work',
  'anventitre',
  'an23',
  'exousia',
  'cantina don carlo',
  'aci copertino',
  'trama store',
  'trama leverano',
  'trama vintage',
]

const NOURISHMENT_TERMS = [
  'aesthetic',
  'architecture',
  'art exhibition',
  'artwork',
  'cinema',
  'culture',
  'editorial',
  'fashion',
  'gallery',
  'installation',
  'interior',
  'museum',
  'photography',
  'sculpture',
  'visual research',
  'arte',
  'mostra',
]

const PERSONAL_TERMS = [
  'recipe',
  'ricetta',
  'ingredienti',
  'cena',
  'cucina',
  'oroscopo',
  'zodiac',
  'workout',
  'fitness',
  'skincare',
  'makeup',
  'vacation',
  'travel tips',
  'relationship',
  'boyfriend',
  'girlfriend',
  'meme',
  'funny',
  'glee',
  'charmed',
  'kardashian',
]

const PROJECTS: Array<{ label: string; terms: string[] }> = [
  { label: 'ANventitre', terms: ['anventitre', 'an23', 'an ventitre'] },
  { label: 'Exousia', terms: ['exousia'] },
  { label: 'Cantina Don Carlo', terms: ['cantina don carlo', 'don carlo'] },
  { label: 'ACI Copertino', terms: ['aci copertino'] },
  {
    label: 'TRAMA',
    terms: ['trama store', 'trama leverano', 'trama vintage', '@trama', '#trama'],
  },
]

function normalize(value: string) {
  return value
    .toLocaleLowerCase('it-IT')
    .replace(/&(?:amp|#x27|quot);/g, ' ')
    .replace(/[^\p{L}\p{N}#@+\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function signalText(input: ContentSignalInput) {
  const tags = Array.isArray(input.tags) ? input.tags.join(' ') : input.tags || ''
  return normalize(
    [
      input.title,
      input.description,
      input.content,
      tags,
      input.category,
      input.artist,
      input.source,
    ]
      .filter(Boolean)
      .join(' ')
  )
}

function termHits(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(normalize(term))).length
}

function isGenericSocialSignal(text: string, input: ContentSignalInput) {
  const socialSource =
    input.source === 'tiktok' ||
    input.source === 'instagram' ||
    /tiktok\.com|instagram\.com/i.test(input.url || '')
  if (!socialSource) return false

  const generic = [
    'salvato da tiktok',
    'salvato da instagram',
    'anteprima tiktok',
    'tocca la nota per vedere il video',
    'tiktok com',
    'instagram com',
  ]
  const reduced = generic.reduce(
    (value, phrase) => value.replaceAll(phrase, ' '),
    text
  )
  return normalize(reduced).length < 18
}

export function detectExplicitProject(input: ContentSignalInput) {
  const text = signalText(input)
  const rawText = [
    input.title,
    input.description,
    input.content,
    Array.isArray(input.tags) ? input.tags.join(' ') : input.tags,
  ]
    .filter(Boolean)
    .join(' ')
  if (/\bTRAMA\b/.test(rawText)) return 'TRAMA'
  return (
    PROJECTS.find((project) =>
      project.terms.some((term) => text.includes(normalize(term)))
    )?.label || null
  )
}

export function analyzeContentSignal(
  input: ContentSignalInput
): ContentIntelligence {
  const text = signalText(input)
  const generic = !text || isGenericSocialSignal(text, input)
  const craftTags = generic
    ? []
    : CRAFT_RULES.filter((rule) =>
        rule.terms.some((term) => text.includes(normalize(term)))
      ).map((rule) => rule.tag)

  const workScore = generic ? 0 : termHits(text, WORK_TERMS) * 2.2
  const nourishmentScore =
    generic ? 0 : termHits(text, NOURISHMENT_TERMS) * 1.5 + craftTags.length * 0.3
  const personalScore = generic ? 0 : termHits(text, PERSONAL_TERMS) * 2

  let role: ContentRole = 'uncertain'
  if (workScore >= 2.2 && workScore >= personalScore + 0.5) {
    role = 'work_direct'
  } else if (personalScore >= 2 && personalScore > nourishmentScore) {
    role = 'personal'
  } else if (nourishmentScore >= 1.5 || craftTags.length >= 2) {
    role = 'creative_nourishment'
  }

  const scores = [workScore, nourishmentScore, personalScore].sort(
    (a, b) => b - a
  )
  const winningScore = scores[0] || 0
  const gap = Math.max(0, winningScore - (scores[1] || 0))
  const confidence = generic
    ? 0.08
    : role === 'uncertain'
      ? Math.min(0.42, 0.2 + craftTags.length * 0.07)
      : Math.min(0.94, 0.48 + winningScore * 0.055 + gap * 0.045)

  const craftLabels = craftTags
    .slice(0, 5)
    .map((tag) => CRAFT_TAG_LABELS[tag])
  const roleLabel = CONTENT_ROLE_LABELS[role]
  const rationale = generic
    ? 'Mancano descrizione o segnali visivi sufficienti.'
    : craftLabels.length
      ? `${roleLabel}: riconosco ${craftLabels.slice(0, 3).join(', ').toLocaleLowerCase('it-IT')}.`
      : role === 'personal'
        ? 'Sembra un interesse personale, senza un uso creativo evidente.'
        : 'Il contenuto non offre ancora segnali abbastanza forti.'

  return {
    role,
    role_label: roleLabel,
    craft_tags: craftTags,
    craft_labels: craftLabels,
    confidence: Number(confidence.toFixed(2)),
    needs_review: confidence < 0.58,
    rationale,
    explicit_project: detectExplicitProject(input),
    understood: !generic && (role !== 'uncertain' || craftTags.length > 0),
  }
}

export function contentSignalText(input: ContentSignalInput) {
  return signalText(input)
}
