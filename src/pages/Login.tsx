import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { siGoogle } from 'simple-icons';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { isLoginModalOpen, setLoginModalOpen, setPlayIntro } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const navigate = useNavigate();



  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If signIn fails, attempt to sign up
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) {
          // If sign up fails because user exists, it means wrong password was entered during sign in
          if (signUpError.message.toLowerCase().includes('already registered')) {
            throw new Error('Invalid password for existing account. Please try again.');
          }
          throw signUpError;
        } else {
          setMessage('Account created successfully! Please check your email for confirmation.');
        }
      } else {
        // Sign in successful
        setPlayIntro(true);
        setLoginModalOpen(false);
        navigate('/browse');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    try {
      setError(null);
      if (provider === 'google') await signInWithGoogle();
      setLoginModalOpen(false);
    } catch (err: any) {
      setError(err.message || `Failed to authenticate with ${provider}.`);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${isLoginModalOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isLoginModalOpen ? 'bg-black/40 backdrop-blur-sm opacity-100 pointer-events-auto' : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'}`} onClick={() => setLoginModalOpen(false)} />
      
      <div className={`relative z-10 w-full max-w-md bg-white border border-black/10 rounded-[32px] p-8 md:p-12 shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isLoginModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Close Button */}
        <button 
          onClick={() => setLoginModalOpen(false)} 
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter leading-[0.9] text-black mb-2">
          Welcome.
        </h1>
        <p className="font-sans text-black/50 text-xs uppercase tracking-widest mb-8">
          Sign up to get started
        </p>

        {error && (
          <div className="mb-6 p-4 border border-red-500/20 bg-red-50 text-red-600 rounded-xl text-sm font-sans tracking-wide">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 border border-green-500/20 bg-green-50 text-green-600 rounded-xl text-sm font-sans tracking-wide">
            {message}
          </div>
        )}

        <div className="flex flex-col gap-4 mb-8">
          <button
            onClick={() => handleOAuth('google')}
            className="flex items-center justify-center gap-3 w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d={siGoogle.path} />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-[1px] flex-1 bg-black/10"></div>
          <span className="font-sans text-black/40 text-[10px] uppercase tracking-widest">Or email</span>
          <div className="h-[1px] flex-1 bg-black/10"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="w-5 h-5 text-black/40" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="EMAIL ADDRESS"
              required
              className={`relative z-20 w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl py-4 pl-12 pr-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all ${isLoginModalOpen ? 'pointer-events-auto select-auto' : 'pointer-events-none select-none'}`}
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-black/40" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              required
              className={`relative z-20 w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl py-4 pl-12 pr-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all ${isLoginModalOpen ? 'pointer-events-auto select-auto' : 'pointer-events-none select-none'}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-between w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="font-sans text-black/50 text-[10px] uppercase tracking-widest">
            If you don't have an account, one will be automatically created for you.
          </p>
        </div>
      </div>
    </div>
  );
}
