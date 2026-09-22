import React from 'react';

export default function CookiePolicy() {
  return (
    <div className="w-full max-w-[800px] mx-auto px-6 pt-32 pb-24 min-h-screen">
      <h1 className="text-4xl font-bold uppercase tracking-tighter mb-8">Cookie Policy</h1>

      <div className="prose prose-sm max-w-none prose-headings:uppercase prose-headings:tracking-widest prose-headings:font-bold prose-p:font-sans prose-p:text-black/70 prose-li:font-sans prose-li:text-black/70">
        <p className="mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <p className="mb-6">
          This policy explains how Tom Fox Catalog uses browser storage and similar technologies to make the catalog work reliably.
        </p>

        <h2 className="text-lg mt-12 mb-4">1. Essential authentication</h2>
        <p className="mb-6">
          When you sign in, our authentication provider may use browser storage and strictly necessary session data to keep you signed in securely and protect your account. These are required for account features, playlists, downloads, and licensed access to function.
        </p>

        <h2 className="text-lg mt-12 mb-4">2. Functional storage</h2>
        <p className="mb-6">
          We use local and session storage for functional choices such as completing a checkout flow, returning you to the page you requested after sign-in, and maintaining a temporary browser-session identifier. This information supports the site experience and is not used for advertising.
        </p>

        <h2 className="text-lg mt-12 mb-4">3. Product analytics</h2>
        <p className="mb-6">
          We record limited product events, such as music playback, searches, and filters, to understand how the catalog is used and improve it. A random session identifier may be stored for the duration of your browser session. We do not use advertising cookies or sell personal information.
        </p>

        <h2 className="text-lg mt-12 mb-4">4. Your choices</h2>
        <p className="mb-6">
          You can clear or block cookies and browser storage through your browser settings. Please note that blocking essential storage may prevent sign-in, checkout, saved playlists, and other account features from working correctly.
        </p>

        <h2 className="text-lg mt-12 mb-4">5. Contact</h2>
        <p className="text-black/70 leading-relaxed font-sans">
          For questions about this policy, contact us at licensing@tomfoxcatalog.com.
        </p>
      </div>
    </div>
  );
}
