import BottomNav from '@/components/BottomNav'

const font = 'Inter, system-ui, sans-serif'

const slots = [
  {
    label: 'Oggi',
    title: 'Trasforma 1 reference',
    text: 'Scegli un contenuto salvato e fallo diventare copy, prompt, carosello o brief.',
  },
  {
    label: 'Questa settimana',
    title: 'Piano clienti',
    text: 'AN23, Exousia, Cantina Don Carlo, ACI: cosa deve uscire e cosa manca.',
  },
  {
    label: 'Backlog',
    title: 'Idee ferme',
    text: 'Materiali salvati che hanno potenziale ma non sono ancora diventati lavoro.',
  },
]

export default function CalendarioPage() {
  return (
    <main className="min-h-screen bg-grow-bg px-5 pb-32 pt-8 text-grow-text" style={{ fontFamily: font }}>
      <section className="mx-auto max-w-md">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-grow-muted">GROW Piano</p>

        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.88] tracking-tighter">
          Calendario operativo<span className="text-grow-yellow">.</span>
        </h1>

        <p className="mt-5 text-sm leading-relaxed text-grow-muted">
          Non è un planner wellness. È il posto dove le reference diventano consegne,
          contenuti, campagne, mockup e decisioni.
        </p>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-black/10 bg-white/70 shadow-sm">
          <div className="h-40">
            <img
              src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=900&q=80"
              alt="Piano operativo"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="space-y-3 p-5">
            {slots.map((slot) => (
              <article key={slot.label} className="rounded-[1.4rem] bg-[#F7F4EE] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">{slot.label}</p>
                <h2 className="mt-1 text-xl font-black uppercase tracking-tight">{slot.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-grow-muted">{slot.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
