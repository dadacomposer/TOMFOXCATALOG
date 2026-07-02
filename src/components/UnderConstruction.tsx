import React, { useState, useEffect } from 'react';

export default function UnderConstruction({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(true); // default true while checking
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const unlocked = localStorage.getItem('tomfox_unlocked') === 'true';
    setIsUnlocked(unlocked);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sfdfuhbo3487sd34u8sdfsuhiw_36y') {
      localStorage.setItem('tomfox_unlocked', 'true');
      setIsUnlocked(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-[#fafafa] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center max-w-md w-full text-center">
        {/* LOGO Placeholder or actual logo */}
        <div className="font-bold text-4xl tracking-tighter uppercase mb-6 flex items-center gap-2">
          TOM FOX <span className="text-xs tracking-widest text-black/40">CATALOG</span>
        </div>
        
        <h1 className="text-2xl font-medium tracking-tight mb-4">Site Under Construction</h1>
        <p className="text-sm font-sans text-black/60 mb-12">
          We are currently working on a new experience. Please check back later.
        </p>

        {showLogin ? (
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 bg-black/5 border rounded-lg font-sans text-sm outline-none transition-colors ${
                error ? 'border-red-500 bg-red-50' : 'border-black/10 focus:border-black/30'
              }`}
              autoFocus
            />
            <button
              type="submit"
              className="w-full px-4 py-3 bg-black text-white font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-black/90 transition-colors"
            >
              Unlock
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowLogin(true)}
            className="text-[10px] uppercase font-bold tracking-widest text-black/30 hover:text-black transition-colors"
          >
            Owner Login
          </button>
        )}
      </div>
    </div>
  );
}
