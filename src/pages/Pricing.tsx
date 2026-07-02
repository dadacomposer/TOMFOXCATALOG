import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, X, Mail, ChevronDown, Play, Pause, Lock, Loader2, ShieldCheck, Video, Heart, Music, Camera, MoreHorizontal, Building, Building2, Landmark, Film } from 'lucide-react';
import { fetchPlaylists, fetchPlaylistTracks, supabase, signInWithGoogle } from '../lib/supabase';
import PlaylistArtwork from '../components/PlaylistArtwork';
import { usePlayer } from '../context/PlayerContext';
import { siGoogle } from 'simple-icons';
import { useAuth } from '../context/AuthContext';

type RoleId = 'youtube' | 'wedding' | 'freelance' | 'supervisor' | 'other' | 'small_biz' | 'medium_biz' | 'enterprise_biz' | 'extended_biz';

export default function Pricing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'individual' | 'business'>('individual');
  const [isYearly, setIsYearly] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isInterceptModalOpen, setIsInterceptModalOpen] = useState(false);
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  const { user, profile, setPlayIntro, setContactModalOpen } = useAuth();

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
      alert(e.message || "An error occurred accessing billing portal.");
    } finally {
      setIsManagingBilling(false);
    }
  };

  // Auth View State
  const [isAuthView, setIsAuthView] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [realPlaylists, setRealPlaylists] = useState<any[]>([]);

  // Playlist Audio Player State
  const { isPlaying, togglePlay, playPlaylist, currentTrack } = usePlayer();
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(null);

  // If playback stops or changes globally, we might want to sync our local 'playingPlaylistId'.
  useEffect(() => {
    if (!currentTrack) setPlayingPlaylistId(null);
  }, [currentTrack]);

  const handlePlaylistPlay = async (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    if (playingPlaylistId === playlistId) {
      togglePlay();
    } else {
      setPlayingPlaylistId(playlistId);
      const tracks = await fetchPlaylistTracks(playlistId) as any;
      if (tracks && tracks.length > 0) {
        playPlaylist(tracks);
      }
    }
  };

  useEffect(() => {
    fetchPlaylists().then(data => {
      const excludeTitles = ['New Music', 'Lo-Fi', 'Exploring Space'];
      const filtered = data.filter(p => !excludeTitles.includes(p.title)).slice(0, 3);
      setRealPlaylists(filtered);
    });
  }, []);

  // Prevent background scrolling when slide-over is open and reset states
  useEffect(() => {
    if (selectedRole) {
      document.body.style.overflow = 'hidden';
      setSelectedTierIndex(0);
      setIsAuthView(false);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [selectedRole]);

  const individualRoles = [
    { id: 'youtube' as const, title: 'YouTube Creator / Podcaster', icon: Video },
    { id: 'wedding' as const, title: 'Wedding Filmmaker', icon: Heart },
    { id: 'supervisor' as const, title: 'Music Supervisor', icon: Music },
    { id: 'freelance' as const, title: 'Freelance Filmmaker', icon: Camera },
    { id: 'other' as const, title: 'Other Use Cases', icon: MoreHorizontal },
  ];

  const businessRoles = [
    { id: 'small_biz' as const, title: 'Small Client (0-100 employees)', icon: Building },
    { id: 'medium_biz' as const, title: 'Medium Client (101-250 employees)', icon: Building2 },
    { id: 'enterprise_biz' as const, title: 'Enterprise Client (250+ employees)', icon: Landmark },
    { id: 'extended_biz' as const, title: 'Extended Options (TV, Cinema)', icon: Film },
  ];

  const renderTabButton = (id: 'individual' | 'business', label: string) => (
    <button
      onClick={() => { setActiveTab(id); setSelectedRole(null); }}
      className={`px-6 md:px-8 py-3 md:py-4 font-sans text-[10px] md:text-xs uppercase tracking-widest font-bold transition-all rounded-full ${
        activeTab === id 
          ? 'bg-black text-white' 
          : 'bg-transparent text-black/50 hover:text-black border border-transparent hover:border-black/10'
      }`}
    >
      {label}
    </button>
  );

  const getRoleDetails = (roleId: RoleId) => {
    switch (roleId) {
      case 'youtube':
        return {
          title: 'YouTube Creator / Podcaster',
          tiers: [
            { id: 'individual_youtube_personal', name: 'Personal Coverage Only', desc: 'Covers your personal channels. Celebrity accounts excluded.', monthly: '$29.99', yearly: '$329.89' },
            { id: 'individual_youtube_client', name: 'Add Coverage for Client Work', desc: 'Covers your personal channels plus all client projects.', monthly: '$99.99', yearly: '$1099.89' }
          ]
        };
      case 'wedding':
        return {
          title: 'Wedding Filmmaker',
          tiers: [
            { id: 'individual_wedding_only', name: 'Wedding Clients Only', desc: 'Unlimited tracks for all your wedding clients.', monthly: '$79.99', yearly: '$879.89' },
            { id: 'individual_wedding_commercial', name: 'Wedding & Commercial Clients', desc: 'Unlimited tracks for wedding and commercial projects.', monthly: '$99.99', yearly: '$1099.89' }
          ]
        };
      case 'freelance':
        return {
          title: 'Freelance Filmmaker',
          tiers: [
            { id: 'individual_freelance_all', name: 'All-Access', desc: 'Unlimited tracks for all your freelance projects.', monthly: '$99.99', yearly: '$1099.89' }
          ]
        };
      case 'supervisor':
        return {
          title: 'Music Supervisor',
          desc: 'Standard License: Covers Web, Social, Podcast, Internal, and Industrial.',
          tiers: [
            { id: 'individual_supervisor_small', name: 'Small Client (0-100 employees)', desc: '', monthly: '$99.99', yearly: '$1099.89' },
            { id: 'individual_supervisor_medium', name: 'Medium Client (101-250 employees)', desc: '', monthly: '$199.99', yearly: '$2199.89' },
            { id: 'custom', name: 'Enterprise Client (250+)', desc: 'Contact Sales for a custom setup.', monthly: 'Custom', yearly: 'Custom' }
          ]
        };
      case 'other':
        return {
          title: 'Other Use Cases',
          desc: "Don't fit into these categories? Contact Sales and we'll build a setup that works for you.",
          tiers: [
            { id: 'custom', name: 'Custom Setup', desc: 'Dedicated support and tailored clearance.', monthly: 'Custom', yearly: 'Custom' }
          ]
        };
      case 'small_biz':
        return {
          title: 'Small Client (0-100)',
          desc: 'Standard License: Covers Web, Social, Podcast, Internal, and Industrial.',
          tiers: [
            { id: 'business_small', name: 'Standard Business License', desc: '', monthly: '$99.99', yearly: '$1099.89' }
          ]
        };
      case 'medium_biz':
        return {
          title: 'Medium Client (101-250)',
          desc: 'Standard License: Covers Web, Social, Podcast, Internal, and Industrial.',
          tiers: [
            { id: 'business_medium', name: 'Standard Business License', desc: '', monthly: '$199.99', yearly: '$2199.89' }
          ]
        };
      case 'enterprise_biz':
        return {
          title: 'Enterprise Client (250+)',
          desc: 'Standard License: Covers Web, Social, Podcast, Internal, and Industrial.',
          tiers: [
            { id: 'custom', name: 'Enterprise Setup', desc: 'Get dedicated support and custom terms.', monthly: 'Custom', yearly: 'Custom' }
          ]
        };
      case 'extended_biz':
        return {
          title: 'Extended Options',
          desc: 'Need coverage for TV, Cinema, Broadcast, VOD, OTT, CTV, Film Festivals, or Radio?',
          tiers: [
            { id: 'custom', name: 'Extended Clearances', desc: 'Contact Sales for a custom quote.', monthly: 'Custom', yearly: 'Custom' }
          ]
        };
      default:
        return null;
    }
  };

  const selectedData = selectedRole ? getRoleDetails(selectedRole) : null;
  const activeTier = selectedData?.tiers[selectedTierIndex];

  const doCheckout = async (planId: string) => {
    if (profile?.subscription_status === 'active') {
      setIsInterceptModalOpen(true);
      return;
    }

    try {
      setIsCheckingOut(true);
      console.log("Starting checkout for planId:", planId);
      
      const payload = { 
        planId,
        success_url: `${window.location.origin}/checkout-success`,
        cancel_url: `${window.location.origin}/checkout-cancel`
      };
      console.log("Sending payload to edge function:", payload);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: payload,
      });

      console.log("Received response from edge function:", { data, error });

      if (error) {
        console.error("Function invoke error object:", error);
        
        // Try to get the actual error message from the response body if it's a FunctionsHttpError
        let actualErrorMessage = error.message;
        if ((error as any).context && typeof (error as any).context.text === 'function') {
          try {
             actualErrorMessage = await (error as any).context.text();
          } catch (e) {
             console.error("Could not read error context body", e);
          }
        }
        
        throw new Error(actualErrorMessage || JSON.stringify(error) || "Failed to create checkout session");
      }

      if (data?.url) {
        console.log("Redirecting to:", data.url);
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned in data: " + JSON.stringify(data));
      }
    } catch (e: any) {
      console.error("Subscription error details:", e);
      alert(`Checkout Error: ${e.message || JSON.stringify(e)}`);
      setIsCheckingOut(false);
    }
  };

  const handleSubscribe = async (tierId: string) => {
    if (tierId === 'custom') {
      window.location.href = 'mailto:sales@tomfox.com';
      return;
    }

    const session = await supabase.auth.getSession();
    const planId = `${tierId}_${isYearly ? 'yearly' : 'monthly'}`;

    if (!session.data.session) {
      // Show login view in the slide-over
      setIsAuthView(true);
      localStorage.setItem('pendingCheckoutPlanId', planId);
      return;
    }

    await doCheckout(planId);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      if (isSignUp) {
        setPlayIntro(true);
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setPlayIntro(false);
          throw error;
        }
        
        // Wait a bit for auth to propagate, then trigger checkout
        setTimeout(() => {
          const planId = localStorage.getItem('pendingCheckoutPlanId');
          if (planId) doCheckout(planId);
        }, 1000);
      } else {
        setPlayIntro(true);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setPlayIntro(false);
          throw error;
        }
        
        const planId = localStorage.getItem('pendingCheckoutPlanId');
        if (planId) doCheckout(planId);
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
      setAuthLoading(false);
    }
  };

  const handleOAuth = async () => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/checkout-resume`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || `Failed to authenticate with Google.`);
    }
  };

  return (
    <div className="relative flex flex-col w-full min-h-screen pt-[120px] pb-32 bg-[#fafafa] text-black overflow-hidden">
      {/* HUGE DRIBBBLE LOGO WATERMARK */}
      <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" className="absolute top-0 -right-20 w-[120%] md:w-[60%] opacity-[0.02] rotate-12 pointer-events-none select-none mix-blend-multiply z-0" alt="" />
      
      {/* Hero Section */}
      <div className="relative z-10 w-full px-6 md:px-24 lg:px-32 flex flex-col items-center text-center mb-16 md:mb-24">
        <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[1.05] text-black max-w-5xl mb-8">
          Pick your plan,<br /><span className="text-black/30">Get unlimited access.</span>
        </h1>
      </div>

      {/* Tabs */}
      <div className="w-full px-6 md:px-24 lg:px-32 mb-12 md:mb-16 flex flex-col sm:flex-row justify-center items-center gap-4">
        <div className="flex border border-black/10 rounded-full overflow-hidden p-1 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
          {renderTabButton('individual', 'Individual')}
          {renderTabButton('business', 'Business')}
        </div>
        <button 
          onClick={() => navigate('/enterprise')}
          className="px-6 md:px-8 py-3 md:py-4 bg-black text-white rounded-full font-sans text-[10px] md:text-xs uppercase tracking-widest font-bold hover:bg-black/80 transition-colors"
        >
          Enterprise
        </button>
      </div>

      {/* Content Area - Selection Grids */}
      <div className="w-full px-6 md:px-12 lg:px-16 flex flex-col items-center">
        <div className="w-full max-w-6xl animate-fade-in-up">
          
          {/* INDIVIDUAL PLANS */}
          {activeTab === 'individual' && (
            <div className="flex flex-col items-center w-full">
              <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8 lg:gap-12 w-full">
                
                {/* Left Side: Role Grid */}
                <div className="flex flex-col w-full lg:w-[40%]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full flex-grow">
                    {individualRoles.filter(r => r.id !== 'other').map(role => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className="group bg-white border border-black/10 p-8 rounded-[24px] flex flex-col items-center justify-center text-center hover:border-black/40 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] transition-all min-h-[180px]"
                      >
                        {role.icon && <role.icon className="w-8 h-8 mb-4 text-black/40 group-hover:text-black transition-colors" />}
                        <h3 className="text-[11px] md:text-xs font-bold uppercase tracking-widest group-hover:text-black text-black/60 leading-relaxed">{role.title}</h3>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Side: Perks Panel */}
                <div className="w-full lg:w-[60%] bg-white border border-black/10 rounded-[32px] p-8 md:p-12 h-fit">
                  <p className="font-sans text-[14px] md:text-[15px] text-black/60 leading-relaxed mb-8 border-b border-black/10 pb-8 uppercase tracking-wide">
                    Perfect for freelance filmmakers, wedding videographers, creators, and podcasters. All individual subscriptions include:
                  </p>
                  <ul className="flex flex-col gap-6">
                    {[
                      "Web & Digital Platforms",
                      "Podcast Usage",
                      "Social Accounts up to 1M followers",
                      "Full Monetization Rights"
                    ].map((perk, i) => (
                      <li key={i} className="flex items-center gap-4 text-[15px] md:text-[16px] font-bold">
                        <div className="w-6 h-6 rounded-full bg-[#047857]/10 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-[#047857]" />
                        </div>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              <div className="mt-10 md:mt-12 text-center w-full">
                <button 
                  onClick={() => setContactModalOpen(true)} 
                  className="text-[12px] md:text-[13px] text-black/50 hover:text-black transition-colors underline underline-offset-4 decoration-black/20 hover:decoration-black uppercase tracking-widest font-bold"
                >
                  Don't fit into these categories? Contact Sales for Other Use Cases.
                </button>
              </div>
            </div>
          )}

          {/* BUSINESS PLANS */}
          {activeTab === 'business' && (
            <div className="flex flex-col items-center w-full">
              <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8 lg:gap-12 w-full">
                
                {/* Left Side: Role Grid */}
                <div className="flex flex-col w-full lg:w-[40%]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full flex-grow">
                    {businessRoles.filter(r => r.id !== 'extended_biz').map(role => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`group bg-white border border-black/10 p-8 rounded-[24px] flex flex-col items-center justify-center text-center hover:border-black/40 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] transition-all min-h-[180px] ${role.id === 'enterprise_biz' ? 'sm:col-span-2' : ''}`}
                      >
                        {role.icon && <role.icon className="w-8 h-8 mb-4 text-black/40 group-hover:text-black transition-colors" />}
                        <h3 className="text-[11px] md:text-xs font-bold uppercase tracking-widest group-hover:text-black text-black/60 leading-relaxed">{role.title}</h3>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Side: Perks Panel */}
                <div className="w-full lg:w-[60%] bg-white border border-black/10 rounded-[32px] p-8 md:p-12 h-fit">
                    <p className="font-sans text-[14px] md:text-[15px] text-black/60 leading-relaxed mb-8 border-b border-black/10 pb-8 uppercase tracking-wide">
                      Perfect for production companies, agencies, brands, and non-profits. All business subscriptions include:
                    </p>
                    <ul className="flex flex-col gap-6">
                      {[
                        "Web & Digital Platforms",
                        "Podcast Usage",
                        "Social Accounts up to 1M followers",
                        "Client and Brand work",
                        "Full Monetization Rights"
                      ].map((perk, i) => (
                        <li key={i} className="flex items-center gap-4 text-[15px] md:text-[16px] font-bold">
                          <div className="w-6 h-6 rounded-full bg-[#047857]/10 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-[#047857]" />
                          </div>
                          {perk}
                        </li>
                      ))}
                    </ul>
                </div>

              </div>

              <div className="mt-10 md:mt-12 text-center w-full">
                <button 
                  onClick={() => setSelectedRole('extended_biz')} 
                  className="text-[14px] md:text-[15px] text-black/50 hover:text-black transition-colors underline underline-offset-4 decoration-black/20 hover:decoration-black"
                >
                  Need Extended Options? (TV, Cinema, Radio)
                </button>
              </div>
            </div>
          )}

          {/* ENTERPRISE */}
          {activeTab === 'enterprise' && (
            <div className="flex flex-col items-center justify-center text-center py-6 md:py-12">
              <div className="bg-[#111] text-white border border-white/5 p-8 md:p-20 rounded-[32px] max-w-4xl flex flex-col items-center shadow-2xl shadow-black/20">
                <h3 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-tight mb-6 md:mb-8">Custom Enterprise Terms</h3>
                <p className="font-sans text-[14px] md:text-[16px] text-white/60 max-w-2xl leading-relaxed mb-10 md:mb-12 uppercase tracking-wide">
                  Need blanket clearances for massive global broadcasts, major networks, or custom enterprise terms? Get dedicated support, totally frictionless clearance, and absolute peace of mind.
                </p>
                <button className="bg-white text-black font-bold uppercase text-xs tracking-widest py-4 md:py-5 px-10 md:px-12 rounded-full hover:bg-white/90 transition-transform hover:scale-105 active:scale-95 flex items-center gap-3">
                  <Mail className="w-5 h-5" /> Contact Sales
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Validation Section (Dark Mode) */}
      <div className="w-full mt-24 md:mt-32 px-6 md:px-24 lg:px-32 py-24 md:py-32 flex flex-col items-center bg-[#111] text-white full-bleed">
        <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-12 text-center">What's included</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 w-full max-w-6xl">
          <div className="flex flex-col items-center text-center bg-[#1a1a1a] border border-white/5 rounded-[24px] p-8 hover:border-white/20 transition-all">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold uppercase tracking-tight text-[18px] mb-3">Unlimited Access</h3>
            <p className="font-sans text-white/70 text-[13px] leading-relaxed uppercase tracking-wide">Full access to our entire premium catalog of world-class, curated music.</p>
          </div>
          <div className="flex flex-col items-center text-center bg-[#1a1a1a] border border-white/5 rounded-[24px] p-8 hover:border-white/20 transition-all">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold uppercase tracking-tight text-[18px] mb-3">Monetization Ready</h3>
            <p className="font-sans text-white/70 text-[13px] leading-relaxed uppercase tracking-wide">Keep what you earn. Full monetization rights across YouTube, social, and web.</p>
          </div>
          <div className="flex flex-col items-center text-center bg-[#1a1a1a] border border-white/5 rounded-[24px] p-8 hover:border-white/20 transition-all">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold uppercase tracking-tight text-[18px] mb-3">Frictionless Clearance</h3>
            <p className="font-sans text-white/70 text-[13px] leading-relaxed uppercase tracking-wide">Simple, whitelist-driven copyright clearance. No strikes, no stress.</p>
          </div>
          <div className="flex flex-col items-center text-center bg-[#1a1a1a] border border-white/5 rounded-[24px] p-8 hover:border-white/20 transition-all">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold uppercase tracking-tight text-[18px] mb-3">Direct Licensing</h3>
            <p className="font-sans text-white/70 text-[13px] leading-relaxed uppercase tracking-wide">You're licensing directly from the source. Zero hidden fees or third-party headaches.</p>
          </div>
        </div>
      </div>

      {/* Discovery Section */}
      <div className="w-full py-24 md:py-32 px-6 md:px-24 lg:px-32 flex flex-col lg:flex-row items-stretch gap-16 lg:gap-24 max-w-[1600px] mx-auto">
        <div className="w-full lg:w-1/3 flex flex-col justify-between h-full items-start pt-4 pb-2">
          <div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter leading-[1.05] mb-8">
            Curated for<br/>your story.
          </h2>
          <p className="font-sans text-black/50 uppercase tracking-widest text-sm mb-12 max-w-xl">
          Don't settle for boring stock music. Find the exact vibe you need from our hand-picked collections.
        </p>
          </div>
          <button 
            onClick={() => navigate('/browse')}
            className="px-10 py-5 bg-black text-white font-bold uppercase text-xs tracking-widest hover:bg-black/80 transition-colors rounded-full"
          >
            Explore the Collection
          </button>
        </div>
        <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
          {realPlaylists.map((playlist) => (
            <div 
              key={playlist.id} 
              className="flex flex-col bg-transparent group cursor-pointer w-full transition-all duration-300 relative"
              onClick={(e) => handlePlaylistPlay(e, playlist.id)}
            >
              <div className="relative w-full aspect-[1.15] mb-6">
                 <PlaylistArtwork playlist={playlist} className="absolute top-0 right-0 w-[78%] aspect-square shadow-md hover:scale-[1.02] transition-transform cursor-pointer z-0" />
                 <PlaylistArtwork playlist={playlist} className="absolute top-[3%] right-[11%] w-[78%] aspect-square shadow-md hover:scale-[1.02] transition-transform cursor-pointer z-10" />
                 
                 <div className="absolute top-[6%] left-0 w-[78%] aspect-square shadow-xl hover:scale-[1.02] transition-transform cursor-pointer z-20 group/artwork relative">
                   <PlaylistArtwork playlist={playlist} className="w-full h-full" />
                   
                   {/* Play Button Overlay */}
                   <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none opacity-0 group-hover/artwork:opacity-100">
                      <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-white transition-transform scale-100 group-hover/artwork:scale-105 shadow-xl">
                        {playingPlaylistId === playlist.id && isPlaying ? (
                           <Pause className="w-4 h-4 fill-current" />
                        ) : (
                           <Play className="w-4 h-4 fill-current" style={{ transform: 'translateX(4.166%)' }} />
                        )}
                      </div>
                   </div>
                 </div>
              </div>
              <div className="flex flex-col pb-2">
                <span className="font-bold text-[18px] text-black">{playlist.title}</span>
                <span className="font-sans text-[13px] text-black/50 mt-0.5">{playlist.track_count} tracks</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Beyond the Library (Centered) */}
      <div className="w-full pt-20 pb-24 md:pt-24 md:pb-32 px-6 bg-[#111] text-white flex flex-col items-center text-center full-bleed">
        <h2 className="text-5xl md:text-6xl lg:text-8xl font-bold uppercase tracking-tighter mb-6 leading-[0.9]">
          Beyond the Library
        </h2>
        <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/50 mb-8 border-b-2 border-white/10 pb-4">
          Custom Music and Sound
        </div>
        <p className="font-sans text-sm md:text-base uppercase leading-relaxed tracking-wide text-white/50 max-w-2xl mb-12">
          Some projects demand a completely original sound. We craft bespoke scores and custom sound design for high-stakes campaigns.
        </p>
        <button 
          onClick={() => setContactModalOpen(true)}
          className="px-10 py-5 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-white/90 transition-colors rounded-full"
        >
          Get in Touch
        </button>
      </div>

      {/* Slide-over Panel Overlay */}
      {selectedRole && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300"
          onClick={() => setSelectedRole(null)}
        />
      )}

      {/* Slide-over Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[480px] bg-white z-[70] shadow-[-20px_0_60px_rgba(0,0,0,0.1)] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${selectedRole ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedData && (
          <>
            <div className="flex justify-between items-center p-6 md:p-8 border-b border-black/5 shrink-0">
              <h2 className="text-[20px] font-bold uppercase tracking-tight">
                {isAuthView ? 'Start Creating Today' : selectedData.title}
              </h2>
              <button 
                onClick={() => {
                  if (isAuthView) setIsAuthView(false);
                  else setSelectedRole(null);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#fafafa] hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
              
              {!isAuthView ? (
                // NORMAL PRICING VIEW
                <div className="flex flex-col gap-8">
                  {/* Tier Toggle (if there are multiple tiers) */}
                  {selectedData.tiers.length > 1 && (
                    <div className="flex flex-col gap-3">
                      {selectedData.tiers.map((tier, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setSelectedTierIndex(idx)}
                          className={`text-left p-4 rounded-xl border transition-all ${
                             selectedTierIndex === idx 
                               ? 'border-black/20 bg-black/5 text-black' 
                               : 'border-transparent hover:bg-black/5 text-black/70'
                          }`}
                        >
                          <div className={`font-sans text-[10px] uppercase tracking-widest font-bold mb-1 ${selectedTierIndex === idx ? 'text-black/60' : 'text-black/40'}`}>
                            Option {idx + 1}
                          </div>
                          <div className={`font-bold text-[14px] uppercase tracking-tight ${selectedTierIndex === idx ? 'text-black' : ''}`}>
                            {tier.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* The Active Tier Pricing Card */}
                  {activeTier && (() => {
                    const isCustom = activeTier.monthly === 'Custom';
                    
                    return (
                      <div className="p-6 md:p-8 rounded-[24px] bg-[#fafafa] border border-black/10 flex flex-col">
                        
                        {/* Custom Billing Dropdown */}
                        {!isCustom && (
                          <div className="relative w-full mb-8">
                            {isDropdownOpen && (
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setIsDropdownOpen(false)} 
                              />
                            )}
                            <button 
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className={`relative z-20 w-full flex items-center justify-between bg-white border rounded-xl px-4 py-3 transition-colors cursor-pointer ${isDropdownOpen ? 'border-black/30' : 'border-black/10 hover:border-black/20'}`}
                            >
                              <span className="text-[11px] font-bold">
                                {isYearly ? 'Yearly Billing (Save ~10%)' : 'Monthly Billing'}
                              </span>
                              <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-black/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden z-20 flex flex-col animate-fade-in-up">
                                <button 
                                  onClick={() => { setIsYearly(false); setIsDropdownOpen(false); }}
                                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#fafafa] transition-colors border-b border-black/5"
                                >
                                  <span className="text-[11px] font-bold">Monthly Billing</span>
                                  {!isYearly && <Check className="w-4 h-4 text-black" />}
                                </button>
                                <button 
                                  onClick={() => { setIsYearly(true); setIsDropdownOpen(false); }}
                                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#fafafa] transition-colors"
                                >
                                  <span className="text-[11px] font-bold flex items-center gap-2">
                                    Yearly Billing <span className="text-[#047857]">Save ~10%</span>
                                  </span>
                                  {isYearly && <Check className="w-4 h-4 text-black" />}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Price Display */}
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-[40px] md:text-[48px] font-bold leading-none tracking-tighter">
                            {isCustom ? 'Custom' : (isYearly ? activeTier.yearly : activeTier.monthly)}
                          </span>
                          {!isCustom && (
                            <span className="text-[15px] text-black/40 font-bold">
                              {isYearly ? '/yr' : '/mo'}
                            </span>
                          )}
                        </div>
                        
                        {/* Description */}
                        <p className="font-sans text-[13px] text-black/60 leading-relaxed mb-8 uppercase tracking-wide">
                          {activeTier.desc || selectedData.desc}
                        </p>

                        <button 
                          disabled={isCheckingOut}
                          onClick={() => handleSubscribe(activeTier.id)}
                          className="mt-auto w-full bg-black text-white font-sans text-xs uppercase tracking-widest font-bold px-4 py-3 rounded-lg hover:bg-black/90 transition-colors disabled:opacity-50"
                        >
                          {isCheckingOut ? 'Loading...' : (isCustom ? 'Contact Sales' : 'Add to Cart')}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                // AUTH VIEW (LOGIN / SIGNUP) BEFORE CHECKOUT
                <div className="flex flex-col flex-1 animate-fade-in-up">
                  {/* Plan Summary */}
                  <div className="bg-[#fafafa] border border-black/10 rounded-2xl p-6 mb-8 flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-2">Selected Plan</span>
                    <h3 className="font-bold text-[18px] uppercase tracking-tight mb-2">{activeTier?.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] font-bold leading-none tracking-tighter">
                        {isYearly ? activeTier?.yearly : activeTier?.monthly}
                      </span>
                      <span className="text-[11px] text-black/40 font-bold">
                        {isYearly ? '/yr' : '/mo'}
                      </span>
                    </div>
                  </div>

                  {/* Auth Form */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold uppercase tracking-tight mb-2">
                      {isSignUp ? 'Create an account' : 'Welcome back'}
                    </h3>
                    <p className="font-sans text-[12px] uppercase tracking-widest text-black/50 mb-8">
                      {isSignUp ? 'Create an account to complete your purchase.' : 'Log in to complete your purchase.'}
                    </p>

                    {authError && (
                      <div className="mb-6 p-4 border border-red-500/20 bg-red-50 text-red-600 rounded-xl text-[12px] font-sans tracking-wide">
                        {authError}
                      </div>
                    )}

                    {authMessage && (
                      <div className="mb-6 p-4 border border-green-500/20 bg-green-50 text-green-600 rounded-xl text-[12px] font-sans tracking-wide flex items-center justify-between">
                        {authMessage}
                        <Loader2 className="w-4 h-4 animate-spin shrink-0 ml-4" />
                      </div>
                    )}

                    <button
                      onClick={handleOAuth}
                      className="flex items-center justify-center gap-3 w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-transform mb-6"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d={siGoogle.path} />
                      </svg>
                      Continue with Google
                    </button>

                    <div className="flex items-center gap-4 mb-6">
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
                          className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl py-4 pl-12 pr-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all"
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
                          className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-xl py-4 pl-12 pr-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading || isCheckingOut}
                        className="flex items-center justify-center gap-2 w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-transform disabled:opacity-50 mt-2"
                      >
                        {authLoading || isCheckingOut ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <span>{isSignUp ? 'Sign Up & Pay' : 'Log In & Pay'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-8 text-center">
                      <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="font-sans text-black/50 text-xs uppercase tracking-widest hover:text-black transition-colors underline underline-offset-4 decoration-black/20 hover:decoration-black"
                      >
                        {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </>
        )}
      </div>

      {/* Subscription Intercept Modal */}
      {isInterceptModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsInterceptModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 md:p-10 w-full max-w-md animate-in zoom-in-95 fade-in">
            <button 
              onClick={() => setIsInterceptModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">Active Subscription</h2>
              <p className="text-sm font-sans text-black/60 mb-8 leading-relaxed">
                You already have an active subscription! To upgrade, downgrade, or change your billing cycle, please go to your Account settings. We will automatically calculate the prorated difference for you.
              </p>
              
              <button
                onClick={() => {
                  setIsInterceptModalOpen(false);
                  navigate('/account');
                }}
                className="w-full bg-black text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-all flex items-center justify-center"
              >
                Go to Account
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
