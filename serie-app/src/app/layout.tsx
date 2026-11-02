import type { Metadata, Viewport } from 'next'
import { Schibsted_Grotesk } from 'next/font/google'
import { ViewerProvider } from '@/components/Viewer'
import { getSession } from '@/lib/supabase/server'
import { DEFAULT_ACCENT, isAccent } from '@/lib/accents'
import './globals.css'

const schibsted = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-schibsted', display: 'swap' })

export const metadata: Metadata = {
  title: 'Time.',
  description: 'Le tue serie, il punto in cui sei, le prossime puntate.',
}

export const viewport: Viewport = {
  themeColor: '#0D0C0B',
  colorScheme: 'dark',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession()
  const accent = isAccent(profile?.accent) ? profile.accent : DEFAULT_ACCENT

  return (
    <html
      lang="it"
      data-accent={accent}
      className={`${schibsted.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ViewerProvider
          viewer={
            profile
              ? { name: profile.display_name, role: profile.role, accent }
              : null
          }
        >
          {children}
        </ViewerProvider>
      </body>
    </html>
  )
}
