export const PRODUCTION_INTENTS = [
  'general_answer',
  'create_generation_job',
  'compile_prompt',
  'compile_workflow',
  'analyze_reference',
  'search_archive',
  'create_content_plan',
  'create_calendar_plan',
  'import_asset',
  'evaluate_asset',
] as const

export type ProductionIntent = (typeof PRODUCTION_INTENTS)[number]

export const PRODUCTION_ASSET_TYPES = [
  'image',
  'video',
  'carousel',
  'copy',
  'mockup',
  'workflow',
  'reference',
  'strategy',
  'calendar_plan',
] as const

export type ProductionAssetType = (typeof PRODUCTION_ASSET_TYPES)[number]

export const PRODUCTION_MODES = [
  'text_only',
  'api_free',
  'api_cheap',
  'manual_tool',
  'local_worker',
  'premium_manual',
  'premium_api',
] as const

export type ProductionMode = (typeof PRODUCTION_MODES)[number]

export const PRODUCTION_ENGINES = [
  'grow-ai',
  'gemini',
  'groq',
  'openrouter-free',
  'openrouter-cheap',
  'pollinations',
  'comfyui',
  'ltx-local',
  'higgsfield',
  'luma',
  'kling',
  'runway',
  'recraft',
  'ideogram',
  'photoshop',
  'firefly',
  'together',
  'fal',
  'replicate',
] as const

export type ProductionEngine = (typeof PRODUCTION_ENGINES)[number]

export const PRODUCTION_PROJECTS = [
  'AN23',
  'Cantina Don Carlo',
  'Exousia',
  'ACI Copertino',
  'Stazione di Posta',
  'Altro',
] as const

export type ProductionProject = (typeof PRODUCTION_PROJECTS)[number]

export type ProductionCostMode = 'free' | 'free-tier' | 'cheap' | 'premium'

export type LocalWorkerStatus =
  | 'not_configured'
  | 'ready'
  | 'running'
  | 'error'
  | 'completed'

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
  should_compile_workflow: boolean
  should_use_archive: boolean
  can_execute_now: boolean
  requires_manual_tool: boolean
  requires_local_worker: boolean
  local_worker_status: LocalWorkerStatus
  cost_mode: ProductionCostMode
  confidence: number
  risk_notes: string[]
  production_path: string[]
  prompts_to_compile: ProductionEngine[]
  workflow_targets: string[]
  checklist: string[]
  next_actions: string[]
}

export type EngineAccess = 'available' | 'manual' | 'local' | 'future'
export type EngineQualityTier = 'utility' | 'good' | 'high' | 'premium'

export type EngineCapability = {
  engine: ProductionEngine
  label: string
  mode: ProductionMode
  access: EngineAccess
  asset_types: ProductionAssetType[]
  strengths: string[]
  weaknesses: string[]
  can_execute_server_side: boolean
  requires_local_worker: boolean
  requires_manual_action: boolean
  url: string | null
  cost_mode: ProductionCostMode
  quality_tier: EngineQualityTier
}
