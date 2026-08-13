import React, { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import { useUserPlaylists } from '../context/UserPlaylistsContext';
import { useAuth } from '../context/AuthContext';
import AddToPlaylistModal from './AddToPlaylistModal';

type TrackActionButtonsProps = {
  trackId: string;
  hideHeart?: boolean;
};

export default function TrackActionButtons({ trackId, hideHeart }: TrackActionButtonsProps) {
  const { user, setLoginModalOpen } = useAuth();
  const { favoriteTrackIds, toggleFavorite, playlists } = useUserPlaylists();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const isFavorite = favoriteTrackIds.has(trackId);

  const handleHeartClick = async (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) return;
    e.stopPropagation();
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    await toggleFavorite(trackId);
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) return;
    e.stopPropagation();
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    setIsAddModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-4 transition-opacity">
        {!hideHeart && (
          <button 
            onClick={handleHeartClick}
            className="p-1.5 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center text-black/40 hover:text-red-500"
            title={isFavorite ? "Remove from Favourites" : "Add to Favourites"}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        )}
        <button 
          onClick={handlePlusClick}
          className="p-1.5 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center text-black/40 hover:text-black"
          title="Add to Playlist"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <AddToPlaylistModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        trackId={trackId} 
      />
    </>
  );
}
