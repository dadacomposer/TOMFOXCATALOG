import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UploadCloud, Loader2, Link as LinkIcon, FileAudio, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { extractWaveformFromFile } from '../../utils/audioWaveform';

interface StudioOnboardingModalProps {
  projectId: string;
  onComplete: (mediaUrl?: string) => void;
  onSkip: () => void;
}

export default function StudioOnboardingModal({ projectId, onComplete, onSkip }: StudioOnboardingModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [referenceLinks, setReferenceLinks] = useState('');
  
  const [uploadStatus, setUploadStatus] = useState<'idle'|'uploading_video'|'extracting_waveform'|'uploading_waveform'|'success'|'error'>('idle');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | undefined>();
  const [extractedWaveform, setExtractedWaveform] = useState<number[] | null>(null);
  
  const [hasSourceFiles, setHasSourceFiles] = useState(false);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [isUploadingSourceFiles, setIsUploadingSourceFiles] = useState(false);

  const startBackgroundProcess = async (selectedFile: File) => {
    setUploadStatus('uploading_video');
    try {
        const ext = selectedFile.name.split('.').pop();
        const timestamp = Date.now();
        const filePath = `projects/${projectId}/reference_${timestamp}.${ext}`;

        const { data, error: functionError } = await supabase.functions.invoke('r2_presigned_url', {
          body: { filePath, contentType: selectedFile.type }
        });

        if (functionError) throw functionError;
        if (!data?.presignedUrl || !data?.publicUrl) throw new Error("Failed to get upload URL");

        const uploadResponse = await fetch(data.presignedUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: { 'Content-Type': selectedFile.type }
        });

        if (!uploadResponse.ok) throw new Error("Failed to upload file to storage");

        setUploadedMediaUrl(data.publicUrl);
        setUploadStatus('extracting_waveform');

        try {
          const { waveform, duration } = await extractWaveformFromFile(selectedFile);
          if (duration > 0 && waveform.length > 0) {
            setUploadStatus('uploading_waveform');
            setExtractedWaveform(waveform);
          }
        } catch (wfError) {
          console.warn("Could not extract waveform:", wfError);
        }

        setUploadStatus('success');
    } catch (e: any) {
        console.error(e);
        toast.error("Upload failed: " + e.message);
        setUploadStatus('error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 100 * 1024 * 1024) {
        toast.error("File is too large (max 100MB)");
        return;
      }
      setFile(selected);
      startBackgroundProcess(selected);
    }
  };

  const handleSourceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    const validFiles = Array.from(selectedFiles).filter(f => {
      if (f.size > 100 * 1024 * 1024) {
        toast.error(`File ${f.name} is too large (max 100MB)`);
        return false;
      }
      return true;
    });
    
    setSourceFiles(prev => [...prev, ...validFiles]);
  };

  const removeSourceFile = (index: number) => {
    setSourceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!file && !referenceLinks.trim() && sourceFiles.length === 0) {
      onSkip();
      return;
    }

    if (file && uploadStatus !== 'success') {
      toast.error("Attendi il completamento dell'upload prima di salvare");
      return;
    }

    setIsUploading(true);

    try {
      // Update DB with file and/or links
      const updateData: any = {};
      if (uploadedMediaUrl) updateData.media_file_url = uploadedMediaUrl;
      
      if (referenceLinks.trim()) {
        const linksArray = referenceLinks.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (linksArray.length > 0) {
          updateData.reference_links = linksArray;
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('tf_studio_projects')
          .update(updateData)
          .eq('id', projectId);

        if (updateError) throw updateError;
      }
      
      // If we uploaded media, create the 'Original Video Audio' asset row
      if (uploadedMediaUrl) {
        const { error: assetError } = await supabase
          .from('tf_studio_assets')
          .insert({
            project_id: projectId,
            asset_type: 'audio',
            file_url: uploadedMediaUrl,
            track_group: 'Original Video Audio',
            is_public: true,
            waveform_data: extractedWaveform || []
          });
      }

      // Upload source files if any
      if (sourceFiles.length > 0) {
        setIsUploadingSourceFiles(true);
        const { data: { user } } = await supabase.auth.getUser();
        for (const sFile of sourceFiles) {
          const ext = sFile.name.split('.').pop() || 'tmp';
          const timestamp = Date.now();
          const safeName = sFile.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
          const filePath = `projects/${projectId}/files/${timestamp}_${safeName}`;

          const { data: pData, error: pError } = await supabase.functions.invoke('r2_presigned_url', {
            body: { filePath, contentType: sFile.type }
          });

          if (!pError && pData?.presignedUrl && pData?.publicUrl) {
            const res = await fetch(pData.presignedUrl, {
              method: 'PUT',
              body: sFile,
              headers: { 'Content-Type': sFile.type }
            });

            if (res.ok) {
              await supabase.from('tf_studio_project_files').insert({
                project_id: projectId,
                user_id: user?.id || null,
                file_name: sFile.name,
                file_url: pData.publicUrl,
                file_size: sFile.size
              });
            }
          }
        }
      }

      toast.success("Project materials saved successfully!");
      onComplete(uploadedMediaUrl);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save project materials");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in overflow-y-auto font-outfit text-black">
      <div className="bg-[#fafafa] rounded-[32px] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative flex flex-col gap-8 my-auto border border-black/5">
        
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-tighter mb-2">Welcome to your Project</h2>
          <p className="text-black/50 font-sans">Upload your video reference or share inspiration links to get started.</p>
        </div>

        <div className="flex flex-col gap-6">
          
          {/* File Upload Area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest">Reference Video / Audio</label>
            <div className={`bg-white border border-black/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-colors ${file ? 'border-black/30 bg-black/[0.02]' : 'hover:border-black/30'}`}>
              <div className="w-16 h-16 rounded-full bg-black/5 text-black flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              {file ? (
                <div className="flex flex-col items-center">
                  <p className="font-bold text-sm mb-1">{file.name}</p>
                  <p className="text-xs text-black/50 mb-4">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  
                  {uploadStatus === 'uploading_video' && <p className="text-xs font-bold text-blue-500 animate-pulse flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Uploading Video...</p>}
                  {uploadStatus === 'extracting_waveform' && <p className="text-xs font-bold text-purple-500 animate-pulse flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Extracting Waveform...</p>}
                  {uploadStatus === 'uploading_waveform' && <p className="text-xs font-bold text-orange-500 animate-pulse flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Finalizing...</p>}
                  {uploadStatus === 'success' && <p className="text-xs font-bold text-green-500 flex items-center gap-1">Ready!</p>}
                  {uploadStatus === 'error' && <p className="text-xs font-bold text-red-500 flex items-center gap-1">Upload Failed</p>}

                  {(uploadStatus === 'success' || uploadStatus === 'error') && (
                    <button onClick={() => { setFile(null); setUploadStatus('idle'); setUploadedMediaUrl(undefined); }} className="text-xs text-red-500 font-bold uppercase tracking-widest mt-4 hover:text-red-600 transition-colors">Remove File</button>
                  )}
                </div>
              ) : (
                <>
                  <p className="font-bold text-sm mb-1">Click to browse or drag and drop</p>
                  <p className="text-xs text-black/50 mb-6 font-sans">MP4, MOV, WAV, MP3 up to 100MB</p>
                  <label className="cursor-pointer bg-black text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black/80 transition-all inline-flex items-center gap-2 shadow-lg shadow-black/10">
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

          {/* Reference Links Area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-black/50 px-2 uppercase font-bold tracking-widest flex items-center gap-2">
              <LinkIcon className="w-3 h-3" /> Reference Links
            </label>
            <textarea 
              value={referenceLinks}
              onChange={(e) => setReferenceLinks(e.target.value)}
              placeholder="Paste YouTube, Spotify, or any other links here (one per line)..."
              className="w-full bg-white border border-black/10 focus:border-black/30 focus:bg-white rounded-3xl p-6 min-h-[120px] resize-y transition-all outline-none font-sans text-sm"
              disabled={isUploading}
            />
          </div>

          {/* Source Files Checkbox Toggle */}
          <div className="flex flex-col gap-4 bg-white border border-black/10 rounded-3xl p-6 transition-colors">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input 
                type="checkbox"
                checked={hasSourceFiles}
                onChange={(e) => setHasSourceFiles(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-black/20 text-black focus:ring-black accent-black"
                disabled={isUploading}
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Add Dialogues, SFX or Stems</span>
                <span className="text-xs text-black/50 mt-1 font-sans">
                  Per comporre una colonna sonora su misura, Tom ha bisogno di tracce pulite. Se il tuo video ha dialoghi o effetti sonori, caricali qui separatamente (senza temp music) per evitare interferenze.
                </span>
              </div>
            </label>

            {hasSourceFiles && (
              <div className="flex flex-col gap-3 animate-fade-in mt-2 border-t border-black/5 pt-4">
                <div className="flex flex-wrap gap-2">
                  {sourceFiles.map((sf, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#fafafa] border border-black/5 rounded-xl px-3 py-2">
                      <FileAudio className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-medium truncate max-w-[150px]">{sf.name}</span>
                      <button onClick={() => removeSourceFile(idx)} className="text-red-400 hover:text-red-600 transition-colors" disabled={isUploading}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <label className="cursor-pointer bg-[#fafafa] border border-black/10 hover:border-black/30 text-black px-6 py-4 rounded-2xl font-bold tracking-wider text-xs transition-all inline-flex items-center justify-center gap-2 shadow-sm border-dashed">
                  <UploadCloud className="w-4 h-4" />
                  Select Source Files (MP3, WAV, ZIP)
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple
                    accept="audio/*,.zip" 
                    onChange={handleSourceFileSelect}
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}
          </div>

        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={handleSubmit}
            disabled={isUploading || (file !== null && uploadStatus !== 'success') || (!file && !referenceLinks.trim())}
            className="w-full bg-black text-white p-5 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-black/10"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {isUploadingSourceFiles ? 'Uploading Source Files...' : 'Saving...'}</>
            ) : file !== null && uploadStatus !== 'success' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing Media...</>
            ) : (
              'Save & Continue'
            )}
          </button>
          
          <button 
            onClick={onSkip}
            disabled={isUploading}
            className="w-full bg-transparent text-black/50 p-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:text-black transition-all"
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  );
}
