const fs = require('fs');

const file = 'src/components/admin/AdminTracks.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace property types
content = content.replace(/subgenre\?: string \| string\[\];/g, 'arrangement?: string | string[];');
content = content.replace(/textures\?: string \| string\[\];/g, 'functions?: string | string[];');
content = content.replace(/scenarios\?: string \| string\[\];/g, 'music_for?: string | string[];');
content = content.replace(/human_tags\?: string \| string\[\];/g, 'character?: string | string[];');
content = content.replace(/energy_level\?: string;/g, 'tempo?: string | string[];');

// Replace bulk edit state
content = content.replace(/subgenre: '', moods: '',/g, "arrangement: '', moods: '',");
content = content.replace(/scenarios: '', instruments: '', textures: '',/g, "music_for: '', instruments: '', functions: '',");
content = content.replace(/human_tags: '', artwork_url: ''/g, "character: '', artwork_url: '', tempo: ''");

// Replace DB select
content = content.replace(/subgenre, moods, scenarios, instruments, textures, human_tags/g, 'arrangement, moods, music_for, instruments, functions, character');
content = content.replace(/energy_level,/g, 'tempo,');

// Replace parse spread
content = content.replace(/\.\.\.parse\(t\.subgenre\)/g, '...parse(t.arrangement)');
content = content.replace(/\.\.\.parse\(t\.textures\)/g, '...parse(t.functions)');
content = content.replace(/\.\.\.parse\(t\.scenarios\)/g, '...parse(t.music_for)');
content = content.replace(/\.\.\.parse\(t\.human_tags\)/g, '...parse(t.character)');
content = content.replace(/t\.energy_level \|\| ''/g, "t.tempo || ''");

// Replace Array.isArray
content = content.replace(/track\.subgenre/g, 'track.arrangement');
content = content.replace(/track\.textures/g, 'track.functions');
content = content.replace(/track\.scenarios/g, 'track.music_for');
content = content.replace(/track\.human_tags/g, 'track.character');
content = content.replace(/track\.energy_level/g, 'track.tempo');
content = content.replace(/subgenre: Array/g, 'arrangement: Array');
content = content.replace(/textures: Array/g, 'functions: Array');
content = content.replace(/scenarios: Array/g, 'music_for: Array');
content = content.replace(/human_tags: Array/g, 'character: Array');

// Replace editForm splits
content = content.replace(/editForm\.subgenre/g, 'editForm.arrangement');
content = content.replace(/editForm\.textures/g, 'editForm.functions');
content = content.replace(/editForm\.scenarios/g, 'editForm.music_for');
content = content.replace(/editForm\.human_tags/g, 'editForm.character');

content = content.replace(/parsedSubgenre/g, 'parsedArrangement');
content = content.replace(/parsedTextures/g, 'parsedFunctions');
content = content.replace(/parsedScenarios/g, 'parsedMusicFor');
content = content.replace(/parsedHumanTags/g, 'parsedCharacter');

content = content.replace(/subgenre: parsed/g, 'arrangement: parsed');
content = content.replace(/textures: parsed/g, 'functions: parsed');
content = content.replace(/scenarios: parsed/g, 'music_for: parsed');
content = content.replace(/human_tags: parsed/g, 'character: parsed');

fs.writeFileSync(file, content);
