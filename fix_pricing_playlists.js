import fs from 'fs';

let content = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

// Add imports
if (!content.includes('fetchPlaylists')) {
  content = content.replace("import { ArrowRight, Check, X, Mail, ChevronDown } from 'lucide-react';", "import { ArrowRight, Check, X, Mail, ChevronDown } from 'lucide-react';\nimport { fetchPlaylists } from '../lib/supabase';\nimport PlaylistArtwork from '../components/PlaylistArtwork';");
}

// Replace PLAYLISTS array with state and effect
const hookCode = `
  const [realPlaylists, setRealPlaylists] = useState<any[]>([]);

  useEffect(() => {
    fetchPlaylists().then(data => {
      const targetTitles = ['New Music', 'Lo-Fi', 'Exploring Space'];
      const filtered = data.filter(p => targetTitles.includes(p.title));
      // Sort to match
      filtered.sort((a, b) => targetTitles.indexOf(a.title) - targetTitles.indexOf(b.title));
      setRealPlaylists(filtered);
    });
  }, []);
`;

content = content.replace(/const PLAYLISTS = \[\s*\{.*\},\s*\{.*\},\s*\{.*\}\s*\];/g, '');

// insert the hook right after `const [isDropdownOpen, setIsDropdownOpen] = useState(false);`
content = content.replace(/const \[isDropdownOpen, setIsDropdownOpen\] = useState\(false\);/, 'const [isDropdownOpen, setIsDropdownOpen] = useState(false);\n' + hookCode);

// Replace the render
const newRender = `
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {realPlaylists.map((playlist, i) => (
              <div key={i} className="flex flex-col group cursor-pointer" onClick={() => navigate('/playlist/' + playlist.id)}>
                <div className="relative w-full aspect-[1.15] mb-6">
                   <PlaylistArtwork playlist={playlist} className="absolute top-0 right-0 w-[78%] aspect-square shadow-md group-hover:scale-[1.02] transition-transform cursor-pointer z-0" />
                   <PlaylistArtwork playlist={playlist} className="absolute top-[3%] right-[11%] w-[78%] aspect-square shadow-md group-hover:scale-[1.02] transition-transform cursor-pointer z-10" />
                   <PlaylistArtwork playlist={playlist} className="absolute top-[6%] left-0 w-[78%] aspect-square shadow-xl group-hover:scale-[1.02] transition-transform cursor-pointer z-20" />
                </div>
                <h3 className="font-bold uppercase tracking-tight text-[18px] text-black transition-colors">{playlist.title}</h3>
              </div>
            ))}
          </div>
`;

// Find the map part and replace it
content = content.replace(/<div className="grid grid-cols-1 md:grid-cols-3 gap-8">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/, newRender + '\n        </div>\n      </div>\n    </section>');

fs.writeFileSync('src/pages/Pricing.tsx', content);
console.log('Playlists updated in Pricing.');
