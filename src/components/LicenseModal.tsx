import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Mail, ChevronDown, Video, Heart, Music, Camera, MoreHorizontal, Building, Building2, Landmark, Film, Loader2 } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { siGoogle } from 'simple-icons';

type RoleId = 'youtube' | 'wedding' | 'freelance' | 'supervisor' | 'other' | 'small_biz' | 'medium_biz' | 'enterprise_biz' | 'extended_biz';

export default function LicenseModal() {
  const { licenseTrack, closeLicenseModal } = useLicense();
  const { user, profile, setPlayIntro } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'individual' | 'business'>('individual');
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [isYearly, setIsYearly] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isAuthView, setIsAuthView] = useState(false);
  
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isOpen = !!licenseTrack;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveTab('individual');
      setSelectedRole(null);
      setSelectedTierIndex(0);
      setIsAuthView(false);
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  if (!isOpen || !licenseTrack) return null;

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
      className={`flex-1 py-3 font-sans text-[10px] md:text-xs uppercase tracking-widest font-bold transition-all rounded-full ${
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
            { id: 'individual_youtube_personal', name: 'Personal Coverage Only', desc: 'Covers your personal channels. Celebrity accounts excluded.', monthly: '$29.99', yearly: '$329.89', oneTime: 59 },
            { id: 'individual_youtube_client', name: 'Add Coverage for Client Work', desc: 'Covers your personal channels plus all client projects.', monthly: '$99.99', yearly: '$1099.89', oneTime: 249 }
          ]
        };
      case 'wedding':
        return {
          title: 'Wedding Filmmaker',
          tiers: [
            { id: 'individual_wedding_only', name: 'Wedding Clients Only', desc: 'Unlimited tracks for all your wedding clients.', monthly: '$79.99', yearly: '$879.89', oneTime: 69 },
            { id: 'individual_wedding_commercial', name: 'Wedding & Commercial Clients', desc: 'Unlimited tracks for wedding and commercial projects.', monthly: '$99.99', yearly: '$1099.89', oneTime: 249 }
          ]
        };
      case 'freelance':
        return {
          title: 'Freelance Filmmaker',
          tiers: [
            { id: 'individual_freelance_all', name: 'All-Access', desc: 'Unlimited tracks for all your freelance projects.', monthly: '$99.99', yearly: '$1099.89', oneTime: 249 }
          ]
        };
      case 'supervisor':
        return {
          title: 'Music Supervisor',
          desc: 'Standard License: Covers Web, Social, Podcast, Internal, and Industrial.',
          tiers: [
            { id: 'individual_supervisor_small', name: 'Small Client (0-100 employees)', desc: '', monthly: '$99.99', yearly: '$1099.89', oneTime: 249 },
            { id: 'individual_supervisor_medium', name: 'Medium Client (101-250 employees)', desc: '', monthly: '$199.99', yearly: '$2199.89', oneTime: 499 },
            { id: 'custom', name: 'Enterprise Client (250+)', desc: 'Contact Sales for a custom setup.', monthly: 'Custom', yearly: 'Custom', oneTime: null }
          ]
        };
      case 'other':
        return {
          title: 'Other Use Cases',
          desc: "Don't fit into these categories? Contact Sales and we'll build a setup that works for you.",
          tiers: [
            { id: 'custom', name: 'Custom Setup', desc: 'Dedicated support and tailored clearance.', monthly: 'Custom', yearly: 'Custom', oneTime: null }
          ]
        };
      case 'small_biz':
        return {
          title: 'Small Client (0-100)',
          desc: 'Standard License: Covers Web, Social, Podcast, Internal, and Industrial.',
          tiers: [
            { id: 'business_small', name: 'Standard Business License', desc: '', monthly: '$99.99', yearly: '$1099.89', oneTime: 249 }
          ]
        };
      case 'medium_biz':
        return {
          title: 'Medium Client (101-250)',
          desc: 'Standard License: Covers Web, Social, Podcast, Internal, and Industrial.',
          tiers: [
            { id: 'business_medium', name: 'Standard Business License', desc: '', monthly: '$199.99', yearly: '$2199.89', oneTime: 499 }
          ]
        };
      case 'enterprise_biz':
        return {
          title: 'Enterprise Client (250+)',
          desc: 'Standard License: Covers Web, Social, Podcast, Internal, and Industrial.',
          tiers: [
            { id: 'custom', name: 'Enterprise Setup', desc: 'Get dedicated support and custom terms.', monthly: 'Custom', yearly: 'Custom', oneTime: null }
          ]
        };
      case 'extended_biz':
        return {
          title: 'Extended Options',
          desc: 'Need coverage for TV, Cinema, Broadcast, VOD, OTT, CTV, Film Festivals, or Radio?',
          tiers: [
            { id: 'custom', name: 'Extended Clearances', desc: 'Contact Sales for a custom quote.', monthly: 'Custom', yearly: 'Custom', oneTime: null }
          ]
        };
      default:
        return null;
    }
  };

  const selectedData = selectedRole ? getRoleDetails(selectedRole) : null;
  const activeTier = selectedData?.tiers[selectedTierIndex];

  // Helper to trigger checkout (either subscribe or one-time)
  const doCheckout = async (type: 'subscribe' | 'onetime', planIdOrPrice: string | number) => {
    try {
      setIsCheckingOut(true);
      
      const payload: any = {
        success_url: `${window.location.origin}/checkout-success`,
        cancel_url: `${window.location.origin}/checkout-cancel`
      };

      if (type === 'subscribe') {
        payload.planId = planIdOrPrice;
      } else {
        payload.type = 'one_time';
        payload.amount = planIdOrPrice;
        payload.trackName = licenseTrack.file_name.replace(/\.[^/.]+$/, "");
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: payload,
      });

      if (error) {
        let actualErrorMessage = error.message;
        if ((error as any).context && typeof (error as any).context.text === 'function') {
          try {
             actualErrorMessage = await (error as any).context.text();
          } catch (e) {}
        }
        throw new Error(actualErrorMessage || "Failed to create checkout session");
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      console.error("Checkout error details:", e);
      alert(`Checkout Error: ${e.message || JSON.stringify(e)}`);
      setIsCheckingOut(false);
    }
  };

  const handleCheckoutIntent = async (type: 'subscribe' | 'onetime', planIdOrPrice: string | number | null) => {
    if (planIdOrPrice === null || planIdOrPrice === 'custom') {
      window.location.href = 'mailto:sales@tomfox.com';
      return;
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      setIsAuthView(true);
      localStorage.setItem('pendingCheckoutType', type);
      localStorage.setItem('pendingCheckoutValue', String(planIdOrPrice));
      return;
    }

    await doCheckout(type, planIdOrPrice);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (isSignUp) {
        setPlayIntro(true);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        setPlayIntro(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      
      setTimeout(() => {
        const type = localStorage.getItem('pendingCheckoutType') as 'subscribe' | 'onetime';
        const val = localStorage.getItem('pendingCheckoutValue');
        if (type && val) {
          const parsedVal = type === 'subscribe' ? val : parseInt(val, 10);
          doCheckout(type, parsedVal);
        }
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred.');
      setAuthLoading(false);
    }
  };

  const handleOAuth = async () => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/checkout-resume` },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || `Failed to authenticate.`);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeLicenseModal}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#fafafa] rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-fade-in-up">
        
        {/* Track Header (Persistent) */}
        <div className="bg-white p-6 border-b border-black/10 flex items-center gap-4 shrink-0">
          <div className="w-16 h-16 rounded-lg bg-black/5 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
            <Music className="w-6 h-6 text-black/20" />
            {licenseTrack?.artwork_url && (
              <img src={licenseTrack.artwork_url} className="absolute inset-0 w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-grow flex flex-col justify-center">
            <h3 className="font-bold text-[18px] uppercase tracking-tight leading-tight">{licenseTrack.file_name.replace(/\.[^/.]+$/, "")}</h3>
            <span className="font-sans text-[11px] text-black/50 uppercase tracking-widest mt-1">License Setup</span>
          </div>
          <button 
            onClick={closeLicenseModal}
            className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* STEP 1: Let's set you up (Only if no role selected) */}
          {!selectedRole && !isAuthView && (
            <div className="flex flex-col animate-fade-in-up">
              <h2 className="text-3xl font-bold uppercase tracking-tighter mb-6 text-center">Let's set you up</h2>
              
              <div className="flex border border-black/10 rounded-full overflow-hidden p-1 bg-white mb-8">
                {renderTabButton('individual', 'Individual')}
                {renderTabButton('business', 'Business')}
              </div>

              {activeTab === 'individual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {individualRoles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className="group bg-white border border-black/10 p-6 rounded-[20px] flex flex-col items-center justify-center text-center hover:border-black/30 hover:shadow-md transition-all"
                    >
                      {role.icon && <role.icon className="w-6 h-6 mb-3 text-black/40 group-hover:text-black transition-colors" />}
                      <span className="text-[11px] font-bold uppercase tracking-widest text-black/60 group-hover:text-black">{role.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'business' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {businessRoles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`group bg-white border border-black/10 p-6 rounded-[20px] flex flex-col items-center justify-center text-center hover:border-black/30 hover:shadow-md transition-all ${role.id === 'enterprise_biz' ? 'sm:col-span-2' : ''}`}
                    >
                      {role.icon && <role.icon className="w-6 h-6 mb-3 text-black/40 group-hover:text-black transition-colors" />}
                      <span className="text-[11px] font-bold uppercase tracking-widest text-black/60 group-hover:text-black">{role.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Tier Selection & Checkout (If role selected and not in auth) */}
          {selectedRole && !isAuthView && selectedData && (
            <div className="flex flex-col animate-fade-in-up">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => { setSelectedRole(null); setSelectedTierIndex(0); }}
                  className="text-[11px] uppercase tracking-widest font-bold text-black/50 hover:text-black transition-colors"
                >
                  &larr; Back
                </button>
                <h2 className="text-xl font-bold uppercase tracking-tight">{selectedData.title}</h2>
              </div>

              {selectedData.tiers.length > 1 && (
                <div className="flex flex-col gap-3 mb-8">
                  {selectedData.tiers.map((tier, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedTierIndex(idx)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                         selectedTierIndex === idx 
                           ? 'border-black/20 bg-black/5 text-black' 
                           : 'border-black/5 hover:border-black/10 hover:bg-black/5 text-black/70'
                      }`}
                    >
                      <div className="font-bold text-[13px] uppercase tracking-tight">{tier.name}</div>
                    </button>
                  ))}
                </div>
              )}

              {activeTier && (() => {
                const isCustom = activeTier.monthly === 'Custom';
                const planId = `${activeTier.id}_${isYearly ? 'yearly' : 'monthly'}`;
                
                return (
                  <div className="flex flex-col gap-6">
                    {/* Subscription Pitch */}
                    <div className="p-6 rounded-[24px] bg-white border border-black/10 flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-[#047857] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">Recommended</div>
                      <h3 className="font-bold uppercase tracking-tight text-[16px] mb-2">Get Unlimited Access</h3>
                      <p className="font-sans text-[12px] text-black/60 leading-relaxed mb-6">
                        Why pay for one track? Get unlimited downloads and full clearance for all your projects.
                      </p>

                      {!isCustom && (
                        <div className="flex flex-col gap-2 mb-6">
                          <button 
                            onClick={() => setIsYearly(false)}
                            className={`flex items-center justify-between p-3 border rounded-xl transition-all ${!isYearly ? 'border-black/30 bg-black/5' : 'border-black/10 hover:border-black/20'}`}
                          >
                            <span className="text-[11px] font-bold">Monthly Billing</span>
                            <span className="font-bold text-[13px]">{activeTier.monthly}/mo</span>
                          </button>
                          <button 
                            onClick={() => setIsYearly(true)}
                            className={`flex items-center justify-between p-3 border rounded-xl transition-all ${isYearly ? 'border-[#047857]/40 bg-[#047857]/5' : 'border-black/10 hover:border-black/20'}`}
                          >
                            <span className="text-[11px] font-bold flex items-center gap-2">
                              Yearly Billing <span className="text-[#047857]">Save ~10%</span>
                            </span>
                            <span className="font-bold text-[13px]">{activeTier.yearly}/yr</span>
                          </button>
                        </div>
                      )}

                      <button 
                        disabled={isCheckingOut}
                        onClick={() => handleCheckoutIntent('subscribe', isCustom ? null : planId)}
                        className="w-full bg-black text-white font-sans text-xs uppercase tracking-widest font-bold px-4 py-4 rounded-xl hover:bg-black/90 transition-colors disabled:opacity-50"
                      >
                        {isCheckingOut ? 'Loading...' : (isCustom ? 'Contact Sales' : 'Subscribe Now')}
                      </button>
                    </div>

                    {/* One-Time License */}
                    {!isCustom && activeTier.oneTime && (
                      <div className="p-6 rounded-[24px] bg-transparent border border-black/10 flex flex-col">
                        <h3 className="font-bold uppercase tracking-tight text-[16px] mb-2 text-black/60">One-Time License</h3>
                        <p className="font-sans text-[12px] text-black/50 leading-relaxed mb-4">
                          License this single track in perpetuity for your specified use case.
                        </p>
                        
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-black/40">Price</span>
                          <span className="text-[24px] font-bold tracking-tighter">${activeTier.oneTime}</span>
                        </div>

                        <button 
                          disabled={isCheckingOut}
                          onClick={() => handleCheckoutIntent('onetime', activeTier.oneTime)}
                          className="w-full bg-white border border-black/20 text-black font-sans text-xs uppercase tracking-widest font-bold px-4 py-4 rounded-xl hover:bg-black/5 hover:border-black/30 transition-colors disabled:opacity-50"
                        >
                          {isCheckingOut ? 'Loading...' : 'Purchase Single License'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* STEP 3: Auth View */}
          {isAuthView && (
             <div className="flex flex-col flex-1 animate-fade-in-up max-w-md mx-auto py-8">
               <h3 className="text-2xl font-bold uppercase tracking-tight mb-2 text-center">
                 {isSignUp ? 'Sign up to get started' : 'Welcome back'}
               </h3>
               <p className="font-sans text-[12px] uppercase tracking-widest text-black/50 mb-8 text-center">
                 {isSignUp ? 'Create an account to complete your purchase.' : 'Log in to complete your purchase.'}
               </p>

               {authError && (
                 <div className="mb-6 p-4 border border-red-500/20 bg-red-50 text-red-600 rounded-xl text-[12px] font-sans tracking-wide">
                   {authError}
                 </div>
               )}

               <button
                 onClick={handleOAuth}
                 className="flex items-center justify-center gap-3 w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-transform mb-6"
               >
                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d={siGoogle.path} /></svg>
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
                     className="w-full bg-white border border-black/10 text-black font-sans text-[14px] rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-black/30 focus:ring-1 focus:ring-black/30 transition-all placeholder:text-black/30"
                     placeholder="Email address"
                     required
                   />
                 </div>
                 
                 <input
                   type="password"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-white border border-black/10 text-black font-sans text-[14px] rounded-xl py-3 px-4 focus:outline-none focus:border-black/30 focus:ring-1 focus:ring-black/30 transition-all placeholder:text-black/30"
                   placeholder="Password"
                   required
                 />
                 
                 <button
                   type="submit"
                   disabled={authLoading}
                   className="w-full bg-black text-white font-bold uppercase text-xs tracking-widest py-4 rounded-xl hover:bg-black/90 transition-transform active:scale-[0.98] mt-2 flex items-center justify-center"
                 >
                   {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Create Account' : 'Log In')}
                 </button>
               </form>

               <div className="mt-8 text-center">
                 <button
                   type="button"
                   onClick={() => setIsSignUp(!isSignUp)}
                   className="font-sans text-[12px] text-black/50 hover:text-black transition-colors underline underline-offset-4 decoration-black/20 hover:decoration-black uppercase tracking-widest font-bold"
                 >
                   {isSignUp ? 'Already have an account? Log in' : 'Need an account? Sign up'}
                 </button>
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
