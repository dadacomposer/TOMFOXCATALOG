import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Headphones, Sparkles, ArrowRight } from 'lucide-react';
import { siGoogle, siNike, siAdidas, siNewyorktimes, siAnthropic, siVox } from 'simple-icons';
import { useAuth } from '../context/AuthContext';

const GOOGLE_G_PATH = "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 22.9c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 22.9 12 22.9zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.37 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z";
const VOX_OFFICIAL_PATH = "M54.9.8h1.7l.2-.8H35.4l-.2.8h3.1c2.7 0 4.9 1.9 4.9 5.6 0 2.1-.9 4.8-2.4 8.1L26.9 45.2 23.5 5.3C23.2 2.2 24.8.8 28.3.8h2l.2-.8H.3L0 .8h1.9c2.4 0 3.3 1.5 3.5 4.3l5.4 51.6h12.7l21.3-45.1C48.1 4.9 51.5.8 54.9.8zm-2.5 56.1c-1.9 0-3.1-.6-3.1-3.8 0-4 1.5-11.9 3.1-19.1.2 3.3 2.5 6.6 5.9 6.6.8 0 1.5-.1 2.2-.2-3.2 13.7-4.4 16.5-8.1 16.5zM113 29.8c4 0 6.6-3.3 6.6-7.1 0-3.2-2.3-5.6-5.6-5.6-5.9 0-8.7 4.7-13.6 13.3-1-5.4-3.5-12.4-9.7-12.4-7 0-15.1 10-22.5 16.2-3.4 2.9-7.1 4.7-10.1 4.7-3.1 0-4.9-3.1-4.9-8.6 2.2-9 3.3-11.3 6.7-11.3 2.3 0 3.3 1.3 3.3 4 0 2.9-.6 7.7-1.9 13.8 3.3-1 8.3-5.2 12.5-9.7-2.2-5.3-7-8.9-13.8-8.9-12.7 0-23.9 11.4-23.9 24.2 0 8.8 6.3 15.5 16.1 15.5 16.2 0 23-14 23-23.8 0-1.4-.1-2.4-.2-3.7 2.5-2.7 5.7-5.3 8.3-5.3 3 0 5.4 7.5 7.7 18.8-2.1 2.3-4.2 6.7-5.2 7.5-.4-4-3.1-6.5-6.6-6.5-4 0-6.7 3.8-6.7 7 0 3.6 2.5 6 5.8 6 6.9 0 8.8-6.5 13.1-12.3 1.3 6.2 4.4 12.3 9.7 12.3 6.3 0 12.1-5.4 15.1-9.2l-.6-.9c-1.9 1.9-3.8 3.1-6 3.1-3.9 0-6.7-8.4-8.8-18.6 1.3-1.7 3.3-6.1 4.7-7.7.9 1.8 2.9 5.2 7.5 5.2z";
const VOX_OFFICIAL_VIEWBOX = "-17.94 -14.475 155.48 86.85";

const LOGOS: { name: string, svgPath?: string, textMode?: boolean, label?: React.ReactNode, imageUrl?: string, viewBox?: string }[] = [
  { name: "Google", svgPath: GOOGLE_G_PATH },
  { name: "Vox", svgPath: VOX_OFFICIAL_PATH, viewBox: VOX_OFFICIAL_VIEWBOX },
  { name: "Nike", svgPath: siNike.path },
  { name: "Johnny Harris", textMode: true, label: <span className="text-base md:text-lg block"><span className="block text-center leading-[1]">Johnny</span><span className="block text-center leading-[1]">Harris</span></span> },
  { name: "Adidas", svgPath: siAdidas.path },
  { name: "Tunnel Vision", textMode: true, label: <span className="font-sans italic font-bold tracking-tight lowercase">tunnel_vision</span> },
  { name: "Anthropic", svgPath: siAnthropic.path },
  { name: "NY Times", svgPath: siNewyorktimes.path }
];

export default function Enterprise() {
  const { setContactModalOpen } = useAuth();

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fafafa] text-black overflow-hidden">
      
      {/* Hero Section */}
      <div className="relative w-full px-6 md:px-24 lg:px-32 pt-40 md:pt-48 pb-20 md:pb-32 flex flex-col items-start text-left overflow-hidden">
        
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 animate-slow-pan" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1721630175454-0ca4517bb530?q=80&w=2000&auto=format&fit=crop')" }} 
        />
        
        {/* Overlays for Text Readability */}
        <div className="absolute inset-0 bg-[#fafafa]/80 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#fafafa] via-[#fafafa]/90 to-transparent z-0"></div>
        
        <div className="relative z-10 w-full flex flex-col items-start text-left">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-[64px] md:text-[96px] lg:text-[120px] font-bold uppercase tracking-tighter leading-[0.85] mb-8 max-w-6xl"
          >
            Scale your<br />sound.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-sans text-black/50 uppercase tracking-widest text-sm md:text-base max-w-xl leading-relaxed"
          >
            Uncapped access for teams that build at scale. No limits, no legal headaches. 
          </motion.p>
        </div>
      </div>

      <div id="home-dark-section" className="w-full full-bleed">
        {/* Social Proof (Grid Logo layout) */}
        <section className="w-full bg-black text-white pt-24 pb-12 px-6 md:px-24 lg:px-32">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12 w-full">
            {/* Left side: flex wrap logos */}
            <div className="w-full md:w-3/4 order-2 md:order-1 flex flex-wrap gap-4">
              {LOGOS.map((logo, idx) => (
                <div key={idx} className="flex items-center justify-center p-4 md:px-6 md:py-4 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  {logo.imageUrl ? (
                    <img src={logo.imageUrl} alt={logo.name} className="h-10 md:h-12 w-auto opacity-40 brightness-0 invert pointer-events-none select-none" />
                  ) : logo.svgPath ? (
                    <svg
                      viewBox={logo.viewBox || "0 0 24 24"}
                      fill="currentColor"
                      className="h-8 md:h-10 w-auto text-white/40 cursor-default pointer-events-none"
                    >
                      <path d={logo.svgPath} />
                    </svg>
                  ) : (
                    <span className="font-bold text-xl md:text-2xl tracking-tighter text-white/50 cursor-default pointer-events-none">
                      {logo.label || logo.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Right side: text */}
            <div className="w-full md:w-1/4 order-1 md:order-2 flex justify-start md:justify-end">
              <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter text-white text-left md:text-right">Among our<br/>clients.</h2>
            </div>
          </div>
        </section>


      {/* The Perks - Bento Grid */}
      <section className="w-full bg-black px-6 md:px-24 lg:px-32 pt-12 pb-24 md:pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 h-auto md:h-[600px]">
          
          {/* Card 1: Large left column with Image Background */}
          <div 
            className="md:col-span-2 rounded-[40px] p-10 md:p-16 flex flex-col justify-between group relative overflow-hidden text-white"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1513909894411-7d7e04c28ecd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8cmV0cm8lMjBncmFwaGljJTIwZGVzaWduJTIwcG9wJTIwYXJ0JTIwcG9zdGVyJTIwdmlicmFudCUyMGNvbG9yZnVsfGVufDB8fHx8MTc4MjU4NTI2NHww&ixlib=rb-4.1.0&q=80&w=1080')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors z-0"></div>

            <div className="relative z-10 flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold uppercase tracking-tighter leading-[0.9] mb-6">
                Zero Clearance Drama.
              </h2>
              <p className="font-sans text-white/80 uppercase tracking-widest text-sm max-w-md leading-relaxed">
                We play nice with procurement. Standardized MSAs ready to sign, indemnification included, and global all-media rights cleared upfront.
              </p>
            </div>
          </div>

          {/* Right column stack */}
          <div className="flex flex-col gap-6 md:gap-8 h-full">
            {/* Card 2 */}
            <div className="flex-1 bg-white/5 text-white rounded-[40px] p-8 md:p-10 flex flex-col justify-between group hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white mb-8">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter mb-4">Your Personal<br />Supervisor</h3>
                <p className="font-sans text-white/50 uppercase tracking-widest text-xs leading-relaxed">
                  Need the perfect track fast? Talk directly to humans who know the catalog inside out.
                </p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="flex-1 bg-white text-black rounded-[40px] p-8 md:p-10 flex flex-col justify-between group hover:bg-[#f0f0f0] transition-colors">
              <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-black mb-8">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter mb-4">The Secret<br />Vault</h3>
                <p className="font-sans text-black/50 uppercase tracking-widest text-xs leading-relaxed">
                  Get exclusive early access to unreleased tracks, custom scores, and stems for your sound design.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      </div>

      {/* Lead Generation CTA */}
      <section className="w-full py-32 md:py-48 flex flex-col items-center justify-center bg-[#fafafa] relative overflow-hidden text-center md:text-left px-6">
        {/* HUGE DRIBBBLE LOGO WATERMARK */}
        <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] md:w-[80%] opacity-[0.02] -rotate-12 pointer-events-none select-none mix-blend-multiply" alt="" />
        
        <div className="relative z-10 w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-6xl md:text-8xl lg:text-[120px] font-bold uppercase tracking-tighter leading-[0.85] text-black mb-6">
              Let's<br />Talk<br />Scale.
            </h2>
            <p className="font-sans text-black/50 uppercase tracking-widest text-sm max-w-sm mb-12">
              Our enterprise team will reach out within 24 hours.
            </p>
          </div>

          <div className="w-full bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-black/10">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                alert("Enterprise contact request sent!");
              }} 
              className="w-full flex flex-col gap-8 text-left"
            >
              
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10"
                  placeholder="JANE DOE"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Work Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10"
                  placeholder="HELLO@COMPANY.COM"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Company Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10"
                  placeholder="YOUR AGENCY"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Project Scope</label>
                <textarea 
                  required
                  rows={2}
                  className="w-full bg-transparent border-b border-black/10 pb-2 text-lg md:text-xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10 resize-none"
                  placeholder="TELL US ABOUT YOUR NEEDS..."
                />
              </div>

              <button 
                type="submit"
                className="mt-4 flex items-center justify-between w-full p-4 md:p-6 bg-black text-white rounded-full group hover:bg-black/90 transition-colors"
              >
                <span className="font-bold uppercase tracking-widest text-[11px] md:text-xs">Send Request</span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white transition-colors">
                  <ArrowRight className="w-4 h-4 text-white group-hover:text-black" />
                </div>
              </button>
              
            </form>
          </div>

        </div>
      </section>

    </div>
  );
}
