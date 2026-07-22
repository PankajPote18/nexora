import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 768;

    if (isMobileDevice && !isSmallScreen) {
      setDeviceMode('mobile-desktop');
    } else if (isMobileDevice && isSmallScreen) {
      setDeviceMode('mobile');
    } else {
      setDeviceMode('desktop');
    }

    const handleResize = () => {
      const small = window.innerWidth < 768;
      if (isMobileDevice && !small) setDeviceMode('mobile-desktop');
      else if (isMobileDevice && small) setDeviceMode('mobile');
      else setDeviceMode('desktop');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Hide mobile tabs on specific pages
  const isSearchPage = location.pathname === '/search';
  const isSettingsPage = location.pathname === '/settings';
  const isPlansPage = location.pathname === '/plans';
  const isDetailPage = location.pathname.startsWith('/movie/');
  const isHomePage = location.pathname === '/';
  const showMobileTabs = !isSearchPage && !isSettingsPage && !isPlansPage && !isDetailPage;

  return (
    <nav
      className={`fixed top-0 left-0 md:left-16 right-0 z-40 transition-all duration-300 px-4 md:px-6 flex flex-col justify-center border-none outline-none ${isScrolled ? 'bg-bg-dark/95 backdrop-blur-md shadow-lg shadow-black/40' : 'bg-transparent'
        }`}
    >
      <div className="flex items-center w-full py-3 space-x-4">
        {/* Logo */}
        {!isDetailPage && (
          <div className="flex items-center">
            <span className="text-xl font-bold text-white tracking-tight">Click<span className="text-[#00A8E1]">buz</span></span>
          </div>
        )}
        {/* Search Bar (desktop & mobile-desktop) */}
        {deviceMode !== 'mobile' && isHomePage && (
          <div className="flex-1 max-w-md">
            <div
              onClick={() => navigate('/search')}
              className="w-full flex items-center bg-transparent backdrop-blur-none border border-white/15 rounded-full px-3 py-1.5 hover:bg-white/5 hover:border-white/25 cursor-pointer transition"
            >
              <Search size={16} className="text-gray-400 mr-2" />
              <span className="text-gray-400 text-sm">Search movies, web series...</span>
            </div>
          </div>
        )}
      </div>

    </nav>
  );
};

export default Navbar;
