'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_ACCENT, type AccentId } from '@/lib/accents'

export type Viewer = {
  name: string
  role: 'owner' | 'member'
  accent: AccentId
}

const ViewerContext = createContext<Viewer | null>(null)

export function ViewerProvider({
  viewer,
  children,
}: {
  viewer: Viewer | null
  children: React.ReactNode
}) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
}

export function useViewer() {
  return useContext(ViewerContext)
}

export function useAccent(): AccentId {
  return useViewer()?.accent ?? DEFAULT_ACCENT
}
