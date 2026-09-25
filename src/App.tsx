import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import DiscoverBrowseWrapper from './pages/DiscoverBrowseWrapper';
import Playlists from './pages/Playlists';
import Login from './pages/Login';
import CheckoutResume from './pages/CheckoutResume';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import CookiePolicy from './pages/CookiePolicy';
import Pricing from './pages/Pricing';
import Enterprise from './pages/Enterprise';
import NotFound from './pages/NotFound';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { DownloadProvider } from './context/DownloadContext';
import { LicenseProvider } from './context/LicenseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserPlaylistsProvider } from './context/UserPlaylistsContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { SearchBarProvider } from './context/SearchBarContext';
import GlobalPlayer from './components/GlobalPlayer';
import GlobalSearchBar from './components/GlobalSearchBar';
import DownloadModal from './components/DownloadModal';
import LicenseModal from './components/LicenseModal';
import GlobalLoader from './components/GlobalLoader';
import AccountPanel from './components/AccountPanel';
import ContactSalesModal from './components/ContactSalesModal';
import ContactModal from './components/ContactModal';
import { ErrorBoundary } from './ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import UpdatePasswordModal from './components/UpdatePasswordModal';

import MyMusic from './pages/MyMusic';
import TrackDetailsModal from './components/shared/TrackDetailsModal';
import OnboardingModal from './components/OnboardingModal';
import InviteManager from './components/InviteManager';
import Seo from './components/Seo';

// Admin, studio and shared-player tooling are not part of a public catalogue
// visit. Route-level loading keeps their code off the first mobile download.
const Admin = lazy(() => import('./pages/Admin'));
const AdminTracks = lazy(() => import('./components/admin/AdminTracks'));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers'));
const AdminLicensing = lazy(() => import('./components/admin/AdminLicensing'));
const AdminSettings = lazy(() => import('./components/admin/AdminSettings'));
const AdminFeatures = lazy(() => import('./components/admin/AdminFeatures'));
const AdminTomFoxStudio = lazy(() => import('./components/admin/AdminTomFoxStudio'));
const AdminTheater = lazy(() => import('./components/admin/AdminTheater'));
const AdminStatistics = lazy(() => import('./components/admin/AdminStatistics'));
const SharedPlayer = lazy(() => import('./pages/SharedPlayer'));
const TomFoxStudio = lazy(() => import('./pages/TomFoxStudio'));

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

function DesktopOnlyAdmin() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  // Mobile has no admin surface, including direct bookmarks to an admin URL.
  // Tablet and desktop retain the existing admin experience unchanged.
  return isMobile ? <Navigate to="/" replace /> : <Admin />;
}

function AppLayout() {
  const { currentTrack } = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();

  return (
    <div className={`w-full min-h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white flex flex-col no-radius !rounded-none ${currentTrack && !location.pathname.startsWith('/studio') && !location.pathname.startsWith('/admin') && location.pathname !== '/' && !location.pathname.startsWith('/browse') ? 'pb-[90px]' : ''}`}>
      <ScrollToTop />
      <Seo />
      {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/share') && !location.pathname.startsWith('/studio') && <Header />}
      
      <div className="flex-grow flex flex-col min-h-0">
        <ErrorBoundary>
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-[11px] uppercase tracking-[0.16em] text-black/40">Loading</div>}>
          <Routes>
            <Route path="/" element={<DiscoverBrowseWrapper />} />
            <Route path="/browse" element={<DiscoverBrowseWrapper />} />
            <Route path="/my-music" element={<MyMusic />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/playlists/:playlistId" element={<Playlists />} />
            <Route path="/checkout-resume" element={<CheckoutResume />} />
            <Route path="/checkout-success" element={<CheckoutSuccess />} />
            <Route path="/checkout-cancel" element={<CheckoutCancel />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/enterprise" element={<Enterprise />} />
            <Route path="/admin" element={<DesktopOnlyAdmin />}>
              <Route index element={<Navigate to="tracks" replace />} />
              <Route path="tracks" element={<AdminTracks />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="licensing" element={<AdminLicensing />} />

              <Route path="settings" element={<AdminSettings />} />
              <Route path="features" element={<AdminFeatures />} />
              <Route path="studio" element={<AdminTomFoxStudio />} />
              <Route path="studio/:projectId" element={<AdminTheater />} />
              <Route path="statistics" element={<AdminStatistics />} />
            </Route>
            <Route path="/studio/:project_id" element={<TomFoxStudio />} />
            <Route path="/share/:slug" element={<SharedPlayer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      {location.pathname !== '/' && !location.pathname.startsWith('/browse') && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/share') && !location.pathname.startsWith('/studio') && (
        <Footer isMinimized={true} />
      )}
      {!location.pathname.startsWith('/share') && !location.pathname.startsWith('/studio') && <GlobalPlayer />}
      {!['/checkout-resume', '/checkout-success', '/checkout-cancel', '/custom-music'].includes(location.pathname) && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/studio') && <OnboardingModal />}
      <AccountPanel />
      <Login />
      <UpdatePasswordModal />
      <ContactSalesModal />
      <ContactModal />
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
      <InviteManager />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <LicenseProvider>
          <PlayerProvider>
            <DownloadProvider>
              <UserPlaylistsProvider>
                <SearchBarProvider>
                  <Router>
                    <AppLayout />
                    <DownloadModal />
                    <LicenseModal />
                  </Router>
                </SearchBarProvider>
              </UserPlaylistsProvider>
            </DownloadProvider>
          </PlayerProvider>
        </LicenseProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
