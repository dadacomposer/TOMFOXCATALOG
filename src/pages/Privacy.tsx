import React from 'react';

export default function Privacy() {
  return (
    <div className="w-full max-w-[800px] mx-auto px-6 pt-32 pb-24 min-h-screen">
      <h1 className="text-4xl font-bold uppercase tracking-tighter mb-8">Privacy Policy</h1>
      
      <div className="prose prose-sm max-w-none prose-headings:uppercase prose-headings:tracking-widest prose-headings:font-bold prose-p:font-sans prose-p:text-black/70 prose-a:text-black prose-a:font-bold">
        <p className="mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-lg mt-12 mb-4">1. Information We Collect</h2>
        <p className="mb-6">
          We collect information you provide directly to us, such as when you create or modify your account, request support, or communicate with us. 
          This may include your name, email address, payment information, and any other information you choose to provide.
        </p>

        <h2 className="text-lg mt-12 mb-4">2. How We Use Information</h2>
        <p className="mb-6">
          We use the information we collect to provide, maintain, and improve our services, such as to process transactions, send you technical notices, updates, security alerts, and support and administrative messages.
        </p>

        <h2 className="text-lg mt-12 mb-4">3. Sharing of Information</h2>
        <p className="mb-6">
          We do not share your personal information with third parties except as described in this privacy policy, such as with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.
        </p>

        <h2 className="text-lg mt-12 mb-4">4. Security</h2>
        <p className="mb-6">
          We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration, and destruction.
        </p>

        <h2 className="text-lg mt-12 mb-4">5. Contact Us</h2>
        <p className="mb-6">
          If you have any questions about this Privacy Policy, please contact us at support@tomfox.com.
        </p>
      </div>
    </div>
  );
}
