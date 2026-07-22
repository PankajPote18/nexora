import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import SettingsPage from './pages/SettingsPage';
import SettingsDetailPage from './pages/SettingsDetailPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import PlansPage from './pages/PlansPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';

import AdminMovies from './pages/admin/AdminMovies';
import AdminHeroBanners from './pages/admin/AdminHeroBanners';
import AdminTrays from './pages/admin/AdminTrays';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminAboutUs from './pages/admin/AdminAboutUs';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPages from './pages/admin/AdminPages';
import AdminGenres from './pages/admin/AdminGenres';
import AdminLanguages from './pages/admin/AdminLanguages';
import AdminAgeCertificates from './pages/admin/AdminAgeCertificates';
import AdminMatureThemes from './pages/admin/AdminMatureThemes';
import AdminBadges from './pages/admin/AdminBadges';
import PlayerPage from './pages/PlayerPage';
import ScrollToTop from './components/ScrollToTop';
import { PremiumModalProvider } from './context/PremiumModalContext';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <PremiumModalProvider>
        <Routes>
          {/* Player Route - Standalone Fullscreen */}
          <Route path="/player/:id" element={<PlayerPage />} />

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
            <div className="min-h-dvh bg-bg-dark flex flex-col md:pl-16 pb-16 md:pb-0 relative">
              <Sidebar />
              <Navbar />
              <main className="flex-grow overflow-x-hidden w-full">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/movie/:id" element={<DetailPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/page/:slug" element={<SettingsDetailPage />} />
                  <Route path="/plans" element={<PlansPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          } />
        </Routes>
      </PremiumModalProvider>
    </Router>
  );
}

export default App;
