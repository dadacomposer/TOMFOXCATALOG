import fs from 'fs';

let content = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

// 1. Hero section
content = content.replace(
  /<h1 className="text-\[48px\] md:text-\[64px\] lg:text-\[80px\] font-bold leading-\[0.9\] tracking-tight mb-6 md:mb-8">\s*Music licensing,<br\/>simplified.\s*<\/h1>/g,
  '<h1 className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter mb-8 leading-[0.9]">\n  Radical Licensing.<br/>Zero Friction.\n</h1>'
);

content = content.replace(
  /<p className="text-\[18px\] md:text-\[22px\] text-black\/60 max-w-2xl mb-12 text-balance leading-relaxed">\s*Get unlimited access to the entire Tom Fox catalog. One simple subscription covers all your creative needs.\s*<\/p>/g,
  '<p className="font-mono uppercase text-sm md:text-base leading-relaxed tracking-wide text-black/50 max-w-2xl mb-12">\n  Secure unhindered access to the absolute bleeding edge of the Tom Fox archive. A singular subscription to power your entire creative arsenal.\n</p>'
);

// 2. Headings for sections
content = content.replace(/className="text-\[32px\] md:text-\[40px\] font-bold/g, 'className="text-4xl md:text-5xl font-bold uppercase tracking-tighter');
content = content.replace(/className="text-\[32px\] md:text-\[56px\] font-bold leading-tight/g, 'className="text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-tight');
content = content.replace(/className="text-\[40px\] md:text-\[56px\] lg:text-\[72px\] font-bold leading-\[1.05\] tracking-tight/g, 'className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter leading-[1.1]');

// 3. Buttons that have font-mono but shouldn't, or should match the landing page button format
// "bg-white text-black font-mono text-[12px] md:text-[13px] uppercase tracking-widest font-bold py-4 md:py-5 px-10 md:px-12 rounded-full hover:bg-white/90"
content = content.replace(/font-mono text-\[12px\] md:text-\[13px\] uppercase tracking-widest font-bold/g, 'font-bold uppercase text-xs tracking-widest');
// The "Browse the catalog" button:
content = content.replace(/bg-black text-white font-mono text-\[10px\] md:text-\[11px\] uppercase tracking-widest font-bold py-4 px-8 rounded-full/g, 'px-10 py-5 bg-black text-white font-bold uppercase text-xs tracking-widest hover:bg-black/80');

// 4. "Only on Tom Fox" -> "Only on Tom Fox Catalog"
content = content.replace(/Only on Tom Fox<\/span>/g, 'Only on Tom Fox Catalog</span>');

// 5. Update the "Stop searching. Start creating." block
content = content.replace(
  />\s*Stop searching\.<br\/>Start creating\.\s*<\/h2>/g,
  '>\n  Shatter The Noise.<br/>Define The Vibe.\n</h2>'
);
content = content.replace(
  /<p className="text-\[18px\] md:text-\[22px\] text-black\/60 max-w-2xl mb-10 text-balance">\s*Instead of digging through millions of generic stock tracks, get instant access to a highly curated catalog of premium music.\s*<\/p>/g,
  '<p className="font-mono text-sm md:text-base uppercase leading-relaxed tracking-wide text-black/50 max-w-2xl mb-12">\n  Bypass the wasteland of generic stock audio. Tap directly into a hyper-curated, uncompromising vault of elite compositions.\n</p>'
);

// 6. Update What's Included h3s
content = content.replace(/<h3 className="font-bold text-\[18px\] mb-3">/g, '<h3 className="font-bold uppercase tracking-tight text-[18px] mb-3">');

// 7. Update Tabs font
content = content.replace(/font-mono text-\[10px\] md:text-\[11px\] uppercase tracking-widest font-bold/g, 'font-mono text-[10px] md:text-xs uppercase tracking-widest font-bold');

fs.writeFileSync('src/pages/Pricing.tsx', content);
console.log("Refactoring complete.");
