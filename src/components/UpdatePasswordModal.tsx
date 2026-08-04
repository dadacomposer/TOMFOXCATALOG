import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Lock, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpdatePasswordModal() {
  const { isUpdatePasswordModalOpen, setUpdatePasswordModalOpen } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isUpdatePasswordModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      
      toast.success('Password updated successfully');
      setUpdatePasswordModalOpen(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setUpdatePasswordModalOpen(false)} />
      
      <div className="relative z-10 w-full max-w-md bg-white border border-black/10 rounded-[32px] p-8 md:p-12 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button 
          onClick={() => setUpdatePasswordModalOpen(false)} 
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter leading-[0.9] text-black mb-2">
          Set Password
        </h1>
        <p className="font-sans text-black/50 text-xs uppercase tracking-widest mb-8">
          Enter a secure password for your account
        </p>

        {error && (
          <div className="mb-6 p-4 border border-red-500/20 bg-red-50 text-red-600 rounded-xl text-sm font-sans tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-black/40" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="NEW PASSWORD"
              required
              className="relative z-20 w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl py-4 pl-12 pr-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-black/40" />
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="CONFIRM PASSWORD"
              required
              className="relative z-20 w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl py-4 pl-12 pr-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-transform active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
