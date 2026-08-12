const fs = require('fs');
let file = 'src/components/admin/ImportTagsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update ParsedRow interface
content = content.replace(
  /\[key: string\]: any;\n\}/,
  `[key: string]: any;
}`
);

// Update Papa.parse to handle duplicate headers by making them unique
content = content.replace(
  /header: true,\n\s*skipEmptyLines: true,/,
  `header: true,
      skipEmptyLines: true,
      transformHeader: (header, index) => {
        // We make headers unique so duplicate columns aren't overwritten
        return header.trim() + '___' + index;
      },`
);

// Update matchTracks to use the unique header for file_name
content = content.replace(
  /if \(rows\.length > 0 && !\('file_name' in rows\[0\]\)\) \{/,
  `// Find the exact key for file_name
        let fileNameKey = Object.keys(rows[0] || {}).find(k => k.toLowerCase().startsWith('file_name___'));
        if (rows.length > 0 && !fileNameKey) {`
);

content = content.replace(
  /rows\.forEach\(row => \{/,
  `rows.forEach(row => {
      let fileNameKey = Object.keys(row).find(k => k.toLowerCase().startsWith('file_name___'));
      let fileName = fileNameKey ? row[fileNameKey] : '';`
);

content = content.replace(
  /if \(!row\.file_name\) return;\n\s*const norm = normalizeString\(row\.file_name\);/,
  `if (!fileName) return;
      const norm = normalizeString(fileName);`
);

// Update processImport
const processImportRepl = `    let completed = 0;
    
    // We update in batches or sequentially. Since it might be hundreds, sequentially is safer for UI progress.
    for (const match of matchedTracks) {
      const { track, newTags } = match;
      
      const updateData: any = {};
      const tagFields = ['genre', 'moods', 'music_for', 'instruments', 'functions', 'movement', 'character', 'tempo', 'arrangement'];
      
      tagFields.forEach(field => {
        if (newTags[field] !== undefined && newTags[field] !== null && newTags[field] !== '') {
          const csvTags = splitCsvTags(newTags[field]);
          
          if (importMode === 'REPLACE') {
            updateData[field] = JSON.stringify(csvTags);
          } else {
            // APPEND
            const existing = parseExistingTags(track[field]);
            const combined = Array.from(new Set([...existing, ...csvTags]));
            updateData[field] = JSON.stringify(combined);
          }
        }
      });

      updateData.humanly_reviewed = true;
      
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
      
      if (Object.keys(updateData).length > 0) {
        await supabase.from('tracks').update(updateData).eq('id', track.id);
      }
      
      completed++;
      setProgress(Math.round((completed / matchedTracks.length) * 100));
    }`;

const processImportInsert = `    let completed = 0;
    
    for (const match of matchedTracks) {
      const { track, newTags } = match;
      
      const updateData: any = {};
      const tagFields = ['genre', 'moods', 'music_for', 'instruments', 'functions', 'movement', 'character', 'tempo', 'arrangement'];
      
      let tagModified = false;
      
      // Helper to extract values from multiple duplicate columns
      const extractValues = (keyBase: string) => {
        const matchingKeys = Object.keys(newTags).filter(k => k.toLowerCase().split('___')[0] === keyBase.toLowerCase());
        if (matchingKeys.length === 0) return null; // column not present at all
        const values = matchingKeys.map(k => newTags[k]).filter(v => v !== undefined && v !== null && v !== '');
        return values;
      };

      tagFields.forEach(field => {
        const vals = extractValues(field);
        if (vals && vals.length > 0) {
          tagModified = true;
          const combinedCsvTags = vals.flatMap(v => splitCsvTags(v));
          if (importMode === 'REPLACE') {
            updateData[field] = JSON.stringify(combinedCsvTags);
          } else {
            const existing = parseExistingTags(track[field]);
            const combined = Array.from(new Set([...existing, ...combinedCsvTags]));
            updateData[field] = JSON.stringify(combined);
          }
        }
      });

      if (tagModified) {
        updateData.humanly_reviewed = true;
      }
      
      // Map 'content id' to frequency_audio_registered
      const contentIdKeys = Object.keys(newTags).filter(k => k.toLowerCase().split('___')[0] === 'content id' || k.toLowerCase().split('___')[0] === 'freq');
      if (contentIdKeys.length > 0) {
        const val = (newTags[contentIdKeys[0]] || '').toLowerCase().trim();
        if (val === 'registered') updateData.frequency_audio_registered = true;
        else updateData.frequency_audio_registered = false;
      }
      
      // Map 'pro' to pro_registered
      const proKeys = Object.keys(newTags).filter(k => k.toLowerCase().split('___')[0] === 'pro');
      if (proKeys.length > 0) {
        const val = (newTags[proKeys[0]] || '').toLowerCase().trim();
        if (val === 'registered') updateData.pro_registered = true;
        else updateData.pro_registered = false;
      }

      // New Admin Columns
      const adminMappings: Record<string, string[]> = {
        'id_number': ['id #', 'id_number'],
        'pub_admin': ['pub admin', 'pub_admin'],
        'writer': ['writer'],
        'role': ['role'],
        'pro_org': ['pro org', 'pro_org'],
        'ipi_number': ['ipi #', 'ipi_number'],
        'publisher': ['publisher/publisher 1', 'publisher', 'publisher 1'],
        'share': ['share'],
        'sub_pub': ['sub pub', 'sub_pub']
      };

      Object.entries(adminMappings).forEach(([dbField, possibleHeaders]) => {
        const matchingKeys = Object.keys(newTags).filter(k => possibleHeaders.includes(k.toLowerCase().split('___')[0]));
        if (matchingKeys.length > 0) {
          const values = matchingKeys.map(k => newTags[k]).filter(v => v !== undefined && v !== null && v !== '');
          if (values.length > 0) {
            updateData[dbField] = values.join(', ');
          } else {
            updateData[dbField] = ''; // clear if completely empty cells
          }
        }
      });
      
      if (Object.keys(updateData).length > 0) {
        await supabase.from('tracks').update(updateData).eq('id', track.id);
      }
      
      completed++;
      setProgress(Math.round((completed / matchedTracks.length) * 100));
    }`;

content = content.replace(processImportRepl, processImportInsert);

// Fix download template
content = content.replace(
  /const csvContent = "file_name,genre,moods,music_for,instruments,functions,movement,character,tempo,arrangement,content id,pro\\nexample_track.wav,\\"Electronic, Pop\\",\\"Happy, Upbeat\\",\\"Driving, Party\\",\\"Synth, Drums\\",\\"Smooth\\",\\"Flowing\\",\\"Vocal, Instrumental\\",\\"High\\",\\"Ambient Piano\\",\\"Registered\\",\\"Needs Registration\\"";/,
  `const csvContent = "file_name,genre,moods,music_for,instruments,functions,movement,character,tempo,arrangement,content id,pro,ID #,Pub admin,writer,role,pro org,IPI #,publisher/publisher 1,share,SUB PUB\\nexample_track.wav,\\"Electronic, Pop\\",\\"Happy, Upbeat\\",\\"Driving, Party\\",\\"Synth, Drums\\",\\"Smooth\\",\\"Flowing\\",\\"Vocal, Instrumental\\",\\"High\\",\\"Ambient Piano\\",\\"Registered\\",\\"Needs Registration\\",\\"12345\\",\\"Admin1\\",\\"John Doe\\",\\"Composer\\",\\"ASCAP\\",\\"987654321\\",\\"Pub1\\",\\"50%\\",\\"SubPub1\\"";`
);

content = content.replace(
  /<li>Supported columns: genre, moods, music_for, instruments, functions, movement, character, tempo, arrangement, content id, pro.<\/li>/,
  `<li>Supported columns: genre, moods, music_for, instruments, functions, movement, character, tempo, arrangement, content id, pro, ID #, Pub admin, writer, role, pro org, IPI #, publisher/publisher 1, share, SUB PUB.</li>`
);

fs.writeFileSync(file, content);
