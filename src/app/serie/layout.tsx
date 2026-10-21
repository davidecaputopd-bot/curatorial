import { Anton, Figtree } from 'next/font/google'

// Stessi caratteri di TV Time (entrambi Google Fonts, licenza OFL):
// Figtree per testi e interfaccia, Anton per i titoli.
const figtree = Figtree({ subsets: ['latin'], variable: '--font-tv-body', display: 'swap' })
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-tv-display', display: 'swap' })

export default function SerieLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${figtree.variable} ${anton.variable} ${figtree.className}`}>{children}</div>
}
