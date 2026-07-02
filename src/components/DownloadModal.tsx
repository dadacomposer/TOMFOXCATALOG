import React, { useState, useEffect } from 'react';
import { useDownload } from '../context/DownloadContext';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { X, Download, ShieldCheck, FileAudio, Music, AudioLines } from 'lucide-react';

export default function DownloadModal() {
  const { downloadTrack, buttonRect, closeDownloadModal } = useDownload();
  const { openLicenseModal } = useLicense();
  const { profile } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  const isOpen = !!downloadTrack;
  const cleanName = downloadTrack?.file_name.replace(/\.[^/.]+$/, "") || "";
  
  const hasSubscription = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
  
  const handleTryIt = async () => {
    setIsDownloading(true);
    const url = `https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/watermarked/${encodeURIComponent(cleanName)}.m4a`;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${cleanName}_watermarked.m4a`;
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

  const handleDirectDownload = async () => {
    setIsDownloading(true);
    const url = downloadTrack?.r2_url;
    if (!url) {
      setIsDownloading(false);
      return;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${cleanName}.mp3`;
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

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && buttonRect && hasSubscription) {
      setDropdownStyle({
        bottom: `${window.innerHeight - buttonRect.top + 8}px`,
        left: `${buttonRect.left}px`,
        width: `${buttonRect.width}px`
      });
    }
  }, [isOpen, buttonRect, hasSubscription]);

  if (hasSubscription) {
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
          <button 
            onClick={handleDirectDownload}
            disabled={isDownloading}
            className={`w-full flex flex-col items-center justify-center p-2 rounded-lg transition-all relative overflow-hidden text-center ${isDownloading ? 'bg-[#f0f0f0] cursor-not-allowed' : 'hover:bg-black/5'}`}
          >
            {isDownloading && (
              <div className="absolute inset-0 bg-black/5 animate-pulse" />
            )}
            <div className="flex flex-col relative z-10 w-full items-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-black flex items-center justify-center gap-2">
                MP3 {isDownloading && <div className="w-2.5 h-2.5 border border-black/20 border-t-black rounded-full animate-spin" />}
              </span>
              <span className="text-[9px] font-sans text-black/50 mt-0.5">320kbps</span>
            </div>
          </button>

          {/* WAV Button */}
          <button 
            onClick={() => alert('WAV high quality files are currently being uploaded. Try again later.')}
            className="w-full flex flex-col items-center justify-center p-2 rounded-lg transition-all hover:bg-black/5 text-center"
          >
            <div className="flex flex-col w-full items-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-black">WAV</span>
              <span className="text-[9px] font-sans text-black/50 mt-0.5">44.1kHz</span>
            </div>
          </button>

          {/* AIF Button */}
          <button 
            onClick={() => alert('AIF studio files are currently being uploaded. Try again later.')}
            className="w-full flex flex-col items-center justify-center p-2 rounded-lg transition-all hover:bg-black/5 text-center"
          >
            <div className="flex flex-col w-full items-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-black">AIF</span>
              <span className="text-[9px] font-sans text-black/50 mt-0.5">48kHz</span>
            </div>
          </button>
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
              <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/default_artwork.png" alt="Artwork" className="w-full h-full object-cover" />
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
              <span className="text-lg font-semibold uppercase tracking-tight text-black">Draft</span>
              <span className="text-[12px] text-black/50 mt-0.5">Watermarked Audio</span>
            </div>

            <div className="ml-auto p-3 rounded-full bg-black/5 group-hover:bg-black group-hover:text-white transition-colors relative z-10">
              {isDownloading ? (
                <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <Download className="w-6 h-6" />
              )}
            </div>
          </button>

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
          
        </div>
      </div>
    </div>
  );
}
