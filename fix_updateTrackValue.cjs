const fs = require('fs');
let file = 'src/components/admin/AdminTracks.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace onChange with onBlur and value with defaultValue
content = content.replace(/value={track\.id_number \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'id_number', e\.target\.value\)\}/g, "defaultValue={track.id_number || ''} onBlur={(e) => updateTrackValue(track.id, 'id_number', e.target.value)}");
content = content.replace(/value={track\.pub_admin \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'pub_admin', e\.target\.value\)\}/g, "defaultValue={track.pub_admin || ''} onBlur={(e) => updateTrackValue(track.id, 'pub_admin', e.target.value)}");
content = content.replace(/value={track\.writer \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'writer', e\.target\.value\)\}/g, "defaultValue={track.writer || ''} onBlur={(e) => updateTrackValue(track.id, 'writer', e.target.value)}");
content = content.replace(/value={track\.role \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'role', e\.target\.value\)\}/g, "defaultValue={track.role || ''} onBlur={(e) => updateTrackValue(track.id, 'role', e.target.value)}");
content = content.replace(/value={track\.pro_org \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'pro_org', e\.target\.value\)\}/g, "defaultValue={track.pro_org || ''} onBlur={(e) => updateTrackValue(track.id, 'pro_org', e.target.value)}");
content = content.replace(/value={track\.ipi_number \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'ipi_number', e\.target\.value\)\}/g, "defaultValue={track.ipi_number || ''} onBlur={(e) => updateTrackValue(track.id, 'ipi_number', e.target.value)}");
content = content.replace(/value={track\.publisher \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'publisher', e\.target\.value\)\}/g, "defaultValue={track.publisher || ''} onBlur={(e) => updateTrackValue(track.id, 'publisher', e.target.value)}");
content = content.replace(/value={track\.share \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'share', e\.target\.value\)\}/g, "defaultValue={track.share || ''} onBlur={(e) => updateTrackValue(track.id, 'share', e.target.value)}");
content = content.replace(/value={track\.sub_pub \|\| ''} onChange=\{\(e\) => updateTrackValue\(track\.id, 'sub_pub', e\.target\.value\)\}/g, "defaultValue={track.sub_pub || ''} onBlur={(e) => updateTrackValue(track.id, 'sub_pub', e.target.value)}");

// Add updateTrackValue function
const functionToAdd = `
  const updateTrackValue = async (trackId: string, field: string, value: string) => {
    try {
      setAllFetchedTracks(prev => prev.map(t => t.id === trackId ? { ...t, [field]: value } : t));
      const { error } = await supabase.from('tracks').update({ [field]: value }).eq('id', trackId);
      if (error) throw error;
      toast.success(\`\${field} updated\`);
    } catch (error) {
      console.error(error);
      toast.error(\`Failed to update \${field}\`);
      // We don't easily revert local state here as we don't have the old value in scope, 
      // but it will refresh eventually.
    }
  };
`;

content = content.replace(/const toggleBoolean = async/g, functionToAdd + '\n  const toggleBoolean = async');

fs.writeFileSync(file, content);
