import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { XCircle, ArrowRight } from 'lucide-react';

export default function CheckoutCancel() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  useEffect(() => {
    localStorage.removeItem('checkoutCompleted');
  }, []);

  if (loading) return null;

  const isNewUser = !profile?.onboarding_completed;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-black/10 rounded-3xl p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.04)] animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold uppercase tracking-tighter mb-4">
          {isNewUser ? 'Payment Not Completed' : 'Transaction Failed'}
        </h1>
        
        <p className="font-sans text-sm text-black/60 uppercase tracking-widest leading-relaxed mb-10">
          {isNewUser 
            ? "Your checkout was not completed. You can start with our free tier to explore the catalog."
            : "Your payment was cancelled or failed. Your current plan has not been changed."}
        </p>

        <div className="flex flex-col gap-4">
          {isNewUser ? (
            <button 
              onClick={() => navigate('/browse')}
              className="w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button 
                onClick={() => navigate('/pricing')}
                className="w-full bg-black text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Try Again
              </button>
              <button 
                onClick={() => navigate('/browse')}
                className="w-full bg-[#fafafa] text-black border border-black/10 p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black/5 active:scale-[0.98] transition-all"
              >
                Continue Browsing
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
