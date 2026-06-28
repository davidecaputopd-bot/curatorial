export type ProductionIntent =
  | 'create_generation_job'
  | 'compile_prompt'
  | 'analyze_reference'
  | 'search_archive'
  | 'create_content_plan'
  | 'general_answer'

export type ProductionAssetType =
  | 'image'
  | 'video'
  | 'carousel'
  | 'copy'
  | 'mockup'
  | 'workflow'
  | 'strategy'

export type ProductionMode =
  | 'api_free'
  | 'api_cheap'
  | 'manual_tool'
  | 'local_worker'
  | 'premium_manual'
  | 'text_only'

export type ProductionEngine =
  | 'gemini'
  | 'groq'
  | 'openrouter-free'
  | 'comfyui'
  | 'ltx-local'
  | 'higgsfield'
  | 'luma'
  | 'kling'
  | 'runway'
  | 'recraft'
  | 'ideogram'
  | 'photoshop'
  | 'grow-ai'

export type ProductionProject =
  | 'AN23'
  | 'Cantina Don Carlo'
  | 'Exousia'
  | 'ACI Copertino'
  | 'Stazione di Posta'
  | 'Altro'

export type ProductionPlan = {
  intent: ProductionIntent
  title: string
  project: ProductionProject
  asset_type: ProductionAssetType
  production_mode: ProductionMode
  recommended_engine: ProductionEngine
  alternatives: ProductionEngine[]
  needs_reference: boolean
  should_create_job: boolean
  should_compile_prompts: boolean
  should_use_archive: boolean
  cost_mode: 'free' | 'free-tier' | 'cheap' | 'premium'
  risk_notes: string[]
  production_path: string[]
  prompts_to_compile: ProductionEngine[]
  checklist: string[]
}

export function detectProject(message: string): ProductionProject {
  const text = message.toLowerCase()

  if (text.includes('an23') || text.includes('an ventitre') || text.includes('ventitre')) {
    return 'AN23'
  }

  if (
    text.includes('cantina') ||
    text.includes('don carlo') ||
    text.includes('vino') ||
    text.includes('bottiglia') ||
    text.includes('etichetta')
  ) {
    return 'Cantina Don Carlo'
  }

  if (text.includes('exousia')) return 'Exousia'
  if (text.includes('aci')) return 'ACI Copertino'
  if (text.includes('stazione di posta')) return 'Stazione di Posta'

  return 'Altro'
}

export function detectAssetType(message: string): ProductionAssetType {
  const text = message.toLowerCase()

  if (
    text.includes('video') ||
    text.includes('reel') ||
    text.includes('clip') ||
    text.includes('motion') ||
    text.includes('animazione')
  ) {
    return 'video'
  }

  if (
    text.includes('mockup') ||
    text.includes('bottiglia') ||
    text.includes('packaging') ||
    text.includes('etichetta')
  ) {
    return 'mockup'
  }

  if (
    text.includes('carosello') ||
    text.includes('carousel') ||
    text.includes('slide')
  ) {
    return 'carousel'
  }

  if (
    text.includes('immagine') ||
    text.includes('visual') ||
    text.includes('reference') ||
    text.includes('foto')
  ) {
    return 'image'
  }

  if (
    text.includes('workflow') ||
    text.includes('comfy') ||
    text.includes('comfyui')
  ) {
    return 'workflow'
  }

  return 'strategy'
}

export function projectRules(project: ProductionProject) {
  if (project === 'AN23') {
    return [
      'Rispetta il logo AN23 corretto: cerchio verde oliva/scuro, lettere bianche stilizzate AN, scritta lowercase ventitre.',
      'Non usare scritte AN23 generiche o loghi inventati.',
      'Tono premium, mediterraneo, classy, mai cheap.',
      'Evitare deformazioni di bottiglia, bicchiere, etichetta o logo.',
    ]
  }

  if (project === 'Cantina Don Carlo') {
    return [
      'Non usare Madre Terra come nome linea.',
      'Trattare il progetto come vino della casa / Cantina Don Carlo.',
      'Etichette e loghi non vanno reinterpretati.',
      'Stile mediterraneo, naturale, moderno, elegante.',
    ]
  }

  if (project === 'Exousia') {
    return [
      'Tono concreto, consulenziale, professionale, locale.',
      'Palette verde Exousia con accento rosso/arancio dosato.',
      'Evitare look corporate generico.',
    ]
  }

  return [
    'Evitare look AI generico.',
    'Output professionale e usabile per lavoro reale.',
    'Niente watermark o testo deformato.',
  ]
}

export function buildFallbackProductionPlan(message: string): ProductionPlan {
  const project = detectProject(message)
  const assetType = detectAssetType(message)

  if (assetType === 'video') {
    return {
      intent: 'create_generation_job',
      title: `Video ${project}`,
      project,
      asset_type: 'video',
      production_mode: 'manual_tool',
      recommended_engine: 'higgsfield',
      alternatives: ['luma', 'ltx-local', 'runway'],
      needs_reference: true,
      should_create_job: true,
      should_compile_prompts: true,
      should_use_archive: true,
      cost_mode: 'free-tier',
      risk_notes: [
        'Higgsfield/Luma/Runway sono tool manuali o credit-based: GROW prepara il lavoro, ma l’esecuzione avviene fuori o tramite worker dedicato.',
        'Per produzione gratuita scalabile serve LTX/ComfyUI locale.',
      ],
      production_path: [
        'Recupera o carica reference principale.',
        'Compila prompt Higgsfield per video social.',
        'Compila alternativa Luma image-to-video.',
        'Prepara variante LTX locale per test gratuiti.',
        'Genera sul tool scelto.',
        'Importa output in Archivio.',
        'Valuta qualità, logo, coerenza e riusabilità.',
      ],
      prompts_to_compile: ['higgsfield', 'luma', 'ltx-local'],
      checklist: [
        'Il soggetto resta coerente in tutta la clip?',
        'Logo, etichetta e testo non si deformano?',
        'Movimento camera controllato e non caotico?',
        'Output senza watermark o utilizzabile per cliente?',
        ...projectRules(project),
      ],
    }
  }

  if (assetType === 'image' || assetType === 'mockup' || assetType === 'workflow') {
    return {
      intent: 'create_generation_job',
      title: `${assetType === 'mockup' ? 'Mockup' : 'Immagine'} ${project}`,
      project,
      asset_type: assetType,
      production_mode: 'local_worker',
      recommended_engine: 'comfyui',
      alternatives: ['recraft', 'ideogram', 'photoshop'],
      needs_reference: true,
      should_create_job: true,
      should_compile_prompts: true,
      should_use_archive: true,
      cost_mode: 'free',
      risk_notes: [
        'ComfyUI richiede worker locale: Vercel non può eseguire direttamente modelli sul Mac.',
        'Per loghi/etichette reali serve controllo manuale o Photoshop finale.',
      ],
      production_path: [
        'Definisci reference e vincoli visivi.',
        'Compila prompt ComfyUI/FLUX o SDXL.',
        'Se serve testo leggibile, prepara variante Ideogram/Recraft.',
        'Genera output locale o manuale.',
        'Rifinisci in Photoshop se serve precisione logo/etichetta.',
        'Salva output e prompt in Archivio.',
      ],
      prompts_to_compile: ['comfyui', 'recraft', 'ideogram'],
      checklist: [
        'Reference rispettata senza copiare direttamente?',
        'Logo o etichetta non reinterpretati?',
        'Qualità utilizzabile per cliente?',
        'Composizione non generica?',
        ...projectRules(project),
      ],
    }
  }

  if (assetType === 'carousel') {
    return {
      intent: 'create_generation_job',
      title: `Carosello ${project}`,
      project,
      asset_type: 'carousel',
      production_mode: 'text_only',
      recommended_engine: 'grow-ai',
      alternatives: ['gemini', 'groq'],
      needs_reference: false,
      should_create_job: true,
      should_compile_prompts: true,
      should_use_archive: true,
      cost_mode: 'free-tier',
      risk_notes: [
        'Il carosello richiede struttura editoriale prima della grafica.',
      ],
      production_path: [
        'Definisci obiettivo del carosello.',
        'Genera scaletta slide-by-slide.',
        'Crea copy breve e visual direction.',
        'Trasforma in layout Canva/Figma.',
        'Salva struttura in Archivio o Piano.',
      ],
      prompts_to_compile: ['grow-ai'],
      checklist: [
        'Ogni slide ha una funzione?',
        'Copy concreto e non generico?',
        'CTA chiara?',
        ...projectRules(project),
      ],
    }
  }

  return {
    intent: 'general_answer',
    title: `Analisi ${project}`,
    project,
    asset_type: 'strategy',
    production_mode: 'text_only',
    recommended_engine: 'grow-ai',
    alternatives: ['gemini', 'groq', 'openrouter-free'],
    needs_reference: false,
    should_create_job: false,
    should_compile_prompts: false,
    should_use_archive: true,
    cost_mode: 'free-tier',
    risk_notes: [],
    production_path: [
      'Analizza richiesta.',
      'Recupera contesto progetto.',
      'Rispondi con piano operativo.',
    ],
    prompts_to_compile: [],
    checklist: projectRules(project),
  }
}

export function buildPlannerSystemPrompt() {
  return `
Sei il Production Planner interno di GROW.

GROW è un Creative Production OS.
Non sei una chat generica. Devi trasformare richieste creative in piani produttivi strutturati.

Devi ragionare su:
- intento
- progetto
- tipo asset
- motore consigliato
- modalità produttiva
- reference necessarie
- job da creare
- prompt da compilare
- rischi
- checklist qualità
- percorso produttivo

Motori disponibili:
- gemini, groq, openrouter-free per testo/copy/strategia
- comfyui per immagini locali gratuite e workflow
- ltx-local per video locali/open-source
- higgsfield, luma, kling, runway per video manuali
- recraft, ideogram, photoshop per immagini/design/editing

Regole:
- Non promettere generazione diretta se il motore è manuale.
- Non promettere ComfyUI/LTX se il worker locale non è configurato.
- Preferisci free/local quando ha senso.
- Usa premium solo se necessario.
- Evita account multipli o abuso di free trial.
- Output professionale, concreto, operativo.

Rispondi SOLO JSON valido nel formato ProductionPlan.
`.trim()
}
