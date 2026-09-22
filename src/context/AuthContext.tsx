import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  notify_new_music: boolean;
  can_download?: boolean;
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
  isGeneralContactModalOpen: boolean;
  setGeneralContactModalOpen: (val: boolean) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setWorkspaces: (ws: any[]) => void;
  fetchWorkspaces: (userId: string) => Promise<void>;
  customMusicIntent: boolean;
  setCustomMusicIntent: (val: boolean) => void;
  isUpdatePasswordModalOpen: boolean;
  setUpdatePasswordModalOpen: (val: boolean) => void;
  studioProjects: any[];
  setStudioProjects: (projects: any[]) => void;
  fetchStudioProjects: () => Promise<void>;
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
  isGeneralContactModalOpen: false,
  setGeneralContactModalOpen: () => {},
  customMusicIntent: false,
  setCustomMusicIntent: () => {},
  isUpdatePasswordModalOpen: false,
  setUpdatePasswordModalOpen: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  setWorkspaces: () => {},
  fetchWorkspaces: async () => {},
  studioProjects: [],
  setStudioProjects: () => {},
  fetchStudioProjects: async () => {},
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
  const [isGeneralContactModalOpen, setGeneralContactModalOpen] = useState(false);
  const [customMusicIntent, setCustomMusicIntent] = useState(false);
  const [isUpdatePasswordModalOpen, setUpdatePasswordModalOpen] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash.includes('type=invite');
  });
  const [studioProjects, setStudioProjects] = useState<any[]>([]);
  const userId = user?.id;
  const userDataRequestRef = useRef(0);

  const applyWorkspaces = (ws: any[]) => {
    setWorkspaces(ws);
    if (ws && ws.length > 0) {
      setActiveWorkspace((prev: any) => {
        if (!prev) return ws[0];
        const updated = ws.find(w => w.id === prev.id);
        return updated || prev;
      });
    } else {
      setActiveWorkspace(null);
    }
  };

  const fetchWorkspaces = async (userId: string) => {
    try {
      const ws = await getUserWorkspaces(userId);
      applyWorkspaces(ws);
    } catch (e) {
      console.error("Error loading workspaces", e);
    }
  };

  const fetchProjects = async () => {
    try {
      const { getUserStudioProjects } = await import('../lib/supabase');
      const projects = await getUserStudioProjects();
      setStudioProjects(projects);
    } catch (e) {
      console.error("Error loading studio projects", e);
    }
  };

  const loadUserData = async (userId: string) => {
    const [profileResult, workspacesResult, projectsResult] = await Promise.allSettled([
      fetchProfile(userId),
      getUserWorkspaces(userId),
      import('../lib/supabase').then(({ getUserStudioProjects }) => getUserStudioProjects()),
    ]);

    if (profileResult.status === 'rejected') {
      console.error("Error loading profile", profileResult.reason);
    }
    if (workspacesResult.status === 'rejected') {
      console.error("Error loading workspaces", workspacesResult.reason);
    }
    if (projectsResult.status === 'rejected') {
      console.error("Error loading studio projects", projectsResult.reason);
    }

    return {
      profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
      workspaces: workspacesResult.status === 'fulfilled' ? workspacesResult.value : [],
      studioProjects: projectsResult.status === 'fulfilled' ? projectsResult.value : [],
    };
  };

  const applyUserData = (data: Awaited<ReturnType<typeof loadUserData>>) => {
    setProfile(data.profile || null);
    applyWorkspaces(data.workspaces);
    setStudioProjects(data.studioProjects);
  };

  useEffect(() => {
    let mounted = true;
    let authEventVersion = 0;

    const applySessionState = (nextSession: Session | null, event?: string) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setUpdatePasswordModalOpen(true);
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === 'SIGNED_OUT' || !nextSession?.user) {
        setProfile(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
        setStudioProjects([]);
        setLoading(false);
      }
    };

    // Keep this callback synchronous. Calling Supabase APIs from inside
    // onAuthStateChange can deadlock the client while a session is refreshing.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventVersion += 1;
      applySessionState(nextSession, event);
    });

    // Do not rely solely on the subscription's INITIAL_SESSION event. Reading
    // the session here is outside the auth callback, so it cannot deadlock and
    // it also makes a first render deterministic if the event is delayed.
    const initialVersion = authEventVersion;
    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted && authEventVersion === initialVersion) {
        applySessionState(initialSession);
      }
    }).catch(error => {
      console.error('Error restoring auth session', error);
      if (mounted && authEventVersion === initialVersion) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++userDataRequestRef.current;

    if (!userId) {
      setLoading(false);
      return;
    }

    const hydrateUser = async () => {
      setLoading(true);
      try {
        const data = await loadUserData(userId);
        if (!cancelled && userDataRequestRef.current === requestId) {
          applyUserData(data);
        }
      } finally {
        if (!cancelled && userDataRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    void hydrateUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      const requestId = ++userDataRequestRef.current;
      const data = await loadUserData(user.id);
      if (userDataRequestRef.current === requestId) applyUserData(data);
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
      isGeneralContactModalOpen,
      setGeneralContactModalOpen,
      isUpdatePasswordModalOpen,
      setUpdatePasswordModalOpen,
      signOut,
      refreshProfile, setWorkspaces, fetchWorkspaces,
      customMusicIntent, setCustomMusicIntent,
      studioProjects, setStudioProjects, fetchStudioProjects: fetchProjects
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
