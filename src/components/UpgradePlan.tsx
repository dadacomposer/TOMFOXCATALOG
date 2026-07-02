import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from './CustomSelect';

type RoleId = 'youtube' | 'wedding' | 'freelance' | 'supervisor' | 'small_biz' | 'medium_biz' | 'enterprise_biz' | 'extended_biz';

const individualRoles = [
  { id: 'youtube', title: 'YouTube Creator / Podcaster' },
  { id: 'wedding', title: 'Wedding Filmmaker' },
  { id: 'supervisor', title: 'Music Supervisor' },
  { id: 'freelance', title: 'Freelance Filmmaker' },
];

const businessRoles = [
  { id: 'small_biz', title: 'Small Client (0-100 employees)' },
  { id: 'medium_biz', title: 'Medium Client (101-250 employees)' },
  { id: 'enterprise_biz', title: 'Enterprise Client (250+ employees)' },
  { id: 'extended_biz', title: 'Extended Options (TV, Cinema, Radio)' },
];

const allRoles = [
  { label: 'Individual Plans', options: individualRoles.map(r => ({ value: r.id, label: r.title })) },
  { label: 'Business Plans', options: businessRoles.map(r => ({ value: r.id, label: r.title })) }
];

export default function UpgradePlan({ currentPlanId, currentInterval, onSuccess }: { currentPlanId?: string, currentInterval?: string, onSuccess?: () => void }) {
  const [selectedRole, setSelectedRole] = useState<RoleId>('youtube');
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [isYearly, setIsYearly] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const getRoleDetails = (roleId: string) => {
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
          tiers: [
            { id: 'individual_supervisor_small', name: 'Small Client (0-100 employees)', desc: 'Standard License: Covers Web, Social, Podcast, Internal.', monthly: '$99.99', yearly: '$1099.89' },
            { id: 'individual_supervisor_medium', name: 'Medium Client (101-250 employees)', desc: 'Standard License: Covers Web, Social, Podcast, Internal.', monthly: '$199.99', yearly: '$2199.89' },
            { id: 'custom', name: 'Enterprise Client (250+)', desc: 'Contact Sales for a custom setup.', monthly: 'Custom', yearly: 'Custom' }
          ]
        };
      case 'small_biz':
        return {
          title: 'Small Client (0-100)',
          tiers: [
            { id: 'business_small', name: 'Standard Business License', desc: 'Standard License: Covers Web, Social, Podcast, Internal.', monthly: '$99.99', yearly: '$1099.89' }
          ]
        };
      case 'medium_biz':
        return {
          title: 'Medium Client (101-250)',
          tiers: [
            { id: 'business_medium', name: 'Standard Business License', desc: 'Standard License: Covers Web, Social, Podcast, Internal.', monthly: '$199.99', yearly: '$2199.89' }
          ]
        };
      case 'enterprise_biz':
        return {
          title: 'Enterprise Client (250+)',
          tiers: [
            { id: 'custom', name: 'Enterprise Setup', desc: 'Get dedicated support and custom terms.', monthly: 'Custom', yearly: 'Custom' }
          ]
        };
      case 'extended_biz':
        return {
          title: 'Extended Options',
          tiers: [
            { id: 'custom', name: 'Extended Clearances', desc: 'Need coverage for TV, Cinema, Broadcast, Radio? Contact Sales.', monthly: 'Custom', yearly: 'Custom' }
          ]
        };
      default:
        return null;
    }
  };

  const selectedData = getRoleDetails(selectedRole);
  const activeTier = selectedData?.tiers[selectedTierIndex];
  
  // Reset tier selection when role changes
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value as RoleId);
    setSelectedTierIndex(0);
  };

  const doUpgrade = async (planId: string) => {
    if (planId === 'custom') {
      toast.error("Please contact sales for custom pricing.");
      return;
    }

    try {
      setIsCheckingOut(true);
      const finalPlanId = isYearly ? `${planId}_yearly` : `${planId}_monthly`;
      console.log("Starting plan upgrade to:", finalPlanId);
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: { planId: finalPlanId }
      });

      if (error) {
        console.error("Full error from Edge Function:", error);
        
        let errorMessage = error.message;
        
        // FunctionsHttpError often contains the raw Response in .context
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errBody = await error.context.json();
            errorMessage = errBody.error || errBody.message || errorMessage;
          } catch (e) {
            console.error("Could not parse error response body:", e);
          }
        } else if (error.context && error.context.statusText) {
            errorMessage = `${error.context.status} ${error.context.statusText}`;
        }
        
        throw new Error(errorMessage || "Failed to update subscription");
      }

      if (data?.action === 'downgraded_scheduled') {
        toast.success("Downgrade scheduled for end of billing cycle.");
      } else {
        toast.success("Plan upgraded successfully!");
      }
      
      // Sync immediately so the UI reflects the change right away
      await supabase.functions.invoke('sync-stripe-subscription');
      
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      console.error("Upgrade error:", e);
      toast.error(e.message || "Failed to update plan");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!selectedData || !activeTier) return null;
  const isCustom = activeTier.monthly === 'Custom';

  // Helper to find the current plan's role title
  const currentPlanRoleTitle = (() => {
    if (!currentPlanId) return null;
    for (const group of allRoles) {
      for (const role of group.options) {
        const details = getRoleDetails(role.value);
        if (details?.tiers.some(t => t.id === currentPlanId)) {
          return `${role.label} - ${details.tiers.find(t => t.id === currentPlanId)?.name}`;
        }
      }
    }
    return null;
  })();

  return (
    <div className="w-full flex flex-col gap-8 animate-fade-in-up">
      {/* Current Plan Banner */}
      {currentPlanRoleTitle && (
        <div className="flex items-center gap-3 p-4 bg-black/5 rounded-xl border border-black/10">
          <CheckCircle2 className="w-5 h-5 text-black/40" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">Your Current Plan</span>
            <span className="text-sm font-bold tracking-tight">{currentPlanRoleTitle} <span className="text-black/50 font-sans font-normal ml-1 capitalize">({currentInterval})</span></span>
          </div>
        </div>
      )}

      {/* 1. Use Case Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold uppercase tracking-widest text-black/50">1. Select Your Use Case</label>
        <CustomSelect 
          value={selectedRole}
          onChange={(val) => {
            setSelectedRole(val as RoleId);
            setSelectedTierIndex(0);
          }}
          options={allRoles}
        />
      </div>

      {/* 2. Tier Selection (if multiple) */}
      {selectedData.tiers.length > 1 && (
        <div className="flex flex-col gap-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-black/50 mb-1">2. Select Coverage</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedData.tiers.map((tier, idx) => (
              <button 
                key={idx}
                onClick={() => setSelectedTierIndex(idx)}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  selectedTierIndex === idx 
                    ? 'border-black bg-black text-white shadow-md' 
                    : 'border-black/10 hover:border-black/30 bg-white text-black hover:shadow-sm'
                }`}
              >
                <div>
                  <div className={`font-sans text-[10px] uppercase tracking-widest font-bold mb-1 ${selectedTierIndex === idx ? 'text-white/70' : 'text-black/50'}`}>
                    Option {idx + 1}
                  </div>
                  <div className="font-bold text-[14px] uppercase tracking-tight leading-tight">
                    {tier.name}
                  </div>
                </div>
                <div className={`mt-3 font-sans text-[11px] leading-relaxed ${selectedTierIndex === idx ? 'text-white/80' : 'text-black/60'}`}>
                  {tier.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Billing Interval & Summary */}
      <div className="bg-white border border-black/10 rounded-[24px] p-6 shadow-sm flex flex-col gap-6">
        
        {!isCustom && (
          <div className="flex flex-col gap-2 border-b border-black/5 pb-6">
            <label className="text-[11px] font-bold uppercase tracking-widest text-black/50 mb-1">Billing Interval</label>
            <div className="flex bg-[#fafafa] rounded-lg p-1 w-full border border-black/5">
              <button
                onClick={() => setIsYearly(false)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${!isYearly ? 'bg-white shadow-sm text-black border border-black/5' : 'text-black/40 hover:text-black/70'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all flex justify-center items-center gap-2 ${isYearly ? 'bg-white shadow-sm text-black border border-black/5' : 'text-black/40 hover:text-black/70'}`}
              >
                Yearly <span className="text-[9px] bg-[#047857] text-white px-2 py-0.5 rounded-full">Save ~10%</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-black/50">Total Amount</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[40px] md:text-[48px] font-bold leading-none tracking-tighter">
                {isCustom ? 'Custom' : (isYearly ? activeTier.yearly : activeTier.monthly)}
              </span>
              {!isCustom && (
                <span className="text-[13px] text-black/40 font-bold uppercase tracking-widest">
                  / {isYearly ? 'year' : 'month'}
                </span>
              )}
            </div>
            {isCustom && <div className="text-sm text-black/60 font-sans mt-1">{activeTier.desc}</div>}
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {activeTier.id === currentPlanId && currentInterval === 'year' && !isYearly && (
              <div className="text-[10px] text-yellow-600 bg-yellow-50 p-2 rounded-md font-sans border border-yellow-100 max-w-xs">
                You are currently on an annual commitment. Switching to monthly will take effect at the end of your current billing year.
              </div>
            )}
            <button 
              disabled={isCheckingOut || (activeTier.id === currentPlanId && ((isYearly && currentInterval === 'year') || (!isYearly && currentInterval === 'month')))}
              onClick={() => doUpgrade(activeTier.id)}
              className="w-full px-8 bg-black text-white font-sans text-[12px] uppercase tracking-widest font-bold py-4 rounded-xl hover:bg-black/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCheckingOut ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : isCustom ? (
                'Contact Sales'
              ) : (activeTier.id === currentPlanId) ? (
                ((isYearly && currentInterval === 'year') || (!isYearly && currentInterval === 'month')) ? 'Current Plan' : 
                (isYearly ? 'Upgrade to Annual (Prorated)' : 'Switch to Monthly at Renewal')
              ) : (
                'Confirm Plan Change'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
