import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useUserPlaylists } from '../context/UserPlaylistsContext';
import toast from 'react-hot-toast';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId?: string; // Optional track to add immediately after creating
  onSuccess?: (playlist: any) => void;
}

export default function CreatePlaylistModal({ isOpen, onClose, trackId, onSuccess }: CreatePlaylistModalProps) {
  const { createPlaylist, addTrackToPlaylist } = useUserPlaylists();
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistTitle && newPlaylistTitle.trim() && !isCreatingPlaylist) {
      setIsCreatingPlaylist(true);
      const toastId = toast.loading('Creating playlist...');
      const pl = await createPlaylist(newPlaylistTitle.trim());
      if (pl) {
        if (trackId) {
          await addTrackToPlaylist(pl.id, trackId);
        }
        toast.success('Playlist created!', { id: toastId });
        setNewPlaylistTitle('');
        setIsCreatingPlaylist(false);
        if (onSuccess) onSuccess(pl);
        else onClose();
      } else {
        toast.error('Failed to create playlist', { id: toastId });
        setIsCreatingPlaylist(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-slide-in-up">
            <div className="p-6 border-b border-black/10 flex justify-between items-center bg-[#fafafa] rounded-t-3xl">
              <h2 className="text-xl font-bold uppercase tracking-tighter">New Playlist</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Playlist Name</label>
                <input 
                  type="text" 
                  required
                  value={newPlaylistTitle}
                  onChange={e => setNewPlaylistTitle(e.target.value)}
                  placeholder="E.g., Late Night Vibes"
                  className="w-full border border-black/20 rounded-xl px-4 py-3 focus:outline-none focus:border-black transition-colors"
                  autoFocus
                />
              </div>
              <div className="pt-4 mt-2 border-t border-black/10 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!newPlaylistTitle.trim() || isCreatingPlaylist} className="px-6 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
                  {isCreatingPlaylist ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
