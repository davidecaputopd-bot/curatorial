'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      </svg>
    ),
  },
  {
    href: '/inbox',
    label: 'Inbox',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
      </svg>
    ),
  },
  {
    href: '/archivio',
    label: 'Archivio',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
  {
    href: '/calendario',
    label: 'Piano',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/ai',
    label: 'AI',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 110 20A10 10 0 0112 2z"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-2">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.8rem] border border-black/10 bg-[#F7F4EE]/92 p-1.5 shadow-[0_-2px_40px_rgba(15,15,16,0.08),0_18px_50px_rgba(15,15,16,0.12)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[10px] font-black uppercase tracking-tight transition-all duration-200',
                active
                  ? 'bg-[#0F0F10] text-[#FFE500]'
                  : 'text-[#0F0F10]/40 hover:bg-black/5 hover:text-[#0F0F10]/70',
              ].join(' ')}
            >
              <span className="leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
