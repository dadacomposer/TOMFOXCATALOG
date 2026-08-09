import React, { useState, useEffect } from 'react';
import { Heart, Layers, Play } from 'lucide-react';
import { UserPlaylist, useUserPlaylists } from '../context/UserPlaylistsContext';
import { fetchPlaylistTrackIds, fetchTracksByIds } from '../lib/supabase';
import { usePlayer, Track } from '../context/PlayerContext';

const cleanTitle = (filename: string) => {
  let base = filename.replace(/\.(mp3|wav|aif|aiff)$/i, '');
  base = base.replace(/^\d+[\s_-]*/, '');
  base = base.replace(/^[A-Z0-9]+_/, '');
  base = base.replace(/_(bpm|key|v\d).*$/i, '');
  base = base.replace(/_/g, ' ');
  return base;
};

interface SidebarPlaylistProps {
  playlist: UserPlaylist;
  isFavorites?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  dragTarget: string | null;
  setDragTarget: (target: string | null) => void;
}

export default function SidebarPlaylist({
  playlist,
  isFavorites,
  isExpanded,
  onToggleExpand,
  dragTarget,
  setDragTarget
}: SidebarPlaylistProps) {
  const { addTracksToPlaylist } = useUserPlaylists();
  const { playTrack } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadTracks();
    }
  }, [isExpanded, playlist.track_count]);

  const loadTracks = async () => {
    setIsLoading(true);
    try {
      const ids = await fetchPlaylistTrackIds(playlist.id);
      if (ids.length > 0) {
        const fetchedTracks = await fetchTracksByIds(ids);
        const ordered = ids.map(id => fetchedTracks.find((t: any) => t.id === id)).filter(Boolean) as Track[];
        setTracks(ordered);
      } else {
        setTracks([]);
      }
    } catch (e) {
      console.error('Failed to load playlist tracks', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragTarget(null);
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const payload = JSON.parse(data);
        if (payload.type === 'tracks') {
          await addTracksToPlaylist(playlist.id, payload.ids);
          if (isExpanded) {
            loadTracks();
          }
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
            : isExpanded ? 'border-transparent text-black' : 'border-transparent text-black/60 hover:bg-black/5 hover:text-black'
        }`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {isFavorites ? (
            <Heart className={`w-3.5 h-3.5 ${isDraggingOver || isExpanded ? 'fill-red-500 text-red-500' : ''}`} />
          ) : (
            <Layers className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">{playlist.title === 'Favourites' ? 'Favorites' : playlist.title}</span>
        </div>
        <span className="text-[9px] text-black/40 shrink-0">{playlist.track_count}</span>
      </div>

      {isExpanded && (
        <div className="flex flex-col mt-1 overflow-y-auto hide-scrollbar max-h-[160px]">
          {isLoading && tracks.length === 0 ? (
            <div className="py-3 px-3 text-[9px] uppercase tracking-widest text-black/40 animate-pulse text-center">
              Loading...
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-3 px-3 text-[9px] uppercase tracking-widest text-black/40 text-center">
              Empty
            </div>
          ) : (
            tracks.map((track) => (
              <div 
                key={track.id}
                onClick={() => {
                  playTrack(track, tracks, 'playlist');
                }}
                className="group flex items-center gap-2 px-3 py-1.5 hover:bg-black/5 cursor-pointer transition-colors rounded-lg"
              >
                <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-black/30 group-hover:text-black transition-colors">
                  <Play className="w-2.5 h-2.5 fill-current" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-medium text-black truncate">{track.title || cleanTitle(track.file_name)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
