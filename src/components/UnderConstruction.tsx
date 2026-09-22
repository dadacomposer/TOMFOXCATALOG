import React, { useEffect, useState } from 'react';

export default function UnderConstruction({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    setIsUnlocked(localStorage.getItem('tomfox_unlocked') === 'true');
  }, []);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (password === 'sfdfuhbo3487sd34u8sdfsuhiw_36y') {
      localStorage.setItem('tomfox_unlocked', 'true');
      setIsUnlocked(true);
      return;
    }

    setError(true);
    window.setTimeout(() => setError(false), 2000);
  };

  if (isUnlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#fafafa] p-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 flex items-center gap-2 text-4xl font-bold uppercase tracking-tighter">
          TOM FOX <span className="text-xs tracking-widest text-black/40">CATALOG</span>
        </div>
        <h1 className="mb-4 text-2xl font-medium tracking-tight">Site Under Construction</h1>
        <p className="mb-12 font-sans text-sm text-black/60">
          We are currently working on a new experience. Please check back later.
        </p>

        {showLogin ? (
          <form onSubmit={handleLogin} className="flex w-full flex-col gap-3">
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`w-full rounded-lg border bg-black/5 px-4 py-3 font-sans text-sm outline-none transition-colors ${
                error ? 'border-red-500 bg-red-50' : 'border-black/10 focus:border-black/30'
              }`}
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-full bg-black px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-black/90"
            >
              Unlock
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowLogin(true)}
            className="text-[10px] font-bold uppercase tracking-widest text-black/30 transition-colors hover:text-black"
          >
            Owner Login
          </button>
        )}
      </div>
    </div>
  );
}
