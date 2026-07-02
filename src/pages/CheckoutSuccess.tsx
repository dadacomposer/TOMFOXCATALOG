import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    // Sync subscription status with Stripe to guarantee real-time updates
    // even if the webhook is delayed or not configured locally.
    const syncWithStripe = async () => {
      try {
        await supabase.functions.invoke('sync-stripe-subscription');
      } catch (err) {
        console.error("Failed to sync subscription status:", err);
      }
    };

    syncWithStripe().finally(() => {
      // Set flag for OnboardingModal to pick up
      localStorage.setItem('checkoutCompleted', 'true');
      
      // Always navigate to browse. OnboardingModal (global) will decide what to do.
      navigate('/browse', { replace: true });
    });
  }, [loading, navigate]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-black/50" />
    </div>
  );
}
