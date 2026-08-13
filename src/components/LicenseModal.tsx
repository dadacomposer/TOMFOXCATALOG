import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { supabase } from '../lib/supabase';

export default function LicenseModal() {
  const { licenseTrack, isLicenseModalOpen, closeLicenseModal } = useLicense();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    website_url: '',
    business_type: '',
    project_details: '',
    content_focus_ad: false,
    paid_ad_campaign: false,
    contains_sponsorships: false,
    monetized: false,
    paywalled: false,
    timeline: '',
  });

  const trackName = licenseTrack ? licenseTrack.title || licenseTrack.file_name?.replace(/\.[^/.]+$/, "") : null;

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '',
      email: '',
      website_url: '',
      business_type: '',
      project_details: '',
      content_focus_ad: false,
      paid_ad_campaign: false,
      contains_sponsorships: false,
      monetized: false,
      paywalled: false,
      timeline: '',
    });
    setError(null);
  };

  const handleClose = () => {
    closeLicenseModal();
    setTimeout(resetForm, 300);
  };

  const handleNext = () => setStep(prev => prev + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Insert into database
      const { error: dbError } = await supabase.from('licensing_requests').insert([
        {
          name: formData.name,
          email: formData.email,
          website_url: formData.website_url,
          business_type: formData.business_type,
          project_details: formData.project_details,
          content_focus_ad: formData.content_focus_ad,
          paid_ad_campaign: formData.paid_ad_campaign,
          contains_sponsorships: formData.contains_sponsorships,
          monetized: formData.monetized,
          paywalled: formData.paywalled,
          timeline: formData.timeline,
          track_id: licenseTrack ? licenseTrack.id : null,
          status: 'pending'
        }
      ]);

      if (dbError) throw dbError;

      // 2. Trigger email function
      const { error: fnError } = await supabase.functions.invoke('send-licensing-email', {
        body: {
          ...formData,
          track_name: trackName
        }
      });

      if (fnError) throw fnError;

      setStep(5); // Success step
    } catch (err: any) {
      console.error('Failed to submit licensing request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center px-4 ${isLicenseModalOpen ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 transition-all duration-300 ${isLicenseModalOpen ? 'bg-black/20 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={handleClose} />

      {/* Modal Content */}
      <div className={`relative z-10 w-full max-w-2xl bg-[#F9FAFB] shadow-2xl overflow-hidden rounded-xl border border-black/5 transition-all duration-300 ${isLicenseModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        
        {/* Close button */}
        <button 
          onClick={handleClose} 
          className="absolute top-6 right-6 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-20"
        >
          <X className="w-5 h-5 text-black/60" />
        </button>

        <div className="p-8 md:p-12">
          
          {step === 1 && (
            <div className="animate-scale-in">
              <h2 className="text-2xl font-bold tracking-tight text-black mb-6">
                Licensing Form
              </h2>
              {trackName && (
                <div className="mb-8 px-4 py-3 bg-black/5 text-black rounded-xl text-sm border border-black/10 flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Track</span>
                  <strong className="font-medium">{trackName}</strong>
                </div>
              )}
              <div className="space-y-4 text-sm text-black/60 mb-10 leading-relaxed font-sans">
                <p>Thank you for your interest in my music!</p>
                <p>Completing the form helps me follow up with the best licensing option for you.</p>
                <p>I typically respond within 24 hours. If your request is time-sensitive, you can reach me directly at <strong>hello@tomfox.site</strong>.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-black/60 mb-2">Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-black/60 mb-2">Email *</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-black/60 mb-1">Website / Portfolio</label>
                  <p className="text-[10px] text-black/40 mb-2">Best way to view your work (Website, YouTube, Instagram, etc.)</p>
                  <input 
                    type="text" 
                    value={formData.website_url}
                    onChange={e => setFormData({...formData, website_url: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-black/80 transition-colors flex items-center gap-2"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-scale-in">
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-black/60 mb-2">What best describes you or your business? *</label>
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full px-4 py-3 bg-white border ${isDropdownOpen ? 'border-black' : 'border-black/10'} rounded-xl cursor-pointer flex items-center justify-between transition-all`}
                    >
                      <span className={`text-sm ${formData.business_type ? 'text-black' : 'text-black/40'}`}>
                        {formData.business_type || 'Select an option...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden py-2 animate-scale-in">
                        {[
                          "Content Creator / Youtube Channel",
                          "Freelancer / Client Work",
                          "Podcast / Audio Only Content",
                          "Non-profit",
                          "Production Company",
                          "Agency"
                        ].map((option) => (
                          <div 
                            key={option}
                            onClick={() => {
                              setFormData({...formData, business_type: option});
                              setIsDropdownOpen(false);
                            }}
                            className={`px-4 py-2 text-sm cursor-pointer transition-colors ${formData.business_type === option ? 'bg-black/5 text-black font-medium' : 'text-black/70 hover:bg-black/5 hover:text-black'}`}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-black/60 mb-2">Project details</label>
                  <p className="text-[10px] text-black/40 mb-2">Is there anything you'd like to share about your project or how the music will be used?</p>
                  <textarea 
                    rows={4}
                    value={formData.project_details}
                    onChange={e => setFormData({...formData, project_details: e.target.value})}
                    placeholder="Tell me a bit about your project..."
                    className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm resize-none"
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-black/80 transition-colors flex items-center gap-2"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-black/5 text-black font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-black/10 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="animate-scale-in">
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-black/60 mb-1">Check all that apply</label>
                  <p className="text-[10px] text-black/40 mb-4">(leave blank if none apply)</p>
                  <div className="space-y-2">
                    {[
                      { id: 'content_focus_ad', label: 'The content\'s primary focus is to advertise or promote a product, service or brand.' },
                      { id: 'paid_ad_campaign', label: 'This is for a paid advertisement campaign.' },
                      { id: 'contains_sponsorships', label: 'You publish content that contains sponsorships.' },
                      { id: 'monetized', label: 'Your content is monetized.' },
                      { id: 'paywalled', label: 'Your content lives behind a paywall.' }
                    ].map(({ id, label }) => (
                      <label key={id} className={`flex items-center gap-4 cursor-pointer p-4 rounded-xl transition-all border ${formData[id as keyof typeof formData] ? 'bg-black/5 border-black/20' : 'bg-white border-black/10 hover:border-black/20'}`}>
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={formData[id as keyof typeof formData] as boolean}
                            onChange={e => setFormData({...formData, [id]: e.target.checked})}
                            className="w-5 h-5 border border-black/20 rounded-md text-black focus:ring-black focus:ring-offset-0 transition-all cursor-pointer"
                          />
                        </div>
                        <span className={`text-sm transition-colors leading-relaxed ${formData[id as keyof typeof formData] ? 'text-black font-medium' : 'text-black/60'}`}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-black/80 transition-colors flex items-center gap-2"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-black/5 text-black font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-black/10 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 4 && (
            <div className="animate-scale-in">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-black/60 mb-4">When do you need the license to begin? *</label>
                  <div className="space-y-2">
                    {[
                      'It\'s urgent / Immediate',
                      'Within 1 - 2 weeks',
                      'Within a month',
                      'It\'s flexible'
                    ].map((option) => (
                      <label key={option} className={`flex items-center gap-4 cursor-pointer p-4 rounded-xl transition-all border ${formData.timeline === option ? 'bg-black/5 border-black/20' : 'bg-white border-black/10 hover:border-black/20'}`}>
                        <div className="relative flex items-center">
                          <input
                            type="radio"
                            name="timeline"
                            required
                            checked={formData.timeline === option}
                            onChange={() => setFormData({...formData, timeline: option})}
                            className="w-5 h-5 border border-black/20 text-black focus:ring-black focus:ring-offset-0 transition-all cursor-pointer"
                          />
                        </div>
                        <span className={`text-sm transition-colors leading-relaxed ${formData.timeline === option ? 'text-black font-medium' : 'text-black/60'}`}>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="pt-6 flex gap-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                    ) : (
                      <>Submit Request <CheckCircle2 className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-black/5 text-black font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-black/10 disabled:opacity-50 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 5 && (
            <div className="py-16 flex flex-col items-center justify-center animate-scale-in text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-black mb-4">Request Received!</h3>
              <p className="text-sm text-black/60 max-w-md mb-10 leading-relaxed">
                Thank you for completing the form. I will review your request and get back to you within 24 hours.
              </p>
              <button 
                onClick={handleClose}
                className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-black/80 transition-colors"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
