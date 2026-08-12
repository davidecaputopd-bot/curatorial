'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Archive,
  Brain,
  CalendarBlank,
  House,
  NotePencil,
} from '@phosphor-icons/react'

const items = [
  { href: '/', label: 'Oggi', icon: House },
  { href: '/inbox', label: 'Inbox', icon: NotePencil },
  { href: '/archivio', label: 'Archivio', icon: Archive },
  { href: '/calendario', label: 'Piano', icon: CalendarBlank },
  { href: '/ai', label: 'AI', icon: Brain },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      aria-label="Navigazione principale"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.65rem] border border-black/10 bg-[#F7F4EE]/94 p-1.5 shadow-[0_-2px_36px_rgba(15,15,16,0.07),0_16px_42px_rgba(15,15,16,0.12)] backdrop-blur-xl">
        {items.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[1.2rem] text-[9px] font-bold uppercase tracking-[-0.01em] transition-all duration-200 active:scale-[0.97]',
                active
                  ? 'bg-[#0F0F10] text-[#FFE500]'
                  : 'text-[#5F5A52] hover:bg-black/5 hover:text-[#0F0F10]',
              ].join(' ')}
            >
              <Icon size={20} weight={active ? 'fill' : 'regular'} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
