const fs = require('fs');

const file = 'src/components/admin/ImportTagsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update ParsedRow interface
content = content.replace(
  /  subgenre\?: string;\n  moods\?: string;\n  scenarios\?: string;\n  instruments\?: string;\n  textures\?: string;\n  movement\?: string;\n  human_tags\?: string;\n  energy_level\?: string;/g,
  `  moods?: string;
  music_for?: string;
  instruments?: string;
  functions?: string;
  movement?: string;
  character?: string;
  tempo?: string;
  arrangement?: string;
  "content id"?: string;
  pro?: string;`
);

// Update tagFields array
content = content.replace(
  /const tagFields = \['genre', 'subgenre', 'moods', 'scenarios', 'instruments', 'textures', 'movement', 'human_tags', 'energy_level'\];/g,
  "const tagFields = ['genre', 'moods', 'music_for', 'instruments', 'functions', 'movement', 'character', 'tempo', 'arrangement'];"
);

// Add humanly_reviewed = true and PRO/FREQ mapping in processImport
content = content.replace(
  /      if \(Object\.keys\(updateData\)\.length > 0\) \{/g,
  `      updateData.humanly_reviewed = true;
      
      // Map 'content id' to frequency_audio_registered
      if (newTags['content id']) {
        const val = newTags['content id'].toLowerCase().trim();
        if (val === 'registered') updateData.frequency_audio_registered = true;
        else if (val === 'unregistered') updateData.frequency_audio_registered = false;
      }
      
      // Map 'pro' to pro_registered
      if (newTags['pro']) {
        const val = newTags['pro'].toLowerCase().trim();
        if (val === 'registered') updateData.pro_registered = true;
        else if (val === 'needs registration') updateData.pro_registered = false;
      }
      
      if (Object.keys(updateData).length > 0) {`
);

// Update downloadTemplate
content = content.replace(
  /const csvContent = "file_name,genre,subgenre,moods,scenarios,instruments,textures,movement,human_tags,energy_level\\nexample_track\.wav,\\"Electronic, Pop\\",\\"Synthwave\\",\\"Happy, Upbeat\\",\\"Driving, Party\\",\\"Synth, Drums\\",\\"Smooth\\",\\"Flowing\\",\\"Vocal, Instrumental\\",\\"High\\"";/g,
  'const csvContent = "file_name,genre,moods,music_for,instruments,functions,movement,character,tempo,arrangement,content id,pro\\nexample_track.wav,\\"Electronic, Pop\\",\\"Happy, Upbeat\\",\\"Driving, Party\\",\\"Synth, Drums\\",\\"Smooth\\",\\"Flowing\\",\\"Vocal, Instrumental\\",\\"High\\",\\"Ambient Piano\\",\\"Registered\\",\\"Needs Registration\\"";'
);

// Update Supported columns text
content = content.replace(
  /<li>Supported columns: genre, subgenre, moods, scenarios, instruments, textures, movement, human_tags, energy_level\.<\/li>/g,
  "<li>Supported columns: genre, moods, music_for, instruments, functions, movement, character, tempo, arrangement, content id, pro.</li>"
);

fs.writeFileSync(file, content);
