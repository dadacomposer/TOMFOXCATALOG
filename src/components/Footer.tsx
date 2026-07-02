import React from 'react';
import { Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siInstagram, siYoutube } from 'simple-icons';
import { useAuth } from '../context/AuthContext';

export default function Footer({ isDark = false }: { isDark?: boolean }) {
  const textColor = isDark ? 'text-white' : 'text-black';
  const bgColor = isDark ? 'bg-[#111]' : 'bg-[#fafafa]/85 backdrop-blur-xl';
  const mutedTextColor = isDark ? 'text-white/50' : 'text-black/50';
  const borderColor = isDark ? 'border-white/10' : 'border-black/10';
  const { setContactModalOpen } = useAuth();

  return (
    <footer className={`w-full ${bgColor} ${textColor} pt-16 md:pt-24 pb-8 border-t ${borderColor} z-10 relative`}>
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
        
        <div className="w-full flex flex-col lg:flex-row justify-between gap-16 mb-16 md:mb-20">
          
          {/* LOGO & TAGLINE */}
          <div className="flex flex-col items-start max-w-sm">
            <Link to="/" className="mb-8 block cursor-pointer transition-transform hover:scale-105 active:scale-95 group">
               <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" className={`w-20 md:w-24 h-auto ${isDark ? 'invert' : ''}`} alt="Tom Fox Logo" />
            </Link>
            <p className={`font-sans ${mutedTextColor} text-xs md:text-sm uppercase tracking-widest leading-relaxed`}>
              Premium music licensing for creators, brands, and filmmakers who refuse to compromise on sound.
            </p>
          </div>

          {/* NAVIGATION LINKS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 flex-1 lg:max-w-4xl pt-2 lg:pt-0">
            
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-4">Explore</h4>
              <Link to="/browse" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>Catalog</Link>
              <Link to="/playlists" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>Playlists</Link>
              <Link to="/browse?playlist=new-music" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>New Releases</Link>
              <Link to="/pricing" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>Pricing</Link>
              <Link to="/enterprise" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>Enterprise</Link>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-4">Support</h4>
              <Link to="/faq" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>FAQ</Link>
              <button onClick={() => setContactModalOpen(true)} className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold text-left`}>Contact Us</button>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-4">Legal</h4>
              <Link to="/terms" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>Terms of Service</Link>
              <Link to="/privacy" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>Privacy Policy</Link>
              <Link to="/cookie-policy" className={`font-sans text-sm ${mutedTextColor} hover:${textColor} transition-colors uppercase tracking-wider font-bold`}>Cookie Policy</Link>
            </div>

            {/* SOCIALS */}
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-4">Connect</h4>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/tom._fox/" target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full border ${borderColor} flex items-center justify-center ${mutedTextColor} hover:${textColor} hover:border-${isDark ? 'white' : 'black'} transition-all hover:scale-105 active:scale-95`}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d={siInstagram.path} />
                  </svg>
                </a>
                <a href="https://www.youtube.com/@tomfoxcatalog" target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full border ${borderColor} flex items-center justify-center ${mutedTextColor} hover:${textColor} hover:border-${isDark ? 'white' : 'black'} transition-all hover:scale-105 active:scale-95`}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d={siYoutube.path} />
                  </svg>
                </a>
                <a href="https://www.linkedin.com/in/tom-fox-199225198" target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full border ${borderColor} flex items-center justify-center ${mutedTextColor} hover:${textColor} hover:border-${isDark ? 'white' : 'black'} transition-all hover:scale-105 active:scale-95`}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className={`w-full flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t ${borderColor}`}>
          <div className={`font-sans text-[10px] uppercase tracking-widest ${mutedTextColor}`}>
            © {new Date().getFullYear()} Tom Fox Music. All rights reserved.
          </div>
          <div className={`font-sans text-[10px] uppercase tracking-widest ${mutedTextColor} flex items-center gap-2`}>
            Designed with <Music className="w-3 h-3" /> in Los Angeles
          </div>
        </div>

      </div>
    </footer>
  );
}
