import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Pause } from 'lucide-react';
import { usePlayer, Track } from '../../context/PlayerContext';
import { DEFAULT_COMPOSERS } from '../../config';
import TrackArtwork from '../TrackArtwork';
import { generateEmbedding } from '../../lib/embedding';
import { searchTracksByEmbedding, fetchTracksByIds } from '../../lib/supabase';
import WaveformView from '../WaveformView';
import { parseWaveform } from '../../lib/audioUtils';

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

const cleanTitle = (filename: string) => {
  return filename
    .replace(/\.[^/.]+$/, "") 
    .replace(/^\d{2,4}\s/, "")
    .replace(/_v\d+$/i, "")
    .trim();
};

export default function TrackDetailsModal() {
  const { selectedTrackForDetails, setSelectedTrackForDetails, currentTrack, isPlaying, togglePlay, playTrack, progress, setPendingSeek } = usePlayer();
  const [similarTracks, setSimilarTracks] = useState<Track[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [expandedSection, setExpandedSection] = useState<{ label: string, tags: string[], rect: DOMRect } | null>(null);
  const [localTrack, setLocalTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (selectedTrackForDetails) {
      setLocalTrack(selectedTrackForDetails);
    } else {
      setExpandedSection(null);
      const t = setTimeout(() => setLocalTrack(null), 500);
      return () => clearTimeout(t);
    }
  }, [selectedTrackForDetails]);

  const displayTrack = selectedTrackForDetails || localTrack;

  useEffect(() => {
    const handleScroll = () => setExpandedSection(null);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!displayTrack) {
      setSimilarTracks([]);
      return;
    }

    let isMounted = true;
    
    async function fetchSimilar() {
      if (!displayTrack) return;
      setLoadingSimilar(true);
      try {
        const queryStr = `${displayTrack.file_name} ${parseTags(displayTrack.subgenre).join(' ')} ${parseTags(displayTrack.moods).join(' ')} ${parseTags(displayTrack.instruments).join(' ')}`;
        const vector = await generateEmbedding(queryStr);
        if (vector) {
          const similarRaw = await searchTracksByEmbedding(vector);
          const similarIds = similarRaw
            .filter((r: any) => r.id !== displayTrack.id)
            .slice(0, 5)
            .map((r: any) => r.id);
            
          if (similarIds.length > 0) {
            const tracks = await fetchTracksByIds(similarIds);
            // sort them by the order in similarIds
            const sorted = similarIds.map((id: string) => tracks.find((t: any) => t.id === id)).filter(Boolean);
            if (isMounted) setSimilarTracks(sorted);
          } else {
            if (isMounted) setSimilarTracks([]);
          }
        }
      } catch (err) {
        console.error("Error fetching similar tracks:", err);
      } finally {
        if (isMounted) setLoadingSimilar(false);
      }
    }

    fetchSimilar();

    return () => { isMounted = false; };
  }, [displayTrack]);

  if (!displayTrack) return null;

  return (
    <div className={`fixed inset-0 z-[40] flex items-center justify-center p-4 pt-[100px] transition-all duration-500 ease-out ${selectedTrackForDetails ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => setSelectedTrackForDetails(null)} 
      />
      <div 
        className={`relative w-full max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar max-w-[90vw] md:max-w-7xl bg-[#fafafa] rounded-3xl shadow-2xl transition-all duration-500 ease-out ${selectedTrackForDetails ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}
        onClick={() => setExpandedSection(null)}
      >
        
        {/* Close Button - Top Right Aligned */}
        <button 
          onClick={() => setSelectedTrackForDetails(null)} 
          className="absolute top-6 right-6 md:top-10 md:right-10 w-10 h-10 z-50 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 md:gap-12 relative z-10">
          {/* Left Column: Artwork & Player */}
          <div className="w-full md:w-[40%] lg:w-1/3 shrink-0 flex flex-col gap-6">
            <div className="w-full aspect-square bg-black/5 rounded-2xl overflow-hidden relative shadow-lg group">
              <TrackArtwork track={displayTrack} className="absolute inset-0 w-full h-full" />
              
              {/* Animated Play Button / Waveform Slider */}
              <div
                className={`absolute bottom-4 left-4 h-14 rounded-full flex items-center shadow-xl z-10 transition-all duration-500 overflow-hidden ${
                  currentTrack?.id === displayTrack.id && isPlaying
                    ? 'w-[calc(100%-2rem)] bg-[#1a1a1a] text-white pr-5'
                    : 'w-14 bg-white text-black hover:scale-105 active:scale-95 cursor-pointer'
                }`}
                onClick={(e) => {
                  if (currentTrack?.id === displayTrack.id && isPlaying) return;
                  e.stopPropagation();
                  if (currentTrack?.id === displayTrack.id) {
                    togglePlay();
                  } else {
                    playTrack(displayTrack!, undefined, 'browse');
                  }
                }}
              >
                <button 
                  className="w-14 h-14 shrink-0 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  onClick={(e) => {
                    if (currentTrack?.id === displayTrack.id && isPlaying) {
                      e.stopPropagation();
                      togglePlay();
                    }
                  }}
                >
                  {currentTrack?.id === displayTrack.id && isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" style={{ transform: 'translateX(4.166%)' }} />
                  )}
                </button>
              </div>

              {/* Absolute Waveform Container (Doesn't animate width, preventing accordion) */}
              <div 
                className={`absolute bottom-4 left-[72px] right-[36px] h-14 flex items-center z-20 transition-opacity duration-300 ${
                  currentTrack?.id === displayTrack.id && isPlaying 
                    ? 'opacity-100 delay-[200ms] pointer-events-auto' 
                    : 'opacity-0 pointer-events-none'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full h-8 pt-1">
                  <WaveformView
                    data={parseWaveform(displayTrack.waveform_data)}
                    isPlaying={isPlaying}
                    progress={progress}
                    onSeek={setPendingSeek}
                    isDark={true}
                  />
                </div>
              </div>
            </div>
            
            {displayTrack.description && (
              <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-black/5 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3">About this track</h3>
                <p className="text-sm text-white/90 leading-relaxed font-sans">{displayTrack.description}</p>
              </div>
            )}
          </div>
          
          {/* Right Column: Metadata */}
          <div className="flex-1 flex flex-col pt-2">
            <div className="mb-8 pr-12">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">{cleanTitle(displayTrack.file_name)}</h1>
              <p className="text-lg text-black/60 font-sans">
                {displayTrack.composers ? (Array.isArray(displayTrack.composers) ? displayTrack.composers.join(', ') : displayTrack.composers) : DEFAULT_COMPOSERS.join(', ')}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Release Date</div>
                <div className="font-sans text-sm font-bold">
                  {displayTrack.release_date || displayTrack.created_at ? new Date(displayTrack.release_date || displayTrack.created_at || '').toLocaleDateString() : 'Unknown'}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Tempo</div>
                <div className="font-sans text-sm font-bold">{(displayTrack as any).energy_level || '—'}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Key</div>
                <div className="font-sans text-sm font-bold">{displayTrack.key || '—'}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Scale</div>
                <div className="font-sans text-sm font-bold">{displayTrack.scale || '—'}</div>
              </div>
            </div>
            
            <div className="space-y-6">
              {(() => {
                const tags = [
                  { label: 'Moods', value: parseTags(displayTrack.moods) },
                  { label: 'Instruments', value: parseTags(displayTrack.instruments) },
                  { label: 'Scenarios', value: parseTags(displayTrack.scenarios) }
                ].filter(t => t.value.length > 0);
                
                if (tags.length === 0) {
                   return <div className="text-sm text-black/40 italic">No tags available for this track.</div>;
                }
                
                return tags.map(section => {
                  const isExpanded = expandedSection?.label === section.label;
                  const hasMore = section.value.length > 3;

                  return (
                    <div key={section.label}>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-3">{section.label}</h3>
                      <div className="flex flex-wrap gap-2 items-center">
                        {section.value.slice(0, 3).map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-white border border-black/5 text-black rounded-lg text-xs font-sans hover:border-black/20 transition-colors shadow-sm cursor-default">
                            {tag}
                          </span>
                        ))}
                        {hasMore && (
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isExpanded) {
                                  setExpandedSection(null);
                                } else {
                                  setExpandedSection({ label: section.label, tags: section.value, rect: e.currentTarget.getBoundingClientRect() });
                                }
                              }}
                              className={`px-3 py-1.5 text-black rounded-lg text-xs font-sans font-bold transition-colors ${isExpanded ? 'bg-black text-white' : 'bg-black/5 hover:bg-black/10'}`}
                            >
                              {isExpanded ? 'Close' : `+${section.value.length - 3} more`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Similar Tracks Section */}
            {(loadingSimilar || similarTracks.length > 0) && (
              <div className="mt-8 pt-6 border-t border-black/10 pb-0">
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-4">
                  {loadingSimilar ? 'Finding Similar Tracks...' : 'Similar Tracks'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {loadingSimilar ? (
                    Array(5).fill(0).map((_, i) => (
                      <div key={`skel-${i}`} className="animate-pulse">
                        <div className="w-full aspect-square bg-black/5 rounded-xl mb-3"></div>
                        <div className="h-3 bg-black/5 rounded w-3/4 mb-1.5 mt-1"></div>
                        <div className="h-2.5 bg-black/5 rounded w-1/2"></div>
                      </div>
                    ))
                  ) : (
                    similarTracks.map(simTrack => (
                      <div key={simTrack.id} className="relative">
                        <div 
                          className="group w-full aspect-square bg-black/5 rounded-xl overflow-hidden relative shadow-sm cursor-pointer mb-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentTrack?.id === simTrack.id) {
                              togglePlay();
                            } else {
                              playTrack(simTrack, undefined, 'browse');
                            }
                          }}
                        >
                          <TrackArtwork track={simTrack} className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentTrack?.id === simTrack.id) {
                                  togglePlay();
                                } else {
                                  playTrack(simTrack, undefined, 'browse');
                                }
                              }}
                            >
                              {currentTrack?.id === simTrack.id && isPlaying ? (
                                <Pause className="w-4 h-4 text-black fill-current" />
                              ) : (
                                <Play className="w-4 h-4 text-black fill-current" style={{ transform: 'translateX(4.166%)' }} />
                              )}
                            </button>
                          </div>
                        </div>
                        <div 
                          className="font-bold text-xs truncate hover:underline cursor-pointer"
                          onClick={() => setSelectedTrackForDetails(simTrack)}
                        >
                          {cleanTitle(simTrack.file_name)}
                        </div>
                        <div className="text-[10px] text-black/50 font-sans truncate">
                          {simTrack.composers ? (Array.isArray(simTrack.composers) ? simTrack.composers.join(', ') : simTrack.composers) : DEFAULT_COMPOSERS.join(', ')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {expandedSection && createPortal(
        <div 
          className="fixed p-3 bg-white border border-black/10 rounded-xl shadow-2xl z-[150] w-max max-w-[280px] md:max-w-[400px] flex flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
          style={{
            top: expandedSection.rect.bottom + 8,
            ...(expandedSection.rect.left > window.innerWidth - 400 
              ? { right: window.innerWidth - expandedSection.rect.right } 
              : { left: expandedSection.rect.left })
          }}
        >
          {expandedSection.tags.map(tag => (
            <span key={tag} className="px-3 py-1.5 bg-[#fafafa] border border-black/5 text-black rounded-lg text-xs font-sans cursor-default hover:bg-black/5 transition-colors">
              {tag}
            </span>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
