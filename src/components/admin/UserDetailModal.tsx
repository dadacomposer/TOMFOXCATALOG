import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Shield, Folder, Share2, Music } from 'lucide-react';
import type { ProfileData } from './AdminUsers';

type UserDetailModalProps = {
  user: ProfileData;
  onClose: () => void;
};

export default function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview'|'billing'|'workspaces'|'compliance'|'activity'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingDL, setIsUpdatingDL] = useState(false);
  const [canDownload, setCanDownload] = useState(user.can_download !== false);

  const [logs, setLogs] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [memberWorkspaces, setMemberWorkspaces] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    fetchUserData();
  }, [user.id]);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      // Fetch compliance logs
      const { data: logData } = await supabase
        .from('download_audit_logs')
        .select('*, tracks(file_name)')
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false });
      if (logData) setLogs(logData);

      // Fetch workspaces owned
      const { data: ownWs } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id);
      if (ownWs) setWorkspaces(ownWs);

      // Fetch workspaces joined
      const { data: memberWs } = await supabase
        .from('workspace_members')
        .select('*, workspaces(*)')
        .eq('user_id', user.id);
      if (memberWs) setMemberWorkspaces(memberWs);

      // Fetch playlists
      const { data: pl } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id);
      if (pl) setPlaylists(pl);

      // Fetch shared links
      const { data: sl } = await supabase
        .from('shared_links')
        .select('*')
        .eq('created_by', user.id);
      if (sl) setLinks(sl);

    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleToggleDownload = async () => {
    setIsUpdatingDL(true);
    const newVal = !canDownload;
    const { error } = await supabase
      .from('profiles')
      .update({ can_download: newVal })
      .eq('id', user.id);
      
    if (!error) {
      setCanDownload(newVal);
      user.can_download = newVal; // Update parent prop reference optimistically
    }
    setIsUpdatingDL(false);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-black/10 flex items-start justify-between shrink-0 bg-black text-white">
          <div className="flex items-center gap-6">
            <img 
              src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name || 'U'}+${user.last_name || ''}&background=random`} 
              alt="avatar" 
              className="w-16 h-16 rounded-full border-2 border-white/20"
            />
            <div>
              <h2 className="text-2xl font-bold">{user.first_name} {user.last_name}</h2>
              <p className="text-white/60 text-sm font-mono mt-1">{user.id}</p>
              <div className="flex items-center gap-3 mt-3">
                {user.banned_at ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                    Banned
                  </span>
                ) : user.subscription_status === 'active' || user.subscription_status === 'trialing' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30">
                    {user.subscription_tier || 'Active'}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white/60 border border-white/20">
                    Free / Inactive
                  </span>
                )}
                
                {user.is_admin && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-black/10 shrink-0 bg-[#fafafa]">
          {(['overview', 'billing', 'workspaces', 'compliance', 'activity'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-black text-black' 
                  : 'border-transparent text-black/40 hover:text-black/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#fafafa]">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-4">Identity Details</h3>
                  <div className="bg-white rounded-2xl border border-black/10 p-6 space-y-4 shadow-sm">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Stripe Customer ID</p>
                      <p className="font-mono text-sm">{user.stripe_customer_id || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Joined Date</p>
                      <p>{new Date(user.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Role</p>
                      <p>{user.role || 'Member'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-4">Permissions</h3>
                  <div className="bg-white rounded-2xl border border-black/10 p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">Download Tracks</p>
                        <p className="text-xs text-black/50 mt-1">Allow user to download tracks.</p>
                      </div>
                      <button
                        onClick={handleToggleDownload}
                        disabled={isUpdatingDL}
                        className={`preview-toggle w-9 h-5 rounded-full p-[2px] transition-colors relative flex items-center shadow-inner ${canDownload !== false ? 'bg-[#111111]' : 'bg-[#e0e0e0]'} disabled:opacity-50`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${canDownload !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-black/10 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Subscription Status</h3>
                    <p className="text-black/50 text-sm">Manage Stripe billing and access levels.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Current Tier</p>
                    <p className="text-lg font-bold">{user.subscription_tier || 'None'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Status</p>
                    <p className="font-bold capitalize">{user.subscription_status || 'Inactive'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Interval</p>
                    <p className="font-bold capitalize">{user.billing_interval || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Period Ends</p>
                    <p className="font-bold">{user.current_period_end ? new Date(user.current_period_end).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Stripe Sub ID</p>
                    <p className="font-mono text-xs">{user.stripe_subscription_id || 'None'}</p>
                  </div>
                </div>


              </div>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-4 flex items-center gap-2">
                  <Folder className="w-4 h-4" /> Workspaces Owned ({workspaces.length})
                </h3>
                {workspaces.length === 0 ? (
                  <p className="text-black/40 bg-white p-6 rounded-2xl border border-black/10">No workspaces owned.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {workspaces.map(ws => (
                      <div key={ws.id} className="bg-white rounded-2xl border border-black/10 p-6 shadow-sm">
                        <h4 className="font-bold text-lg mb-1">{ws.name}</h4>
                        <p className="text-black/50 text-sm mb-4">{ws.company_name} • {ws.company_industry}</p>
                        <p className="text-xs text-black/40">ID: {ws.id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-4 flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" /> Workspaces Joined ({memberWorkspaces.length})
                </h3>
                {memberWorkspaces.length === 0 ? (
                  <p className="text-black/40 bg-white p-6 rounded-2xl border border-black/10">No workspaces joined.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {memberWorkspaces.map(mw => (
                      <div key={mw.id} className="bg-white rounded-2xl border border-black/10 p-4 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-bold">{mw.workspaces?.name}</p>
                          <p className="text-xs text-black/50 uppercase tracking-widest mt-1">Role: {mw.role}</p>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                <Shield className="w-6 h-6 text-blue-500 shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">Frequency Audio Compliance Log</h3>
                  <p className="text-sm text-blue-800/70">
                    This is an immutable legal audit log of all high-resolution audio downloads (WAV, AIFF) and MP3s by this user. It is used to prove subscription status at the exact moment of download.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/5">
                    <tr>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-black/50">Date / Time</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-black/50">Track</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-black/50">Format</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-black/50">Sub Tier at Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-black/40">No downloads logged yet.</td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="border-t border-black/5">
                          <td className="px-6 py-4 font-mono text-xs text-black/60">{new Date(log.downloaded_at).toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold">{log.tracks?.file_name || 'Unknown Track'}</td>
                          <td className="px-6 py-4 uppercase font-bold text-black/60">{log.format}</td>
                          <td className="px-6 py-4 capitalize">
                            {log.subscription_tier_at_download === 'active' || log.subscription_tier_at_download === 'trialing' ? (
                              <span className="text-green-600 font-bold bg-green-500/10 px-2 py-1 rounded-md text-xs">{log.subscription_tier_at_download}</span>
                            ) : (
                              <span className="text-red-600 font-bold bg-red-500/10 px-2 py-1 rounded-md text-xs">{log.subscription_tier_at_download || 'none'}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-4 flex items-center gap-2">
                  <Music className="w-4 h-4" /> Playlists Created ({playlists.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {playlists.map(pl => (
                    <div key={pl.id} className="bg-white rounded-xl border border-black/10 p-4 shadow-sm text-center">
                      <p className="font-bold truncate">{pl.name}</p>
                      <p className="text-xs text-black/40 mt-1">{new Date(pl.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/40 mb-4 flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Shared Links ({links.length})
                </h3>
                <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/5">
                      <tr>
                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-widest text-black/50">Created</th>
                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-widest text-black/50">Expires</th>
                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-widest text-black/50">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map(link => (
                        <tr key={link.id} className="border-t border-black/5">
                          <td className="px-6 py-3">{new Date(link.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-3">{link.expires_at ? new Date(link.expires_at).toLocaleDateString() : 'Never'}</td>
                          <td className="px-6 py-3">{link.is_active ? 'Active' : 'Disabled'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);
const UsersIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
