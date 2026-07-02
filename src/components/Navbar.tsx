import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X, PlayCircle } from '@phosphor-icons/react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
      <div className="glass-pill flex items-center justify-between px-6 py-3 rounded-full">
        <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[11px]">
          <PlayCircle weight="fill" className="w-5 h-5" />
          <span>Tom Fox</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-bold uppercase text-[11px] tracking-widest text-white/70">
          <a href="#" className="hover:text-white transition-colors">Tracks</a>
          <a href="#" className="hover:text-white transition-colors">Playlists</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Enterprise</a>
        </div>
        
        <div className="hidden md:block">
          <button className="bg-white text-black px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest hover:scale-[0.98] transition-transform">
            Sign In
          </button>
        </div>

        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <List className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-4 right-4 mt-2 glass-panel rounded-2xl p-4 flex flex-col gap-4 md:hidden"
          >
            <a href="#" className="text-white/70 hover:text-white font-bold uppercase text-[11px] tracking-widest">Tracks</a>
            <a href="#" className="text-white/70 hover:text-white font-bold uppercase text-[11px] tracking-widest">Playlists</a>
            <a href="#" className="text-white/70 hover:text-white font-bold uppercase text-[11px] tracking-widest">Pricing</a>
            <a href="#" className="text-white/70 hover:text-white font-bold uppercase text-[11px] tracking-widest">Enterprise</a>
            <hr className="border-white/10" />
            <button className="bg-white text-black py-3 rounded-full text-[11px] font-bold uppercase tracking-widest">Sign In</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
