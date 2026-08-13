import React, { useState } from 'react';
import { Building2, Check, X } from 'lucide-react';
import { acceptWorkspaceInvite, declineWorkspaceInvite } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Invite {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_avatar: string;
  email: string;
}

interface AcceptInviteModalProps {
  invite: Invite;
  onProcessed: () => void;
}

export default function AcceptInviteModal({ invite, onProcessed }: AcceptInviteModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, fetchWorkspaces } = useAuth();

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await acceptWorkspaceInvite(invite.id);
      if (user) await fetchWorkspaces(user.id);
      toast.success('Successfully joined ' + invite.workspace_name);
      onProcessed();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to accept invite');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await declineWorkspaceInvite(invite.id);
      toast.success('Invite declined');
      onProcessed();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to decline invite');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 animate-fade-in z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="animate-scale-in relative bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 w-[400px] text-center">
        
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full border border-black/10 overflow-hidden bg-black/5 flex items-center justify-center">
            {invite.workspace_avatar ? (
              <img src={invite.workspace_avatar} className="w-full h-full object-cover" alt={invite.workspace_name} />
            ) : (
              <Building2 className="w-8 h-8 text-black/40" />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold uppercase tracking-tighter mb-2">Workspace Invite</h2>
        <p className="text-sm text-black/60 mb-8 px-4">
          You have been invited to join the <span className="font-bold text-black">{invite.workspace_name}</span> workspace.
        </p>

        <div className="flex gap-4">
          <button 
            onClick={handleDecline}
            disabled={isProcessing}
            className="flex-1 bg-black/5 text-black p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/10 transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button 
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
