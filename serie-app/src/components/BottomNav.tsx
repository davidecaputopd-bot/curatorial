'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useViewer } from '@/components/Viewer'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

function Icon({ path, filled }: { path: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={filled ? 2.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {path}
    </svg>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const viewer = useViewer()

  async function signOut() {
    await createBrowserSupabaseClient().auth.signOut()
    router.replace('/entra')
    router.refresh()
  }

  const item = (active: boolean) =>
    [
      'grow-press flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[1.5rem] text-[11px] font-semibold',
      active ? 'grow-object bg-grow-accent text-grow-black' : 'text-grow-muted hover:text-grow-text',
    ].join(' ')

  const columns = viewer?.role === 'owner' ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      aria-label="Navigazione principale"
    >
      <div
        className={`mx-auto grid max-w-md ${columns} gap-0.5 rounded-[1.9rem] bg-[#1C1B19]/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),var(--e3)] backdrop-blur-xl`}
      >
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={item(pathname === '/' || pathname.startsWith('/s/'))}
        >
          <Icon
            filled={pathname === '/'}
            path={
              <>
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M8 3l4 4 4-4" />
              </>
            }
          />
          <span>Serie</span>
        </Link>

        {viewer?.role === 'owner' && (
          <Link
            href="/inviti"
            aria-current={pathname === '/inviti' ? 'page' : undefined}
            className={item(pathname === '/inviti')}
          >
            <Icon
              filled={pathname === '/inviti'}
              path={
                <>
                  <path d="M4 5h16v14H4z" />
                  <path d="M4 7l8 6 8-6" />
                </>
              }
            />
            <span>Inviti</span>
          </Link>
        )}

        <button type="button" onClick={() => void signOut()} className={item(false)}>
          <Icon
            path={
              <>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </>
            }
          />
          <span>Esci</span>
        </button>
      </div>
    </nav>
  )
}
