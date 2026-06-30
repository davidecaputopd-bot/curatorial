'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Home', desc: 'Dashboard' },
  { href: '/inbox', label: 'Inbox', desc: 'Cattura rapida' },
  { href: '/archivio', label: 'Archivio', desc: 'Salvati' },
  { href: '/calendario', label: 'Calendario', desc: 'Piano operativo' },
  { href: '/chat', label: 'Chat', desc: 'Chat veloce' },
  { href: '/ai', label: 'AI', desc: 'Assistente' },
]

export default function DesktopNav() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] border-r border-black/10 bg-[#F7F4EE]/95 px-5 py-6 text-[#0F0F10] backdrop-blur-xl lg:block">
      <Link href="/" className="mb-10 block">
        <p className="text-4xl font-black tracking-tight">
          GROW<span className="text-[#FFE500]">.</span>
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-black/35">
          Personal operating system
        </p>
      </Link>

      <nav className="space-y-2">
        {items.map((item) => {
          const active = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'block rounded-[1.25rem] px-4 py-3 transition-all',
                active
                  ? 'bg-[#0F0F10] text-[#FFE500] shadow-[0_18px_45px_rgba(15,15,16,0.14)]'
                  : 'text-[#0F0F10]/55 hover:bg-black/5 hover:text-[#0F0F10]',
              ].join(' ')}
            >
              <span className="block text-sm font-black uppercase tracking-tight">
                {item.label}
              </span>
              <span className={active ? 'mt-0.5 block text-[11px] font-bold text-[#FFE500]/70' : 'mt-0.5 block text-[11px] font-bold text-black/35'}>
                {item.desc}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-6 left-5 right-5 rounded-[1.4rem] border border-black/10 bg-white/45 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/35">
          Grow Web
        </p>
        <p className="mt-1 text-sm font-bold leading-snug">
          Inbox, archivio, calendario e AI in un unico spazio.
        </p>
      </div>
    </aside>
  )
}
