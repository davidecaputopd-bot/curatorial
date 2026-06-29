const STORAGE_KEY = 'grow-client-goals'

export type ClientGoals = Record<string, number>

const DEFAULT_GOAL = 8

export function readClientGoals(): ClientGoals {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getClientGoal(goals: ClientGoals, client: string): number {
  return goals[client] ?? DEFAULT_GOAL
}

export function setClientGoal(client: string, goal: number) {
  const goals = readClientGoals()
  goals[client] = goal
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  return goals
}
