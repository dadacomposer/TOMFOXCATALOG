import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Music } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-in fade-in duration-1000">
      
      <div className="w-24 h-24 rounded-full bg-black/5 flex items-center justify-center mb-8">
        <Music className="w-10 h-10 text-black/40" />
      </div>
      
      <h1 className="text-[120px] leading-none font-bold tracking-tighter uppercase mb-4">404</h1>
      
      <h2 className="text-2xl font-bold uppercase tracking-widest mb-6">Lost in the catalog</h2>
      
      <p className="text-black/60 max-w-md mx-auto mb-12">
        The page or track you are looking for doesn't exist or has been moved to a different location.
      </p>

      <Link 
        to="/"
        className="group relative inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs overflow-hidden transition-all hover:scale-105 active:scale-95"
      >
        <span className="relative z-10">Return to Catalog</span>
        <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
      </Link>
    </div>
  );
}
