export type StudioProject =
  | 'AN23'
  | 'Cantina Don Carlo'
  | 'Exousia'
  | 'ACI Copertino'
  | 'Stazione di Posta'
  | 'Altro'

export type StudioTemplateId =
  | 'social-video'
  | 'wine-mockup'
  | 'visual-reference'
  | 'carousel'
  | 'brand-campaign'

export type StudioCompiledOutput = {
  id: string
  title: string
  tool: string
  access: 'manual' | 'local' | 'api'
  url: string
  prompt: string
  checklist: string[]
}

export type StudioInput = {
  templateId: StudioTemplateId
  project: StudioProject
  brief: string
  reference?: string
  format?: string
}

export const STUDIO_TEMPLATES: {
  id: StudioTemplateId
  title: string
  description: string
  category: string
}[] = [
  {
    id: 'social-video',
    title: 'Reel / video social',
    category: 'video',
    description: 'Prompt per Higgsfield, Luma, Kling, LTX o Runway.',
  },
  {
    id: 'wine-mockup',
    title: 'Mockup prodotto / vino',
    category: 'image',
    description: 'Prompt per still life, bottiglie, etichette, foto prodotto.',
  },
  {
    id: 'visual-reference',
    title: 'Remix da reference visiva',
    category: 'image',
    description: 'Trasforma una reference salvata in nuova direzione creativa.',
  },
  {
    id: 'carousel',
    title: 'Carosello Instagram',
    category: 'content',
    description: 'Struttura copy + visual direction per post multipagina.',
  },
  {
    id: 'brand-campaign',
    title: 'Campagna brand',
    category: 'strategy',
    description: 'Concept, visual system, headline e asset da produrre.',
  },
]

function clean(value?: string) {
  return value?.trim() || 'Nessun dettaglio aggiuntivo fornito.'
}

function projectRules(project: StudioProject) {
  if (project === 'AN23') {
    return `
REGOLE PROGETTO AN23:
- tono classy, minimale, mediterraneo, non cheap
- vino premium, mare/pineta/piscina solo se elegante
- logo corretto: cerchio verde oliva/scuro, lettere bianche stilizzate AN, scritta lowercase "ventitre"
- non usare scritte AN23 generiche
- evitare look AI, deformazioni bottiglia, loghi inventati
`.trim()
  }

  if (project === 'Cantina Don Carlo') {
    return `
REGOLE PROGETTO CANTINA DON CARLO:
- non usare "Madre Terra" come nome linea
- parlare di vino della casa / Cantina Don Carlo
- stile mediterraneo, naturale, moderno, elegante
- etichetta sempre leggibile e non reinterpretata
- evitare font inventati, simboli cambiati, bottiglie deformate
`.trim()
  }

  if (project === 'Exousia') {
    return `
REGOLE PROGETTO EXOUSIA:
- consulenza, formazione, finanza agevolata
- tono professionale, locale, concreto, non corporate finto
- palette verde Exousia + accento rosso/arancio limitato
- visual pulito, editoriale, europeo
`.trim()
  }

  return `
REGOLE GENERALI:
- output pulito, professionale, utilizzabile per lavoro reale
- evitare look AI, watermark, testo deformato, elementi casuali
- rispettare formato e obiettivo
`.trim()
}

export function compileStudioJob(input: StudioInput): StudioCompiledOutput[] {
  const brief = clean(input.brief)
  const reference = clean(input.reference)
  const format = input.format?.trim() || '9:16 verticale social'
  const rules = projectRules(input.project)

  if (input.templateId === 'social-video') {
    return [
      {
        id: 'higgsfield-social-video',
        title: 'Prompt Higgsfield',
        tool: 'Higgsfield',
        access: 'manual',
        url: 'https://higgsfield.ai/',
        prompt: `
Create a premium social video for ${input.project}.

FORMAT:
${format}

BRIEF:
${brief}

REFERENCE / STYLE INPUT:
${reference}

VISUAL DIRECTION:
Cinematic but clean, premium social advertising, elegant camera movement, no chaotic transitions, no exaggerated AI look. Keep the main subject consistent across the whole video. Use smooth motion, realistic lighting, strong composition, and refined editorial pacing.

CAMERA:
Slow controlled movement, subtle push-in or orbit, no warping, no flickering, no random object changes.

ENDING:
Finish with a clean brand moment suitable for Instagram/Reels.

${rules}

NEGATIVE:
No distorted logos, no unreadable text, no extra bottles unless requested, no fake labels, no plastic look, no cheap commercial style, no flickering, no broken hands, no random typography.
`.trim(),
        checklist: [
          'Il soggetto resta coerente per tutta la clip?',
          'Logo o etichetta non sono deformati?',
          'Il movimento camera è elegante e non caotico?',
          'Nessun testo inventato o illeggibile?',
          'Output usabile senza sembrare AI?',
        ],
      },
      {
        id: 'luma-image-to-video',
        title: 'Prompt Luma / image-to-video',
        tool: 'Luma Dream Machine',
        access: 'manual',
        url: 'https://lumalabs.ai/dream-machine',
        prompt: `
Transform the provided reference into a refined cinematic social video.

PROJECT:
${input.project}

FORMAT:
${format}

BRIEF:
${brief}

MOTION:
Slow cinematic push-in, soft parallax, natural light movement, stable subject, premium editorial atmosphere.

STYLE:
Elegant, Mediterranean, minimal, realistic, high-end commercial photography turned into motion.

${rules}

AVOID:
Flicker, morphing, logo changes, label changes, fake text, overdramatic camera moves, surreal artifacts.
`.trim(),
        checklist: [
          'La reference viene rispettata?',
          'Il soggetto non cambia forma?',
          'Il movimento è lento e utilizzabile?',
          'Nessun morphing del logo?',
        ],
      },
      {
        id: 'ltx-local-video',
        title: 'Prompt LTX / open-source',
        tool: 'LTX local / open-source',
        access: 'local',
        url: 'https://github.com/Lightricks/LTX-Video',
        prompt: `
A short premium vertical social video for ${input.project}. ${brief}

Style: refined editorial commercial, realistic light, clean composition, controlled motion, subtle camera push-in, no flicker, no logo distortion, no random text, no exaggerated AI style.

Reference/style notes:
${reference}

Format: ${format}

${rules}
`.trim(),
        checklist: [
          'Buono per test gratuiti/locali?',
          'Serve reference image più chiara?',
          'Serve ridurre complessità della scena?',
        ],
      },
    ]
  }

  if (input.templateId === 'wine-mockup') {
    return [
      {
        id: 'comfyui-product-mockup',
        title: 'Prompt ComfyUI / FLUX',
        tool: 'ComfyUI + FLUX/SDXL',
        access: 'local',
        url: 'https://github.com/comfyanonymous/ComfyUI',
        prompt: `
Premium product photography mockup for ${input.project}.

BRIEF:
${brief}

FORMAT:
${format}

REFERENCE:
${reference}

SCENE:
Ultra realistic product photography, controlled studio lighting, elegant shadows, premium editorial composition, realistic glass, realistic paper texture, sharp label area, no distortion, no fake typography.

${rules}

NEGATIVE:
Wrong label, fake logo, invented text, warped bottle, unreadable typography, excessive reflections, plastic look, cheap stock photo style, AI artifacts.
`.trim(),
        checklist: [
          'Etichetta leggibile?',
          'Bottiglia non deformata?',
          'Luce premium?',
          'Niente testo inventato?',
        ],
      },
      {
        id: 'recraft-product-style',
        title: 'Prompt Recraft',
        tool: 'Recraft',
        access: 'manual',
        url: 'https://www.recraft.ai/',
        prompt: `
Create a refined product visual system for ${input.project}.

Brief:
${brief}

Use a clean premium composition, controlled color palette, elegant Mediterranean product photography, realistic materials, high-end brand presentation.

Reference:
${reference}

${rules}

Do not redesign logos or labels. Do not invent typography.
`.trim(),
        checklist: [
          'Buono per visual statici e grafiche?',
          'Controllare testo/label manualmente?',
          'Usare come base e rifinire in Photoshop?',
        ],
      },
    ]
  }

  if (input.templateId === 'visual-reference') {
    return [
      {
        id: 'reference-remix-comfyui',
        title: 'Prompt remix reference',
        tool: 'ComfyUI / FLUX',
        access: 'local',
        url: 'https://github.com/comfyanonymous/ComfyUI',
        prompt: `
Use the provided visual reference as mood and composition inspiration, not as a direct copy.

PROJECT:
${input.project}

BRIEF:
${brief}

REFERENCE ANALYSIS TO PRESERVE:
${reference}

CREATE:
A new original image with similar mood, palette, rhythm, and composition logic, adapted to ${input.project}. Keep it professional, clean, editorial, and usable for a real brand project.

FORMAT:
${format}

${rules}

NEGATIVE:
Do not copy exact artwork, do not reproduce copyrighted composition directly, no fake logos, no unreadable text, no AI artifacts.
`.trim(),
        checklist: [
          'È ispirato ma non copiato?',
          'Mood corretto?',
          'Adatto al progetto?',
          'Pulito e usabile?',
        ],
      },
      {
        id: 'ideogram-text-image',
        title: 'Prompt Ideogram',
        tool: 'Ideogram',
        access: 'manual',
        url: 'https://ideogram.ai/',
        prompt: `
Create a premium brand image for ${input.project} with clean, legible typography only if needed.

Brief:
${brief}

Reference mood:
${reference}

Style:
Editorial, refined, modern, professional, not overdesigned. Strong composition and readable text.

${rules}
`.trim(),
        checklist: [
          'Usarlo solo se serve testo in immagine?',
          'Testo leggibile?',
          'Nessun font casuale?',
        ],
      },
    ]
  }

  if (input.templateId === 'carousel') {
    return [
      {
        id: 'carousel-copy-visual',
        title: 'Prompt carousel',
        tool: 'GROW AI / Canva',
        access: 'manual',
        url: 'https://www.canva.com/',
        prompt: `
Build an Instagram carousel for ${input.project}.

BRIEF:
${brief}

FORMAT:
${format}

OUTPUT NEEDED:
- slide-by-slide structure
- headline for each slide
- short body copy
- visual direction for each slide
- final CTA
- notes for Canva layout

STYLE:
Concrete, useful, not generic, not motivational filler. Make it visually structured and easy to design.

${rules}
`.trim(),
        checklist: [
          'Ogni slide ha una funzione?',
          'Copy non generico?',
          'CTA chiara?',
          'Visual direction eseguibile?',
        ],
      },
    ]
  }

  return [
    {
      id: 'brand-campaign-system',
      title: 'Prompt campagna brand',
      tool: 'GROW AI',
      access: 'api',
      url: '/ai',
      prompt: `
Create a complete campaign system for ${input.project}.

BRIEF:
${brief}

REFERENCE:
${reference}

FORMAT:
${format}

OUTPUT:
- campaign concept
- core message
- visual language
- 5 asset ideas
- 3 reel ideas
- 3 static post ideas
- production checklist
- best AI tools to use for each asset

${rules}
`.trim(),
      checklist: [
        'Concept forte?',
        'Asset producibili davvero?',
        'Priorità chiare?',
        'Tool consigliati sensati?',
      ],
    },
  ]
}
