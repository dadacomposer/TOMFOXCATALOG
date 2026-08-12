const fs = require('fs');
let file = 'src/components/admin/AdminTracks.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add to AdminTrack type
content = content.replace(
  /frequency_audio_registered\?: boolean;\n};/,
  `frequency_audio_registered?: boolean;
  id_number?: string;
  pub_admin?: string;
  writer?: string;
  role?: string;
  pro_org?: string;
  ipi_number?: string;
  publisher?: string;
  share?: string;
  sub_pub?: string;
};`
);

// 2. Add to visibleColumns state
content = content.replace(
  /trackInfo: true,\n/,
  `trackInfo: true,
    id_number: false,
    pub_admin: false,
    writer: false,
    role: false,
    pro_org: false,
    ipi_number: false,
    publisher: false,
    share: false,
    sub_pub: false,\n`
);

// 3. Add to table headers
content = content.replace(
  /\{visibleColumns\.trackInfo && <th className="px-6 py-4 font-bold">Track Name<\/th>\}/,
  `{visibleColumns.trackInfo && <th className="px-6 py-4 font-bold">Track Name</th>}
                  {visibleColumns.id_number && <th className="px-6 py-4 font-bold">ID #</th>}
                  {visibleColumns.pub_admin && <th className="px-6 py-4 font-bold">Pub Admin</th>}
                  {visibleColumns.writer && <th className="px-6 py-4 font-bold">Writer</th>}
                  {visibleColumns.role && <th className="px-6 py-4 font-bold">Role</th>}
                  {visibleColumns.pro_org && <th className="px-6 py-4 font-bold">PRO Org</th>}
                  {visibleColumns.ipi_number && <th className="px-6 py-4 font-bold">IPI #</th>}
                  {visibleColumns.publisher && <th className="px-6 py-4 font-bold">Publisher</th>}
                  {visibleColumns.share && <th className="px-6 py-4 font-bold">Share</th>}
                  {visibleColumns.sub_pub && <th className="px-6 py-4 font-bold">Sub Pub</th>}`
);

// 4. Add to table rows (after trackInfo)
const tableRowRepl = `{visibleColumns.trackInfo && (`;
const tableRowInsert = `{visibleColumns.id_number && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.id_number || ''} onChange={(e) => updateTrackValue(track.id, 'id_number', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.pub_admin && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.pub_admin || ''} onChange={(e) => updateTrackValue(track.id, 'pub_admin', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.writer && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.writer || ''} onChange={(e) => updateTrackValue(track.id, 'writer', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.role && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.role || ''} onChange={(e) => updateTrackValue(track.id, 'role', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.pro_org && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.pro_org || ''} onChange={(e) => updateTrackValue(track.id, 'pro_org', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.ipi_number && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.ipi_number || ''} onChange={(e) => updateTrackValue(track.id, 'ipi_number', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.publisher && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.publisher || ''} onChange={(e) => updateTrackValue(track.id, 'publisher', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.share && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.share || ''} onChange={(e) => updateTrackValue(track.id, 'share', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.sub_pub && (
                        <td className="px-6 py-4">
                          <input type="text" className="w-24 bg-transparent focus:outline-none focus:border-b border-black/20" value={track.sub_pub || ''} onChange={(e) => updateTrackValue(track.id, 'sub_pub', e.target.value)} />
                        </td>
                      )}
                      {visibleColumns.trackInfo && (`;

content = content.replace(tableRowRepl, tableRowInsert);

fs.writeFileSync(file, content);
