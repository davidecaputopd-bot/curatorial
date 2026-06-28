import BottomNav from '@/components/BottomNav'

const font = 'Inter, system-ui, sans-serif'

const cards = [
  {
    title: 'Reference visive',
    tag: 'visual',
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&q=80',
    text: 'Immagini, mood, dettagli, composizioni e direzioni estetiche da trasformare in progetti.',
  },
  {
    title: 'Fonti e link',
    tag: 'reader',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=900&q=80',
    text: 'Articoli, RSS, trend, news e materiali ancora grezzi da leggere o filtrare.',
  },
  {
    title: 'Da lavorare',
    tag: 'output',
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=900&q=80',
    text: 'Spunti che possono diventare copy, prompt, caroselli, moodboard, brief o reel.',
  },
]

export default function InboxPage() {
  return (
    <main className="min-h-screen bg-grow-bg px-5 pb-32 pt-8 text-grow-text" style={{ fontFamily: font }}>
      <section className="mx-auto max-w-md">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-grow-muted">GROW Inbox</p>

        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.88] tracking-tighter">
          Feed in ingresso<span className="text-grow-yellow">.</span>
        </h1>

        <p className="mt-5 text-sm leading-relaxed text-grow-muted">
          Qui non accumuli contenuti: li fai entrare, li guardi, li salvi, li trasformi.
          È la parte più vicina a Cosmos, Pinterest e Readwise, ma pensata per il tuo lavoro.
        </p>

        <div className="mt-8 space-y-4">
          {cards.map((card) => (
            <article key={card.title} className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/70 shadow-sm">
              <div className="relative h-44">
                <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
                <div className="absolute left-4 top-4 rounded-full bg-[#FFE500] px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                  {card.tag}
                </div>
              </div>
              <div className="p-5">
                <h2 className="text-2xl font-black uppercase tracking-tight">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-grow-muted">{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
