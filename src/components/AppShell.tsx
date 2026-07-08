'use client'

import { usePathname } from 'next/navigation'
import DesktopNav from '@/components/DesktopNav'
import QuickChatButton from '@/components/QuickChatButton'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isAuthPage =
    pathname === '/login' ||
    pathname.startsWith('/auth/')

  if (isAuthPage) return <>{children}</>

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen lg:pl-[280px]">
        {children}
      </div>
      <QuickChatButton />
    </>
  )
}
