'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/scopri', label: 'Scopri', icon: '◌' },
  { href: '/archivio', label: 'Archivio', icon: '♥' },
  { href: '/calendario', label: 'Piano', icon: '□' },
  { href: '/ai', label: 'AI', icon: 'AI' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-2">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.8rem] border border-black/10 bg-[#F7F4EE]/90 p-1.5 shadow-[0_18px_50px_rgba(15,15,16,0.12)] backdrop-blur-xl">
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
                'flex min-h-[54px] flex-col items-center justify-center rounded-[1.35rem] text-[10px] font-black uppercase tracking-tight transition',
                active
                  ? 'bg-[#FFE500] text-[#0F0F10]'
                  : 'text-[#0F0F10]/45 hover:bg-black/5 hover:text-[#0F0F10]',
              ].join(' ')}
            >
              <span className="mb-1 text-[14px] leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
