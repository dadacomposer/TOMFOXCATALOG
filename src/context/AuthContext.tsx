import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, fetchProfile, getUserWorkspaces } from '../lib/supabase';

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  subscription_status: string;
  subscription_tier: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  showOnboarding: boolean;
  playIntro: boolean;
  setPlayIntro: (val: boolean) => void;
  workspaces: any[];
  activeWorkspace: any | null;
  setActiveWorkspace: (ws: any) => void;
  isAccountPanelOpen: boolean;
  setAccountPanelOpen: (val: boolean) => void;
  isLoginModalOpen: boolean;
  setLoginModalOpen: (val: boolean) => void;
  isContactModalOpen: boolean;
  setContactModalOpen: (val: boolean) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setWorkspaces: (ws: any[]) => void;
  fetchWorkspaces: (userId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  showOnboarding: false,
  playIntro: false,
  setPlayIntro: () => {},
  workspaces: [],
  activeWorkspace: null,
  setActiveWorkspace: () => {},
  isAccountPanelOpen: false,
  setAccountPanelOpen: () => {},
  isLoginModalOpen: false,
  setLoginModalOpen: () => {},
  isContactModalOpen: false,
  setContactModalOpen: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  setWorkspaces: () => {},
  fetchWorkspaces: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [playIntro, setPlayIntro] = useState(() => {
    // If coming from OAuth or Magic Link, instantly show loader to prevent UI flash
    return typeof window !== 'undefined' && window.location.hash.includes('access_token=');
  });
  
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any | null>(null);
  const [isAccountPanelOpen, setAccountPanelOpen] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isContactModalOpen, setContactModalOpen] = useState(false);

  const fetchWorkspaces = async (userId: string) => {
    try {
      const ws = await getUserWorkspaces(userId);
      setWorkspaces(ws);
      if (ws && ws.length > 0 && !activeWorkspace) {
        setActiveWorkspace(ws[0]);
      }
    } catch (e) {
      console.error("Error loading workspaces", e);
    }
  };

  const loadProfile = async (userId: string) => {
    const data = await fetchProfile(userId);
    setProfile(data || null);
    
    // Also load workspaces
    await fetchWorkspaces(userId);
  };

  useEffect(() => {
    let mounted = true;


    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (event === 'INITIAL_SESSION') {
        // Validate session with the server to handle deleted users
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          await supabase.auth.signOut();
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }
      }

      if (mounted) {
        if (event === 'SIGNED_IN') {
          setPlayIntro(true);
        }
        setSession(session);
        setUser(session.user);
        await loadProfile(session.user.id);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const showOnboarding = !!user && (!profile || !profile.onboarding_completed);

  return (
    <AuthContext.Provider value={{ 
      user, session, profile, loading, showOnboarding, 
      playIntro, setPlayIntro, 
      workspaces, activeWorkspace, setActiveWorkspace,
      isAccountPanelOpen, setAccountPanelOpen,
      isLoginModalOpen,
      setLoginModalOpen,
      isContactModalOpen,
      setContactModalOpen,
      signOut,
      refreshProfile, setWorkspaces, fetchWorkspaces
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
