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
    <aside className="fixed left-0 top-0 z-40 hidden h-[100dvh] w-[280px] border-r border-black/10 bg-[#F7F4EE]/96 px-5 py-6 text-[#0F0F10] backdrop-blur-xl lg:flex lg:flex-col">
      <Link href="/" className="mb-9 block px-2">
        <p className="font-display text-5xl uppercase leading-none tracking-normal">
          GROW<span className="text-[#FFE500]">.</span>
        </p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.17em] text-black/40">
          Secondo cervello personale
        </p>
      </Link>

      <nav className="space-y-1.5" aria-label="Navigazione principale">
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
                'flex min-h-[60px] items-center gap-3 rounded-[1.15rem] px-3.5 py-2.5 transition-all',
                active
                  ? 'bg-[#0F0F10] text-[#FFE500] shadow-[0_16px_38px_rgba(15,15,16,0.12)]'
                  : 'text-[#0F0F10]/55 hover:bg-black/5 hover:text-[#0F0F10]',
              ].join(' ')}
            >
              <Icon size={21} weight={active ? 'fill' : 'regular'} />
              <span className="min-w-0">
                <span className="block text-[12px] font-bold uppercase tracking-[0.02em]">
                  {item.label}
                </span>
                <span className={active ? 'mt-0.5 block text-[10px] text-white/50' : 'mt-0.5 block text-[10px] text-black/35'}>
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
