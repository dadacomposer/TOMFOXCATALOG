export function LogoWall() {
  return (
    <section className="py-24 border-t border-white/5 bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="font-sans text-[11px] uppercase tracking-widest text-white/40 mb-12">
          Trusted by the brands and creators shaping today's visual culture
        </p>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
          {/* Placeholder logos */}
          <span className="font-bold text-xl uppercase tracking-tight">Vox Media</span>
          <span className="font-bold text-xl uppercase tracking-tight">The New York Times</span>
          <span className="font-bold text-xl uppercase tracking-widest">Johnny Harris</span>
          <span className="font-bold text-xl uppercase tracking-tight">Nathaniel Drew</span>
          <span className="font-bold text-xl uppercase tracking-tighter">Tunnel Vision</span>
          <span className="font-bold text-xl uppercase tracking-tight">Search Party</span>
          <span className="font-bold text-xl uppercase tracking-tight">Audible</span>
        </div>
      </div>
    </section>
  );
}
