import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bunnyImageUrl, bunnyImageSrcSet } from '../utils/bunnyImage';
import { prefetchDetailPage } from '../utils/prefetch';

const CARD_WIDTHS = [320, 480, 640];
const CARD_SIZES = '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);

  // Using existing movie endpoint for now, fetching everything and filtering locally
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/movies`);
        const data = await response.json();
        setMovies(data);
      } catch (error) {
        console.error("Error fetching movies for search:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const filteredMovies = query 
    ? movies.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
    : movies.slice(0, 24); // Show some defaults initially

  return (
    <div className="w-full bg-bg-dark pt-16 md:pt-24 px-4 md:px-12 pb-16 min-h-[calc(100vh-80px)]">
      
      <div className="max-w-7xl mx-auto">
        {/* Search Input Area */}
        <div className="max-w-4xl mb-8 md:mb-12 mt-2 md:mt-0">
          <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-[#00A8E1]/40 focus-within:bg-white/10 rounded-full px-5 py-3.5 transition-all duration-300">
            <div className="text-gray-400 mr-3.5">
              <Search size={22} />
            </div>
            <input 
              type="text"
              placeholder="Search movies, web series, genres..."
              className="w-full bg-transparent text-white text-lg outline-none placeholder-gray-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        {/* Results / Recommended Grid */}
        <div>
          <h2 className="text-gray-400 font-bold tracking-widest text-sm uppercase mb-6">
            {query ? 'Search Results' : 'Recommended'}
          </h2>
          
          {loading ? (
            <div className="text-white">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredMovies.map((movie) => (
                <Link
                  to={`/movie/${movie.id}`}
                  key={movie.id}
                  className="flex flex-col group cursor-pointer"
                  onMouseEnter={prefetchDetailPage}
                  onFocus={prefetchDetailPage}
                  onTouchStart={prefetchDetailPage}
                >
                  {/* Video Aspect Card */}
                  <div className="aspect-video bg-bg-card rounded-xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center mb-2.5 transition-all duration-300 group-hover:scale-105 group-hover:border-[#00A8E1]/30 group-hover:shadow-xl shadow-black/80">
                    <img
                      src={bunnyImageUrl(movie.backdropUrl || movie.posterUrl, 640)}
                      srcSet={bunnyImageSrcSet(movie.backdropUrl || movie.posterUrl, CARD_WIDTHS)}
                      sizes={CARD_SIZES}
                      alt={movie.title}
                      width={640}
                      height={360}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="auto"
                      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=640&auto=format&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent z-10"></div>
                  </div>
                  
                  {/* Title and Subtitle */}
                  <h3 className="text-white font-bold text-sm truncate group-hover:text-[#00A8E1] transition-colors">{movie.title}</h3>
                  <p className="text-gray-400 text-xs mt-0.5">{movie.year} • {movie.duration?.includes('Season') ? 'Show' : 'Movie'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default SearchPage;
