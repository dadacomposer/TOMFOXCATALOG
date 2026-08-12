const fs = require('fs');

let file = 'src/pages/Browse.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix FilterOptions type
content = content.replace(
  /type FilterOptions = \{[\s\S]*?\};\n/m,
  `type FilterOptions = {
  genre: FilterOption[];
  moods: FilterOption[];
  instruments: FilterOption[];
  functions: FilterOption[];
  music_for: FilterOption[];
  character: FilterOption[];
  arrangement: FilterOption[];
  movement: FilterOption[];
  tempo: FilterOption[];
};
`
);

// Fix implicit any
content = content.replace(/cat\.options\.filter\(o =>/g, 'cat.options.filter((o: FilterOption) =>');
content = content.replace(/filteredOpts\.map\(opt =>/g, 'filteredOpts.map((opt: FilterOption) =>');

// Fix missing properties in Track type in TrackDetails if there are any remaining (Wait, subgenre/scenarios)
// In Browse.tsx, at line 1111: `subgenre` and `scenarios`. I will replace them with `arrangement` and `music_for`.
content = content.replace(/track\.subgenre/g, 'track.arrangement');
content = content.replace(/track\.scenarios/g, 'track.music_for');
content = content.replace(/track\.textures/g, 'track.functions');
content = content.replace(/track\.human_tags/g, 'track.character');
content = content.replace(/track\.energy_level/g, 'track.tempo');

fs.writeFileSync(file, content);

// Fix AdminTracks.tsx
file = 'src/components/admin/AdminTracks.tsx';
content = fs.readFileSync(file, 'utf8');

// Fix tempo missing in bulkEditForm initialization
content = content.replace(
  /const \[bulkEditForm, setBulkEditForm\] = useState\(\{[\s\S]*?\}\);/m,
  `const [bulkEditForm, setBulkEditForm] = useState({
    file_name: '', arrangement: '', moods: '', 
    music_for: '', instruments: '', functions: '', 
    character: '', artwork_url: '', tempo: '' 
  });`
);

fs.writeFileSync(file, content);
