import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [identities, setIdentities] = useState<any[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  useEffect(() => {
    async function loadIdentities() {
      if (!user) return;
      
      setIsLoadingAuth(true);
      try {
        const { data, error } = await supabase.auth.getUserIdentities();
        if (data && data.identities) {
          setIdentities(data.identities);
          // Check if there is an email/password identity
          setHasPassword(data.identities.some(id => id.provider === 'email'));
        }
      } catch (err) {
        console.error("Failed to load identities", err);
      } finally {
        setIsLoadingAuth(false);
      }
    }
    loadIdentities();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      // 1. Get presigned URL
      const { data: { uploadUrl, publicUrl }, error: functionError } = await supabase.functions.invoke('get-r2-upload-url', {
        body: { fileName: file.name, contentType: file.type }
      });
      
      if (functionError) throw functionError;
      if (!uploadUrl || !publicUrl) throw new Error("Failed to get upload URL");

      // 2. Upload file to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image to R2");
      }

      // 3. Update Supabase Profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      await refreshProfile();
    } catch (err: any) {
      console.error("Avatar upload error", err);
      alert(err.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // 1. Update Profile (Names)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

      // 2. Update Email (Auth level) if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        // Optionally update email in profiles table as well, though it's typically synced via triggers
        await supabase.from('profiles').update({ email }).eq('id', user.id);
      }

      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save changes", err);
      alert(err.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!user) return;
    
    const googleIdentity = identities.find(id => id.provider === 'google');
    if (!googleIdentity) return;

    if (!hasPassword) {
      // Must set a password first
      setIsDisconnectModalOpen(true);
      return;
    }

    // Proceed to disconnect
    try {
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;
      
      setIdentities(identities.filter(id => id.provider !== 'google'));
      toast.success("Google account disconnected successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to disconnect Google.");
    }
  };

  const handleSetPasswordAndDisconnect = async () => {
    if (!user || newPassword.length < 6) return;
    setIsSaving(true);
    
    try {
      // Set password
      const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwdError) throw pwdError;
      
      setHasPassword(true);
      setIsDisconnectModalOpen(false);
      
      // Proceed to unlink google
      const googleIdentity = identities.find(id => id.provider === 'google');
      if (googleIdentity) {
        const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
        if (unlinkError) throw unlinkError;
        setIdentities(identities.filter(id => id.provider !== 'google'));
        toast.success("Password set and Google account disconnected successfully.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update security settings.");
    } finally {
      setIsSaving(false);
      setNewPassword('');
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully.");
      setNewPassword('');
      setHasPassword(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsSaving(false);
    }
  };

  const isGoogleConnected = identities.some(id => id.provider === 'google');

  return (
    <div className="w-full h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-medium tracking-tight">Preferences</h1>
        <button 
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all disabled:opacity-50 min-w-[120px]"
        >
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-8">
        <div className="grid grid-cols-2 gap-8 mb-12">
        
        {/* Left Column: Personal Info */}
        <div className="flex flex-col gap-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-black/80">Personal Info</h3>
          
          <div className="flex items-center gap-4">
            <div className="is-avatar relative w-12 h-12 shrink-0 bg-black/5 border border-black/10 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-sm text-black/40">{(profile?.first_name?.[0] || '?').toUpperCase()}</span>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="relative">
              <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <button type="button" disabled={isUploading} className="px-3 py-1.5 bg-white border border-black/10 text-[10px] font-medium hover:bg-black/5 transition-colors flex items-center gap-2 pointer-events-none">
                <Upload className="w-3 h-3" /> Change Avatar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-black/40">First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white border border-black/10 p-2 text-xs focus:ring-1 focus:ring-black outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-black/40">Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white border border-black/10 p-2 text-xs focus:ring-1 focus:ring-black outline-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-black/40">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border border-black/10 p-2 text-xs focus:ring-1 focus:ring-black outline-none" />
          </div>
        </div>

        {/* Right Column: Security & Logins */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-black/80">Login Methods</h3>
            {isLoadingAuth ? (
              <div className="text-[10px] text-black/40">Loading...</div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2.5 bg-white border border-black/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Email & Password</span>
                  </div>
                  <span className="text-[10px] text-black/50">{hasPassword ? 'Enabled' : 'Not configured'}</span>
                </div>
                {isGoogleConnected && (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-black/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">Google</span>
                    </div>
                    <button onClick={handleDisconnectGoogle} className="px-2 py-1 border border-black/10 text-[10px] hover:bg-red-50 hover:text-red-600 transition-colors">Disconnect</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-black/80">Update Password</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1 flex flex-col gap-1.5">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full bg-white border border-black/10 p-2 text-xs focus:ring-1 focus:ring-black outline-none" />
              </div>
              <button onClick={handleUpdatePassword} disabled={!newPassword || newPassword.length < 6 || isSaving} className="px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-all disabled:opacity-50">
                {isSaving ? '...' : 'Update'}
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 pt-8 border-t border-red-100 flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-red-600">Danger Zone</h3>
        <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-lg">
          <div className="flex flex-col gap-1 max-w-[60%]">
            <span className="text-sm font-bold text-red-900">Delete Account</span>
            <span className="text-xs text-red-700/80 leading-relaxed font-sans">
              Permanently delete your account and all personal data. This action is irreversible.
              {profile?.subscription_status === 'active' && (
                <span className="block mt-1 font-bold">
                  If you have an active subscription, it will be canceled immediately. No refunds will be issued by default. Contact sales for more details.
                </span>
              )}
            </span>
          </div>
          <button 
            onClick={() => {
              setDeleteConfirmText('');
              setIsDeleteModalOpen(true);
            }}
            disabled={isSaving}
            className="px-4 py-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 shrink-0"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Disconnect Google Modal */}
      {isDisconnectModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-in fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDisconnectModalOpen(false)} />
          <div className="bg-[#fcfcfc] w-full max-w-md relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border border-black/5">
            <div className="p-8 flex flex-col items-center text-center">
              <button onClick={() => setIsDisconnectModalOpen(false)} className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10">
                <X className="w-4 h-4" />
              </button>
              
              <h2 className="text-xl font-medium tracking-tight mb-2">Set a password</h2>
              <p className="text-black/60 text-sm mb-6 px-4 leading-relaxed font-sans">
                You must set a password before disconnecting your Google account, otherwise you will lose access.
              </p>

              <div className="w-full flex flex-col gap-2 text-left mb-8">
                <label className="text-xs uppercase tracking-widest font-bold text-black/40">New Password</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-white border border-black/10 p-3 text-sm font-sans focus:ring-2 focus:ring-black/20 outline-none"
                />
              </div>

              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setIsDisconnectModalOpen(false)}
                  className="flex-1 p-3 border border-black/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSetPasswordAndDisconnect}
                  disabled={newPassword.length < 6 || isSaving}
                  className="flex-1 p-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-black/90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Processing...' : 'Save & Disconnect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-in fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="bg-[#fcfcfc] w-full max-w-md relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border border-red-500/20">
            <div className="p-8 flex flex-col items-center text-center">
              <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10">
                <X className="w-4 h-4" />
              </button>
              
              <h2 className="text-xl font-medium tracking-tight mb-2 text-red-600">Delete Account</h2>
              <p className="text-black/60 text-sm mb-6 px-4 leading-relaxed font-sans">
                This action is irreversible. Type <strong className="text-black">DELETE</strong> below to confirm.
              </p>

              <div className="w-full flex flex-col gap-2 text-left mb-8">
                <input 
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-white border border-black/10 p-3 text-sm font-sans focus:ring-2 focus:ring-red-500/20 outline-none"
                />
              </div>

              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 p-3 border border-black/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsSaving(true);
                    supabase.functions.invoke('delete-account').then(({ error }) => {
                      if (error) {
                        toast.error("Failed to delete account: " + error.message);
                        setIsSaving(false);
                      } else {
                        toast.success("Account deleted successfully.");
                        window.location.href = '/';
                      }
                    });
                  }}
                  disabled={deleteConfirmText !== 'DELETE' || isSaving}
                  className="flex-1 p-3 bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
