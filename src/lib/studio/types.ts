import type {
  ProductionAssetType,
  ProductionCostMode,
  ProductionEngine,
  ProductionProject,
} from '@/lib/ai/production-types'

export type JobStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled'

export type StudioJob = {
  id: string
  user_id: string
  title: string
  project: ProductionProject
  job_type: ProductionAssetType
  engine: ProductionEngine
  status: JobStatus
  brief: string
  reference: unknown
  format: string | null
  prompts: unknown[]
  checklist: string[]
  settings: Record<string, unknown>
  result: Record<string, unknown> | null
  cost_mode: ProductionCostMode
  quality_score: number | null
  created_at: string
  updated_at: string
}

export type GeneratedAsset = {
  id: string
  user_id: string
  title: string
  project: ProductionProject
  asset_type: ProductionAssetType
  engine: ProductionEngine
  prompt: string
  negative_prompt: string | null
  format: string | null
  url: string | null
  output_text: string | null
  quality_score: number | null
  usable_for_client: boolean | null
  notes: string | null
  watermark: boolean | null
  reuse_score: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  sync_status?: 'local_only' | 'synced'
}

export type AIUsageEvent = {
  id: string
  provider: string
  model: string
  operation: string
  prompt_hash: string | null
  input_tokens: number | null
  output_tokens: number | null
  estimated_cost: number | null
  success: boolean
  created_at: string
}

export type LocalWorkerStatus =
  | 'not_configured'
  | 'ready'
  | 'running'
  | 'error'
  | 'completed'
