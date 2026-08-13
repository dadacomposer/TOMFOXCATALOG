import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function InviteCollaboratorModal({ 
  isOpen, 
  onClose, 
  projectId,
  isAdmin 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  projectId: string;
  isAdmin: boolean;
}) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, projectId]);

  const fetchCollaborators = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tf_studio_collaborators')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      setCollaborators(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load collaborators');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-collaborator', {
        body: { projectId, email }
      });
      
      if (error) throw error;
      
      toast.success('Invitation sent!');
      setEmail('');
      fetchCollaborators(); // Refresh the list
    } catch (e: any) {
      console.error(e);
      let errorMessage = e.message || 'Failed to invite collaborator';
      if (e.context && typeof e.context.json === 'function') {
        try {
           const body = await e.context.json();
           if (body.error) errorMessage = body.error;
        } catch (_) {}
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('tf_studio_collaborators').delete().eq('id', id);
      if (error) throw error;
      toast.success('Collaborator removed');
      fetchCollaborators();
    } catch (e) {
      toast.error('Failed to remove collaborator');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="animate-scale-in bg-white rounded-[32px] w-full max-w-md p-8 relative flex flex-col gap-6 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-black/40 hover:text-black transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-black mb-1">Share Project</h2>
          <p className="text-sm text-black/60 font-sans">Invite collaborators to view and comment.</p>
        </div>

        <form onSubmit={handleInvite} className="flex gap-2">
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans outline-none transition-all"
          />
          <button 
            type="submit"
            disabled={isSubmitting || !email}
            className="bg-black text-white px-6 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Invite
          </button>
        </form>

        <div className="border-t border-black/10 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Current Collaborators</h3>
          
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-black/20" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-black/40 font-sans italic">No collaborators invited yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {collaborators.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-black/5 rounded-xl p-3">
                  <span className="text-sm font-sans font-medium text-black/80">{c.email}</span>
                  {isAdmin && (
                    <button 
                      onClick={() => handleRemove(c.id)}
                      className="text-black/30 hover:text-red-500 transition-colors p-1"
                      title="Remove collaborator"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
