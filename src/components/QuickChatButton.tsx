'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function QuickChatButton() {
  const pathname = usePathname()
  if (
    pathname === '/chat' ||
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
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      >
        <path d="M4 5.5h16v10.75H8.25L4 20V5.5z" />
        <path d="M8 10h8M8 13h5" />
      </svg>
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
        Chat
      </span>
    </Link>
  )
}
