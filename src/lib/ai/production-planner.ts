import { getEngine } from './engine-registry'
import {
  PRODUCTION_ASSET_TYPES,
  PRODUCTION_ENGINES,
  PRODUCTION_INTENTS,
  PRODUCTION_MODES,
  PRODUCTION_PROJECTS,
  type LocalWorkerStatus,
  type ProductionAssetType,
  type ProductionCostMode,
  type ProductionEngine,
  type ProductionIntent,
  type ProductionMode,
  type ProductionPlan,
  type ProductionProject,
} from './production-types'

export type {
  ProductionAssetType,
  ProductionEngine,
  ProductionIntent,
  ProductionMode,
  ProductionPlan,
  ProductionProject,
} from './production-types'

export type ProductionPlannerContext = {
  selectedReference?: unknown
  project?: string
  archiveItem?: unknown
  currentRoute?: string
}

const COST_MODES: ProductionCostMode[] = ['free', 'free-tier', 'cheap', 'premium']
const WORKER_STATUSES: LocalWorkerStatus[] = [
  'not_configured',
  'ready',
  'running',
  'error',
  'completed',
]

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

export function detectProject(message: string): ProductionProject {
  const text = message.toLowerCase()

  if (includesAny(text, ['an23', 'an ventitre', 'anventitre', 'ventitre'])) return 'AN23'
  if (includesAny(text, ['cantina don carlo', 'don carlo', 'cantina'])) {
    return 'Cantina Don Carlo'
  }
  if (text.includes('exousia')) return 'Exousia'
  if (includesAny(text, ['aci copertino', 'aci'])) return 'ACI Copertino'
  if (text.includes('stazione di posta')) return 'Stazione di Posta'

  return 'Altro'
}

export function detectAssetType(message: string): ProductionAssetType {
  const text = message.toLowerCase()

  if (includesAny(text, ['calendario', 'calendar plan', 'piano editoriale'])) {
    return 'calendar_plan'
  }
  if (includesAny(text, ['workflow', 'comfyui', 'comfy ui', 'pipeline'])) return 'workflow'
  if (includesAny(text, ['mockup', 'bottiglia', 'packaging', 'etichetta'])) return 'mockup'
  if (includesAny(text, ['video', 'reel', 'clip', 'motion', 'animazione', 'ltx', 'higgsfield', 'luma'])) {
    return 'video'
  }
  if (includesAny(text, ['carosello', 'carousel', 'slide'])) return 'carousel'
  if (includesAny(text, ['copy', 'caption', 'testo', 'headline', 'articolo'])) return 'copy'
  if (includesAny(text, ['reference', 'riferimento', 'moodboard'])) return 'reference'
  if (includesAny(text, ['immagine', 'visual', 'foto', 'recraft', 'ideogram', 'render'])) {
    return 'image'
  }

  return 'strategy'
}

export function detectProductionIntent(message: string): ProductionIntent {
  const text = message.toLowerCase()

  if (includesAny(text, ['valuta asset', 'valuta output', 'quality score', 'usabile per cliente'])) {
    return 'evaluate_asset'
  }
  if (includesAny(text, ['importa asset', 'importa output', 'salva output', 'porta in archivio'])) {
    return 'import_asset'
  }
  if (includesAny(text, ['cerca in archivio', 'trova in archivio', 'recupera da archivio'])) {
    return 'search_archive'
  }
  if (includesAny(text, ['piano editoriale', 'piano calendario', 'calendar plan'])) {
    return 'create_calendar_plan'
  }
  if (includesAny(text, ['content plan', 'piano contenuti', 'strategia contenuti'])) {
    return 'create_content_plan'
  }
  if (includesAny(text, ['compila workflow', 'crea workflow', 'workflow comfy'])) {
    return 'compile_workflow'
  }
  if (includesAny(text, ['compila prompt', 'scrivi prompt', 'prompt per'])) return 'compile_prompt'
  if (includesAny(text, ['analizza reference', 'analizza riferimento', 'leggi questa reference'])) {
    return 'analyze_reference'
  }
  if (
    includesAny(text, [
      'genera',
      'crea',
      'realizza',
      'produci',
      'voglio fare',
      'trasforma',
      'mockup',
      'reel',
      'video',
      'visual',
    ])
  ) {
    return 'create_generation_job'
  }

  return 'general_answer'
}

export function projectRules(project: ProductionProject): string[] {
  if (project === 'AN23') {
    return [
      'Usare il logo AN23 corretto: cerchio verde oliva/scuro, lettere bianche stilizzate AN, scritta lowercase “ventitre”.',
      'Non usare un marchio AN23 generico o inventato.',
      'Mantenere un tono premium, mediterraneo e classy, mai cheap.',
      'Evitare deformazioni di bottiglia, logo ed etichetta.',
    ]
  }

  if (project === 'Cantina Don Carlo') {
    return [
      'Non usare “Madre Terra” come nome linea.',
      'Usare vino della casa / Cantina Don Carlo.',
      'Etichette e loghi reali non vanno reinterpretati.',
      'Mantenere uno stile mediterraneo, naturale, moderno ed elegante.',
    ]
  }

  if (project === 'Exousia') {
    return [
      'Rappresentare consulenza, formazione e finanza agevolata in modo concreto.',
      'Usare verde Exousia con accento rosso/arancio dosato.',
      'Mantenere un tono professionale e locale, evitando il corporate generico.',
    ]
  }

  return [
    'Evitare un look AI generico.',
    'Produrre un output professionale e utilizzabile nel lavoro reale.',
    'Controllare watermark, testo, marchi e artefatti.',
  ]
}

function planForText(
  message: string,
  project: ProductionProject,
  assetType: ProductionAssetType,
  intent: ProductionIntent
): ProductionPlan {
  const shouldCreateJob = intent !== 'general_answer' && intent !== 'search_archive'

  return {
    intent,
    title:
      assetType === 'calendar_plan'
        ? `Piano calendario ${project}`
        : assetType === 'carousel'
          ? `Carosello ${project}`
          : `Piano produzione ${project}`,
    project,
    asset_type: assetType,
    production_mode: 'text_only',
    recommended_engine: 'grow-ai',
    alternatives: ['gemini', 'groq', 'openrouter-free'],
    needs_reference: includesAny(message.toLowerCase(), ['reference', 'riferimento', 'archivio']),
    should_create_job: shouldCreateJob,
    should_compile_prompts: intent === 'compile_prompt' || assetType === 'carousel',
    should_compile_workflow: intent === 'compile_workflow',
    should_use_archive: true,
    can_execute_now: true,
    requires_manual_tool: false,
    requires_local_worker: false,
    local_worker_status: 'not_configured',
    cost_mode: 'free-tier',
    confidence: 0.82,
    risk_notes:
      assetType === 'carousel'
        ? ['Definire la struttura editoriale prima di produrre la grafica.']
        : [],
    production_path: [
      'Definisci obiettivo, pubblico e vincoli.',
      'Recupera solo le reference rilevanti dall’Archivio.',
      'Produci una struttura operativa verificabile.',
      'Conferma il piano prima di creare o modificare contenuti.',
    ],
    prompts_to_compile: assetType === 'carousel' ? ['grow-ai'] : [],
    workflow_targets: intent === 'compile_workflow' ? ['structured-content-workflow'] : [],
    checklist: ['Obiettivo concreto?', 'Output non generico?', ...projectRules(project)],
    next_actions: shouldCreateJob
      ? ['Conferma il piano.', 'Compila i prompt.', 'Crea il job solo dopo conferma.']
      : ['Usa il piano nella conversazione corrente.'],
  }
}

export function buildFallbackProductionPlan(
  message: string,
  context: ProductionPlannerContext = {}
): ProductionPlan {
  const detectedProject = detectProject(message)
  const contextProject = PRODUCTION_PROJECTS.find((project) => project === context.project)
  const project = contextProject || detectedProject
  const assetType = detectAssetType(message)
  const intent = detectProductionIntent(message)
  const hasReference = Boolean(context.selectedReference || context.archiveItem)

  if (assetType === 'video') {
    return {
      intent,
      title: `Video ${project}`,
      project,
      asset_type: 'video',
      production_mode: 'manual_tool',
      recommended_engine: 'higgsfield',
      alternatives: ['luma', 'ltx-local', 'runway'],
      needs_reference: !hasReference,
      should_create_job: true,
      should_compile_prompts: true,
      should_compile_workflow: false,
      should_use_archive: true,
      can_execute_now: false,
      requires_manual_tool: true,
      requires_local_worker: false,
      local_worker_status: 'not_configured',
      cost_mode: 'premium',
      confidence: 0.9,
      risk_notes: [
        'Higgsfield è un tool esterno credit-based: GROW prepara il lavoro ma non esegue la generazione.',
        'Logo, etichetta e soggetto possono deformarsi durante la generazione video.',
        'Per test gratuiti usare LTX locale quando il worker sarà configurato.',
      ],
      production_path: [
        'Seleziona reference di soggetto, bottiglia e logo.',
        'Compila il prompt Higgsfield in formato 9:16.',
        'Genera la clip nel tool esterno.',
        'Controlla stabilità del soggetto, logo ed etichetta.',
        'Importa l’output in Archivio.',
      ],
      prompts_to_compile: ['higgsfield', 'luma', 'ltx-local', 'runway'],
      workflow_targets: ['social-video-9x16', 'image-to-video', 'ltx-local-test'],
      checklist: [
        'Soggetto coerente per tutta la clip?',
        'Logo, etichetta e testo integri?',
        'Movimento camera controllato?',
        'Output senza watermark e usabile per cliente?',
        ...projectRules(project),
      ],
      next_actions: [
        hasReference ? 'Conferma la reference selezionata.' : 'Scegli una reference dall’Archivio.',
        'Compila i prompt per i motori consigliati.',
        'Crea il job solo dopo conferma.',
      ],
    }
  }

  if (assetType === 'image' || assetType === 'mockup' || assetType === 'workflow') {
    const realIdentity = includesAny(message.toLowerCase(), [
      'etichetta vera',
      'logo vero',
      'logo corretto',
      'etichetta reale',
    ])

    return {
      intent: assetType === 'workflow' ? 'compile_workflow' : intent,
      title: `${assetType === 'mockup' ? 'Mockup' : assetType === 'workflow' ? 'Workflow' : 'Immagine'} ${project}`,
      project,
      asset_type: assetType,
      production_mode: 'local_worker',
      recommended_engine: 'comfyui',
      alternatives: realIdentity
        ? ['photoshop', 'recraft', 'ideogram']
        : ['recraft', 'ideogram', 'photoshop'],
      needs_reference: !hasReference,
      should_create_job: true,
      should_compile_prompts: true,
      should_compile_workflow: true,
      should_use_archive: true,
      can_execute_now: false,
      requires_manual_tool: false,
      requires_local_worker: true,
      local_worker_status: 'not_configured',
      cost_mode: 'free',
      confidence: 0.88,
      risk_notes: [
        'ComfyUI richiede un worker locale: Vercel non può eseguire modelli sul Mac.',
        realIdentity
          ? 'L’etichetta o il logo reale non vanno reinterpretati: usare compositing/inpainting controllato e verifica manuale.'
          : 'Testo, logo ed etichetta richiedono comunque verifica manuale.',
      ],
      production_path: [
        'Seleziona reference, asset originali e vincoli.',
        'Scegli un workflow ComfyUI: txt2img, img2img, inpainting, ControlNet o product mockup.',
        'Compila prompt positivo, negativo e parametri.',
        'Esegui sul worker locale quando configurato.',
        'Rifinisci logo ed etichetta in Photoshop se necessario.',
        'Salva output, prompt e valutazione in Archivio.',
      ],
      prompts_to_compile: ['comfyui', 'recraft', 'ideogram', 'photoshop'],
      workflow_targets: ['txt2img', 'img2img', 'inpainting', 'controlnet', 'product-mockup'],
      checklist: [
        'Reference rispettata?',
        'Logo ed etichetta non reinterpretati?',
        'Composizione specifica e non generica?',
        'Output usabile per cliente?',
        ...projectRules(project),
      ],
      next_actions: [
        hasReference ? 'Conferma gli asset originali.' : 'Seleziona reference e file originali.',
        'Compila prompt e workflow.',
        'Configura il worker locale oppure usa Photoshop/Recraft manualmente.',
      ],
    }
  }

  return planForText(message, project, assetType, intent)
}

export function buildPlannerSystemPrompt() {
  return `
Sei il Production Planner interno di GROW, un Creative Production OS.
Trasforma la richiesta in un piano operativo strutturato. Non sei una chat generica.

IDENTITÀ E VINCOLI STABILI
- Distingui sempre API eseguibile, tool manuale e worker locale.
- Non promettere un’esecuzione che GROW non può fare ora.
- Preferisci free/local quando il risultato resta professionale.
- Proponi premium solo quando serve e richiedi conferma prima di costi.
- Non proporre account multipli, bypass, abuso di trial o scraping di tool chiusi.
- Usa solo il contesto minimo fornito; non inventare reference, asset o integrazioni.

REGOLE PROGETTI
AN23: logo corretto con cerchio verde oliva/scuro, lettere AN bianche stilizzate e “ventitre” lowercase; premium mediterraneo; niente deformazioni.
Cantina Don Carlo: mai “Madre Terra” come nome linea; etichette/loghi reali non reinterpretati; mediterraneo, naturale, moderno, elegante.
Exousia: consulenza, formazione e finanza agevolata; concreto e locale; verde con accento rosso/arancio dosato; no corporate generico.

OUTPUT
Rispondi SOLO con un oggetto JSON valido, senza markdown o testo extra.
Campi obbligatori:
intent, title, project, asset_type, production_mode, recommended_engine, alternatives,
needs_reference, should_create_job, should_compile_prompts, should_compile_workflow,
should_use_archive, can_execute_now, requires_manual_tool, requires_local_worker,
local_worker_status, cost_mode, confidence, risk_notes, production_path,
prompts_to_compile, workflow_targets, checklist, next_actions.
confidence è un numero tra 0 e 1. Le liste contengono stringhe concise e operative.
`.trim()
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number])
}

function strings(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const result = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return result.length ? result : fallback
}

function engines(value: unknown, fallback: ProductionEngine[]) {
  if (!Array.isArray(value)) return fallback
  const result = value.filter((item): item is ProductionEngine =>
    isOneOf(item, PRODUCTION_ENGINES)
  )
  return result.length ? [...new Set(result)] : fallback
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeProductionPlan(raw: unknown, fallback: ProductionPlan): ProductionPlan {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback
  const input = raw as Record<string, unknown>

  const recommendedEngine = isOneOf(input.recommended_engine, PRODUCTION_ENGINES)
    ? input.recommended_engine
    : fallback.recommended_engine
  const capability = getEngine(recommendedEngine)
  const confidence =
    typeof input.confidence === 'number' && Number.isFinite(input.confidence)
      ? Math.min(1, Math.max(0, input.confidence))
      : fallback.confidence

  return {
    intent: isOneOf(input.intent, PRODUCTION_INTENTS) ? input.intent : fallback.intent,
    title:
      typeof input.title === 'string' && input.title.trim()
        ? input.title.trim().slice(0, 160)
        : fallback.title,
    project: isOneOf(input.project, PRODUCTION_PROJECTS) ? input.project : fallback.project,
    asset_type: isOneOf(input.asset_type, PRODUCTION_ASSET_TYPES)
      ? input.asset_type
      : fallback.asset_type,
    production_mode: capability.mode,
    recommended_engine: recommendedEngine,
    alternatives: engines(input.alternatives, fallback.alternatives).filter(
      (engine) => engine !== recommendedEngine
    ),
    needs_reference: bool(input.needs_reference, fallback.needs_reference),
    should_create_job: bool(input.should_create_job, fallback.should_create_job),
    should_compile_prompts: bool(
      input.should_compile_prompts,
      fallback.should_compile_prompts
    ),
    should_compile_workflow: bool(
      input.should_compile_workflow,
      fallback.should_compile_workflow
    ),
    should_use_archive: bool(input.should_use_archive, fallback.should_use_archive),
    can_execute_now: capability.can_execute_server_side,
    requires_manual_tool: capability.requires_manual_action,
    requires_local_worker: capability.requires_local_worker,
    local_worker_status: isOneOf(input.local_worker_status, WORKER_STATUSES)
      ? input.local_worker_status
      : fallback.local_worker_status,
    cost_mode: isOneOf(input.cost_mode, COST_MODES)
      ? input.cost_mode
      : capability.cost_mode,
    confidence,
    risk_notes: strings(input.risk_notes, fallback.risk_notes),
    production_path: strings(input.production_path, fallback.production_path),
    prompts_to_compile: engines(input.prompts_to_compile, fallback.prompts_to_compile),
    workflow_targets: strings(input.workflow_targets, fallback.workflow_targets),
    checklist: strings(input.checklist, fallback.checklist),
    next_actions: strings(input.next_actions, fallback.next_actions),
  }
}
