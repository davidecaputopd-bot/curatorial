import BottomNav from '@/components/BottomNav'

const font = 'Inter, system-ui, sans-serif'

const days = [
  {
    day: 'Oggi',
    tasks: ['Trasformare reference in contenuto', 'Preparare bozze social', 'Rivedere materiali salvati'],
  },
  {
    day: 'Questa settimana',
    tasks: ['Piano editoriale clienti', 'Mockup e asset da finalizzare', 'Idee da passare ad AI'],
  },
]

export default function CalendarioPage() {
  return (
    <main className="min-h-screen bg-grow-bg px-5 pb-32 pt-8 text-grow-text" style={{ fontFamily: font }}>
      <section className="mx-auto max-w-md">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-grow-muted">GROW Calendario</p>
        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.88] tracking-tighter">
          Piano operativo<span className="text-grow-yellow">.</span>
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-grow-muted">
          Il calendario non è wellness e non è habit tracking. Serve a trasformare
          l’archivio in uscite, consegne, campagne, reel, mockup e decisioni.
        </p>

        <div className="mt-8 space-y-4">
          {days.map((group) => (
            <article key={group.day} className="rounded-[2rem] bg-[#0F0F10] p-5 text-white">
              <h2 className="text-2xl font-black uppercase tracking-tight">{group.day}</h2>
              <div className="mt-4 space-y-2">
                {group.tasks.map((task) => (
                  <div key={task} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white/85">
                    {task}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
