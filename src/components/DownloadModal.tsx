import React, { useState, useEffect } from 'react';
import { useDownload } from '../context/DownloadContext';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { X, Download, ShieldCheck, FileAudio, Music, AudioLines } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../context/SettingsContext';

export default function DownloadModal() {
  const { downloadTrack, buttonRect, closeDownloadModal } = useDownload();
  const { openLicenseModal } = useLicense();
  const { profile } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<'mp3'|'wav'|'aiff'|null>(null);

  const isOpen = !!downloadTrack;
  const cleanName = downloadTrack?.file_name.replace(/\.[^/.]+$/, "") || "";
  
  const { settings } = useSettings();
  const isSubscriber = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
  
  const showDropdown = isSubscriber || settings.free_hd_enabled;
  const draftFormat = settings.free_watermarks_enabled ? 'watermarked' : 'mp3';
  const draftTitle = settings.free_watermarks_enabled ? 'Draft' : 'Download MP3';
  const draftSub = settings.free_watermarks_enabled ? 'Watermarked Audio' : 'Clean Audio File';
  
  const handleTryIt = async () => {
    if (!downloadTrack) return;
    setIsDownloading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('get_download_url', {
        body: { trackId: downloadTrack.id, format: draftFormat }
      });
      
      if (error || !data?.url) {
        console.warn("Watermarked URL not found for this track or unauthorized", error);
        return;
      }
      const url = data.url;
    
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = draftFormat === 'watermarked' ? `${cleanName}_watermarked.m4a` : `${cleanName}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed, falling back to new tab:", error);
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
      closeDownloadModal();
    }
  };

  const handleDirectDownload = async (format: 'mp3' | 'wav' | 'aiff') => {
    if (!downloadTrack) return;
    setDownloadingFormat(format);
    
    try {
      const { data, error } = await supabase.functions.invoke('get_download_url', {
        body: { trackId: downloadTrack.id, format }
      });
      
      if (error || !data?.url) {
        throw new Error(error?.message || "URL not found for format");
      }
      
      const url = data.url;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${cleanName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed, falling back to new tab:", error);
      window.open(url, '_blank');
    } finally {
      setDownloadingFormat(null);
      closeDownloadModal();
    }
  };

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && buttonRect && showDropdown) {
      setDropdownStyle({
        bottom: `${window.innerHeight - buttonRect.top + 8}px`,
        left: `${buttonRect.left}px`,
        width: `${buttonRect.width}px`
      });
    }
  }, [isOpen, buttonRect, showDropdown]);

  if (showDropdown) {
    // Subscriber View: Dropdown Popover
    return (
      <div className={`fixed inset-0 z-[200] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Invisible backdrop to capture outside clicks */}
        <div className={`absolute inset-0 ${isOpen ? 'block' : 'hidden'}`} onClick={closeDownloadModal} />
        
        <div 
          style={dropdownStyle}
          className={`absolute bg-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] border border-black/10 rounded-xl p-1 flex flex-col gap-1 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'}`}
        >
          {/* MP3 Button */}
          {downloadTrack?.has_mp3 !== false && (
            <button 
              onClick={() => handleDirectDownload('mp3')}
              disabled={!!downloadingFormat}
              className={`w-full flex flex-col items-center justify-center p-2 rounded-lg transition-all relative overflow-hidden text-center ${downloadingFormat === 'mp3' ? 'bg-[#f0f0f0] cursor-not-allowed' : 'hover:bg-black/5'}`}
            >
              {downloadingFormat === 'mp3' && (
                <div className="absolute inset-0 bg-black/5 animate-pulse" />
              )}
              <div className="flex flex-col relative z-10 w-full items-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-black flex items-center justify-center gap-2">
                  MP3 {downloadingFormat === 'mp3' && <div className="w-2.5 h-2.5 border border-black/20 border-t-black rounded-full animate-spin" />}
                </span>
                <span className="text-[9px] font-sans text-black/50 mt-0.5">320kbps</span>
              </div>
            </button>
          )}

          {/* WAV Button */}
          {downloadTrack?.has_wav && (
            <button 
              onClick={() => handleDirectDownload('wav')}
              disabled={!!downloadingFormat}
              className={`w-full flex flex-col items-center justify-center p-2 rounded-lg transition-all relative overflow-hidden text-center ${downloadingFormat === 'wav' ? 'bg-[#f0f0f0] cursor-not-allowed' : 'hover:bg-black/5'}`}
            >
              {downloadingFormat === 'wav' && (
                <div className="absolute inset-0 bg-black/5 animate-pulse" />
              )}
              <div className="flex flex-col relative z-10 w-full items-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-black flex items-center justify-center gap-2">
                  WAV {downloadingFormat === 'wav' && <div className="w-2.5 h-2.5 border border-black/20 border-t-black rounded-full animate-spin" />}
                </span>
                <span className="text-[9px] font-sans text-black/50 mt-0.5">44.1kHz</span>
              </div>
            </button>
          )}

          {/* AIF Button */}
          {downloadTrack?.has_aiff && (
            <button 
              onClick={() => handleDirectDownload('aiff')}
              disabled={!!downloadingFormat}
              className={`w-full flex flex-col items-center justify-center p-2 rounded-lg transition-all relative overflow-hidden text-center ${downloadingFormat === 'aiff' ? 'bg-[#f0f0f0] cursor-not-allowed' : 'hover:bg-black/5'}`}
            >
              {downloadingFormat === 'aiff' && (
                <div className="absolute inset-0 bg-black/5 animate-pulse" />
              )}
              <div className="flex flex-col relative z-10 w-full items-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-black flex items-center justify-center gap-2">
                  AIF {downloadingFormat === 'aiff' && <div className="w-2.5 h-2.5 border border-black/20 border-t-black rounded-full animate-spin" />}
                </span>
                <span className="text-[9px] font-sans text-black/50 mt-0.5">48kHz</span>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Non-Subscriber View: Try It / License Modal
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={closeDownloadModal} />
      
      <div className={`relative z-10 w-full max-w-lg bg-[#fafafa] shadow-2xl overflow-hidden rounded-[32px] p-8 border border-black/10 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 pr-4 overflow-hidden">
            <div className="w-12 h-12 rounded-lg bg-black/5 shrink-0 overflow-hidden relative">
              <img src={downloadTrack?.artwork_url || "https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/default_artwork.png"} alt="Artwork" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-semibold uppercase tracking-tighter truncate">
              {cleanName}
            </h2>
          </div>
          <button onClick={closeDownloadModal} className="p-2 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          
          {/* Try It Button */}
          <button 
            onClick={handleTryIt}
            disabled={isDownloading}
            className={`w-full flex items-center p-4 border border-black/10 rounded-2xl transition-all group relative overflow-hidden ${isDownloading ? 'bg-[#f0f0f0] cursor-not-allowed' : 'bg-white hover:border-black/30 hover:shadow-md'}`}
          >
            {isDownloading && (
              <div className="absolute inset-0 bg-black/5 animate-pulse" />
            )}
            
            <div className="flex flex-col items-start relative z-10">
              <span className="text-lg font-semibold uppercase tracking-tight text-black">{draftTitle}</span>
              <span className="text-[12px] text-black/50 mt-0.5">{draftSub}</span>
            </div>

            <div className="ml-auto p-3 rounded-full bg-black/5 group-hover:bg-black group-hover:text-white transition-colors relative z-10">
              {isDownloading ? (
                <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <Download className="w-6 h-6" />
              )}
            </div>
          </button>

          {settings.subscriptions_enabled && (
            <button 
              onClick={() => {
                if (downloadTrack) {
                  openLicenseModal(downloadTrack);
                  closeDownloadModal();
                }
              }}
              className="w-full flex items-center p-5 border border-black/10 rounded-2xl transition-all hover:border-black/30 hover:shadow-md bg-white group relative overflow-hidden"
            >
              <div className="flex flex-col items-start relative z-10">
                <span className="text-lg font-semibold uppercase tracking-tight text-black">License</span>
                <span className="text-[12px] text-black/50 mt-0.5">Clean Audio File</span>
              </div>
              
              <div className="ml-auto p-3 rounded-full bg-black/5 group-hover:bg-black group-hover:text-white transition-colors relative z-10">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </button>
          )}
          
        </div>
      </div>
    </div>
  );
}
