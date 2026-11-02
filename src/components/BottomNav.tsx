'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Archive,
  CalendarBlank,
  Compass,
  NotePencil,
  SignOut,
  Television,
} from '@phosphor-icons/react'
import { useViewerRole } from '@/components/Viewer'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

const items = [
  { href: '/serie', label: 'Serie', icon: Television },
  { href: '/scopri', label: 'Scopri', icon: Compass },
  { href: '/inbox', label: 'Inbox', icon: NotePencil },
  { href: '/archivio', label: 'Archivio', icon: Archive },
  { href: '/calendario', label: 'Piano', icon: CalendarBlank },
]

export default function BottomNav() {
  const pathname = usePathname()
  const role = useViewerRole()

  // Gli amici hanno solo Serie: la barra si riduce a Serie e uscita.
  if (role === 'member') return <MemberNav />

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      aria-label="Navigazione principale"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-0.5 rounded-[1.9rem] bg-[#1C1B19]/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),var(--e3)] backdrop-blur-xl">
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
                'grow-press flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[1.5rem] text-[11px] font-semibold',
                active
                  ? 'grow-object bg-grow-yellow text-grow-black'
                  : 'text-grow-muted hover:text-grow-text',
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

function MemberNav() {
  const router = useRouter()

  async function signOut() {
    await createBrowserSupabaseClient().auth.signOut()
    router.replace('/entra')
    router.refresh()
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      aria-label="Navigazione principale"
    >
      <div className="mx-auto grid max-w-md grid-cols-2 gap-0.5 rounded-[1.9rem] bg-[#1C1B19]/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),var(--e3)] backdrop-blur-xl">
        <Link
          href="/serie"
          aria-current="page"
          className="grow-press grow-object flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[1.5rem] bg-grow-yellow text-[11px] font-semibold text-grow-black"
        >
          <Television size={20} weight="fill" />
          <span>Serie</span>
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="grow-press flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[1.5rem] text-[11px] font-semibold text-grow-muted hover:text-grow-text"
        >
          <SignOut size={20} />
          <span>Esci</span>
        </button>
      </div>
    </nav>
  )
}
