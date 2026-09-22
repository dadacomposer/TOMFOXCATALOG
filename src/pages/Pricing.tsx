import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Pricing() {
  const { user, setLoginModalOpen, setAccountPanelOpen, setGeneralContactModalOpen } = useAuth();

  const openAccountOrSignIn = () => {
    if (user) {
      setAccountPanelOpen(true);
    } else {
      setLoginModalOpen(true);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fafafa] px-6 pt-32 pb-24">
      <section className="max-w-5xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.24em] font-bold text-black/45 mb-5">Tom Fox Catalog</p>
        <h1 className="max-w-3xl text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.9]">Music licensing built around your work.</h1>
        <p className="max-w-2xl mt-8 text-base md:text-lg leading-relaxed text-black/60">
          Explore the catalog freely, then choose the license and coverage that fit your project. For tailored or large-scale use, our team can help define the right terms.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-14">
          <div className="bg-white border border-black/10 p-7 flex flex-col min-h-[260px]">
            <span className="text-[11px] uppercase tracking-widest font-bold text-black/45">Explore</span>
            <h2 className="text-2xl font-bold uppercase tracking-tight mt-5">Start with the catalog</h2>
            <p className="text-sm leading-relaxed text-black/60 mt-4">Search, preview, save favourites, and build playlists before choosing a license.</p>
            <Link to="/browse" className="mt-auto inline-flex justify-center bg-black text-white px-5 py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black/85 transition-colors">Browse music</Link>
          </div>

          <div className="bg-white border border-black/10 p-7 flex flex-col min-h-[260px]">
            <span className="text-[11px] uppercase tracking-widest font-bold text-black/45">Account</span>
            <h2 className="text-2xl font-bold uppercase tracking-tight mt-5">Manage your plan</h2>
            <p className="text-sm leading-relaxed text-black/60 mt-4">Sign in to view and manage the subscription options available to your account.</p>
            <button onClick={openAccountOrSignIn} className="mt-auto bg-black text-white px-5 py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black/85 transition-colors">
              {user ? 'Open account' : 'Sign in'}
            </button>
          </div>

          <div className="bg-black text-white p-7 flex flex-col min-h-[260px]">
            <span className="text-[11px] uppercase tracking-widest font-bold text-white/50">Custom licensing</span>
            <h2 className="text-2xl font-bold uppercase tracking-tight mt-5">Need tailored coverage?</h2>
            <p className="text-sm leading-relaxed text-white/65 mt-4">For commercial, broadcast, agency, or other custom requirements, tell us about your project.</p>
            <button onClick={() => setGeneralContactModalOpen(true)} className="mt-auto border border-white/30 px-5 py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-white hover:text-black transition-colors">Contact us</button>
          </div>
        </div>
      </section>
    </div>
  );
}
