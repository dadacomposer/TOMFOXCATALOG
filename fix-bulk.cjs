const fs = require('fs');
let content = fs.readFileSync('src/pages/Browse.tsx', 'utf8');

if (!content.includes('import JSZip')) {
  content = content.replace(
    /import React, \{ useEffect, useState, useMemo, useRef \} from 'react';/,
    `import React, { useEffect, useState, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';`
  );
}

const newBulkDownload = `  const handleBulkDownload = async () => {
    const allVisibleTracks = [...displayedTracks, ...trendingTracks];
    const selected = allVisibleTracks.filter(t => selectedTrackIds.has(t.id));
    const uniqueSelected = Array.from(new Map(selected.map(t => [t.id, t])).values());
    if (uniqueSelected.length === 0) return;

    const toastId = toast.loading(\`Fetching 0/\${uniqueSelected.length} files...\`);
    const zip = new JSZip();
    let fetched = 0;

    for (const t of uniqueSelected) {
      try {
        const { data, error } = await supabase.functions.invoke('get_download_url', {
          body: { trackId: t.id, format: 'mp3' }
        });
        if (data?.url) {
          const response = await fetch(data.url);
          if (response.ok) {
            const blob = await response.blob();
            const filename = cleanTitle(t.file_name) + '.mp3';
            zip.file(filename, blob);
            fetched++;
            toast.loading(\`Fetching \${fetched}/\${uniqueSelected.length} files...\`, { id: toastId });
          }
        }
      } catch (err) {
        console.error('Download error:', err);
      }
    }

    if (fetched > 0) {
      toast.loading(\`Zipping \${fetched} files...\`, { id: toastId });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'TomFox_Tracks.zip');
      toast.success('Download complete!', { id: toastId });
      setSelectedTrackIds(new Set());
    } else {
      toast.error('Failed to download any tracks', { id: toastId });
    }
  };`;

content = content.replace(
  /const handleBulkDownload = async \(\) \=\> \{[\s\S]*?setSelectedTrackIds\(new Set\(\)\);\s*\};\n/m,
  newBulkDownload + '\n'
);

fs.writeFileSync('src/pages/Browse.tsx', content);
