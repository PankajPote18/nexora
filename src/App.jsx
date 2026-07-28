import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import { PremiumModalProvider } from './context/PremiumModalContext';

// Route-based code splitting: HomePage stays eager (it's the landing page,
// no benefit to lazy-loading the page a first-time visitor lands on
// directly), everything else — including the entire admin CMS — is split
// into its own chunk so a public visitor never downloads admin code.
import HomePage from './pages/HomePage';
const DetailPage = lazy(() => import('./pages/DetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SettingsDetailPage = lazy(() => import('./pages/SettingsDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OtpPage = lazy(() => import('./pages/OtpPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminMovies = lazy(() => import('./pages/admin/AdminMovies'));
const AdminHeroBanners = lazy(() => import('./pages/admin/AdminHeroBanners'));
const AdminTrays = lazy(() => import('./pages/admin/AdminTrays'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminAboutUs = lazy(() => import('./pages/admin/AdminAboutUs'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminPages = lazy(() => import('./pages/admin/AdminPages'));
const AdminGenres = lazy(() => import('./pages/admin/AdminGenres'));
const AdminLanguages = lazy(() => import('./pages/admin/AdminLanguages'));
const AdminAgeCertificates = lazy(() => import('./pages/admin/AdminAgeCertificates'));
const AdminMatureThemes = lazy(() => import('./pages/admin/AdminMatureThemes'));
const AdminBadges = lazy(() => import('./pages/admin/AdminBadges'));

const RouteFallback = () => (
  <div className="min-h-dvh flex items-center justify-center bg-bg-dark text-white text-sm">
    Loading…
  </div>
);

function App() {
  return (
    <Router>
      <ScrollToTop />
      <PremiumModalProvider>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Player Route - Standalone Fullscreen */}
          <Route path="/player/:id" element={<ProtectedRoute><PlayerPage /></ProtectedRoute>} />

          {/* Auth Routes - Standalone Fullscreen */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-otp" element={<OtpPage />} />

          {/* Admin Login - Standalone, required only for movie/trailer uploads */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Routes - Standalone Layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="hero-banners" replace />} />
            <Route path="movies" element={<AdminMovies />} />
            <Route path="hero-banners" element={<AdminHeroBanners />} />
            <Route path="trays" element={<AdminTrays />} />
            <Route path="users" element={<div className="text-xl p-8 text-white">Users Management Coming Soon</div>} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="about-us" element={<AdminAboutUs />} />
            <Route path="pages" element={<AdminPages />} />
            
            {/* New Routes */}
            <Route path="genres" element={<AdminGenres />} />
            <Route path="languages" element={<AdminLanguages />} />
            <Route path="age-certificates" element={<AdminAgeCertificates />} />
            <Route path="mature-themes" element={<AdminMatureThemes />} />
            <Route path="vendors" element={<div className="text-xl p-8 text-white">Vendor Coming Soon</div>} />
            <Route path="badges" element={<AdminBadges />} />
          </Route>

          {/* Public Routes with Navbar/Sidebar */}
          <Route path="*" element={
            <ProtectedRoute>
              <div className="min-h-dvh bg-bg-dark flex flex-col md:pl-16 pb-16 md:pb-0 relative">
                <Sidebar />
                <Navbar />
                <main className="flex-grow overflow-x-hidden w-full">
                  {/* Inner Suspense boundary: only the routed content pauses
                      while its chunk loads — Navbar/Sidebar/Footer stay put
                      instead of the whole shell flashing to a loading screen. */}
                  <Suspense fallback={<div className="min-h-[60vh]" />}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/movie/:id" element={<DetailPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/page/:slug" element={<SettingsDetailPage />} />
                      <Route path="/plans" element={<PlansPage />} />
                    </Routes>
                  </Suspense>
                </main>
                <Footer />
              </div>
            </ProtectedRoute>
          } />
        </Routes>
        </Suspense>
      </PremiumModalProvider>
    </Router>
  );
}

export default App;
