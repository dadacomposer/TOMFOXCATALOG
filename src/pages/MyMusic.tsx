import React, { useState } from 'react';
import { useUserPlaylists } from '../context/UserPlaylistsContext';
import { Heart, ListMusic, Plus, Share2, Trash2, X, Loader2 } from 'lucide-react';
import PlaylistIsland from '../components/PlaylistIsland';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function MyMusic() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { playlists, favoritesPlaylist, refreshPlaylists, isLoading, createPlaylist } = useUserPlaylists();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);
  
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);
  
  const customPlaylists = playlists.filter(p => !p.is_favorites);
  
  const handleShare = async (e: React.MouseEvent, pl: any) => {
    e.stopPropagation();
    const toastId = toast.loading('Generating share link...');
    try {
      const { data: ptData, error: ptError } = await supabase
        .from('playlist_tracks')
        .select('track_id')
        .eq('playlist_id', pl.id);
        
      if (ptError) throw ptError;
      const trackIds = ptData.map(pt => pt.track_id);
      
      if (trackIds.length === 0) {
        toast.error("Can't share an empty playlist", { id: toastId });
        return;
      }

      const slug = crypto.randomUUID();
      const { error } = await supabase.from('shared_links').insert([{
        track_ids: trackIds,
        can_download: false,
        slug,
        notes: `Shared Playlist: ${pl.title}`
      }]);
      
      if (error) throw error;
      
      const url = `${window.location.origin}/share/${slug}`;
      navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate share link', { id: toastId });
    }
  };

  const confirmDelete = async () => {
    if (playlistToDelete) {
      try {
        await supabase.from('playlists').delete().eq('id', playlistToDelete);
        await refreshPlaylists();
        toast.success('Playlist deleted');
      } catch (e) {
        toast.error('Failed to delete playlist');
      } finally {
        setShowDeleteModal(false);
        setPlaylistToDelete(null);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent, plId: string) => {
    e.stopPropagation();
    setPlaylistToDelete(plId);
    setShowDeleteModal(true);
  };

  const handleSeek = () => {}; // Used for PlaylistIsland when previewing, but PlaylistIsland handles internal seek via context for the most part.
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (authLoading || !user) {
    return <div className="min-h-screen pt-32 bg-[#fafafa] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="relative flex flex-col w-full min-h-screen pt-32 md:pt-40 bg-[#fafafa] text-black overflow-hidden">
      <AnimatePresence>
        {selectedPlaylistId && (
          <PlaylistIsland 
            id={selectedPlaylistId}
            onClose={() => setSelectedPlaylistId(null)}
            progress={0}
            handleSeek={handleSeek}
            formatTime={formatTime}
            trendingTrackIds={new Set()}
            isOwner={true}
            initialTrackCount={customPlaylists.find(p => p.id === selectedPlaylistId)?.track_count || 0}
          />
        )}
      </AnimatePresence>

      {/* Removed My Music title section as requested */}

      {isLoading ? (
        <div className="w-full pl-8 md:pl-12 lg:pl-24 pb-24">Loading...</div>
      ) : (
        <div className="w-full pl-8 md:pl-12 lg:pl-24 pb-24 flex flex-col gap-16">
          
          {/* Favorites Section */}
          <div className="w-full pr-8 md:pr-12 lg:pr-24">
            {favoritesPlaylist ? (
              <PlaylistIsland 
                id={favoritesPlaylist.id}
                onClose={() => {}}
                progress={0}
                handleSeek={handleSeek}
                formatTime={formatTime}
                trendingTrackIds={new Set()}
                isOwner={true}
                inline={true}
                initialTrackCount={1} // Favourites usually has tracks if this is true, but we could use favoritesPlaylist.tracks?.length if available, but 1 is safe to force loader since we don't have track_count here easily
              />
            ) : (
              <div className="w-full flex flex-col items-center justify-center p-12 rounded-3xl">
                <Heart className="w-12 h-12 text-black/20 mb-4" />
                <h3 className="font-bold text-xl uppercase tracking-tighter text-black/40 mb-2">No Favorites Yet</h3>
                <p className="font-sans text-xs text-black/40">Click the heart icon on any track to add it here.</p>
              </div>
            )}
          </div>

          {/* My Playlists Section */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-6 pr-8 md:pr-12 lg:pr-24">
              <h2 className="text-2xl md:text-3xl font-semibold uppercase tracking-tighter text-black">My Playlists</h2>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-black/80 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Playlist
              </button>
            </div>
            
            {customPlaylists.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center py-12 pr-8 md:pr-12 lg:pr-24">
                <div className="flex flex-col items-center justify-center gap-6 text-black/40 w-full max-w-2xl">
                  <img src="/search-for-documents.svg" alt="No playlists" className="w-80 h-80" />
                  <span className="font-bold uppercase tracking-widest text-sm text-center">You haven't created any custom playlists yet.<br/>Create one to organize your favorite tracks.</span>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-black/80 transition-colors flex items-center gap-2 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Playlist
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 pr-8 md:pr-12 lg:pr-24 mt-6">
                {customPlaylists.map(pl => (
                  <div 
                    key={pl.id}
                    className="flex flex-col bg-transparent hover:bg-[#f6f6f6] p-4 rounded-[32px] group cursor-pointer transition-all border border-transparent hover:border-black/5 relative"
                    onClick={() => setSelectedPlaylistId(pl.id)}
                  >
                    <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={(e) => handleShare(e, pl)} className="p-2 bg-white rounded-full shadow hover:bg-black hover:text-white transition-colors" title="Share">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => handleDelete(e, pl.id)} className="p-2 bg-white rounded-full shadow hover:bg-red-500 hover:text-white transition-colors text-red-500" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="relative w-full aspect-square mb-4 rounded-[20px] bg-black/5 overflow-hidden flex items-center justify-center">
                      {pl.cover_url ? (
                        <img src={pl.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <ListMusic className="w-10 h-10 text-black/20 group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                    <div className="flex flex-col px-2 pb-2">
                      <h3 className="font-bold text-[18px] uppercase tracking-tighter text-black truncate mb-1">
                        {pl.title}
                      </h3>
                      <div className="font-sans text-[11px] uppercase tracking-widest text-black/50 line-clamp-2 leading-relaxed">
                        {pl.track_count || 0} tracks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(pl) => {
          setShowCreateModal(false);
          // Optional: immediately select the newly created playlist
          // setSelectedPlaylistId(pl.id);
        }}
      />

      {/* Delete Playlist Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-black/10 flex justify-between items-center bg-[#fafafa] rounded-t-3xl">
                <h2 className="text-xl font-bold uppercase tracking-tighter text-red-600">Delete Playlist</h2>
                <button onClick={() => setShowDeleteModal(false)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-black/70">Are you sure you want to permanently delete this playlist? This action cannot be undone.</p>
                <div className="pt-4 mt-2 border-t border-black/10 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowDeleteModal(false)} className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/5 transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmDelete} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
