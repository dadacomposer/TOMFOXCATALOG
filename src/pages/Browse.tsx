import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, fetchTracks, searchTracksByEmbedding, fetchPlaylists, fetchTrendingTracks, searchTracksByTitle, fetchDefaultTrackOrder, fetchTracksByIds, fetchPlaylistTrackIds, fetchFilterOptions, searchTracksByTags } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import { useDownload } from '../context/DownloadContext';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { generateEmbedding, initEmbeddingModel } from '../lib/embedding';
import { parseWaveform, getPreviewTimings } from '../lib/audioUtils';
import { ChevronRight, ChevronDown, Search, TrendingUp, Play, Pause, Download, ShoppingBag, Layers } from 'lucide-react';
import PlaylistIsland from '../components/PlaylistIsland';
import PlaylistArtwork from '../components/PlaylistArtwork';
import TrackActionButtons from '../components/TrackActionButtons';

import WaveformView from '../components/WaveformView';
import { usePlayer } from '../context/PlayerContext';
import { DEFAULT_ARTWORK, DEFAULT_COMPOSERS, DEFAULT_ARTIST } from '../config';
import TrackArtwork from '../components/TrackArtwork';

type Track = {
  id: string;
  file_name: string;
  r2_url: string;
  created_at?: string;
  release_date?: string;
  has_wav?: boolean;
  has_aiff?: boolean;
  has_mp3?: boolean;
  has_watermarked?: boolean;
  duration?: number;
  key?: string;
  scale?: string;
  subgenre?: string[];
  instruments?: string[];
  moods?: string[];
  textures?: string[];
  scenarios?: string[];
  human_tags?: string[];
  movement?: string[];
  energy_level?: string;
  waveform_data?: number[];
  artwork_url?: string;
  composers?: string[];
  versions?: Track[];
  description?: string;
};

const parseTags = (t: string[] | string | undefined): string[] => {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  try { return JSON.parse(t); } catch(e) { return []; }
};

type FilterOption = { value: string; count: number };
type FilterOptions = {
  genre: FilterOption[];
  subgenre: FilterOption[];
  moods: FilterOption[];
  instruments: FilterOption[];
  textures: FilterOption[];
  scenarios: FilterOption[];
  human_tags: FilterOption[];
  energy_level: FilterOption[];
  movement: FilterOption[];
};

export default function Browse() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const playlistUrlId = searchParams.get('playlist');
  
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [displayedTracks, setDisplayedTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newMusicPlaylist, setNewMusicPlaylist] = useState<any | null>(null);
  const [newMusicTrackIds, setNewMusicTrackIds] = useState<Set<string>>(new Set());

  const trendingTrackIds = useMemo(() => new Set(trendingTracks.map(t => t.id)), [trendingTracks]);
  const [loading, setLoading] = useState(true);
  const [isInitialTracksLoaded, setIsInitialTracksLoaded] = useState(false);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({
    genre: [], subgenre: [], moods: [], instruments: [], textures: [], scenarios: [], human_tags: [], energy_level: [], movement: [], shadow_tags: []
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filterSearch, setFilterSearch] = useState(''); // search within filter panel

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);


  const FILTER_CATEGORIES = useMemo(() => [
    { title: 'Genre',       key: 'genre',        options: filterOptions?.genre || [] },
    { title: 'Arrangement', key: 'subgenre',     options: filterOptions?.subgenre || [] },
    { title: 'Mood',        key: 'moods',        options: filterOptions?.moods || [] },
    { title: 'Instruments', key: 'instruments',  options: filterOptions?.instruments || [] },
    { title: 'Function',    key: 'textures',     options: filterOptions?.textures || [] },
    { title: 'Music For',   key: 'scenarios',    options: filterOptions?.scenarios || [] },
    { title: 'Character',   key: 'human_tags',   options: filterOptions?.human_tags || [] },
    { title: 'Movement',    key: 'movement',     options: filterOptions?.movement || [] },
    { title: 'Tempo',       key: 'energy_level', options: filterOptions?.energy_level || [] },
  ], [filterOptions]);
  
  const { playTrack, currentTrack, isPlaying, togglePlay, setProgress, progress, setPendingSeek, isPreviewMode, setIsPreviewMode, setFallbackPlaylist, currentSource, setCurrentSource, setIsCurrentPreviewDormant, currentPlaylist, setCurrentPlaylist, setSelectedTrackForDetails } = usePlayer();
  const { openDownloadModal } = useDownload();
  const { openLicenseModal } = useLicense();
  const { profile } = useAuth();
  const { settings } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [isTypingSearch, setIsTypingSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [defaultTrackIds, setDefaultTrackIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const tracksPerPage = 20;

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
    initEmbeddingModel();
    
    async function loadData() {
      const [pData, tData, ids, fOpts] = await Promise.all([
        fetchPlaylists(),
        fetchTrendingTracks(),
        fetchDefaultTrackOrder(),
        fetchFilterOptions()
      ]);
      
      const newPlaylist = pData.find((p: any) => p.title.toLowerCase().includes('new music'));
      if (newPlaylist) {
        setNewMusicPlaylist(newPlaylist);
        setPlaylists(pData.filter((p: any) => p.id !== newPlaylist.id));
        const newTrackIds = await fetchPlaylistTrackIds(newPlaylist.id);
        setNewMusicTrackIds(new Set(newTrackIds));
      } else {
        setPlaylists(pData);
      }
      
      setTrendingTracks(tData as Track[]);
      setDefaultTrackIds(ids);
      if (fOpts) {
        setFilterOptions(fOpts);
      } else {
        setFilterOptions(null);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (playlistUrlId === 'new-music' && newMusicPlaylist) {
      setSearchParams({ playlist: newMusicPlaylist.id }, { replace: true });
    }
  }, [playlistUrlId, newMusicPlaylist, setSearchParams]);

  // Update fallback playlist whenever displayed tracks change
  useEffect(() => {
    if (displayedTracks.length > 0) {
      setFallbackPlaylist(displayedTracks);
      // If we are currently playing from the browse/search section, dynamically sync the queue!
      // This ensures that loading more tracks or searching live updates the skip queue in real-time.
      if (currentSource === 'browse' && currentPlaylist.length > 0) {
         setCurrentPlaylist(displayedTracks);
      }
    }
  }, [displayedTracks, setFallbackPlaylist, currentSource, setCurrentPlaylist]);

  // Handle auto-scroll when trending tracks finish playing
  useEffect(() => {
    const handleScrollEvent = () => {
      document.getElementById('main-search-bar')?.scrollIntoView({ behavior: 'smooth' });
    };
    window.addEventListener('scrollToBrowse', handleScrollEvent);
    return () => window.removeEventListener('scrollToBrowse', handleScrollEvent);
  }, []);

  const [shadowTagIds, setShadowTagIds] = useState<string[] | null>(null);

  useEffect(() => {
    const shadowTags = (activeFilters.shadow_tags as string[]) || [];
    if (shadowTags.length === 0) {
      setShadowTagIds(null);
      return;
    }
    
    let isCancelled = false;
    setIsSearching(true);
    
    const resolve = async () => {
      const idSets: Set<string>[] = [];
      for (const tag of shadowTags) {
        const [textRaw, tagIds] = await Promise.all([
          searchTracksByTitle(tag),
          searchTracksByTags(tag)
        ]);
        const ids = new Set<string>();
        textRaw.forEach((r: any) => ids.add(r.id));
        tagIds.forEach((id: string) => ids.add(id));
        idSets.push(ids);
      }
      
      if (isCancelled) return;
      
      let finalIds = Array.from(idSets[0]);
      for (let i = 1; i < idSets.length; i++) {
        finalIds = finalIds.filter(id => idSets[i].has(id));
      }
      
      setShadowTagIds(finalIds);
      setIsSearching(false);
    };
    
    resolve();
    return () => { isCancelled = true; };
  }, [activeFilters.shadow_tags]);

  const totalActiveFilterCount = useMemo(() => {
    let count = 0;
    Object.entries(activeFilters).forEach(([k, v]) => {
      if (Array.isArray(v)) count += v.length;
    });
    return count;
  }, [activeFilters]);

  useEffect(() => {
    if (loading) return;

    if (!searchQuery.trim()) {
      const hasFilters = totalActiveFilterCount > 0;
      
      // If we are waiting for shadow tags to resolve, don't fetch yet
      const shadowTags = (activeFilters.shadow_tags as string[]) || [];
      if (shadowTags.length > 0 && shadowTagIds === null) return;
      
      if (!hasFilters && defaultTrackIds.length > 0 && sortBy === 'relevance' && !shadowTagIds) {
        // Default browse view: Use pagination to avoid fetching 1000+ tracks at once
        fetchTracksByIds(defaultTrackIds.slice(0, tracksPerPage)).then(data => {
          setDisplayedTracks(data as Track[]);
          setCurrentPage(1);
          setHasMoreTracks(defaultTrackIds.length > tracksPerPage);
          setIsInitialTracksLoaded(true);
          setIsTypingSearch(false);
          setIsSearching(false);
        });
      } else {
        setIsSearching(true);
        fetchTracks(1, tracksPerPage, activeFilters, sortBy, shadowTagIds || undefined).then(data => {
          setDisplayedTracks(data as Track[]);
          setCurrentPage(1);
          setHasMoreTracks(data.length === tracksPerPage);
          setIsInitialTracksLoaded(true);
          setIsTypingSearch(false);
          setIsSearching(false);
        });
      }
    }
  }, [searchQuery, loading, activeFilters, defaultTrackIds, sortBy, totalActiveFilterCount, shadowTagIds]);

  const executeSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || searchQuery;
    if (!q.trim()) return;
    setIsSearching(true);
    analytics.trackSearch(q);
    try {
      // Run semantic, title, and tag searches in parallel
      const [vector, textRaw, tagIds] = await Promise.all([
        generateEmbedding(q).catch(() => null),
        searchTracksByTitle(q),
        searchTracksByTags(q)
      ]);

      const allIds = new Set<string>();
      // Title results first (most precise)
      textRaw.forEach((r: any) => allIds.add(r.id));
      // Tag hits second  
      tagIds.forEach((id: string) => allIds.add(id));
      // Semantic last (broader)
      if (vector) {
        const semanticRaw = await searchTracksByEmbedding(vector);
        semanticRaw.forEach((r: any) => allIds.add(r.id));
      }
      
      let finalIds = Array.from(allIds);
      
      // If we also have shadow tags active, intersect with them
      if (shadowTagIds) {
        finalIds = finalIds.filter(id => shadowTagIds.includes(id));
      }
      
      let combined: Track[] = [];
      
      if (finalIds.length > 0) {
        // Use fetchTracks to apply activeFilters and sortBy on top of search results
        combined = await fetchTracks(1, tracksPerPage, activeFilters, sortBy, finalIds) as Track[];
      }
      
      setDisplayedTracks(combined);
      setHasMoreTracks(false);
    } catch (err) {
      console.error('Error during search:', err);
      try {
        const textRaw = await searchTracksByTitle(searchQuery);
        const textIds = textRaw.map((r: any) => r.id);
        let textResults: Track[] = [];
        if (textIds.length > 0) {
          let fallbackIds = textIds;
          if (shadowTagIds) fallbackIds = fallbackIds.filter((id: string) => shadowTagIds.includes(id));
          textResults = await fetchTracks(1, tracksPerPage, activeFilters, sortBy, fallbackIds) as Track[];
        }
        setDisplayedTracks(textResults);
        setHasMoreTracks(false);
      } catch (fallbackErr) {
        setDisplayedTracks([]);
        setHasMoreTracks(false);
      }
    } finally {
      setIsSearching(false);
      setIsTypingSearch(false);
      setIsInitialTracksLoaded(true);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim() || !isTypingSearch) return;

    const timeoutId = setTimeout(() => {
      executeSearch();
    }, 750);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isTypingSearch]);

  const toggleFilter = (categoryKey: string, option: string) => {
    setActiveFilters(prev => {
      const isSelected = (prev[categoryKey] as string[])?.includes(option);
      if (!isSelected) {
        analytics.trackFilter(categoryKey, option);
      }
      return {
        ...prev,
        [categoryKey]: isSelected 
          ? (prev[categoryKey] as string[]).filter(item => item !== option)
          : [...(prev[categoryKey] as string[] || []), option]
      };
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({ genre: [], subgenre: [], moods: [], instruments: [], textures: [], scenarios: [], human_tags: [], energy_level: [], movement: [], shadow_tags: [] });
    setExpandedCategory(null);
  };



  const handleTagClick = (categoryKey: string, value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Shadow search: add to shadow_tags filter instead of modifying strict categories
    setActiveFilters(prev => {
      const tags = (prev.shadow_tags as string[]) || [];
      if (!tags.includes(value)) {
        return { ...prev, shadow_tags: [...tags, value] };
      }
      return prev;
    });
  };

  const handleLoadMore = async () => {
    const nextPage = currentPage + 1;
    const hasFilters = Object.values(activeFilters).some(v => v.length > 0);
    
    if (!searchQuery.trim() && !hasFilters && defaultTrackIds.length > 0 && sortBy === 'relevance') {
      const startIndex = currentPage * tracksPerPage;
      const endIndex = startIndex + tracksPerPage;
      const nextIds = defaultTrackIds.slice(startIndex, endIndex);
      
      const newTracks = await fetchTracksByIds(nextIds) as Track[];
      setDisplayedTracks(prev => [...prev, ...newTracks]);
      setCurrentPage(nextPage);
      setHasMoreTracks(endIndex < defaultTrackIds.length);
    } else if (!searchQuery.trim()) {
      const newTracks = await fetchTracks(nextPage, tracksPerPage, activeFilters, sortBy);
      setDisplayedTracks(prev => [...prev, ...newTracks]);
      setCurrentPage(nextPage);
      setHasMoreTracks(newTracks.length === tracksPerPage);
    } else {
      const moreTracks = await fetchTracks(nextPage, tracksPerPage, activeFilters, sortBy);
      if (moreTracks.length > 0) {
        setDisplayedTracks(prev => [...prev, ...moreTracks]);
        setCurrentPage(nextPage);
        if (moreTracks.length < tracksPerPage) {
          setHasMoreTracks(false);
        }
      } else {
        setHasMoreTracks(false);
      }
    }
  };

  const cleanTitle = (filename: string) => {
    if (!filename) return 'Unknown Track';
    const noExt = filename.replace(/\.(mp3|wav|aif|aiff|m4a|ogg|flac)\s*$/i, '').trim();
    const cleaned = noExt.replace(/^\d+\s*-?\s*/, '').trim();
    return cleaned.length > 0 ? cleaned : noExt;
  };

  const handlePlayPause = (track: Track, source?: 'top' | 'browse' | 'playlist') => {
    const effectiveSource = source || currentSource;
    if (source) setCurrentSource(source);
    
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const queue = effectiveSource === 'top' ? trendingTracks : displayedTracks;
      playTrack(track, queue, effectiveSource || undefined);
    }
  };

  const handleSeek = (track: Track, percentage: number) => {
    if (currentTrack?.id === track.id) {
       setIsCurrentPreviewDormant(true);
       setPendingSeek(percentage);
    } else {
       const queue = currentSource === 'top' ? trendingTracks : displayedTracks;
       playTrack(track, queue, currentSource || undefined);
       setIsCurrentPreviewDormant(true);
       setPendingSeek(percentage);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col w-full min-h-screen pt-[88px] bg-[#fafafa] text-black relative">
      {playlistUrlId && (
        <PlaylistIsland 
          id={playlistUrlId}
          onClose={() => {
            searchParams.delete('playlist');
            setSearchParams(searchParams);
          }}
          progress={progress}
          handleSeek={handleSeek}
          formatTime={formatTime}
          newMusicTrackIds={newMusicTrackIds}
          trendingTrackIds={trendingTrackIds}
        />
      )}
      
      <div className="w-full flex flex-col xl:flex-row px-8 pt-12 pb-12 gap-12">
        
        {loading ? (
          <div className="w-full xl:w-[420px] flex flex-col shrink-0">
            <h2 className="text-[22px] font-medium uppercase tracking-tighter mb-6 text-black">Latest & Greatest</h2>
            <div className="flex flex-col p-2 -ml-2 -mt-2 w-full">
              <div className="relative w-full flex-1 min-h-0 flex items-center justify-center mb-6">
                 <div className="relative h-full aspect-[1.15]">
                   <div className="absolute top-0 right-0 h-[85%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                   <div className="absolute top-[5%] right-[10%] h-[85%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                   <div className="absolute top-[10%] left-0 h-[85%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                 </div>
              </div>
              <div className="flex flex-col px-2 pb-2 gap-3 mt-2 shrink-0">
                <div className="h-6 bg-[#e5e5e5] rounded w-3/4 animate-pulse" />
                <div className="h-5 bg-[#e5e5e5] rounded w-1/2 animate-pulse" />
              </div>
            </div>
          </div>
        ) : newMusicPlaylist && (
          <div className="w-full xl:w-[420px] flex flex-col shrink-0">
            <h2 className="text-[22px] font-medium uppercase tracking-tighter mb-6 text-black">Latest & Greatest</h2>
            <div 
              className="flex flex-col bg-transparent hover:bg-[#f6f6f6] p-2 -ml-2 -mt-2 rounded-[32px] group cursor-pointer w-full h-full transition-all duration-300 border border-transparent hover:border-black/5"
              onClick={() => setSearchParams({ playlist: newMusicPlaylist.id })}
            >
              <div className="relative w-full flex-1 min-h-0 flex items-center justify-center mb-6">
                 <div className="relative h-full aspect-[1.15]">
                   <PlaylistArtwork playlist={newMusicPlaylist} className="absolute top-0 right-0 h-[85%] aspect-square shadow-md hover:scale-[1.02] transition-transform cursor-pointer z-0" />
                   <PlaylistArtwork playlist={newMusicPlaylist} className="absolute top-[5%] right-[10%] h-[85%] aspect-square shadow-md hover:scale-[1.02] transition-transform cursor-pointer z-10" />
                   <PlaylistArtwork playlist={newMusicPlaylist} className="absolute top-[10%] left-0 h-[85%] aspect-square shadow-xl hover:scale-[1.02] transition-transform cursor-pointer z-20" />
                 </div>
              </div>
              <div className="flex flex-col px-2 pb-2 shrink-0">
                <span className="font-medium text-[24px] text-black">{newMusicPlaylist.title}</span>
                <span className="font-sans text-[15px] text-black/50 mt-1">{newMusicPlaylist.track_count} tracks</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-grow flex gap-8 min-w-0">
          {loading ? (
             <>
               <div className="flex-[2] flex flex-col min-w-0">
                 <h2 className="text-[22px] font-medium uppercase tracking-tighter mb-6 text-black">Trending tracks</h2>
                 <div className="w-full">
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6 content-start pb-4">
                     {[...Array(15)].map((_, i) => (
                       <div key={i} className="flex items-center gap-4 p-2 -ml-2 rounded select-none">
                         <div className="w-12 h-12 rounded relative overflow-hidden shrink-0 bg-[#e5e5e5] animate-pulse" />
                         <div className="flex flex-col gap-2 w-full max-w-[160px]">
                           <div className="h-3.5 bg-[#e5e5e5] rounded w-3/4 animate-pulse" />
                           <div className="h-2.5 bg-[#e5e5e5] rounded w-1/2 animate-pulse" />
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             </>
          ) : (
            <>
              <div className="flex-[2] flex flex-col min-w-0">
                <h2 className="text-[22px] font-medium uppercase tracking-tighter mb-6 text-black">Trending tracks</h2>
                
                {trendingTracks.length === 0 ? (
                  <div className="font-sans text-[11px] uppercase tracking-widest text-black/30">Nessuna traccia trovata.</div>
                ) : (
                  <div className="w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4 content-start pb-4">
                    {trendingTracks.slice(0, 15).map((track, i) => {
                      const isThisPlaying = currentTrack?.file_name === track.file_name && isPlaying;
                      return (
                        <div 
                          key={i} 
                          className="flex items-center gap-4 group cursor-pointer hover:bg-black/5 p-2 -ml-2 rounded transition-colors select-none"
                          onClick={() => handlePlayPause(track, 'top')}
                        >
                          <div className={`w-12 h-12 rounded relative overflow-hidden flex items-center justify-center shrink-0 bg-black/5`}>
                            <TrackArtwork track={track} className="absolute inset-0 w-full h-full" />
                            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              {isThisPlaying ? <Pause className="w-5 h-5 fill-white text-white" /> : <Play className="w-5 h-5 fill-white text-white" style={{ transform: 'translateX(4.166%)' }} />}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-[#facc15] text-black w-[14px] h-[14px] rounded-tl flex items-center justify-center z-10 pointer-events-none">
                              <TrendingUp className="w-2.5 h-2.5" strokeWidth={3} />
                            </div>
                          </div>
                          <div className="flex flex-col overflow-hidden w-full">
                            <div 
                              className="font-medium text-[14px] truncate text-black/90 hover:underline underline-offset-2 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setSelectedTrackForDetails(track); }}
                            >
                              {cleanTitle(track.file_name)}
                            </div>
                            <div className="font-sans text-[12px] text-black/50 flex items-center gap-1 mt-0.5">
                               {DEFAULT_ARTIST}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>


      <div className="w-full px-8 pt-0 pb-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[22px] font-medium uppercase tracking-tighter text-black">Featured playlists</h2>
          <button 
            onClick={() => navigate('/playlists')}
            className="font-sans text-[11px] uppercase tracking-widest text-black/50 hover:text-black flex items-center gap-0.5 transition-colors"
          >
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="w-full overflow-x-auto pb-8 hide-scrollbar">
          <div className="flex gap-6 min-w-max px-8">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col p-4 rounded-[32px] shrink-0 w-[340px]">
                  <div className="relative w-full aspect-[1.15] mb-6">
                     <div className="absolute top-0 right-0 w-[72%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                     <div className="absolute top-0 right-[9%] w-[72%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                     <div className="absolute top-0 right-[18%] w-[72%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                     <div className="absolute top-0 left-0 w-[72%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                  </div>
                  <div className="flex flex-col px-2 pb-2 gap-2 mt-2">
                    <div className="h-5 bg-[#e5e5e5] rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-[#e5e5e5] rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              playlists.filter(pl => pl.is_featured).map((pl) => (
                <div 
                  key={pl.id} 
                className="flex flex-col bg-transparent hover:bg-[#f6f6f6] p-4 rounded-[32px] group cursor-pointer shrink-0 w-[340px] transition-all duration-300 border border-transparent hover:border-black/5"
                onClick={() => setSearchParams({ playlist: pl.id })}
              >
                <div className="relative w-full aspect-[1.15] mb-6">
                   <PlaylistArtwork playlist={pl} className="absolute top-0 right-0 w-[78%] aspect-square shadow-md hover:scale-[1.02] transition-transform cursor-pointer z-0" />
                   <PlaylistArtwork playlist={pl} className="absolute top-[3%] right-[11%] w-[78%] aspect-square shadow-md hover:scale-[1.02] transition-transform cursor-pointer z-10" />
                   <PlaylistArtwork playlist={pl} className="absolute top-[6%] left-0 w-[78%] aspect-square shadow-xl hover:scale-[1.02] transition-transform cursor-pointer z-20" />
                </div>
                <div className="flex flex-col px-2 pb-2">
                  <span className="font-medium text-[18px] text-black">{pl.title}</span>
                  <span className="font-sans text-[13px] text-black/50 mt-0.5">{pl.track_count} tracks</span>
                </div>
              </div>
            ))
            )}

          </div>
        </div>
      </div>

      <div id="main-search-bar" className="scroll-mt-[74px] md:scroll-mt-[82px]" />
      <div 
        className={`sticky top-[74px] md:top-[82px] z-40 bg-[#fafafa]/85 backdrop-blur-xl w-full px-8 flex flex-col border-b border-black/10 py-6 shadow-sm focus-within:border-black/30 transition-[bottom] duration-500 ease-out group/searchbar ${currentTrack ? 'bottom-[90px]' : 'bottom-0'} ${playlistUrlId ? 'hidden' : ''}`}
      >
        <div className="flex items-center w-full">
          <div className="cursor-pointer group-hover/searchbar:text-black/80 group-focus-within/searchbar:text-black transition-colors z-10" onClick={() => executeSearch()}>
            <Search className={`w-5 h-5 mr-4 shrink-0 transition-colors ${isSearching ? 'text-black animate-pulse' : 'text-black/50'}`} />
          </div>
          
          <div className="relative flex-grow flex items-center">
            <input 
              type="text" 
              placeholder="DESCRIBE THE MUSIC YOU NEED..." 
              className="w-full bg-transparent outline-none font-medium uppercase text-[13px] tracking-widest placeholder:text-black/30 text-black relative z-10"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsTypingSearch(true);
                if (e.target.value.trim() !== '') {
                  setActiveFilters({ genre: [], subgenre: [], moods: [], instruments: [], textures: [], scenarios: [], human_tags: [], energy_level: [], movement: [], shadow_tags: [] });
                  setExpandedCategory(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  executeSearch();
                  document.getElementById('main-search-bar')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />
            
            <div className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none z-0">
              <span className="invisible whitespace-pre font-medium uppercase text-[13px] tracking-widest">{searchQuery}</span>
              {!isSearching && isTypingSearch && searchQuery.trim() !== '' && (
                <span className="ml-2 text-[10px] uppercase font-medium text-black/40 tracking-widest animate-pulse whitespace-nowrap">Press Enter ↵</span>
              )}
              {isSearching && (
                <span className="ml-2 text-[10px] uppercase font-medium text-black/40 tracking-widest animate-pulse whitespace-nowrap">Thinking...</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 ml-6 shrink-0 z-10 relative">
            <div className="w-[1px] h-4 bg-black/10" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium tracking-widest uppercase text-black/40">Sort</span>
              <button 
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-black outline-none cursor-pointer"
              >
                {sortBy === 'relevance' ? 'Relevance' : sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'most_played' ? 'Most Played' : sortBy === 'a-z' ? 'A-Z' : 'Z-A'}
                <svg className={`w-3 h-3 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isSortDropdownOpen && (
                <div className="absolute top-full left-0 mt-4 w-48 bg-white border border-black/10 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                  {[
                    { id: 'relevance', label: 'Relevance' },
                    { id: 'newest', label: 'Newest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'most_played', label: 'Most Played' },
                    { id: 'a-z', label: 'A-Z' },
                    { id: 'z-a', label: 'Z-A' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortBy(opt.id); setIsSortDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-[11px] font-medium uppercase tracking-widest transition-colors flex items-center gap-2 ${sortBy === opt.id ? 'bg-black/5 text-black' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
                    >
                      {sortBy === opt.id ? <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <div className="w-3 h-3 shrink-0" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="w-[1px] h-4 bg-black/10" />

            <div className="flex items-center gap-3 cursor-pointer group/preview" onClick={() => setIsPreviewMode(!isPreviewMode)}>
              <span className={`text-[10px] font-medium tracking-widest uppercase transition-colors ${isPreviewMode ? 'text-black group-hover/preview:text-black/70' : 'text-black/30 group-hover/preview:text-black/60'}`}>Preview</span>
              <div 
                className={`preview-toggle w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center shadow-inner ${isPreviewMode ? 'bg-[#111111] group-hover/preview:bg-[#333]' : 'bg-[#e0e0e0] group-hover/preview:bg-[#d0d0d0]'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${isPreviewMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Active filter chips below search bar */}
        {totalActiveFilterCount > 0 && (
          <div className="w-full pt-4 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-medium uppercase tracking-widest text-black/40 mr-1">Filtering:</span>
            {FILTER_CATEGORIES.map(cat =>
              (activeFilters[cat.key] as string[] || []).map(val => (
                <button
                  key={`${cat.key}-${val}`}
                  onClick={() => toggleFilter(cat.key, val)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-black text-white text-[10px] font-medium uppercase tracking-wider rounded-full hover:bg-black/70 transition-colors"
                >
                  {val}
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              ))
            )}
            {(activeFilters.shadow_tags as string[] || []).map(val => (
              <button
                key={`shadow-${val}`}
                onClick={() => setActiveFilters(prev => ({ ...prev, shadow_tags: (prev.shadow_tags as string[]).filter(t => t !== val) }))}
                className="flex items-center gap-1.5 px-3 py-1 bg-black text-white text-[10px] font-medium uppercase tracking-wider rounded-full hover:bg-black/70 transition-colors"
              >
                {val}
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            ))}
            <button onClick={() => setActiveFilters({ genre: [], subgenre: [], moods: [], instruments: [], textures: [], scenarios: [], human_tags: [], energy_level: [], movement: [], shadow_tags: [] })} className="text-[10px] font-medium uppercase tracking-wider text-black/40 hover:text-black underline ml-2 transition-colors">Clear all</button>
          </div>
        )}
      </div>

      <div className="w-full pb-16 pt-8 relative" id="full-catalog-browser">

        <div className="flex w-full px-4 md:px-8 gap-8 relative min-h-screen pb-20">
          
          <div className={`hidden md:flex flex-col shrink-0 sticky top-[170px] h-[calc(100vh-190px)] z-30 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${expandedCategory ? 'w-[380px]' : 'w-[130px]'}`}>
            
            <div className="flex w-full h-full relative">
              
              <div className="w-[130px] flex flex-col gap-1 shrink-0 relative z-20 bg-[#fafafa]">
                {FILTER_CATEGORIES.map(category => {
                  const count = (activeFilters[category.key] as string[])?.length || 0;
                  const isExpanded = expandedCategory === category.key;
                  
                  return (
                    <button 
                      key={category.key}
                      onClick={() => { setExpandedCategory(isExpanded ? null : category.key); setFilterSearch(''); }}
                      className={`w-full text-left px-3 h-[38px] shrink-0 rounded-lg text-[11px] font-medium uppercase tracking-widest flex items-center justify-between transition-colors ${isExpanded ? 'bg-black text-white' : 'hover:bg-black/5 text-black/60 hover:text-black'}`}
                    >
                      <span>{category.title}</span>
                      {count > 0 ? (
                        <span className={`w-[18px] h-[18px] shrink-0 flex items-center justify-center rounded-full text-[9px] transition-colors ${isExpanded ? 'bg-white text-black' : 'bg-black text-white'}`}>
                          {count}
                        </span>
                      ) : (
                        <span className="w-[18px] h-[18px] shrink-0 opacity-0 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
                
                <button 
                  onClick={clearAllFilters}
                  className={`w-full text-left px-3 mt-2 h-[32px] shrink-0 text-[10px] transition-colors underline font-medium uppercase tracking-widest flex items-center ${
                    totalActiveFilterCount > 0
                      ? 'text-black/50 hover:text-black pointer-events-auto'
                      : 'opacity-0 pointer-events-none'
                  }`}
                >
                  Clear Filters
                </button>
              </div>

              <div className={`absolute left-[130px] top-0 bottom-0 w-[250px] pl-6 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${expandedCategory ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8 pointer-events-none'}`}>
                {expandedCategory && (() => {
                  const cat = FILTER_CATEGORIES.find(c => c.key === expandedCategory);
                  if (!cat) return null;
                  const filteredOpts = filterSearch
                    ? cat.options.filter(o => o.value.toLowerCase().includes(filterSearch.toLowerCase()))
                    : cat.options;
                  return (
                    <div className="flex flex-col h-full w-full">
                      {/* Search within filter */}
                      <div className="relative mb-3 shrink-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black/40" />
                        <input
                          type="text"
                          placeholder={`Search ${cat.title}...`}
                          value={filterSearch}
                          onChange={e => setFilterSearch(e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 bg-black/5 border border-black/10 rounded-lg text-[11px] focus:outline-none focus:border-black/30 transition-colors"
                        />
                      </div>
                      <div className="text-black/40 text-[10px] font-medium uppercase tracking-widest mb-3 shrink-0">Select {cat.title}</div>
                      <div className="flex flex-col gap-2.5 overflow-y-auto pb-24 pr-2 hide-scrollbar">
                        {filteredOpts.map(opt => {
                          const isActive = (activeFilters[expandedCategory] as string[])?.includes(opt.value);
                          return (
                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleFilter(expandedCategory, opt.value)}>
                              <div className={`w-4 h-4 shrink-0 rounded flex items-center justify-center transition-colors border ${isActive ? 'bg-black border-black' : 'border-black/20 group-hover:border-black/50'}`}>
                                {isActive && <div className="w-2 h-2 bg-white rounded-sm" />}
                              </div>
                              <span className={`text-[11px] transition-colors whitespace-normal leading-tight flex-1 ${isActive ? 'text-black font-medium' : 'text-black/70 group-hover:text-black'}`}>{opt.value}</span>
                              <span className="text-[9px] text-black/30 shrink-0 font-mono">{opt.count}</span>
                            </label>
                          );
                        })}
                        {filteredOpts.length === 0 && <div className="text-[11px] text-black/30 py-4">No results</div>}
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>

          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex flex-col gap-1 mb-8">
            {loading || !isInitialTracksLoaded || isTypingSearch || isSearching ? (
              [...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2 rounded-xl">
                  <div className="w-10 h-10 rounded-lg shrink-0 bg-[#e5e5e5] animate-pulse" />
                  <div className="flex flex-col gap-2 w-[20%] shrink-0 pr-4">
                    <div className="h-3.5 bg-[#e5e5e5] rounded w-3/4 animate-pulse" />
                    <div className="h-2.5 bg-[#e5e5e5] rounded w-1/2 animate-pulse" />
                  </div>
                  <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%]">
                    <div className="h-5 w-12 bg-[#e5e5e5] rounded animate-pulse" />
                    <div className="h-5 w-16 bg-[#e5e5e5] rounded animate-pulse" />
                  </div>
                  <div className="hidden md:flex flex-grow h-8 items-center pr-4">
                    <div className="h-3 w-full bg-[#e5e5e5] rounded animate-pulse opacity-50" />
                  </div>
                  <div className="hidden md:flex items-center justify-end gap-5 pr-4 shrink-0 w-[140px]">
                    <div className="w-8 h-2.5 bg-[#e5e5e5] rounded animate-pulse" />
                    <div className="w-4 h-4 bg-[#e5e5e5] rounded-full animate-pulse" />
                    <div className="w-4 h-4 bg-[#e5e5e5] rounded-full animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              displayedTracks.map((track) => (
              <React.Fragment key={track.id}>
              <div 
              className="flex items-center gap-4 hover:bg-[#f6f6f6] p-2 rounded-xl group transition-colors cursor-pointer select-none"
              onClick={() => handlePlayPause(track, 'browse')}
            >
              <div 
                className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-lg relative overflow-hidden bg-black/5`}
              >
                <TrackArtwork track={track} className="absolute inset-0 w-full h-full" />
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === track.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="w-4 h-4 fill-white text-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white text-white" style={{ transform: 'translateX(4.166%)' }} />
                  )}
                </div>
                {trendingTrackIds.has(track.id) && (
                  <div className="absolute bottom-0 right-0 bg-[#facc15] text-black w-3 h-3 rounded-tl flex items-center justify-center z-10 pointer-events-none">
                    <TrendingUp className="w-2 h-2" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center w-[20%] shrink-0 pr-4">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div 
                    className="font-medium truncate text-[14px] hover:underline underline-offset-2 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setSelectedTrackForDetails(track); }}
                  >
                    {cleanTitle(track.file_name)}
                  </div>
                  {(track.created_at || track.release_date) && (new Date().getTime() - new Date(track.created_at || track.release_date || 0).getTime() < 14 * 24 * 60 * 60 * 1000) && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700 uppercase tracking-widest shrink-0">New</span>
                  )}
                </div>
                <div className="font-sans text-[12px] text-black/50 mt-0.5">
                  {track.composers ? (Array.isArray(track.composers) ? track.composers.join(', ') : track.composers) : DEFAULT_COMPOSERS.join(', ')}
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%] overflow-hidden">
                {(() => {
                  const human = parseTags((track as any).human_tags);
                  const subgenres = parseTags(track.subgenre);
                  const moods = parseTags(track.moods);
                  const scenarios = parseTags(track.scenarios);
                  
                  const tagMap = [
                    ...human.map(t => ({ category: 'human_tags', val: t })),
                    ...subgenres.map(t => ({ category: 'subgenre', val: t })),
                    ...moods.map(t => ({ category: 'moods', val: t })),
                    ...scenarios.map(t => ({ category: 'scenarios', val: t }))
                  ];
                  
                  const uniqueTags: typeof tagMap = [];
                  const seen = new Set();
                  for (const obj of tagMap) {
                    if (!seen.has(obj.val)) {
                      seen.add(obj.val);
                      uniqueTags.push(obj);
                    }
                  }
                  
                  const tags = uniqueTags.slice(0, 2);
                  
                  if (tags.length === 0) return <span className="text-[10px] text-black/30 font-medium uppercase tracking-widest">Tagging...</span>;

                  return tags.map((t, idx) => (
                    <span 
                      key={idx} 
                      onClick={e => handleTagClick(t.category, t.val, e)} 
                      className="px-2 py-1 bg-black/5 hover:bg-black/10 rounded text-[10px] font-medium text-black/60 hover:text-black uppercase tracking-widest whitespace-nowrap cursor-pointer transition-colors"
                    >
                      {t.val}
                    </span>
                  ));
                })()}
              </div>

              {/* WAVEFORM Column */}
              <div className="hidden md:flex flex-grow h-8 items-center pr-4 opacity-70 group-hover:opacity-100 transition-opacity">
                <WaveformView 
                  data={parseWaveform(track.waveform_data)} 
                  isPlaying={currentTrack?.id === track.id && isPlaying} 
                  progress={currentTrack?.id === track.id ? progress : 0} 
                  onSeek={(percentage) => handleSeek(track, percentage)}
                  previewStartPct={isPreviewMode ? getPreviewTimings(track)?.startPct : undefined}
                  previewEndPct={isPreviewMode ? getPreviewTimings(track)?.endPct : undefined}
                />
              </div>

              <div className="hidden md:flex items-center justify-end gap-2 pr-4 shrink-0 w-auto">
                <TrackActionButtons trackId={track.id} />
                <div className="text-[11px] font-sans font-medium text-black/40 tracking-wider w-10 text-right mr-2">
                  {track.duration ? formatTime(track.duration) : '0:00'}
                </div>
                <div className="w-[50px] flex justify-center shrink-0">
                  {track.versions && track.versions.length > 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExpandedTrackId(expandedTrackId === track.id ? null : track.id); }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors ${expandedTrackId === track.id ? 'bg-black/10 text-black' : 'text-black/40 hover:bg-black/5 hover:text-black'}`}
                      title={`${track.versions.length} alternative versions`}
                    >
                      <Layers className="w-4 h-4" />
                      <span className="font-medium text-[11px] font-sans">{track.versions.length}</span>
                    </button>
                  )}
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-black/10 rounded hover:border-black/30 transition-colors bg-white font-sans text-[11px] uppercase tracking-widest text-black" onClick={e => { e.stopPropagation(); openDownloadModal(track, e); }}>
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                {settings.free_watermarks_enabled && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-black/90 transition-colors font-sans text-[11px] uppercase tracking-widest" onClick={e => { e.stopPropagation(); openLicenseModal(track); }}>
                    <ShoppingBag className="w-3.5 h-3.5" /> License
                  </button>
                )}
              </div>
            </div>
            
            {/* VERSIONS EXPANDED VIEW */}
            {expandedTrackId === track.id && track.versions && track.versions.length > 0 && (
              <div className="pl-12 pr-2 py-2 mt-1 mb-2 border-l-[3px] border-black/5 ml-[22px] space-y-1 relative">
                {track.versions.map(version => (
                  <div 
                    key={version.id} 
                    className="flex items-center gap-4 hover:bg-[#f6f6f6] p-2 rounded-xl group/version transition-colors cursor-pointer select-none"
                    onClick={() => handlePlayPause(version, 'browse')}
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg relative overflow-hidden bg-black/5">
                      <TrackArtwork track={version} className="absolute inset-0 w-full h-full" />
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === version.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover/version:opacity-100'}`}>
                        {currentTrack?.id === version.id && isPlaying ? (
                          <Pause className="w-3 h-3 fill-white text-white" />
                        ) : (
                          <Play className="w-3 h-3 fill-white text-white" style={{ transform: 'translateX(4.166%)' }} />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col w-[20%] shrink-0 pr-4">
                      <div 
                        className="font-medium text-[13px] truncate hover:underline underline-offset-2 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setSelectedTrackForDetails(version); }}
                      >
                        {cleanTitle(version.file_name)}
                      </div>
                      <div className="font-sans text-[10px] text-black/40 uppercase tracking-widest mt-0.5">Version</div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%]" />
                    <div className="hidden md:flex flex-grow h-6 items-center opacity-70 group-hover/version:opacity-100 transition-opacity pr-4">
                      <WaveformView 
                        data={parseWaveform(version.waveform_data)} 
                        isPlaying={currentTrack?.id === version.id && isPlaying} 
                        progress={currentTrack?.id === version.id ? progress : 0} 
                        onSeek={(percentage) => handleSeek(version, percentage)}
                        previewStartPct={isPreviewMode ? getPreviewTimings(version)?.startPct : undefined}
                        previewEndPct={isPreviewMode ? getPreviewTimings(version)?.endPct : undefined}
                      />
                    </div>
                    <div className="hidden md:flex items-center justify-end gap-2 pr-4 shrink-0 w-auto">
                      <TrackActionButtons trackId={version.id} />
                      <div className="text-[11px] font-sans font-medium text-black/40 tracking-wider w-10 text-right mr-2">
                        {version.duration ? formatTime(version.duration) : '0:00'}
                      </div>
                      {currentTrack?.id !== version.id && (
                        <button className="flex items-center gap-2 px-3 py-1.5 border border-black/10 rounded hover:border-black/30 transition-colors bg-white font-sans text-[10px] uppercase tracking-widest text-black" onClick={e => { e.stopPropagation(); openDownloadModal(version, e); }}>
                          <Download className="w-3 h-3" /> Get
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </React.Fragment>
            ))
            )}
          {displayedTracks.length === 0 && !loading && (
            <div className="py-16 text-center text-black/40 text-xs">
              No tracks found matching "{searchQuery}"
            </div>
          )}
        </div>

          {hasMoreTracks && !searchQuery.trim() && isInitialTracksLoaded && (
            <div className="flex items-center justify-center mt-12 pb-12">
              <button 
                onClick={handleLoadMore}
                className="px-8 py-3 bg-black text-white rounded-full text-xs font-medium uppercase tracking-widest hover:scale-105 transition-transform"
              >
                Load more
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

    </div>
  );
}
