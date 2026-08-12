import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, UserCheck, UserX, User, Shield, Calendar, DollarSign, Loader2, Download, CheckSquare, Square } from 'lucide-react';
import UserDetailModal from './UserDetailModal';

export type ProfileData = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  avatar_url: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  is_admin: boolean;
  banned_at: string | null;
  current_period_end: string | null;
  billing_interval?: string | null;
  can_download: boolean;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<ProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedUser, setSelectedUser] = useState<ProfileData | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  const handleBulkToggleDownload = async (enable: boolean) => {
    if (selectedUserIds.size === 0) return;
    setIsUpdatingBulk(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ can_download: enable })
      .in('id', Array.from(selectedUserIds));
      
    if (!error) {
      setUsers(users.map(u => selectedUserIds.has(u.id) ? { ...u, can_download: enable } : u));
    }
    
    setIsUpdatingBulk(false);
    setSelectedUserIds(new Set());
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    const { data, error } = await query;
    if (!error && data) {
      setUsers(data as ProfileData[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(u => {
    const nameMatch = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return nameMatch;
    if (statusFilter === 'active') return nameMatch && (u.subscription_status === 'active' || u.subscription_status === 'trialing');
    if (statusFilter === 'banned') return nameMatch && u.banned_at !== null;
    if (statusFilter === 'admin') return nameMatch && u.is_admin === true;
    
    return nameMatch;
  });

  const activeCount = users.filter(u => u.subscription_status === 'active' || u.subscription_status === 'trialing').length;
  const adminCount = users.filter(u => u.is_admin).length;
  const bannedCount = users.filter(u => u.banned_at !== null).length;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Users CRM</h1>
          <p className="text-black/50">Manage your customers, subscriptions, and compliance logs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0">
        <div className="bg-white p-6 rounded-2xl border border-black/10 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black/50">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/10 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black/50">Active Subs</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-black/10 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black/50">Banned</p>
            <p className="text-2xl font-bold">{bannedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-black/10 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-black/10 flex items-center gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/5 border border-black/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-black/20"
            />
          </div>

          {selectedUserIds.size > 0 && (
            <div className="flex items-center gap-2 border-l border-black/10 pl-4 ml-4">
              <span className="text-xs font-bold text-black/50 uppercase tracking-widest">{selectedUserIds.size} selected</span>
              <button
                onClick={() => handleBulkToggleDownload(true)}
                disabled={isUpdatingBulk}
                className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-black/80 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Allow DL
              </button>
              <button
                onClick={() => handleBulkToggleDownload(false)}
                disabled={isUpdatingBulk}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                Revoke DL
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-2 px-4 bg-white border border-black/10 rounded-xl shadow-sm shrink-0 h-10" ref={filterDropdownRef}>
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-black outline-none cursor-pointer"
            >
              {statusFilter === 'all' ? 'All Users' : statusFilter === 'active' ? 'Active Subscribers' : statusFilter === 'admin' ? 'Admins' : 'Banned'}
              <svg className={`w-3 h-3 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {isFilterDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                {[
                  { id: 'all', label: 'All Users' },
                  { id: 'active', label: 'Active Subscribers' },
                  { id: 'admin', label: 'Admins' },
                  { id: 'banned', label: 'Banned' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setStatusFilter(opt.id); setIsFilterDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${statusFilter === opt.id ? 'bg-black/5 text-black' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
                  >
                    <div className="flex items-center gap-2">
                      {statusFilter === opt.id ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <div className="w-3 h-3" />}
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-black/40">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="h-full flex items-center justify-center text-black/40">
              <p>No users found matching your criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr>
                  <th className="px-6 py-4 border-b border-black/10 w-12">
                    <button 
                      onClick={() => {
                        if (selectedUserIds.size === filteredUsers.length) {
                          setSelectedUserIds(new Set());
                        } else {
                          setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
                        }
                      }}
                      className="text-black/40 hover:text-black transition-colors"
                    >
                      {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-black/50 border-b border-black/10">User</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-black/50 border-b border-black/10">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-black/50 border-b border-black/10">Role</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-black/50 border-b border-black/10">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('.user-checkbox')) return;
                      setSelectedUser(user);
                    }}
                    className="border-b border-black/5 hover:bg-black/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <button
                        className="user-checkbox text-black/40 hover:text-black transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newSet = new Set(selectedUserIds);
                          if (newSet.has(user.id)) newSet.delete(user.id);
                          else newSet.add(user.id);
                          setSelectedUserIds(newSet);
                        }}
                      >
                        {selectedUserIds.has(user.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name || 'U'}+${user.last_name || ''}&background=random`} 
                          alt="avatar" 
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{user.first_name} {user.last_name}</p>
                            {user.can_download === false && (
                              <span className="bg-red-500/10 text-red-600 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md">DL Revoked</span>
                            )}
                          </div>
                          <p className="text-xs text-black/50 truncate max-w-[200px]">{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.banned_at ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-600">
                          Banned
                        </span>
                      ) : user.subscription_status === 'active' || user.subscription_status === 'trialing' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-600">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/5 text-black/60">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_admin ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 flex items-center gap-1 w-max">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-black/60">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserDetailModal 
          user={selectedUser} 
          onClose={() => {
            setSelectedUser(null);
            fetchUsers(); // Refresh after closing in case edits were made
          }} 
        />
      )}
    </div>
  );
}
