import React, { useState, useEffect, useRef, useCallback } from 'react';
import TrackEditModal from './TrackEditModal';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Search, EyeOff, Eye, Trash2, Share2, RefreshCw, AlertTriangle, Music, Edit2, X, Save, Link, Upload, UploadCloud, Power, Copy, Play, Pause, FileText, ChevronUp, ChevronDown, Plus, GripVertical, ChevronsUpDown, Download, Layers, ListPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import TrackArtwork from '../TrackArtwork';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DEFAULT_ARTWORK } from '../../config';
import CopyMetadataModal from './CopyMetadataModal';
import AdminUploadModal from './AdminUploadModal';
import TrackFormatsModal from './TrackFormatsModal';


export type AdminTrack = {
  id: string;
  file_name: string;
  is_hidden: boolean;
  deleted_at: string | null;
  created_at?: string;
  release_date?: string;
  subgenre?: string | string[];
  moods?: string | string[];
  scenarios?: string | string[];
  instruments?: string | string[];
  textures?: string | string[];
  human_tags?: string | string[];
  movement?: string | string[];
  artwork_url?: string | null;
  r2_url?: string;
  wav_url?: string;
  aiff_url?: string;
  watermarked_url?: string;
  play_count?: number;
  waveform_data?: number[];
  has_wav?: boolean;
  has_aiff?: boolean;
  has_watermarked?: boolean;
  has_mp3?: boolean;
  composers?: string[];
  versions?: AdminTrack[];
  track_type?: string;
  parent_track_id?: string | null;
  key?: string;
  scale?: string;
  duration?: number;
  genre?: string;
  energy_level?: string;
  description?: string;
};


export default function AdminTracks() {
  const { currentTrack, isPlaying, playTrack, togglePlay, stopPlayback } = usePlayer();
  const [allFetchedTracks, setAllFetchedTracks] = useState<AdminTrack[]>([]);
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [visibleCount, setVisibleCount] = useState(20);
  const [editingTrack, setEditingTrack] = useState<AdminTrack | null>(null);
  const [editForm, setEditForm] = useState({ 
    file_name: '', subgenre: '', moods: '', 
    scenarios: '', instruments: '', textures: '', 
    human_tags: '', artwork_url: '' 
  });
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'none' | 'playlist' | 'share' | 'trash' | 'delete' | 'restore' | 'artwork'>('none');
  const [bulkForm, setBulkForm] = useState({ artwork_url: '', playlist_name: '', playlist_cover: '', can_download: false, shared_with: '', notes: '' });
  const [isLinkManagerOpen, setIsLinkManagerOpen] = useState(false);
  const [sharedLinks, setSharedLinks] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{title?: string, message: string, onConfirm: () => void} | null>(null);
  const confirmAction = ({ title, message, onConfirm }: { title?: string; message: string; onConfirm: () => void }) => {
    setConfirmModal({ title, message, onConfirm });
  };
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [copySourceTrack, setCopySourceTrack] = useState<AdminTrack | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [formatManagerTrack, setFormatManagerTrack] = useState<AdminTrack | null>(null);

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

  // Playlist Manager State
  const [isPlaylistManagerOpen, setIsPlaylistManagerOpen] = useState(false);
  const [allPlaylists, setAllPlaylists] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [isAddingTracks, setIsAddingTracks] = useState(false);
  const [draftPlaylist, setDraftPlaylist] = useState<any>(null);
  const [draftPlaylistTracks, setDraftPlaylistTracks] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [playlistCategories, setPlaylistCategories] = useState<string[]>([
    "Journalism", "Explainer", "Lifestyle", 
    "Drum and Percussion Energy", "Science and Innovation", 
    "Corporate Minimal", "Dramatic Strings", "Global Rhythms", 
    "Epic Trailers", "Dark Forces", "Future Tech", "Human Stories"
  ]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategoriesStr, setEditingCategoriesStr] = useState<string>('');

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('page_content').select('content').eq('page_id', 'playlists').single();
      if (data?.content?.categories && Array.isArray(data.content.categories)) {
        setPlaylistCategories(data.content.categories);
      }
    } catch (e) {
      console.error('Error fetching categories', e);
    }
  };

  const handleSaveCategories = async () => {
    const loadingToast = toast.loading('Saving categories...');
    try {
      const cleaned = editingCategoriesStr.split(',').map(c => c.trim()).filter(Boolean);
      
      const { data } = await supabase.from('page_content').select('*').eq('page_id', 'playlists').single();
      const currentContent = data?.content || {};
      currentContent.categories = cleaned;
      
      const { error } = await supabase.from('page_content').upsert({ page_id: 'playlists', content: currentContent });
      if (error) throw error;
      
      setPlaylistCategories(cleaned);
      setIsCategoryManagerOpen(false);
      toast.success("Categories updated", { id: loadingToast });
    } catch (e) {
      toast.error("Failed to update categories", { id: loadingToast });
    }
  };

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase.from('playlists').select('*').is('user_id', null).order('created_at', { ascending: false });
      if (error) throw error;
      setAllPlaylists(data || []);
    } catch (e) {
      console.error('Error fetching playlists', e);
    }
  };

  const fetchPlaylistTracks = async (playlistId: string) => {
    setIsPlaylistLoading(true);
    try {
      const { data, error } = await supabase
        .from('playlist_tracks')
        .select('*, tracks(*)')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });
      if (error) throw error;
      setPlaylistTracks(data || []);
      setDraftPlaylistTracks(data || []);
    } catch (e) {
      console.error('Error fetching playlist tracks', e);
    } finally {
      setIsPlaylistLoading(false);
    }
  };

  const handlePlaylistSelect = (id: string) => {
    if (hasUnsavedChanges) {
      setConfirmModal({
        message: 'You have unsaved changes. Are you sure you want to discard them and switch playlists?',
        onConfirm: () => {
          setHasUnsavedChanges(false);
          setSelectedPlaylistId(id);
          const p = allPlaylists.find(pl => pl.id === id);
          setDraftPlaylist(p ? { ...p } : null);
          fetchPlaylistTracks(id);
          setConfirmModal(null);
        }
      });
      return;
    }
    setSelectedPlaylistId(id);
    const p = allPlaylists.find(pl => pl.id === id);
    setDraftPlaylist(p ? { ...p } : null);
    fetchPlaylistTracks(id);
  };

  useEffect(() => {
    if (isPlaylistManagerOpen) {
      fetchPlaylists();
      fetchCategories();
    }
  }, [isPlaylistManagerOpen]);

  const handleUpdatePlaylistMetadata = (updates: any) => {
    if (!draftPlaylist) return;
    setDraftPlaylist((prev: any) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedPlaylistId || !draftPlaylist) return;
    
    const loadingToast = toast.loading('Saving changes...');
    try {
      const updates = {
        title: draftPlaylist.title,
        categories: draftPlaylist.categories,
        is_featured: draftPlaylist.is_featured,
        cover_url: draftPlaylist.cover_url,
        track_count: draftPlaylistTracks.length
      };
      
      const { error: metadataError } = await supabase.from('playlists').update(updates).eq('id', selectedPlaylistId);
      if (metadataError) throw metadataError;
      
      const trackUpdates = draftPlaylistTracks.map((pt, idx) => ({
        playlist_id: selectedPlaylistId,
        track_id: pt.track_id,
        position: idx,
        is_hidden: pt.is_hidden
      }));
      
      if (trackUpdates.length > 0) {
        const { error: tracksError } = await supabase.from('playlist_tracks').upsert(trackUpdates);
        if (tracksError) throw tracksError;
      }
      
      const originalTrackIds = playlistTracks.map(t => t.track_id);
      const draftTrackIds = draftPlaylistTracks.map(t => t.track_id);
      const deletedTrackIds = originalTrackIds.filter(id => !draftTrackIds.includes(id));
      
      if (deletedTrackIds.length > 0) {
        const { error: deleteError } = await supabase.from('playlist_tracks')
          .delete()
          .eq('playlist_id', selectedPlaylistId)
          .in('track_id', deletedTrackIds);
        if (deleteError) throw deleteError;
      }

      toast.success('Changes saved and published to public view!', { id: loadingToast, icon: '🚀' });
      setHasUnsavedChanges(false);
      
      await fetchPlaylists();
      await fetchPlaylistTracks(selectedPlaylistId);
      
    } catch (e) {
      toast.error('Failed to save changes', { id: loadingToast });
    }
  };

  const handleClosePlaylistManager = () => {
    if (hasUnsavedChanges) {
      setConfirmModal({
        message: 'You have unsaved changes. Are you sure you want to discard them and close?',
        onConfirm: () => {
          setHasUnsavedChanges(false);
          setIsPlaylistManagerOpen(false);
          setConfirmModal(null);
        }
      });
    } else {
      setIsPlaylistManagerOpen(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', id);
      if (error) throw error;
      setAllPlaylists(prev => prev.filter(p => p.id !== id));
      setSelectedPlaylistId(null);
      toast.success('Playlist deleted');
    } catch (e) {
      toast.error('Failed to delete playlist');
    }
  };

  const handlePlaylistTrackMove = (currentIndex: number, direction: 'up' | 'down') => {
    if (!selectedPlaylistId || draftPlaylistTracks.length < 2) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= draftPlaylistTracks.length) return;

    const newTracks = [...draftPlaylistTracks];
    const temp = newTracks[currentIndex];
    newTracks[currentIndex] = newTracks[newIndex];
    newTracks[newIndex] = temp;
    
    setDraftPlaylistTracks(newTracks);
    setHasUnsavedChanges(true);
  };

  const handlePlaylistTrackDragEnd = (result: DropResult) => {
    if (!result.destination || !selectedPlaylistId) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newTracks = Array.from(draftPlaylistTracks);
    const [reorderedItem] = newTracks.splice(sourceIndex, 1);
    newTracks.splice(destinationIndex, 0, reorderedItem);

    setDraftPlaylistTracks(newTracks);
    setHasUnsavedChanges(true);
  };

  const handlePlaylistTrackToggleHide = (playlistId: string, trackId: string, currentHidden: boolean) => {
    setDraftPlaylistTracks(prev => prev.map(pt => pt.track_id === trackId ? { ...pt, is_hidden: !currentHidden } : pt));
    setHasUnsavedChanges(true);
  };

  const handlePlaylistTrackRemove = (playlistId: string, trackId: string) => {
    setDraftPlaylistTracks(prev => prev.filter(pt => pt.track_id !== trackId));
    setHasUnsavedChanges(true);
  };

  const handleAddTrackToPlaylist = (trackId: string) => {
    if (!selectedPlaylistId || !draftPlaylist) return;
    if (draftPlaylistTracks.some(pt => pt.track_id === trackId)) {
      toast.error('Track is already in this playlist');
      return;
    }
    
    const track = tracks.find(t => t.id === trackId) || allFetchedTracks.find(t => t.id === trackId);
    if (!track) return;
    
    const newPt = {
      playlist_id: selectedPlaylistId,
      track_id: trackId,
      position: draftPlaylistTracks.length,
      is_hidden: false,
      tracks: track
    };
    
    setDraftPlaylistTracks(prev => [newPt, ...prev]);
    setDraftPlaylist((prev: any) => ({ ...prev, track_count: (prev?.track_count || 0) + 1 }));
    setHasUnsavedChanges(true);
    setPlaylistSearchQuery('');
    setIsAddingTracks(false);
    toast.success('Track added to draft (remember to save)');
  };

  const fetchSharedLinks = async () => {
    try {
      const { data, error } = await supabase.from('shared_links').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSharedLinks(data || []);
    } catch (e) {
      console.error('Error fetching shared links', e);
    }
  };

  useEffect(() => {
    fetchSharedLinks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('tracks')
        .select('id, file_name, is_hidden, deleted_at, created_at, release_date, subgenre, moods, scenarios, instruments, textures, human_tags, artwork_url, r2_url, wav_url, aiff_url, watermarked_url, play_count, waveform_data, has_wav, has_aiff, has_watermarked, has_mp3, composers, track_type, parent_track_id, key, scale, duration, genre, energy_level, description')
        .order('release_date', { ascending: false });

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
    const scores = new Map<string, number>();

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      
      filtered = filtered.filter(t => {
        let score = 0;
        
        const fileName = t.file_name?.toLowerCase() || '';
        if (fileName.includes(q)) {
          score += 10;
          if (fileName === q) score += 20;
          if (fileName.startsWith(q)) score += 5;
        }

        const parse = (val: any) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          try { return JSON.parse(val); } catch { return []; }
        };

        const tags = [
          ...parse(t.subgenre),
          ...parse(t.moods),
          ...parse(t.scenarios),
          ...parse(t.instruments),
          ...parse(t.textures),
          ...parse(t.human_tags),
          t.genre || '',
          t.energy_level || ''
        ].map(tag => typeof tag === 'string' ? tag.toLowerCase() : '');

        if (tags.some(tag => tag === q)) score += 8;
        else if (tags.some(tag => tag.includes(q))) score += 5;

        if (t.description?.toLowerCase().includes(q)) {
           score += 2;
        }

        if (score > 0) {
          scores.set(t.id, score);
          return true;
        }
        return false;
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.release_date || b.created_at || 0).getTime() - new Date(a.release_date || a.created_at || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.release_date || a.created_at || 0).getTime() - new Date(b.release_date || b.created_at || 0).getTime();
      if (sortBy === 'most_played') return (b.play_count || 0) - (a.play_count || 0);
      const clean = (s: string) => s.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
      if (sortBy === 'a-z') {
        return clean(a.file_name || '').localeCompare(clean(b.file_name || ''));
      }
      if (sortBy === 'z-a') {
        return clean(b.file_name || '').localeCompare(clean(a.file_name || ''));
      }
      if (sortBy === 'hidden_first') {
        if (a.is_hidden && !b.is_hidden) return -1;
        if (!a.is_hidden && b.is_hidden) return 1;
        // fallback to newest if both hidden or both visible
        return new Date(b.release_date || b.created_at || 0).getTime() - new Date(a.release_date || a.created_at || 0).getTime();
      }
      
      // relevance
      if (debouncedQuery) {
        const scoreA = scores.get(a.id) || 0;
        const scoreB = scores.get(b.id) || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      // fallback to newest if no query or scores are equal
      return new Date(b.release_date || b.created_at || 0).getTime() - new Date(a.release_date || a.created_at || 0).getTime();
    });

    setTracks(sorted);
    setVisibleCount(20);
  }, [debouncedQuery, allFetchedTracks, sortBy]);

  const handleToggleHide = async (id: string, currentHidden: boolean) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ is_hidden: !currentHidden })
        .eq('id', id);
      
      if (error) throw error;
      
      setAllFetchedTracks(prev => prev.map(t => t.id === id ? { ...t, is_hidden: !currentHidden } : t));
      toast.success(currentHidden ? 'Track is now public' : 'Track is now hidden');
    } catch (error) {
      console.error('Error toggling hide:', error);
      toast.error('Failed to update track');
    }
  };

  const handleMoveToTrash = async (id: string) => {
    try {
      if (currentTrack?.id === id) stopPlayback();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tracks')
        .update({ deleted_at: now })
        .eq('id', id);
      
      if (error) throw error;
      
      setAllFetchedTracks(prev => prev.map(t => t.id === id ? { ...t, deleted_at: now } : t));
      toast.success('Track moved to trash');
    } catch (error) {
      console.error('Error moving to trash:', error);
      toast.error('Failed to move to trash');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ deleted_at: null })
        .eq('id', id);
      
      if (error) throw error;
      
      setAllFetchedTracks(prev => prev.map(t => t.id === id ? { ...t, deleted_at: null } : t));
toast.success('Track restored successfully');
    } catch (error) {
      console.error('Error restoring track:', error);
      toast.error('Failed to restore track');
    }
  };

  const handleForceDelete = (id: string) => {
    confirmAction({
      title: 'Delete Track Permanently',
      message: 'Are you sure you want to permanently delete this track and all its versions? This action cannot be undone and will delete all files from Cloudflare.',
      onConfirm: async () => {
        try {
          // 1. Collect all tracks to delete (main + versions)
          const trackToDelete = allFetchedTracks.find(t => t.id === id);
          const versionsToDelete = allFetchedTracks.filter(t => t.parent_track_id === id);
          const tracksToClean = [trackToDelete, ...versionsToDelete].filter(Boolean) as AdminTrack[];

          // 2. Delete files from Cloudflare R2
          const deletePromises = tracksToClean.flatMap(track => {
            const urls = [track.r2_url, track.wav_url, track.aiff_url, track.watermarked_url, track.artwork_url].filter(Boolean) as string[];
            return urls.map(url => {
              const filePath = url.replace('https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/', '');
              return supabase.functions.invoke('r2_presigned_url', {
                body: { action: 'delete', filePath }
              });
            });
          });
          
          await Promise.allSettled(deletePromises);

          // 3. Delete from DB (ON DELETE CASCADE should handle versions if configured, but we delete the main track)
          const { error } = await supabase
            .from('tracks')
            .delete()
            .eq('id', id);
            
          if (error) throw error;
          
          // Remove from local state
          const idsToRemove = tracksToClean.map(t => t.id);
          setAllFetchedTracks(prev => prev.filter(t => !idsToRemove.includes(t.id)));
          setTracks(prev => prev.filter(t => !idsToRemove.includes(t.id)));
          
          toast.success('Track and all versions permanently deleted');
        } catch (error) {
          console.error('Error force deleting:', error);
          toast.error('Failed to delete track');
        }
      }
    });
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/?track=${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleteDate = new Date(deletedAt);
    const expireDate = new Date(deleteDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expireDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  const handleEditClick = (track: AdminTrack) => {
    setEditingTrack(track);
    setEditForm({
      file_name: track.file_name,
      subgenre: Array.isArray(track.subgenre) ? track.subgenre.join(', ') : (track.subgenre || ''),
      moods: Array.isArray(track.moods) ? track.moods.join(', ') : (track.moods || ''),
      scenarios: Array.isArray(track.scenarios) ? track.scenarios.join(', ') : (track.scenarios || ''),
      instruments: Array.isArray(track.instruments) ? track.instruments.join(', ') : (track.instruments || ''),
      textures: Array.isArray(track.textures) ? track.textures.join(', ') : (track.textures || ''),
      human_tags: Array.isArray(track.human_tags) ? track.human_tags.join(', ') : (track.human_tags || ''),
      artwork_url: track.artwork_url || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTrack) return;
    try {
      const parsedSubgenre = editForm.subgenre.split(',').map(s => s.trim()).filter(Boolean);
      const parsedMoods = editForm.moods.split(',').map(s => s.trim()).filter(Boolean);
      const parsedScenarios = editForm.scenarios.split(',').map(s => s.trim()).filter(Boolean);
      const parsedInstruments = editForm.instruments.split(',').map(s => s.trim()).filter(Boolean);
      const parsedTextures = editForm.textures.split(',').map(s => s.trim()).filter(Boolean);
      const parsedHumanTags = editForm.human_tags.split(',').map(s => s.trim()).filter(Boolean);
      
      const updateData = { 
        file_name: editForm.file_name,
        subgenre: parsedSubgenre,
        moods: parsedMoods,
        scenarios: parsedScenarios,
        instruments: parsedInstruments,
        textures: parsedTextures,
        human_tags: parsedHumanTags,
        artwork_url: editForm.artwork_url || null
      };

      const { error } = await supabase
        .from('tracks')
        .update(updateData)
        .eq('id', editingTrack.id);

      if (error) throw error;

      setAllFetchedTracks(prev => prev.map(t => t.id === editingTrack.id ? { ...t, ...updateData } : t));
      
      setEditingTrack(null);
      toast.success('Track metadata updated');
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error('Failed to update track');
    }
  };

  const activeTracks = tracks
    .filter(t => !t.deleted_at && t.track_type === 'main')
    .map(t => ({
      ...t,
      versions: allFetchedTracks.filter(v => v.parent_track_id === t.id && !v.deleted_at)
    }));
  const trashTracks = tracks.filter(t => t.deleted_at);
  
  const currentViewList = activeTab === 'active' ? activeTracks : trashTracks;
  const displayedTracks = currentViewList.slice(0, visibleCount);

  const handleBulkPlaylistSubmit = async () => {
    if (!bulkForm.playlist_name) return;
    try {
      const mainTrackIds = Array.from(selectedTracks).filter(id => {
        const t = allFetchedTracks.find(track => track.id === id);
        return t && t.track_type === 'main';
      });

      if (mainTrackIds.length === 0) {
        toast.error('No main tracks selected. Playlists can only contain main tracks.');
        return;
      }

      const { data: plData, error: plError } = await supabase.from('playlists').insert([{ 
        title: bulkForm.playlist_name, 
        cover_url: bulkForm.playlist_cover || null,
        track_count: mainTrackIds.length
      }]).select().single();
      if (plError) throw plError;
      
      const ptInserts = mainTrackIds.map((tid, idx) => ({ playlist_id: plData.id, track_id: tid, position: idx }));
      const { error: ptError } = await supabase.from('playlist_tracks').insert(ptInserts);
      if (ptError) throw ptError;
      setBulkAction('none');
      setSelectedTracks(new Set());
      toast.success('Playlist created successfully!');
    } catch (e: any) { 
      console.error(e);
      toast.error('Error: ' + (e?.message || JSON.stringify(e) || 'Unknown error'));
    }
  };

  const handleBulkTrash = async () => {
    try {
      const ids = Array.from(selectedTracks);
      if (currentTrack && ids.includes(currentTrack.id)) stopPlayback();
      const now = new Date().toISOString();
      const { error } = await supabase.from('tracks').update({ deleted_at: now }).in('id', ids);
      if (error) throw error;
      setAllFetchedTracks(prev => prev.map(t => ids.includes(t.id) ? { ...t, deleted_at: now } : t));
      toast.success(`${ids.length} tracks moved to trash`);
    } catch (error) {
      toast.error('Failed to trash tracks');
    }
    setBulkAction('none');
    setSelectedTracks(new Set());
  };

  const handleBulkDelete = async () => {
    confirmAction({
      title: 'Delete Tracks Permanently',
      message: `Are you sure you want to permanently delete ${selectedTracks.size} tracks and their versions? This action cannot be undone and will remove files from Cloudflare.`,
      onConfirm: async () => {
        try {
          const ids = Array.from(selectedTracks);
          if (currentTrack && ids.includes(currentTrack.id)) stopPlayback();
          
          // 1. Collect all tracks (mains + versions)
          const tracksToClean = allFetchedTracks.filter(t => ids.includes(t.id) || (t.parent_track_id && ids.includes(t.parent_track_id)));
          
          // 2. Delete files from Cloudflare
          const deletePromises = tracksToClean.flatMap(track => {
            const urls = [track.r2_url, track.wav_url, track.aiff_url, track.watermarked_url, track.artwork_url].filter(Boolean) as string[];
            return urls.map(url => {
              const filePath = url.replace('https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/', '');
              return supabase.functions.invoke('r2_presigned_url', {
                body: { action: 'delete', filePath }
              });
            });
          });
          
          await Promise.allSettled(deletePromises);

          // 3. Delete from DB
          const { error } = await supabase.from('tracks').delete().in('id', ids);
          if (error) throw error;
          
          const idsToRemove = tracksToClean.map(t => t.id);
          setAllFetchedTracks(prev => prev.filter(t => !idsToRemove.includes(t.id)));
          setTracks(prev => prev.filter(t => !idsToRemove.includes(t.id)));
          setBulkAction('none');
          setSelectedTracks(new Set());
          toast.success(`${ids.length} tracks and versions permanently deleted`);
        } catch (error) {
          console.error('Error bulk deleting:', error);
          toast.error('Failed to delete tracks');
        }
      }
    });
  };

  const handleBulkRestore = async () => {
    try {
      const ids = Array.from(selectedTracks);
      const { error } = await supabase.from('tracks').update({ deleted_at: null }).in('id', ids);
      if (error) throw error;
      setAllFetchedTracks(prev => prev.map(t => ids.includes(t.id) ? { ...t, deleted_at: null } : t));
      toast.success(`${ids.length} tracks restored`);
    } catch (error) {
      toast.error('Failed to restore tracks');
    }
    setBulkAction('none');
    setSelectedTracks(new Set());
  };

  const handleAdminDownload = async (tracksToDownload: AdminTrack[]) => {
    if (tracksToDownload.length === 0) return;
    
    const loadingToast = toast.loading(`Downloading ${tracksToDownload.length} track(s)...`);
    let successCount = 0;
    let failCount = 0;
    
    for (const track of tracksToDownload) {
      if (!track.r2_url) {
        failCount++;
        continue;
      }
      
      try {
        const response = await fetch(track.r2_url);
        if (!response.ok) throw new Error('Failed to fetch');
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const cleanName = track.file_name.replace(/\.[^/.]+$/, "") || "track";
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${cleanName}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        successCount++;
        
        if (tracksToDownload.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.warn("Download fetch failed, falling back to new tab:", track.file_name, error);
        window.open(track.r2_url, '_blank');
        successCount++;
      }
    }
    
    if (tracksToDownload.length === 1) {
      if (successCount === 1) toast.success('Download started', { id: loadingToast });
      else toast.error('Download failed', { id: loadingToast });
    } else {
      if (failCount === 0) toast.success(`Successfully downloaded ${successCount} tracks`, { id: loadingToast });
      else if (successCount > 0) toast.success(`Downloaded ${successCount} tracks (${failCount} failed)`, { id: loadingToast });
      else toast.error('All downloads failed', { id: loadingToast });
    }
    
    if (tracksToDownload.length > 1) {
      setSelectedTracks(new Set());
    }
  };

  const handleBulkShareSubmit = async () => {
    const generatedSlug = bulkForm.shared_with.trim() ? bulkForm.shared_with.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : crypto.randomUUID();
    
    try {
      const { data, error } = await supabase.from('shared_links').insert([{ 
        track_ids: Array.from(selectedTracks), 
        can_download: bulkForm.can_download,
        shared_with: bulkForm.shared_with.trim() || null,
        slug: generatedSlug,
        notes: bulkForm.notes.trim() || null
      }]).select().single();
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('This custom name is already taken. Please choose another.');
          return;
        }
        throw error;
      }
      
      const url = `${window.location.origin}/share/${data.slug}`;
      navigator.clipboard.writeText(url);
      setBulkAction('none');
      setSelectedTracks(new Set());
      setBulkForm({ ...bulkForm, shared_with: '', notes: '', can_download: false });
      fetchSharedLinks();
      toast.success('Share link copied to clipboard!');
    } catch (e) { toast.error('Failed to generate share link'); }
  };

  const handleToggleLinkActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.from('shared_links').update({ is_active: !currentActive }).eq('id', id);
      if (error) error;
      setSharedLinks(sharedLinks.map(l => l.id === id ? { ...l, is_active: !currentActive } : l));
      toast.success(currentActive ? 'Link deactivated' : 'Link reactivated');
    } catch (e) { toast.error('Failed to update link status'); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const loadingToast = toast.loading('Uploading artwork...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('artworks').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('artworks').getPublicUrl(fileName);
      if (fieldName === 'bulkForm.artwork_url') setBulkForm(prev => ({ ...prev, artwork_url: data.publicUrl }));
      else if (fieldName === 'bulkForm.playlist_cover') setBulkForm(prev => ({ ...prev, playlist_cover: data.publicUrl }));
      else if (fieldName === 'editForm.artwork_url') setEditForm(prev => ({ ...prev, artwork_url: data.publicUrl }));
      toast.success('Upload complete!', { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload file', { id: loadingToast });
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const { error } = await supabase.from('shared_links').delete().eq('id', id);
      if (error) throw error;
      setSharedLinks(sharedLinks.filter(l => l.id !== id));
      toast.success('Link deleted');
    } catch (e) { toast.error('Failed to delete link'); }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm flex items-center justify-between gap-4 col-span-1 md:col-span-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-black/60 mb-2">
              <Link className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-medium tracking-widest break-words">Shared Music</span>
            </div>
            <div className="text-xl font-medium text-black break-words">{sharedLinks.filter(l => l.is_active).length} Active</div>
          </div>
          <button 
            onClick={() => setIsLinkManagerOpen(true)}
            className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black/80 transition-colors shrink-0"
          >
            Manage
          </button>
        </div>
        
        <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm flex items-center justify-between gap-4 col-span-1 md:col-span-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-black/60 mb-2">
              <Upload className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-medium tracking-widest break-words">Upload Tracks</span>
            </div>
            <div className="text-xl font-medium text-black break-words">New Release</div>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black/80 transition-colors shrink-0"
          >
            Upload
          </button>
        </div>

        <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm flex items-center justify-between gap-4 col-span-1 md:col-span-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-black/60 mb-2">
              <Music className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-medium tracking-widest break-words">Playlists</span>
            </div>
            <div className="text-xl font-medium text-black break-words">{allPlaylists.length || (tracks.length ? 'Manage' : '0')} Playlists</div>
          </div>
          <button 
            onClick={() => setIsPlaylistManagerOpen(true)}
            className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black/80 transition-colors shrink-0"
          >
            Manage
          </button>
        </div>
      </div>
      <div className="flex gap-4 shrink-0">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search tracks by name, mood & feel..."
            className="w-full h-12 pl-12 pr-12 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black/30 transition-colors shadow-sm text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black transition-colors rounded-full hover:bg-black/5" title="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative flex items-center gap-2 px-4 bg-white border border-black/10 rounded-xl shadow-sm shrink-0 h-12" ref={sortDropdownRef}>
          <span className="text-[10px] font-bold tracking-widest uppercase text-black/40">Sort</span>
          <button 
            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-black outline-none cursor-pointer"
          >
            {sortBy === 'relevance' ? 'Relevance' : sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'most_played' ? 'Most Played' : sortBy === 'a-z' ? 'A-Z' : sortBy === 'z-a' ? 'Z-A' : 'Hidden First'}
            <svg className={`w-3 h-3 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          {isSortDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-lg z-50 overflow-hidden py-1">
              {[
                { id: 'relevance', label: 'Relevance' },
                { id: 'newest', label: 'Newest' },
                { id: 'oldest', label: 'Oldest' },
                { id: 'most_played', label: 'Most Played' },
                { id: 'a-z', label: 'A-Z' },
                { id: 'z-a', label: 'Z-A' },
                { id: 'hidden_first', label: 'Hidden First' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setSortBy(opt.id); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${sortBy === opt.id ? 'bg-black/5 text-black' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
                >
                  <div className="flex items-center gap-2">
                    {sortBy === opt.id ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <div className="w-3 h-3" />}
                    {opt.label}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center bg-black/5 p-1 rounded-xl h-12 shrink-0">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 text-sm font-medium rounded-lg transition-all h-full flex items-center justify-center ${activeTab === 'active' ? 'bg-black text-white shadow-sm' : 'text-black/60 hover:text-black'}`}
          >
            Active ({tracks.filter(t => !t.deleted_at).length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`px-4 text-sm rounded-lg transition-all flex items-center justify-center h-full ${activeTab === 'trash' ? 'bg-black text-white shadow-sm' : 'text-black/60 hover:text-black'}`}
            title={`Trash (${tracks.filter(t => t.deleted_at).length})`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedTracks.size > 0 && (
        <div className="bg-black text-white px-6 py-4 rounded-xl flex items-start justify-between sticky top-4 z-40 shadow-xl">
          <div className="flex flex-col flex-1 mr-4">
            <div className="font-bold text-sm tracking-wider uppercase">
              {selectedTracks.size} Track{selectedTracks.size !== 1 && 's'} Selected
            </div>
            <div className="text-[10px] text-white/50 italic mt-1 max-h-[30vh] overflow-y-auto pr-4 pb-1 leading-relaxed max-w-2xl">
              {Array.from(selectedTracks).map(id => allFetchedTracks.find(t => t.id === id)?.file_name).filter(Boolean).join(', ')}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setBulkAction('playlist')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
              Create Playlist
            </button>
            <button onClick={() => {
              const selectedTrackObjects = Array.from(selectedTracks).map(id => allFetchedTracks.find(t => t.id === id)).filter(Boolean) as AdminTrack[];
              handleAdminDownload(selectedTrackObjects);
            }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
              Download
            </button>
            {activeTab === 'active' && (
              <button onClick={handleBulkTrash} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                Trash
              </button>
            )}
            {activeTab === 'trash' && (
              <>
                <button onClick={handleBulkRestore} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                  Restore
                </button>
                <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                  Delete
                </button>
              </>
            )}
            <button onClick={() => setBulkAction('share')} className="px-4 py-2 bg-white text-black hover:bg-white/90 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
              Share
            </button>
            <button onClick={() => setSelectedTracks(new Set())} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0 flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-black/50">Loading tracks...</div>
        ) : (
          <div className="overflow-auto overscroll-none flex-1 relative">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-[#f8f8f8] border-b border-black/10 text-black/60 uppercase tracking-wider text-xs sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer"
                      checked={selectedTracks.size > 0 && selectedTracks.size === currentViewList.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTracks(new Set(currentViewList.map(t => t.id)));
                        else setSelectedTracks(new Set());
                      }}
                    />
                  </th>
                  <th className="px-6 py-4 font-bold">Track Name</th>
                  <th className="px-6 py-4 font-bold">Files Format</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {displayedTracks.map((track) => (
                  <React.Fragment key={track.id}>
                    <tr className={`transition-colors ${selectedTracks.has(track.id) ? 'bg-black/5' : 'hover:bg-black/[0.02]'}`}>
                      <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer"
                        checked={selectedTracks.has(track.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedTracks);
                          if (e.target.checked) newSet.add(track.id);
                          else newSet.delete(track.id);
                          setSelectedTracks(newSet);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center shrink-0 overflow-hidden relative group/play cursor-pointer" onClick={() => currentTrack?.id === track.id ? togglePlay() : playTrack(track as any, currentViewList as any[])}>
                          <TrackArtwork track={track as any} className="w-full h-full object-cover" />
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === track.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover/play:opacity-100'}`}>
                            {currentTrack?.id === track.id && isPlaying ? (
                              <Pause className="w-4 h-4 fill-white text-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-white text-white translate-x-[1px]" />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-black truncate max-w-[200px] sm:max-w-md flex items-center gap-2">
                            {track.file_name.replace(/\.[^/.]+$/, '')}
                            {(track.created_at || track.release_date) && (new Date().getTime() - new Date(track.created_at || track.release_date || 0).getTime() < 14 * 24 * 60 * 60 * 1000) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase tracking-widest shrink-0">New</span>
                            )}
                            {track.versions && track.versions.length > 0 && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setExpandedTrackId(expandedTrackId === track.id ? null : track.id); }}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${expandedTrackId === track.id ? 'bg-black/10 text-black' : 'text-black/40 hover:bg-black/5 hover:text-black'}`}
                                title={`${track.versions.length} alternative versions`}
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span className="font-bold text-[10px]">{track.versions.length}</span>
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="relative group/tooltip flex items-center">
                          <button onClick={() => setFormatManagerTrack(track)} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${track.has_mp3 ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-black/5 text-black/30 hover:bg-black/10 hover:text-black'}`}>MP3</button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">{track.has_mp3 ? 'Original MP3' : 'Missing MP3 (Click to add)'}</div>
                        </div>
                        <div className="relative group/tooltip flex items-center">
                          <button onClick={() => setFormatManagerTrack(track)} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${track.has_watermarked ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-black/5 text-black/30 hover:bg-black/10 hover:text-black'}`}>W</button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">{track.has_watermarked ? 'Watermarked MP3' : 'Missing Watermark (Click to add)'}</div>
                        </div>
                        <div className="relative group/tooltip flex items-center">
                          <button onClick={() => setFormatManagerTrack(track)} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${track.has_wav ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-black/5 text-black/30 hover:bg-black/10 hover:text-black'}`}>WAV</button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">{track.has_wav ? 'HD WAV' : 'Missing WAV (Click to add)'}</div>
                        </div>
                        <div className="relative group/tooltip flex items-center">
                          <button onClick={() => setFormatManagerTrack(track)} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${track.has_aiff ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-black/5 text-black/30 hover:bg-black/10 hover:text-black'}`}>AIFF</button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">{track.has_aiff ? 'HD AIFF' : 'Missing AIFF (Click to add)'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {activeTab === 'active' ? (
                        track.is_hidden ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-600">
                            <EyeOff className="w-3 h-3" /> Hidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600">
                            <Eye className="w-3 h-3" /> Public
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600">
                          <AlertTriangle className="w-3 h-3" /> {getDaysRemaining(track.deleted_at!)} days left
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'active' ? (
                          <>
                            <button
                              onClick={() => handleAdminDownload([track])}
                              className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                              title="Download track"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(track)}
                              className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                              title="Edit metadata"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleShare(track.id)}
                              className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                              title="Share specific track link"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCopySourceTrack(track)}
                              className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                              title="Copy metadata to other tracks"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleHide(track.id, track.is_hidden)}
                              className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                              title={track.is_hidden ? 'Make public' : 'Hide from public'}
                            >
                              {track.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleMoveToTrash(track.id)}
                              className="p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all ml-2"
                              title="Move to trash"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(track.id)}
                              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-black/5 border border-black/10 rounded-lg transition-all flex items-center gap-2"
                            >
                              <RefreshCw className="w-3 h-3" /> Restore
                            </button>
                            <button
                              onClick={() => handleForceDelete(track.id)}
                              className="p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all ml-2"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedTrackId === track.id && track.versions && track.versions.length > 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-0 bg-black/[0.02] border-t-0">
                        <div className="border-l-[3px] border-black/5 ml-14 pl-4 py-2 space-y-1 mb-2">
                          {track.versions.map(version => (
                            <div 
                              key={version.id} 
                              className="flex items-center justify-between p-2 hover:bg-black/5 rounded-xl cursor-pointer transition-colors group/version"
                            >
                              <div className="flex items-center gap-4">
                                <div 
                                  className="w-8 h-8 rounded bg-black/5 flex items-center justify-center relative overflow-hidden shrink-0"
                                  onClick={() => currentTrack?.id === version.id ? togglePlay() : playTrack(version as any, track.versions as any[])}
                                >
                                  <TrackArtwork track={version as any} className="absolute inset-0 w-full h-full object-cover" />
                                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === version.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover/version:opacity-100'}`}>
                                    {currentTrack?.id === version.id && isPlaying ? (
                                      <Pause className="w-3 h-3 fill-white text-white" />
                                    ) : (
                                      <Play className="w-3 h-3 fill-white text-white translate-x-[1px]" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col">
                                  <div className="font-bold text-[13px] truncate">{version.file_name.replace(/(\.[^.]+)$/, '')}</div>
                                  <div className="font-sans text-[10px] text-black/40 uppercase tracking-widest mt-0.5">{version.track_type === 'stem' ? 'Stem' : 'Version'}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover/version:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditClick(version); }}
                                  className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-md transition-all"
                                  title="Edit version metadata"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMoveToTrash(version.id); }}
                                  className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                  title="Move version to trash"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
                
                {!isLoading && currentViewList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-black/40 text-sm">
                      No tracks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {!isLoading && currentViewList.length > visibleCount && (
              <div ref={lastElementRef} className="h-12 w-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black/40 uppercase tracking-widest mt-4 mb-4">
                <span className="animate-pulse">Loading more tracks...</span>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Edit Modal */}
      {editingTrack && (
        <TrackEditModal 
          track={editingTrack as any} 
          onClose={() => setEditingTrack(null)} 
          onSave={(updatedData) => {
            setAllFetchedTracks(prev => prev.map(t => t.id === editingTrack.id ? { ...t, ...updatedData } : t));
            setEditingTrack(null);
          }} 
        />
      )}

      {/* Copy Metadata Modal */}
      {copySourceTrack && (
        <CopyMetadataModal
          sourceTrack={copySourceTrack}
          targetTrackIds={Array.from(selectedTracks).filter(id => id !== copySourceTrack.id)}
          allTracks={allFetchedTracks}
          onClose={() => setCopySourceTrack(null)}
          onComplete={({ targetIds, updateData }) => {
            setAllFetchedTracks(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, ...updateData } : t));
            setCopySourceTrack(null);
            setSelectedTracks(new Set());
          }}
        />
      )}

      {/* Upload Tracks Modal */}
      {isUploadModalOpen && (
        <AdminUploadModal
          existingTracks={allFetchedTracks}
          onClose={() => setIsUploadModalOpen(false)}
          onComplete={() => {
            setIsUploadModalOpen(false);
            setSearchQuery(''); // clear the search bar so new tracks show up!
            fetchTracks();
          }}
        />
      )}

      {/* Bulk Action Modal */}
      {bulkAction !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setBulkAction('none')}>
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-black/10" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {bulkAction === 'artwork' && 'Bulk Set Artwork'}
                {bulkAction === 'playlist' && 'Create Playlist from Selection'}
                {bulkAction === 'share' && 'Share Selected Tracks'}
                {bulkAction === 'trash' && 'Move Selected to Trash'}
                {bulkAction === 'delete' && 'Permanently Delete Selected'}
                {bulkAction === 'restore' && 'Restore Selected Tracks'}
              </h3>
              <button onClick={() => setBulkAction('none')} className="p-2 hover:bg-black/5 rounded-full text-black/50 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">


              {bulkAction === 'playlist' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Playlist Name</label>
                    <input type="text" value={bulkForm.playlist_name} onChange={e => setBulkForm({...bulkForm, playlist_name: e.target.value})} className="w-full px-4 py-3 bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl outline-none" placeholder="E.g. Action Cues 2026" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Cover Image (optional)</label>
                    <div className="flex gap-2">
                      <input type="text" value={bulkForm.playlist_cover} onChange={e => setBulkForm({...bulkForm, playlist_cover: e.target.value})} className="flex-1 px-4 py-3 bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl outline-none" placeholder="https://..." />
                      <label className="flex items-center justify-center px-4 py-3 bg-black/5 rounded-xl cursor-pointer hover:bg-black/10 transition-colors shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-black">Upload</span>
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'bulkForm.playlist_cover')} />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {bulkAction === 'share' && (
                <div className="space-y-4">
                  <p className="text-sm text-black/60">You are generating a private shareable link for {selectedTracks.size} tracks. Users with this link will be able to stream these tracks.</p>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Shared With (Custom Name)</label>
                    <input type="text" value={bulkForm.shared_with} onChange={e => setBulkForm({...bulkForm, shared_with: e.target.value})} className="w-full px-4 py-3 bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl outline-none" placeholder="Client/Collaborator" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Notes for recipient</label>
                    <textarea value={bulkForm.notes} onChange={e => setBulkForm({...bulkForm, notes: e.target.value})} className="w-full px-4 py-3 bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl outline-none resize-none h-24" placeholder="Here's the music we've been working with" />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer pt-2">
                    <input type="checkbox" checked={bulkForm.can_download} onChange={e => setBulkForm({...bulkForm, can_download: e.target.checked})} className="w-5 h-5 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer" />
                    <span className="text-sm font-bold uppercase tracking-wider">Allow Download</span>
                  </label>
                </div>
              )}
              {bulkAction === 'trash' && (
                <div className="space-y-4">
                  <p className="text-sm text-black/60">Are you sure you want to move {selectedTracks.size} tracks to the trash?</p>
                </div>
              )}
              {bulkAction === 'delete' && (
                <div className="space-y-4">
                  <p className="text-sm text-red-500 font-bold">Are you sure you want to PERMANENTLY delete {selectedTracks.size} tracks?</p>
                  <p className="text-xs text-black/60">This action cannot be undone.</p>
                </div>
              )}
              {bulkAction === 'restore' && (
                <div className="space-y-4">
                  <p className="text-sm text-black/60">Are you sure you want to restore {selectedTracks.size} tracks?</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-black/5 border-t border-black/5 flex justify-end gap-3">
              <button onClick={() => setBulkAction('none')} className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-black/60 hover:bg-black/5 hover:text-black">Cancel</button>
              <button 
                onClick={
                  bulkAction === 'playlist' ? handleBulkPlaylistSubmit : 
                  bulkAction === 'share' ? handleBulkShareSubmit :
                  bulkAction === 'trash' ? handleBulkTrash :
                  bulkAction === 'delete' ? handleBulkDelete :
                  handleBulkRestore
                } 
                className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white hover:scale-105 active:scale-95 transition-all shadow-md ${bulkAction === 'delete' || bulkAction === 'trash' ? 'bg-red-500' : 'bg-black'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Manager Modal */}
      {isLinkManagerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsLinkManagerOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold">Manage Shared Links</h3>
              <button onClick={() => setIsLinkManagerOpen(false)} className="p-2 hover:bg-black/5 rounded-full text-black/50 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-black/[0.02]">
              {sharedLinks.length === 0 ? (
                <div className="text-center py-12 text-black/40">No links generated yet.</div>
              ) : (
                <div className="space-y-4">
                  {sharedLinks.map(link => (
                    <div key={link.id} className={`bg-white rounded-xl p-5 border border-black/10 shadow-sm transition-all ${!link.is_active ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-lg">{link.shared_with || 'Anonymous Link'}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${link.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                              {link.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-sm text-black/60 mb-3 flex items-center gap-2">
                            <span>Slug: <span className="font-mono text-black">/share/{link.slug}</span></span>
                            <span>•</span>
                            <span>{link.track_ids.length} Tracks</span>
                            <span>•</span>
                            <span>{link.can_download ? 'Downloadable' : 'Stream only'}</span>
                          </div>
                          {link.notes && (
                            <div className="bg-black/5 p-3 rounded-lg text-sm text-black/80 italic">
                              "{link.notes}"
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/share/${link.slug}`)}
                            className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                            title="Copy Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleToggleLinkActive(link.id, link.is_active)}
                            className={`p-2 rounded-lg transition-all ${link.is_active ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-green-600 hover:bg-green-500/10'}`}
                            title={link.is_active ? 'Deactivate link' : 'Reactivate link'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                message: 'Are you sure you want to permanently delete this link?',
                                onConfirm: () => {
                                  handleDeleteLink(link.id);
                                  setConfirmModal(null);
                                }
                              });
                            }}
                            className="p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Playlist Manager Modal */}
      {isPlaylistManagerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={handleClosePlaylistManager}>
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl border border-black/10 flex animate-slide-in-up" onClick={e => e.stopPropagation()}>
            
            {/* Sidebar: Playlist List */}
            <div className="w-1/3 border-r border-black/10 flex flex-col bg-black/[0.02]">
              <div className="p-6 border-b border-black/5 shrink-0 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Playlists</h3>
                  <button 
                    onClick={() => {
                      setEditingCategoriesStr(playlistCategories.join(', '));
                      setIsCategoryManagerOpen(true);
                    }}
                    className="px-3 py-1.5 bg-black/5 hover:bg-black/10 text-black text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
                  >
                    Manage Categories
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type="text"
                    value={playlistSearchQuery}
                    onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                    placeholder="Search playlists..."
                    className="w-full bg-black/5 border-none rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-black/10 outline-none transition-all"
                  />
                  {playlistSearchQuery && (
                    <button onClick={() => setPlaylistSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {allPlaylists
                  .filter(p => p.title?.toLowerCase().includes(playlistSearchQuery.toLowerCase()))
                  .map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handlePlaylistSelect(p.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${selectedPlaylistId === p.id ? 'bg-white border-black/20 shadow-sm' : 'border-transparent hover:bg-black/5'}`}
                  >
                    <div className="font-bold text-black">{p.title}</div>
                    <div className="text-xs text-black/50 mt-1">{p.track_count} Tracks</div>
                  </button>
                ))}
                {allPlaylists.filter(p => p.title?.toLowerCase().includes(playlistSearchQuery.toLowerCase())).length === 0 && <div className="text-center text-sm text-black/40 p-4">No playlists found</div>}
              </div>
            </div>

            {/* Main Area: Edit Selected Playlist */}
            <div className="flex-1 flex flex-col relative bg-white">
              {!selectedPlaylistId ? (
                <>
                  <div className="flex justify-end p-6 shrink-0">
                    <button onClick={handleClosePlaylistManager} className="p-2 hover:bg-black/5 rounded-full text-black/50 hover:text-black">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center pb-20">
                    <div className="flex flex-col items-center gap-6 text-black/40 -mt-24">
                      <img src="/search-for-documents.svg" alt="Select playlist" className="w-96 h-96" />
                      <span className="font-bold uppercase tracking-widest text-sm text-center">Select a playlist to manage</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {(() => {
                    const activePlaylist = draftPlaylist;
                    return (
                      <div className="flex-1 overflow-y-auto">
                        <div className="p-8 border-b border-black/5">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-black/50">Playlist Details</h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    message: 'Are you sure you want to permanently delete this playlist? This action cannot be undone.',
                                    onConfirm: () => {
                                      handleDeletePlaylist(selectedPlaylistId);
                                      setConfirmModal(null);
                                    }
                                  });
                                }}
                                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors border border-red-500"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleSaveChanges}
                                disabled={!hasUnsavedChanges}
                                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border ${hasUnsavedChanges ? 'text-black bg-black/5 hover:bg-black hover:text-white border-transparent' : 'text-black/30 bg-black/5 border-transparent cursor-not-allowed opacity-50'}`}
                              >
                                Save
                              </button>
                              <div className="w-px h-6 bg-black/10 mx-2"></div>
                              <button onClick={handleClosePlaylistManager} className="p-2 hover:bg-black/5 rounded-full text-black/50 hover:text-black" title="Close Manager">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-8 items-start">
                            <div className="w-48 h-48 bg-black/5 rounded-xl flex-shrink-0 overflow-hidden relative group">
                              {activePlaylist?.cover_url ? (
                                <img src={activePlaylist.cover_url} className="w-full h-full object-cover" alt="Cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="w-12 h-12 text-black/20" />
                                </div>
                              )}
                              <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold uppercase tracking-wider">
                                Change
                                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const loadingToast = toast.loading('Uploading artwork...');
                                  try {
                                    const fileExt = file.name.split('.').pop();
                                    const fileName = `${Math.random()}.${fileExt}`;
                                    const { error: uploadError } = await supabase.storage.from('artworks').upload(fileName, file);
                                    if (uploadError) throw uploadError;
                                    const { data } = supabase.storage.from('artworks').getPublicUrl(fileName);
                                    handleUpdatePlaylistMetadata({ cover_url: data.publicUrl });
                                    toast.success('Artwork updated', { id: loadingToast });
                                  } catch (error) {
                                    toast.error('Failed to upload', { id: loadingToast });
                                  }
                                }} />
                              </label>
                            </div>
                            
                            <div className="flex-1 min-h-48 flex flex-col justify-center gap-6 py-2">
                              <div>
                                <input 
                                  key={`title-${activePlaylist?.id}`}
                                  type="text" 
                                  defaultValue={activePlaylist?.title}
                                  onBlur={(e) => {
                                    if (e.target.value !== activePlaylist?.title) {
                                      handleUpdatePlaylistMetadata({ title: e.target.value });
                                    }
                                  }}
                                  className="w-full text-4xl font-bold bg-transparent border-b border-transparent hover:border-black/10 focus:border-black/30 outline-none pb-1 transition-colors px-0 placeholder:text-black/20" 
                                  placeholder="Playlist Title"
                                />
                              </div>
                              
                              <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                  {playlistCategories.map(cat => {
                                    const currentCategories = activePlaylist?.categories || [];
                                    const isSelected = currentCategories.includes(cat);
                                    return (
                                      <button
                                        key={cat}
                                        onClick={() => {
                                          const newCategories = isSelected 
                                            ? currentCategories.filter((c: string) => c !== cat) 
                                            : [...currentCategories, cat];
                                          handleUpdatePlaylistMetadata({ categories: newCategories });
                                        }}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${isSelected ? 'bg-black text-white border-black' : 'bg-transparent text-black/60 border-black/10 hover:border-black/30 hover:text-black'}`}
                                      >
                                        {cat}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center border-t border-black/5 pt-3">
                                  <label className="flex items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                                    <input 
                                      type="checkbox" 
                                      checked={activePlaylist?.is_featured || false} 
                                      onChange={e => handleUpdatePlaylistMetadata({ is_featured: e.target.checked })} 
                                      className="w-3 h-3 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer" 
                                    />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-black mt-0.5">Add to Featured Playlists</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-8">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-black/50">Tracks ({draftPlaylistTracks.length})</h3>
                            <button onClick={() => setIsAddingTracks(!isAddingTracks)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-lg transition-colors">
                              <Plus className="w-4 h-4" /> Add Tracks
                            </button>
                          </div>

                          {isAddingTracks && (
                            <div className="mb-6 p-4 bg-black/[0.02] border border-black/10 rounded-xl">
                              <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                                <input 
                                  type="text" 
                                  value={playlistSearchQuery}
                                  onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                                  placeholder="Search all tracks..."
                                  className="w-full h-10 pl-10 pr-10 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black/30 text-sm"
                                />
                                {playlistSearchQuery && (
                                  <button onClick={() => setPlaylistSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black transition-colors rounded-full hover:bg-black/5" title="Clear search">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {playlistSearchQuery && (
                                <div className="mt-2 max-h-48 overflow-y-auto bg-white border border-black/10 rounded-lg shadow-sm">
                                  {allFetchedTracks.filter(t => {
                                    if (t.deleted_at || t.track_type !== 'main') return false;
                                    const q = playlistSearchQuery.toLowerCase();
                                    if (t.file_name.toLowerCase().includes(q)) return true;
                                    
                                    const parse = (val: any) => {
                                      if (!val) return [];
                                      if (Array.isArray(val)) return val;
                                      try { return JSON.parse(val); } catch { return []; }
                                    };
                                    
                                    const tags = [
                                      ...parse(t.subgenre),
                                      ...parse(t.moods),
                                      ...parse(t.scenarios),
                                      ...parse(t.instruments),
                                      ...parse(t.textures),
                                      ...parse(t.human_tags)
                                    ].map(tag => typeof tag === 'string' ? tag.toLowerCase() : '');
                                    
                                    return tags.some(tag => tag.includes(q));
                                  }).slice(0, 10).map(t => {
                                    const isAlreadyAdded = draftPlaylistTracks.some(pt => pt.track_id === t.id);
                                    return (
                                      <div key={t.id} className="flex items-center justify-between p-3 hover:bg-black/5 border-b border-black/5 last:border-0">
                                        <span className="text-sm font-medium truncate">{t.file_name.replace(/\.[^/.]+$/, '')}</span>
                                        {isAlreadyAdded ? (
                                          <button onClick={() => handlePlaylistTrackRemove(selectedPlaylistId, t.id)} className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Remove">
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        ) : (
                                          <button onClick={() => handleAddTrackToPlaylist(t.id)} className="text-[10px] font-bold uppercase bg-black text-white px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors">Add</button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {isPlaylistLoading ? (
                            <div className="text-center py-8 text-black/40">Loading tracks...</div>
                          ) : (
                            <DragDropContext onDragEnd={handlePlaylistTrackDragEnd}>
                              <Droppable droppableId="playlist-tracks">
                                {(provided) => (
                                  <div 
                                    className="space-y-2"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                  >
                                    {draftPlaylistTracks.map((pt, idx) => (
                                      <Draggable key={pt.track_id} draggableId={pt.track_id} index={idx}>
                                        {(provided, snapshot) => {
                                          const isPlayingThisTrack = currentTrack?.id === pt.track_id && isPlaying;
                                          const child = (
                                            <div 
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`flex items-center gap-4 p-3 rounded-xl border border-black/5 transition-colors cursor-grab active:cursor-grabbing ${pt.is_hidden ? 'opacity-50' : 'bg-white hover:bg-black/5'} ${snapshot.isDragging ? 'shadow-xl bg-white scale-[1.02] z-[9999]' : ''}`}
                                            >
                                              <div className="flex flex-col items-center justify-center shrink-0 text-black/20">
                                                <ChevronUp className="w-4 h-4 -mb-1.5" />
                                                <ChevronDown className="w-4 h-4 -mt-1.5" />
                                              </div>
                                              
                                              <button 
                                                onClick={() => {
                                                  if (currentTrack?.id === pt.track_id) {
                                                    togglePlay();
                                                  } else {
                                                    const validTracks = draftPlaylistTracks.map(t => t.tracks).filter(Boolean);
                                                    playTrack(pt.tracks, validTracks);
                                                  }
                                                }}
                                                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center shrink-0 transition-colors text-black"
                                              >
                                                {isPlayingThisTrack ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                                              </button>

                                              <div className="flex-1 min-w-0 pl-2">
                                                <div className="font-bold text-sm truncate">{pt.tracks?.file_name?.replace(/\.[^/.]+$/, '')}</div>
                                                {pt.is_hidden && <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">Hidden from playlist</div>}
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <button onClick={() => handlePlaylistTrackToggleHide(selectedPlaylistId, pt.track_id, pt.is_hidden)} className="p-2 hover:bg-black/10 rounded-lg text-black/40 hover:text-black" title={pt.is_hidden ? 'Show' : 'Hide'}>
                                                  {pt.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => handlePlaylistTrackRemove(selectedPlaylistId, pt.track_id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500/60 hover:text-red-500">
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                          
                                          if (snapshot.isDragging) {
                                            return createPortal(child, document.body);
                                          }
                                          return child;
                                        }}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    {draftPlaylistTracks.length === 0 && <div className="text-center text-black/40 py-8">No tracks in this playlist</div>}
                                  </div>
                                )}
                              </Droppable>
                            </DragDropContext>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-black/10 text-center p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">{confirmModal.title || "Confirm Action"}</h3>
            <p className="text-black/60 mb-6">{confirmModal.message}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-black/60 hover:bg-black/5 hover:text-black">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-red-500 text-white hover:bg-red-600 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {formatManagerTrack && (
        <TrackFormatsModal 
          track={formatManagerTrack} 
          onClose={() => setFormatManagerTrack(null)} 
          onUpdate={(updatedTrack) => {
            // Update in tracks list
            setTracks(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
            setAllFetchedTracks(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
            // Update formatManagerTrack so the modal reflects the changes
            setFormatManagerTrack(updatedTrack);
          }} 
        />
      )}
      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsCategoryManagerOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-black/10 p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Manage Categories</h3>
              <button onClick={() => setIsCategoryManagerOpen(false)} className="p-2 hover:bg-black/5 rounded-full text-black/50 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-black/50 mb-4">Edit playlist categories below as a comma-separated list.</p>
            <textarea 
              value={editingCategoriesStr}
              onChange={(e) => setEditingCategoriesStr(e.target.value)}
              className="w-full h-40 p-3 bg-black/[0.02] border border-black/10 rounded-xl focus:outline-none focus:border-black/30 font-sans text-sm leading-relaxed resize-none"
              placeholder="E.g. Cinematic & Film, Dark & Tension, Electronic & Synth..."
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsCategoryManagerOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-black/60 hover:bg-black/5 hover:text-black">Cancel</button>
              <button onClick={handleSaveCategories} className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-black text-white hover:scale-105 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
