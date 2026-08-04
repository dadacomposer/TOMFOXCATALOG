import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, FileAudio, AlertTriangle, Cloud, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { AdminTrack } from './AdminTracks';

type TrackFormatsModalProps = {
  track: AdminTrack;
  onClose: () => void;
  onUpdate: (updatedTrack: AdminTrack) => void;
};

type FormatType = {
  id: 'has_wav' | 'has_aiff' | 'has_watermarked' | 'has_mp3';
  label: string;
  ext: string;
  pathPrefix: string;
  colorClass: string;
  mimeType: string;
};

const FORMATS: FormatType[] = [
  { id: 'has_wav', label: 'HD WAV', ext: '.wav', pathPrefix: 'audio/hdaudio/', colorClass: 'bg-green-100 text-green-700', mimeType: 'audio/wav' },
  { id: 'has_aiff', label: 'HD AIFF', ext: '.aiff', pathPrefix: 'audio/hdaudio/', colorClass: 'bg-purple-100 text-purple-700', mimeType: 'audio/aiff' },
  { id: 'has_watermarked', label: 'Watermarked MP3', ext: '.mp3', pathPrefix: 'watermarked/', colorClass: 'bg-blue-100 text-blue-700', mimeType: 'audio/mpeg' },
  { id: 'has_mp3', label: 'Original MP3', ext: '.mp3', pathPrefix: 'audio/hdaudio/', colorClass: 'bg-orange-100 text-orange-700', mimeType: 'audio/mpeg' },
];

export default function TrackFormatsModal({ track, onClose, onUpdate }: TrackFormatsModalProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatType | null>(null);

  useLockBodyScroll(true);

  const handleDelete = async (format: FormatType) => {
    if (!confirm(`Are you sure you want to delete the ${format.label} file for this track? This will remove it from Cloudflare R2 immediately.`)) {
      return;
    }

    setIsProcessing(format.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error("Authentication required");

      const baseName = track.file_name.replace(/\.[^/.]+$/, "");
      const fileName = `${baseName}${format.ext}`;
      const filePath = `${format.pathPrefix}${fileName}`;

      const res = await fetch('https://jicrumwdnwmjkotkbjtg.supabase.co/functions/v1/r2_presigned_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          action: 'delete',
          filePath
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete file from R2");
      }

      let updateObj: any = { [format.id]: false };
      if (format.id === 'has_mp3') updateObj['r2_url'] = null;
      else if (format.id === 'has_wav') updateObj['wav_url'] = null;
      else if (format.id === 'has_aiff') updateObj['aiff_url'] = null;
      else if (format.id === 'has_watermarked') updateObj['watermarked_url'] = null;

      // Update Database
      const { error: updateError } = await supabase
        .from('tracks')
        .update(updateObj)
        .eq('id', track.id);

      if (updateError) throw updateError;

      toast.success(`${format.label} deleted successfully`);
      onUpdate({ ...track, [format.id]: false });
    } catch (err: any) {
      console.error(err);
      toast.error(`Error deleting file: ${err.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const triggerUpload = (format: FormatType) => {
    setSelectedFormat(format);
    if (fileInputRef.current) {
      fileInputRef.current.accept = format.mimeType;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFormat) return;
    
    // Clear input
    e.target.value = '';

    setIsProcessing(selectedFormat.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error("Authentication required");

      const baseName = track.file_name.replace(/\.[^/.]+$/, "");
      const fileName = `${baseName}${selectedFormat.ext}`;
      const filePath = `${selectedFormat.pathPrefix}${fileName}`;

      // 1. Get Presigned URL
      const res = await fetch('https://jicrumwdnwmjkotkbjtg.supabase.co/functions/v1/r2_presigned_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          action: 'upload',
          contentType: file.type || selectedFormat.mimeType,
          filePath
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { presignedUrl, publicUrl } = await res.json();

      // 2. Upload directly to R2
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || selectedFormat.mimeType,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`R2 Upload failed: ${uploadRes.statusText}`);
      }

      // 3. Update DB with new format URL and flag
      let updateObj: any = { [selectedFormat.id]: true };
      if (selectedFormat.id === 'has_mp3') updateObj['r2_url'] = publicUrl;
      else if (selectedFormat.id === 'has_wav') updateObj['wav_url'] = publicUrl;
      else if (selectedFormat.id === 'has_aiff') updateObj['aiff_url'] = publicUrl;
      else if (selectedFormat.id === 'has_watermarked') updateObj['watermarked_url'] = publicUrl;

      const { error: updateError } = await supabase
        .from('tracks')
        .update(updateObj)
        .eq('id', track.id);

      if (updateError) throw updateError;

      toast.success(`${selectedFormat.label} uploaded successfully`);
      onUpdate({ ...track, [selectedFormat.id]: true });
      
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsProcessing(null);
      setSelectedFormat(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-black">Format Manager</h2>
            <p className="text-sm text-black/50 mt-1">{track.file_name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-black/50" />
          </button>
        </div>

        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex gap-3 mb-8 text-sm leading-relaxed border border-yellow-200">
            <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-600" />
            <div>
              <p className="font-bold mb-1">Live Storage Management</p>
              <p>Changes made here immediately affect the Cloudflare R2 bucket and the public-facing availability of these formats. Deletions cannot be undone.</p>
            </div>
          </div>

          <div className="space-y-4">
            {FORMATS.map((format) => {
              const exists = !!track[format.id];
              const processing = isProcessing === format.id;

              return (
                <div key={format.id} className="p-5 border border-black/10 rounded-2xl flex flex-col gap-4 bg-white shadow-sm hover:border-black/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                        <FileAudio className={`w-5 h-5 ${exists ? 'text-black' : 'text-black/20'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-black">{format.label}</span>
                          {exists ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${format.colorClass}`}>Available</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-black/5 text-black/40">Missing</span>
                          )}
                        </div>
                        <p className="text-xs text-black/40 font-medium">Path: {format.pathPrefix}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {exists ? (
                        <>
                          <button 
                            disabled={!!isProcessing}
                            onClick={() => handleDelete(format)}
                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                            title="Delete from R2"
                          >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                          <button 
                            disabled={!!isProcessing}
                            onClick={() => triggerUpload(format)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-black/5 hover:bg-black/10 text-black font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                          >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            REPLACE
                          </button>
                        </>
                      ) : (
                        <button 
                          disabled={!!isProcessing}
                          onClick={() => triggerUpload(format)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-black/80 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          UPLOAD
                        </button>
                      )}
                    </div>
                  </div>
                  {exists && format.id === 'has_aiff' && (
                    <div className="w-full mt-2 flex items-center justify-center h-8 bg-black/5 rounded-lg border border-black/10">
                       <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Preview not supported by browser</span>
                    </div>
                  )}
                  {exists && format.id !== 'has_aiff' && (
                    <div className="w-full mt-2">
                      <audio 
                        controls 
                        className="w-full h-8"
                        src={`https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/${format.pathPrefix}${track.file_name.replace(/\.[^/.]+$/, "")}${format.ext}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
