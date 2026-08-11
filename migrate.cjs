const fs = require('fs');
const browsePath = './src/pages/Browse.tsx';
const homePath = './src/pages/Home.tsx';

let browseContent = fs.readFileSync(browsePath, 'utf8');

// The JSX block to extract starts with `{playlistUrlId && (`
// and ends right before `<div id="main-search-bar"`
const startRegex = /\{\s*playlistUrlId\s*&&\s*\(\s*<PlaylistIsland/;
const endRegex = /<div id="main-search-bar"/;

const matchStart = browseContent.match(startRegex);
const matchEnd = browseContent.match(endRegex);

if (!matchStart || !matchEnd) {
  console.log("Could not find boundaries");
  process.exit(1);
}

const extractedJsx = browseContent.substring(matchStart.index, matchEnd.index);

// Remove the extracted part from Browse.tsx
browseContent = browseContent.substring(0, matchStart.index) + browseContent.substring(matchEnd.index);
fs.writeFileSync(browsePath, browseContent, 'utf8');

// Now, we need to build Home.tsx
// Home.tsx needs the imports, types, and hooks to support the extracted JSX.
const homeContent = `import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPlaylists, fetchTrendingTracks, fetchPlaylistTracks, fetchSuggestedTracks } from '../lib/supabase';
import { Play, Pause, TrendingUp, Loader2 } from 'lucide-react';
import PlaylistIsland from '../components/PlaylistIsland';
import TrackArtwork from '../components/TrackArtwork';
import { getComposers } from '../utils/trackUtils';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { FeaturedSun } from '../components/TopPicksEffects';

const cardStyles = [
  { baseColor: 'bg-gradient-to-br from-[#1E293B] to-[#0F172A]', bgIdle: 'bg-[#38BDF8]/20', bgHover: 'bg-[#38BDF8]/40' },
  { baseColor: 'bg-gradient-to-br from-[#3F3F46] to-[#18181B]', bgIdle: 'bg-[#A78BFA]/20', bgHover: 'bg-[#A78BFA]/40' },
  { baseColor: 'bg-gradient-to-br from-[#1E1B4B] to-[#09090B]', bgIdle: 'bg-[#F472B6]/20', bgHover: 'bg-[#F472B6]/40' },
  { baseColor: 'bg-gradient-to-br from-[#0F172A] to-[#020617]', bgIdle: 'bg-[#34D399]/20', bgHover: 'bg-[#34D399]/40' },
  { baseColor: 'bg-gradient-to-br from-[#451A03] to-[#1C0901]', bgIdle: 'bg-[#FBBF24]/20', bgHover: 'bg-[#FBBF24]/40' },
  { baseColor: 'bg-gradient-to-br from-[#064E3B] to-[#022C22]', bgIdle: 'bg-[#6EE7B7]/20', bgHover: 'bg-[#6EE7B7]/40' },
  { baseColor: 'bg-gradient-to-br from-[#4C1D95] to-[#2E1065]', bgIdle: 'bg-[#C084FC]/20', bgHover: 'bg-[#C084FC]/40' },
  { baseColor: 'bg-gradient-to-br from-[#701A75] to-[#4A044E]', bgIdle: 'bg-[#E879F9]/20', bgHover: 'bg-[#E879F9]/40' },
  { baseColor: 'bg-gradient-to-br from-[#1E3A8A] to-[#172554]', bgIdle: 'bg-[#60A5FA]/20', bgHover: 'bg-[#60A5FA]/40' },
  { baseColor: 'bg-gradient-to-br from-[#7F1D1D] to-[#450A0A]', bgIdle: 'bg-[#F87171]/20', bgHover: 'bg-[#F87171]/40' }
];

const cleanTitle = (filename: string) => {
  let base = filename.replace(/\\.(mp3|wav|aif|aiff)$/i, '');
  base = base.replace(/^\\d+[\\s_-]*/, '');
  base = base.replace(/^[A-Z0-9]+_/, '');
  base = base.replace(/_(bpm|key|v\\d).*$/i, '');
  base = base.replace(/_/g, ' ');
  return base;
};

const ScrollArrows = ({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement> }) => {
  return (
    <>
      <button 
        className="absolute left-12 top-1/2 -translate-y-1/2 w-10 h-10 no-radius rounded-full bg-white border border-black/10 shadow-lg flex items-center justify-center text-black/50 hover:text-black hover:bg-white z-30 transition-all opacity-0 group-hover/section:opacity-100"
        style={{ borderRadius: '50%' }}
        onClick={(e) => {
          e.stopPropagation();
          scrollRef.current?.scrollBy({ left: -600, behavior: 'smooth' });
        }}
      >
        <svg className="w-5 h-5 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button 
        className="absolute right-12 top-1/2 -translate-y-1/2 w-10 h-10 no-radius rounded-full bg-white border border-black/10 shadow-lg flex items-center justify-center text-black/50 hover:text-black hover:bg-white z-30 transition-all opacity-0 group-hover/section:opacity-100"
        style={{ borderRadius: '50%' }}
        onClick={(e) => {
          e.stopPropagation();
          scrollRef.current?.scrollBy({ left: 600, behavior: 'smooth' });
        }}
      >
        <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </>
  );
};

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const playlistUrlId = searchParams.get('playlist');
  
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<any[]>([]);
  const [suggestedTracks, setSuggestedTracks] = useState<any[]>([]);
  
  const [isFeaturedHovered, setIsFeaturedHovered] = useState(false);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  const topPicksRef = useRef<HTMLDivElement>(null);
  const trendingRef = useRef<HTMLDivElement>(null);
  const suggestedRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { settings } = useSettings();
  const { 
    playTrack, playPlaylist, currentTrack, isPlaying, togglePlay, 
    progress, setPendingSeek, setCurrentSource, setSelectedTrackForDetails
  } = usePlayer();

  useEffect(() => {
    async function loadData() {
      const [pData, tData] = await Promise.all([
        fetchPlaylists(),
        fetchTrendingTracks()
      ]);
      setPlaylists(pData);
      setTrendingTracks(tData);
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadSuggested() {
      if (user?.id) {
        const tracks = await fetchSuggestedTracks(user.id);
        setSuggestedTracks(tracks);
      } else {
        setSuggestedTracks([]);
      }
    }
    loadSuggested();
  }, [user?.id]);

  const trendingTrackIds = new Set(trendingTracks.map(t => t.id));

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingSeek(parseFloat(e.target.value));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return \`\${m}:\${s < 10 ? '0' : ''}\${s}\`;
  };

  const handleTrackClick = (e: React.MouseEvent, track: any, source: string) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      const next = new Set(selectedTrackIds);
      if (next.has(track.id)) next.delete(track.id);
      else next.add(track.id);
      setSelectedTrackIds(next);
      return;
    }
    
    if (currentTrack?.file_name === track.file_name) {
      togglePlay();
    } else {
      const list = source === 'top' ? trendingTracks : suggestedTracks;
      playTrack(track, list, source);
    }
  };

  const handleTrackDragStart = (e: React.DragEvent, trackId: string) => {
    let idsToDrag = selectedTrackIds.has(trackId) ? Array.from(selectedTrackIds) : [trackId];
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'tracks', ids: idsToDrag }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col w-full min-h-screen pt-[88px] bg-[#fafafa] text-black relative">
${extractedJsx}
    </div>
  );
}
`;

fs.writeFileSync(homePath, homeContent, 'utf8');
console.log("Migration script complete");
