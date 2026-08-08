const fs = require('fs');
let content = fs.readFileSync('src/pages/Browse.tsx', 'utf8');

// Title 1
content = content.replace(
  /onClick=\{\(e\) \=\> \{ e\.stopPropagation\(\); setSelectedTrackForDetails\(track\); \}\}/g,
  "onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); setSelectedTrackForDetails(track); }}"
);

// Title 2 (versions)
content = content.replace(
  /onClick=\{\(e\) \=\> \{ e\.stopPropagation\(\); setSelectedTrackForDetails\(version\); \}\}/g,
  "onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); setSelectedTrackForDetails(version); }}"
);

// Tags
content = content.replace(
  /onClick=\{e \=\> handleTagClick\(t\.category, t\.val, e\)\}/g,
  "onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; handleTagClick(t.category, t.val, e); }}"
);

// Version toggle
content = content.replace(
  /onClick=\{\(e\) \=\> \{ e\.stopPropagation\(\); setExpandedTrackId\(expandedTrackId === track\.id \? null \: track\.id\); \}\}/g,
  "onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); setExpandedTrackId(expandedTrackId === track.id ? null : track.id); }}"
);

// Download button (track)
content = content.replace(
  /<button className="flex items-center gap-2 px-4 py-2 border border-black\/10 rounded hover:border-black\/30 transition-colors bg-white font-sans text-\[11px\] uppercase tracking-widest text-black" onClick=\{e \=\> \{ e\.stopPropagation\(\); openDownloadModal\(track, e\); \}\}>\s*<Download className="w-3\.5 h-3\.5" \/> Download\s*<\/button>/g,
  `<button className="p-1.5 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center text-black/40 hover:text-black shrink-0" onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); openDownloadModal(track, e); }} title="Download">
                  <Download className="w-4 h-4" />
                </button>`
);

// License button
content = content.replace(
  /onClick=\{e \=\> \{ e\.stopPropagation\(\); openLicenseModal\(track\); \}\}/g,
  "onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); openLicenseModal(track); }}"
);

// Download button (version)
content = content.replace(
  /<button className="flex items-center gap-2 px-3 py-1\.5 border border-black\/10 rounded hover:border-black\/30 transition-colors bg-white font-sans text-\[10px\] uppercase tracking-widest text-black" onClick=\{e \=\> \{ e\.stopPropagation\(\); openDownloadModal\(version, e\); \}\}>\s*<Download className="w-3 h-3" \/> Get\s*<\/button>/g,
  `<button className="p-1.5 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center text-black/40 hover:text-black shrink-0" onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); openDownloadModal(version, e); }} title="Download">
                          <Download className="w-4 h-4" />
                        </button>`
);

// Remaining Tags
content = content.replace(
  /onClick=\{\(e\) \=\> \{\s*e\.stopPropagation\(\);\s*setExpandedTags\(expandedTags\?\.trackId === track\.id \? null \: \{ trackId\: track\.id, tags\: remainingTags \}\);\s*\}\}/g,
  `onClick={(e) => {
                              if (e.shiftKey || e.metaKey || e.ctrlKey) return;
                              e.stopPropagation();
                              setExpandedTags(expandedTags?.trackId === track.id ? null : { trackId: track.id, tags: remainingTags });
                            }}`
);

fs.writeFileSync('src/pages/Browse.tsx', content);
