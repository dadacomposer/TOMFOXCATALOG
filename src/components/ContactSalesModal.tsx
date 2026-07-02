import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ContactSalesModal() {
  const { isContactModalOpen, setContactModalOpen } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Enterprise contact request sent!");
    setContactModalOpen(false);
  };



  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${isContactModalOpen ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isContactModalOpen ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={() => setContactModalOpen(false)} />

      {/* Modal Content */}
      <div className={`relative z-10 w-full max-w-2xl bg-[#fafafa] shadow-2xl overflow-hidden rounded-[32px] border border-black/5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isContactModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <button 
          onClick={() => setContactModalOpen(false)} 
          className="absolute top-6 right-6 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-20"
        >
          <X className="w-5 h-5 text-black/60" />
        </button>

        <div className="p-8 md:p-12 flex flex-col items-center">
          
          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-[0.85] text-black text-center mb-4">
            Let's<br />Talk<br />Scale.
          </h2>
          <p className="font-sans text-black/50 uppercase tracking-widest text-xs md:text-sm max-w-sm text-center mb-10">
            Fill out the form and our enterprise team will reach out within 24 hours.
          </p>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-8">
            
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Full Name</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10"
                placeholder="JANE DOE"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Work Email</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10"
                placeholder="HELLO@COMPANY.COM"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Company Name</label>
              <input 
                type="text" 
                required
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                className="w-full bg-transparent border-b border-black/10 pb-2 text-xl md:text-2xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10"
                placeholder="YOUR AGENCY"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] md:text-xs uppercase tracking-widest text-black/50">Project Scope</label>
              <textarea 
                required
                rows={2}
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="w-full bg-transparent border-b border-black/10 pb-2 text-lg md:text-xl font-bold uppercase tracking-tighter text-black focus:outline-none focus:border-black transition-colors placeholder:text-black/10 resize-none"
                placeholder="TELL US ABOUT YOUR NEEDS..."
              />
            </div>

            <button 
              type="submit"
              className="mt-4 flex items-center justify-between w-full p-4 md:p-6 bg-black text-white rounded-full group hover:bg-black/90 transition-colors"
            >
              <span className="font-bold uppercase tracking-widest text-[11px] md:text-xs">Send Request</span>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white transition-colors">
                <ArrowRight className="w-4 h-4 text-white group-hover:text-black" />
              </div>
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
}
