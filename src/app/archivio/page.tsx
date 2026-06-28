import BottomNav from '@/components/BottomNav'

const font = 'Inter, system-ui, sans-serif'

const collections = [
  'AN23 / vino / mare',
  'Exousia / consulenza / Salento',
  'Cantina Don Carlo / etichette / mockup',
  'ACI Copertino / contenuti locali',
  'Stazione di Posta / sociale / locandine',
  'Prompt e visual reference',
]

export default function ArchivioPage() {
  return (
    <main className="min-h-screen bg-grow-bg px-5 pb-32 pt-8 text-grow-text" style={{ fontFamily: font }}>
      <section className="mx-auto max-w-md">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-grow-muted">GROW Archivio</p>
        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.88] tracking-tighter">
          Memoria creativa<span className="text-grow-yellow">.</span>
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-grow-muted">
          Qui finiscono i contenuti salvati, le reference visive, i prompt, gli asset
          e le idee collegate ai tuoi progetti. Non un cestino: una biblioteca operativa.
        </p>

        <div className="mt-8 grid gap-3">
          {collections.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-[1.6rem] border border-black/10 bg-white/70 px-5 py-4">
              <span className="text-sm font-black uppercase tracking-tight">{name}</span>
              <span className="text-xl text-grow-yellow">♥</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[2rem] border border-black/10 bg-[#FFE500] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">Prossimo step</p>
          <p className="mt-2 text-xl font-black leading-tight">
            Collegare ogni salvataggio a progetto, cliente, formato e stato operativo.
          </p>
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
