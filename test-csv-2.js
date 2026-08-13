import Papa from 'papaparse';

const csvContent = `ACTIVE,DELETE,ID #,TRACK TITLE,MIGRATION #,STEMS,VARIATIONS,SAMPLES,ALT TITLES,YEAR,PRODUCTION,NOTES,ARTIST,ALBUM,PUBLISH DATE,UPC,ISRC,CONTENT ID,PRO,PUB ADMIN,WRITER 1,ROLE,SHARE,PRO,IPI #,PUBLISHER 1,Role,SHARE,PRO,IPI,SUB PUB,Genre,Mood,Instruments,Music For,Function,Character,Arrangement,Movement,Tempo,Track Description
FALSE,FALSE,TF-00585,Free Ride,MBI-002,5,0,No,,2023,,,,,,6095918894807,NL2VN2306804,Registered,Needs Registration,,Thomas Fox,Composer,100%,ASCAP,1013405620,TOM FOX,OP,100%,ASCAP,392875510,,,Tension,"Drums, Piano",,"Propel Forward, Ask Question",,,,Up Tempo,`;

let parsedRows = [];

Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header, index) => {
    return header.trim() + '___' + index;
  },
  complete: (results) => {
    parsedRows = results.data;
    
    const newTags = parsedRows[0];
    
    let updateData = {};
    
    const adminMappings = {
        'id_number': ['id #', 'id_number'],
        'pub_admin': ['pub admin', 'pub_admin'],
        'writer': ['writer', 'writer 1', 'writer 2', 'writer 3'],
        'role': ['role'],
        'pro_org': ['pro org', 'pro_org', 'pro'],
        'ipi_number': ['ipi #', 'ipi_number', 'ipi'],
        'publisher': ['publisher/publisher 1', 'publisher', 'publisher 1', 'publisher 2'],
        'share': ['share'],
        'sub_pub': ['sub pub', 'sub_pub'],
        'upc': ['upc'],
        'isrc': ['isrc'],
        'description': ['track description', 'description']
    };

    const proKeys = Object.keys(newTags).filter(k => k.toLowerCase().split('___')[0] === 'pro');
    proKeys.sort((a, b) => {
         const idxA = parseInt(a.split('___')[1] || '0');
         const idxB = parseInt(b.split('___')[1] || '0');
         return idxA - idxB;
    });

    if (proKeys.length > 0) {
        const proStatusKey = proKeys[0];
        const val = (newTags[proStatusKey] || '').toLowerCase().trim();
        if (val === 'registered') updateData.pro_registered = true;
        else updateData.pro_registered = false;
        
        delete newTags[proStatusKey];
    }

    Object.entries(adminMappings).forEach(([dbField, possibleHeaders]) => {
      const matchingKeys = Object.keys(newTags).filter(k => possibleHeaders.includes(k.toLowerCase().split('___')[0]));
      if (matchingKeys.length > 0) {
        let values = matchingKeys.map(k => newTags[k]).filter(v => v !== undefined && v !== null && v !== '');
        if (values.length > 0) {
          updateData[dbField] = values.join(', ');
        } else {
          updateData[dbField] = ''; 
        }
      }
    });
    
    const tagAliases = {
        'genre': ['genre'],
        'moods': ['moods', 'mood'],
        'music_for': ['music_for', 'music for'],
        'instruments': ['instruments', 'instrument'],
        'functions': ['functions', 'function'],
        'movement': ['movement'],
        'character': ['character'],
        'tempo': ['tempo'],
        'arrangement': ['arrangement']
      };

    const extractValues = (aliases) => {
        const matchingKeys = Object.keys(newTags).filter(k => aliases.includes(k.toLowerCase().split('___')[0]));
        if (matchingKeys.length === 0) return null; // column not present at all
        const values = matchingKeys.map(k => newTags[k]).filter(v => v !== undefined && v !== null && v !== '');
        return values;
      };

      Object.entries(tagAliases).forEach(([field, aliases]) => {
        const vals = extractValues(aliases);
        if (vals && vals.length > 0) {
          const combinedCsvTags = vals.flatMap(v => v.split(',').map(s=>s.trim()).filter(Boolean));
          updateData[field] = combinedCsvTags;
        }
      });

    console.log("Parsed row keys:", Object.keys(newTags).map(k => k.split('___')[0]));
    console.log("Update Data:");
    console.dir(updateData, { depth: null });
  }
});
