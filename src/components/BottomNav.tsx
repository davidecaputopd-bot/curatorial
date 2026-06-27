'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/scopri',
    label: 'Scopri',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/ai',
    label: 'AI',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
        <path d="M12 3l1.2 4.2L17 8.5l-3.8 1.3L12 14l-1.2-4.2L7 8.5l3.8-1.3L12 3z" strokeLinejoin="round" />
        <path d="M5 17l.6 2.1L7.5 20l-2.1.6L5 23l-.6-2.4L2 20l2.1-.6L5 17z" strokeLinejoin="round" />
        <path d="M19 14l.5 1.8L21 17l-1.8.5L19 19l-.5-1.8L17 17l1.8-.5L19 14z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/mind',
    label: 'Mind',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
        <path d="M9 5a3 3 0 00-3 3v1a3 3 0 003 3 3 3 0 003-3V8a3 3 0 00-3-3z" />
        <path d="M15 5a3 3 0 013 3v1a3 3 0 01-3 3 3 3 0 01-3-3V8a3 3 0 013-3z" />
        <path d="M9 14a3 3 0 00-3 3v1a3 3 0 003 3 3 3 0 003-3v-1a3 3 0 00-3-3z" />
        <path d="M15 14a3 3 0 013 3v1a3 3 0 01-3 3" />
      </svg>
    ),
  },
  {
    href: '/salvati',
    label: 'Salvati',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
        <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v18l-7-4-7 4V4z" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-grow-border bg-grow-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-lg items-center justify-around px-2 pb-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-w-[56px] flex-col items-center gap-1"
            >
              <span
                className={`flex h-9 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-grow-yellow text-grow-text' : 'text-grow-text'
                }`}
              >
                {tab.icon(active)}
              </span>
              <span
                className={`text-[10px] leading-none ${
                  active ? 'font-bold text-grow-text' : 'font-medium text-grow-muted'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
