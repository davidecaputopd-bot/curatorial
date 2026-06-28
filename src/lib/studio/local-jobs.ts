import type { StudioJob } from './types'

const STORAGE_KEY = 'grow-studio-local-jobs'

export type LocalStudioJob = Omit<
  StudioJob,
  'user_id' | 'created_at' | 'updated_at'
> & {
  user_id: 'local'
  created_at: string
  updated_at: string
  sync_status: 'local_only'
}

export function readLocalStudioJobs(): LocalStudioJob[] {
  if (typeof window === 'undefined') return []

  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function saveLocalStudioJob(
  input: Omit<
    LocalStudioJob,
    'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status'
  >
) {
  const now = new Date().toISOString()
  const job: LocalStudioJob = {
    ...input,
    id: crypto.randomUUID(),
    user_id: 'local',
    created_at: now,
    updated_at: now,
    sync_status: 'local_only',
  }
  const jobs = [job, ...readLocalStudioJobs()].slice(0, 50)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
  return job
}
