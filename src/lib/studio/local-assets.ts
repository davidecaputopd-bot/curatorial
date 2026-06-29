import type { GeneratedAsset } from './types'

const STORAGE_KEY = 'grow-studio-local-assets'

export type StudioAsset = GeneratedAsset

export type NewStudioAsset = Omit<
  StudioAsset,
  | 'id'
  | 'user_id'
  | 'quality_score'
  | 'usable_for_client'
  | 'notes'
  | 'watermark'
  | 'reuse_score'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
  | 'sync_status'
>

export function readLocalStudioAssets(): StudioAsset[] {
  if (typeof window === 'undefined') return []

  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value)
      ? value.filter((asset) => asset && !asset.deleted_at)
      : []
  } catch {
    return []
  }
}

export function saveLocalStudioAsset(input: NewStudioAsset) {
  const now = new Date().toISOString()
  const asset: StudioAsset = {
    ...input,
    id: crypto.randomUUID(),
    user_id: 'local',
    quality_score: null,
    usable_for_client: null,
    notes: null,
    watermark: null,
    reuse_score: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'local_only',
  }
  const assets = [asset, ...readLocalStudioAssets()].slice(0, 100)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assets))
  return asset
}

export function removeLocalStudioAsset(id: string) {
  if (typeof window === 'undefined') return
  const remaining = readLocalStudioAssets().filter((asset) => asset.id !== id)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining))
}
