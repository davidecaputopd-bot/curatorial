import type { Metadata } from 'next'

// Serie usa il carattere di tutta l'app (Schibsted Grotesk, caricato nel layout principale).
export const metadata: Metadata = {
  title: 'Serie.',
  description: 'Le tue serie, il punto in cui sei, le prossime puntate.',
}

export default function SerieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
