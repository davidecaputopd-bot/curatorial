'use client'

import { usePathname } from 'next/navigation'
import DesktopNav from '@/components/DesktopNav'
import { ViewerProvider } from '@/components/Viewer'
import type { ViewerRole } from '@/lib/auth/viewer'

export default function AppShell({
  role,
  children,
}: {
  role: ViewerRole | null
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/entra' ||
    pathname.startsWith('/auth/')

  if (isAuthPage) return <>{children}</>

  // Gli amici hanno solo Serie: la nav laterale di GROW non li riguarda.
  if (role === 'member') {
    return (
      <ViewerProvider role={role}>
        <div className="min-h-[100dvh]">{children}</div>
      </ViewerProvider>
    )
  }

  return (
    <ViewerProvider role={role}>
      <DesktopNav />
      <div className="min-h-[100dvh] lg:pl-[280px]">
        {children}
      </div>
    </ViewerProvider>
  )
}
