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

const PLAIN_TEXT = 'text-[16px] md:text-[18px] text-black/60 leading-relaxed';

// 1. Pricing.tsx
replaceInFile('src/pages/Pricing.tsx', [
  // The hero subtitle
  [/text-\[16px\] md:text-\[22px\] leading-relaxed text-black\/60/g, PLAIN_TEXT],
  // Perks list
  [/text-\[16px\] md:text-\[18px\] text-black\/70/g, PLAIN_TEXT],
  // Don't fit into these categories
  [/text-\[14px\] md:text-\[15px\] text-black\/50/g, PLAIN_TEXT],
  // Frictionless clearance description
  [/text-white\/50 text-\[15px\] leading-relaxed/g, PLAIN_TEXT.replace('text-black/60', 'text-white/60')],
  // Slide-over descriptions
  [/text-\[15px\] text-black\/60 leading-relaxed/g, PLAIN_TEXT],
]);

// 2. Footer.tsx
replaceInFile('src/components/Footer.tsx', [
  // The premium catalog...
  [/text-\[14px\] text-black\/50 leading-relaxed/g, PLAIN_TEXT],
  // Footer Links
  [/text-\[14px\] text-black\/60 hover:text-black transition-colors/g, `${PLAIN_TEXT} hover:text-black transition-colors`],
  // Social links
  [/text-\[12px\] text-black\/40 hover:text-black font-mono transition-colors/g, `${PLAIN_TEXT} hover:text-black transition-colors`],
  // Copyright
  [/text-\[12px\] text-black\/40 font-mono/g, PLAIN_TEXT],
]);

// 3. Home.tsx
replaceInFile('src/pages/Home.tsx', [
  // Stop Searching. Start Creating.
  [/text-\[16px\] md:text-\[18px\] text-black\/50 max-w-2xl mb-12/g, `${PLAIN_TEXT} max-w-2xl mb-12`],
  // Beyond the library
  [/text-\[16px\] md:text-\[18px\] text-black\/60 leading-relaxed max-w-2xl mb-12/g, `${PLAIN_TEXT} max-w-2xl mb-12`],
  // Break the silence
  [/text-\[16px\] md:text-\[18px\] text-black\/60 leading-relaxed mb-12 max-w-md/g, `${PLAIN_TEXT} mb-12 max-w-md`],
]);

// 4. Features.tsx
replaceInFile('src/components/Features.tsx', [
  // "Say goodbye to sterile..."
  [/text-black\/50 text-lg/g, PLAIN_TEXT],
  // "Our catalog is precision-engineered..."
  [/text-white\/60 text-lg/g, PLAIN_TEXT.replace('text-black/60', 'text-white/60')],
  // "Some projects demand..."
  [/text-white\/60 text-lg/g, PLAIN_TEXT.replace('text-black/60', 'text-white/60')],
]);

