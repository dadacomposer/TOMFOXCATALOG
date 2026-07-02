import fs from 'fs';

function replaceInFile(filepath, replacements) {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  if (content !== original) {
    fs.writeFileSync(filepath, content);
    console.log('Updated ' + filepath);
  }
}

// Pricing.tsx
replaceInFile('src/pages/Pricing.tsx', [
  // The role "Who are you" descriptions
  [/font-mono text-xs md:text-sm uppercase tracking-widest text-black\/50 mb-12 text-center max-w-xl/g, 'text-[16px] md:text-[18px] text-black/60 leading-relaxed mb-12 text-center max-w-xl'],
  [/font-mono text-xs md:text-sm uppercase tracking-widest text-black\/50 mb-12 text-center max-w-2xl/g, 'text-[16px] md:text-[18px] text-black/60 leading-relaxed mb-12 text-center max-w-2xl'],
  
  // Perks list items
  [/font-mono text-xs md:text-sm uppercase tracking-wide text-black\/70/g, 'text-[16px] md:text-[18px] text-black/70'],

  // The slide-over descriptions
  [/font-mono text-xs uppercase tracking-wide text-black\/60 leading-relaxed/g, 'text-[15px] text-black/60 leading-relaxed'],
  [/font-mono text-xs uppercase tracking-wide text-black\/60/g, 'text-[15px] text-black/60 leading-relaxed'],

  // "Unlimited Access" paragraph
  [/font-mono text-\[11px\] md:text-xs uppercase tracking-widest text-white\/50 leading-relaxed/g, 'text-white/50 text-[15px] leading-relaxed'],

  // Hero description
  [/font-mono uppercase text-sm md:text-base leading-relaxed tracking-wide text-black\/50 max-w-2xl mb-12/g, 'text-[16px] md:text-[22px] leading-relaxed text-black/60 max-w-2xl mb-12'],
]);

// Footer.tsx
replaceInFile('src/components/Footer.tsx', [
  // The catalog description
  [/font-mono text-xs uppercase tracking-widest text-black\/50 leading-relaxed/g, 'text-[14px] text-black/50 leading-relaxed'],
  // The copyright
  [/font-mono text-\[10px\] uppercase tracking-widest text-black\/40/g, 'text-[12px] text-black/40 font-mono'],
  // The social links
  [/font-mono text-\[10px\] uppercase tracking-widest text-black\/40 hover:text-black transition-colors/g, 'text-[12px] text-black/40 hover:text-black font-mono transition-colors'],
  // Navigation Links
  // the user said "browse, playlists, new releases e altri testi di elementi di navigazione siano in font diversi" -> they meant they were mono uppercase!
  [/font-bold uppercase text-\[11px\] tracking-widest text-black\/70 hover:text-black transition-colors/g, 'text-[14px] text-black/60 hover:text-black transition-colors'],
]);

// Home.tsx
replaceInFile('src/pages/Home.tsx', [
  // Hero Description
  [/font-mono uppercase text-sm mb-12 max-w-md leading-relaxed tracking-wide text-black\/50/g, 'text-[16px] md:text-[18px] text-black/60 leading-relaxed mb-12 max-w-md'],
  // Custom Music Description
  [/font-mono text-sm md:text-base uppercase leading-relaxed tracking-wide text-black\/70 max-w-2xl mb-12/g, 'text-[16px] md:text-[18px] text-black/60 leading-relaxed max-w-2xl mb-12'],
  // Stop Searching / Start Creating description
  [/font-mono text-sm md:text-base uppercase leading-relaxed tracking-wide text-black\/50 max-w-2xl mb-12/g, 'text-[16px] md:text-[18px] text-black/50 max-w-2xl mb-12'],
]);

// PlaylistIsland.tsx
replaceInFile('src/components/PlaylistIsland.tsx', [
  [/font-mono uppercase tracking-widest text-black\/50 text-\[10px\]/g, 'text-[15px] font-medium text-black/50 leading-relaxed'],
]);

