import { useState, useEffect } from 'react';

import HeroCarousel from '../components/HeroCarousel';

import MovieRow from '../components/MovieRow';

const HomePage = () => {

  const [data, setData] = useState({
    hero: [],
    continueWatching: [],
    trays: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // 1. Instantly load from cache if available (0ms load time)

    const cachedData = localStorage.getItem('home_page_data_redesign');

    if (cachedData) {

      try {

        setData(JSON.parse(cachedData));

        setLoading(false);

      } catch (e) {

        console.error("Cache parsing error", e);

      }

    }

    // 2. Fetch fresh data in the background

    const fetchData = async () => {

      try {

        const [categoriesRes, moviesRes, heroBannersRes, traysRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/categories`, { cache: 'no-store' }),
          fetch(`${import.meta.env.VITE_API_URL}/api/movies`, { cache: 'no-store' }),
          fetch(`${import.meta.env.VITE_API_URL}/api/hero-banners`, { cache: 'no-store' }),
          fetch(`${import.meta.env.VITE_API_URL}/api/trays`, { cache: 'no-store' })
        ]);



        const movies = await moviesRes.json();

        // High-quality cinematic backgrounds for Hero Carousel

        const cinematicBackgrounds = [

          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop',

          'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop',

          'https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=2069&auto=format&fit=crop',

          'https://images.unsplash.com/photo-1604085572504-a392ddf0d86a?q=80&w=2126&auto=format&fit=crop',

          'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?q=80&w=2073&auto=format&fit=crop'

        ];

        const heroBanners = await heroBannersRes.json();
        
        let finalHero = [];
        if (Array.isArray(heroBanners) && heroBanners.length > 0) {
          finalHero = heroBanners
            .filter(b => b.status === true)
            .map(b => ({
              id: b.show_id,
              title: b.title,
              backdropUrl: b.image,
              posterUrl: b.image
            }));
        }

        // Fallback if no specific hero banners are found or active
        if (finalHero.length === 0) {
          const fallbackHeroMovies = movies.filter(m => m.category_id === 'hero').map((movie, index) => ({
            ...movie,
            backdropUrl: cinematicBackgrounds[index % cinematicBackgrounds.length]
          }));
          
          finalHero = fallbackHeroMovies.length > 0 ? fallbackHeroMovies : movies.slice(0, 5).map((movie, index) => ({
            ...movie,
            backdropUrl: cinematicBackgrounds[index % cinematicBackgrounds.length]
          }));
        }

        // 3. Continue Watching (IDs 11, 16, 17, 18, 19)

        const continueIds = ['11', '16', '17', '18', '19'];

        const continueWatching = movies.filter(m => continueIds.includes(m.id)).map(m => ({

          ...m,

          progress: m.id === '11' ? 80 : m.id === '16' ? 65 : m.id === '17' ? 50 : m.id === '18' ? 80 : 85,

          leftTime: m.id === '11' ? 'S1 E4 • 32m left' : m.id === '16' ? '1h 08m left' : m.id === '17' ? 'S2 E6 • 18m left' : m.id === '18' ? '42m left' : 'S1 E2 • 21m left'

        }));

        // Fallback for Continue Watching if empty

        if (continueWatching.length === 0) {

          movies.slice(5, 10).forEach((m, idx) => {

            continueWatching.push({

              ...m,

              progress: 30 + idx * 12,

              leftTime: `${15 + idx * 10}m left`

            });

          });

        }

        // Process Dynamic Trays from API
        const traysData = await traysRes.json();
        
        let dynamicTrays = [];
        if (Array.isArray(traysData) && traysData.length > 0) {
            dynamicTrays = traysData
                .filter(t => t.status === true)
                // sorting_position should already be sorted from backend, but ensuring it
                .sort((a, b) => a.sorting_position - b.sorting_position)
                .map(tray => {
                    const trayMovies = (tray.shows || [])
                        .map(id => movies.find(m => String(m.id) === String(id)))
                        .filter(m => m !== undefined);
                    return { ...tray, movies: trayMovies };
                });
        }

        const finalData = {
          hero: finalHero,
          continueWatching,
          trays: dynamicTrays
        };

        setData(finalData);

        localStorage.setItem('home_page_data_redesign', JSON.stringify(finalData));

      } catch (error) {

        console.error("Error fetching data:", error);

      } finally {

        setLoading(false);

      }

    };

    fetchData();

  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white text-xl bg-bg-dark">Loading...</div>;

  return (
    <div className="w-full bg-bg-dark relative">
      <HeroCarousel movies={data.hero} showSearch={true} />

      {/* Dynamic Rows aligned tight to hero without overlapping content */}
      <div className="flex flex-col gap-y-4 md:gap-y-6 relative z-20 pb-12 mt-4 md:mt-6">
        <MovieRow title="Continue Watching" movies={data.continueWatching} cardType="continue_watching" />
        
        {data.trays?.map((tray) => (
            <MovieRow 
                key={tray.id} 
                title={tray.title} 
                movies={tray.movies} 
                cardType={tray.shape} 
            />
        ))}

      </div>

    </div>

  );

};

export default HomePage;
