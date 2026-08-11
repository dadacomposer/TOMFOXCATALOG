import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import DiscoverBrowseWrapper from './pages/DiscoverBrowseWrapper';
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
import AdminTracks from './components/admin/AdminTracks';
import AdminUsers from './components/admin/AdminUsers';
import AdminTickets from './components/admin/AdminTickets';
import AdminSettings from './components/admin/AdminSettings';
import AdminFeatures from './components/admin/AdminFeatures';
import AdminTomFoxStudio from './components/admin/AdminTomFoxStudio';
import AdminTheater from './components/admin/AdminTheater';
import AdminTags from './components/admin/AdminTags';
import AdminPlaylists from './components/admin/AdminPlaylists';
import AdminStatistics from './components/admin/AdminStatistics';
import SharedPlayer from './pages/SharedPlayer';
import TomFoxStudio from './pages/TomFoxStudio';
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
import { ErrorBoundary } from './ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import UnderConstruction from './components/UnderConstruction';
import UpdatePasswordModal from './components/UpdatePasswordModal';

import MyMusic from './pages/MyMusic';
import TrackDetailsModal from './components/shared/TrackDetailsModal';
import OnboardingModal from './components/OnboardingModal';
import InviteManager from './components/InviteManager';

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
    <div className={`w-full min-h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white flex flex-col transition-all duration-500 ease-out ${currentTrack && !location.pathname.startsWith('/studio') && !location.pathname.startsWith('/admin') ? 'pb-[90px]' : ''}`}>
      <ScrollToTop />
      {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/share') && !location.pathname.startsWith('/studio') && <Header />}
      
      <div className="flex-grow flex flex-col">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<DiscoverBrowseWrapper />} />
            <Route path="/browse" element={<DiscoverBrowseWrapper />} />
            <Route path="/my-music" element={<MyMusic />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/pricing" element={settings?.subscriptions_enabled ? <Pricing /> : <Navigate to="/" replace />} />
            <Route path="/enterprise" element={settings?.subscriptions_enabled ? <Enterprise /> : <Navigate to="/" replace />} />
            <Route path="/checkout-resume" element={<CheckoutResume />} />
            <Route path="/checkout-success" element={<CheckoutSuccess />} />
            <Route path="/checkout-cancel" element={<CheckoutCancel />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/admin" element={<Admin />}>
              <Route index element={<Navigate to="tracks" replace />} />
              <Route path="tracks" element={<AdminTracks />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="features" element={<AdminFeatures />} />
              <Route path="studio" element={<AdminTomFoxStudio />} />
              <Route path="studio/:projectId" element={<AdminTheater />} />
              <Route path="playlists" element={<AdminPlaylists />} />
              <Route path="tags" element={<AdminTags />} />
              <Route path="statistics" element={<AdminStatistics />} />
            </Route>
            <Route path="/studio/:project_id" element={<TomFoxStudio />} />
            <Route path="/share/:slug" element={<SharedPlayer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </div>
      {location.pathname !== '/' && !location.pathname.startsWith('/browse') && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/share') && !location.pathname.startsWith('/studio') && (
        <Footer />
      )}
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
      <InviteManager />
    </div>
  );
}

export default function App() {
  return (
    <UnderConstruction>
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
    </UnderConstruction>
  );
}
