import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Edit3, Trash2, CheckSquare, Square, Play, Pause, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlayer } from '../../context/PlayerContext';
import { toast } from 'react-hot-toast';
import TrackEditModal from './TrackEditModal';
import TrackArtwork from '../TrackArtwork';
import ImportTagsModal from './ImportTagsModal';
import { Upload } from 'lucide-react';

type AdminTrack = {
  id: string;
  file_name: string;
  subgenre: string;
  moods: string;
  scenarios: string;
  instruments: string;
  textures: string | string[];
  human_tags: string | string[];
  movement?: string | string[];
  genre: string;
  humanly_reviewed: boolean;
  pro_registered: boolean;
  frequency_audio_registered: boolean;
  deleted_at: string | null;
  track_type: string;
  parent_track_id: string | null;
  r2_url: string;
};

export default function AdminTags() {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [allFetchedTracks, setAllFetchedTracks] = useState<AdminTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Filters
  const [reviewedFilter, setReviewedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  
  const [visibleCount, setVisibleCount] = useState(50);
  
  const [editingTagsTrack, setEditingTagsTrack] = useState<AdminTrack | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{title?: string, message: string, onConfirm: () => void} | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 50);
      }
    }, { rootMargin: '400px' });
    if (node) observer.current.observe(node);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('tracks')
        .select('id, file_name, is_hidden, deleted_at, created_at, release_date, subgenre, moods, scenarios, instruments, textures, human_tags, movement, artwork_url, r2_url, wav_url, aiff_url, watermarked_url, play_count, waveform_data, has_wav, has_aiff, has_watermarked, has_mp3, composers, track_type, parent_track_id, key, scale, duration, genre, energy_level, description, humanly_reviewed, pro_registered, frequency_audio_registered')
        .is('deleted_at', null)
        .eq('track_type', 'main');

      let allTracks: AdminTrack[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data, error } = await query
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allTracks = [...allTracks, ...data];
          page++;
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      setAllFetchedTracks(allTracks);
      setTracks(allTracks);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    let filtered = allFetchedTracks;
    
    if (reviewedFilter === 'yes') filtered = filtered.filter(t => t.humanly_reviewed);
    if (reviewedFilter === 'no') filtered = filtered.filter(t => !t.humanly_reviewed);

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const fileName = t.file_name?.toLowerCase() || '';
        if (fileName.includes(q)) return true;
        
        const parse = (val: any) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          try { return JSON.parse(val); } catch { return []; }
        };

        const genreTags = t.genre ? (() => {
          try { return JSON.parse(t.genre); } catch(e) { return [t.genre]; }
        })() : [];

        const tags = [
          ...genreTags,
          ...parse(t.subgenre),
          ...parse(t.moods),
          ...parse(t.scenarios),
          ...parse(t.instruments),
          ...parse(t.textures),
          ...parse(t.human_tags),
          ...parse(t.movement)
        ].map(tag => typeof tag === 'string' ? tag.toLowerCase() : '');

        if (tags.some(tag => tag.includes(q))) return true;
        
        return false;
      });
    }

    setTracks(filtered);
    setVisibleCount(50);
  }, [debouncedQuery, allFetchedTracks, reviewedFilter]);

  const toggleBoolean = async (trackId: string, field: 'humanly_reviewed' | 'pro_registered' | 'frequency_audio_registered', currentValue: boolean) => {
    try {
      const newValue = !currentValue;
      setAllFetchedTracks(prev => prev.map(t => t.id === trackId ? { ...t, [field]: newValue } : t));
      const { error } = await supabase.from('tracks').update({ [field]: newValue }).eq('id', trackId);
      if (error) throw error;
      toast.success(`${field} updated`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to update ${field}`);
      // Revert on error
      setAllFetchedTracks(prev => prev.map(t => t.id === trackId ? { ...t, [field]: currentValue } : t));
    }
  };

  const handleDeleteTrack = async (id: string) => {
    setConfirmModal({
      title: 'Delete Track',
      message: 'Are you sure you want to delete this track? This will move it to trash.',
      onConfirm: async () => {
        try {
          const now = new Date().toISOString();
          setAllFetchedTracks(prev => prev.filter(t => t.id !== id));
          const { error } = await supabase.from('tracks').update({ deleted_at: now }).eq('id', id);
          if (error) throw error;
          toast.success('Track deleted');
        } catch (e) {
          console.error(e);
          toast.error('Failed to delete track');
          fetchTracks();
        }
      }
    });
  };

  const parseTags = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return []; }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between shrink-0 px-2 mt-2">
        <h2 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-3">
          Tags Management
          <span className="text-xs font-medium bg-black/5 px-2 py-1 rounded-full text-black/50">
            {tracks.length} Tracks
          </span>
        </h2>
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-black/5 flex flex-col flex-grow min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-black/5 flex flex-col md:flex-row md:items-center gap-4 bg-black/[0.02]">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks or tags..."
              className="w-full bg-white border border-black/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-black/10 outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black transition-colors rounded-full hover:bg-black/5">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="relative flex items-center gap-2 px-4 bg-white border border-black/10 rounded-xl shadow-sm shrink-0 h-12" ref={filterDropdownRef}>
            <span className="text-[10px] font-bold tracking-widest uppercase text-black/40">Reviewed</span>
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-black outline-none cursor-pointer"
            >
              {reviewedFilter === 'all' ? 'All Tracks' : reviewedFilter === 'yes' ? 'Reviewed' : 'Not Reviewed'}
              <svg className={`w-3 h-3 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {isFilterDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                {[
                  { id: 'all', label: 'All Tracks' },
                  { id: 'yes', label: 'Reviewed' },
                  { id: 'no', label: 'Not Reviewed' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setReviewedFilter(opt.id as any); setIsFilterDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${reviewedFilter === opt.id ? 'bg-black/5 text-black' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
                  >
                    <div className="flex items-center gap-2">
                      {reviewedFilter === opt.id ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <div className="w-3 h-3" />}
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 bg-black text-white rounded-xl shadow-sm shrink-0 h-12 hover:bg-black/80 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-[11px] font-bold tracking-widest uppercase">Import CSV</span>
          </button>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-black/5 bg-[#fafafa] font-bold text-[10px] uppercase tracking-widest text-black/40 sticky top-0 z-10 shrink-0">
          <div className="col-span-3">Track Info</div>
          <div className="col-span-5">Tags (Click to Edit)</div>
          <div className="col-span-1 text-center" title="Humanly Reviewed">Rev</div>
          <div className="col-span-1 text-center" title="PRO Registered">PRO</div>
          <div className="col-span-1 text-center" title="Frequency Audio Registered">Freq</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-black/40">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="font-medium text-sm">Loading tracks...</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-black/40">
              <p className="font-medium text-sm">No tracks found.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {tracks.slice(0, visibleCount).map((track, index) => {
                const isTrackPlaying = isPlaying && currentTrack?.id === track.id;
                const allTags = [
                  ...parseTags(track.subgenre),
                  ...parseTags(track.moods),
                  ...parseTags(track.scenarios),
                  ...parseTags(track.instruments),
                  ...parseTags(track.textures),
                  ...parseTags(track.human_tags)
                ];

                return (
                  <div 
                    key={track.id}
                    ref={index === visibleCount - 1 ? lastElementRef : null}
                    className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-black/5 items-center hover:bg-black/[0.02] transition-colors group"
                  >
                    <div className="col-span-3 flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center shrink-0 overflow-hidden relative group/play cursor-pointer" onClick={() => isTrackPlaying ? togglePlay() : playTrack(track as any, tracks as any[])}>
                        <TrackArtwork track={track as any} className="w-full h-full object-cover" />
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover/play:opacity-100'}`}>
                          {isTrackPlaying ? (
                            <Pause className="w-4 h-4 fill-white text-white" />
                          ) : (
                            <Play className="w-4 h-4 fill-white text-white translate-x-[1px]" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate" title={track.file_name}>{track.file_name.replace(/\.[^/.]+$/, '')}</div>
                        <div className="text-[10px] uppercase tracking-wider text-black/50 truncate mt-0.5">
                          {(() => {
                            if (!track.genre) return 'Uncategorized';
                            try { return JSON.parse(track.genre).join(', '); } catch(e) { return track.genre; }
                          })()}
                        </div>
                      </div>
                    </div>

                    <div 
                      className="col-span-5 flex flex-wrap gap-1.5 cursor-pointer p-2 -ml-2 rounded-xl hover:bg-black/5 transition-colors"
                      onClick={() => setEditingTagsTrack(track)}
                      title="Click to edit tags"
                    >
                      {allTags.length > 0 ? (
                         allTags.slice(0, 10).map((t, i) => (
                           <span key={i} className="px-2 py-0.5 bg-black/5 text-black rounded-lg text-xs whitespace-nowrap">
                             {t}
                           </span>
                         ))
                      ) : (
                         <span className="text-xs text-black/30 italic">No tags</span>
                      )}
                      {allTags.length > 10 && (
                        <span className="px-2 py-0.5 bg-black/5 text-black/50 rounded-lg text-xs whitespace-nowrap">
                          +{allTags.length - 10}
                        </span>
                      )}
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => toggleBoolean(track.id, 'humanly_reviewed', track.humanly_reviewed)} className={`p-2 rounded-lg transition-colors ${track.humanly_reviewed ? 'text-green-500 hover:bg-green-50' : 'text-black/20 hover:text-black/60 hover:bg-black/5'}`}>
                        {track.humanly_reviewed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => toggleBoolean(track.id, 'pro_registered', track.pro_registered)} className={`p-2 rounded-lg transition-colors ${track.pro_registered ? 'text-blue-500 hover:bg-blue-50' : 'text-black/20 hover:text-black/60 hover:bg-black/5'}`}>
                        {track.pro_registered ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => toggleBoolean(track.id, 'frequency_audio_registered', track.frequency_audio_registered)} className={`p-2 rounded-lg transition-colors ${track.frequency_audio_registered ? 'text-purple-500 hover:bg-purple-50' : 'text-black/20 hover:text-black/60 hover:bg-black/5'}`}>
                        {track.frequency_audio_registered ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingTagsTrack(track)}
                        className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-colors"
                        title="Edit Tags"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTrack(track.id)}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Track"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingTagsTrack && (
        <TrackEditModal
          track={editingTagsTrack as any}
          onClose={() => setEditingTagsTrack(null)}
          onSave={(updatedData) => {
             setAllFetchedTracks(prev => prev.map(t => t.id === editingTagsTrack.id ? { ...t, ...updatedData } : t));
             setEditingTagsTrack(null);
          }}
        />
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">{confirmModal.title || 'Confirm Action'}</h3>
            </div>
            <p className="text-sm text-black/60 mb-6">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-bold text-black/60 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <ImportTagsModal 
          onClose={() => setIsImportModalOpen(false)}
          existingTracks={allFetchedTracks}
          onSuccess={() => {
            setIsImportModalOpen(false);
            fetchTracks();
          }}
        />
      )}

    </div>
  );
}
