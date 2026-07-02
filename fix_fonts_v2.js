import fs from 'fs';

let content = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

// Hero Title
content = content.replace(
  /<h1 className="text-\[48px\] md:text-\[64px\] lg:text-\[80px\] font-bold leading-\[0.9\] tracking-tight mb-6 md:mb-8">[\s\S]*?<\/h1>/,
  '<h1 className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter mb-8 leading-[0.9]">\n          Radical Licensing.<br/>Zero Friction.\n        </h1>'
);

// Hero Description
content = content.replace(
  /<p className="max-w-2xl text-\[16px\] md:text-\[22px\] leading-relaxed text-black\/60">[\s\S]*?<\/p>/,
  '<p className="font-mono uppercase text-sm md:text-base leading-relaxed tracking-wide text-black/50 max-w-2xl mb-12">\n          Secure unhindered access to the absolute bleeding edge of the Tom Fox archive. A singular subscription to power your entire creative arsenal.\n        </p>'
);

// Fix role titles (like Who are you? / What size is your business?)
// Wait, I did `className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-4"` already. Let's see if there are any `text-[16px] text-black/50` descriptions.
content = content.replace(
  /className="text-\[16px\] text-black\/50 mb-12 text-center max-w-xl"/g,
  'className="font-mono text-xs md:text-sm uppercase tracking-widest text-black/50 mb-12 text-center max-w-xl"'
);
content = content.replace(
  /className="text-\[16px\] text-black\/50 mb-12 text-center max-w-2xl"/g,
  'className="font-mono text-xs md:text-sm uppercase tracking-widest text-black/50 mb-12 text-center max-w-2xl"'
);

// Role card titles
// <h3 className="text-[18px] md:text-[20px] font-bold group-hover:text-black text-black/80">{role.title}</h3>
content = content.replace(
  /className="text-\[18px\] md:text-\[20px\] font-bold group-hover:text-black text-black\/80"/g,
  'className="font-bold uppercase tracking-tight text-[16px] md:text-[18px] group-hover:text-black text-black/80"'
);

// Card descriptions / texts
// <li key={i} className="flex items-center gap-4 text-[16px] md:text-[18px] font-medium">
content = content.replace(
  /className="flex items-center gap-4 text-\[16px\] md:text-\[18px\] font-medium"/g,
  'className="flex items-center gap-4 font-mono text-xs md:text-sm uppercase tracking-wide text-black/70"'
);

// "What's included" title (I missed this?)
// <h2 className="text-[32px] md:text-[40px] font-bold mb-12 text-center">What's included</h2>
content = content.replace(
  /className="text-\[32px\] md:text-\[40px\] font-bold mb-12 text-center"/g,
  'className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-12 text-center"'
);

// The "Unlimited Access" paragraph
// <p className="text-white/50 text-[15px] leading-relaxed">
content = content.replace(
  /className="text-white\/50 text-\[15px\] leading-relaxed"/g,
  'className="font-mono text-[11px] md:text-xs uppercase tracking-widest text-white/50 leading-relaxed"'
);

// The slide-over panel selected data title
// <h2 className="text-[20px] font-bold">{selectedData.title}</h2>
content = content.replace(
  /className="text-\[20px\] font-bold"/g,
  'className="font-bold uppercase tracking-tight text-[20px]"'
);

// The selected data desc
// <p className="text-[14px] text-black/60">{selectedData.desc}</p>
content = content.replace(
  /className="text-\[14px\] text-black\/60"/g,
  'className="font-mono text-xs uppercase tracking-wide text-black/60"'
);

// The tier names in slide over
// <h3 className="font-bold text-[24px] mb-2">{tier.name}</h3>
content = content.replace(
  /className="font-bold text-\[24px\] mb-2"/g,
  'className="font-bold uppercase tracking-tighter text-[24px] mb-2"'
);

// The tier desc
// <p className="text-[14px] text-black/60">{tier.desc}</p>
content = content.replace(
  /className="text-\[14px\] text-black\/60"/g,
  'className="font-mono text-xs uppercase tracking-wide text-black/60"'
);

// Slide over close button "Close" label
// <span className="font-bold text-sm">Close</span>
content = content.replace(
  /className="font-bold text-sm">Close<\/span>/g,
  'className="font-bold uppercase tracking-widest text-xs">Close</span>'
);

fs.writeFileSync('src/pages/Pricing.tsx', content);
console.log('Fixed additional fonts');
