import { motion } from 'motion/react';

export function ValueProp() {
  return (
    <section className="py-32 px-4 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-8 leading-[1.1]">
          This isn’t stock music. <br />
          <span className="text-white/40">It’s a sonic arsenal.</span>
        </h2>
        
        <p className="font-sans text-base md:text-lg text-white/60 leading-relaxed max-w-3xl mx-auto uppercase tracking-wide">
          If you’ve watched a Johnny Harris deep-dive or felt the cinematic pull of a Nathaniel Drew film, you’ve already heard our DNA. The Tom Fox Catalog is an institution in premium digital journalism and independent cinema.
        </p>
      </motion.div>
    </section>
  );
}
