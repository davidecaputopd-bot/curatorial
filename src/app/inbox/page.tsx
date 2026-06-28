import BottomNav from '@/components/BottomNav'

const font = 'Inter, system-ui, sans-serif'

const lanes = [
  {
    title: 'Da leggere',
    text: 'Link, RSS, articoli e riferimenti ancora grezzi. Entrano qui prima di diventare idee.',
  },
  {
    title: 'Da trasformare',
    text: 'Materiali che possono diventare copy, moodboard, caroselli, prompt o brief.',
  },
  {
    title: 'Da archiviare',
    text: 'Reference utili da salvare in una collezione o collegare a un progetto.',
  },
]

export default function InboxPage() {
  return (
    <main className="min-h-screen bg-grow-bg px-5 pb-32 pt-8 text-grow-text" style={{ fontFamily: font }}>
      <section className="mx-auto max-w-md">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-grow-muted">GROW Inbox</p>
        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.88] tracking-tighter">
          Tutto entra qui<span className="text-grow-yellow">.</span>
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-grow-muted">
          Inbox non è un feed. È il punto di ingresso dei materiali: link, immagini,
          reference, note, fonti e spunti che poi devono diventare lavoro.
        </p>

        <div className="mt-8 space-y-3">
          {lanes.map((lane) => (
            <article key={lane.title} className="rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <h2 className="text-lg font-black uppercase tracking-tight">{lane.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-grow-muted">{lane.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[2rem] bg-[#0F0F10] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Principio</p>
          <p className="mt-3 text-2xl font-black leading-none tracking-tight">
            GROW non serve ad accumulare contenuti. Serve a trasformarli in lavoro.
          </p>
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
