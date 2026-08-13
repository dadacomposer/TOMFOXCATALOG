import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, FileAudio, AlertCircle, CheckCircle2, Play, Plus, XCircle, Search, ListPlus, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { extractWaveformFromFile } from '../../utils/audioWaveform';
import { AdminTrack } from './AdminTracks';
import CustomSelect from '../CustomSelect';
import { processAudioFormats } from '../../utils/audioProcessor';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

type StagedTrack = {
  id: string;
  file: File;
  title: string;
  type: 'main' | 'version' | 'stem';
  parentTrackId: string | null;
  playlistId: string | null;
  status: 'pending' | 'uploading_r2' | 'tagging' | 'done' | 'error';
  hasWav: boolean;
  hasAiff: boolean;
  hasMp3: boolean;
  hasWatermarked: boolean;
  allFiles: File[];
  processingMsg?: string;
  dbId?: string;
  progress?: number;
  errorStr?: string;
};

type AdminUploadModalProps = {
  onClose: () => void;
  onComplete: () => void;
  existingTracks: AdminTrack[];
};

export default function AdminUploadModal({ onClose, onComplete, existingTracks }: AdminUploadModalProps) {
  const [stagedTracks, setStagedTracks] = useState<StagedTrack[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playlists, setPlaylists] = useState<{id: string, title: string}[]>([]);
  const [newPlaylists, setNewPlaylists] = useState<{id: string, title: string}[]>([]); 
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [enableAutoTag, setEnableAutoTag] = useState(true);
  const [addToNewMusic, setAddToNewMusic] = useState(true);

  // Theatrical Loading States
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingIndex, setPublishingIndex] = useState(-1);
  const [visualProgress, setVisualProgress] = useState<Record<string, number>>({});

  const [formatUploadTarget, setFormatUploadTarget] = useState<{trackId: string, format: 'wav' | 'aiff' | 'mp3'} | null>(null);
  const formatInputRef = useRef<HTMLInputElement>(null);

  useLockBodyScroll(true);

  const handleFormatUploadClick = (trackId: string, format: 'wav' | 'aiff' | 'mp3') => {
    setFormatUploadTarget({ trackId, format });
    if (formatInputRef.current) {
       formatInputRef.current.accept = `.${format}`;
       formatInputRef.current.click();
    }
  };

  const handleFormatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formatUploadTarget) return;
    
    e.target.value = ''; // clear input
    const { trackId, format } = formatUploadTarget;
    setFormatUploadTarget(null);

    const track = stagedTracks.find(t => t.id === trackId);
    if (!track) return;
    
    const loadingToast = toast.loading(`Uploading ${format.toUpperCase()} for ${track.title}...`);

    try {
      let dbId = track.dbId;
      if (!dbId) {
        toast.dismiss(loadingToast);
        toast.error("Please wait a moment for the main track to finish creating before adding formats.");
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error("Authentication required");

      let filesToUpload = [{ file, format, isWm: false }];
      
      const isHd = format === 'wav' || format === 'aiff';
      let finalHasWav = format === 'wav' || track.hasWav;
      let finalHasAiff = format === 'aiff' || track.hasAiff;
      let finalHasMp3 = format === 'mp3' || track.hasMp3;

      if (isHd && (!track.hasWav || !track.hasAiff || !track.hasMp3)) {
        toast.loading(`Processing HD file for ${track.title}...`, { id: loadingToast });
        
        const generateWav = !finalHasWav;
        const generateAiff = !finalHasAiff;
        const generateMp3 = !finalHasMp3;

        const { wavFile, aiffFile, mp3File } = await processAudioFormats(file, {
           generateWav,
           generateAiff,
           generateMp3,
           generateWatermarked: false,
        });

        if (wavFile) { filesToUpload.push({ file: wavFile, format: 'wav', isWm: false }); finalHasWav = true; }
        if (aiffFile) { filesToUpload.push({ file: aiffFile, format: 'aiff', isWm: false }); finalHasAiff = true; }
        if (mp3File) { filesToUpload.push({ file: mp3File, format: 'mp3', isWm: false }); finalHasMp3 = true; }
      }

      toast.loading(`Uploading formats for ${track.title}...`, { id: loadingToast });

      const uploadPromises = filesToUpload.map(async (item) => {
        const ext = item.format === 'aiff' ? '.aiff' : `.${item.format}`;
        const fileName = `${track.title}${ext}`;
        const uuid = Math.random().toString(36).substring(2, 10);
        const filePath = `audio/hdaudio/${uuid}_${fileName}`;
        const contentType = item.format === 'wav' ? 'audio/wav' : item.format === 'aiff' ? 'audio/aiff' : 'audio/mpeg';

        const res = await fetch('https://jicrumwdnwmjkotkbjtg.supabase.co/functions/v1/r2_presigned_url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`
          },
          body: JSON.stringify({ action: 'upload', contentType, filePath })
        });
        if (!res.ok) throw new Error("Failed to get upload URL");
        const { presignedUrl, publicUrl } = await res.json();

        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: item.file,
        });

        if (!uploadRes.ok) throw new Error(`Upload failed for ${item.format}`);
        return { format: item.format, publicUrl };
      });

      const uploadResults = await Promise.all(uploadPromises);

      let updatePayload: any = {
        has_wav: finalHasWav,
        has_aiff: finalHasAiff,
        has_mp3: finalHasMp3
      };
      
      for (const res of uploadResults) {
        if (res.format === 'wav') updatePayload.wav_url = res.publicUrl;
        if (res.format === 'aiff') updatePayload.aiff_url = res.publicUrl;
        if (res.format === 'mp3') updatePayload.r2_url = res.publicUrl;
      }

      const { error: updateError } = await supabase.from('tracks').update(updatePayload).eq('id', dbId);
      
      if (updateError) throw updateError;

      updateStagedTrack(trackId, { 
        hasWav: finalHasWav,
        hasAiff: finalHasAiff,
        hasMp3: finalHasMp3,
      });

      toast.success(`${format.toUpperCase()} uploaded successfully!`, { id: loadingToast });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload format", { id: loadingToast });
    }
  };

  // We use a ref to always have the latest stagedTracks in async callbacks
  const stagedTracksRef = useRef(stagedTracks);
  useEffect(() => {
    stagedTracksRef.current = stagedTracks;
  }, [stagedTracks]);

  // Derived sorted tracks for deterministic saving order
  const sortedTracks = useMemo(() => {
    return [...stagedTracks].sort((a, b) => {
      if (a.type === 'main' && b.type !== 'main') return -1;
      if (a.type !== 'main' && b.type === 'main') return 1;
      return 0;
    });
  }, [stagedTracks]);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    const { data } = await supabase.from('playlists').select('id, title').is('user_id', null).order('created_at', { ascending: false });
    if (data) setPlaylists(data);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('audio/') || f.name.match(/\.(wav|aiff|mp3)$/i));
    if (validFiles.length !== files.length) {
      toast.error('Some files were ignored because they are not audio files.');
    }
    
    // Group files by base name
    const grouped = validFiles.reduce((acc, file) => {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      if (!acc[baseName]) acc[baseName] = [];
      acc[baseName].push(file);
      return acc;
    }, {} as Record<string, File[]>);
    
    const newStaged: StagedTrack[] = Object.keys(grouped).map(baseName => {
      const group = grouped[baseName];
      const hasWav = group.some(f => f.name.toLowerCase().endsWith('.wav'));
      const hasAiff = group.some(f => f.name.toLowerCase().endsWith('.aiff') || f.name.toLowerCase().endsWith('.aif'));
      const hasMp3 = group.some(f => f.name.toLowerCase().endsWith('.mp3'));
      
      let mainFile = group.find(f => f.name.toLowerCase().endsWith('.mp3'));
      if (!mainFile) mainFile = group.find(f => f.name.toLowerCase().endsWith('.wav'));
      if (!mainFile) mainFile = group[0];

      return {
        id: Math.random().toString(36).substring(7),
        file: mainFile,
        allFiles: group,
        title: baseName,
        type: 'main',
        parentTrackId: null,
        playlistId: null,
        status: 'pending',
        progress: 0,
        hasWav,
        hasAiff,
        hasMp3,
        hasWatermarked: false
      };
    });
    
    setStagedTracks(prev => {
      const updated = [...prev, ...newStaged];
      if (!selectedTrackId && updated.length > 0) {
        setSelectedTrackId(updated[0].id);
      }
      return updated;
    });

    // Start optimistic upload in background instantly
    newStaged.forEach(t => startOptimisticUpload(t));
  };

  const updateStagedTrack = (id: string, updates: Partial<StagedTrack>) => {
    setStagedTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeStagedTrack = async (id: string) => {
    const track = stagedTracks.find(t => t.id === id);
    setStagedTracks(prev => prev.filter(t => t.id !== id));
    if (selectedTrackId === id) setSelectedTrackId(null);

    if (track && track.dbId) {
      try {
        await supabase.from('tracks').delete().eq('id', track.dbId);
      } catch (e) {
        console.warn("Failed to delete staged track from DB", e);
      }
    }
  };

  const startOptimisticUpload = async (track: StagedTrack) => {
    try {
      updateStagedTrack(track.id, { status: 'uploading_r2', progress: 2, processingMsg: 'Analyzing audio...' });

      let waveform_data = null;
      let duration = 0;
      try {
        const extracted = await extractWaveformFromFile(track.file);
        waveform_data = extracted.waveform;
        duration = extracted.duration;
      } catch (e) {
        console.warn('Waveform extraction failed', e);
      }
      
      updateStagedTrack(track.id, { progress: 5, processingMsg: 'Preparing audio engine...' });

      // Determine generation flags based on the main file
      const inputExt = track.file.name.split('.').pop()?.toLowerCase();
      const isHd = inputExt === 'wav' || inputExt === 'aiff' || inputExt === 'aif';

      const generateWav = isHd && !track.hasWav;
      const generateAiff = isHd && !track.hasAiff;
      const generateMp3 = isHd && !track.hasMp3;

      // Run FFmpeg processing
      const { mp3File, watermarkedFile, wavFile, aiffFile } = await processAudioFormats(track.file, {
        generateMp3,
        generateWatermarked: true,
        generateWav,
        generateAiff,
        onProgress: (msg, pct) => {
          updateStagedTrack(track.id, { progress: 5 + Math.floor(pct * 0.4), processingMsg: msg });
        }
      });

      const filesToUpload: { file: File, format: string, isWm: boolean }[] = [];
      
      track.allFiles.forEach(f => {
         const ext = f.name.split('.').pop()?.toLowerCase();
         filesToUpload.push({ file: f, format: ext || 'unknown', isWm: false });
      });

      if (mp3File) filesToUpload.push({ file: mp3File, format: 'mp3', isWm: false });
      if (watermarkedFile) filesToUpload.push({ file: watermarkedFile, format: 'watermarked', isWm: true });
      if (wavFile) filesToUpload.push({ file: wavFile, format: 'wav', isWm: false });
      if (aiffFile) filesToUpload.push({ file: aiffFile, format: 'aiff', isWm: false });

      updateStagedTrack(track.id, { processingMsg: 'Uploading files to Cloudflare...' });
      
      updateStagedTrack(track.id, { processingMsg: 'Uploading files to Cloudflare (Parallel)...' });
      
      const uploadPromises = filesToUpload.map(async (item) => {
        const ext = item.file.name.split('.').pop()?.toLowerCase() || 'mp3';
        const subfolder = item.isWm ? 'watermarked' : 'audio/hdaudio';
        const fileName = `${track.title}.${ext}`;
        const uuid = Math.random().toString(36).substring(2, 10);
        const filePath = `${subfolder}/${uuid}_${fileName}`;
        
        const { data: presignData, error: presignError } = await supabase.functions.invoke('r2_presigned_url', {
          body: { action: 'upload', filePath, contentType: item.file.type || 'audio/mpeg' }
        });
        if (presignError || !presignData?.presignedUrl) throw new Error(`Failed to get URL for ${item.format}`);

        const uploadRes = await fetch(presignData.presignedUrl, {
          method: 'PUT',
          body: item.file,
          headers: { 'Content-Type': item.file.type || 'audio/mpeg' }
        });
        if (!uploadRes.ok) throw new Error(`Failed to upload ${item.format}`);
        
        return { format: item.format, isWm: item.isWm, publicUrl: presignData.publicUrl };
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      
      let mainPublicUrl = '';
      let wavUrl = '';
      let aiffUrl = '';
      let watermarkedUrl = '';
      
      for (const res of uploadResults) {
        if (res.format === 'mp3' && !res.isWm) mainPublicUrl = res.publicUrl;
        else if (res.format === 'wav') wavUrl = res.publicUrl;
        else if (res.format === 'aiff') aiffUrl = res.publicUrl;
        else if (res.isWm) watermarkedUrl = res.publicUrl;
      }
      if (!mainPublicUrl && uploadResults.length > 0) mainPublicUrl = uploadResults.find(r => !r.isWm)?.publicUrl || uploadResults[0].publicUrl;
      
      updateStagedTrack(track.id, { progress: 60, processingMsg: 'Saving to Database...' });

      const { data: dbTrack, error: dbError } = await supabase.from('tracks').insert([{
        file_name: track.title,
        file_path: mainPublicUrl,
        r2_url: mainPublicUrl,
        wav_url: wavUrl || null,
        aiff_url: aiffUrl || null,
        watermarked_url: watermarkedUrl || null,
        waveform_data,
        track_type: track.type,
        has_wav: track.hasWav || !!wavFile,
        has_mp3: track.hasMp3 || !!mp3File,
        has_aiff: track.hasAiff || !!aiffFile,
        has_watermarked: !!watermarkedFile,
        is_hidden: false,
        folder: 'Uploads',
        status: 'staged',
        duration: Math.round(duration) || 0,
        key: '',
        scale: '',
        key_strength: 0,
        danceability: 0,
        average_loudness: 0,
        integrated_loudness: 0
      }]).select().single();
      
      if (dbError) throw new Error(dbError.message);

      updateStagedTrack(track.id, { 
        status: 'tagging', 
        progress: 80, 
        dbId: dbTrack.id, 
        hasMp3: track.hasMp3 || !!mp3File, 
        hasWav: track.hasWav || !!wavFile,
        hasAiff: track.hasAiff || !!aiffFile,
        hasWatermarked: !!watermarkedFile, 
        processingMsg: 'Auto Tagging...' 
      });

      const { error: tagError } = await supabase.functions.invoke('gemini-tagger', {
        body: { trackId: dbTrack.id }
      });

      if (tagError) {
        console.error("Gemini tagging error:", tagError);
      }

      updateStagedTrack(track.id, { status: 'done', progress: 100, processingMsg: 'Done' });

    } catch (e: any) {
      console.error("Upload error for track:", track.title, e);
      toast.error(`Error processing ${track.title}: ${e.message}`);
      updateStagedTrack(track.id, { status: 'error', errorStr: e.message, processingMsg: 'Failed' });
    }
  };

  const handleCreatePlaylistSubmitInline = (trackId: string, title: string) => {
    if (!title || !title.trim()) {
      updateStagedTrack(trackId, { playlistId: null });
      return;
    }
    const newId = `NEW_${Math.random().toString(36).substring(7)}`;
    setNewPlaylists(prev => [...prev, { id: newId, title: title.trim() }]);
    
    setStagedTracks(prev => prev.map(t => {
      if (t.id === trackId) return { ...t, playlistId: newId };
      return t;
    }));
    
    toast.success(`Created playlist "${title.trim()}" and assigned to track.`);
  };

  // THEATRICAL LOADING ENGINE
  useEffect(() => {
    if (!isPublishing || publishingIndex < 0 || publishingIndex >= sortedTracks.length) return;

    const track = sortedTracks[publishingIndex];
    let timeoutId: any;

    if (track.status === 'done' || track.status === 'error') {
      const currentVP = visualProgress[track.id] || 0;
      if (currentVP < 100 && track.status !== 'error') {
         // Random irregular jump (many small steps)
         const remaining = 100 - currentVP;
         const jump = remaining > 15 ? Math.floor(Math.random() * 8) + 5 : remaining;
         const delay = Math.random() * 100 + 80; // 80ms - 180ms delay per tick
         
         timeoutId = setTimeout(() => {
           setVisualProgress(prev => ({ ...prev, [track.id]: currentVP + jump }));
         }, delay);
      } else {
         // Track is visually done. Pause for half a sec to let user see the green check, then move on
         timeoutId = setTimeout(() => {
           setPublishingIndex(i => i + 1);
         }, 300);
      }
    } else {
      // Background is still going. Hook visual progress to real progress.
      // But don't let it reach 100% until it's really 'done'.
      const realP = track.progress || 0;
      setVisualProgress(prev => ({ ...prev, [track.id]: Math.min(realP, 90) }));
    }

    return () => clearTimeout(timeoutId);
  }, [isPublishing, publishingIndex, sortedTracks, visualProgress]);

  // When all tracks are visually finished
  useEffect(() => {
    if (isPublishing && publishingIndex === sortedTracks.length && sortedTracks.length > 0) {
      executeActualSave();
    }
  }, [publishingIndex, isPublishing]);

  const executeActualSave = async () => {
    setIsSaving(true);
    let allSuccess = true;
    
    const resolvedPlaylists: Record<string, string> = {};
    const resolvedParents: Record<string, string> = {}; 

    for (const track of sortedTracks) {
      if (track.status === 'error' || !track.dbId) {
        allSuccess = false;
        if (track.status === 'error') {
          toast.error(`Track ${track.title} failed: ${track.errorStr}`);
        }
        continue;
      }

      try {
        let realPlaylistId = track.playlistId;
        if (realPlaylistId?.startsWith('NEW_')) {
          if (resolvedPlaylists[realPlaylistId]) {
            realPlaylistId = resolvedPlaylists[realPlaylistId];
          } else {
            const plObj = newPlaylists.find(p => p.id === track.playlistId);
            if (plObj) {
              const { data: newPl, error: plErr } = await supabase.from('playlists').insert([{ title: plObj.title }]).select().single();
              if (plErr) throw new Error('Failed to create playlist');
              resolvedPlaylists[track.playlistId!] = newPl.id;
              realPlaylistId = newPl.id;
            }
          }
        }

        let realParentId = track.parentTrackId;
        if (track.type !== 'main' && realParentId) {
          if (resolvedParents[realParentId]) {
            realParentId = resolvedParents[realParentId];
          } else {
            const parentStaged = stagedTracksRef.current.find(t => t.id === realParentId);
            if (parentStaged && parentStaged.dbId) {
              realParentId = parentStaged.dbId;
            }
          }
        }

        const updatePayload: any = {
          status: 'published',
          file_name: track.title,
          track_type: track.type,
          parent_track_id: track.type !== 'main' ? realParentId : null,
        };

        if (track.type !== 'main' && realParentId) {
          const { data: parentTrack } = await supabase.from('tracks').select('*').eq('id', realParentId).single();
          if (parentTrack) {
            updatePayload.genre = parentTrack.genre;
            updatePayload.arrangement = parentTrack.arrangement;
            updatePayload.moods = parentTrack.moods;
            updatePayload.instruments = parentTrack.instruments;
            updatePayload.functions = parentTrack.functions;
            updatePayload.music_for = parentTrack.music_for;
            updatePayload.character = parentTrack.character;
            updatePayload.tempo = parentTrack.tempo;
            updatePayload.movement = parentTrack.movement;
            updatePayload.description = parentTrack.description;
          }
        }

        if (!enableAutoTag) {
          updatePayload.genre = null;
          updatePayload.arrangement = [];
          updatePayload.moods = [];
          updatePayload.instruments = [];
          updatePayload.functions = [];
          updatePayload.music_for = [];
          updatePayload.character = [];
          updatePayload.tempo = [];
          updatePayload.movement = [];
          updatePayload.description = null;
        }

        const { error: updateError } = await supabase.from('tracks').update(updatePayload).eq('id', track.dbId);
        if (updateError) throw new Error(updateError.message);

        if (realPlaylistId) {
          const { count } = await supabase.from('playlist_tracks').select('*', { count: 'exact', head: true }).eq('playlist_id', realPlaylistId);
          await supabase.from('playlist_tracks').insert([{
            playlist_id: realPlaylistId,
            track_id: track.dbId,
            position: count || 0
          }]);
          await supabase.from('playlists').update({ track_count: (count || 0) + 1 }).eq('id', realPlaylistId);
        }

        if (addToNewMusic && track.type === 'main') {
          const newMusicPlaylist = playlists.find(p => p.title.toLowerCase().includes('new music'));
          if (newMusicPlaylist && newMusicPlaylist.id !== realPlaylistId) {
             const { count: nmCount } = await supabase.from('playlist_tracks').select('*', { count: 'exact', head: true }).eq('playlist_id', newMusicPlaylist.id);
             await supabase.from('playlist_tracks').insert([{
               playlist_id: newMusicPlaylist.id,
               track_id: track.dbId,
               position: nmCount || 0
             }]);
             await supabase.from('playlists').update({ track_count: (nmCount || 0) + 1 }).eq('id', newMusicPlaylist.id);
          }
        }

        resolvedParents[track.id] = track.dbId;

      } catch (e: any) {
        console.error(e);
        toast.error(`Failed to publish ${track.title}: ${e.message}`);
        allSuccess = false;
      }
    }

    setIsSaving(false);
    setIsPublishing(false);
    if (allSuccess) {
      toast.success('All tracks published successfully!');
      onComplete();
    } else {
      toast.error('Finished with some errors.');
      onComplete();
    }
  };

  const handleClose = async () => {
    if (isPublishing || isSaving) return; // Prevent closing while publishing

    const incompleteStaged = stagedTracksRef.current.filter(t => t.dbId);
    if (incompleteStaged.length > 0) {
      if (confirm("You have unpublished uploads. Closing will cancel and delete them. Are you sure?")) {
        const dbIds = incompleteStaged.map(t => t.dbId!);
        try {
           await supabase.from('tracks').delete().in('id', dbIds);
        } catch(e) {}
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col p-4 sm:p-8 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-6xl mx-auto flex flex-col flex-grow shadow-2xl overflow-hidden animate-scale-in border border-black/10" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-3">
              <UploadCloud className="w-5 h-5 text-black/50" />
              Upload Tracks
            </h3>
            <p className="text-sm text-black/40 mt-1">Manage metadata while we handle the rest magically.</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-black/5 rounded-full text-black/50 hover:text-black transition-colors" disabled={isPublishing || isSaving}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
          {/* Left panel */}
          <div className="w-full md:w-[65%] flex flex-col border-r border-black/5 bg-[#fafafa]">
            {stagedTracks.length === 0 ? (
              <div 
                className={`flex-grow flex flex-col items-center justify-center p-8 transition-colors ${isDragging ? 'bg-black/5 border-2 border-dashed border-black/20 m-4 rounded-xl' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="w-20 h-20 rounded-full bg-black/5 flex items-center justify-center mb-6">
                  <UploadCloud className="w-8 h-8 text-black/40" />
                </div>
                <h3 className="text-lg font-bold mb-2">Drag & Drop audio files here</h3>
                <p className="text-sm text-black/40 mb-8 max-w-md text-center">Supports .wav, .mp3, .aiff files. Background prep starts instantly.</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-black/90 transition-colors"
                >
                  Browse Files
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))} 
                  multiple 
                  accept=".wav,.mp3,.aiff,audio/*" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white shrink-0">
                  <div className="text-sm font-bold uppercase tracking-widest text-black/50">
                    {stagedTracks.length} Track{stagedTracks.length !== 1 ? 's' : ''} Staged
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPublishing || isSaving}
                    className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 border border-black/10 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3" /> Add More
                  </button>
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))} multiple accept=".wav,.mp3,.aiff,audio/*" className="hidden" />
                  <input type="file" ref={formatInputRef} onChange={handleFormatFileChange} className="hidden" />
                </div>
                
                <div className="flex-grow overflow-y-auto p-4 space-y-3 relative">
                  <AnimatePresence initial={false}>
                  {/* We map over sortedTracks so the visual order matches the publishing order! */}
                  {sortedTracks.map((track, i) => {
                    // Visual state logic
                    const isVisualizing = isPublishing;
                    const isVisuallyDone = isPublishing && (i < publishingIndex || (i === publishingIndex && (visualProgress[track.id] === 100)));
                    const isVisuallyActive = isPublishing && i === publishingIndex && !isVisuallyDone;
                    const vp = visualProgress[track.id] || 0;

                    return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
                      key={track.id} 
                      onClick={() => !isPublishing && setSelectedTrackId(track.id)}
                      className={`bg-white rounded-xl p-4 transition-all relative ${!isPublishing ? 'cursor-pointer hover:border-black/30' : ''} border ${selectedTrackId === track.id ? 'border-black ring-1 ring-black/10 shadow-md z-10' : 'border-black/10 shadow-sm'}`}
                    >
                      {/* Theatrical Progress Bar */}
                      {isPublishing && (isVisuallyActive || (vp > 0 && !isVisuallyDone)) && (
                        <div className="absolute bottom-0 left-0 h-1 bg-black/10 w-full rounded-b-xl overflow-hidden">
                          <div className={`h-full transition-all duration-200 ${vp < 60 ? 'bg-blue-500' : 'bg-purple-500'}`} style={{ width: `${vp}%` }} />
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center shrink-0">
                              <FileAudio className="w-5 h-5 text-black/40" />
                            </div>
                            <div>
                              <input 
                                type="text"
                                value={track.title}
                                onChange={e => updateStagedTrack(track.id, { title: e.target.value })}
                                disabled={isPublishing || isSaving}
                                className="font-bold text-sm bg-transparent border-none outline-none p-0 focus:ring-0 w-full max-w-[200px] sm:max-w-md"
                              />
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-black/40 uppercase tracking-widest">{track.file.name} ({(track.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                                
                                {/* Theatrical Text */}
                                {isPublishing && isVisuallyActive && (
                                  <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${vp < 60 ? 'text-blue-500' : 'text-purple-500'}`}>
                                    <Loader2 className="w-3 h-3 animate-spin" /> {track.processingMsg || 'Processing...'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                {!track.hasWav && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleFormatUploadClick(track.id, 'wav'); }}
                                    disabled={isPublishing || isSaving}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-red-100 text-red-700 hover:bg-red-200 transition-colors border border-red-200 flex items-center gap-1"
                                    title="Click to upload missing WAV"
                                  >
                                    <AlertCircle className="w-3 h-3" /> Missing WAV
                                  </button>
                                )}
                                {!track.hasAiff && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleFormatUploadClick(track.id, 'aiff'); }}
                                    disabled={isPublishing || isSaving}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors border border-orange-200 flex items-center gap-1"
                                    title="Click to upload missing AIFF"
                                  >
                                    <AlertCircle className="w-3 h-3" /> Missing AIFF
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Theatrical Checkmark */}
                            {isVisuallyDone && <CheckCircle2 className="w-5 h-5 text-green-500 animate-fade-in" />}
                            
                            {track.status === 'error' && isPublishing && i <= publishingIndex && (
                              <div className="group relative">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-black text-white text-xs rounded hidden group-hover:block z-10">
                                  {track.errorStr}
                                </div>
                              </div>
                            )}
                            
                            {!isPublishing && (
                              <button onClick={(e) => { e.stopPropagation(); removeStagedTrack(track.id); }} className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-md">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {!isPublishing && (
                          <div className="flex flex-wrap gap-3">
                            <CustomSelect
                              value={track.type}
                              onChange={val => updateStagedTrack(track.id, { type: val as any, parentTrackId: val === 'main' ? null : track.parentTrackId, playlistId: val !== 'main' ? null : track.playlistId })}
                              disabled={isPublishing || isSaving}
                              className="w-32"
                              options={[
                                { value: 'main', label: 'Main Track' },
                                { value: 'version', label: 'Version' },
                                { value: 'stem', label: 'Stem' }
                              ]}
                            />

                            {track.type !== 'main' && (
                              <CustomSelect
                                value={track.parentTrackId || ''}
                                onChange={val => updateStagedTrack(track.id, { parentTrackId: val || null })}
                                disabled={isPublishing || isSaving}
                                placeholder="Select Parent..."
                                className="w-48"
                                searchable
                                options={[
                                  { value: '', label: 'Select Parent...' },
                                  { label: 'Staged Tracks', options: stagedTracks.filter(t => t.id !== track.id && t.type === 'main').map(t => ({ value: t.id, label: `${t.title} (Staged)` })) },
                                  { label: 'Existing Tracks', options: existingTracks.filter(t => t.track_type === 'main').map(t => ({ value: t.id, label: t.file_name })) }
                                ]}
                              />
                            )}

                            {track.type === 'main' && (
                              track.playlistId === 'CREATE_NEW' ? (
                                <div className="flex items-center gap-2 animate-fade-in w-64 bg-black/5 border border-black/10 rounded-xl px-2 h-11">
                                  <input 
                                    type="text" 
                                    autoFocus
                                    placeholder="Playlist name..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm px-2 font-bold"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleCreatePlaylistSubmitInline(track.id, e.currentTarget.value);
                                      } else if (e.key === 'Escape') {
                                        updateStagedTrack(track.id, { playlistId: null });
                                      }
                                    }}
                                    onBlur={(e) => {
                                      if (e.currentTarget.value.trim()) {
                                        handleCreatePlaylistSubmitInline(track.id, e.currentTarget.value);
                                      } else {
                                        updateStagedTrack(track.id, { playlistId: null });
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <CustomSelect
                                  value={track.playlistId || ''}
                                  onChange={val => updateStagedTrack(track.id, { playlistId: val || null })}
                                  disabled={isPublishing || isSaving}
                                  placeholder="No Playlist"
                                  className="w-48"
                                  searchable
                                  options={[
                                    { value: '', label: 'No Playlist' },
                                    { value: 'CREATE_NEW', label: '+ Create New Playlist' },
                                    ...(newPlaylists.length > 0 ? [{ label: 'New Playlists', options: newPlaylists.map(p => ({ value: p.id, label: `${p.title} (New)` })) }] : []),
                                    { label: 'Existing Playlists', options: playlists.map(p => ({ value: p.id, label: p.title })) }
                                  ]}
                                />
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )})}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Detail view & actions */}
          <div className="w-full md:w-[35%] bg-[#fafafa] flex flex-col p-6 relative">
            {isPublishing ? (
               <div className="flex-grow flex flex-col items-center justify-center text-center opacity-70 bg-white rounded-xl border border-black/10">
                 <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                 <h4 className="font-bold text-lg mb-2">Publishing to Catalog</h4>
                 <p className="text-sm text-black/60 max-w-[200px]">Generating metadata, securing links, and saving relationships...</p>
               </div>
            ) : (() => {
              const track = selectedTrackId ? stagedTracks.find(t => t.id === selectedTrackId) : null;
              if (!track) {
                return (
                  <div className="flex-grow flex flex-col items-center justify-center text-center opacity-50 bg-white rounded-xl border border-black/10">
                    <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mb-4">
                      <FileAudio className="w-6 h-6 text-black/40" />
                    </div>
                    <h4 className="font-bold mb-2">No Track Selected</h4>
                    <p className="text-sm text-black/60 max-w-[200px]">Click a track on the left to manage its specific settings.</p>
                  </div>
                );
              }
              
              return (
                <div className="flex flex-col h-full bg-white rounded-xl border border-black/10 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-black/5 shrink-0 bg-black/5">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-1">Selected Track</div>
                      <h4 className="font-bold text-lg leading-tight mb-2 truncate" title={track.title}>{track.title}</h4>
                      <div className="inline-flex items-center px-2 py-1 bg-white rounded border border-black/10 text-xs font-bold uppercase tracking-wider text-black">
                        {track.type}
                      </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-6">

                      {track.type === 'main' && (
                        <div className="flex flex-col">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-3 border-b border-black/5 pb-2">Versions & Stems Hub</div>
                          
                          <div className="flex gap-2 mb-4 shrink-0">
                            <button 
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = true;
                                input.accept = '.wav,.mp3,.aiff,audio/*';
                                input.onchange = (e: any) => {
                                  if (e.target.files) {
                                    const validFiles = Array.from(e.target.files as FileList).filter(f => f.type.startsWith('audio/') || f.name.match(/\.(wav|aiff|mp3)$/i));
                                    const newChildren: StagedTrack[] = validFiles.map(file => ({
                                      id: Math.random().toString(36).substring(7),
                                      file,
                                      title: file.name.replace(/\.[^/.]+$/, ""),
                                      type: 'version',
                                      parentTrackId: track.id,
                                      playlistId: track.playlistId,
                                      status: 'pending',
                                      progress: 0,
                                      hasWav: file.name.toLowerCase().endsWith('.wav'),
                                      hasAiff: file.name.toLowerCase().endsWith('.aiff') || file.name.toLowerCase().endsWith('.aif'),
                                      hasMp3: file.name.toLowerCase().endsWith('.mp3'),
                                      hasWatermarked: false,
                                      allFiles: [file]
                                    }));
                                    setStagedTracks(prev => [...prev, ...newChildren]);
                                    newChildren.forEach(child => startOptimisticUpload(child));
                                  }
                                };
                                input.click();
                              }}
                              disabled={isPublishing || isSaving}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-black/20 rounded-xl hover:bg-black/5 hover:border-black/40 transition-colors text-xs font-bold uppercase tracking-wider text-black/60 hover:text-black"
                            >
                              <Plus className="w-4 h-4" /> Upload Versions/Stems
                            </button>
                          </div>

                          <div className="space-y-2">
                            {stagedTracks.filter(t => t.parentTrackId === track.id).map(child => (
                              <div key={child.id} className="flex items-center justify-between p-3 bg-black/5 rounded-lg border border-transparent hover:border-black/10 group transition-colors">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate pr-2">{child.title}</div>
                                  <div className="text-[10px] uppercase tracking-widest text-black/50">{child.type}</div>
                                </div>
                                <CustomSelect
                                  value={child.type}
                                  onChange={val => updateStagedTrack(child.id, { type: val as any })}
                                  disabled={isPublishing || isSaving}
                                  className="w-24 shrink-0"
                                  options={[
                                    { value: 'version', label: 'Version' },
                                    { value: 'stem', label: 'Stem' }
                                  ]}
                                />
                              </div>
                            ))}
                            {stagedTracks.filter(t => t.parentTrackId === track.id).length === 0 && (
                              <div className="text-xs font-bold uppercase tracking-widest text-black/30 text-center py-8">
                                No versions or stems added yet.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {track.type !== 'main' && (
                         <div className="flex-grow flex flex-col items-center justify-center text-center py-12">
                           <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mb-4">
                             <FileAudio className="w-6 h-6 text-black/20" />
                           </div>
                           <h4 className="font-bold text-sm mb-1 text-black/80">Child Track</h4>
                           <p className="text-sm text-black/40 max-w-[200px]">Select a main track to manage its versions and stems.</p>
                         </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            <div className="mt-6 shrink-0 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-white border border-black/10 rounded-xl hover:border-black/30 transition-colors shadow-sm">
                <input 
                  type="checkbox" 
                  checked={enableAutoTag} 
                  onChange={e => setEnableAutoTag(e.target.checked)} 
                  disabled={isPublishing || isSaving}
                  className="w-5 h-5 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer" 
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-black">Enable Auto Tagging</span>
                  {!enableAutoTag && (
                    <span className="text-xs text-orange-500 font-bold mt-1">Later manual tagging required</span>
                  )}
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 bg-white border border-black/10 rounded-xl hover:border-black/30 transition-colors shadow-sm">
                <input 
                  type="checkbox" 
                  checked={addToNewMusic} 
                  onChange={e => setAddToNewMusic(e.target.checked)} 
                  disabled={isPublishing || isSaving}
                  className="w-5 h-5 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer" 
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-black">Add to New Music</span>
                  <span className="text-xs text-black/50 font-bold mt-1">Add tracks to the "New Music" playlist</span>
                </div>
              </label>

              <button
                onClick={() => { setIsPublishing(true); setPublishingIndex(0); }}
                disabled={isPublishing || isSaving || stagedTracks.length === 0}
                className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm bg-black text-white hover:bg-black/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {isPublishing || isSaving ? (
                  <>Finalizing... <Loader2 className="w-4 h-4 animate-spin" /></>
                ) : (
                  <>Publish All Tracks <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
