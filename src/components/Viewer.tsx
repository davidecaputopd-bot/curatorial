'use client'

import { createContext, useContext } from 'react'
import type { ViewerRole } from '@/lib/auth/viewer'

const ViewerContext = createContext<ViewerRole | null>(null)

export function ViewerProvider({
  role,
  children,
}: {
  role: ViewerRole | null
  children: React.ReactNode
}) {
  return <ViewerContext.Provider value={role}>{children}</ViewerContext.Provider>
}

export function useViewerRole() {
  return useContext(ViewerContext)
}
