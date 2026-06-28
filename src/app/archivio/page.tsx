import BottomNav from '@/components/BottomNav'

const font = 'Inter, system-ui, sans-serif'

const collections = [
  {
    name: 'AN23',
    meta: 'vino, mare, shooting, reel',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=900&q=80',
  },
  {
    name: 'Exousia',
    meta: 'consulenza, Salento, impresa',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=80',
  },
  {
    name: 'Cantina Don Carlo',
    meta: 'etichette, mockup, packaging',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900&q=80',
  },
  {
    name: 'Prompt / reference',
    meta: 'AI, immagini, composizioni',
    image: 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=900&q=80',
  },
]

export default function ArchivioPage() {
  return (
    <main className="min-h-screen bg-grow-bg px-5 pb-32 pt-8 text-grow-text" style={{ fontFamily: font }}>
      <section className="mx-auto max-w-md">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-grow-muted">GROW Archivio</p>

        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.88] tracking-tighter">
          Memoria visiva<span className="text-grow-yellow">.</span>
        </h1>

        <p className="mt-5 text-sm leading-relaxed text-grow-muted">
          Qui GROW prende da Eagle, mymind e Are.na: reference salvate, collezioni,
          tag, progetti e connessioni tra materiali diversi.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {collections.map((collection) => (
            <article key={collection.name} className="overflow-hidden rounded-[1.8rem] border border-black/10 bg-white/75 shadow-sm">
              <div className="h-32">
                <img src={collection.image} alt={collection.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-black uppercase leading-none tracking-tight">{collection.name}</h2>
                  <span className="text-grow-yellow">♥</span>
                </div>
                <p className="mt-2 text-xs font-bold leading-snug text-grow-muted">{collection.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
