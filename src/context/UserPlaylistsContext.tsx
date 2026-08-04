import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

export type UserPlaylist = {
  id: string;
  title: string;
  track_count: number;
  cover_url?: string;
  is_favorites: boolean;
};

type UserPlaylistsContextType = {
  playlists: UserPlaylist[];
  favoritesPlaylist: UserPlaylist | null;
  favoriteTrackIds: Set<string>;
  toggleFavorite: (trackId: string) => Promise<void>;
  createPlaylist: (title: string, trackId?: string) => Promise<UserPlaylist | null>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
  refreshPlaylists: () => Promise<void>;
  isLoading: boolean;
};

const UserPlaylistsContext = createContext<UserPlaylistsContextType | undefined>(undefined);

export function UserPlaylistsProvider({ children }: { children: React.ReactNode }) {
  const { user, activeWorkspace } = useAuth();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [favoritesPlaylist, setFavoritesPlaylist] = useState<UserPlaylist | null>(null);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserPlaylists = async () => {
    if (!user || !activeWorkspace) {
      setPlaylists([]);
      setFavoritesPlaylist(null);
      setFavoriteTrackIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userPls = data as UserPlaylist[];
      setPlaylists(userPls);

      const fav = userPls.find(p => p.is_favorites);
      setFavoritesPlaylist(fav || null);

      if (fav) {
        const { data: trackData, error: trackError } = await supabase
          .from('playlist_tracks')
          .select('track_id')
          .eq('playlist_id', fav.id);
          
        if (!trackError && trackData) {
          setFavoriteTrackIds(new Set(trackData.map(t => t.track_id)));
        }
      } else {
        setFavoriteTrackIds(new Set());
      }
    } catch (e) {
      console.error('Error fetching user playlists:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPlaylists();
  }, [user, activeWorkspace]);

  const ensureFavoritesPlaylist = async (): Promise<UserPlaylist | null> => {
    if (favoritesPlaylist) return favoritesPlaylist;
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert([{
          user_id: user.id,
          workspace_id: activeWorkspace.id,
          title: 'Favourites',
          is_favorites: true,
          track_count: 0
        }])
        .select()
        .single();
      
      if (error) throw error;
      setFavoritesPlaylist(data);
      setPlaylists(prev => [data, ...prev]);
      return data;
    } catch (e) {
      console.error('Failed to create favorites playlist', e);
      return null;
    }
  };

  const toggleFavorite = async (trackId: string) => {
    if (!user) return;
    const favPl = await ensureFavoritesPlaylist();
    if (!favPl) return;

    const isFav = favoriteTrackIds.has(trackId);
    
    if (isFav) {
      // Remove
      setFavoriteTrackIds(prev => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
      
      try {
        await supabase.from('playlist_tracks').delete().match({ playlist_id: favPl.id, track_id: trackId });
        await supabase.from('playlists').update({ track_count: Math.max(0, favPl.track_count - 1) }).eq('id', favPl.id);
        fetchUserPlaylists(); // Sync count
      } catch (e) {
        console.error('Failed to remove favorite', e);
        // Revert UI
        setFavoriteTrackIds(prev => {
          const next = new Set(prev);
          next.add(trackId);
          return next;
        });
      }
    } else {
      // Add
      setFavoriteTrackIds(prev => {
        const next = new Set(prev);
        next.add(trackId);
        return next;
      });
      
      try {
        const position = favoriteTrackIds.size;
        await supabase.from('playlist_tracks').insert([{ playlist_id: favPl.id, track_id: trackId, position }]);
        await supabase.from('playlists').update({ track_count: favPl.track_count + 1 }).eq('id', favPl.id);
        fetchUserPlaylists(); // Sync count
      } catch (e) {
        console.error('Failed to add favorite', e);
        // Revert UI
        setFavoriteTrackIds(prev => {
          const next = new Set(prev);
          next.delete(trackId);
          return next;
        });
      }
    }
  };

  const createPlaylist = async (title: string, trackId?: string) => {
    if (!user || !activeWorkspace) return null;
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert([{
          user_id: user.id,
          workspace_id: activeWorkspace.id,
          title: title,
          is_favorites: false,
          track_count: trackId ? 1 : 0
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      if (trackId) {
        await supabase.from('playlist_tracks').insert([{ playlist_id: data.id, track_id: trackId, position: 0 }]);
      }
      
      await fetchUserPlaylists();
      return data;
    } catch (e) {
      console.error('Failed to create playlist', e);
      return null;
    }
  };

  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    if (!user) return false;
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return false;
    
    try {
      // Check if already in playlist
      const { data: existing } = await supabase.from('playlist_tracks').select('track_id').match({ playlist_id: playlistId, track_id: trackId }).maybeSingle();
      if (existing) {
        toast.error('Track is already in this playlist');
        return false;
      }
      
      await supabase.from('playlist_tracks').insert([{ playlist_id: playlistId, track_id: trackId, position: pl.track_count }]);
      await supabase.from('playlists').update({ track_count: pl.track_count + 1 }).eq('id', playlistId);
      await fetchUserPlaylists();
      return true;
    } catch (e) {
      console.error('Failed to add track to playlist', e);
      return false;
    }
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    if (!user) return false;
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return false;
    
    try {
      await supabase.from('playlist_tracks').delete().match({ playlist_id: playlistId, track_id: trackId });
      await supabase.from('playlists').update({ track_count: Math.max(0, pl.track_count - 1) }).eq('id', playlistId);
      await fetchUserPlaylists();
      return true;
    } catch (e) {
      console.error('Failed to remove track from playlist', e);
      return false;
    }
  };

  return (
    <UserPlaylistsContext.Provider value={{ 
      playlists, 
      favoritesPlaylist, 
      favoriteTrackIds, 
      toggleFavorite, 
      createPlaylist, 
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      refreshPlaylists: fetchUserPlaylists,
      isLoading 
    }}>
      {children}
    </UserPlaylistsContext.Provider>
  );
}

export function useUserPlaylists() {
  const context = useContext(UserPlaylistsContext);
  if (context === undefined) {
    throw new Error('useUserPlaylists must be used within a UserPlaylistsProvider');
  }
  return context;
}
