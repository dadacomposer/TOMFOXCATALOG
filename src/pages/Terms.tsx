import React from 'react';

export default function Terms() {
  return (
    <div className="w-full max-w-[800px] mx-auto px-6 pt-32 pb-24 min-h-screen">
      <h1 className="text-4xl font-bold uppercase tracking-tighter mb-8">Terms of Service</h1>
      
      <div className="prose prose-sm max-w-none prose-headings:uppercase prose-headings:tracking-widest prose-headings:font-bold prose-p:font-sans prose-p:text-black/70 prose-a:text-black prose-a:font-bold">
        <p className="mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-lg mt-12 mb-4">1. Acceptance of Terms</h2>
        <p className="mb-6">
          By accessing and using Tom Fox Music ("Service"), you accept and agree to be bound by the terms and provision of this agreement. 
          If you do not agree to abide by these terms, please do not use this Service.
        </p>

        <h2 className="text-lg mt-12 mb-4">2. License Grants</h2>
        <p className="mb-6">
          Upon subscribing or purchasing a license, Tom Fox Music grants you a non-exclusive, non-transferable right to use the musical compositions and sound recordings available on the platform in your media projects, strictly subject to the tier of license you have acquired (e.g. Free, Creator, Filmmaker, Business).
        </p>

        <h2 className="text-lg mt-12 mb-4">3. Restrictions</h2>
        <p className="mb-6">
          You may not:
        </p>
        <ul className="list-disc pl-6 mb-6 font-sans text-black/70">
          <li>Resell, redistribute, or sub-license the music as standalone files.</li>
          <li>Claim ownership or authorship of the music.</li>
          <li>Use the music in content that is illegal, defamatory, or promotes violence.</li>
        </ul>

        <h2 className="text-lg mt-12 mb-4">4. User Accounts</h2>
        <p className="mb-6">
          You must provide accurate information when creating an account. You are responsible for safeguarding your password and for all activities that occur under your account.
        </p>

        <h2 className="text-lg mt-12 mb-4">5. Termination</h2>
        <p className="mb-6">
          We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>

        <h2 className="text-lg mt-12 mb-4">6. Changes to Terms</h2>
        <p className="mb-6">
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect.
        </p>
      </div>
    </div>
  );
}
