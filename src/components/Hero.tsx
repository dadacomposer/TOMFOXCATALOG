import { motion } from 'motion/react';
import { ArrowUpRight } from '@phosphor-icons/react';

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-24 px-4 overflow-hidden">
      {/* Background Mesh/Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold ring-1 ring-white/10 bg-white/5">
            The Tom Fox Catalog
          </span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter leading-[1.1] mb-6"
        >
          The Soundtrack for <br className="hidden md:block" />
          <span className="text-white/60">Modern Storytelling.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="font-sans text-base md:text-lg text-white/60 max-w-2xl mb-10 leading-relaxed uppercase tracking-wide"
        >
          A meticulously curated library of 2,500+ premium tracks for media, ads, and film. Built for creators, directors, and brands who refuse to compromise on sound.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          {/* Primary CTA with Button-in-Button style */}
          <button className="group relative bg-white text-black rounded-full pl-6 pr-2 py-2 flex items-center gap-4 hover:scale-[0.98] transition-transform duration-300">
            <span className="font-bold uppercase tracking-widest text-[11px]">Browse the Library</span>
            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors">
              <ArrowUpRight weight="bold" className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </button>

          {/* Secondary CTA */}
          <button className="px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            View Pricing
          </button>
        </motion.div>
      </div>
    </section>
  );
}
