import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Plus } from 'lucide-react';
import { usePremiumModal } from '../context/PremiumModalContext';
import { useAuth } from '../hooks/useAuth';
import MovieRow from '../components/MovieRow';
import { DetailSkeleton } from '../components/Skeletons';
import { bunnyImageUrl, bunnyImageSrcSet } from '../utils/bunnyImage';
import { prefetchPlayerPage } from '../utils/prefetch';
import { moviesApi } from '../services/api';
import { trackViewContent } from '../analytics/metaEvents';

const BACKDROP_WIDTHS = [800, 1200, 1920];

const DetailPage = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showModal } = usePremiumModal();
  const { isPremium } = useAuth();

  const handleWatchClick = (e) => {
    // This page is only reachable while authenticated (see ProtectedRoute in
    // App.jsx). There's still no real subscription check — this is just the
    // 'premium' demo account (see DEMO_ACCOUNTS in useAuth.js) bypassing the
    // paywall for demo purposes. Every other account stays fail-closed.
    const hasActiveSubscription = isPremium;
    if (!hasActiveSubscription) {
      e.preventDefault();
      showModal();
      return;
    }

    const isMobile = window.innerWidth < 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobile && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log("Auto-fullscreen on click failed:", err);
      });
    }
  };

  // Almost everyone who opens a Detail page is about to hit "Watch now" —
  // prefetch PlayerPage's chunk once we're actually here (not from Home),
  // during idle time so it never competes with this page's own render.
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetchPlayerPage);
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = setTimeout(prefetchPlayerPage, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchMovie = async () => {
      setLoading(true);
      try {
        // The backend now reliably returns `related` (same-category movies)
        // alongside the detail record itself, so there's no need to also
        // fetch the entire catalog on every detail-page view.
        const data = await moviesApi.getOne(id);

        setMovie(data);

        if (data.related && data.related.length > 0) {
          setRelated(data.related);
        } else {
          // Narrow fallback only — a small bounded fetch, not the full list.
          const fallback = await moviesApi.getAll({ limit: 6 });
          setRelated(fallback.data.filter(m => m.id.toString() !== id.toString()));
        }
      } catch (error) {
        console.error("Error fetching movie details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  useEffect(() => {
    if (!movie) return;
    trackViewContent({
      contentName: movie.title,
      contentCategory: movie.genres?.[0],
      contentIds: [String(movie.id)],
      contentType: 'product',
    });
  }, [movie]);

  if (loading) return <DetailSkeleton />;
  if (!movie) return <div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center text-xl">Movie not found</div>;

  return (
    <div className="w-full bg-[#02040a] text-white pt-6 lg:pt-10 pb-16 px-4 lg:px-12 min-h-[calc(100vh-80px)]">
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-5 lg:gap-12">

        {/* Left Column: Poster Card */}
        <div className="w-full lg:w-[55%] xl:w-[55%] shrink-0 flex justify-center lg:justify-start">
          <div className="w-full aspect-video bg-[#090d16] rounded-xl lg:rounded-2xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl">
            <img
              src={bunnyImageUrl(movie.backdropUrl || movie.posterUrl, 1200)}
              srcSet={bunnyImageSrcSet(movie.backdropUrl || movie.posterUrl, BACKDROP_WIDTHS)}
              sizes="(max-width: 1024px) 100vw, 55vw"
              alt={movie.title}
              width={1200}
              height={675}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="w-full lg:w-[45%] xl:w-[45%] flex flex-col pt-2 lg:pt-0">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-3 tracking-tight text-white">
            {movie.title}
          </h1>

          {/* Badges & Genres */}
          <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-4 lg:mb-6">
            <span className="px-3 py-1 lg:py-1.5 bg-[#00A8E1]/10 text-[#00A8E1] border border-[#00A8E1]/20 rounded-lg font-bold text-[11px] lg:text-[13px] tracking-wide">
              {movie.ageRating || 'U/A 13+'}
            </span>

            <div className="flex flex-wrap gap-2">
              {movie.genres
                ?.filter((genre) => genre.toLowerCase() !== 'action')
                .map((genre, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 lg:py-1.5 bg-white/5 rounded-lg text-[11px] lg:text-[13px] text-gray-300 font-bold tracking-wide"
                  >
                    {genre}
                  </span>
                ))}
            </div>
          </div>

          {/* Description */}
          <div className="max-w-2xl mb-6 lg:mb-8">
            <p className="text-[13px] lg:text-[14px] text-gray-300 font-medium leading-relaxed">
              {movie.description}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-row flex-nowrap gap-3 w-full lg:w-[90%] xl:w-[85%]">
            <Link
              to={`/player/${movie.id}`}
              onClick={handleWatchClick}
              className="flex-1 flex items-center justify-center px-4 py-3 lg:py-3.5 bg-white text-black text-[13px] lg:text-[15px] font-bold rounded-xl lg:rounded-[14px] hover:bg-gray-200 transition-all duration-300 hover:scale-105 cursor-pointer shadow-lg whitespace-nowrap"
            >
              <Play size={18} fill="currentColor" className="mr-2" />
              Watch now
            </Link>

            <button className="flex-1 flex items-center justify-center px-4 py-3 lg:py-3.5 bg-[#181a20] border border-white/5 text-white text-[13px] lg:text-[15px] font-bold rounded-xl lg:rounded-[14px] hover:bg-[#252830] transition-all duration-300 hover:scale-105 cursor-pointer whitespace-nowrap">
              <Plus size={18} className="mr-2" />
              Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* More Like This Section — reuses the same MovieRow/MovieCard used on
          the Home page so sizing, spacing, typography, and hover effects are
          identical instead of a duplicated, oversized custom grid. */}
      {related && related.length > 0 && (
        <div className="max-w-[1440px] mx-auto mt-10 lg:mt-16">
          <MovieRow title="More Like This" movies={related} cardType="square" />
        </div>
      )}
    </div>
  );
};

export default DetailPage;