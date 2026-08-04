import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyWorkspaceInvites } from '../lib/supabase';
import AcceptInviteModal from './AcceptInviteModal';

export default function InviteManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  useEffect(() => {
    // We check for invites if accept_invite is in the URL OR if the user just logged in
    const acceptInviteParam = searchParams.get('accept_invite');
    
    if (user && acceptInviteParam === 'true') {
      const fetchInvites = async () => {
        try {
          const invites = await getMyWorkspaceInvites();
          setPendingInvites(invites);
          
          // Clear the URL param once we've fetched
          searchParams.delete('accept_invite');
          setSearchParams(searchParams);
        } catch (error) {
          console.error('Error fetching invites:', error);
        }
      };
      
      fetchInvites();
    }
  }, [user, searchParams, setSearchParams]);

  const handleInviteProcessed = (inviteId: string) => {
    setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
  };

  if (pendingInvites.length === 0) return null;

  // Show the modal for the first pending invite
  return (
    <AcceptInviteModal 
      invite={pendingInvites[0]} 
      onProcessed={() => handleInviteProcessed(pendingInvites[0].id)} 
    />
  );
}
