import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutResume() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resumeCheckout = async () => {
      const planId = localStorage.getItem('pendingCheckoutPlanId');
      if (!planId) {
        navigate('/');
        return;
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { 
            planId,
            success_url: `${window.location.origin}/checkout-success`,
            cancel_url: `${window.location.origin}/checkout-cancel`
          },
        });

        if (error) throw new Error(error.message || "Failed to create checkout session");

        if (data?.url) {
          localStorage.removeItem('pendingCheckoutPlanId');
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (e: any) {
        console.error("Subscription error:", e);
        setError(e.message || "An error occurred during checkout.");
      }
    };
    
    resumeCheckout();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background logo watermark */}
      <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] md:w-[80%] opacity-[0.02] -rotate-12 pointer-events-none select-none mix-blend-multiply z-0" alt="" />
      
      <div className="relative z-10 text-center flex flex-col items-center">
        {error ? (
          <div className="bg-white border border-red-100 p-8 rounded-3xl shadow-xl max-w-md">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 font-bold text-xl">!</span>
            </div>
            <div className="text-red-600 mb-6 font-sans text-sm">{error}</div>
            <button onClick={() => navigate('/pricing')} className="bg-black text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black/90 transition-all">Return to Pricing</button>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-700">
            <img 
              src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png"
              alt="Tom Fox" 
              className="h-10 object-contain mb-8" 
            />
            
            {/* Loading Bar Container */}
            <div className="w-48 h-1 bg-black/10 rounded-full overflow-hidden flex justify-start mb-8">
              {/* Animated Loading Bar */}
              <div className="h-full bg-black rounded-full animate-[loading-bar_1.4s_ease-in-out_forwards]"></div>
            </div>
            
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">Preparing Checkout</h2>
            <p className="text-xs uppercase tracking-widest font-bold text-black/50">Taking you to secure payment...</p>

            <style>{`
              @keyframes loading-bar {
                0% { width: 0%; }
                40% { width: 28%; }
                50% { width: 28%; }
                85% { width: 82%; }
                92% { width: 82%; }
                100% { width: 100%; }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
