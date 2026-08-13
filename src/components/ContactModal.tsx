import React, { useState } from 'react';
import { ArrowRight, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function ContactModal() {
  const { isGeneralContactModalOpen, setGeneralContactModalOpen } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          ...formData,
          source: 'General Inquiry'
        }
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setGeneralContactModalOpen(false);
        setSuccess(false);
        setFormData({ name: '', email: '', company: '', message: '' });
      }, 2000);
    } catch (err: any) {
      console.error('Failed to send contact request:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${isGeneralContactModalOpen ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isGeneralContactModalOpen ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={() => setGeneralContactModalOpen(false)} />

      {/* Modal Content */}
      <div className={`relative z-10 w-full max-w-2xl bg-[#fafafa] shadow-2xl overflow-hidden rounded-[32px] border border-black/5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isGeneralContactModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <button 
          onClick={() => setGeneralContactModalOpen(false)} 
          className="absolute top-6 right-6 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-20"
        >
          <X className="w-5 h-5 text-black/60" />
        </button>

        <div className="p-8 md:p-12 flex flex-col items-center">
          
          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-[0.85] text-black text-center mb-4">
            Get In<br />Touch.
          </h2>
          <p className="font-sans text-black/50 uppercase tracking-widest text-xs md:text-sm max-w-sm text-center mb-10">
            Fill out the form and we will reach out within 24 hours.
          </p>
          
          {success ? (
            <div className="w-full py-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-6">
                <ArrowRight className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-tighter">Message Sent!</h3>
              <p className="text-black/50 mt-2 uppercase tracking-widest text-xs">We'll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-8">
              
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10 !rounded-none"
                  placeholder="JANE DOE"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Email</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10 !rounded-none"
                  placeholder="HELLO@DOMAIN.COM"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Company (Optional)</label>
                <input 
                  type="text" 
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                  className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10 !rounded-none"
                  placeholder="YOUR COMPANY"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Message</label>
                <textarea 
                  required
                  rows={2}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-transparent border-b border-black/10 pb-2 text-lg md:text-xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10 resize-none !rounded-none"
                  placeholder="TELL US ABOUT YOUR NEEDS..."
                />
              </div>

              {error && (
                <div className="text-red-500 text-xs font-bold uppercase tracking-widest text-center">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isSubmitting}
                className="mt-4 flex items-center justify-between w-full p-4 md:p-6 bg-black text-white rounded-full group hover:bg-black/90 transition-colors disabled:opacity-50"
              >
                <span className="font-bold uppercase tracking-widest text-[11px] md:text-xs">
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white transition-colors">
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-white group-hover:text-black" />
                  )}
                </div>
              </button>
              
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
