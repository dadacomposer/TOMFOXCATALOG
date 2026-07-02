import fs from 'fs';
let content = fs.readFileSync('src/components/PlaylistIsland.tsx', 'utf8');
content = content.replace(/text-\[15px\] font-medium text-black\/50 leading-relaxed/g, 'text-[16px] md:text-[18px] text-black/60 leading-relaxed');
fs.writeFileSync('src/components/PlaylistIsland.tsx', content);
console.log('Updated PlaylistIsland.tsx');
