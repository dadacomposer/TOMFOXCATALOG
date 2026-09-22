import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Enterprise() {
  const { setContactModalOpen } = useAuth();

  return (
    <div className="w-full min-h-screen bg-black text-white px-6 pt-32 pb-24">
      <section className="max-w-5xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.24em] font-bold text-white/45 mb-5">Enterprise licensing</p>
        <h1 className="max-w-4xl text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.9]">Music for projects with a larger brief.</h1>
        <p className="max-w-2xl mt-8 text-base md:text-lg leading-relaxed text-white/65">
          Whether you are working across multiple channels, clients, territories, or productions, we can help shape a license around the actual scope of your work.
        </p>

        <div className="grid md:grid-cols-3 gap-px bg-white/15 mt-14 border border-white/15">
          {[
            ['Custom scope', 'Discuss the rights, channels, territories, and term your production needs.'],
            ['Direct support', 'Work directly with us to clarify usage and find the right music.'],
            ['Clear next steps', 'Send the brief and we will follow up with the appropriate licensing path.'],
          ].map(([title, copy]) => (
            <div key={title} className="bg-black p-7 min-h-[190px]">
              <h2 className="text-xl font-bold uppercase tracking-tight">{title}</h2>
              <p className="text-sm leading-relaxed text-white/60 mt-4">{copy}</p>
            </div>
          ))}
        </div>

        <button onClick={() => setContactModalOpen(true)} className="mt-12 bg-white text-black px-7 py-4 text-[11px] uppercase tracking-widest font-bold hover:bg-white/85 transition-colors">
          Talk to sales
        </button>
      </section>
    </div>
  );
}
