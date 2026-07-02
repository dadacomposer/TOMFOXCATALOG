import React, { useEffect, useState } from 'react';
import { fetchPlaylistTrackIds, fetchTracksByIds, supabase } from '../lib/supabase';
import { Play, Pause, Download, ShoppingBag, X, TrendingUp } from 'lucide-react';
import WaveformView from './WaveformView';
import { usePlayer } from '../context/PlayerContext';
import { parseWaveform, getPreviewTimings } from '../lib/audioUtils';
import { useDownload } from '../context/DownloadContext';
import { useLicense } from '../context/LicenseContext';

type Track = any;

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



interface PlaylistIslandProps {
  id: string;
  onClose: () => void;
  progress: number;
  handleSeek: (track: Track, percentage: number) => void;
  formatTime: (seconds: number) => string;
  newMusicTrackIds: Set<string>;
  trendingTrackIds: Set<string>;
}

export default function PlaylistIsland(props: PlaylistIslandProps) {
  const { id, onClose, progress, handleSeek, formatTime, newMusicTrackIds, trendingTrackIds } = props;
  const { playTrack, currentTrack, isPlaying, togglePlay, isPreviewMode, setIsPreviewMode } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistTitle, setPlaylistTitle] = useState('Playlist');
  const { openDownloadModal } = useDownload();
  const { openLicenseModal } = useLicense();

  useEffect(() => {
    async function load() {
      const [pDataRes, tIds] = await Promise.all([
        supabase.from('playlists').select('title').eq('id', id).single(),
        fetchPlaylistTrackIds(id)
      ]);
      
      if (pDataRes.data) setPlaylistTitle(pDataRes.data.title);
      
      if (tIds.length > 0) {
        // Fast initial load of first 15 tracks
        const firstChunk = await fetchTracksByIds(tIds.slice(0, 15));
        setTracks(firstChunk as Track[]);
        setLoading(false);
        
        // Background load of the rest
        if (tIds.length > 15) {
          fetchTracksByIds(tIds.slice(15)).then(restChunk => {
            setTracks(prev => [...prev, ...(restChunk as Track[])]);
          });
        }
      } else {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePlayPauseIsland = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, tracks, 'playlist');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      
      {/* Island Panel */}
      <div className="fixed inset-x-6 top-24 bottom-[100px] bg-[#fafafa] z-50 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col border border-black/10">
        <div className="px-8 py-8 border-b-2 border-black/5 flex items-center justify-between shrink-0 bg-[#fafafa]">
          <div className="min-h-[50px] flex flex-col justify-center">
            {loading ? (
              <>
                <div className="h-8 bg-[#e5e5e5] rounded w-64 animate-pulse mb-2" />
                <div className="h-3 bg-[#e5e5e5] rounded w-24 animate-pulse" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold uppercase tracking-tighter mb-1">{playlistTitle}</h1>
                <p className="text-black/50 uppercase font-bold tracking-widest text-[11px]">{tracks.length} Tracks</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 shrink-0 border-l border-black/10 pl-6 cursor-pointer group/preview" onClick={() => setIsPreviewMode(!isPreviewMode)}>
              <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${isPreviewMode ? 'text-black group-hover/preview:text-black/70' : 'text-black/30 group-hover/preview:text-black/60'}`}>Preview</span>
              <div 
                className={`preview-toggle w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center shadow-inner ${isPreviewMode ? 'bg-[#111111] group-hover/preview:bg-[#333]' : 'bg-[#e0e0e0] group-hover/preview:bg-[#d0d0d0]'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${isPreviewMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors text-black/40 hover:text-black">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto px-8 py-6 bg-[#fafafa]">
          {loading ? (
            <div className="flex flex-col gap-1 pb-16">
              {[...Array(8)].map((_, i) => (
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
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1 pb-16">
              {tracks.map((track) => (
                <div 
                  key={track.id}
                  className="flex items-center gap-4 hover:bg-[#f6f6f6] p-2 rounded-xl group transition-colors cursor-pointer select-none"
                  onClick={() => handlePlayPauseIsland(track)}
                >
                  <div className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-lg relative overflow-hidden bg-black/5`}>
                    <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/default_artwork.png" alt="Artwork" className={`absolute inset-0 w-full h-full object-cover`} />
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
                    <div className="font-bold truncate text-[14px]">{cleanTitle(track.file_name)}</div>
                    <div className="font-sans text-[12px] text-black/50 mt-0.5">Tom Fox</div>
                  </div>
                  
                  {/* TAGS Column */}
                  <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%] overflow-hidden">
                    {(() => {
                      const human = parseTags(track.human_tags);
                      const subgenres = parseTags(track.subgenre);
                      const moods = parseTags(track.moods);
                      const scenarios = parseTags(track.scenarios);
                      
                      const all = [...human, ...subgenres, ...moods, ...scenarios];
                      const unique = Array.from(new Set(all));
                      const tags = unique.slice(0, 2);
                      
                      if (tags.length === 0) return <span className="text-[10px] text-black/30 font-bold uppercase tracking-widest">Tagging...</span>;

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

                  <div className="hidden md:flex items-center justify-end gap-2 pr-4 shrink-0 w-[280px]">
                    <div className="text-[11px] font-sans font-bold text-black/40 tracking-wider w-10 text-right mr-2">
                      {track.duration ? formatTime(track.duration) : '0:00'}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-black/10 rounded hover:border-black/30 transition-colors bg-white font-sans text-[11px] uppercase tracking-widest text-black" onClick={e => { e.stopPropagation(); openDownloadModal(track, e); }}>
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-black/90 transition-colors font-sans text-[11px] uppercase tracking-widest" onClick={e => { e.stopPropagation(); openLicenseModal(track); }}>
                      <ShoppingBag className="w-3.5 h-3.5" /> License
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
