import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, CheckCircle2, ListMusic, Loader2 } from 'lucide-react';
import { useUserPlaylists } from '../context/UserPlaylistsContext';
import { useNavigate } from 'react-router-dom';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
};

export default function AddToPlaylistModal({ isOpen, onClose, trackId }: Props) {
  const { playlists, createPlaylist, addTrackToPlaylist } = useUserPlaylists();
  const navigate = useNavigate();
  
  const customPlaylists = playlists.filter(p => !p.is_favorites);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  const handleClose = () => {
    setIsCreating(false);
    setNewTitle('');
    onClose();
  };

  if (!isOpen) return null;

  // Auto-switch to create mode if no custom playlists exist
  const showCreateMode = isCreating || customPlaylists.length === 0;

  const handleCreate = async () => {
    if (!newTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const pl = await createPlaylist(newTitle, trackId);
    if (pl) {
      handleClose();
    }
    setIsSubmitting(false);
  };

  const handleAdd = async (playlistId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const ok = await addTrackToPlaylist(playlistId, trackId);
    if (ok) {
      handleClose();
    }
    setIsSubmitting(false);
  };

  const content = (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
      <div className="bg-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl relative animate-slide-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="text-2xl font-bold uppercase tracking-tighter">Add to Playlist</h2>
          <button onClick={handleClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-black/50" />
          </button>
        </div>
        
        <div className="p-6">
          {showCreateMode ? (
            <div className="flex flex-col gap-6">
              {customPlaylists.length === 0 && !isCreating && (
                <div className="text-center text-black/50 font-sans text-sm">
                  You don't have any playlists yet. Let's create one.
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-black/50">Playlist Name</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="E.g. Summer Vibes, Focus..."
                  className="w-full p-4 bg-[#f6f6f6] rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-black/5"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                />
              </div>
              <div className="flex items-center gap-3 mt-2">
                {customPlaylists.length > 0 && (
                  <button onClick={() => setIsCreating(false)} className="flex-1 py-4 font-bold text-black/50 hover:text-black uppercase text-[11px] tracking-widest">
                    Cancel
                  </button>
                )}
                <button 
                  onClick={handleCreate} 
                  disabled={!newTitle.trim() || isSubmitting}
                  className="flex-1 py-4 bg-black text-white rounded-full font-bold uppercase text-[11px] tracking-widest hover:bg-black/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & Add'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-4 w-full p-4 mb-4 bg-[#f6f6f6] hover:bg-[#eaeaea] transition-colors rounded-xl group"
              >
                <div className="w-12 h-12 bg-black/5 rounded-lg flex items-center justify-center shrink-0">
                  <Plus className="w-6 h-6 text-black/50 group-hover:text-black transition-colors" />
                </div>
                <div className="font-bold text-left uppercase tracking-tighter text-lg">Create New Playlist</div>
              </button>
              
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                {customPlaylists.map(pl => (
                  <button 
                    key={pl.id}
                    onClick={() => handleAdd(pl.id)}
                    className="flex items-center gap-4 w-full p-3 hover:bg-[#f6f6f6] transition-colors rounded-xl group text-left"
                  >
                    <div className="w-12 h-12 bg-black/5 rounded-lg shrink-0 overflow-hidden relative">
                      {pl.cover_url ? (
                        <img src={pl.cover_url} className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/30" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="font-bold uppercase tracking-tighter text-lg group-hover:text-black text-black/80 truncate">
                        {pl.title}
                      </div>
                      <div className="font-sans text-[10px] text-black/50 uppercase tracking-widest">
                        {pl.track_count} tracks
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
