'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChatCircleDots } from '@phosphor-icons/react'

export default function QuickChatButton() {
  const pathname = usePathname()
  if (
    pathname === '/' ||
    pathname === '/ai' ||
    pathname === '/chat' ||
    pathname === '/inbox' ||
    pathname === '/login' ||
    pathname.startsWith('/auth/')
  ) {
    return null
  }

  return (
    <Link
      href="/chat"
      aria-label="Apri chat veloce"
      className="fixed bottom-[104px] right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-[#0F0F10] px-4 text-grow-yellow shadow-[0_14px_34px_rgba(15,15,16,0.28)] ring-2 ring-grow-yellow/70 active:scale-[0.96] lg:hidden"
    >
      <ChatCircleDots size={22} weight="bold" />
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
        Chat
      </span>
    </Link>
  )
}
