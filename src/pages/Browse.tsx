import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, fetchTracks, searchTracksIntelligent, searchTracksByEmbedding, fetchPlaylists, fetchTrendingTracks, fetchPlaylistTrackIds, fetchFilterOptions, fetchPlaylistTracks, fetchSuggestedTracks } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import { useDownload } from '../context/DownloadContext';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { parseWaveform, getPreviewTimings } from '../lib/audioUtils';
import { ChevronLeft, ChevronRight, ChevronDown, Search, TrendingUp, Play, Pause, Download, ShoppingBag, Layers, Plus, Heart, X, Loader2 } from 'lucide-react';
import Footer from '../components/Footer';
import PlaylistIsland from '../components/PlaylistIsland';
import PlaylistArtwork from '../components/PlaylistArtwork';
import TrackActionButtons from '../components/TrackActionButtons';
import { getComposers } from '../utils/trackUtils';
import SidebarPlaylist from '../components/SidebarPlaylist';
import { useUserPlaylists } from '../context/UserPlaylistsContext';

import WaveformView from '../components/WaveformView';
import { smoothScroll } from '../utils/scrollUtils';
import { usePlayer } from '../context/PlayerContext';
import { DEFAULT_ARTWORK, DEFAULT_COMPOSERS, DEFAULT_ARTIST } from '../config';
import TrackArtwork from '../components/TrackArtwork';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';



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
  genre?: string[];
  moods?: string[];
  instruments?: string[];
  functions?: string[];
  music_for?: string[];
  character?: string[];
  arrangement?: string[];
  movement?: string[];
  tempo?: string[];
  waveform_data?: number[];
  artwork_url?: string;
  composers?: string[];
  play_count?: number;
  versions?: Track[];
  description?: string;
};

const ScrollArrows = ({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
      }
    };

    checkScroll();
    
    // Slight delay to ensure content is fully rendered
    setTimeout(checkScroll, 100);

    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      const observer = new ResizeObserver(checkScroll);
      observer.observe(el);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        observer.disconnect();
      };
    }
  }, [scrollRef]);

  return (
    <>
      <button 
        className={`absolute left-12 top-1/2 -translate-y-1/2 w-10 h-10 no-radius rounded-full bg-white border border-black/10 shadow-lg flex items-center justify-center text-black/50 hover:text-black hover:bg-white z-30 transition-all ${canScrollLeft ? 'opacity-0 group-hover/section:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ borderRadius: '50%' }}
        onClick={(e) => {
          e.stopPropagation();
          smoothScroll(scrollRef.current, -600, 600);
        }}
      >
        <ChevronLeft className="w-5 h-5 -ml-0.5" />
      </button>
      <button 
        className={`absolute right-12 top-1/2 -translate-y-1/2 w-10 h-10 no-radius rounded-full bg-white border border-black/10 shadow-lg flex items-center justify-center text-black/50 hover:text-black hover:bg-white z-30 transition-all ${canScrollRight ? 'opacity-0 group-hover/section:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ borderRadius: '50%' }}
        onClick={(e) => {
          e.stopPropagation();
          smoothScroll(scrollRef.current, 600, 600);
        }}
      >
        <ChevronRight className="w-5 h-5 ml-0.5" />
      </button>
    </>
  );
};

const parseTags = (t: string[] | string | undefined): string[] => {
  if (!t) return [];
  let arr: any[] = [];
  if (Array.isArray(t)) {
    arr = t;
  } else {
    try { 
      arr = JSON.parse(t); 
      if (!Array.isArray(arr)) arr = [arr];
    } catch(e) { 
      arr = typeof t === 'string' ? t.split(',') : []; 
    }
  }
  return arr.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim());
};

type FilterOption = { value: string; count: number };
type FilterOptions = {
  genre: FilterOption[];
  moods: FilterOption[];
  instruments: FilterOption[];
  functions: FilterOption[];
  music_for: FilterOption[];
  character: FilterOption[];
  arrangement: FilterOption[];
  movement: FilterOption[];
  tempo: FilterOption[];
};

export default function Browse() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const playlistUrlId = searchParams.get('playlist');
  const tagFromPlaylist = searchParams.get('tag');
  
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [suggestedTracks, setSuggestedTracks] = useState<Track[]>([]);
  const [displayedTracks, setDisplayedTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newMusicPlaylist, setNewMusicPlaylist] = useState<any | null>(null);
  const [newMusicTrackIds, setNewMusicTrackIds] = useState<Set<string>>(new Set());

  const trendingTrackIds = useMemo(() => new Set(trendingTracks.map(t => t.id)), [trendingTracks]);
  const [loading, setLoading] = useState(true);
  const [isInitialTracksLoaded, setIsInitialTracksLoaded] = useState(false);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);
  const urlQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [isTypingSearch, setIsTypingSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery !== urlQuery) {
      setSearchQuery(urlQuery);
      setIsTypingSearch(true);
      setSortBy('relevance');
    }
  }, [urlQuery]);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({
    genre: [], subgenre: [], moods: [], instruments: [], textures: [], scenarios: [], human_tags: [], energy_level: [], movement: [], shadow_tags: []
  });

  // A tag clicked inside a playlist arrives through the URL. Turn it into the
  // same shadow-tag filter used for in-place Browse tag clicks.
  useEffect(() => {
    if (!tagFromPlaylist) return;

    setActiveFilters(prev => {
      const tags = (prev.shadow_tags as string[]) || [];
      return tags.includes(tagFromPlaylist)
        ? prev
        : { ...prev, shadow_tags: [...tags, tagFromPlaylist] };
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('tag');
    setSearchParams(nextParams, { replace: true });
  }, [tagFromPlaylist, searchParams, setSearchParams]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filterSearch, setFilterSearch] = useState(''); // search within filter panel

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [expandedTags, setExpandedTags] = useState<{trackId: string, tags: any[]} | null>(null);
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(null);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const expandedTagsRef = useRef<HTMLDivElement>(null);
  const topPicksRef = useRef<HTMLDivElement>(null);
  const trendingRef = useRef<HTMLDivElement>(null);
  const suggestedRef = useRef<HTMLDivElement>(null);



  const FILTER_CATEGORIES = useMemo(() => [
    { title: 'Genre',       key: 'genre',        options: filterOptions?.genre || [] },
    { title: 'Mood',        key: 'moods',        options: filterOptions?.moods || [] },
    { title: 'Music For',   key: 'music_for',    options: filterOptions?.music_for || [] },
    { title: 'Function',    key: 'functions',    options: filterOptions?.functions || [] },
    { title: 'Character',   key: 'character',    options: filterOptions?.character || [] },
    { title: 'Arrangement', key: 'arrangement',  options: filterOptions?.arrangement || [] },
    { title: 'Movement',    key: 'movement',     options: filterOptions?.movement || [] },
    { title: 'Instruments', key: 'instruments',  options: filterOptions?.instruments || [] },
    { title: 'Tempo',       key: 'tempo',        options: filterOptions?.tempo || [] },
  ], [filterOptions]);
  
  const { playTrack, playPlaylist, currentTrack, isPlaying, togglePlay, setProgress, progress, setPendingSeek, isPreviewMode, setIsPreviewMode, setFallbackPlaylist, currentSource, setCurrentSource, setIsCurrentPreviewDormant, currentPlaylist, setCurrentPlaylist, setSelectedTrackForDetails } = usePlayer();
  const { openDownloadModal } = useDownload();
  const { openLicenseModal } = useLicense();
  const { user, profile, setLoginModalOpen } = useAuth();
  const { settings } = useSettings();
  
  const { playlists: userPlaylists, favoritesPlaylist, createPlaylist, addTrackToPlaylist } = useUserPlaylists();
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isBulkDownloadDropdownOpen, setIsBulkDownloadDropdownOpen] = useState(false);
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [inlineCreateTitle, setInlineCreateTitle] = useState('');
  const [pendingDropTracks, setPendingDropTracks] = useState<string[]>([]);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);


  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [supportsDesktopDrag, setSupportsDesktopDrag] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  const [sortBy, setSortBy] = useState('relevance');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [searchBarPortals, setSearchBarPortals] = useState<{ right: HTMLElement | null; bottom: HTMLElement | null }>({ right: null, bottom: null });
  const [isMyMusicOpen, setIsMyMusicOpen] = useState(true);
  // The desktop sidebar is deliberately hidden below `md`; keep its controls
  // available through a separate phone-only sheet without changing desktop or
  // tablet state/layout.
  const [isMobileBrowseToolsOpen, setIsMobileBrowseToolsOpen] = useState(false);
  const [mobileBrowseToolsSection, setMobileBrowseToolsSection] = useState<'filters' | 'music'>('filters');
  const [mobileExpandedCategory, setMobileExpandedCategory] = useState<string | null>(null);
  const [mobileFilterSearch, setMobileFilterSearch] = useState('');
  const [isMobileInlineCreating, setIsMobileInlineCreating] = useState(false);
  const [mobileCreateTitle, setMobileCreateTitle] = useState('');
  const [isMobileCreatingPlaylist, setIsMobileCreatingPlaylist] = useState(false);
  const mobileBrowseToolsCloseRef = useRef<HTMLButtonElement>(null);
  // Every asynchronous result below is tied to the state that started it.
  // A slower, older request must never replace a newer search/filter result.
  const catalogRequestRef = useRef(0);
  const searchCounter = useRef(0);
  const shadowTagRequestRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  
  // Ref for audio element
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const tracksPerPage = 25;

  useLockBodyScroll(isMobileBrowseToolsOpen);

  // Native drag-and-drop competes with Safari's tap and scroll recognition.
  // It remains available on the unchanged tablet/desktop experience only.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const sync = () => setSupportsDesktopDrag(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  // Browse stays mounted underneath the Discover/Browse transition. If the
  // route changes while the phone sheet is open, explicitly dismiss it so a
  // hidden Browse control can never keep the body locked over Discover.
  useEffect(() => {
    if (location.pathname.startsWith('/browse')) return;

    setIsMobileBrowseToolsOpen(false);
    setIsMobileInlineCreating(false);
    setMobileCreateTitle('');
  }, [location.pathname]);

  // GlobalSearchBar owns these DOM targets. Browse can mount before that bar
  // has committed (especially after auth/session hydration), so resolve them
  // after each route change instead of querying once during render.
  useEffect(() => {
    if (!location.pathname.startsWith('/browse')) {
      setSearchBarPortals({ right: null, bottom: null });
      return;
    }

    const frame = requestAnimationFrame(() => {
      setSearchBarPortals({
        right: document.getElementById('searchbar-right-portal'),
        bottom: document.getElementById('searchbar-bottom-portal')
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileBrowseToolsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileBrowseToolsOpen(false);
      }
    };

    const focusFrame = requestAnimationFrame(() => {
      mobileBrowseToolsCloseRef.current?.focus();
    });

    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileBrowseToolsOpen]);

  // Avoid leaving a hidden phone-only sheet open (and the body locked) if the
  // viewport grows into the unchanged desktop/tablet layout.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const closeForLargerViewport = () => {
      if (mediaQuery.matches) setIsMobileBrowseToolsOpen(false);
    };

    closeForLargerViewport();
    mediaQuery.addEventListener('change', closeForLargerViewport);
    return () => mediaQuery.removeEventListener('change', closeForLargerViewport);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (expandedTagsRef.current && !expandedTagsRef.current.contains(event.target as Node)) {
        setExpandedTags(null);
      } else if (!expandedTagsRef.current) {
        setExpandedTags(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    async function loadData() {
      try {
        const [pData, tData, fOpts] = await Promise.all([
          fetchPlaylists(),
          fetchTrendingTracks(),
          fetchFilterOptions()
        ]);
        
        if (cancelled) return;

        const newPlaylist = pData?.find((p: any) => p.title.toLowerCase().includes('new music'));
        if (newPlaylist) {
          setNewMusicPlaylist(newPlaylist);
          setPlaylists(pData);
          // This badge data is decorative. Do not make the catalogue wait for
          // an additional round-trip before it can render.
          void fetchPlaylistTrackIds(newPlaylist.id)
            .then(newTrackIds => {
              if (!cancelled) setNewMusicTrackIds(new Set(newTrackIds));
            })
            .catch(error => console.error('Error loading New Music track IDs:', error));
        } else {
          setPlaylists(pData || []);
        }
        
        setTrendingTracks((tData || []) as Track[]);
        if (fOpts) {
          setFilterOptions(fOpts);
        } else {
          setFilterOptions(null);
        }
      } catch (error) {
        console.error("Error loading browse data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggested() {
      if (user?.id) {
        const tracks = await fetchSuggestedTracks(user.id);
        if (!cancelled) setSuggestedTracks(tracks as Track[]);
      } else {
        setSuggestedTracks([]);
      }
    }
    void loadSuggested();
    return () => { cancelled = true; };
  }, [user?.id]);


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
      navigate('/browse');
    };
    window.addEventListener('scrollToBrowse', handleScrollEvent);
    return () => window.removeEventListener('scrollToBrowse', handleScrollEvent);
  }, [navigate]);

  const [shadowTagIds, setShadowTagIds] = useState<string[] | null>(null);

  useEffect(() => {
    const shadowTags = (activeFilters.shadow_tags as string[]) || [];
    const requestId = ++shadowTagRequestRef.current;

    if (shadowTags.length === 0) {
      setShadowTagIds(null);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const resolve = async () => {
      try {
        const results = await Promise.all(shadowTags.map(tag => searchTracksIntelligent(tag)));
        if (cancelled || shadowTagRequestRef.current !== requestId) return;

        const idSets = results.map(textRaw => new Set<string>(textRaw.map((result: any) => result.id)));
        let finalIds = Array.from(idSets[0] || []);
        for (let i = 1; i < idSets.length; i++) {
          finalIds = finalIds.filter(id => idSets[i].has(id));
        }

        setShadowTagIds(finalIds);
      } catch (error) {
        console.error('Error resolving tag filters:', error);
        if (!cancelled && shadowTagRequestRef.current === requestId) {
          // An error must resolve to an empty result, never an endless skeleton.
          setShadowTagIds([]);
        }
      } finally {
        if (!cancelled && shadowTagRequestRef.current === requestId) {
          setIsSearching(false);
        }
      }
    };

    void resolve();
    return () => { cancelled = true; };
  }, [activeFilters.shadow_tags]);

  const totalActiveFilterCount = useMemo(() => {
    let count = 0;
    Object.entries(activeFilters).forEach(([k, v]) => {
      if (Array.isArray(v)) count += v.length;
    });
    return count;
  }, [activeFilters]);

  useEffect(() => {
    const requestId = ++catalogRequestRef.current;
    loadMoreInFlightRef.current = false;
    setIsLoadingMore(false);

    if (loading || searchQuery.trim()) return;

    const shadowTags = (activeFilters.shadow_tags as string[]) || [];
    if (shadowTags.length > 0 && shadowTagIds === null) {
      setIsInitialTracksLoaded(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setIsInitialTracksLoaded(false);

    const loadTracks = async () => {
      try {
        const data = await fetchTracks(1, tracksPerPage, activeFilters, sortBy, shadowTagIds || undefined);

        if (cancelled || catalogRequestRef.current !== requestId) return;

        setDisplayedTracks(data as Track[]);
        setCurrentPage(1);
        setHasMoreTracks(data.length === tracksPerPage);
      } catch (error) {
        console.error('Error loading browse tracks:', error);
        if (!cancelled && catalogRequestRef.current === requestId) {
          setDisplayedTracks([]);
          setHasMoreTracks(false);
        }
      } finally {
        if (!cancelled && catalogRequestRef.current === requestId) {
          setIsInitialTracksLoaded(true);
          setIsTypingSearch(false);
          setIsSearching(false);
        }
      }
    };

    void loadTracks();
    return () => { cancelled = true; };
  }, [searchQuery, loading, activeFilters, sortBy, shadowTagIds]);

  const executeSearch = async (q: string, currentSearchId: number) => {
    if (!q.trim()) return;
    analytics.trackSearch(q);
    
    try {
      // Text/tag matching is available immediately. Showing it first keeps a
      // first mobile search responsive instead of waiting for the optional AI
      // model download and semantic request.
      const textRaw = await searchTracksIntelligent(q);
      const allIds = new Set<string>();
      textRaw.forEach((r: any) => allIds.add(r.id));
      
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
      
      // Only update state if this is still the most recent search
      if (searchCounter.current === currentSearchId) {
        setDisplayedTracks(combined);
        setHasMoreTracks(false);
        setIsSearching(false);
        setIsTypingSearch(false);
        setIsInitialTracksLoaded(true);
      }

      // Semantic results enhance desktop search after useful results are
      // already visible. Phones deliberately skip the 20MB model so taps and
      // scrolling stay responsive on a cellular connection.
      if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
        void (async () => {
          try {
            // Semantic enhancement is useful on larger screens, but its model
            // runtime is several hundred KB. Import it only after a desktop
            // search has settled so Browse remains light and responsive on
            // initial load (especially on phones).
            const { generateEmbedding } = await import('../lib/embedding');
            const vector = await generateEmbedding(q);
            const semanticRaw = await searchTracksByEmbedding(vector);
            if (searchCounter.current !== currentSearchId) return;

            const enhancedIds = new Set(finalIds);
            semanticRaw.forEach((r: any) => enhancedIds.add(r.id));
            let ids = Array.from(enhancedIds);
            if (shadowTagIds) ids = ids.filter(id => shadowTagIds.includes(id));

            const enhanced = ids.length > 0
              ? await fetchTracks(1, tracksPerPage, activeFilters, sortBy, ids) as Track[]
              : [];
            if (searchCounter.current === currentSearchId) setDisplayedTracks(enhanced);
          } catch (semanticError) {
            console.warn('Semantic search enhancement unavailable:', semanticError);
          }
        })();
      }
    } catch (err) {
      console.error('Error during search:', err);
      if (searchCounter.current === currentSearchId) {
        setDisplayedTracks([]);
        setHasMoreTracks(false);
      }
    } finally {
      if (searchCounter.current === currentSearchId) {
        setIsSearching(false);
        setIsTypingSearch(false);
        setIsInitialTracksLoaded(true);
      }
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      // Invalidate a debounced/in-flight search before restoring the normal catalog.
      searchCounter.current += 1;
      return;
    }

    const currentSearchId = ++searchCounter.current;
    setIsTypingSearch(true);
    setIsSearching(true);
    setIsInitialTracksLoaded(false);

    const timeoutId = setTimeout(() => {
      void executeSearch(searchQuery, currentSearchId);
    }, 750);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeFilters, sortBy, shadowTagIds]);

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

    const handleBulkDownload = async (format: 'mp3' | 'wav' = 'mp3') => {
    const allVisibleTracks = [...displayedTracks, ...trendingTracks];
    const selected = allVisibleTracks.filter(t => selectedTrackIds.has(t.id));
    const uniqueSelected = Array.from(new Map(selected.map(t => [t.id, t])).values());
    if (uniqueSelected.length === 0) return;

    const toastId = toast.loading(`Fetching 0/${uniqueSelected.length} files...`);
    // These libraries are only needed after an explicit bulk-download action;
    // keeping them out of the initial mobile bundle makes Browse start faster.
    const [{ default: JSZip }, { saveAs }] = await Promise.all([
      import('jszip'),
      import('file-saver')
    ]);
    const zip = new JSZip();
    let fetched = 0;

    for (const t of uniqueSelected) {
      try {
        const { data, error } = await supabase.functions.invoke('get_download_url', {
          body: { trackId: t.id, format }
        });
        if (data?.url) {
          const response = await fetch(data.url);
          if (response.ok) {
            const blob = await response.blob();
            const filename = cleanTitle(t.file_name) + `.${format}`;
            zip.file(filename, blob);
            fetched++;
            toast.loading(`Fetching ${fetched}/${uniqueSelected.length} files...`, { id: toastId });
          }
        }
      } catch (err) {
        console.error('Download error:', err);
      }
    }

    if (fetched > 0) {
      toast.loading(`Zipping ${fetched} files...`, { id: toastId });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'TomFox_Tracks.zip');
      toast.success('Download complete!', { id: toastId });
      setSelectedTrackIds(new Set());
    } else {
      toast.error('Failed to download any tracks', { id: toastId });
    }
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
    if (loadMoreInFlightRef.current || !hasMoreTracks || searchQuery.trim()) return;

    const catalogRequestId = catalogRequestRef.current;
    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      // Shadow tags are resolved to IDs before querying; preserve that
      // constraint for every subsequent page as well as the first one.
      const newTracks = await fetchTracks(nextPage, tracksPerPage, activeFilters, sortBy, shadowTagIds || undefined) as Track[];
      const nextHasMore = newTracks.length === tracksPerPage;

      if (catalogRequestRef.current !== catalogRequestId) return;

      setDisplayedTracks(previous => {
        const existingIds = new Set(previous.map(track => track.id));
        return [...previous, ...newTracks.filter(track => !existingIds.has(track.id))];
      });
      setCurrentPage(nextPage);
      setHasMoreTracks(nextHasMore);
    } catch (error) {
      console.error('Error loading more browse tracks:', error);
      if (catalogRequestRef.current === catalogRequestId) {
        setHasMoreTracks(false);
      }
    } finally {
      if (catalogRequestRef.current === catalogRequestId) {
        loadMoreInFlightRef.current = false;
        setIsLoadingMore(false);
      }
    }
  };

  const cleanTitle = (filename: string) => {
    if (!filename) return 'Unknown Track';
    const noExt = filename.replace(/\.(mp3|wav|aif|aiff|m4a|ogg|flac)\s*$/i, '').trim();
    const cleaned = noExt.replace(/^\d+\s*-?\s*/, '').trim();
    return cleaned.length > 0 ? cleaned : noExt;
  };

  const handlePlayPause = (track: Track, source?: 'top' | 'browse' | 'playlist' | 'suggested') => {
    const effectiveSource = source || currentSource;
    if (source) setCurrentSource(source);
    
    // Se la traccia è tra quelle selezionate, un click senza modificatore svuoterà la selezione e la farà partire
    if (selectedTrackIds.size > 0) {
      setSelectedTrackIds(new Set());
    }
    
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      let queue = displayedTracks;
      if (effectiveSource === 'top') queue = trendingTracks;
      if (effectiveSource === 'suggested') queue = suggestedTracks;
      
      playTrack(track, queue, effectiveSource || undefined);
    }
  };

  const [lastSelectedTrackId, setLastSelectedTrackId] = useState<string | null>(null);

  const handleTrackClick = (e: React.MouseEvent, track: Track, source: 'top' | 'browse' | 'playlist' | 'suggested') => {
    if (e.shiftKey && lastSelectedTrackId) {
      e.preventDefault();
      e.stopPropagation();
      
      const trackList = source === 'top' ? trendingTracks : displayedTracks;
      const flatList = trackList.flatMap(t => {
        if (expandedTrackId === t.id && t.versions) return [t, ...t.versions];
        return [t];
      });

      const startIdx = flatList.findIndex(t => t.id === lastSelectedTrackId);
      const endIdx = flatList.findIndex(t => t.id === track.id);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx);
        const max = Math.max(startIdx, endIdx);
        
        setSelectedTrackIds(prev => {
          const next = new Set(prev);
          for (let i = min; i <= max; i++) {
            next.add(flatList[i].id);
          }
          return next;
        });
      }
      setLastSelectedTrackId(track.id);
    } else if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedTrackIds(prev => {
        const next = new Set(prev);
        if (next.has(track.id)) {
          next.delete(track.id);
        } else {
          next.add(track.id);
        }
        return next;
      });
      setLastSelectedTrackId(track.id);
    } else {
      setLastSelectedTrackId(track.id);
      handlePlayPause(track, source);
    }
  };

  const generateDragImage = (count: number) => {
    const dragImage = document.createElement('div');
    dragImage.className = 'px-3 py-1.5 bg-black/90 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg shadow-2xl pointer-events-none fixed top-[-1000px] left-[-1000px] z-[9999] flex items-center gap-2 border border-white/10 backdrop-blur';
    dragImage.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> ${count} track${count !== 1 ? 's' : ''}`;
    document.body.appendChild(dragImage);
    return dragImage;
  };

  const handleTrackDragStart = (e: React.DragEvent, trackId: string) => {
    let idsToDrag = [trackId];
    if (selectedTrackIds.has(trackId)) {
      idsToDrag = Array.from(selectedTrackIds);
    }
    
    const dragImage = generateDragImage(idsToDrag.length);
    e.dataTransfer.setDragImage(dragImage, 20, 20);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'tracks', ids: idsToDrag }));
  };

  const handleInlinePlaylistCreate = async () => {
    if (!inlineCreateTitle.trim() || isCreatingPlaylist) {
      setIsInlineCreating(false);
      setPendingDropTracks([]);
      return;
    }
    
    setIsCreatingPlaylist(true);
    try {
      const newPlaylist = await createPlaylist(inlineCreateTitle.trim());
      if (newPlaylist && pendingDropTracks.length > 0) {
        // Add tracks to the new playlist
        for (const trackId of pendingDropTracks) {
          await addTrackToPlaylist(newPlaylist.id, trackId);
        }
        // Auto expand it since we added tracks
        setExpandedCategory(`playlist-${newPlaylist.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingPlaylist(false);
      setIsInlineCreating(false);
      setInlineCreateTitle('');
      setPendingDropTracks([]);
    }
  };

  const openMobileBrowseTools = (section: 'filters' | 'music') => {
    setMobileBrowseToolsSection(section);
    setMobileExpandedCategory(null);
    setMobileFilterSearch('');
    setIsMobileBrowseToolsOpen(true);
  };

  const openMobilePlaylist = (playlistId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('playlist', playlistId);
    setSearchParams(nextParams);
    setIsMobileBrowseToolsOpen(false);
  };

  const handleMobilePlaylistCreate = async () => {
    if (!user) {
      setIsMobileBrowseToolsOpen(false);
      setLoginModalOpen(true);
      return;
    }

    const title = mobileCreateTitle.trim();
    if (!title || isMobileCreatingPlaylist) return;

    setIsMobileCreatingPlaylist(true);
    try {
      const playlist = await createPlaylist(title);
      if (!playlist) throw new Error('Playlist creation did not complete');
      setMobileCreateTitle('');
      setIsMobileInlineCreating(false);
      toast.success('Playlist created');
    } catch (error) {
      console.error('Error creating playlist from mobile Browse tools:', error);
      toast.error('Could not create playlist');
    } finally {
      setIsMobileCreatingPlaylist(false);
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
    <div className="flex min-h-0 flex-col w-full h-full bg-[#fafafa] text-black relative no-radius !rounded-none">
      <div id="main-search-bar" />
      
      {searchBarPortals.right && !playlistUrlId && createPortal(
        <>
          {selectedTrackIds.size > 0 && (() => {
            const allVisibleTracks = [...displayedTracks, ...trendingTracks];
            const selectedTracks = allVisibleTracks.filter(t => selectedTrackIds.has(t.id));
            const uniqueSelected = Array.from(new Map(selectedTracks.map(t => [t.id, t])).values());
            const canDownloadWav = uniqueSelected.length > 0 && uniqueSelected.every(t => t.has_wav);
            const canDownloadMp3 = uniqueSelected.length > 0 && uniqueSelected.every(t => t.has_mp3 !== false);

            return (
            <div className="flex items-center bg-black text-white px-4 py-2.5 rounded-[14px] shadow-lg animate-in fade-in zoom-in duration-200">
              <span className="text-[11px] font-medium uppercase tracking-widest mr-4">{selectedTrackIds.size} tracks selected</span>
              <div className="flex items-center gap-3 border-l border-white/20 pl-4 relative">
              {profile?.can_download !== false && (
                <>
                <button 
                  className="hover:text-white/70 transition-colors flex items-center justify-center" 
                  title="Download Selected"
                  onClick={() => setIsBulkDownloadDropdownOpen(!isBulkDownloadDropdownOpen)}
                >
                  <Download className="w-4 h-4" />
                </button>
                {isBulkDownloadDropdownOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-[#1a1a1a] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] border border-white/10 rounded-xl p-1 flex flex-col gap-1 w-32 z-[100] animate-in fade-in zoom-in-95 duration-200">
                    {canDownloadMp3 && (
                      <button 
                        onClick={() => { setIsBulkDownloadDropdownOpen(false); handleBulkDownload('mp3'); }}
                        className="w-full flex flex-col items-center justify-center p-2 rounded-lg transition-colors hover:bg-white/10 text-white"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">MP3</span>
                        <span className="text-[9px] font-sans text-white/50 mt-0.5">320kbps</span>
                      </button>
                    )}
                    {canDownloadWav && (
                      <button 
                        onClick={() => { setIsBulkDownloadDropdownOpen(false); handleBulkDownload('wav'); }}
                        className="w-full flex flex-col items-center justify-center p-2 rounded-lg transition-colors hover:bg-white/10 text-white"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">WAV</span>
                        <span className="text-[9px] font-sans text-white/50 mt-0.5">Lossless</span>
                      </button>
                    )}
                  </div>
                )}
                </>
              )}
              <button 
                  className="hover:text-white/70 transition-colors flex items-center justify-center"
                  onClick={() => setSelectedTrackIds(new Set())}
                  title="Clear Selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            );
          })()}

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
                    className={`w-full text-left px-4 py-2 text-[11px] font-medium uppercase tracking-widest transition-colors flex items-center gap-2 no-radius !rounded-none ${sortBy === opt.id ? 'bg-black/5 text-black' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
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
              className={`preview-toggle w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center shadow-inner ${isPreviewMode ? 'bg-[#111111] group-hover/preview:bg-[#333]' : 'bg-[#e0e0e0] group-hover/preview:bg-[#d0d0d0]'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${isPreviewMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>
        </>,
        searchBarPortals.right
      )}

      {searchBarPortals.bottom && !playlistUrlId && totalActiveFilterCount > 0 && createPortal(
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
        </div>,
        searchBarPortals.bottom
      )}

      {/* Layout Wrapper */}
      <div className="w-full relative flex-1 min-h-0 flex overflow-hidden">
        
        {/* STATIC SIDEBAR (Does not scroll) */}
        <div className={`hidden md:flex flex-col shrink-0 z-30 transition-all duration-150 ease-out will-change-[width,transform] pt-8 pl-4 md:pl-5 ${isFiltersOpen && expandedCategory ? 'w-[380px]' : 'w-[130px]'}`}>
          <div className="flex w-full h-full min-h-0 relative">
            <div className={`w-[130px] h-full min-h-0 flex flex-col gap-1 shrink-0 relative z-20 bg-[#fafafa] ${currentTrack ? 'pb-[90px]' : ''}`}>

                {/* Filter categories are collapsed by default to keep Browse focused
                    on the catalog and leave vertical room for My Music. */}
                <button
                  onClick={() => {
                    setIsFiltersOpen(open => !open);
                    setExpandedCategory(null);
                    setFilterSearch('');
                  }}
                  className={`w-full px-3 h-[38px] shrink-0 rounded-lg text-[11px] font-medium uppercase tracking-widest flex items-center justify-between transition-colors ${isFiltersOpen ? 'bg-black text-white' : 'hover:bg-black/5 text-black/60 hover:text-black'}`}
                >
                  <span>Filters</span>
                  <span className="flex items-center gap-1.5">
                    {totalActiveFilterCount > 0 && (
                      <span className={`w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] ${isFiltersOpen ? 'bg-white text-black' : 'bg-black text-white'}`}>
                        {totalActiveFilterCount}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFiltersOpen ? '' : '-rotate-90'}`} />
                  </span>
                </button>

                <div className={`overflow-hidden transition-[max-height,opacity,margin] motion-disclosure w-full ${isFiltersOpen ? 'max-h-[calc(100vh-220px)] opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'}`}>
                  <div className="flex flex-col">
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

                    {totalActiveFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="w-full text-left px-3 mt-2 h-[32px] shrink-0 text-[10px] text-black/50 hover:text-black transition-colors underline font-medium uppercase tracking-widest flex items-center"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* MY MUSIC */}
                <button 
                  onClick={() => setIsMyMusicOpen(!isMyMusicOpen)}
                  className="mt-3 mb-1 px-3 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black/60 transition-colors w-full text-left flex items-center justify-between group shrink-0"
                >
                  My Music
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMyMusicOpen ? '' : '-rotate-90'}`} />
                </button>
                
                <div 
                  className={`grid transition-all motion-disclosure w-full ${isMyMusicOpen ? 'grid-rows-[1fr] opacity-100 flex-1 min-h-0 mt-1' : 'grid-rows-[0fr] opacity-0 flex-none min-h-0 mt-0'}`}
                >
                  <div className="overflow-hidden flex flex-col h-full min-h-0 w-full">
                    {/* This is the only scrollable My Music area: Favorites and all
                        personal playlists stay between the header and fixed create box. */}
                    <div className="relative flex-1 min-h-0">
                      <div className="flex h-full flex-col gap-1 overflow-y-auto hide-scrollbar pb-5 pr-1">
                      {profile && favoritesPlaylist && (
                        <SidebarPlaylist
                          playlist={favoritesPlaylist}
                          isFavorites={true}
                          isActive={playlistUrlId === favoritesPlaylist.id}
                          onClick={() => {
                            searchParams.set('playlist', favoritesPlaylist.id);
                            setSearchParams(searchParams);
                          }}
                          dragTarget={dragTarget}
                          setDragTarget={setDragTarget}
                        />
                      )}
                      {userPlaylists.filter(p => !p.is_favorites).map(pl => (
                        <SidebarPlaylist
                          key={pl.id}
                          playlist={pl}
                          isActive={playlistUrlId === pl.id}
                          onClick={() => {
                            searchParams.set('playlist', pl.id);
                            setSearchParams(searchParams);
                          }}
                          dragTarget={dragTarget}
                          setDragTarget={setDragTarget}
                        />
                      ))}
                      </div>

                      {/* The playlist list fades out before the fixed create control,
                          while remaining fully scrollable underneath. */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-[#fafafa]/90 to-[#fafafa]" />
                    </div>
                  </div>
                </div>

                {/* Always present at the bottom of the sidebar, independent from
                    whether My Music is folded. */}
                <div 
                  className={`mt-auto mb-4 flex items-center justify-between gap-2 mx-3 px-3 py-2.5 rounded-full motion-drawer cursor-pointer text-[10px] font-bold uppercase tracking-widest shrink-0 ${isInlineCreating || pendingDropTracks.length > 0 ? 'bg-black/90 text-white shadow-inner' : 'bg-black text-white hover:bg-black/80 shadow-md hover:shadow-lg'} ${isCreatingPlaylist ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => {
                    if (!user) {
                      setLoginModalOpen(true);
                      return;
                    }
                    setIsMyMusicOpen(true);
                    if (!isInlineCreating) setIsInlineCreating(true);
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!user) {
                      setLoginModalOpen(true);
                      return;
                    }
                    const data = e.dataTransfer.getData('application/json');
                    if (data) {
                      try {
                        const parsed = JSON.parse(data);
                        if (parsed.type === 'tracks' && Array.isArray(parsed.ids)) {
                          setIsMyMusicOpen(true);
                          setPendingDropTracks(parsed.ids);
                          setIsInlineCreating(true);
                        }
                      } catch (err) {}
                    }
                  }}
                >
                  {isInlineCreating ? (
                    <input 
                      type="text" 
                      autoFocus 
                      placeholder="Playlist title..." 
                      className="w-full bg-transparent text-[11px] font-medium outline-none text-white placeholder:text-white/50"
                      value={inlineCreateTitle}
                      onChange={e => setInlineCreateTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleInlinePlaylistCreate();
                        else if (e.key === 'Escape') {
                           setIsInlineCreating(false);
                           setPendingDropTracks([]);
                        }
                      }}
                      onBlur={() => {
                        if (!inlineCreateTitle.trim() && pendingDropTracks.length === 0) {
                           setIsInlineCreating(false);
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest w-full justify-center">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Playlist</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`absolute left-[130px] top-0 bottom-0 w-[250px] pl-6 flex flex-col transition-all duration-150 ease-out will-change-[width,transform] ${isFiltersOpen && expandedCategory ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8 pointer-events-none'}`}>
                {isFiltersOpen && expandedCategory && (() => {
                  const cat = FILTER_CATEGORIES.find(c => c.key === expandedCategory);
                  if (!cat) return null;
                  const filteredOpts = filterSearch
                    ? cat.options.filter((o: FilterOption) => o.value.toLowerCase().includes(filterSearch.toLowerCase()))
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
                        {filteredOpts.map((opt: FilterOption) => {
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

        {/* SCROLL CONTAINER for tracks */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]" id="full-catalog-browser">
          <div className="flex flex-col w-full pt-8 pb-8 px-2 md:px-8">
            {/* The sidebar is intentionally desktop/tablet-only. These controls
                keep its two essential areas reachable on phones without
                changing any md+ layout. */}
            <div className="md:hidden sticky top-0 z-20 -mx-2 px-2 pb-3 bg-[#fafafa]/95 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openMobileBrowseTools('filters')}
                  aria-expanded={isMobileBrowseToolsOpen && mobileBrowseToolsSection === 'filters'}
                  aria-controls="mobile-browse-tools"
                  className="flex h-10 items-center justify-between rounded-lg border border-black/10 bg-white px-3 text-[10px] font-medium uppercase tracking-widest text-black shadow-sm transition-colors active:bg-black/5"
                >
                  <span>Filters</span>
                  {totalActiveFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-[9px] text-white">
                      {totalActiveFilterCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openMobileBrowseTools('music')}
                  aria-expanded={isMobileBrowseToolsOpen && mobileBrowseToolsSection === 'music'}
                  aria-controls="mobile-browse-tools"
                  className="flex h-10 items-center justify-between rounded-lg border border-black/10 bg-white px-3 text-[10px] font-medium uppercase tracking-widest text-black shadow-sm transition-colors active:bg-black/5"
                >
                  <span>My Music</span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-black/50" />
                </button>
              </div>
            </div>
            <div className="flex-grow flex flex-col overflow-hidden">
              <div className="flex flex-col gap-1 mb-8">
            {React.useMemo(() => (
              loading || !isInitialTracksLoaded || isTypingSearch || isSearching ? (
              [...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2 rounded-xl border border-transparent">
                  <div className="w-10 h-10 rounded-lg shrink-0 bg-black/5 animate-pulse" />
                  <div className="flex flex-col justify-center flex-1 md:w-[20%] md:flex-none pr-2 md:pr-4 gap-2">
                    <div className="h-3.5 bg-black/5 rounded w-3/4 animate-pulse" />
                    <div className="h-2.5 bg-black/5 rounded w-1/2 animate-pulse" />
                  </div>
                  <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%]">
                    <div className="h-5 w-12 bg-black/5 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-black/5 rounded animate-pulse" />
                  </div>
                  <div className="hidden md:flex flex-grow h-8 items-center pr-4">
                    <div className="h-3 w-full bg-black/5 rounded animate-pulse opacity-50" />
                  </div>
                  <div className="flex items-center justify-end pr-2 md:pr-4 shrink-0 w-auto gap-1.5 md:gap-2">
                    <div className="hidden md:block w-8 h-2.5 bg-black/5 rounded animate-pulse mr-2" />
                    <div className="hidden md:block w-4 h-4 bg-black/5 rounded-full animate-pulse mr-2 md:mr-4" />
                    <div className="w-16 h-8 md:w-20 md:h-9 bg-black/5 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              displayedTracks.map((track) => (
              <React.Fragment key={track.id}>
              <div 
              className={`flex items-center gap-4 p-2 rounded-xl group transition-colors cursor-pointer select-none border border-transparent ${selectedTrackIds.has(track.id) ? 'bg-black/5 border-black/10' : 'hover:bg-[#f6f6f6]'}`}
              onClick={(e) => handleTrackClick(e, track, 'browse')}
              draggable={supportsDesktopDrag}
              onDragStart={(e) => handleTrackDragStart(e, track.id)}
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
              <div className="flex flex-col justify-center flex-1 md:w-[20%] md:flex-none pr-2 md:pr-4 overflow-hidden">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div 
                    className="font-medium truncate text-[13px] md:text-[14px] hover:underline underline-offset-2 cursor-pointer"
                    onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); setSelectedTrackForDetails(track); }}
                  >
                    {cleanTitle(track.file_name)}
                  </div>
                  {(track.created_at || track.release_date) && (new Date().getTime() - new Date(track.created_at || track.release_date || 0).getTime() < 14 * 24 * 60 * 60 * 1000) && (
                    <span className="ml-2 text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium tracking-wide uppercase hidden md:inline-block">New</span>
                  )}
                  {track.versions && track.versions.length > 0 && (
                    <button 
                      onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); setExpandedTrackId(expandedTrackId === track.id ? null : track.id); }}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded transition-colors ${expandedTrackId === track.id ? 'bg-black/10 text-black' : 'text-black/40 hover:bg-black/5 hover:text-black'}`}
                      title={`${track.versions.length} alternative versions`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span className="font-medium text-[10px] font-sans">{track.versions.length}</span>
                    </button>
                  )}
                </div>
                <div className="text-[11px] md:text-[11px] text-black/40 truncate font-sans max-w-[200px]">
                  {getComposers(track.composers)}
                </div>
              </div>
              
              <div className="hidden md:flex items-center justify-between shrink-0 w-[24%] relative gap-1">
                {(() => {
                  const human = parseTags((track as any).human_tags);
                  const subgenres = parseTags(track.arrangement);
                  const moods = parseTags(track.moods);
                  const scenarios = parseTags(track.music_for);
                  
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
                  
                  // Show up to 6 tags
                  const tags = uniqueTags.slice(0, 6);
                  const remainingTags = uniqueTags.slice(6);
                  
                  if (tags.length === 0) return <span className="text-[10px] text-black/30 font-medium uppercase tracking-widest">Tagging...</span>;

                  return (
                    <>
                      <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap flex-1" style={{ maskImage: 'linear-gradient(to right, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)' }}>
                        {tags.map((t, idx) => (
                          <span 
                            key={idx} 
                            onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; handleTagClick(t.category, t.val, e); }} 
                            className="px-1.5 py-0.5 shrink-0 bg-black/5 hover:bg-black/10 rounded text-[9px] font-medium text-black/60 hover:text-black uppercase tracking-widest cursor-pointer transition-colors"
                          >
                            {t.val}
                          </span>
                        ))}
                      </div>
                      {remainingTags.length > 0 && (
                        <div className="relative shrink-0">
                          <span 
                            onClick={(e) => {
                              if (e.shiftKey || e.metaKey || e.ctrlKey) return;
                              e.stopPropagation();
                              setExpandedTags(expandedTags?.trackId === track.id ? null : { trackId: track.id, tags: remainingTags });
                            }}
                            className="px-1.5 py-0.5 shrink-0 bg-black/5 hover:bg-black/10 rounded text-[9px] font-medium text-black/60 hover:text-black uppercase tracking-widest cursor-pointer transition-colors"
                          >
                            +{remainingTags.length}
                          </span>
                          {expandedTags?.trackId === track.id && (
                            <>
                              <div className="fixed inset-0 z-[20]" onClick={(e) => { e.stopPropagation(); setExpandedTags(null); }} />
                              <div ref={expandedTagsRef} className="absolute top-full right-0 mt-2 p-2 bg-white border border-black/10 shadow-lg rounded-xl flex flex-wrap gap-2 z-[30] w-64" onClick={(e) => e.stopPropagation()}>
                                {expandedTags.tags.map((t, idx) => (
                                    <span 
                                      key={idx} 
                                      onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; handleTagClick(t.category, t.val, e); }} 
                                      className="px-1.5 py-0.5 bg-black/5 hover:bg-black/10 rounded text-[9px] font-medium text-black/60 hover:text-black uppercase tracking-widest whitespace-nowrap cursor-pointer transition-colors"
                                    >
                                    {t.val}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* WAVEFORM Column */}
              <div className={`hidden md:flex flex-grow h-8 items-center opacity-70 group-hover:opacity-100 transition-opacity ${profile?.can_download !== false ? 'pr-4' : 'pr-1'}`}>
                <WaveformView 
                  data={parseWaveform(track.waveform_data)} 
                  isPlaying={currentTrack?.id === track.id && isPlaying} 
                  progress={currentTrack?.id === track.id ? progress : 0} 
                  onSeek={(percentage) => handleSeek(track, percentage)}
                  previewStartPct={isPreviewMode ? getPreviewTimings(track)?.startPct : undefined}
                  previewEndPct={isPreviewMode ? getPreviewTimings(track)?.endPct : undefined}
                />
              </div>

              <div className={`ml-auto flex items-center justify-end pr-2 md:pr-4 shrink-0 w-auto max-md:gap-2 md:gap-2`}>
                <TrackActionButtons trackId={track.id} />
                <div className="hidden md:block text-[11px] font-sans font-medium text-black/40 tracking-wider w-auto min-w-[40px] text-right mr-2">
                  {track.duration ? formatTime(track.duration) : '0:00'}
                </div>
                <div className="hidden md:flex w-[50px] justify-center shrink-0">
                </div>
                {profile?.can_download !== false && (
                  <button className="hidden md:flex p-1.5 hover:bg-black/5 rounded-full transition-colors items-center justify-center text-black/40 hover:text-black shrink-0 mr-2 md:mr-4" onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); openDownloadModal(track, e); }} title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button className="flex items-center justify-center gap-1.5 md:gap-2 max-md:w-8 max-md:h-8 max-md:p-0 md:px-4 md:py-2 bg-black text-white rounded hover:bg-black/90 transition-colors font-sans text-[10px] md:text-[11px] uppercase tracking-widest shrink-0" onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); openLicenseModal(track); }}>
                  <ShoppingBag className="w-3.5 h-3.5" /> <span className="hidden md:inline">License</span>
                </button>
              </div>
            </div>
            
            {/* VERSIONS EXPANDED VIEW */}
            {expandedTrackId === track.id && track.versions && track.versions.length > 0 && (
              <div className="pl-12 pr-2 py-2 mt-1 mb-2 border-l-[3px] border-black/5 ml-[22px] space-y-1 relative">
                {track.versions.map(version => (
                  <div 
                    key={version.id} 
                    className={`flex items-center gap-4 p-2 rounded-xl group/version transition-colors cursor-pointer select-none border border-transparent ${selectedTrackIds.has(version.id) ? 'bg-black/5 border-black/10' : 'hover:bg-[#f6f6f6]'}`}
                    onClick={(e) => handleTrackClick(e, version, 'browse')}
                    draggable={supportsDesktopDrag}
                    onDragStart={(e) => handleTrackDragStart(e, version.id)}
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
                    <div className="flex flex-col justify-center flex-1 md:w-[20%] md:flex-none shrink-0 pr-2 md:pr-4 overflow-hidden">
                      <div 
                        className="font-medium text-[13px] md:text-[13px] truncate hover:underline underline-offset-2 cursor-pointer"
                        onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); setSelectedTrackForDetails(version); }}
                      >
                        {cleanTitle(version.file_name)}
                      </div>
                      <div className="font-sans text-[9px] md:text-[10px] text-black/40 uppercase tracking-widest mt-0.5">Version</div>
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
                    <div className={`ml-auto flex items-center justify-end pr-2 md:pr-4 shrink-0 w-auto max-md:gap-2 md:gap-2`}>
                      <TrackActionButtons trackId={version.id} />
                      <div className="hidden md:block text-[11px] font-sans font-medium text-black/40 tracking-wider w-auto min-w-[40px] text-right mr-2">
                        {version.duration ? formatTime(version.duration) : '0:00'}
                      </div>
                      <div className="hidden md:flex w-[50px] justify-center shrink-0">
                      </div>
                      {profile?.can_download !== false && (
                        <button className="hidden md:flex p-1.5 hover:bg-black/5 rounded-full transition-colors items-center justify-center text-black/40 hover:text-black shrink-0 mr-2 md:mr-4" onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); openDownloadModal(version, e); }} title="Download">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button className="flex items-center justify-center gap-1.5 md:gap-2 max-md:w-8 max-md:h-8 max-md:p-0 md:px-4 md:py-2 bg-black text-white rounded hover:bg-black/90 transition-colors font-sans text-[10px] md:text-[11px] uppercase tracking-widest shrink-0" onClick={e => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); openLicenseModal(version); }}>
                        <ShoppingBag className="w-3.5 h-3.5" /> <span className="hidden md:inline">License</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </React.Fragment>
            ))
            )), [loading, isInitialTracksLoaded, isTypingSearch, isSearching, displayedTracks, selectedTrackIds, currentTrack, isPlaying, trendingTrackIds, expandedTrackId, expandedTags, profile, isPreviewMode, progress])}
          {displayedTracks.length === 0 && !loading && (
            <div className="py-16 text-center text-black/40 text-xs">
              No tracks found matching "{searchQuery}"
            </div>
          )}
        </div>
          
            {hasMoreTracks && !searchQuery.trim() && isInitialTracksLoaded && (
              <div className="flex w-full justify-center py-10">
                <button
                  type="button"
                  onClick={() => void handleLoadMore()}
                  disabled={isLoadingMore}
                  className="group flex w-full max-w-md items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-4 text-[11px] font-medium uppercase tracking-[0.16em] text-black/70 shadow-sm transition-all hover:border-black/30 hover:text-black hover:shadow-md disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                  )}
                  <span>{isLoadingMore ? 'Loading tracks' : 'Load more tracks'}</span>
                </button>
              </div>
            )}
            
            <div className={`mt-auto pt-16 ${currentTrack ? 'pb-[90px]' : ''}`}>
              <Footer isMinimized={true} />
            </div>

          </div>
        </div>
      </div>
      </div>

      {isMobileBrowseToolsOpen && (
        <div className="md:hidden fixed inset-0 z-[120] flex items-end" role="presentation">
          <button
            type="button"
            aria-label="Close Browse tools"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm motion-overlay"
            onClick={() => setIsMobileBrowseToolsOpen(false)}
          />

          <section
            id="mobile-browse-tools"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-browse-tools-title"
            className="relative flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-black/10 bg-[#fafafa] shadow-[0_-20px_60px_rgba(0,0,0,0.2)] motion-surface"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 py-4">
              <h2 id="mobile-browse-tools-title" className="text-[11px] font-medium uppercase tracking-[0.18em] text-black">
                Browse tools
              </h2>
              <button
                ref={mobileBrowseToolsCloseRef}
                type="button"
                aria-label="Close Browse tools"
                onClick={() => setIsMobileBrowseToolsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-black transition-colors active:bg-black/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-black/10 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setMobileBrowseToolsSection('filters');
                  setMobileExpandedCategory(null);
                  setMobileFilterSearch('');
                }}
                className={`h-10 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-colors ${mobileBrowseToolsSection === 'filters' ? 'bg-black text-white' : 'bg-black/5 text-black/60'}`}
              >
                Filters{totalActiveFilterCount > 0 ? ` · ${totalActiveFilterCount}` : ''}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileBrowseToolsSection('music');
                  setMobileExpandedCategory(null);
                  setMobileFilterSearch('');
                }}
                className={`h-10 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-colors ${mobileBrowseToolsSection === 'music' ? 'bg-black text-white' : 'bg-black/5 text-black/60'}`}
              >
                My Music
              </button>
            </div>

            <div className={`min-h-0 flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 ${mobileBrowseToolsSection === 'filters' ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'}`}>
              {mobileBrowseToolsSection === 'filters' ? (
                <div className="flex flex-col gap-2">
                  {totalActiveFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAllFilters();
                        setMobileExpandedCategory(null);
                        setMobileFilterSearch('');
                      }}
                      className="mb-1 self-start text-[10px] font-medium uppercase tracking-widest text-black/50 underline underline-offset-4 transition-colors active:text-black"
                    >
                      Clear filters
                    </button>
                  )}

                  {FILTER_CATEGORIES.map(category => {
                    const count = (activeFilters[category.key] as string[])?.length || 0;
                    const isExpanded = mobileExpandedCategory === category.key;
                    const filteredOptions = mobileFilterSearch
                      ? category.options.filter(option => option.value.toLowerCase().includes(mobileFilterSearch.toLowerCase()))
                      : category.options;

                    return (
                      <div key={category.key} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                        <button
                          type="button"
                          onClick={() => {
                            setMobileExpandedCategory(isExpanded ? null : category.key);
                            setMobileFilterSearch('');
                          }}
                          aria-expanded={isExpanded}
                          aria-controls={`mobile-filter-${category.key}`}
                          className={`flex min-h-12 w-full items-center justify-between px-4 text-left text-[11px] font-medium uppercase tracking-widest transition-colors ${isExpanded ? 'bg-black text-white' : 'text-black/70 active:bg-black/5'}`}
                        >
                          <span>{category.title}</span>
                          <span className="flex items-center gap-2">
                            {count > 0 && (
                              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] ${isExpanded ? 'bg-white text-black' : 'bg-black text-white'}`}>
                                {count}
                              </span>
                            )}
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </span>
                        </button>

                        {isExpanded && (
                          <div id={`mobile-filter-${category.key}`} className="border-t border-black/10 p-3">
                            <div className="relative mb-3">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
                              <input
                                type="search"
                                autoFocus
                                placeholder={`Search ${category.title}`}
                                value={mobileFilterSearch}
                                onChange={event => setMobileFilterSearch(event.target.value)}
                                className="h-10 w-full rounded-lg border border-black/10 bg-black/[0.03] pl-9 pr-3 text-[12px] text-black outline-none placeholder:text-black/35 focus:border-black/30"
                              />
                            </div>
                            <div className="flex max-h-[34dvh] flex-col gap-1 overflow-y-auto overscroll-contain pr-1">
                              {filteredOptions.map(option => {
                                const isActive = (activeFilters[category.key] as string[])?.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => toggleFilter(category.key, option.value)}
                                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[11px] transition-colors ${isActive ? 'bg-black text-white' : 'text-black/70 active:bg-black/5'}`}
                                  >
                                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isActive ? 'border-white bg-white text-black' : 'border-black/20'}`}>
                                      {isActive && <span className="h-1.5 w-1.5 rounded-sm bg-black" />}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{option.value}</span>
                                    <span className={`shrink-0 text-[9px] ${isActive ? 'text-white/60' : 'text-black/35'}`}>{option.count}</span>
                                  </button>
                                );
                              })}
                              {filteredOptions.length === 0 && (
                                <p className="px-3 py-5 text-center text-[11px] text-black/40">No matching filters</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="relative min-h-0 flex-1">
                    <div className="flex h-full flex-col gap-1 overflow-y-auto overscroll-contain pb-5 pr-1">
                    {profile && favoritesPlaylist && (
                      <SidebarPlaylist
                        playlist={favoritesPlaylist}
                        isFavorites={true}
                        isActive={playlistUrlId === favoritesPlaylist.id}
                        onClick={() => openMobilePlaylist(favoritesPlaylist.id)}
                        dragTarget={dragTarget}
                        setDragTarget={setDragTarget}
                      />
                    )}
                    {userPlaylists.filter(playlist => !playlist.is_favorites).map(playlist => (
                      <SidebarPlaylist
                        key={playlist.id}
                        playlist={playlist}
                        isActive={playlistUrlId === playlist.id}
                        onClick={() => openMobilePlaylist(playlist.id)}
                        dragTarget={dragTarget}
                        setDragTarget={setDragTarget}
                      />
                    ))}
                    {user && !favoritesPlaylist && userPlaylists.length === 0 && (
                      <p className="px-3 py-5 text-center text-[11px] text-black/40">Your saved playlists will appear here.</p>
                    )}
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#fafafa]" />
                  </div>

                  <div className="shrink-0 border-t border-black/10 pt-4">
                    {isMobileInlineCreating ? (
                      <form
                        className="flex items-center gap-2 rounded-xl bg-black p-2"
                        onSubmit={event => {
                          event.preventDefault();
                          void handleMobilePlaylistCreate();
                        }}
                      >
                        <input
                          autoFocus
                          type="text"
                          value={mobileCreateTitle}
                          onChange={event => setMobileCreateTitle(event.target.value)}
                          placeholder="Playlist title"
                          className="h-10 min-w-0 flex-1 bg-transparent px-2 text-[12px] text-white outline-none placeholder:text-white/50"
                        />
                        <button
                          type="button"
                          aria-label="Cancel creating playlist"
                          onClick={() => {
                            setMobileCreateTitle('');
                            setIsMobileInlineCreating(false);
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/70 active:bg-white/10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          type="submit"
                          disabled={!mobileCreateTitle.trim() || isMobileCreatingPlaylist}
                          className="flex h-9 shrink-0 items-center rounded-lg bg-white px-3 text-[10px] font-medium uppercase tracking-widest text-black disabled:opacity-50"
                        >
                          {isMobileCreatingPlaylist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            setIsMobileBrowseToolsOpen(false);
                            setLoginModalOpen(true);
                            return;
                          }
                          setIsMobileInlineCreating(true);
                        }}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-[11px] font-medium uppercase tracking-widest text-white shadow-md transition-colors active:bg-black/80"
                      >
                        <Plus className="h-4 w-4" />
                        Create playlist
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
