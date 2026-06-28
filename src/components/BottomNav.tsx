'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  {
    href: '/',
    label: 'Home',
    icon: '⌂',
  },
  {
    href: '/inbox',
    label: 'Inbox',
    icon: '↓',
  },
  {
    href: '/archivio',
    label: 'Archivio',
    icon: '♥',
  },
  {
    href: '/calendario',
    label: 'Calendario',
    icon: '□',
  },
  {
    href: '/ai',
    label: 'AI',
    icon: 'AI',
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-[#F7F4EE]/95 px-3 pb-5 pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[2rem] bg-[#0F0F10] p-1.5 shadow-2xl">
        {items.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex min-h-[58px] flex-col items-center justify-center rounded-[1.45rem] text-[10px] font-black uppercase tracking-tight transition',
                active
                  ? 'bg-[#FFE500] text-[#0F0F10]'
                  : 'text-white/55 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <span className="mb-1 flex h-5 items-center justify-center text-[15px] leading-none">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
