'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Archive,
  CalendarBlank,
  Compass,
  NotePencil,
  Television,
} from '@phosphor-icons/react'

const items = [
  { href: '/serie', label: 'Serie', desc: 'Da vedere e nuove puntate', icon: Television },
  { href: '/scopri', label: 'Scopri', desc: 'Reference da esplorare', icon: Compass },
  { href: '/inbox', label: 'Inbox', desc: 'Cattura senza ordinare', icon: NotePencil },
  { href: '/archivio', label: 'Archivio', desc: 'Reference e salvati social', icon: Archive },
  { href: '/calendario', label: 'Piano', desc: 'Cosa produrre e quando', icon: CalendarBlank },
]

export default function DesktopNav() {
  const pathname = usePathname()

  return (
    <aside className="grow-surface fixed left-0 top-0 z-40 hidden h-[100dvh] w-[280px] px-4 py-7 lg:flex lg:flex-col">
      <Link href="/" className="mb-8 block px-3">
        <p className="font-display text-[2.5rem] leading-[0.9]">
          GROW<span className="text-grow-yellow">.</span>
        </p>
      </Link>

      <nav className="space-y-1" aria-label="Navigazione principale">
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
                'grow-press flex min-h-[60px] items-center gap-3 rounded-[1.15rem] px-3.5 py-2.5',
                active
                  ? 'grow-object bg-grow-yellow text-grow-black'
                  : 'text-grow-muted hover:bg-grow-soft hover:text-grow-text',
              ].join(' ')}
            >
              <Icon size={21} weight={active ? 'fill' : 'regular'} />
              <span className="min-w-0">
                <span className={active ? 'block text-[15px] font-bold' : 'block text-[15px] font-bold text-grow-text'}>
                  {item.label}
                </span>
                <span className={active ? 'mt-0.5 block text-xs text-grow-black/70' : 'mt-0.5 block text-xs'}>
                  {item.desc}
                </span>
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
