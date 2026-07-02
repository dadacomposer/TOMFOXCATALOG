import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchPlaylists } from '../lib/supabase';
import { ChevronRight } from 'lucide-react';
import PlaylistArtwork from '../components/PlaylistArtwork';
import PlaylistIsland from '../components/PlaylistIsland';
import { AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';

type Playlist = {
  id: string;
  title: string;
  description: string;
  human_tags?: string[];
  track_count?: number;
  track_ids?: string[];
};

export default function Playlists() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const playlistUrlId = searchParams.get('playlist');
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { playTrack, currentSource, audioRef, setIsCurrentPreviewDormant, setPendingSeek, progress } = usePlayer();

  const handleSeek = (track: any, percentage: number) => {
    if (audioRef?.current) {
      const duration = audioRef.current.duration || 0;
      audioRef.current.currentTime = (percentage / 100) * duration;
    } else {
      playTrack(track, [], currentSource || undefined);
      setIsCurrentPreviewDormant(true);
      setPendingSeek(percentage);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPlaylists();
        setPlaylists(data || []);
      } catch (err) {
        console.error('Error fetching playlists:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getCategories = (allPlaylists: Playlist[]) => {
    if (!allPlaylists.length) return [];
    
    const catPercussion = allPlaylists.filter(p => p.title?.toLowerCase()?.match(/drum|percussive|beat|rhythm|octane|pulse/));
    const catCinematic = allPlaylists.filter(p => p.title?.toLowerCase()?.match(/film|space|cinematic|score|trailer|dramatic|epic/));
    const catDark = allPlaylists.filter(p => p.title?.toLowerCase()?.match(/dark|shadow|breach|tension|suspense|thriller/));
    const catSynth = allPlaylists.filter(p => p.title?.toLowerCase()?.match(/synth|tech|code|electronic/));
    const catCalm = allPlaylists.filter(p => p.title?.toLowerCase()?.match(/piano|nostalgia|morning|ambient|chill|calm|emotion/));
    const catDocs = allPlaylists.filter(p => p.title?.toLowerCase()?.match(/vox|explainer|documentary|session|underscore/));
    const catJazz = allPlaylists.filter(p => p.title?.toLowerCase()?.match(/jazz|organic|acoustic/));
    
    const categories = [
      { title: "Percussion & Rhythm", playlists: catPercussion },
      { title: "Cinematic & Film", playlists: catCinematic },
      { title: "Dark & Tension", playlists: catDark },
      { title: "Electronic & Synth", playlists: catSynth },
      { title: "Calm & Reflective", playlists: catCalm },
      { title: "Documentary & Explainer", playlists: catDocs },
      { title: "Jazz & Organic", playlists: catJazz }
    ];

    return categories.filter(c => c.playlists.length > 0);
  };

  const categories = getCategories(playlists);

  return (
    <div className="relative flex flex-col w-full min-h-screen pt-32 md:pt-40 bg-[#fafafa] text-black overflow-hidden">
      {/* HUGE DRIBBBLE LOGO WATERMARK */}
      <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" className="absolute top-10 -right-20 w-[120%] md:w-[60%] opacity-[0.02] rotate-12 pointer-events-none select-none mix-blend-multiply z-0" alt="" />
      
      <AnimatePresence>
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
            newMusicTrackIds={new Set()}
            trendingTrackIds={new Set()}
          />
        )}
      </AnimatePresence>
      
      {/* Hero Section */}
      <div className="w-full px-8 md:px-12 lg:px-24 mb-16 md:mb-24">
        <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.9] text-black max-w-5xl mb-8">
          Set the mood.
        </h1>
        <p className="text-black/50 text-sm md:text-base max-w-xl leading-relaxed">
          Find the exact mood, tempo, and style for your project without the noise.
        </p>
      </div>

      {/* Playlists Grid / Rows */}
      <div className="w-full pl-8 md:pl-12 lg:pl-24 pb-24 overflow-hidden">
        {loading ? (
          <div className="mb-16">
            <div className="w-48 h-8 bg-[#e5e5e5] animate-pulse rounded mb-6" />
            <div className="flex overflow-x-hidden gap-6 md:gap-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col p-4 rounded-[32px] shrink-0 w-[280px] sm:w-[320px] md:w-[340px]">
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
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-16">
            {categories.map((cat, idx) => (
              <div key={idx} className="w-full">
                <div className="flex items-center justify-between mb-6 pr-8 md:pr-12 lg:pr-24">
                  <h2 className="text-2xl md:text-3xl font-semibold uppercase tracking-tighter text-black">{cat.title}</h2>
                </div>
                
                <div className="flex overflow-x-auto gap-6 md:gap-8 pb-8 hide-scrollbar snap-x pr-8 md:pr-12 lg:pr-24">
                  {cat.playlists.map((pl) => (
                    <div 
                      key={pl.id} 
                      className="flex flex-col bg-transparent hover:bg-[#f6f6f6] p-4 rounded-[32px] group cursor-pointer w-[280px] sm:w-[320px] md:w-[340px] shrink-0 snap-start transition-all duration-300 border border-transparent hover:border-black/5"
                      onClick={() => setSearchParams({ playlist: pl.id })}
                    >
                      <div className="relative w-full aspect-[1.15] mb-6">
                         <PlaylistArtwork playlist={pl as any} className="absolute top-0 right-0 w-[78%] aspect-square shadow-md group-hover:scale-[1.02] transition-transform cursor-pointer z-0" />
                         <PlaylistArtwork playlist={pl as any} className="absolute top-[3%] right-[11%] w-[78%] aspect-square shadow-md group-hover:scale-[1.02] transition-transform cursor-pointer z-10" />
                         <PlaylistArtwork playlist={pl as any} className="absolute top-[6%] left-0 w-[78%] aspect-square shadow-xl group-hover:scale-[1.02] transition-transform cursor-pointer z-20" />
                      </div>
                      <div className="flex flex-col px-2 pb-2 mt-2">
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="w-full bg-[#f6f6f6] py-32 px-8 md:px-12 lg:px-24 flex flex-col items-center justify-center text-center">
        <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-[0.95] mb-6 max-w-3xl">
          Keep exploring.
        </h2>
        <p className="font-sans text-black/50 uppercase tracking-widest text-sm mb-12 max-w-xl">
          Create a free account to start saving your favorite tracks, or explore our entire catalog right now.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            className="px-10 py-5 bg-black text-white font-bold uppercase text-xs tracking-widest hover:bg-black/80 transition-colors rounded-full shadow-lg"
          >
            Create Free Account
          </button>
          <button 
            onClick={() => navigate('/browse')}
            className="px-10 py-5 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-black/5 border border-black/10 transition-colors rounded-full"
          >
            Browse Catalog
          </button>
        </div>
      </div>

    </div>
  );
}
