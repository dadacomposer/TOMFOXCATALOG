import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { X, Plus, Check, Settings, Bell, LogOut, FileText, CreditCard, Users, Star, LayoutGrid, Upload, Crown, Search, Download, ExternalLink } from 'lucide-react';
import { supabase, updateWorkspace, getWorkspaceMembers, createWorkspace, inviteTeamMember } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import ProfileSettings from './ProfileSettings';
import UpgradePlan from './UpgradePlan';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

export default function AccountPanel() {
  const { user, profile, workspaces, activeWorkspace, setActiveWorkspace, isAccountPanelOpen, setAccountPanelOpen, fetchWorkspaces, refreshProfile, studioProjects } = useAuth();
  const { settings } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(isAccountPanelOpen);
  
  const [activeView, setActiveView] = useState<'menu' | 'overview' | 'licenses' | 'team' | 'settings' | 'billing'>('menu');
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState<string>('');
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);
  const [managingMemberId, setManagingMemberId] = useState<string | null>(null);
  
  // Invite Member Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  // Create Workspace Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [createWsError, setCreateWsError] = useState('');
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCancelSubModalOpen, setIsCancelSubModalOpen] = useState(false);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    if (activeView === 'billing') {
      let cancelled = false;
      const syncBillingAndFetchInvoices = async () => {
        try {
          setIsLoadingInvoices(true);
          const { error: syncError } = await supabase.functions.invoke('sync-stripe-subscription');
          if (syncError) throw syncError;
          await refreshProfile();
          
          const { data, error } = await supabase.functions.invoke('list-invoices');
          if (error) throw error;
          if (!cancelled && data && data.invoices) {
            setInvoices(data.invoices);
          }
        } catch (e) {
          console.error("Failed to sync billing or fetch invoices:", e);
        } finally {
          if (!cancelled) setIsLoadingInvoices(false);
        }
      };
      syncBillingAndFetchInvoices();
      return () => {
        cancelled = true;
      };
    }
  }, [activeView]);

  const handleManageSubscriptionStatus = async (action: 'cancel' | 'resume') => {
    try {
      setIsManagingSubscription(true);
      const { data, error } = await supabase.functions.invoke('manage-subscription-status', {
        body: { action }
      });

      if (error) {
        let errMessage = error.message;
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errData = await error.context.json();
            if (errData.error) errMessage = errData.error;
          } catch (_) {}
        }
        throw new Error(errMessage || `Failed to ${action} subscription`);
      }
      
      toast.success(action === 'cancel' 
        ? 'Subscription canceled. You have access until the end of the billing period.' 
        : 'Subscription resumed successfully.');
        
      await refreshProfile();
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to ${action} subscription: ` + (e.message || "Unknown error"));
    } finally {
      setIsManagingSubscription(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (activeWorkspace) {
      setEditName(activeWorkspace.name || '');
      setEditCompany(activeWorkspace.company_name || '');
      setEditIndustry(activeWorkspace.company_industry || '');
      setMemberSearch('');
      setMembers([]);
      getWorkspaceMembers(activeWorkspace.id)
        .then((workspaceMembers) => {
          if (!cancelled) setMembers(workspaceMembers);
        })
        .catch((error) => {
          console.error('Failed to load workspace members:', error);
          if (!cancelled) setMembers([]);
        });
    } else {
      setMembers([]);
      setMemberSearch('');
    }
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Do not close panel if a modal is open
      if (isCreateModalOpen || isTransferModalOpen || isCancelSubModalOpen || isInviteModalOpen) return;
      
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setAccountPanelOpen(false);
        setTimeout(() => setActiveView('menu'), 300);
      }
    };
    if (isAccountPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountPanelOpen, setAccountPanelOpen, isCreateModalOpen, isTransferModalOpen, isCancelSubModalOpen, isInviteModalOpen]);

  if (!user) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAccountPanelOpen(false);
    window.location.href = '/';
  };

  const handleWorkspaceAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeWorkspace || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const { data: { presignedUrl, publicUrl }, error: functionError } = await supabase.functions.invoke('r2_presigned_url', {
        body: { fileName: file.name, contentType: file.type }
      });
      
      if (functionError) throw functionError;
      if (!presignedUrl || !publicUrl) throw new Error("Failed to get upload URL");

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image to R2");
      }

      const updatedWorkspace = await updateWorkspace(activeWorkspace.id, { avatar_url: publicUrl });
      
      await fetchWorkspaces(user.id);
      setActiveWorkspace(updatedWorkspace);
      
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to upload workspace avatar: " + (e.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeWorkspace) return;
    setSaving(true);
    try {
      const updatedWorkspace = await updateWorkspace(activeWorkspace.id, {
        name: editName,
        company_name: editCompany,
        company_industry: editIndustry
      });
      
      setSaveSuccess(true);
      await fetchWorkspaces(user.id);
      setActiveWorkspace(updatedWorkspace);
      
      setTimeout(() => setSaveSuccess(false), 2000);
      toast.success("Changes saved successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setIsManagingBilling(true);
      const { data, error } = await supabase.functions.invoke('create-portal-session');

      if (error) {
        throw new Error(error.message || "Failed to create portal session");
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (e: any) {
      console.error("Billing portal error:", e);
      toast.error(e.message || "An error occurred accessing billing portal.");
    } finally {
      setIsManagingBilling(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!activeWorkspace || !newOwnerId) return;

    try {
      setIsTransferringOwnership(true);
      const { error } = await supabase.functions.invoke('transfer-workspace-ownership', {
        body: { workspaceId: activeWorkspace.id, newOwnerId }
      });
      if (error) throw error;

      setIsTransferModalOpen(false);
      setNewOwnerId('');
      await fetchWorkspaces(user.id);
      setMembers(await getWorkspaceMembers(activeWorkspace.id));
      toast.success('Workspace ownership transferred successfully.');
    } catch (error: any) {
      console.error('Failed to transfer workspace ownership:', error);
      toast.error(error.message || 'Failed to transfer workspace ownership.');
    } finally {
      setIsTransferringOwnership(false);
    }
  };

  const handleMemberAction = async (
    action: 'leave' | 'remove' | 'set_role',
    memberId: string,
    role?: 'member' | 'admin',
  ) => {
    if (!activeWorkspace) return;

    try {
      setManagingMemberId(memberId);
      const { data, error } = await supabase.functions.invoke('manage-workspace-member', {
        body: { workspaceId: activeWorkspace.id, memberId, action, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const updatedWorkspaces = await fetchWorkspaces(user.id);
      if (action === 'leave') {
        setActiveView('menu');
        toast.success('You left the workspace.');
        return;
      }

      if (updatedWorkspaces.some((workspace) => workspace.id === activeWorkspace.id)) {
        setMembers(await getWorkspaceMembers(activeWorkspace.id));
      }
      toast.success(action === 'remove' ? 'Member removed from the workspace.' : 'Member role updated.');
    } catch (error: any) {
      console.error('Failed to manage workspace member:', error);
      toast.error(error.message || 'Failed to update workspace membership.');
    } finally {
      setManagingMemberId(null);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    
    // Check if user already has a workspace with this name
    if (workspaces.some(w => w.name.toLowerCase() === newWsName.trim().toLowerCase())) {
      setCreateWsError('You already have a workspace with this name.');
      return;
    }

    setIsCreatingWs(true);
    setCreateWsError('');
    try {
      const newWs = await createWorkspace(user.id, newWsName.trim());
      await fetchWorkspaces(user.id);
      setActiveWorkspace(newWs);
      setIsCreateModalOpen(false);
      setNewWsName('');
    } catch (e) {
      console.error(e);
      setCreateWsError('Failed to create workspace. Please try again.');
    } finally {
      setIsCreatingWs(false);
    }
  };

  const personalAvatar = profile?.avatar_url || user.user_metadata?.avatar_url;
  const userName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : user.email?.split('@')[0];
  const currentOwner = members.find(m => m.role === 'owner');
  const currentUserRole = members.find(m => m.user_id === user.id)?.role
    || (activeWorkspace?.user_id === user.id ? 'owner' : undefined);
  const isWorkspaceOwner = activeWorkspace?.user_id === user.id || currentUserRole === 'owner';
  const isOwnerOrAdmin = isWorkspaceOwner || currentUserRole === 'admin';
  const workspaceOwnerId = activeWorkspace?.user_id || currentOwner?.user_id;
  const canTransferOwnership = isWorkspaceOwner;

  // When expanding, the panel goes from 384px (max-w-sm) to 1152px (triple width)
  const isExpanded = activeView !== 'menu';

  return (
    <div className={`fixed inset-0 z-[100] flex justify-end ${isAccountPanelOpen ? '' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 motion-overlay ${isAccountPanelOpen ? 'bg-black/20 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
        onClick={() => {
          setAccountPanelOpen(false);
          setTimeout(() => setActiveView('menu'), 300);
        }}
      />
      
      {/* Expanding Side Panel */}
      <div 
        ref={panelRef}
        className={`relative h-full bg-[#fafafa]/85 backdrop-blur-xl text-black shadow-2xl flex flex-col overflow-hidden motion-drawer ${isAccountPanelOpen ? 'translate-x-0' : 'translate-x-full'} ${isExpanded ? 'w-[1152px]' : 'w-[384px]'} max-xl:w-full max-xl:max-w-none`}
      >
        {/* Global Panel Header */}
        <div className="px-6 py-4 flex justify-between items-center bg-transparent z-20 shrink-0 max-xl:px-4 max-xl:pt-[max(1rem,env(safe-area-inset-top))]">
          <button 
            onClick={() => {
              setActiveWorkspace(null);
              setActiveView('menu');
            }}
            className="flex items-center gap-3 text-left group"
            title="Switch to personal context"
          >
            <div className="is-avatar w-8 h-8 bg-black/5 flex-shrink-0 flex items-center justify-center overflow-hidden border border-black/10 aspect-square">
              {personalAvatar ? (
                <>
                  <img 
                    src={personalAvatar} 
                    alt="Personal" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('fallback-avatar');
                    }}
                  />
                  <svg className="hidden fallback-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </>
              ) : (
                <span className="font-sans text-[10px] font-bold uppercase">{userName?.substring(0,2)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <h2 className={`font-sans text-sm truncate font-medium ${!activeWorkspace ? 'text-black' : 'text-black/50 group-hover:text-black transition-colors'}`}>
                {userName}
              </h2>
              {isExpanded && activeWorkspace && (
                <span className="text-[10px] uppercase tracking-widest text-black/40">Workspace: {activeWorkspace.name}</span>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2">
            {isExpanded && (
              <button
                type="button"
                onClick={() => setActiveView('menu')}
                aria-label="Back to account menu"
                className="hidden max-xl:inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-black/60 hover:text-black transition-colors"
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => {
                setAccountPanelOpen(false);
                setTimeout(() => setActiveView('menu'), 300);
              }}
              className="p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inner Flex Container - Fixed 1152px width, letting the parent clip it */}
        <div className="flex-1 min-h-0 flex w-[1152px] border-t border-black/10 max-xl:w-full">
          
          {/* LEFT COLUMN: MAIN MENU (384px) */}
          <div className={`w-[384px] h-full bg-transparent border-r border-black/10 shrink-0 max-xl:w-full max-xl:border-r-0 max-xl:overflow-y-auto max-xl:overscroll-contain max-xl:pb-[max(1rem,env(safe-area-inset-bottom))] ${isExpanded ? 'max-xl:hidden' : ''}`}>
            <div className="p-3">
              <div className="flex flex-col gap-1.5">
                {/* Workspaces List */}
                {workspaces.map(ws => {
                  const isActive = activeWorkspace?.id === ws.id;
                  return (
                    <button 
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws);
                        if (activeView === 'overview') {
                          // Keep it open, just switch context
                        }
                      }}
                      className={`flex items-center gap-3 p-1.5 rounded-xl transition-all text-left group ${isActive ? 'bg-black/5' : 'hover:bg-black/5'}`}
                    >
                      <div 
                        className="is-avatar w-8 h-8 bg-black/5 flex-shrink-0 flex items-center justify-center overflow-hidden border border-black/10 aspect-square"
                      >
                        {ws.avatar_url ? (
                          <>
                            <img 
                              src={ws.avatar_url} 
                              alt="Workspace" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('fallback-avatar');
                              }}
                            />
                            <svg className="hidden fallback-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          </>
                        ) : (
                          <span className="font-sans text-[10px] font-bold uppercase">{ws.name.substring(0,2)}</span>
                        )}
                      </div>
                      <span className={`font-sans text-xs truncate ${isActive ? 'font-bold' : 'font-medium text-black/70 group-hover:text-black transition-colors'}`}>
                        {ws.name}
                      </span>
                      {isActive && <Check className="w-3 h-3 ml-auto opacity-50" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-black/5 transition-all text-left group w-full"
                >
                  <div className="w-8 h-8 rounded-full border border-dashed border-black/30 flex items-center justify-center group-hover:border-black/50 transition-colors">
                    <Plus className="w-3 h-3 text-black/50 group-hover:text-black/80" />
                  </div>
                  <span className="font-sans text-xs text-black/60 group-hover:text-black transition-colors">Create new workspace</span>
                </button>
              </div>
            </div>

            <hr className="border-black/10 my-1" />

            {studioProjects && studioProjects.length > 0 && (
              <>
                <div className="p-3">
                  <h3 className="text-[9px] uppercase tracking-widest text-black/40 mb-2 px-2">Studio Projects</h3>
                  <div className="flex flex-col gap-0.5">
                    {studioProjects.map((project) => (
                      <Link 
                        key={project.id} 
                        to={`/studio/${project.id}`}
                        onClick={() => setAccountPanelOpen(false)}
                        className="flex items-center justify-between gap-3 p-1.5 px-3 rounded-lg hover:bg-black/5 transition-all text-left text-xs font-sans text-black/80"
                      >
                        <span className="flex flex-col gap-0.5">
                          <span className="font-bold truncate leading-none">{project.title}</span>
                          <span className="text-[9px] font-medium text-black/40 uppercase tracking-widest leading-none">{project.project_type?.replace(/_/g, ' ')}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
                <hr className="border-black/10 my-1" />
              </>
            )}

            {/* Workspace Menu */}
            <div className="p-3">
              <h3 className="text-[9px] uppercase tracking-widest text-black/40 mb-2 px-2">Workspace</h3>
              <div className="flex flex-col gap-0.5">
                <button 
                  onClick={() => setActiveView(activeView === 'overview' ? 'menu' : 'overview')}
                  disabled={!activeWorkspace}
                  className={`flex items-center justify-between gap-3 p-1.5 px-3 rounded-lg transition-all text-left text-xs font-sans text-black/80 disabled:opacity-50 ${activeView === 'overview' ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                >
                  <span className="flex items-center gap-3">
                    <LayoutGrid className={`w-3.5 h-3.5 ${activeView === 'overview' ? 'opacity-100' : 'opacity-50'}`} />
                    Overview
                  </span>
                </button>
                {settings.subscriptions_enabled && (
                  <button 
                    onClick={() => setActiveView(activeView === 'licenses' ? 'menu' : 'licenses')}
                    disabled={!activeWorkspace}
                    className={`flex items-center gap-3 p-1.5 px-3 rounded-lg transition-all text-left text-xs font-sans text-black/80 disabled:opacity-50 ${activeView === 'licenses' ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                  >
                    <FileText className={`w-3.5 h-3.5 ${activeView === 'licenses' ? 'opacity-100' : 'opacity-50'}`} />
                    Licenses
                  </button>
                )}
                <button 
                  onClick={() => setActiveView(activeView === 'team' ? 'menu' : 'team')}
                  disabled={!activeWorkspace}
                  className={`flex items-center gap-3 p-1.5 px-3 rounded-lg transition-all text-left text-xs font-sans text-black/80 disabled:opacity-50 ${activeView === 'team' ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                >
                  <Users className={`w-3.5 h-3.5 ${activeView === 'team' ? 'opacity-100' : 'opacity-50'}`} />
                  Team
                </button>
              </div>
            </div>

            <hr className="border-black/10 my-1" />

            {/* Personal Menu */}
            <div className="p-3">
              <h3 className="text-[9px] uppercase tracking-widest text-black/40 mb-2 px-2">Personal</h3>
              <div className="flex flex-col gap-0.5">
                <button 
                  onClick={() => setActiveView(activeView === 'settings' ? 'menu' : 'settings')}
                  className={`flex items-center gap-3 p-1.5 px-3 rounded-lg transition-all text-left text-xs font-sans text-black/80 disabled:opacity-50 ${activeView === 'settings' ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                >
                  <Settings className={`w-3.5 h-3.5 ${activeView === 'settings' ? 'opacity-100' : 'opacity-50'}`} />
                  Preferences
                </button>
                {settings.subscriptions_enabled && (
                  <button 
                    onClick={() => setActiveView(activeView === 'billing' ? 'menu' : 'billing')}
                    className={`flex items-center gap-3 p-1.5 px-3 rounded-lg transition-all text-left text-xs font-sans text-black/80 disabled:opacity-50 ${activeView === 'billing' ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                  >
                    <CreditCard className={`w-3.5 h-3.5 ${activeView === 'billing' ? 'opacity-100' : 'opacity-50'}`} />
                    Billing & Plan
                  </button>
                )}

                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 p-1.5 px-3 rounded-lg hover:bg-black/5 transition-all text-left text-xs font-sans text-black/80 text-red-600/80 hover:text-red-600 hover:bg-red-50 mt-1"
                >
                  <LogOut className="w-3.5 h-3.5 opacity-50" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: OVERVIEW DETAILS (768px) */}
          <div className={`w-[768px] h-full bg-black/[0.02] shrink-0 p-8 max-xl:w-full max-xl:overflow-y-auto max-xl:overscroll-contain max-xl:p-5 max-xl:pb-[max(1rem,env(safe-area-inset-bottom))] ${!isExpanded ? 'max-xl:hidden' : ''}`}>
            
            {/* OVERVIEW CONTENT */}
            {activeView === 'overview' && (
              <div className="w-full h-full flex flex-col gap-6">
              
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h1 className="text-2xl font-medium tracking-tight">Overview</h1>
                  <p className="text-black/50 font-sans text-xs">Manage your workspace settings and company profile.</p>
                </div>
                <button 
                  onClick={handleSaveSettings}
                  disabled={saving || !isOwnerOrAdmin}
                  title={!isOwnerOrAdmin ? "Only workspace admins can save changes" : ""}
                  className="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all disabled:opacity-50 min-w-[120px]"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-8 min-h-0 max-xl:grid-cols-1 max-xl:gap-5">
                {/* Left side: Avatar & Form */}
                <div className="flex flex-col gap-5">
                  {/* Workspace Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="is-avatar relative group w-16 h-16 bg-white border border-black/10 shadow-sm flex items-center justify-center overflow-hidden shrink-0 aspect-square">
                      {activeWorkspace?.avatar_url ? (
                        <>
                          <img 
                            src={activeWorkspace.avatar_url} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('fallback-avatar');
                            }}
                          />
                          <svg className="hidden fallback-svg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </>
                      ) : (
                        <span className="font-sans text-xl font-bold uppercase text-black/30">{activeWorkspace?.name?.substring(0,2)}</span>
                      )}
                      
                      <div className="is-avatar absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      
                      {isUploading && (
                        <div className="is-avatar absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}

                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleWorkspaceAvatarUpload}
                        disabled={isUploading || !isOwnerOrAdmin}
                        title={!isOwnerOrAdmin ? "Only workspace admins can change the avatar" : ""}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h3 className="font-bold text-xs">Workspace Avatar</h3>
                      <p className="text-[10px] text-black/50 max-w-[180px] leading-relaxed">Click to upload image.</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-black/50 font-bold">Workspace Name</label>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={!isOwnerOrAdmin}
                        className="w-full bg-white border border-black/10 p-2 font-sans text-xs focus:ring-1 focus:ring-black outline-none disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/50"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-black/50 font-bold">Company Name</label>
                        <input 
                          type="text" 
                          value={editCompany}
                          onChange={(e) => setEditCompany(e.target.value)}
                          placeholder="E.g. Acme Corp"
                          disabled={!isOwnerOrAdmin}
                          className="w-full bg-white border border-black/10 p-2 font-sans text-xs focus:ring-1 focus:ring-black outline-none disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/50"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-black/50 font-bold">Industry</label>
                        <input 
                          type="text" 
                          value={editIndustry}
                          onChange={(e) => setEditIndustry(e.target.value)}
                          placeholder="E.g. Film"
                          disabled={!isOwnerOrAdmin}
                          className="w-full bg-white border border-black/10 p-2 font-sans text-xs focus:ring-1 focus:ring-black outline-none disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Ownership */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-[10px] uppercase tracking-widest text-black/50 font-bold">Ownership</h3>
                  <div className="bg-white p-3 border border-black/10 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="font-sans text-xs flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-500"/>
                        {currentOwner ? (
                          currentOwner.profiles?.first_name 
                            ? `${currentOwner.profiles.first_name} ${currentOwner.profiles.last_name || ''}`
                            : currentOwner.profiles?.email?.split('@')[0] || 'Owner'
                        ) : 'Loading...'}
                      </span>
                      <span className="text-[10px] text-black/50 mt-0.5">Current owner</span>
                    </div>
                    <button 
                      onClick={() => setIsTransferModalOpen(true)}
                      disabled={!canTransferOwnership}
                      title={!canTransferOwnership ? "Only the current workspace owner can transfer ownership" : ""}
                      className="text-[10px] border border-black/20 bg-black/5 px-3 py-1.5 hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-black/5 disabled:hover:text-black"
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* LICENSES CONTENT */}
            {activeView === 'licenses' && (
              <div className="w-full h-full flex flex-col gap-4">
                <div className="flex justify-between items-center shrink-0">
                  <h1 className="text-2xl font-medium tracking-tight">Licenses</h1>
                </div>
                {/* Search Bar Row */}
                <div className="flex justify-between items-center pb-4 border-b border-black/10 shrink-0">
                  <div className="flex items-center gap-3 flex-1">
                    <Search className="w-4 h-4 text-black/40" />
                    <input 
                      type="text" 
                      placeholder="Search licensed songs" 
                      className="bg-transparent border-none outline-none font-sans text-xs italic w-full text-black placeholder:text-black/40"
                    />
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-black/10 text-[10px] text-black/50 uppercase tracking-widest font-bold shrink-0">
                  <div className="col-span-5">Track</div>
                  <div className="col-span-3">License Type</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                  {/* Empty State */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <p className="text-xs font-sans text-black/50 text-center max-w-[380px] leading-relaxed">
                      Your licensed tracks will appear here. Explore our catalog by clicking <Link to="/browse" className="font-bold text-black hover:underline" onClick={() => setAccountPanelOpen(false)}>Browse</Link> or check out <Link to="/browse?playlist=d9e3f532-1b03-4791-bf8b-025499e64b43" className="font-bold text-black hover:underline" onClick={() => setAccountPanelOpen(false)}>What's New</Link>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TEAM CONTENT */}
            {activeView === 'team' && (() => {
              const normalizedMemberSearch = memberSearch.trim().toLowerCase();
              const filteredMembers = normalizedMemberSearch
                ? members.filter((member) => [
                    member.profiles?.first_name,
                    member.profiles?.last_name,
                    member.profiles?.email,
                    member.role,
                  ].some((value) => value?.toLowerCase().includes(normalizedMemberSearch)))
                : members;
              
              return (
                <div className="w-full h-full flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex justify-between items-start shrink-0">
                    <div>
                      <h1 className="text-2xl font-medium tracking-tight mb-0.5">Team</h1>
                      <p className="text-[10px] font-sans text-black/50">Viewing {filteredMembers.length} of {members.length}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsInviteModalOpen(true)}
                        disabled={!isOwnerOrAdmin}
                        title={!isOwnerOrAdmin ? "Only workspace admins can invite members" : ""}
                        className="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        Add Member
                      </button>
                    </div>
                  </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 p-2 border border-black/10 bg-white shrink-0">
                  <Search className="w-3.5 h-3.5 text-black/30" />
                  <input 
                    type="text" 
                    placeholder="Search" 
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    className="bg-transparent border-none outline-none font-sans text-xs w-full text-black placeholder:text-black/40"
                  />
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-black/10 text-[10px] text-black/40 uppercase tracking-widest font-bold px-2 shrink-0">
                  <div className="col-span-5">Name</div>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-3 text-right">Role & access</div>
                </div>

                {/* Members List (Scrollable) */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="flex flex-col">
                    {filteredMembers.map(member => {
                      const isCurrentUser = member.user_id === user.id;
                      const memberIsOwner = member.user_id === workspaceOwnerId || member.role === 'owner';
                      const canManageThisMember = !isCurrentUser
                        && !memberIsOwner
                        && (isWorkspaceOwner || (currentUserRole === 'admin' && member.role === 'member'));
                      const isMemberActionPending = managingMemberId === member.user_id;

                      return (
                      <div key={member.user_id} className="grid grid-cols-12 gap-4 py-2 px-2 items-center border-b border-black/5 hover:bg-black/5 transition-colors group">
                        <div className="col-span-5 flex items-center gap-2">
                          {member.profiles?.avatar_url ? (
                            <>
                              <img 
                                src={member.profiles.avatar_url} 
                                alt="Avatar" 
                                className="no-radius w-6 h-6 rounded-full border border-black/10 object-cover" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('fallback-avatar');
                                }}
                              />
                              <svg className="hidden fallback-svg w-4 h-4 text-black/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {(member.profiles?.first_name || '')[0] || (member.profiles?.last_name || '')[0] || '?'}
                            </div>
                          )}
                          <span className="font-sans text-xs font-medium">{member.profiles?.first_name} {member.profiles?.last_name}</span>
                        </div>
                        <div className="col-span-4">
                          <span className="font-sans text-xs text-black/70">{member.profiles?.email}</span>
                        </div>
                        <div className="col-span-3 flex items-center justify-between">
                          <div className="ml-auto flex items-center justify-end gap-2">
                          {isWorkspaceOwner && !memberIsOwner && !isCurrentUser ? (
                            <select
                              value={member.role}
                              aria-label={`Role for ${member.profiles?.first_name || 'team member'}`}
                              disabled={isMemberActionPending}
                              onChange={(event) => void handleMemberAction('set_role', member.user_id, event.target.value as 'member' | 'admin')}
                              className="max-w-[84px] bg-white border border-black/10 px-1.5 py-1 font-sans text-[10px] capitalize disabled:opacity-50"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="font-sans text-xs capitalize text-black/70">{memberIsOwner ? 'owner' : member.role}</span>
                          )}
                          {isCurrentUser && (
                            <button
                              onClick={() => void handleMemberAction('leave', member.user_id)}
                              disabled={memberIsOwner || isMemberActionPending}
                              title={memberIsOwner ? 'Transfer ownership before leaving this workspace' : 'Leave this workspace'}
                              className="px-2 py-1 border border-red-200 text-[10px] text-red-700 hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {memberIsOwner ? 'Transfer first' : 'Leave'}
                            </button>
                          )}
                          {canManageThisMember && (
                            <button
                              onClick={() => void handleMemberAction('remove', member.user_id)}
                              disabled={isMemberActionPending}
                              className="px-2 py-1 border border-red-200 text-[10px] text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {isMemberActionPending ? '...' : 'Remove'}
                            </button>
                          )}
                          {memberIsOwner && canTransferOwnership && (
                            <button 
                              onClick={() => setIsTransferModalOpen(true)}
                              className="px-2 py-1 border border-black/10 text-[10px] hover:bg-white hover:border-black/20 whitespace-nowrap bg-white shadow-sm"
                            >
                              Transfer
                            </button>
                          )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    {filteredMembers.length === 0 && (
                      <div className="py-8 text-center font-sans text-xs text-black/45">
                        No team members match this search.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}

            {/* BILLING CONTENT */}
            {activeView === 'billing' && (
              <div className="w-full h-full flex flex-col gap-8 overflow-y-auto min-h-0">
                {isChangingPlan ? (
                  <div className="w-full flex flex-col gap-6 max-w-4xl animate-fade-in-up">
                    <div className="flex items-center gap-4 border-b border-black/10 pb-6">
                      <button 
                        onClick={() => setIsChangingPlan(false)}
                        className="text-[10px] font-bold uppercase tracking-widest text-black/50 hover:text-black transition-colors"
                      >
                        ← Back to Billing
                      </button>
                      <h2 className="text-xl font-bold uppercase tracking-tight">Change Plan</h2>
                    </div>
                    
                    <UpgradePlan 
                      currentPlanId={profile?.subscription_tier || undefined} 
                      currentInterval={profile?.billing_interval || undefined}
                      onSuccess={async () => {
                        setIsChangingPlan(false);
                        await refreshProfile();
                      }} 
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <h1 className="text-2xl font-medium tracking-tight mb-1">Billing & Plan</h1>
                      <p className="text-[10px] font-sans text-black/50 uppercase tracking-widest font-bold">Manage your subscription</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left Column: Current Plan */}
                      <div className="lg:col-span-1">
                        <div className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm flex flex-col h-full">
                          <h3 className="text-[10px] uppercase tracking-widest text-black/50 font-bold mb-4">Current Plan</h3>
                          <div className="flex-1">
                            <div className="text-xl font-bold capitalize mb-4">
                              {profile?.subscription_tier
                                ? `${profile.subscription_tier.replace(/_/g, ' ')} Plan`
                                : (profile?.subscription_status === 'active' ? 'Active Plan' : 'Free / No Active Plan')}
                            </div>
                            <div className="text-xs font-sans text-black/60 flex flex-col gap-2.5">
                              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                                <span>Status</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                  profile?.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 
                                  profile?.subscription_status === 'past_due' ? 'bg-red-100 text-red-700' :
                                  profile?.subscription_status === 'canceled' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {profile?.subscription_status || 'Inactive'}
                                </span>
                              </div>
                              
                              {profile?.subscription_tier && (
                                <div className="flex items-center justify-between border-b border-black/5 pb-2">
                                  <span>Interval</span> 
                                  <span className="font-bold text-black capitalize">{profile.billing_interval || 'monthly'}</span>
                                </div>
                              )}
                              
                              {profile?.current_period_end && (
                                <div className="flex items-center justify-between border-b border-black/5 pb-2">
                                  <span>{profile?.cancel_at_period_end ? 'Access Ends' : 'Renews'}</span> 
                                  <span className="font-bold text-black">
                                    {new Date(profile.current_period_end).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              )}
                              
                              {profile?.cancel_at_period_end && (
                                <div className="text-yellow-600 font-bold mt-2 text-[10px] leading-relaxed">
                                  Your subscription will be canceled at the end of the billing period.
                                </div>
                              )}
                              
                              {profile?.subscription_status === 'past_due' && (
                                <div className="text-red-600 font-bold mt-2 text-[10px] leading-relaxed">
                                  Payment failed. Please update your payment method.
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3 pt-6 mt-6 border-t border-black/10">
                            <button 
                              onClick={handleManageBilling}
                              disabled={isManagingBilling || !(profile as any)?.stripe_customer_id}
                              className="w-full bg-black text-white px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black/90 transition-all disabled:opacity-50"
                            >
                              {isManagingBilling ? 'Loading...' : 'Manage Payment'}
                            </button>
                            <button 
                              onClick={() => setIsChangingPlan(true)}
                              disabled={isManagingSubscription}
                              className="w-full px-4 py-3 border border-black/20 text-xs font-bold uppercase tracking-widest hover:bg-black/5 transition-all text-black disabled:opacity-50"
                            >
                              {profile?.subscription_tier === 'free' ? 'Choose Your Plan' : 'Change Plan'}
                            </button>
                            
                            {profile?.subscription_status === 'active' && !profile?.cancel_at_period_end && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsCancelSubModalOpen(true);
                                }}
                                disabled={isManagingSubscription}
                                className="w-full px-4 py-3 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50"
                              >
                                {isManagingSubscription ? 'Processing...' : 'Cancel Plan'}
                              </button>
                            )}

                            {profile?.subscription_status === 'active' && profile?.cancel_at_period_end && (
                              <button 
                                onClick={() => handleManageSubscriptionStatus('resume')}
                                disabled={isManagingSubscription}
                                className="w-full px-4 py-3 border border-green-200 text-green-700 bg-green-50 text-xs font-bold uppercase tracking-widest hover:bg-green-100 transition-all disabled:opacity-50"
                              >
                                {isManagingSubscription ? 'Processing...' : 'Resume Plan'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Billing History */}
                      <div className="lg:col-span-2">
                        <div className="bg-white border border-black/10 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
                          <div className="p-6 border-b border-black/10 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-black flex items-center gap-2">
                              <FileText className="w-4 h-4 text-black/50" />
                              Billing History
                            </h3>
                          </div>
                          
                          <div className="flex-1 overflow-x-auto">
                            {isLoadingInvoices ? (
                              <div className="w-full flex flex-col">
                                {[1, 2, 3].map((i) => (
                                  <div key={i} className="flex items-center justify-between p-4 border-b border-black/5 animate-pulse">
                                    <div className="flex flex-col gap-2">
                                      <div className="h-4 w-24 bg-black/10 rounded"></div>
                                      <div className="h-3 w-16 bg-black/5 rounded"></div>
                                    </div>
                                    <div className="h-4 w-12 bg-black/10 rounded"></div>
                                    <div className="h-8 w-24 bg-black/5 rounded"></div>
                                  </div>
                                ))}
                              </div>
                            ) : invoices.length === 0 ? (
                              <div className="p-12 flex flex-col items-center justify-center text-center text-black/40">
                                <FileText className="w-8 h-8 mb-3 opacity-20" />
                                <p className="text-sm font-sans">No invoice history found.</p>
                              </div>
                            ) : (
                              <table className="w-full text-left font-sans text-sm">
                                <thead>
                                  <tr className="border-b border-black/10 bg-black/5">
                                    <th className="p-4 font-semibold text-black/60 text-xs uppercase tracking-widest">Date</th>
                                    <th className="p-4 font-semibold text-black/60 text-xs uppercase tracking-widest">Plan</th>
                                    <th className="p-4 font-semibold text-black/60 text-xs uppercase tracking-widest">Amount</th>
                                    <th className="p-4 font-semibold text-black/60 text-xs uppercase tracking-widest">Status</th>
                                    <th className="p-4 font-semibold text-black/60 text-xs uppercase tracking-widest text-right">Invoice</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="border-b border-black/5 hover:bg-black/[0.02] transition-colors">
                                      <td className="p-4 text-black/80 font-medium whitespace-nowrap">
                                        {new Date(invoice.created * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                      </td>
                                      <td className="p-4 text-black/60 capitalize">
                                        {invoice.plan_name}
                                      </td>
                                      <td className="p-4 font-bold text-black">
                                        {(invoice.amount_paid / 100).toLocaleString('en-US', { style: 'currency', currency: invoice.currency.toUpperCase() })}
                                      </td>
                                      <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                          invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {invoice.status}
                                        </span>
                                      </td>
                                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                        {invoice.invoice_pdf && (
                                          <a 
                                            href={invoice.invoice_pdf}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black/10 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors rounded-sm"
                                          >
                                            <Download className="w-3 h-3" /> PDF
                                          </a>
                                        )}
                                        {invoice.hosted_invoice_url && (
                                          <a 
                                            href={invoice.hosted_invoice_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/5 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-black/10 transition-colors rounded-sm"
                                          >
                                            <ExternalLink className="w-3 h-3" /> View
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SETTINGS CONTENT */}
            {activeView === 'settings' && (
              <ProfileSettings />
            )}



          </div>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      <div className={`fixed inset-0 z-[200] flex items-center justify-center px-4 max-md:items-start max-md:overflow-y-auto max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] ${isCancelSubModalOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 motion-overlay ${isCancelSubModalOpen ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={() => setIsCancelSubModalOpen(false)} />
        <div className={`bg-[#fcfcfc] w-full max-w-md relative z-10 shadow-2xl overflow-hidden border border-black/5 motion-surface max-md:my-auto max-md:max-h-[calc(100dvh-2rem)] max-md:overflow-y-auto max-md:overscroll-contain ${isCancelSubModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          <div className="p-8 flex flex-col items-center text-center max-md:p-5">
            <button onClick={() => setIsCancelSubModalOpen(false)} className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
            
            <h2 className="text-xl font-medium tracking-tight mb-2">Cancel subscription?</h2>
            <p className="text-black/60 text-sm mb-8 px-4 leading-relaxed font-sans">
              Are you sure you want to cancel your subscription? You will retain access until the end of your billing cycle.
            </p>

            <div className="flex w-full gap-3">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCancelSubModalOpen(false);
                }}
                className="flex-1 p-3 border border-black/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 transition-colors"
              >
                Go Back
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCancelSubModalOpen(false);
                  handleManageSubscriptionStatus('cancel');
                }}
                className="flex-1 p-3 bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
              >
                Cancel Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Ownership Modal */}
      <div className={`fixed inset-0 z-[200] flex items-center justify-center px-4 max-md:items-start max-md:overflow-y-auto max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] ${isTransferModalOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 motion-overlay ${isTransferModalOpen ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={() => setIsTransferModalOpen(false)} />
        <div className={`bg-[#fcfcfc] w-full max-w-md relative z-10 shadow-2xl overflow-hidden border border-black/5 motion-surface max-md:my-auto max-md:max-h-[calc(100dvh-2rem)] max-md:overflow-y-auto max-md:overscroll-contain ${isTransferModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          <div className="p-8 flex flex-col items-center text-center max-md:p-5">
            <button onClick={() => setIsTransferModalOpen(false)} className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
            
            <h2 className="text-xl font-medium tracking-tight mb-2">Transfer workspace ownership</h2>
            <p className="text-black/60 text-sm mb-8 px-4 leading-relaxed">
              Select the new workspace owner. Their access will update immediately.
            </p>

            <div className="w-full flex flex-col gap-2 text-left mb-8">
              <label className="text-sm font-medium">Workspace owner</label>
              <div className="relative">
                <select 
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="w-full"
                >
                  <option value="" disabled>Select team member...</option>
                  {members.filter(m => m.role !== 'owner').map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.first_name} {m.profiles?.last_name} ({m.profiles?.email || 'member'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex w-full gap-3">
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="flex-1 p-4 border border-black/10 text-xs hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleTransferOwnership}
                disabled={!newOwnerId || isTransferringOwnership}
                className="flex-1 p-4 bg-black text-white text-xs hover:bg-black/90 transition-colors disabled:opacity-50"
              >
                {isTransferringOwnership ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Workspace Modal */}
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 max-md:items-start max-md:overflow-y-auto max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] ${isCreateModalOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 motion-overlay ${isCreateModalOpen ? 'bg-black/20 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={() => setIsCreateModalOpen(false)} />
        <div className={`bg-white/90 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 w-full max-w-md relative z-10 shadow-2xl overflow-hidden motion-surface max-md:my-auto max-md:max-h-[calc(100dvh-2rem)] max-md:overflow-y-auto max-md:overscroll-contain max-md:p-5 ${isCreateModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          <h3 className="font-sans text-lg font-bold text-black mb-1">Create New Workspace</h3>
          <p className="font-sans text-sm text-black/60 mb-6">Create a new collaborative space for your team or project.</p>
          
          <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-black/50 mb-1">Workspace Name</label>
              <input 
                type="text" 
                value={newWsName}
                onChange={e => setNewWsName(e.target.value)}
                className="w-full bg-white/50 border border-black/10 rounded-lg px-4 py-3 font-sans text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                placeholder="e.g. Acme Agency"
                required
              />
            </div>
            
            {createWsError && (
              <div className="text-red-500 text-xs font-sans p-2 bg-red-50 rounded border border-red-100">
                {createWsError}
              </div>
            )}
            
            <div className="flex items-center justify-end gap-3 mt-4">
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 font-sans text-xs font-bold text-black/50 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isCreatingWs || !newWsName.trim()}
                className="px-6 py-2 bg-black text-white rounded-full font-sans text-xs font-bold hover:bg-black/80 transition-colors disabled:opacity-50"
              >
                {isCreatingWs ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Invite Member Modal */}
      <div className={`fixed inset-0 z-[200] flex items-center justify-center px-4 max-md:items-start max-md:overflow-y-auto max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] ${isInviteModalOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 motion-overlay ${isInviteModalOpen ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={() => setIsInviteModalOpen(false)} />
        <div className={`bg-[#fcfcfc] w-full max-w-md relative z-10 shadow-2xl overflow-hidden border border-black/5 motion-surface max-md:my-auto max-md:max-h-[calc(100dvh-2rem)] max-md:overflow-y-auto max-md:overscroll-contain ${isInviteModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          <div className="p-8 flex flex-col items-center text-center max-md:p-5">
            <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
            
            <h2 className="text-xl font-medium tracking-tight mb-2">Invite Team Member</h2>
            <p className="text-black/60 text-sm mb-8 px-4 leading-relaxed">
              Send an email invitation to join this workspace.
            </p>

            <form 
              className="w-full flex flex-col gap-2 text-left mb-8"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!activeWorkspace || !inviteEmail) return;
                setIsInviting(true);
                try {
                  await inviteTeamMember(activeWorkspace.id, inviteEmail);
                  toast.success("Invitation sent successfully!");
                  setIsInviteModalOpen(false);
                  setInviteEmail('');
                } catch (err: any) {
                  console.error(err);
                  toast.error(err.message || "Failed to send invitation");
                } finally {
                  setIsInviting(false);
                }
              }}
            >
              <label className="text-sm font-medium">Email Address</label>
              <input 
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className="w-full bg-white border border-black/10 p-3 text-sm font-sans focus:ring-2 focus:ring-black/20 outline-none"
              />

              <div className="flex w-full gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 p-4 border border-black/10 text-xs hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isInviting || !inviteEmail}
                  className="flex-1 p-4 bg-black text-white text-xs hover:bg-black/90 transition-colors disabled:opacity-50"
                >
                  {isInviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
