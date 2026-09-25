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
    let cancelled = false;
    const acceptInviteParam = searchParams.get('accept_invite');
    if (!user) {
      setPendingInvites([]);
      return;
    }

    // The link parameter gets a recipient back from Supabase Auth, but it is
    // not reliable as the only trigger: a person may open the site later on a
    // different device. Fetching after every sign-in makes pending invitations
    // discoverable in both paths.
    const fetchInvites = async () => {
      try {
        const invites = await getMyWorkspaceInvites();
        if (!cancelled) setPendingInvites(invites);
      } catch (error) {
        console.error('Error fetching workspace invites:', error);
      } finally {
        if (acceptInviteParam === 'true') {
          const nextSearchParams = new URLSearchParams(searchParams);
          nextSearchParams.delete('accept_invite');
          setSearchParams(nextSearchParams, { replace: true });
        }
      }
    };

    void fetchInvites();
    return () => {
      cancelled = true;
    };
  }, [user?.id, searchParams, setSearchParams]);

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
