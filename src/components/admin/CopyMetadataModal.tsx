import React, { useState } from 'react';
import { X, Copy, CheckCircle2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import toast from 'react-hot-toast';
import { AdminTrack } from './AdminTracks';

type CopyMetadataModalProps = {
  sourceTrack: AdminTrack;
  targetTrackIds: string[];
  allTracks: AdminTrack[];
  onClose: () => void;
  onComplete: (updatedFields: any) => void;
};

export default function CopyMetadataModal({ sourceTrack, targetTrackIds, allTracks, onClose, onComplete }: CopyMetadataModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['artwork_url', 'composers', 'subgenre', 'moods', 'scenarios', 'instruments', 'textures', 'human_tags']));
  const [searchQuery, setSearchQuery] = useState('');
  useLockBodyScroll(true);
  
  // If no targets were pre-selected, allow manual selection
  const [manualTargets, setManualTargets] = useState<Set<string>>(new Set(targetTrackIds));
  
  const fieldsToCopy = [
    { id: 'artwork_url', label: 'Artwork' },
    { id: 'composers', label: 'Composers' },
    { id: 'album', label: 'Album' },
    { id: 'key', label: 'Key' },
    { id: 'energy_level', label: 'Tempo' },
    { id: 'subgenre', label: 'Arrangement' },
    { id: 'moods', label: 'Moods' },
    { id: 'scenarios', label: 'Music For' },
    { id: 'instruments', label: 'Instruments' },
    { id: 'textures', label: 'Function' },
    { id: 'human_tags', label: 'Character' },
    { id: 'movement', label: 'Movement' },
  ];

  const toggleField = (fieldId: string) => {
    const newSet = new Set(selectedFields);
    if (newSet.has(fieldId)) newSet.delete(fieldId);
    else newSet.add(fieldId);
    setSelectedFields(newSet);
  };

  const handleCopy = async () => {
    if (manualTargets.size === 0) {
      toast.error('Select at least one target track');
      return;
    }
    if (selectedFields.size === 0) {
      toast.error('Select at least one field to copy');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {};
      selectedFields.forEach(field => {
        updateData[field] = sourceTrack[field as keyof AdminTrack];
      });

      const targetIdsArray = Array.from(manualTargets);
      
      const { error } = await supabase
        .from('tracks')
        .update(updateData)
        .in('id', targetIdsArray);
        
      if (error) throw error;
      
      toast.success(`Metadata copied to ${targetIdsArray.length} tracks`);
      onComplete({ targetIds: targetIdsArray, updateData });
    } catch (error: any) {
      toast.error(error.message || 'Error copying metadata');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTarget = (id: string) => {
    const newSet = new Set(manualTargets);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setManualTargets(newSet);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl border border-black/10 animate-slide-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <Copy className="w-5 h-5 text-black/50" />
            Copy Metadata
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full text-black/50 hover:text-black transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="mb-6 p-4 bg-black/5 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0">
              <img src={sourceTrack.artwork_url || ''} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-black/50 mb-1">Source Track</div>
              <div className="font-bold">{sourceTrack.file_name}</div>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xs font-bold uppercase tracking-widest text-black/50 mb-4">Fields to copy</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fieldsToCopy.map(field => (
                <label key={field.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${selectedFields.has(field.id) ? 'border-black bg-black/5' : 'border-black/10 hover:border-black/30'}`}>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer"
                    checked={selectedFields.has(field.id)}
                    onChange={() => toggleField(field.id)}
                  />
                  <span className="text-sm font-medium">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-black/50">Target Tracks ({manualTargets.size} selected)</h4>
              {manualTargets.size === 0 && targetTrackIds.length === 0 && (
                <span className="text-xs font-bold text-red-500">Please select targets below</span>
              )}
            </div>
            <div className="relative mb-3 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-10 bg-black/5 border border-transparent rounded-lg focus:outline-none focus:border-black/20 focus:bg-white transition-colors text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black rounded-full hover:bg-black/5">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="border border-black/10 rounded-xl h-60 overflow-y-auto divide-y divide-black/5 bg-white">
              {allTracks.filter(t => t.id !== sourceTrack.id && t.track_type === 'main' && !t.deleted_at && t.file_name.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
                <label key={t.id} className="flex items-center gap-3 p-3 hover:bg-black/5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer"
                    checked={manualTargets.has(t.id)}
                    onChange={() => toggleTarget(t.id)}
                  />
                  <span className="text-sm font-medium truncate">{t.file_name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-black/5 flex justify-end gap-3 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-black/60 hover:bg-black/5 hover:text-black transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={isSubmitting || manualTargets.size === 0 || selectedFields.size === 0}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-black text-white hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? 'Copying...' : 'Copy Metadata'}
          </button>
        </div>
      </div>
    </div>
  );
}
