import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import MovieCard from './MovieCard';
import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';

const MovieRow = ({ title, movies, cardType = 'square' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  if (!movies || movies.length === 0) return null;

  // Determine Swiper view counts based on rectangle vs. square card proportions
  const isRectangle = cardType === 'rectangle';
  const slidesSettings = isRectangle
    ? {
      defaultSlides: 2.2,
      defaultGroup: 1,
      breakpoints: {
        320: { slidesPerView: 2.2, slidesPerGroup: 2, spaceBetween: 8 },
        480: { slidesPerView: 2.8, slidesPerGroup: 2, spaceBetween: 10 },
        640: { slidesPerView: 3.8, slidesPerGroup: 3, spaceBetween: 10 },
        768: { slidesPerView: 4.5, slidesPerGroup: 3, spaceBetween: 12 },
        1024: { slidesPerView: 5.5, slidesPerGroup: 4, spaceBetween: 12 },
        1280: { slidesPerView: 6.2, slidesPerGroup: 5, spaceBetween: 14 },
        1536: { slidesPerView: 7.2, slidesPerGroup: 6, spaceBetween: 16 },
      },
    }
    : {
      defaultSlides: 3.2,
      defaultGroup: 2,
      breakpoints: {
        320: { slidesPerView: 3.2, slidesPerGroup: 3, spaceBetween: 8 },
        480: { slidesPerView: 4.2, slidesPerGroup: 4, spaceBetween: 10 },
        640: { slidesPerView: 5.2, slidesPerGroup: 4, spaceBetween: 10 },
        768: { slidesPerView: 6.5, slidesPerGroup: 5, spaceBetween: 12 },
        1024: { slidesPerView: 7.5, slidesPerGroup: 6, spaceBetween: 12 },
        1280: { slidesPerView: 8.5, slidesPerGroup: 7, spaceBetween: 14 },
        1536: { slidesPerView: 9.5, slidesPerGroup: 8, spaceBetween: 16 },
      },
    };

  return (
    <div
      className="py-1 px-4 md:px-6 relative row-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-1.5 md:mb-2 w-full">
        <h2 className="text-base font-semibold md:text-lg text-white tracking-wide">{title}</h2>
        <Link to="#" className="text-brand hover:text-white transition-colors text-xs font-semibold flex items-center whitespace-nowrap flex-shrink-0">
          See All <ChevronRight size={12} className="ml-0.5" />
        </Link>
      </div>

      <div className="relative">
        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onBeforeInit={(swiper) => {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          slidesPerView={slidesSettings.defaultSlides}
          spaceBetween={12}
          slidesPerGroup={slidesSettings.defaultGroup}
          breakpoints={slidesSettings.breakpoints}
          className="!overflow-visible"
        >
          {movies.map((movie, index) => (
            <SwiperSlide key={movie.id} className="!h-auto py-2 !overflow-visible">
              <MovieCard
                movie={movie}
                cardType={cardType}
                rank={index + 1}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons (Desktop only) */}
        <button
          ref={prevRef}
          aria-label={`Previous ${title}`}
          className={`absolute top-0 bottom-0 left-[-20px] z-40 w-10 bg-black/60 hover:bg-black/95 hidden md:flex items-center justify-center text-white transition-opacity duration-300 backdrop-blur-sm rounded-l-xl cursor-pointer ${isHovered ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <ChevronLeft size={28} />
        </button>
        <button
          ref={nextRef}
          aria-label={`Next ${title}`}
          className={`absolute top-0 bottom-0 right-[-20px] z-40 w-10 bg-black/60 hover:bg-black/95 hidden md:flex items-center justify-center text-white transition-opacity duration-300 backdrop-blur-sm rounded-r-xl cursor-pointer ${isHovered ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
};

export default MovieRow;
