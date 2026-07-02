import { motion } from 'motion/react';
import { Waveform, Ear, SpeakerHigh } from '@phosphor-icons/react';

export function Features() {
  return (
    <section className="py-24 px-4 max-w-6xl mx-auto">
      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Cell 1: Col-span 8 */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="md:col-span-8 glass-panel rounded-[2rem] p-2"
        >
          <div className="bg-white/5 rounded-[calc(2rem-0.5rem)] p-8 md:p-12 h-full flex flex-col justify-between min-h-[400px]">
            <Waveform className="w-8 h-8 text-white/40 mb-8" />
            <div>
              <h3 className="text-3xl font-bold uppercase tracking-tighter mb-4">We don't do background filler.</h3>
              <p className="font-sans text-[15px] md:text-[16px] text-white/60 leading-relaxed max-w-md">
                This is a formidable, highly curated collection of over 2,500 tracks designed to give your storytelling an undeniable, professional edge.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Cell 2: Col-span 4 */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="md:col-span-4 glass-panel rounded-[2rem] p-2"
        >
          <div className="bg-white/5 rounded-[calc(2rem-0.5rem)] p-8 h-full flex flex-col justify-between min-h-[400px]">
            <Ear className="w-8 h-8 text-white/40 mb-8" />
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tighter mb-4">Sonic Footprint</h3>
              <p className="font-sans text-[14px] text-white/60 leading-relaxed">
                Some projects demand a completely original sonic footprint.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Cell 3: Full width */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="md:col-span-12 glass-panel rounded-[2rem] p-2"
        >
          <div className="bg-gradient-to-r from-white/10 to-white/0 rounded-[calc(2rem-0.5rem)] p-8 md:p-12 h-full flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <SpeakerHigh className="w-8 h-8 text-white/40 mb-6" />
              <h3 className="text-3xl font-bold uppercase tracking-tighter mb-4">Beyond the Library</h3>
              <p className="font-sans text-[15px] md:text-[16px] text-white/60 leading-relaxed">
                Custom Composition & Sound Design. The Tom Fox team partners with select clients to craft bespoke audio landscapes from the ground up.
              </p>
            </div>
            <div>
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 font-bold uppercase text-[11px] tracking-widest rounded-full transition-colors">
                Contact our Team
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
