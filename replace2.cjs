const fs = require('fs');

const file = 'src/components/admin/TrackEditModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace property names in form state initialization
content = content.replace(/subgenre:/g, 'arrangement:');
content = content.replace(/track\.subgenre/g, 'track.arrangement');

content = content.replace(/textures:/g, 'functions:');
content = content.replace(/track\.textures/g, 'track.functions');

content = content.replace(/scenarios:/g, 'music_for:');
content = content.replace(/track\.scenarios/g, 'track.music_for');

content = content.replace(/human_tags:/g, 'character:');
content = content.replace(/track\.human_tags/g, 'track.character');

// Replace form mapping
content = content.replace(/form\.subgenre/g, 'form.arrangement');
content = content.replace(/form\.textures/g, 'form.functions');
content = content.replace(/form\.scenarios/g, 'form.music_for');
content = content.replace(/form\.human_tags/g, 'form.character');

// Replace UI mapping
content = content.replace(/field: 'subgenre'/g, "field: 'arrangement'");
content = content.replace(/field: 'textures'/g, "field: 'functions'");
content = content.replace(/field: 'scenarios'/g, "field: 'music_for'");
content = content.replace(/field: 'human_tags'/g, "field: 'character'");

fs.writeFileSync(file, content);
