import { Link } from 'react-router-dom';
import { Play, MoreVertical } from 'lucide-react';
import { bunnyImageUrl, bunnyImageSrcSet } from '../utils/bunnyImage';
import { prefetchDetailPage } from '../utils/prefetch';

// Reference widths for each card shape — matches how large the card
// actually renders across MovieRow's breakpoints (see MovieRow.jsx), so the
// srcset never offers a size bigger than what could ever be displayed.
const RECT_WIDTHS = [320, 480, 640];
const RECT_SIZES = '(max-width: 480px) 45vw, (max-width: 768px) 22vw, (max-width: 1280px) 16vw, 14vw';
const SQUARE_WIDTHS = [220, 300, 400];
const SQUARE_SIZES = '(max-width: 480px) 30vw, (max-width: 768px) 15vw, 12vw';

const MovieCard = ({ movie, cardType = 'square', rank = 1 }) => {
  // Layout 1: Continue Watching (Rectangle aspect-video with Progress Bar)
  if (cardType === 'continue_watching') {
    const mockProgress = movie.progress || (20 + (movie.id * 17) % 65);
    const mockLeftTime = movie.leftTime || `${12 + (movie.id * 9) % 38}m left`;

    return (
      <Link
        to={`/movie/${movie.id}`}
        className="block w-full group relative"
        onMouseEnter={prefetchDetailPage}
        onFocus={prefetchDetailPage}
        onTouchStart={prefetchDetailPage}
      >
        <div
          className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/5 transition-transform duration-300 ease-out shadow-md group-hover:scale-[1.04] group-hover:z-20 group-hover:border-[#00A8E1]/40 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.8),0_0_15px_rgba(0,168,225,0.15)]"
        >
          <img
            src={bunnyImageUrl(movie.backdropUrl || movie.posterUrl, 640)}
            srcSet={bunnyImageSrcSet(movie.backdropUrl || movie.posterUrl, RECT_WIDTHS)}
            sizes={RECT_SIZES}
            alt={movie.title}
            width={640}
            height={360}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            fetchPriority="auto"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=640&auto=format&fit=crop';
            }}
          />

          {/* Always Visible Play Button at Bottom-Left */}
          <div className="absolute bottom-2 left-2 z-20">
            <div className="w-8 h-8 rounded-full bg-black/50 border border-white/30 text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
              <Play size={10} className="ml-0.5 text-white" fill="currentColor" />
            </div>
          </div>

          {/* Progress Bar at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10 overflow-hidden">
            <div
              className="h-full bg-[#00A8E1] transition-all duration-500"
              style={{ width: `${mockProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Title, leftTime and Dot Menu */}
        <div className="mt-1.5 flex items-start justify-between px-1">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-[11px] md:text-[12px] font-semibold text-white truncate group-hover:text-[#00A8E1] transition-colors">{movie.title}</h3>
            <p className="text-[9px] md:text-[10px] text-gray-400 mt-0.5 truncate">{mockLeftTime}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-full transition-colors cursor-pointer"
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </Link>
    );
  }

  // Layout 1B: Standard Rectangle (aspect-video WITHOUT progress bar)
  if (cardType === 'rectangle') {
    return (
      <Link
        to={`/movie/${movie.id}`}
        className="block w-full group relative"
        onMouseEnter={prefetchDetailPage}
        onFocus={prefetchDetailPage}
        onTouchStart={prefetchDetailPage}
      >
        <div
          className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/5 transition-transform duration-300 ease-out shadow-md group-hover:scale-[1.04] group-hover:z-20 group-hover:border-[#00A8E1]/40 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.8),0_0_15px_rgba(0,168,225,0.15)]"
        >
          <img
            src={bunnyImageUrl(movie.backdropUrl || movie.posterUrl, 640)}
            srcSet={bunnyImageSrcSet(movie.backdropUrl || movie.posterUrl, RECT_WIDTHS)}
            sizes={RECT_SIZES}
            alt={movie.title}
            width={640}
            height={360}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            fetchPriority="auto"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=640&auto=format&fit=crop';
            }}
          />

          {/* Title Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-3 transition-opacity duration-300 z-20">
            <span className="text-[#00A8E1] text-[9px] font-bold uppercase tracking-wider mb-0.5">
              {movie.category || movie.genre || 'SHOW'}
            </span>
            <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">
              {movie.title}
            </h4>
          </div>
        </div>

        <div className="mt-1.5 px-1 text-gray-300 font-semibold text-[11px] md:text-[12px] truncate group-hover:text-[#00A8E1] transition-colors">
          {movie.title}
        </div>
      </Link>
    );
  }

  // Layout 2: Trending Now (Square aspect-square with Overlapping Number)
  if (cardType === 'trending') {
    return (
      <Link
        to={`/movie/${movie.id}`}
        className="block w-full group relative mt-2 md:mt-0"
        onMouseEnter={prefetchDetailPage}
        onFocus={prefetchDetailPage}
        onTouchStart={prefetchDetailPage}
      >
        {/* Large overlay Rank Number */}
        <div
          className="absolute -left-3 bottom-0 md:-left-6 md:bottom-3 z-20 text-6xl sm:text-[90px] font-black select-none pointer-events-none tracking-tighter leading-none"
          style={{
            WebkitTextStroke: '2px rgba(255,255,255,0.45)',
            color: '#02040a',
            textShadow: '0 0 10px rgba(0,0,0,0.8)'
          }}
        >
          {rank}
        </div>

        <div
          className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900 border border-white/5 transition-transform duration-300 ease-out z-10 shadow-md group-hover:scale-[1.04] group-hover:z-30 group-hover:border-[#00A8E1]/40 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.8),0_0_15px_rgba(0,168,225,0.15)]"
        >
          <img
            src={bunnyImageUrl(movie.posterUrl, 400)}
            srcSet={bunnyImageSrcSet(movie.posterUrl, SQUARE_WIDTHS)}
            sizes={SQUARE_SIZES}
            alt={movie.title}
            width={400}
            height={400}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            fetchPriority="auto"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=480&auto=format&fit=crop';
            }}
          />


          {/* Title Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-3 transition-opacity duration-300 z-20">
            <span className="text-[#00A8E1] text-[9px] font-bold uppercase tracking-wider mb-0.5">
              {movie.category || movie.genre || 'TRENDING'}
            </span>
            <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">
              {movie.title}
            </h4>
          </div>
        </div>

        <div className="mt-1.5 px-1 text-gray-300 font-semibold text-[11px] md:text-[12px] truncate group-hover:text-[#00A8E1] transition-colors relative z-10">
          {movie.title}
        </div>
      </Link>
    );
  }

  // Layout 3: Standard Square (Square aspect-square)
  const isNewMovie = movie.isNew || movie.id % 4 === 0;

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="block w-full group relative"
      onMouseEnter={prefetchDetailPage}
      onFocus={prefetchDetailPage}
      onTouchStart={prefetchDetailPage}
    >
      <div
        className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900 border border-white/5 transition-transform duration-300 ease-out shadow-md group-hover:scale-[1.04] group-hover:z-20 group-hover:border-[#00A8E1]/40 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.8),0_0_15px_rgba(0,168,225,0.15)]"
      >
        <img
          src={bunnyImageUrl(movie.posterUrl, 400)}
          srcSet={bunnyImageSrcSet(movie.posterUrl, SQUARE_WIDTHS)}
          sizes={SQUARE_SIZES}
          alt={movie.title}
          width={400}
          height={400}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          fetchPriority="auto"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=480&auto=format&fit=crop';
          }}
        />


        {/* Title Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-3 transition-opacity duration-300 z-20">
          <span className="text-[#00A8E1] text-[9px] font-bold uppercase tracking-wider mb-0.5">
            {movie.category || movie.genre || 'SHOW'}
          </span>
          <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">
            {movie.title}
          </h4>
        </div>
      </div>

      <div className="mt-1.5 px-1 text-gray-300 font-semibold text-[11px] md:text-[12px] truncate group-hover:text-[#00A8E1] transition-colors">
        {movie.title}
      </div>
    </Link>
  );
};

export default MovieCard;
