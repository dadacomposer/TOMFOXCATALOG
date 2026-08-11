import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../context/PlayerContext';
import { useDownload } from '../context/DownloadContext';
import { Play, Pause, Download, Music, Loader2, ShoppingBag } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import WaveformView from '../components/WaveformView';
import TrackArtwork from '../components/TrackArtwork';
import Footer from '../components/Footer';
import { getPreviewTimings, parseWaveform } from '../lib/audioUtils';
import { DEFAULT_ARTIST, DEFAULT_ARTWORK } from '../config';

const parseTags = (t: string[] | string | undefined): string[] => {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  try { return JSON.parse(t); } catch(e) { return []; }
};

const cleanTitle = (filename: string) => {
  if (!filename) return 'Unknown Track';
  const noExt = filename.replace(/\.(mp3|wav|aif|aiff|m4a|ogg|flac)\s*$/i, '').trim();
  const cleaned = noExt.replace(/^\d+\s*-?\s*/, '').trim();
  return cleaned.length > 0 ? cleaned : noExt;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function SharedPlayer() {
  const { slug } = useParams<{ slug: string }>();
  const [tracks, setTracks] = useState<any[]>([]);
  const [linkData, setLinkData] = useState<any>(null);
  const [canDownload, setCanDownload] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, togglePlay, progress, setPendingSeek, setIsCurrentPreviewDormant, isPreviewMode, setIsPreviewMode } = usePlayer();
  const { openDownloadModal } = useDownload();

  useEffect(() => {
    async function fetchSharedLink() {
      try {
        setIsLoading(true);
        // Fetch shared link
        const { data: linkResult, error: linkError } = await supabase
          .from('shared_links')
          .select('*')
          .eq('slug', slug)
          .single();

        if (linkError) throw linkError;
        if (!linkResult) throw new Error('Link not found');
        if (!linkResult.is_active) throw new Error('Link deactivated');

        setLinkData(linkResult);
        setCanDownload(linkResult.can_download);

        // Fetch tracks
        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('*')
          .in('id', linkResult.track_ids);

        if (tracksError) throw tracksError;
        
        // Reorder tracks to match original selection order
        if (tracksData && Array.isArray(linkResult.track_ids)) {
          const ordered = linkResult.track_ids.map((id: string) => tracksData.find(t => t.id === id)).filter(Boolean);
          setTracks(ordered);
        } else {
          setTracks(tracksData || []);
        }
      } catch (err) {
        console.error('Error fetching shared link:', err);
        setError('This link is invalid or has expired.');
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) fetchSharedLink();
  }, [slug]);

  const handlePlayPause = (track: any) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, tracks);
    }
  };

  const handleSeek = (track: any, percentage: number) => {
    if (currentTrack?.id === track.id) {
       setIsCurrentPreviewDormant(true);
       setPendingSeek(percentage);
    } else {
       playTrack(track, tracks);
       setIsCurrentPreviewDormant(true);
       setPendingSeek(percentage);
    }
  };

  const handleDownloadAll = async () => {
    if (!canDownload || tracks.length === 0) return;
    
    setIsZipping(true);
    const toastId = toast.loading('Preparing your download (this may take a moment)...');
    
    try {
      const zip = new JSZip();
      
      let idx = 0;
      for (const track of tracks) {
        idx++;
        let format = 'mp3';
        if (track.has_wav || track.wav_url) {
          format = 'wav';
        } else if (track.has_aiff || track.aiff_url) {
          format = 'aiff';
        }

        const { data, error } = await supabase.functions.invoke('get_download_url', {
          body: { trackId: track.id, format, sharedSlug: slug }
        });
        if (error || !data?.url) continue;
        const url = data.url;
        
        // Fetch file blob
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${track.file_name}`);
        const blob = await response.blob();
        
        // Add to zip with clean name and exact format extension
        const baseTitle = cleanTitle(track.file_name).replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim();
        const numStr = tracks.length > 1 ? `${idx}. ` : '';
        const fileNameInZip = `${numStr}${baseTitle || 'track'}.${format}`;
        
        zip.file(fileNameInZip, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      saveAs(content, 'tom_fox_tracks.zip');
      toast.success('Download complete!', { id: toastId });
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to create ZIP file', { id: toastId });
    } finally {
      setIsZipping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-black animate-spin" />
      </div>
    );
  }

  if (error || tracks.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 text-center">
        <Music className="w-16 h-16 text-black/20 mb-4" />
        <h1 className="text-2xl font-bold text-black mb-2">Unavailable</h1>
        <p className="text-black/60">{error || 'No tracks found in this link.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      {/* Minimal Header */}
      <header className="w-full py-6 md:py-8 px-6 md:px-12 flex items-center justify-between border-b border-black/10 bg-[#fafafa] sticky top-0 z-50 shadow-sm">
        <a href="/" className="block hover:opacity-70 transition-opacity">
          <img 
            src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
            alt="Tom Fox" 
            className="h-7 md:h-9 object-contain opacity-90" 
          />
        </a>
        <div className="flex items-center gap-3 shrink-0 cursor-pointer group/preview z-10" onClick={() => setIsPreviewMode(!isPreviewMode)}>
          <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${isPreviewMode ? 'text-black group-hover/preview:text-black/70' : 'text-black/40 group-hover/preview:text-black/60'}`}>Preview</span>
          <div 
            className={`preview-toggle w-9 h-5 rounded-full p-[2px] transition-colors relative flex items-center shadow-inner ${isPreviewMode ? 'bg-white group-hover/preview:bg-[#eee]' : 'bg-[#333] group-hover/preview:bg-[#444]'}`}
          >
            <div className={`w-4 h-4 rounded-full transition-transform absolute shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${isPreviewMode ? 'translate-x-4 bg-black' : 'translate-x-0 bg-white'}`} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center pt-16 pb-48 px-6 md:px-12 w-full">
        <div className="w-full max-w-[1440px]">
          <div className="mb-12 text-center max-w-3xl mx-auto">
            <h2 className="text-[22px] font-bold uppercase tracking-tighter mb-6 text-black">
              The following track{tracks.length !== 1 && 's'} {tracks.length === 1 ? 'has' : 'have'} been shared with you
            </h2>
            {linkData?.notes && (
              <p className="text-black/60 font-sans text-sm max-w-2xl mx-auto whitespace-pre-wrap">{linkData.notes}</p>
            )}
          </div>

          {canDownload && (
            <div className="w-full flex items-center mb-6 justify-start">
              <button
                onClick={handleDownloadAll}
                disabled={isZipping}
                className="bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isZipping ? 'Zipping Files...' : 'Download All'}
              </button>
            </div>
          )}

        <div className="flex flex-col gap-1 w-full bg-white rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.06)] p-4 md:p-8 border border-black/5">
          {tracks.map((track, idx) => {
            return (
              <div 
                key={track.id}
                className="flex items-center gap-4 hover:bg-[#f6f6f6] p-2 rounded-xl group transition-colors cursor-pointer select-none border border-transparent hover:border-black/5"
                onClick={() => handlePlayPause(track)}
              >
                <div className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-lg relative overflow-hidden bg-black/5`}>
                  <TrackArtwork track={track} className="absolute inset-0 w-full h-full object-cover" />
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === track.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {currentTrack?.id === track.id && isPlaying ? (
                      <Pause className="w-4 h-4 fill-white text-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white text-white" style={{ transform: 'translateX(4.166%)' }} />
                    )}
                  </div>
                </div>
                <div className="flex flex-col justify-center w-[20%] shrink-0 pr-4">
                  <div className="font-bold truncate text-[14px]">{cleanTitle(track.file_name)}</div>
                  <div className="font-sans text-[12px] text-black/50 mt-0.5">{DEFAULT_ARTIST}</div>
                </div>
                
                <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%] overflow-hidden">
                  {(() => {
                    const human = parseTags((track as any).human_tags);
                    const subgenres = parseTags(track.subgenre);
                    const moods = parseTags(track.moods);
                    const scenarios = parseTags(track.scenarios);
                    const movement = parseTags(track.movement);
                    
                    const all = [...human, ...subgenres, ...moods, ...scenarios, ...movement];
                    const unique = Array.from(new Set(all));
                    const tags = unique.slice(0, 2);
                    
                    if (tags.length === 0) return null;

                    return tags.map((t, idx) => (
                      <span key={idx} onClick={e => e.stopPropagation()} className="px-2 py-1 bg-black/5 rounded text-[10px] font-bold text-black/60 uppercase tracking-widest whitespace-nowrap cursor-default">
                        {t}
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

                <div className="flex items-center justify-end gap-3 shrink-0 ml-auto">
                  <div className="text-[11px] font-sans font-bold text-black/40 tracking-wider text-right w-10">
                    {track.duration ? formatTime(track.duration) : '0:00'}
                  </div>
                  
                  {canDownload && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDownloadModal(track, e, { forceUnrestricted: true, sharedSlug: slug });
                      }}
                      className="p-1.5 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center text-black/40 hover:text-black shrink-0"
                      title="Download Track"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-16 text-center pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Want to hear more?</p>
          <a 
            href="/" 
            className="inline-flex items-center justify-center px-5 py-2.5 border-2 border-white rounded-lg text-xs font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-all hover:scale-105"
          >
            Browse Full Catalog
          </a>
        </div>
      </div>
      </div>
      <Footer isDark={true} />
    </div>
  );
}
