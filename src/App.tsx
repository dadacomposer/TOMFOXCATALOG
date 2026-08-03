import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Browse from './pages/Browse';

import Pricing from './pages/Pricing';
import Playlists from './pages/Playlists';
import Enterprise from './pages/Enterprise';
import Login from './pages/Login';
import CheckoutResume from './pages/CheckoutResume';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Admin from './pages/Admin';
import SharedPlayer from './pages/SharedPlayer';
import TomFoxStudio from './pages/TomFoxStudio';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { DownloadProvider } from './context/DownloadContext';
import { LicenseProvider } from './context/LicenseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserPlaylistsProvider } from './context/UserPlaylistsContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import GlobalPlayer from './components/GlobalPlayer';
import DownloadModal from './components/DownloadModal';
import LicenseModal from './components/LicenseModal';
import GlobalLoader from './components/GlobalLoader';
import AccountPanel from './components/AccountPanel';
import ContactSalesModal from './components/ContactSalesModal';
import { ErrorBoundary } from './ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import UnderConstruction from './components/UnderConstruction';
import UpdatePasswordModal from './components/UpdatePasswordModal';

import MyMusic from './pages/MyMusic';
import TrackDetailsModal from './components/shared/TrackDetailsModal';
import OnboardingModal from './components/OnboardingModal';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  return null;
}

function AppLayout() {
  const { currentTrack } = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();

  return (
    <div className={`w-full min-h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white flex flex-col transition-all duration-500 ease-out ${currentTrack ? 'pb-[90px]' : ''}`}>
      <ScrollToTop />
      {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/share') && !location.pathname.startsWith('/studio') && <Header />}
      
      <div className="flex-grow flex flex-col">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/my-music" element={<MyMusic />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/pricing" element={settings?.subscriptions_enabled ? <Pricing /> : <Navigate to="/" replace />} />
            <Route path="/enterprise" element={settings?.subscriptions_enabled ? <Enterprise /> : <Navigate to="/" replace />} />
            <Route path="/checkout-resume" element={<CheckoutResume />} />
            <Route path="/checkout-success" element={<CheckoutSuccess />} />
            <Route path="/checkout-cancel" element={<CheckoutCancel />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/studio/:project_id" element={<TomFoxStudio />} />
            <Route path="/share/:slug" element={<SharedPlayer />} />
          </Routes>
        </ErrorBoundary>
      </div>

      {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/share') && !location.pathname.startsWith('/studio') && <Footer isDark={location.pathname === '/'} />}
      {!location.pathname.startsWith('/share') && !location.pathname.startsWith('/studio') && <GlobalPlayer />}
      {!['/checkout-resume', '/checkout-success', '/checkout-cancel', '/custom-music'].includes(location.pathname) && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/studio') && <OnboardingModal />}
      <AccountPanel />
      <Login />
      <UpdatePasswordModal />
      <ContactSalesModal />
      <GlobalLoader />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'black',
            color: 'white',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            padding: '16px 24px',
            fontWeight: 500,
            letterSpacing: '-0.02em',
          },
          success: {
            iconTheme: {
              primary: 'white',
              secondary: 'black',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
      <TrackDetailsModal />
    </div>
  );
}

export default function App() {
  return (
    <UnderConstruction>
      <SettingsProvider>
        <AuthProvider>
          <UserPlaylistsProvider>
            <Router>
              <PlayerProvider>
                <DownloadProvider>
                  <LicenseProvider>
                    <AppLayout />
                    <DownloadModal />
                    <LicenseModal />
                  </LicenseProvider>
                </DownloadProvider>
              </PlayerProvider>
            </Router>
          </UserPlaylistsProvider>
        </AuthProvider>
      </SettingsProvider>
    </UnderConstruction>
  );
}
