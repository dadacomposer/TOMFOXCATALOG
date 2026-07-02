import fs from 'fs';
import path from 'path';

function replaceInFile(filepath, replacements) {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  for (const [search, replace] of replacements) {
    // using regex with global flag if search is a regex
    content = content.replace(search, replace);
  }
  if (content !== original) {
    fs.writeFileSync(filepath, content);
    console.log('Updated ' + filepath);
  }
}

// 1. Features.tsx
replaceInFile('src/components/Features.tsx', [
  [/text-3xl font-bold tracking-tight/g, 'text-3xl font-bold uppercase tracking-tighter'],
  [/text-2xl font-bold tracking-tight/g, 'text-2xl font-bold uppercase tracking-tighter'],
  [/rounded-full font-semibold/g, 'font-bold uppercase text-[11px] tracking-widest rounded-full'],
]);

// 2. Hero.tsx
replaceInFile('src/components/Hero.tsx', [
  [/font-bold tracking-tighter/g, 'font-bold uppercase tracking-tighter'],
  [/font-semibold text-sm/g, 'font-bold uppercase tracking-widest text-[11px]'],
  [/rounded-full text-sm font-semibold/g, 'rounded-full text-[11px] font-bold uppercase tracking-widest']
]);

// 3. Navbar.tsx
replaceInFile('src/components/Navbar.tsx', [
  [/font-semibold tracking-wide uppercase text-sm/g, 'font-bold uppercase tracking-widest text-[11px]'],
  [/text-sm font-medium text-white\/70/g, 'font-bold uppercase text-[11px] tracking-widest text-white/70'],
  [/text-white\/70 hover:text-white font-medium/g, 'text-white/70 hover:text-white font-bold uppercase text-[11px] tracking-widest'],
  [/rounded-full text-sm font-semibold/g, 'rounded-full text-[11px] font-bold uppercase tracking-widest'],
  [/rounded-full font-semibold/g, 'rounded-full text-[11px] font-bold uppercase tracking-widest']
]);

// 4. PlaylistIsland.tsx
replaceInFile('src/components/PlaylistIsland.tsx', [
  [/font-black uppercase tracking-tight/g, 'font-bold uppercase tracking-tighter'],
  [/font-medium text-black\/50/g, 'font-mono uppercase tracking-widest text-black/50 text-[10px]'],
  [/font-semibold text-\[15px\]/g, 'font-bold uppercase tracking-tight text-[15px]'],
  [/text-\[14px\] text-black\/60/g, 'font-mono text-xs uppercase tracking-wide text-black/60'],
]);

// 5. Check App.tsx or Browse.tsx for other stragglers
replaceInFile('src/pages/Browse.tsx', [
  [/font-black uppercase tracking-tight/g, 'font-bold uppercase tracking-tighter'],
  [/font-medium/g, 'font-mono uppercase tracking-widest text-xs'], // replace generic font-medium if any
]);

