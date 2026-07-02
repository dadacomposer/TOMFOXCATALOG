import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Play, Pause, Search } from 'lucide-react';
import LogoTicker from '../components/LogoTicker';
import { fetchPlaylists, fetchPlaylistTracks } from '../lib/supabase';
import PlaylistArtwork from '../components/PlaylistArtwork';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

const BACKGROUND_VIDEOS = [
  "https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/videos/Anthropic.mov",
  "https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/videos/Tunnel%20Vision.mov"
];

export default function Home() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const [realPlaylists, setRealPlaylists] = useState<any[]>([]);
  const { isPlaying, togglePlay, playPlaylist, currentTrack } = usePlayer();
  const { user, loading, setLoginModalOpen } = useAuth();

  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    // Check for auth errors in URL
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    if (hash.includes('error=') || params.get('error')) {
      alert("Login failed. Please try again.");
      navigate('/');
    }

    if (!currentTrack) setPlayingPlaylistId(null);
  }, [currentTrack, navigate]);

  useEffect(() => {
    fetchPlaylists().then(data => {
      const targetTitles = ['New Music', 'Lo-Fi', 'Exploring Space'];
      const filtered = data.filter(p => targetTitles.includes(p.title));
      filtered.sort((a, b) => targetTitles.indexOf(a.title) - targetTitles.indexOf(b.title));
      setRealPlaylists(filtered);
    });
  }, []);

  if (!loading && user) {
    return <Navigate to="/browse" replace />;
  }

  const handlePlaylistPlay = async (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    if (playingPlaylistId === playlistId) {
      togglePlay();
    } else {
      setPlayingPlaylistId(playlistId);
      const tracks = await fetchPlaylistTracks(playlistId) as any;
      if (tracks && tracks.length > 0) {
        playPlaylist(tracks);
      }
    }
  };

  const handleVideoEnded = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % BACKGROUND_VIDEOS.length);
  };

  return (
    <div className="flex flex-col">
      {/* Top Section: Hero sharing the background */}
      <div className="relative w-full overflow-hidden">
        {/* Background Video */}
        <video 
          ref={videoRef}
          src={BACKGROUND_VIDEOS[currentVideoIndex]} 
          autoPlay 
          muted 
          playsInline 
          onEnded={handleVideoEnded}
          className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000"
        />
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-white/70 z-0 pointer-events-none"></div>

        {/* HERO */}
        <div className="relative z-10 w-full px-12 md:px-24 lg:px-32 pt-40 md:pt-48 pb-20 md:pb-32">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter mb-8 leading-[0.9]">
              The Soundtrack <br />
              For Modern <br />
              Storytelling.
            </h1>
            
            <p className="font-sans uppercase text-sm mb-10 max-w-md leading-relaxed tracking-wide text-black/50">
              A meticulously curated library of 2,500+ premium tracks for media, ads, and film.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
               <button onClick={() => navigate('/browse')} className="px-8 py-4 bg-black text-white font-bold uppercase text-xs tracking-widest hover:bg-black/80 transition-colors cursor-pointer">
                 Browse
               </button>
               <button onClick={() => setLoginModalOpen(true)} className="px-8 py-4 border-2 border-black/10 font-bold uppercase text-xs tracking-widest hover:border-black transition-colors">
                 Create Free Account
               </button>
            </div>
          </div>
        </div>
      </div>

      <div id="home-dark-section" className="w-full full-bleed">
        <LogoTicker />

        {/* MAIN CONTENT (Dark Mode) */}
        <main className="flex-grow w-full px-12 md:px-24 lg:px-32 py-16 md:py-24 bg-black text-white">
          
          {/* Value Proposition / Showcase */}
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter mb-12 leading-[1.1] max-w-5xl">
              Built for creators, directors, and brands who refuse to compromise on sound.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <video src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/videos/Anthropic.mov" autoPlay loop muted playsInline className="w-full aspect-video object-cover border border-white/10 bg-white/5" />
              <video src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/videos/Tunnel%20Vision.mov" autoPlay loop muted playsInline className="w-full aspect-video object-cover border border-white/10 bg-white/5" />
            </div>
          </div>

        </main>
      </div>

      {/* MAIN CONTENT (White Mode Rest of Page) */}
      <main className="flex-grow w-full px-12 md:px-24 lg:px-32">

        {/* Curated for your story */}
        <div className="w-full py-24 md:py-32 flex flex-col lg:flex-row items-stretch gap-16 lg:gap-24 mx-auto border-b border-black/10">
          <div className="w-full lg:w-1/3 flex flex-col justify-between h-full items-start pt-4 pb-2">
            <div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter leading-[1.05] mb-8">
              Curated for<br/>your story.
            </h2>
            <p className="font-sans text-[14px] md:text-[16px] text-black/60 leading-relaxed mb-10 max-w-sm uppercase tracking-wide">
              Forget generic stock tracks. Dive into hand-picked playlists designed to give your project the exact sound it needs.
            </p>
            </div>
            <button 
              onClick={() => navigate('/browse')}
              className="px-10 py-5 bg-black text-white font-bold uppercase text-xs tracking-widest hover:bg-black/80 transition-colors rounded-full"
            >
              Explore the Collection
            </button>
          </div>
          <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            {realPlaylists.map((playlist) => (
              <div 
                key={playlist.id} 
                className="flex flex-col bg-transparent group cursor-pointer w-full transition-all duration-300 relative"
                onClick={(e) => handlePlaylistPlay(e, playlist.id)}
              >
                <div className="relative w-full aspect-[1.15] mb-6">
                   <PlaylistArtwork playlist={playlist} className="absolute top-0 right-0 w-[78%] aspect-square shadow-md hover:scale-[1.02] transition-transform cursor-pointer z-0" />
                   <PlaylistArtwork playlist={playlist} className="absolute top-[3%] right-[11%] w-[78%] aspect-square shadow-md hover:scale-[1.02] transition-transform cursor-pointer z-10" />
                   
                   <div className="absolute top-[6%] left-0 w-[78%] aspect-square shadow-xl hover:scale-[1.02] transition-transform cursor-pointer z-20 group/artwork relative">
                     <PlaylistArtwork playlist={playlist} className="w-full h-full" />
                     
                     <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none opacity-0 group-hover/artwork:opacity-100">
                        <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-white transition-transform scale-100 group-hover/artwork:scale-105 shadow-xl">
                          {playingPlaylistId === playlist.id && isPlaying ? (
                             <Pause className="w-4 h-4 fill-current" />
                          ) : (
                             <Play className="w-4 h-4 fill-current" style={{ transform: 'translateX(4.166%)' }} />
                          )}
                        </div>
                     </div>
                   </div>
                </div>
                <div className="flex flex-col pb-2">
                  <span className="font-bold text-[18px] text-black">{playlist.title}</span>
                  <span className="font-sans text-[13px] text-black/50 mt-0.5">{playlist.track_count} tracks</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search less, create more */}
        <div className="w-full py-24 md:py-32 flex flex-col items-center text-center mx-auto border-b border-black/10 pointer-events-none select-none relative overflow-hidden" aria-hidden="true">
          
          {/* HUGE DRIBBBLE LOGO WATERMARK */}
          <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" className="absolute -bottom-40 -right-20 w-[150%] md:w-[90%] opacity-[0.02] rotate-6 pointer-events-none select-none mix-blend-multiply z-0" alt="" />

          <h2 className="relative z-10 text-4xl md:text-5xl lg:text-7xl font-bold uppercase tracking-tighter leading-[1.05] mb-16">
            Search less, create more.
          </h2>

          <div className="w-full max-w-[1400px] px-6 md:px-12 flex flex-col gap-24 mt-8">
            
            {/* Feature 1: Intelligent Search */}
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24 w-full">
              {/* Preview Box (Left) */}
              <div className="w-full md:w-[65%] bg-[#f6f6f6] rounded-2xl p-8 md:p-12 flex flex-col h-[400px] relative overflow-hidden border border-black/5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-black/40 mb-10 text-left">Try our AI driven search</div>
                
                {/* Mock Search Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-black/10 flex items-center px-5 py-4 mb-8 relative z-10 mx-auto w-full">
                  <Search className="w-6 h-6 text-black/40 mr-4 shrink-0" />
                  
                  {/* Typing container */}
                  <div className="font-sans text-[14px] md:text-[15px] text-black h-5 relative flex items-center w-full">
                     <span className="animate-typing-1 absolute left-0 overflow-hidden whitespace-nowrap top-0 bottom-0 flex items-center pr-1">cinematic sci-fi drums</span>
                     <span className="animate-typing-2 absolute left-0 overflow-hidden whitespace-nowrap top-0 bottom-0 flex items-center pr-1">upbeat corporate acoustic</span>
                     <span className="animate-typing-3 absolute left-0 overflow-hidden whitespace-nowrap top-0 bottom-0 flex items-center pr-1">dark synthwave chase</span>
                     <span className="animate-typing-4 absolute left-0 overflow-hidden whitespace-nowrap top-0 bottom-0 flex items-center pr-1">lo-fi chill beats</span>
                     <span className="animate-typing-5 absolute left-0 overflow-hidden whitespace-nowrap top-0 bottom-0 flex items-center pr-1">epic orchestral trailer</span>
                  </div>
                </div>

                {/* Mock Results */}
                <div className="flex flex-col gap-4 animate-results mx-auto w-full">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-black/5 flex items-center gap-5 shadow-sm">
                      <div className="w-12 h-12 bg-black/5 rounded-md flex-shrink-0" />
                      <div className="flex flex-col gap-2 w-full">
                        <div className="h-3 bg-black/20 rounded w-1/3" />
                        <div className="h-2.5 bg-black/10 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Gradient fade at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f6f6f6] to-transparent z-10" />
              </div>

              {/* Description (Right) */}
              <div className="w-full md:w-[35%] flex flex-col text-left">
                <h3 className="text-3xl font-bold uppercase tracking-tighter mb-4">Find the exact vibe.</h3>
                <p className="font-sans text-black/60 text-sm leading-relaxed uppercase tracking-wide">
                  Describe what you need in plain English. Our search engine understands mood, instrumentation, and genre, delivering pinpoint accuracy in seconds.
                </p>
              </div>
            </div>

            {/* Feature 2: Toggle Preview */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24 w-full">
              {/* Preview Box (Right) */}
              <div className="w-full md:w-[65%] bg-black text-white rounded-2xl p-8 md:p-12 flex flex-col h-[400px] relative overflow-hidden shadow-2xl">
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-10 text-left">Instant Toggle Preview</div>
                
                {/* Mock Track Row */}
                <div className="mt-auto mb-auto w-full mx-auto border border-white/10 rounded-2xl p-5 flex flex-col gap-8 bg-white/5 backdrop-blur-md relative">
                  
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white/10 rounded flex items-center justify-center">
                        <Play className="w-5 h-5 fill-white" style={{ transform: 'translateX(4.166%)' }} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="w-32 h-3.5 bg-white/40 rounded" />
                        <div className="w-20 h-2.5 bg-white/20 rounded" />
                      </div>
                    </div>
                    
                    {/* The Animated Toggle */}
                    <div className="flex items-center gap-3">
                      <span className="font-sans text-[10px] uppercase tracking-widest text-white/50 hidden sm:inline">Preview</span>
                      <div className="w-12 h-6 rounded-full relative animate-narrative-bg p-0.5 transition-colors overflow-hidden">
                        <div className="w-5 h-5 bg-white rounded-full shadow-sm animate-narrative-knob relative z-10" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* The Animated Waveform */}
                <div className="w-full h-12 relative">
                  {/* Background Preview Box overlay with Brackets */}
                  <div className="absolute inset-y-[-25%] left-1/4 w-1/2 bg-white/5 animate-narrative-preview pointer-events-none z-0">
                    <div className="absolute inset-0 rounded-lg border-[1.5px] border-white/30" />
                  </div>
                  
                  {/* Layer 1: Gray static waveform */}
                  <div className="absolute inset-0 flex items-center gap-[1px] z-10">
                    {Array.from({ length: 120 }).map((_, i) => {
                      const seed = Math.sin(i) * 10000;
                      const h = 20 + (seed - Math.floor(seed)) * 80;
                      return (
                        <div 
                          key={`bg-${i}`} 
                          className="flex-1 bg-white/20 rounded-full"
                          style={{ height: `${h}%` }}
                        />
                      )
                    })}
                  </div>

                  {/* Layer 2: Colored progress waveform (White Level 2) */}
                  <div className="absolute inset-0 flex items-center gap-[1px] z-20 animate-track-progress">
                    {Array.from({ length: 120 }).map((_, i) => {
                       const seed = Math.sin(i) * 10000;
                       const h = 20 + (seed - Math.floor(seed)) * 80;
                       return (
                         <div 
                           key={`fg1-${i}`} 
                           className="flex-1 bg-white/40 rounded-full"
                           style={{ height: `${h}%` }}
                         />
                       )
                    })}
                  </div>

                  {/* Layer 3: Vivid progress waveform in the middle (White Level 3), visible only when active */}
                  <div className="absolute inset-y-0 z-30 animate-narrative-preview overflow-hidden" style={{ left: '25%', width: '50%' }}>
                    <div className="absolute inset-y-0 left-[-50%] w-[200%] flex items-center gap-[1px] animate-track-progress">
                      {Array.from({ length: 120 }).map((_, i) => {
                         const seed = Math.sin(i) * 10000;
                         const h = 20 + (seed - Math.floor(seed)) * 80;
                         return (
                           <div 
                             key={`fg2-${i}`} 
                             className="flex-1 bg-white rounded-full"
                             style={{ height: `${h}%` }}
                           />
                         )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description (Left) */}
              <div className="w-full md:w-[35%] flex flex-col text-left">
                <h3 className="text-3xl font-bold uppercase tracking-tighter mb-4">Preview instantly.</h3>
                <p className="font-sans text-black/60 text-sm leading-relaxed uppercase tracking-wide">
                  Don't waste time clicking into every track. Flip the preview toggle to instantly scrub through the best parts of any song directly from the search results.
                </p>
              </div>
            </div>

          </div>

          <div className="mt-20 pointer-events-auto">
            <button 
              onClick={() => navigate('/browse')}
              className="px-10 py-5 bg-black text-white font-bold uppercase text-xs tracking-widest hover:bg-black/80 transition-colors rounded-full shadow-lg"
            >
              Browse the Catalog
            </button>
          </div>
        </div>


      </main>

      {/* Beyond the Library (Dark Mode) */}
      <div className="pt-20 pb-24 md:pt-24 md:pb-32 flex flex-col items-center text-center bg-[#111] text-white full-bleed">
        <h2 className="text-5xl md:text-6xl lg:text-8xl font-bold uppercase tracking-tighter mb-6 leading-[0.9]">
          Beyond the Library
        </h2>
        <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/50 mb-8 border-b-2 border-white/10 pb-4">
          Custom Music and Sound
        </div>
        <p className="font-sans text-sm md:text-base uppercase leading-relaxed tracking-wide text-white/50 max-w-2xl mb-12 px-6">
          Some projects demand a completely original sound. We craft bespoke scores and custom sound design for high-stakes campaigns.
        </p>
        <button 
          onClick={() => setContactModalOpen(true)}
          className="px-10 py-5 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-white/90 transition-colors rounded-full"
        >
          Get in Touch
        </button>
      </div>

    </div>
  );
}
