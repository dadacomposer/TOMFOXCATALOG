import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, updateProfile, createWorkspace, inviteTeamMember } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Building2, Check, ChevronRight, X, Plus, User, Pencil } from 'lucide-react';

const ROLES = [
  'Producer',
  'Director',
  'Editor',
  'Creative Director',
  'Music Supervisor',
  'Youtube Creator / Podcaster',
  'Wedding Filmmaker',
  'Business Affairs',
  'Other'
];

export default function OnboardingModal() {
  const { user, profile, refreshProfile, loading: authLoading, workspaces } = useAuth();
  const [step, setStep] = useState(1);
  const [justPaid, setJustPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 State
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceAvatar, setWorkspaceAvatar] = useState<File | null>(null);

  useEffect(() => {
    const isCheckoutCompleted = localStorage.getItem('checkoutCompleted') === 'true';
    if (isCheckoutCompleted) {
      setJustPaid(true);
      setStep(0);
    }
  }, []);

  // Step 2 State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [personalAvatar, setPersonalAvatar] = useState<File | null>(null);
  const [personalAvatarUrl, setPersonalAvatarUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setPersonalAvatarUrl(user.user_metadata.avatar_url);
    }
  }, [user]);

  // Step 3 State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState(false);
  const [invites, setInvites] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (isSubmitting) return;
      
      switch(step) {
        case 0:
          if (profile?.onboarding_completed) {
            finishOnboarding();
          } else {
            setStep(1);
          }
          break;
        case 1:
          if (workspaceName.trim()) handleNextStep1();
          break;
        case 2:
          if (firstName.trim() && lastName.trim()) handleNextStep2();
          break;
        case 3:
          if (inviteEmail.trim()) {
            addInvite();
          } else {
            handleNextStep3();
          }
          break;
        case 4:
          handleTrialDecision(false);
          break;
        case 5:
          finishOnboarding();
          break;
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [step, isSubmitting, workspaceName, firstName, lastName, role, inviteEmail, invites, workspaceId, user, personalAvatarUrl]);

  if (authLoading || !user) return null;
  if (profile?.onboarding_completed && !justPaid) return null;

  const handleNextStep1 = async () => {
    const trimmedName = workspaceName.trim();
    if (!trimmedName) return;
    
    // Check if user already has a workspace with this name
    if (workspaces.some(w => w.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('You already have a workspace with this name.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Create Workspace first (like AccountPanel does)
      const ws = await createWorkspace(user.id, trimmedName);
      
      // 2. If there's an avatar, upload and update
      if (workspaceAvatar && ws?.id) {
        const { data, error: functionError } = await supabase.functions.invoke('get-r2-upload-url', {
          body: { fileName: workspaceAvatar.name, contentType: workspaceAvatar.type }
        });
        
        if (functionError) throw functionError;
        if (!data?.uploadUrl || !data?.publicUrl) throw new Error("Failed to get upload URL");

        const uploadResponse = await fetch(data.uploadUrl, {
          method: 'PUT',
          body: workspaceAvatar,
          headers: {
            'Content-Type': workspaceAvatar.type,
          }
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image to R2");
        }
        
        // Update workspace with avatar url
        const { error: updateError } = await supabase
          .from('workspaces')
          .update({ avatar_url: data.publicUrl })
          .eq('id', ws.id);
          
        if (updateError) throw updateError;
      }

      setWorkspaceId(ws.id);
      setStep(2);
    } catch (e: any) {
      console.error("Error creating workspace or uploading avatar:", e);
      alert("Failed to create workspace: " + (e.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep2 = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setIsSubmitting(true);
    try {
      let finalAvatarUrl = personalAvatarUrl || null;
      
      if (personalAvatar) {
        const { data, error: functionError } = await supabase.functions.invoke('get-r2-upload-url', {
          body: { fileName: personalAvatar.name, contentType: personalAvatar.type }
        });
        
        if (functionError) throw functionError;
        if (!data?.uploadUrl || !data?.publicUrl) throw new Error("Failed to get upload URL");

        const uploadResponse = await fetch(data.uploadUrl, {
          method: 'PUT',
          body: personalAvatar,
          headers: {
            'Content-Type': personalAvatar.type,
          }
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image to R2");
        }
        
        finalAvatarUrl = data.publicUrl;
      }

      await updateProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
        role: role,
        avatar_url: finalAvatarUrl
      });
      setStep(3);
    } catch (e) {
      console.error("Error updating profile:", e);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addInvite = () => {
    const email = inviteEmail.trim();
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return;
    if (!emailRegex.test(email)) {
      setInviteError(true);
      return;
    }
    if (!invites.includes(email)) {
      setInvites([...invites, email]);
    }
    setInviteEmail('');
    setInviteError(false);
  };


  const removeInvite = (email: string) => {
    setInvites(invites.filter(e => e !== email));
  };

  const handleNextStep3 = async () => {
    setIsSubmitting(true);
    try {
      if (workspaceId && invites.length > 0) {
        for (const email of invites) {
          await inviteTeamMember(workspaceId, email);
        }
      }
      if (justPaid || localStorage.getItem('checkoutCompleted') === 'true') {
        setStep(5);
      } else {
        setStep(4);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrialDecision = async (accepted: boolean) => {
    setIsSubmitting(true);
    try {
      const status = accepted ? 'trialing' : 'none';
      await updateProfile(user.id, {
        subscription_status: status
      });
      setStep(5);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishOnboarding = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile(user.id, {
        onboarding_completed: true
      });
      localStorage.removeItem('checkoutCompleted');
      localStorage.removeItem('justPaid');
      setJustPaid(false);
      await refreshProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7 days from now formatting
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  const formattedDate = trialEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl animate-in fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <div 
        className="relative bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transition-all"
        style={{ 
          width: step === 4 ? '800px' : '480px',
          height: step === 4 ? '500px' : (step === 5 || step === 0) ? '400px' : step === 2 ? '740px' : '600px',
        }}
      >
        
        {/* STEP PILLOWS */}
        {/* Progress indicators */}
        {step >= 1 && step <= 2 && (
          <div className="absolute top-6 left-10 right-10 flex gap-2 z-10">
            {[1, 2].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-500 flex-1 ${
                  step >= s ? 'bg-black' : 'bg-black/10'
                }`}
              />
            ))}
          </div>
        )}

        <div className={`flex-1 flex ${step === 4 ? 'flex-row' : 'flex-col'} h-full w-full`}>
          
          {/* STEP 4 SPLIT LAYOUT - LEFT SIDE */}
          {step === 4 && (
            <div className="w-[45%] relative bg-black flex flex-col justify-end p-8 text-white overflow-hidden">
              {/* NOTE: Replace with actual Pop Culture Quirk artwork URL */}
              <img 
                src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop" 
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                alt="Artwork"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              
              <div className="relative z-10">
                <h2 className="text-4xl font-bold uppercase tracking-tighter mb-4 leading-tight">Start Your<br/>7-Day Free Trial</h2>
                <p className="text-xs text-white/70 leading-relaxed">
                  No commitment. Try the full catalog for free. Stay with us if you're happy.
                </p>
              </div>
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          <div className={`flex flex-col h-full ${step === 4 ? 'w-[55%] p-10 pt-16' : step === 0 ? 'w-full' : 'p-10 pt-16'}`}>
            
            {/* STEP 0: WELCOME AFTER PAYMENT */}
            {step === 0 && (
              <div className="flex flex-col h-full items-center justify-center text-center p-10">
                <div className="mb-8">
                  <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" alt="Tom Fox" className="h-10 object-contain mx-auto" />
                </div>
                <h2 className="text-4xl font-bold uppercase tracking-tighter mb-4 leading-none">Thank you for<br/>joining the Catalog</h2>
                <p className="text-xs text-black/50 mb-12 uppercase tracking-wide">
                  Let's get you started.
                </p>
                
                <button 
                  onClick={() => {
                    if (profile?.onboarding_completed) {
                      finishOnboarding();
                    } else {
                      setStep(1);
                    }
                  }}
                  className="w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-all"
                >
                  {profile?.onboarding_completed ? 'Start Browsing' : 'Get Started'}
                </button>
              </div>
            )}

            {/* STEP 1: WORKSPACE */}
            {step === 1 && (
              <div className="flex flex-col h-full">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold uppercase tracking-tighter mb-2">Workspace</h2>
                  <p className="text-sm text-black/50">Give your team a home base.</p>
                </div>
                
                <div className="flex justify-center mb-10">
                  <div className="relative">
                    <label className="no-radius relative flex items-center justify-center w-20 h-20 rounded-full border border-black/10 hover:border-black/30 hover:bg-black/5 transition-all cursor-pointer overflow-hidden group">
                      {workspaceAvatar ? (
                        <img src={URL.createObjectURL(workspaceAvatar)} className="w-full h-full object-cover" alt="Avatar" />
                      ) : (
                        <Building2 className="w-6 h-6 text-black/40 group-hover:text-black/70 transition-colors" />
                      )}
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg"
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            if (e.target.files[0].size <= 1024 * 1024) {
                              setWorkspaceAvatar(e.target.files[0]);
                            } else {
                              alert("Image must be smaller than 1MB");
                            }
                          }
                        }}
                      />
                    </label>
                    <div className="absolute bottom-0 right-0 bg-white border border-black/10 rounded-full p-1.5 shadow-sm pointer-events-none flex items-center justify-center">
                      <Pencil className="w-3 h-3 text-black/60" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-xs text-black/50 px-2">Workspace Name</label>
                  <input 
                    type="text" 
                    value={workspaceName}
                    onChange={e => setWorkspaceName(e.target.value)}
                    placeholder="E.g. Acme Corp Studios"
                    className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans placeholder:text-black/30 outline-none transition-all"
                  />
                </div>

                <button 
                  onClick={handleNextStep1}
                  disabled={isSubmitting || workspaceName.trim().length === 0}
                  className="w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center mt-auto"
                >
                  {isSubmitting ? 'Loading...' : 'Continue'}
                </button>
              </div>
            )}

            {/* STEP 2: PROFILE */}
            {step === 2 && (
              <div className="flex flex-col h-full">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold uppercase tracking-tighter mb-2">About You</h2>
                  <p className="text-sm text-black/50">Personalize your experience.</p>
                </div>
                
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <label className="no-radius relative flex items-center justify-center w-20 h-20 rounded-full border border-black/10 hover:border-black/30 hover:bg-black/5 transition-all cursor-pointer overflow-hidden group">
                      {personalAvatar ? (
                        <img src={URL.createObjectURL(personalAvatar)} className="w-full h-full object-cover" alt="Personal Avatar" />
                      ) : personalAvatarUrl ? (
                        <>
                          <img 
                            src={personalAvatarUrl} 
                            className="w-full h-full object-cover" 
                            alt="Google Avatar" 
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('fallback-avatar');
                            }}
                          />
                          <svg className="hidden fallback-svg text-black/40 w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </>
                      ) : (
                        <User className="w-6 h-6 text-black/40 group-hover:text-black/70 transition-colors" />
                      )}
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg"
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            if (e.target.files[0].size <= 1024 * 1024) {
                              setPersonalAvatar(e.target.files[0]);
                            } else {
                              alert("Image must be smaller than 1MB");
                            }
                          }
                        }}
                      />
                    </label>
                    <div className="absolute bottom-0 right-0 bg-white border border-black/10 rounded-full p-1.5 shadow-sm pointer-events-none flex items-center justify-center">
                      <Pencil className="w-3 h-3 text-black/60" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-black/50 px-2">First Name</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-xs text-black/50 px-2">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full bg-black/5 border border-transparent focus:border-black/20 focus:bg-white rounded-2xl p-4 text-sm font-sans outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-1 min-h-0">
                  <label className="text-xs text-black/50 px-2">What best describes you?</label>
                  
                  {/* Custom Pill Toggle UI for Roles */}
                  <div className="flex flex-wrap gap-2 overflow-y-visible pb-4 pt-1 px-1">
                    {ROLES.map(r => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                          role === r 
                            ? 'bg-black text-white shadow-md' 
                            : 'bg-black/5 text-black/60 hover:bg-black/10'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleNextStep2}
                  disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
                  className="w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center mt-4"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 3: TEAM INVITES */}
            {step === 3 && (
              <div className="flex flex-col h-full">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold uppercase tracking-tighter mb-2">Invite Team</h2>
                  <p className="text-sm text-black/50">Collaboration is key.</p>
                </div>
                
                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-xs text-black/50 px-2">Email Address</label>
                  <div className={`flex bg-black/5 rounded-2xl p-1 border transition-all ${inviteError ? 'border-red-800/40 bg-red-50/50' : 'border-transparent focus-within:border-black/20 focus-within:bg-white'}`}>
                    <input 
                      type="email" 
                      value={inviteEmail}
                      onChange={e => {
                        setInviteEmail(e.target.value);
                        if (inviteError) setInviteError(false);
                      }}
                      placeholder="colleague@example.com"
                      className="flex-1 bg-transparent px-4 text-sm font-sans placeholder:text-black/30 outline-none"
                    />
                    <button 
                      onClick={addInvite}
                      className="bg-black text-white p-3 rounded-xl hover:bg-black/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {inviteError && (
                    <span className="text-[10px] font-sans text-red-800/80 px-2 uppercase tracking-wider">Please enter a valid email format</span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
                  {invites.map((email, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-black/5 rounded-xl p-3 px-4">
                      <span className="font-sans text-sm truncate">{email}</span>
                      <button onClick={() => removeInvite(email)} className="text-black/40 hover:text-red-500 transition-colors ml-4 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {invites.length === 0 && (
                    <div className="text-center text-black/30 font-sans text-xs py-8">No invites added yet.</div>
                  )}
                </div>

                <div className="flex gap-4 mt-6">
                  <button 
                    onClick={handleNextStep3}
                    disabled={isSubmitting}
                    className="w-1/3 bg-black/5 text-black p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/10 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    Skip
                  </button>
                  <button 
                    onClick={handleNextStep3}
                    disabled={isSubmitting}
                    className="flex-1 bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: UPSELL (RIGHT SIDE) */}
            {step === 4 && (
              <div className="flex flex-col h-full">
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Payment Timeline</h3>
                    
                    <div className="relative pl-6 border-l border-black/10 flex flex-col gap-8">
                      {/* Today */}
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-black ring-4 ring-white"></div>
                        <div className="text-xs text-black/50 mb-1">Today</div>
                        <div className="font-bold text-xl">$0.00</div>
                      </div>
                      
                      {/* In 7 Days */}
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-black/20 ring-4 ring-white"></div>
                        <div className="text-xs text-black/50 mb-1">{formattedDate}</div>
                        <div className="font-bold text-xl">$19.00 <span className="text-sm font-normal text-black/50">/month</span></div>
                        <div className="text-xs text-black/50 mt-1">Personal plan (No add-ons)</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-auto">
                  <button 
                    onClick={() => handleTrialDecision(false)}
                    disabled={isSubmitting}
                    className="w-1/3 bg-black/5 text-black p-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-black/10 active:scale-[0.98] transition-all disabled:opacity-50 text-center"
                  >
                    No Thanks
                  </button>
                  <button 
                    onClick={() => handleTrialDecision(true)}
                    disabled={isSubmitting}
                    className="flex-1 bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 text-center"
                  >
                    Start Trial
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: SUCCESS */}
            {step === 5 && (
              <div className="flex flex-col h-full items-center justify-center text-center">
                <div className="mb-8">
                  <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" alt="Tom Fox" className="h-10 object-contain mx-auto" />
                </div>
                <h2 className="text-4xl font-bold uppercase tracking-tighter mb-4">You're all set.</h2>
                <p className="text-xs text-black/50 mb-12">
                  Thank you for joining TomFox Catalog.
                </p>
                
                <button 
                  onClick={finishOnboarding}
                  disabled={isSubmitting}
                  className="w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  Browse the catalog
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
