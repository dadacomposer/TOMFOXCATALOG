import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Lock, Eye, EyeOff, AlertTriangle, ArrowRight, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [newPassword, useState_newPassword] = useState('');
  const [confirmPassword, useState_confirmPassword] = useState('');
  const [showPassword, useState_showPassword] = useState(false);
  const [isLoading, useState_isLoading] = useState(false);
  const [error, useState_error] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      useState_error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      useState_error('Password must be at least 6 characters long');
      return;
    }

    useState_error('');
    useState_isLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast.success('Password updated successfully');
      useState_newPassword('');
      useState_confirmPassword('');
    } catch (err: any) {
      console.error(err);
      useState_error(err.message || 'An error occurred updating the password');
    } finally {
      useState_isLoading(false);
    }
  };

  const handleTriggerEmail = async () => {
    useState_isLoading(true);
    try {
      const { error: fnError } = await supabase.functions.invoke('weekly-engagement-email');
      if (fnError) throw fnError;
      toast.success('Engagement email triggered successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred triggering the email');
    } finally {
      useState_isLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Admin Settings</h2>
        <p className="text-sm text-black/50">Manage your account security and preferences.</p>
      </div>

      <div className="bg-white rounded-2xl border border-black/10 p-8 shadow-sm max-w-md">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5" /> Change Password
        </h3>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-3">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => useState_newPassword(e.target.value)}
                className="w-full bg-black/5 border border-black/10 rounded-xl py-4 pl-12 pr-12 text-black focus:outline-none focus:border-black/30 transition-colors font-mono"
                placeholder="Enter new password"
              />
              <button 
                type="button"
                onClick={() => useState_showPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-3">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => useState_confirmPassword(e.target.value)}
                className="w-full bg-black/5 border border-black/10 rounded-xl py-4 pl-12 pr-4 text-black focus:outline-none focus:border-black/30 transition-colors font-mono"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !newPassword || !confirmPassword}
            className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 mt-4"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-black/10 p-8 shadow-sm max-w-md mt-8">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Mail className="w-5 h-5" /> Weekly Engagement Email
        </h3>
        <p className="text-sm text-black/60 mb-6 font-sans leading-relaxed">
          Manually trigger the weekly engagement email. This will check for new tracks added in the last 7 days and email all users who have opted into notifications.
        </p>
        <button
          onClick={handleTriggerEmail}
          disabled={isLoading}
          className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? 'Processing...' : 'Run Email Script'}
        </button>
      </div>
    </div>
  );
}
