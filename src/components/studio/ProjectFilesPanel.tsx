import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileAudio, Link as LinkIcon, Trash2, UploadCloud, Loader2, Download, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProjectFilesPanelProps {
  projectId: string;
  project: any;
  onRefresh: () => void;
}

export default function ProjectFilesPanel({ projectId, project, onRefresh }: ProjectFilesPanelProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);

  useEffect(() => {
    fetchFiles();

    if (!projectId) return;

    const channel = supabase
      .channel(`project_files_${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tf_studio_project_files', filter: `project_id=eq.${projectId}` }, () => {
        fetchFiles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('tf_studio_project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      console.error("Error fetching project files:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large (max 100MB)`);
          continue;
        }

        const ext = file.name.split('.').pop() || 'tmp';
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const filePath = `projects/${projectId}/files/${timestamp}_${safeName}`;

        const { data, error: functionError } = await supabase.functions.invoke('r2_presigned_url', {
          body: { filePath, contentType: file.type }
        });

        if (functionError) throw functionError;
        if (!data?.presignedUrl || !data?.publicUrl) throw new Error("Failed to get upload URL");

        const uploadResponse = await fetch(data.presignedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });

        if (!uploadResponse.ok) throw new Error("Failed to upload file to storage");

        const { error: dbError } = await supabase
          .from('tf_studio_project_files')
          .insert({
            project_id: projectId,
            user_id: user?.id || null,
            file_name: file.name,
            file_url: data.publicUrl,
            file_size: file.size
          });

        if (dbError) throw dbError;
      }
      
      toast.success("Files uploaded successfully");
      fetchFiles();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload files");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    
    try {
      const { error } = await supabase
        .from('tf_studio_project_files')
        .delete()
        .eq('id', fileId);
        
      if (error) throw error;
      toast.success("File deleted");
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete file");
    }
  };

  const handleAddLink = async () => {
    if (!newLink.trim()) return;
    setIsAddingLink(true);
    
    try {
      const currentLinks = project.reference_links || [];
      const updatedLinks = [...currentLinks, newLink.trim()];
      
      const { error } = await supabase
        .from('tf_studio_projects')
        .update({ reference_links: updatedLinks })
        .eq('id', projectId);
        
      if (error) throw error;
      toast.success("Link added");
      setNewLink('');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add link");
    } finally {
      setIsAddingLink(false);
    }
  };

  const handleDeleteLink = async (linkToRemove: string) => {
    if (!confirm("Are you sure you want to remove this link?")) return;
    
    try {
      const updatedLinks = (project.reference_links || []).filter((l: string) => l !== linkToRemove);
      
      const { error } = await supabase
        .from('tf_studio_projects')
        .update({ reference_links: updatedLinks })
        .eq('id', projectId);
        
      if (error) throw error;
      toast.success("Link removed");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to remove link");
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          Source Files & References
        </h3>
        
        <label className="cursor-pointer bg-black/5 text-black px-4 py-2 rounded-full font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-black/10 transition-colors flex items-center gap-2 shrink-0">
          {isUploading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Uploading</>
          ) : (
            <><UploadCloud className="w-3 h-3" /> Add File</>
          )}
          <input 
            type="file" 
            className="hidden" 
            multiple
            accept="audio/*,video/*,.zip,.pdf" 
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      <div className="flex flex-col gap-4">
        
        {/* Source Files */}
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-black/20" /></div>
        ) : files.length > 0 ? (
          <div className="flex flex-col gap-2">
            {files.map(file => (
              <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#fafafa] border border-black/5 p-3 rounded-2xl gap-3 group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-medium text-sm truncate pr-2">{file.file_name}</span>
                    <span className="text-xs text-black/40">{(file.file_size / (1024 * 1024)).toFixed(2)} MB • {new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <a 
                    href={file.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-black/5 text-black/60 hover:text-black transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-black/40 italic">No source files uploaded yet.</p>
        )}

        <hr className="border-black/5" />

        {/* Reference Links */}
        <div className="flex flex-col gap-3">
          <h4 className="font-bold text-sm text-black/60 uppercase tracking-wider flex items-center gap-2">
            Reference Links
          </h4>
          
          <div className="flex flex-col gap-2">
            {(project.reference_links || []).map((link: string, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-[#fafafa] border border-black/5 p-3 rounded-2xl gap-3 group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-sm truncate hover:underline text-blue-600">
                    {link}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a 
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-black/5 text-black/60 hover:text-black transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => handleDeleteLink(link)}
                    className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" 
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Paste YouTube, Spotify link..."
                className="flex-grow bg-[#fafafa] border border-black/10 focus:border-black/30 rounded-xl px-4 py-2 text-sm outline-none transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddLink();
                }}
              />
              <button 
                onClick={handleAddLink}
                disabled={isAddingLink || !newLink.trim()}
                className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-opacity whitespace-nowrap"
              >
                {isAddingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
