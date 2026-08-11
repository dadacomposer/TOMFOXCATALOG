import React, { useState } from 'react';
import { Heart, Layers } from 'lucide-react';
import { UserPlaylist, useUserPlaylists } from '../context/UserPlaylistsContext';

interface SidebarPlaylistProps {
  playlist: UserPlaylist;
  isFavorites?: boolean;
  isActive: boolean;
  onClick: () => void;
  dragTarget: string | null;
  setDragTarget: (target: string | null) => void;
}

export default function SidebarPlaylist({
  playlist,
  isFavorites,
  isActive,
  onClick,
  dragTarget,
  setDragTarget
}: SidebarPlaylistProps) {
  const { addTracksToPlaylist } = useUserPlaylists();

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragTarget(null);
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const payload = JSON.parse(data);
        if (payload.type === 'tracks') {
          await addTracksToPlaylist(playlist.id, payload.ids);
        }
      } catch (err) {}
    }
  };

  const targetId = isFavorites ? 'favorites' : `playlist-${playlist.id}`;
  const isDraggingOver = dragTarget === targetId;

  return (
    <div 
      className="flex flex-col mb-1 w-full shrink-0"
      onDragOver={(e) => { e.preventDefault(); setDragTarget(targetId); }}
      onDragLeave={() => setDragTarget(null)}
      onDrop={handleDrop}
    >
      <div
        className={`w-full text-left px-3 py-2 shrink-0 rounded-lg text-[11px] font-medium uppercase tracking-widest flex items-center justify-between transition-colors border-2 cursor-pointer ${
          isDraggingOver
            ? isFavorites ? 'border-red-500 bg-red-50 text-red-600' : 'border-black bg-black/5 text-black'
            : isActive ? 'border-transparent text-black bg-black/5' : 'border-transparent text-black/60 hover:bg-black/5 hover:text-black'
        }`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {isFavorites ? (
            <Heart className={`w-3.5 h-3.5 ${isDraggingOver || isActive ? 'fill-red-500 text-red-500' : ''}`} />
          ) : (
            <Layers className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">{playlist.title === 'Favourites' ? 'Favorites' : playlist.title}</span>
        </div>
        <span className="text-[9px] text-black/40 shrink-0">{playlist.track_count}</span>
      </div>
    </div>
  );
}
