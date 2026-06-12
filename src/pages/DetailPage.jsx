import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Plus } from 'lucide-react';
import { usePremiumModal } from '../context/PremiumModalContext';

const DetailPage = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showModal } = usePremiumModal();

  const handleWatchClick = (e) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.isSubscribed) {
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

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchMovie = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/movies/${id}`);
        if (!response.ok) {
          throw new Error("Movie not found");
        }
        const data = await response.json();

        setMovie(data);

        // If the backend doesn't return related movies, fetch all and pick 6
        if (data.related && data.related.length > 0) {
          setRelated(data.related);
        } else {
          try {
            const allRes = await fetch(`${import.meta.env.VITE_API_URL}/api/movies`);
            if (allRes.ok) {
              const allMovies = await allRes.json();
              // Filter out the current movie and take up to 6
              const filtered = allMovies.filter(m => m.id.toString() !== id.toString());
              setRelated(filtered.slice(0, 6));
            }
          } catch (err) {
            console.error("Could not fetch related fallback:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching movie details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center text-xl">Loading...</div>;
  if (!movie) return <div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center text-xl">Movie not found</div>;

  return (
    <div className="w-full bg-[#02040a] text-white pt-6 lg:pt-10 pb-16 px-4 lg:px-12 min-h-[calc(100vh-80px)]">
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-5 lg:gap-12">

        {/* Left Column: Poster Card */}
        <div className="w-full lg:w-[55%] xl:w-[55%] shrink-0 flex justify-center lg:justify-start">
          <div className="w-full aspect-video bg-[#090d16] rounded-xl lg:rounded-2xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl">
            <img
              src={movie.backdropUrl || movie.posterUrl}
              alt={movie.title}
              className="absolute inset-0 w-full h-full object-cover"
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

      {/* More Like This Section */}
      {related && related.length > 0 && (
        <div className="max-w-[1440px] mx-auto mt-10 lg:mt-16">
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <h2 className="text-gray-400 font-bold tracking-[0.15em] text-sm lg:text-[15px] uppercase">MORE LIKE THIS</h2>
            <button className="text-[#00A8E1] text-[13px] lg:text-[15px] font-bold hover:text-[#33bbf2] transition cursor-pointer">See all</button>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-8">
            {related.map((relMovie, idx) => (
              <div key={idx} className="flex flex-col group cursor-pointer">
                <div className="aspect-square bg-[#090d16] rounded-[16px] overflow-hidden relative mb-3 lg:mb-4 transition-transform duration-300 group-hover:scale-105 shadow-lg">
                  <img src={relMovie.backdropUrl || relMovie.posterUrl} alt={relMovie.title} className="absolute inset-0 w-full h-full object-cover" />
                </div>

                <h3 className="text-white font-bold text-[13px] lg:text-[15px] truncate group-hover:text-[#00A8E1] transition-colors">{relMovie.title}</h3>
                <p className="text-gray-400 text-[11px] lg:text-[13px] mt-1 font-medium">{relMovie.year} • {relMovie.genres?.[0] || 'Drama'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPage;