import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { extractWaveformFromFile } from '../../utils/audioWaveform';
import { audioBufferToWav } from '../../utils/audioEncoder';

interface UploadVersionModalProps {
  projectId: string;
  originalDuration: number;
  existingAssets: any[];
  onComplete: () => void;
  onClose: () => void;
}

export default function UploadVersionModal({ projectId, originalDuration, existingAssets, onComplete, onClose }: UploadVersionModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');
  
  const [uploadStatus, setUploadStatus] = useState<'idle'|'processing'|'uploading'|'success'|'error'>('idle');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 100 * 1024 * 1024) {
        toast.error("File is too large (max 100MB)");
        return;
      }
      setFile(selected);
    }
  };

  const getAutoName = () => {
    const versions = existingAssets.filter(a => a.track_group !== 'Original Video Audio');
    if (versions.length === 0) return 'V.1';
    return `V.${versions.length + 1}`;
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('processing');

    try {
      // 1. Extract duration and waveform
      const { waveform, duration, audioBuffer } = await extractWaveformFromFile(file, 200);
      
      // 2. Validate duration (Tolerance ~0.5 seconds)
      if (originalDuration > 0) {
        const diff = Math.abs(duration - originalDuration);
        if (diff > 0.5) {
          throw new Error(`Duration mismatch: File is ${duration.toFixed(1)}s, original is ${originalDuration.toFixed(1)}s.`);
        }
      }

      // 3. Process File (Convert to WAV if it's a video)
      let uploadFile: File | Blob = file;
      let contentType = file.type;
      let fileExt = file.name.split('.').pop() || 'wav';
      
      if (file.type.startsWith('video/') && audioBuffer) {
        uploadFile = audioBufferToWav(audioBuffer);
        contentType = 'audio/wav';
        fileExt = 'wav';
      }

      setUploadStatus('uploading');

      // 4. Get Presigned URL
      const timestamp = Date.now();
      const trackName = customName.trim() || getAutoName();
      const safeName = trackName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filePath = `projects/${projectId}/${safeName}_${timestamp}.${fileExt}`;

      const { data, error: functionError } = await supabase.functions.invoke('r2_presigned_url', {
        body: { filePath, contentType }
      });

      if (functionError) throw functionError;
      if (!data?.presignedUrl || !data?.publicUrl) throw new Error("Failed to get upload URL");

      // 5. Upload to R2
      const uploadResponse = await fetch(data.presignedUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: { 'Content-Type': contentType }
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload file to storage");

      // 6. Save Asset to Database
      const { error: assetError } = await supabase
        .from('tf_studio_assets')
        .insert({
          project_id: projectId,
          asset_type: 'audio',
          file_url: data.publicUrl,
          track_group: trackName,
          is_public: true,
          waveform_data: waveform
        });

      if (assetError) throw assetError;

      setUploadStatus('success');
      toast.success("New version uploaded successfully!");
      onComplete();

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to upload new version");
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in font-outfit text-black">
      <div className="bg-[#fafafa] rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative flex flex-col gap-6 border border-black/5">
        
        <button 
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-1">Upload New Version</h2>
          <p className="text-sm text-black/50 font-sans">Must match original video duration ({originalDuration > 0 ? formatTime(originalDuration) : 'Unknown'}).</p>
        </div>

        <div className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Version Name (Optional)</label>
            <input 
              type="text" 
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={`e.g. ${getAutoName()}`}
              className="w-full bg-white border border-black/10 focus:border-black/30 focus:bg-white rounded-2xl p-4 transition-all outline-none font-sans text-sm"
              disabled={isUploading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">File</label>
            <div className={`bg-white border border-black/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-colors ${file ? 'border-black/30 bg-black/[0.02]' : 'hover:border-black/30'}`}>
              <div className="w-12 h-12 rounded-full bg-black/5 text-black flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              {file ? (
                <div className="flex flex-col items-center w-full">
                  <p className="font-bold text-sm mb-1 truncate max-w-full px-4">{file.name}</p>
                  <p className="text-xs text-black/50 mb-4">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  
                  {uploadStatus === 'processing' && <p className="text-xs font-bold text-purple-500 animate-pulse flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Processing & Validating...</p>}
                  {uploadStatus === 'uploading' && <p className="text-xs font-bold text-blue-500 animate-pulse flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Uploading to Server...</p>}
                  {uploadStatus === 'error' && <p className="text-xs font-bold text-red-500 flex items-center gap-1">Upload Failed</p>}

                  {(!isUploading) && (
                    <button onClick={() => { setFile(null); setUploadStatus('idle'); }} className="text-xs text-red-500 font-bold uppercase tracking-widest hover:text-red-600 transition-colors">Change File</button>
                  )}
                </div>
              ) : (
                <>
                  <p className="font-bold text-sm mb-1">Click to browse file</p>
                  <p className="text-xs text-black/50 mb-4 font-sans">Audio or Video format</p>
                  <label className="cursor-pointer bg-black text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black/80 transition-all inline-flex items-center gap-2">
                    <UploadCloud className="w-4 h-4" />
                    Select File
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="video/*,audio/*" 
                      onChange={handleFileSelect}
                      disabled={isUploading}
                    />
                  </label>
                </>
              )}
            </div>
          </div>

        </div>

        <button 
          onClick={handleSubmit}
          disabled={isUploading || !file}
          className="w-full bg-black text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : 'Upload Version'}
        </button>

      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
