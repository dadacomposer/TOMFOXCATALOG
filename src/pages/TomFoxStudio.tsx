import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { extractWaveformFromFile } from '../utils/audioWaveform';
import WaveformView from '../components/WaveformView';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAsyncTheater } from '../hooks/useAsyncTheater';
import { Play, Pause, MessageCircle, ChevronLeft, Send, CheckCircle2, Lock, UploadCloud, Loader2, ExternalLink, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DadaLogo } from '../components/shared/DadaLogo';
import toast from 'react-hot-toast';
import StudioOnboardingModal from '../components/studio/StudioOnboardingModal';
import ProjectFilesPanel from '../components/studio/ProjectFilesPanel';
import InviteCollaboratorModal from '../components/studio/InviteCollaboratorModal';

export default function TomFoxStudio() {
  const { project_id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, setLoginModalOpen } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const isCompleted = project?.status === 'completed';

  // Sync Hook
  const {
    videoRef,
    audioRefs,
    activeTrackId,
    currentTime,
    duration,
    isPlaying,
    isTypingComment,
    draftTimecode,
    interceptedKey,
    togglePlay,
    jumpTo,
    handleTrackSelect,
    resetCommentInterception,
    setIsTypingComment,
    setActiveTrackId
  } = useAsyncTheater({ isVaulted: project?.status === 'completed' });

  // Default activeTrackId to Original Audio if available
  useEffect(() => {
    if (assets.length > 0 && !activeTrackId) {
      const original = assets.find(a => a.track_group === 'Original Video Audio');
      if (original) {
        setActiveTrackId(original.id);
      } else {
        setActiveTrackId(assets[0].id);
      }
    }
  }, [assets, activeTrackId, setActiveTrackId]);

  // Comment input state
  const [commentText, setCommentText] = useState(interceptedKey);
  const [chatText, setChatText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [hoveredComment, setHoveredComment] = useState<{comment: any, rect: DOMRect} | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (interceptedKey && isTypingComment) {
      setCommentText(interceptedKey);
    }
  }, [interceptedKey, isTypingComment]);

  useEffect(() => {
    if (authLoading) return;
    fetchStudioData();

    if (!project_id) return;

    const channel = supabase
      .channel(`client_studio_${project_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tf_studio_projects', filter: `id=eq.${project_id}` }, () => {
        fetchStudioData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tf_studio_assets', filter: `project_id=eq.${project_id}` }, () => {
        fetchStudioData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tf_studio_comments', filter: `project_id=eq.${project_id}` }, () => {
        fetchStudioData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, project_id, setLoginModalOpen]);

  const fetchStudioData = async () => {
    setUnauthorized(false);
    try {
      const { data: pData, error: pErr } = await supabase
        .from('tf_studio_projects')
        .select('*')
        .eq('id', project_id)
        .single();
      
      let userIsAdmin = false;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        userIsAdmin = profile?.is_admin || false;
        setIsAdmin(userIsAdmin);
      }

      if (pErr || !pData) {
        setUnauthorized(true);
        setLoading(false);
        if (!user) {
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          setLoginModalOpen(true);
        }
        return;
      }

      // Check Authentication Requirements
      if (pData.requires_auth) {
        if (!user) {
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          setLoginModalOpen(true);
          setLoading(false);
          return;
        }
        setLoginModalOpen(false);
      }

      setProject(pData);
      
      if (!pData.media_file_url) {
        setShowOnboarding(true);
      }

      const { data: aData } = await supabase
        .from('tf_studio_assets')
        .select('*')
        .eq('project_id', project_id)
        .eq('is_public', true)
        .order('created_at', { ascending: true });
      if (aData) setAssets(aData);

      const { data: cData } = await supabase
        .from('tf_studio_comments')
        .select('*')
        .eq('project_id', project_id)
        .order('created_at', { ascending: true });
      if (cData) setComments(cData);

    } catch (e: any) {
      toast.error("Failed to load project");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitNewComment = async (text: string, timecode: number | null, parentId: string | null = null) => {
    if (isCompleted) {
      toast.error('Comments are disabled for completed projects.');
      return;
    }
    if (!text.trim() && timecode === draftTimecode && draftTimecode !== null) return;
    if (!text.trim()) return;
    try {
      const { data, error } = await supabase.from('tf_studio_comments').insert({
        project_id,
        asset_id: timecode !== null ? (activeTrackId || null) : null,
        timecode: timecode,
        text: text.trim(),
        user_id: user?.id,
        is_admin: false,
        parent_id: parentId
      }).select().single();

      if (error) throw error;
      if (data) {
        setComments(prev => {
          const newArr = [...prev, data];
          return newArr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
        if (timecode === draftTimecode && draftTimecode !== null) {
          setCommentText('');
          resetCommentInterception();
        }
        if (parentId) {
          setReplyTo(null);
          setReplyText('');
        }
        if (timecode === null && !parentId) {
          setChatText('');
        }
      }
    } catch (e) {
      toast.error("Failed to add message");
      console.error(e);
    }
  };

  const submitComment = () => {
    if (draftTimecode !== null) {
      submitNewComment(commentText, draftTimecode);
    }
  };

  const handleDownloadAllZip = async () => {
    const audioAssets = assets.filter(a => a.asset_type === 'audio');
    if (!audioAssets || audioAssets.length === 0) {
      toast.error('No audio files to download.');
      return;
    }
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folderName = `Project_${project.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const folder = zip.folder(folderName);
      
      if (!folder) throw new Error('Could not create ZIP folder');

      const promises = audioAssets.map(async (asset, index) => {
        const response = await fetch(asset.file_url);
        if (!response.ok) throw new Error(`Failed to fetch ${asset.file_url}`);
        const blob = await response.blob();
        const ext = asset.file_url.split('.').pop()?.split('?')[0] || 'wav';
        const safeTitle = asset.track_group.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${index + 1}_${safeTitle}_Rev${asset.revision_number}.${ext}`;
        folder.file(filename, blob);
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `TomFox_${folderName}.zip`);
      toast.success('Download complete!');
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast.error('Failed to create ZIP file.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File is too large (max 100MB)");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `projects/${project_id}/reference_${Date.now()}.${ext}`;

      // Get presigned URL
      const { data: presignedData, error: functionError } = await supabase.functions.invoke('r2_presigned_url', {
        body: { filePath, contentType: file.type }
      });

      if (functionError) throw functionError;
      if (!presignedData?.presignedUrl || !presignedData?.publicUrl) throw new Error("Failed to get upload URL");

      // Upload directly to R2
      const uploadResponse = await fetch(presignedData.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload media to R2");

      // Extract waveform
      let waveformData: number[] = [];
      try {
        const { waveform, duration } = await extractWaveformFromFile(file);
        if (duration > 0 && waveform.length > 0) {
          waveformData = waveform;
        }
      } catch (wfError) {
        console.warn("Could not extract waveform:", wfError);
      }

      // Update project record
      const { error: updateError } = await supabase
        .from('tf_studio_projects')
        .update({ media_file_url: presignedData.publicUrl })
        .eq('id', project_id);

      if (updateError) throw updateError;

      // Insert Original Video Audio asset
      const { error: assetError } = await supabase
        .from('tf_studio_assets')
        .insert({
          project_id: project_id,
          asset_type: 'audio',
          file_url: presignedData.publicUrl,
          track_group: 'Original Video Audio',
          is_public: true,
          waveform_data: waveformData
        });
        
      if (assetError) console.error("Could not create audio asset", assetError);

      toast.success("File uploaded successfully");
      fetchStudioData(); // Reload to fetch the new asset

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#fafafa] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-700">
          <img 
            src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
            alt="Tom Fox" 
            className="h-10 object-contain mb-8" 
          />
          <div className="w-48 h-1 bg-black/10 rounded-full overflow-hidden">
            <div className="h-full bg-black rounded-full animate-[loading-bar_1.4s_ease-in-out_infinite]"></div>
          </div>
        </div>
        <style>{`
          @keyframes loading-bar {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 100%; margin-left: 0%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-black/5">
          <div className="w-12 h-12 text-black/20 mx-auto mb-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-2">
            {user ? 'Access Denied' : 'Authentication Required'}
          </h2>
          
          {user ? (
             <p className="text-black/50 mb-8">
               It appears you're trying to access this project with the wrong account (<b>{user.email}</b>). 
               Please log in with the correct account to continue.
             </p>
          ) : (
             <p className="text-black/50 mb-8">
               You must be logged in to view this project. If you received an invitation link, please log in or sign up to access it.
             </p>
          )}

          {user ? (
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                setLoginModalOpen(true);
              }}
              className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-colors mb-2"
            >
              Switch Account
            </button>
          ) : (
            <button 
              onClick={() => {
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                setLoginModalOpen(true);
              }}
              className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-colors mb-2"
            >
              Log In
            </button>
          )}

          <button 
            onClick={() => navigate('/browse')}
            className={`w-full bg-black/5 text-black hover:bg-black/10 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors`}
          >
            Go to Browse
          </button>
        </div>
      </div>
    );
  }

  if (!project) return <div className="p-8">Project not found</div>;

  const videoAsset = assets.find(a => a.asset_type === 'video');
  const audioAssets = assets.filter(a => a.asset_type === 'audio');
  
  // Format MM:SS for timeline
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };


  return (
    <div className="h-[100dvh] bg-[#fafafa] font-outfit text-black flex flex-col overflow-hidden overscroll-none">
      
      {/* Navbar con Titolo */}
      <header className="w-full h-20 bg-white border-b-2 border-black/10 shrink-0 flex items-center justify-between px-6 z-10">
        <div className="flex-1 flex justify-start items-center gap-8">
          <Link to="/">
            <img 
              src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
              alt="Tom Fox" 
              className="h-7" 
            />
          </Link>
          <Link 
            to="/browse"
            className="text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors hidden sm:block"
          >
            Catalog
          </Link>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 animate-in fade-in duration-300">
          <span className="text-sm font-bold uppercase tracking-widest text-black/80">{project.title}</span>
        </div>
        <div className="flex-1 flex justify-end gap-4 items-center">
          {(user?.id === project.user_id || isAdmin) && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors"
            >
              Share
            </button>
          )}
        </div>
      </header>

      <div className="flex-grow px-4 pb-4 sm:px-6 sm:pb-6 pt-0 min-h-0 flex flex-col">
        <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col gap-4 sm:gap-6 min-h-0">
        
        {/* Main Grid */}
        <div className={`flex-grow grid gap-4 sm:gap-6 min-h-0 overflow-hidden ${isCompleted ? 'grid-cols-1 lg:grid-cols-1 max-w-5xl mx-auto' : 'grid-cols-1 lg:grid-cols-3'}`}>
          
          {/* Left Column: Player & Assets */}
          <div className={`${isCompleted ? 'lg:col-span-1' : 'lg:col-span-2'} flex flex-col min-h-0 pr-2 pb-4`}>
            
            <div className="bg-white rounded-[32px] shadow-sm border border-black/5 flex flex-col min-h-0 overflow-hidden max-w-4xl w-full mx-auto">
              
              {/* Video Player or Upload Overlay */}
              <div className="p-4 pb-2 shrink-0">
                <div className="w-full aspect-video bg-black/5 rounded-[24px] overflow-hidden relative group flex flex-col items-center justify-center">
                {!project.media_file_url ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-black/50">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-tighter mb-2">Upload Reference Video</h3>
                    <p className="text-sm text-black/50 mb-6 max-w-sm">Please upload a video or audio reference to begin the custom music production.</p>
                    <label className="cursor-pointer bg-black text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black/80 transition-all inline-flex items-center gap-2 shadow-lg shadow-black/10">
                      {isUploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><UploadCloud className="w-4 h-4" /> Select File</>
                      )}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="video/*,audio/*" 
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                ) : (videoAsset?.file_url || project.media_file_url) ? (
                  <video
                    ref={videoRef}
                    src={videoAsset?.file_url || project.media_file_url}
                    className="w-full h-full object-contain bg-black"
                    playsInline
                    muted={true}
                    onClick={togglePlay}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-black/30">
                     <p className="font-medium text-lg">No Video Reference</p>
                  </div>
                )}
                
                {/* Play Button Overlay (Bottom Left, Hover Only) */}
                <div 
                  className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end justify-start p-4"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                    className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center shrink-0 hover:bg-black/90 transition-colors pointer-events-auto"
                  >
                    {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" style={{ transform: 'translateX(4.166%)' }} />}
                  </button>
                </div>

                </div>
              </div>

              {/* Audio Tracks Selection */}
              <div className="p-4 sm:p-6 flex flex-col gap-3 overflow-y-auto min-h-0 pb-32 max-w-4xl w-full mx-auto">
                {audioAssets.map((asset) => {
                  const isActive = activeTrackId === asset.id;
                  const isTrackPlaying = isActive && isPlaying;
                  const trackComments = comments.filter(c => (c.asset_id === asset.id || (!c.asset_id && isActive)) && c.timecode !== null);
                  const displayTitle = asset.track_group.toUpperCase() === 'ORIGINAL VIDEO AUDIO' ? 'ORIGINAL' : asset.track_group;
                  
                  return (
                    <div 
                      key={asset.id}
                      className={`p-4 rounded-[24px] border-2 transition-all shrink-0 duration-300 ${isActive ? 'border-black bg-black/5' : 'border-black/5'}`}
                    >
                      <div className="flex items-center gap-4">
                        
                        {/* Play Button */}
                        <button 
                          onClick={() => handleTrackSelect(asset.id)}
                          className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center shrink-0 hover:bg-black/90 transition-colors"
                        >
                          {isTrackPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" style={{ transform: 'translateX(4.166%)' }} />}
                        </button>

                        {/* Title (Truncated) */}
                        <div className="w-28 shrink-0 text-left overflow-hidden flex flex-col justify-center">
                          <span className="font-bold text-[11px] uppercase tracking-widest truncate">{displayTitle}</span>
                          {asset.revision_number > 1 && <span className="text-[9px] font-bold text-black/50 uppercase">Rev {asset.revision_number}</span>}
                        </div>

                        {/* Timing Info */}
                        <div className="w-20 shrink-0 text-left flex flex-col justify-center text-[10px] font-bold text-black/40 uppercase tracking-widest">
                          {isActive ? `${formatTime(currentTime)} / ${formatTime(duration)}` : formatTime(duration)}
                        </div>
                        
                        {/* Waveform */}
                        <div className="flex flex-col flex-1 min-w-0 justify-center">
                           
                           <div 
                             className="h-10 relative w-full group cursor-pointer" 
                             onClick={(e) => {
                               if (!isActive) handleTrackSelect(asset.id);
                               const rect = e.currentTarget.getBoundingClientRect();
                               const percent = (e.clientX - rect.left) / rect.width;
                               jumpTo(percent * duration);
                             }}
                           >
                             <div className="absolute inset-0 pointer-events-none">
                               {asset.waveform_data && asset.waveform_data.length > 0 ? (
                                 <WaveformView 
                                   data={asset.waveform_data}
                                   isPlaying={isTrackPlaying}
                                   progress={isActive && duration > 0 ? (currentTime / duration) * 100 : 0}
                                 />
                               ) : (
                                 <div className="w-full h-full bg-black/5 rounded-md relative overflow-hidden">
                                   <div className="absolute top-0 left-0 h-full bg-black/10 transition-all" style={{width: `${isActive && duration > 0 ? (currentTime/duration)*100 : 0}%`}} />
                                   <div className="absolute top-0 h-full w-[2px] bg-black transition-all" style={{left: `${isActive && duration > 0 ? (currentTime/duration)*100 : 0}%`}} />
                                 </div>
                               )}
                             </div>
                             
                             {/* Comment Markers as elegant vertical bars */}
                             {trackComments.map((c) => (
                               <div 
                                 key={c.id}
                                 className="absolute top-0 bottom-0 w-6 -ml-3 z-20 hover:bg-transparent pointer-events-auto group/marker cursor-pointer flex justify-center"
                                 style={{ left: `${(c.timecode / duration) * 100}%` }}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (!isActive) handleTrackSelect(asset.id);
                                   jumpTo(c.timecode);
                                 }}
                               >
                                 {/* Visible line */}
                                 <div className="w-[2px] h-full bg-black group-hover/marker:bg-blue-500 transition-colors pointer-events-none" />
                                 {/* Hover detection for tooltip */}
                                 <div 
                                   className="absolute inset-0 z-30" 
                                   onMouseEnter={(e) => setHoveredComment({ comment: c, rect: e.currentTarget.getBoundingClientRect() })}
                                   onMouseLeave={() => setHoveredComment(null)}
                                 />
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>
                      
                      <audio 
                        ref={(el) => { if (el) audioRefs.current[asset.id] = el; }} 
                        src={asset.file_url} 
                        preload="auto"
                      />
                    </div>
                  );
                })}

                {isCompleted && (
                  <button 
                    onClick={handleDownloadAllZip}
                    disabled={isDownloadingZip}
                    className="mt-4 w-full py-4 border-2 border-transparent bg-black text-white rounded-[24px] font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isDownloadingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                    {isDownloadingZip ? 'Preparing ZIP...' : 'Download All Versions (ZIP)'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Chat/Comments & Project Files */}
          {!isCompleted && (
          <div className="flex flex-col gap-4 sm:gap-6 min-h-0 pr-2 pb-4 relative h-full flex-1">
            
            {/* Comments Sidebar */}
            <div className="flex flex-col flex-1 min-h-0 bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden relative">

              <div 
                className="flex-grow overflow-y-auto p-4 flex flex-col relative"
                style={{ maskImage: 'linear-gradient(to bottom, transparent, black 32px, black)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 32px, black)', paddingTop: '20px' }}
              >
                {comments.filter(c => !c.parent_id).map(comment => {
                  const renderComment = (c: any, isReply = false) => {
                    const track = assets.find(a => a.id === c.asset_id);
                    const replies = comments.filter(r => r.parent_id === c.id);
                    const isChat = c.timecode === null;
                    const isOppositeSide = c.is_admin; // Client view: Admin is opposite

                    if (isChat) {
                      const isMe = !c.is_admin;
                      return (
                        <div key={c.id} className={`flex flex-col gap-1 mt-4 ${isMe ? 'items-end' : 'items-start'} w-full`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-black/5 text-black rounded-tl-sm'}`}>
                            <p className="text-sm whitespace-pre-wrap">{c.text}</p>
                          </div>
                          <span className="text-[10px] font-bold text-black/40 px-1 uppercase tracking-widest">
                            {!isMe && 'Tom Fox • '}{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          {isOppositeSide && (
                            <button onClick={() => setReplyTo(c.id)} className="text-[10px] font-bold text-black/40 hover:text-blue-500 uppercase px-1">Reply</button>
                          )}
                          {replyTo === c.id && (
                            <div className="w-full flex items-center gap-2 mt-2">
                              <input 
                                type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply to message..."
                                className="flex-1 bg-black/5 border-none rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black/20"
                                onKeyDown={(e) => { if (e.key === 'Enter') submitNewComment(replyText, null, c.id); }} autoFocus
                              />
                              <button onClick={() => submitNewComment(replyText, null, c.id)} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 hover:scale-105">
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {replies.length > 0 && <div className="flex flex-col w-full mt-2 gap-2">{replies.map(r => renderComment(r, true))}</div>}
                        </div>
                      );
                    }

                    return (
                      <div key={c.id} className={`flex flex-col gap-2 mt-4 ${isReply ? 'ml-6 border-l-2 border-black/5 pl-4' : ''}`}>
                        <div 
                          className="bg-[#fafafa] rounded-[24px] p-4 flex flex-col gap-2 group cursor-pointer hover:bg-black/5 transition-colors border border-transparent hover:border-black/10 relative"
                          onClick={() => jumpTo(c.timecode)}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold px-2 py-1 bg-white rounded-md shadow-sm text-black">
                              {formatTime(c.timecode)}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                              {c.is_admin ? 'Tom Fox' : 'You'} • {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          {track && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/50 -mt-1">
                              {track.track_group} {track.revision_number > 1 ? `(Rev ${track.revision_number})` : ''}
                            </span>
                          )}
                          <p className="text-sm text-black/80 font-medium whitespace-pre-wrap">{c.text}</p>
                          
                          {isOppositeSide && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setReplyTo(c.id); }}
                              className="absolute bottom-4 right-4 text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md"
                            >
                              Reply
                            </button>
                          )}
                        </div>

                        {replyTo === c.id && (
                          <div className="flex items-center gap-2 mt-1">
                            <input 
                              type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..."
                              className="flex-1 bg-black/5 border-none rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black/20"
                              onKeyDown={(e) => { if (e.key === 'Enter') submitNewComment(replyText, null, c.id); }} autoFocus
                            />
                            <button onClick={() => submitNewComment(replyText, null, c.id)} className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shrink-0 hover:scale-105">
                              <Send className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                        )}

                        {replies.length > 0 && <div className="flex flex-col mt-1">{replies.map(r => renderComment(r, true))}</div>}
                      </div>
                    );
                  };
                  return renderComment(comment);
                })}
                
                {comments.length === 0 && !isTypingComment && (
                  <div className="flex-grow flex flex-col items-center justify-center text-black/40 text-center p-8 gap-1 pb-10">
                    <MessageCircle className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm font-medium leading-relaxed">Press any key while playing<br/>to drop a timecoded comment.</p>
                  </div>
                )}
                <div className="h-4" /> {/* Spacer */}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input (Bottom) */}
              <div className="p-4 border-t border-black/5 bg-[#fafafa]">
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Send a message..."
                    className="w-full bg-white border border-black/10 rounded-full py-3 pl-4 pr-12 text-sm outline-none focus:border-black/30 focus:ring-1 focus:ring-black/30 transition-all shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitNewComment(chatText, null);
                      }
                    }}
                  />
                  <button 
                    onClick={() => submitNewComment(chatText, null)}
                    className="absolute right-1.5 w-9 h-9 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Type Box Interceptor overlay */}
              <AnimatePresence>
                {isTypingComment && (
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="absolute bottom-0 left-0 w-full p-4 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-10"
                  >
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center justify-between text-xs font-bold text-black/50 uppercase tracking-widest">
                         <span>Leaving timecoded comment at {formatTime(draftTimecode || 0)}</span>
                         <button onClick={resetCommentInterception} className="hover:text-black">Cancel</button>
                       </div>
                       <div className="relative">
                         <textarea 
                           id="studio-comment-textarea"
                           value={commentText}
                           onChange={(e) => setCommentText(e.target.value)}
                           className="w-full bg-[#fafafa] border border-black/10 rounded-[20px] p-4 pr-12 text-sm outline-none focus:border-black/30 focus:ring-1 focus:ring-black/30 transition-all resize-none min-h-[80px]"
                           placeholder="Type your feedback..."
                           autoFocus
                           onKeyDown={(e) => {

                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             submitComment();
                           }
                         }}
                       />
                       <button 
                         onClick={submitComment}
                         className="absolute right-2 bottom-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                       >
                         <Send className="w-4 h-4 ml-0.5" />
                       </button>
                     </div>
                  </div>
                </motion.div>
                )}
              </AnimatePresence>

            </div>
            
            <InviteCollaboratorModal 
              isOpen={isInviteModalOpen}
              onClose={() => setIsInviteModalOpen(false)}
              projectId={project_id!}
              isAdmin={user?.id === project.user_id || isAdmin}
            />

            <ProjectFilesPanel 
              projectId={project_id!} 
              project={project} 
              onRefresh={fetchStudioData} 
            />

          </div>
          )}
        </div>
        
        {/* Onboarding Modal */}
        {showOnboarding && (
          <StudioOnboardingModal 
            projectId={project.id} 
            onSkip={() => setShowOnboarding(false)} 
            onComplete={(mediaUrl) => {
              setShowOnboarding(false);
              fetchStudioData(); // Reload assets so the new 'Original Video Audio' asset is fetched
            }} 
          />
        )}

        </div>
      </div>

      {/* Footer Minimo */}
      <footer className="w-full bg-white border-t border-black/10 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold uppercase tracking-widest text-black/40 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <span>© {new Date().getFullYear()} Tom Fox Catalog</span>
          <span className="hidden sm:inline text-black/20">•</span>
          <div className="flex items-center gap-2 text-black/40">
            Powered by <DadaLogo className="w-3 h-3 text-black/40" /> DadaAudio
          </div>
        </div>
        <Link to="/" className="text-black/60 hover:text-black transition-colors flex items-center gap-2">
          Browse the catalog <ExternalLink className="w-3 h-3" />
        </Link>
      </footer>
    </div>
  );
}
