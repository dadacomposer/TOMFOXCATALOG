import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Plus, Trash2, Music, Tag, FileAudio, ChevronDown, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Track } from '../../context/PlayerContext';
import { fetchTrackVersions } from '../../lib/supabase';
import CustomSelect from '../CustomSelect';
import { DEFAULT_COMPOSERS } from '../../config';
import TrackArtwork from '../TrackArtwork';
import { extractWaveformFromFile } from '../../utils/audioWaveform';

type TrackEditModalProps = {
  track: Track;
  onClose: () => void;
  onSave: (data: any) => void;
};

const TagInput = ({ tags, onChange, placeholder }: { tags: string[], onChange: (tags: string[]) => void, placeholder?: string }) => {
  const [input, setInput] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = input.trim();
      if (value && !tags.includes(value)) {
        onChange([...tags, value]);
        setInput('');
      }
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-black/10 focus-within:border-black/30 rounded-xl min-h-[46px] shadow-sm transition-all">
      {tags.map((tag, index) => (
        <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/5 rounded-lg text-xs font-medium text-black">
          {tag}
          <button type="button" onClick={() => removeTag(index)} className="hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm px-1"
      />
    </div>
  );
};

export default function TrackEditModal({ track, onClose, onSave }: TrackEditModalProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'metadata' | 'versions'>('main');
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<Track[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  
  // New version state
  const [versionForm, setVersionForm] = useState<{
    file: File | null;
    title: string;
    version_type: string;
  }>({
    file: null,
    title: '',
    version_type: 'Alt Version'
  });
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

  // Main track form
  const [form, setForm] = useState({
    file_name: track.file_name || '',
    artwork_url: track.artwork_url || '',
    album: track.album || '',
    composers: Array.isArray(track.composers) ? track.composers : (track.composers ? [track.composers] : DEFAULT_COMPOSERS),
    key: track.key || '',
    subgenre: (() => {
      if (!track.subgenre) return [];
      if (Array.isArray(track.subgenre)) return track.subgenre;
      try { return JSON.parse(track.subgenre); } catch(e) { return [track.subgenre]; }
    })(),
    moods: Array.isArray(track.moods) ? track.moods : (track.moods ? [track.moods] : []),
    scenarios: Array.isArray(track.scenarios) ? track.scenarios : (track.scenarios ? [track.scenarios] : []),
    instruments: Array.isArray(track.instruments) ? track.instruments : (track.instruments ? [track.instruments] : []),
    textures: Array.isArray(track.textures) ? track.textures : (track.textures ? [track.textures] : []),
    human_tags: Array.isArray(track.human_tags) ? track.human_tags : (track.human_tags ? [track.human_tags] : []),
    movement: Array.isArray(track.movement) ? track.movement : (track.movement ? [track.movement] : []),
  });

  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'versions') {
      loadVersions();
    }
  }, [activeTab, track.id]);

  const loadVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const data = await fetchTrackVersions(track.id);
      setVersions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading('Uploading artwork...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('artworks').upload(fileName, file);
      
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('artworks').getPublicUrl(fileName);
      setForm({ ...form, [field]: data.publicUrl });
      
      toast.success('Artwork uploaded successfully', { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || 'Error uploading artwork', { id: loadingToast });
    }
  };

  const handleSaveMain = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        file_name: form.file_name,
        artwork_url: form.artwork_url ? form.artwork_url : null,
        album: form.album,
        composers: form.composers,
        key: form.key,
        subgenre: JSON.stringify(form.subgenre),
        moods: form.moods,
        scenarios: form.scenarios,
        instruments: form.instruments,
        textures: form.textures,
        human_tags: form.human_tags,
        movement: form.movement,
      };

      const { error } = await supabase
        .from('tracks')
        .update(updateData)
        .eq('id', track.id);
        
      if (error) throw error;
      toast.success('Track updated successfully');
      onSave(updateData);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error updating track');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVersionAudioUpload = async () => {
    if (!versionForm.file || !versionForm.title) {
      toast.error('Please provide a file and a title');
      return;
    }
    setIsUploadingVersion(true);
    const loadingToast = toast.loading('Uploading version to R2...');

    try {
      const { data: presignData, error: presignError } = await supabase.functions.invoke('r2_presigned_url', {
        body: {
          fileName: versionForm.file.name,
          contentType: versionForm.file.type || 'audio/mpeg'
        }
      });

      if (presignError || !presignData?.presignedUrl) {
        throw new Error(presignError?.message || 'Failed to get upload URL');
      }

      const uploadRes = await fetch(presignData.presignedUrl, {
        method: 'PUT',
        body: versionForm.file,
        headers: {
          'Content-Type': versionForm.file.type || 'audio/mpeg'
        }
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      let waveform_data: number[] | null = null;
      let extracted_duration = 0;
      try {
        const extracted = await extractWaveformFromFile(versionForm.file);
        waveform_data = extracted.waveform;
        extracted_duration = extracted.duration;
      } catch (err) {
        console.error("Failed to extract waveform in browser", err);
      }

      const newTrackData = {
        file_name: versionForm.title,
        file_path: presignData.publicUrl,
        folder: 'versions',
        duration: Math.round(extracted_duration) || 0,
        key: track.key || '',
        scale: '',
        key_strength: 0,
        danceability: 0,
        average_loudness: 0,
        integrated_loudness: 0,
        r2_url: presignData.publicUrl,
        parent_track_id: track.id,
        track_type: versionForm.version_type === 'Stem' ? 'stem' : 'version',
        artwork_url: track.artwork_url,
        waveform_data: waveform_data ? JSON.stringify(waveform_data) : null,
      };

      const { error: insertError } = await supabase.from('tracks').insert(newTrackData);
      
      if (insertError) throw insertError;

      toast.success('Version uploaded successfully', { id: loadingToast });
      setVersionForm({ file: null, title: '', version_type: 'Alt Version' });
      loadVersions();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error uploading version', { id: loadingToast });
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      const { error } = await supabase.from('tracks').update({ deleted_at: new Date().toISOString() }).eq('id', versionId);
      if (error) throw error;
      toast.success('Version deleted');
      setVersions(versions.filter(v => v.id !== versionId));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setVersionToDelete(null);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col h-[85vh] overflow-hidden shadow-2xl border border-black/10 animate-slide-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center shrink-0 relative overflow-hidden border border-black/10">
              <TrackArtwork track={{ ...track, artwork_url: form.artwork_url }} className="absolute inset-0 w-full h-full object-cover" />
            </span>
            {track.file_name}
          </h3>
          <button onClick={handleClose} className="p-2 hover:bg-black/5 rounded-full text-black/50 hover:text-black transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex border-b border-black/5 px-6 shrink-0">
          <button 
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'main' ? 'border-black text-black' : 'border-transparent text-black/40 hover:text-black'}`}
            onClick={() => setActiveTab('main')}
          >
            <Music className="w-4 h-4" /> Main Info
          </button>
          <button 
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'metadata' ? 'border-black text-black' : 'border-transparent text-black/40 hover:text-black'}`}
            onClick={() => setActiveTab('metadata')}
          >
            <Tag className="w-4 h-4" /> Metadata
          </button>
          <button 
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'versions' ? 'border-black text-black' : 'border-transparent text-black/40 hover:text-black'}`}
            onClick={() => setActiveTab('versions')}
          >
            <FileAudio className="w-4 h-4" /> Versions & Stems
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-black/[0.02]">
          {activeTab === 'main' && (
            <div className="space-y-6 w-full">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Track Title</label>
                <input
                  type="text"
                  value={form.file_name}
                  onChange={e => setForm({ ...form, file_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-black/10 focus:border-black/30 rounded-xl outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Album</label>
                <input
                  type="text"
                  value={form.album}
                  onChange={e => setForm({ ...form, album: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-black/10 focus:border-black/30 rounded-xl outline-none transition-all shadow-sm"
                  placeholder="Album name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">
                  Composers <span className="lowercase normal-case font-normal">(press Enter to add)</span>
                </label>
                <TagInput
                  tags={form.composers}
                  onChange={tags => setForm({ ...form, composers: tags })}
                  placeholder="e.g. Tom Fox, John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Artwork</label>
                <div className="flex gap-6 items-center">
                  <div className="w-32 h-32 shrink-0 bg-black/5 rounded-xl overflow-hidden border border-black/10 relative group shadow-inner">
                    <TrackArtwork track={{ ...track, artwork_url: form.artwork_url }} className="absolute inset-0 w-full h-full object-cover" />
                    <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs font-bold uppercase tracking-wider">Change</span>
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'artwork_url')} />
                    </label>
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-black/40 leading-relaxed max-w-sm">
                      Upload a high-quality square image (recommended 1000x1000px). JPG or PNG format.
                    </p>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-bold uppercase tracking-wider text-black/30 shrink-0">Or Paste URL:</span>
                       <input
                        type="text"
                        value={form.artwork_url}
                        onChange={e => setForm({ ...form, artwork_url: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white border border-black/10 focus:border-black/30 rounded-lg outline-none transition-all shadow-sm text-sm"
                        placeholder="https://..."
                      />
                      {(form.artwork_url || track.artwork_url) && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, artwork_url: '' })}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5"
                          title="Restore default procedural artwork"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Key</label>
                  <input
                    type="text"
                    value={form.key}
                    onChange={e => setForm({ ...form, key: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-black/10 focus:border-black/30 rounded-xl outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              {[
                { label: 'Arrangement', field: 'subgenre', placeholder: 'e.g. Ambient Piano, Neoclassical' },
                { label: 'Mood', field: 'moods', placeholder: 'e.g. Peaceful, Melancholic' },
                { label: 'Usage', field: 'scenarios', placeholder: 'e.g. Late Night Listening, Focus' },
                { label: 'Instrumentation', field: 'instruments', placeholder: 'e.g. Piano, Synth Pad' },
                { label: 'Texture', field: 'textures', placeholder: 'e.g. Delicate, Organic' },
                { label: 'Keywords', field: 'human_tags', placeholder: 'Add custom tags...' },
                { label: 'Movement', field: 'movement', placeholder: 'e.g. Building, Flowing' },
              ].map(item => (
                <div key={item.field}>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">
                    {item.label} <span className="lowercase normal-case font-normal">(press Enter to add)</span>
                  </label>
                  <TagInput
                    tags={form[item.field as keyof typeof form] as string[]}
                    onChange={tags => setForm({ ...form, [item.field]: tags })}
                    placeholder={item.placeholder}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-black/10 shadow-sm">
                <h4 className="font-bold mb-4">Add New Version / Stem</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Title</label>
                    <input
                      type="text"
                      value={versionForm.title}
                      onChange={e => setVersionForm({ ...versionForm, title: e.target.value })}
                      className="w-full px-4 py-3 bg-black/5 border border-transparent focus:bg-white focus:border-black/20 rounded-xl outline-none transition-all"
                      placeholder="e.g. Drums Only, Underscore"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Type</label>
                    <CustomSelect
                      value={versionForm.version_type}
                      onChange={(val) => setVersionForm({ ...versionForm, version_type: val as any })}
                      className="!bg-black/5 !border-transparent hover:!border-black/20 focus:!bg-white"
                      options={[
                        { value: 'version', label: 'Alternative Version' },
                        { value: 'stem', label: 'Stem' }
                      ]}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Audio File</label>
                    <label className="flex flex-col items-center justify-center w-full px-4 py-8 bg-black/5 border-2 border-dashed border-black/10 hover:border-black/30 rounded-xl cursor-pointer transition-all group">
                      <div className="flex flex-col items-center justify-center pt-1 pb-2 text-center px-4">
                        <FileAudio className="w-8 h-8 mb-3 text-black/40 group-hover:text-black/60 transition-colors" />
                        <p className="text-sm font-bold text-black/60 group-hover:text-black/80 truncate max-w-[250px]">
                          {versionForm.file ? versionForm.file.name : "Click to select audio file"}
                        </p>
                        {!versionForm.file && <p className="text-[10px] text-black/40 mt-2 uppercase tracking-widest font-bold">WAV, MP3, AIFF</p>}
                      </div>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={e => setVersionForm({ ...versionForm, file: e.target.files?.[0] || null })}
                      />
                    </label>
                  </div>
                </div>
                <button
                  onClick={handleVersionAudioUpload}
                  disabled={isUploadingVersion || !versionForm.file || !versionForm.title}
                  className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wider text-sm rounded-xl shadow-md hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full flex justify-center items-center gap-2"
                >
                  {isUploadingVersion ? 'Uploading...' : <><Upload className="w-4 h-4" /> Upload & Save</>}
                </button>
              </div>

              <div>
                <h4 className="font-bold mb-4">Existing Versions ({versions.length})</h4>
                {isLoadingVersions ? (
                  <div className="text-black/50 text-sm">Loading...</div>
                ) : versions.length === 0 ? (
                  <div className="text-black/40 text-sm p-8 text-center bg-white border border-black/10 rounded-2xl border-dashed">No alternative versions or stems yet.</div>
                ) : (
                  <div className="space-y-3">
                    {versions.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-4 bg-white border border-black/10 rounded-xl shadow-sm">
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {v.file_name}
                            <span className="px-2 py-0.5 bg-black/5 text-black/60 rounded text-[10px] uppercase tracking-wider">{v.track_type}</span>
                          </div>
                          <div className="text-xs text-black/50 mt-1">
                            {v.duration ? `${Math.floor(v.duration / 60)}:${Math.floor(v.duration % 60).toString().padStart(2, '0')}` : 'Unknown duration'}
                          </div>
                        </div>
                        <button 
                          onClick={() => setVersionToDelete(v.id)}
                          className="p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {(activeTab === 'main' || activeTab === 'metadata') && (
          <div className="p-6 bg-white border-t border-black/5 flex justify-end gap-3 shrink-0">
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-black/60 hover:bg-black/5 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMain}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-black text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
        
        {versionToDelete && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-black/10 max-w-sm w-full text-center">
              <h4 className="text-lg font-bold mb-2">Delete Version</h4>
              <p className="text-black/60 text-sm mb-6">Are you sure you want to delete this version? This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setVersionToDelete(null)}
                  className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider text-black/60 hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteVersion(versionToDelete)}
                  className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
