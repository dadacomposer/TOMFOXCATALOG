const fs = require('fs');

const file = 'src/components/admin/AdminUploadModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace copying logic for alternate mixes
content = content.replace(/updatePayload\.subgenre = parentTrack\.subgenre;/g, 'updatePayload.arrangement = parentTrack.arrangement;');
content = content.replace(/updatePayload\.textures = parentTrack\.textures;/g, 'updatePayload.functions = parentTrack.functions;');
content = content.replace(/updatePayload\.scenarios = parentTrack\.scenarios;/g, 'updatePayload.music_for = parentTrack.music_for;');
content = content.replace(/updatePayload\.human_tags = parentTrack\.human_tags;/g, 'updatePayload.character = parentTrack.character;\n            updatePayload.tempo = parentTrack.tempo;');

// Replace empty array initializations
content = content.replace(/updatePayload\.subgenre = null;/g, 'updatePayload.arrangement = [];');
content = content.replace(/updatePayload\.textures = \[\];/g, 'updatePayload.functions = [];');
content = content.replace(/updatePayload\.scenarios = \[\];/g, 'updatePayload.music_for = [];');
content = content.replace(/updatePayload\.human_tags = \[\];/g, 'updatePayload.character = [];\n          updatePayload.tempo = [];');

fs.writeFileSync(file, content);
