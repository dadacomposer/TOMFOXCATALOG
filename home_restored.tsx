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
            <h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter mb-8 leading-[0.9]"
              dangerouslySetInnerHTML={{ __html: homeContent.hero_title || 'The Soundtrack <br />For Modern <br />Storytelling.' }}
            />
            
            <p className="font-sans uppercase text-sm mb-10 max-w-md leading-relaxed tracking-wide text-black/50">
              {homeContent.hero_subtitle || 'A meticulously curated library of 2,500+ premium tracks for media, ads, and film.'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
               <button onClick={() => navigate('/browse')} className="px-8 py-4 bg-black text-white font-bold uppercase text-xs tracking-widest hover:bg-black/80 transition-colors cursor-pointer">
                 {homeContent.hero_btn_1 || 'Browse'}
               </button>
               <button onClick={() => setLoginModalOpen(true)} className="px-8 py-4 border-2 border-black/10 font-bold uppercase text-xs tracking-widest hover:border-black transition-colors">
                 {homeContent.hero_btn_2 || 'Create Free Account'}
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
            <h2 
