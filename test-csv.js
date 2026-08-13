import Papa from 'papaparse';

const csvContent = `Track Title,genre,moods,music_for,instruments,functions,movement,character,tempo,arrangement,content id,pro,ID #,Pub admin,writer,role,pro org,IPI #,publisher/publisher 1,share,SUB PUB,UPC,ISRC
Free Ride,"Electronic, Pop","Happy, Upbeat",,,,,,,,Registered,Needs Registration,TF-00585,,,,,,,,609591889480,NL2VN230680`;

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
    console.log("Parsed row:", newTags);
    
    let updateData = {};
    
    const adminMappings = {
      'id_number': ['id #', 'id_number'],
      'pub_admin': ['pub admin', 'pub_admin'],
      'writer': ['writer'],
      'role': ['role'],
      'pro_org': ['pro org', 'pro_org'],
      'ipi_number': ['ipi #', 'ipi_number'],
      'publisher': ['publisher/publisher 1', 'publisher', 'publisher 1'],
      'share': ['share'],
      'sub_pub': ['sub pub', 'sub_pub'],
      'upc': ['upc'],
      'isrc': ['isrc']
    };

    Object.entries(adminMappings).forEach(([dbField, possibleHeaders]) => {
      const matchingKeys = Object.keys(newTags).filter(k => possibleHeaders.includes(k.toLowerCase().split('___')[0]));
      if (matchingKeys.length > 0) {
        const values = matchingKeys.map(k => newTags[k]).filter(v => v !== undefined && v !== null && v !== '');
        if (values.length > 0) {
          updateData[dbField] = values.join(', ');
        } else {
          updateData[dbField] = ''; 
        }
      }
    });
    
    const tagFields = ['genre', 'moods', 'music_for', 'instruments', 'functions', 'movement', 'character', 'tempo', 'arrangement'];
    tagFields.forEach(field => {
        const matchingKeys = Object.keys(newTags).filter(k => k.toLowerCase().split('___')[0] === field.toLowerCase());
        const vals = matchingKeys.length > 0 ? matchingKeys.map(k => newTags[k]).filter(v => v !== undefined && v !== null && v !== '') : null;
        if (vals && vals.length > 0) {
            updateData[field] = vals;
        }
    });

    console.log("Update Data:", updateData);
  }
});
