import { useState, useEffect } from 'react';

import HeroCarousel from '../components/HeroCarousel';

import MovieRow from '../components/MovieRow';
import { HomeSkeleton } from '../components/Skeletons';
import { moviesApi } from '../services/api';

const EMPTY_DATA = { hero: [], continueWatching: [], trays: [] };

// Read the cache synchronously in the initializer (not in an effect) so a
// repeat visit paints the previous page instantly on the very first render
// instead of guaranteeing one "Loading…" frame before the effect runs.
const readCachedData = () => {
  try {
    const cached = localStorage.getItem('home_page_data_redesign');
    return cached ? JSON.parse(cached) : EMPTY_DATA;
  } catch (e) {
    console.error("Cache parsing error", e);
    return EMPTY_DATA;
  }
};

const HomePage = () => {

  const [data, setData] = useState(readCachedData);

  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('home_page_data_redesign');
    } catch (e) {
      return true;
    }
  });

  // DetailPage/PlayerPage are route-split out of the initial bundle (see
  // App.jsx) so a first-time visitor to "/" doesn't pay for them upfront.
  // Rather than blanket-prefetching both from here on idle (which measurably
  // hurt Lighthouse's TTI — the background chunk fetches kept resetting the
  // "quiet network" window that metric waits for), each card now prefetches
  // DetailPage itself on hover/focus (see MovieCard.jsx), and DetailPage
  // prefetches PlayerPage once it's actually opened (see DetailPage.jsx).

  useEffect(() => {

    // 1. Cache (if any) is already painted from the useState initializer.

    // 2. Fetch fresh data in the background

    const fetchData = async () => {

      try {

        // Hero banners and trays are small, bounded lists — fetch them first
        // (server-side ?active=1 filtering instead of pulling every inactive
        // row just to discard it client-side) so we know exactly which movie
        // ids the rest of the page actually needs before fetching any movies.
        const [heroBannersRes, traysRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/hero-banners?active=1`, { cache: 'no-store' }),
          fetch(`${import.meta.env.VITE_API_URL}/api/trays?active=1`, { cache: 'no-store' })
        ]);

        // High-quality cinematic backgrounds for Hero Carousel

        const cinematicBackgrounds = [

          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop',

          'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop',

          'https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=2069&auto=format&fit=crop',

          'https://images.unsplash.com/photo-1604085572504-a392ddf0d86a?q=80&w=2126&auto=format&fit=crop',

          'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?q=80&w=2073&auto=format&fit=crop'

        ];

        const heroBanners = await heroBannersRes.json();
        const traysData = await traysRes.json();

        // Exactly the movie ids the rest of this page needs — hardcoded
        // "Continue Watching" ids plus every id referenced by an active tray
        // — batch-fetched in one bounded request instead of pulling the
        // entire catalog.
        const continueIds = ['11', '16', '17', '18', '19'];
        const trayShowIds = Array.isArray(traysData)
          ? traysData.flatMap((t) => t.shows || [])
          : [];
        const neededIds = [...new Set([...continueIds, ...trayShowIds].map(String))];

        const moviesRes = neededIds.length > 0
          ? await moviesApi.getAll({ ids: neededIds })
          : { data: [] };
        const movies = moviesRes.data;
        const moviesById = new Map(movies.map((m) => [String(m.id), m]));

        let finalHero = [];
        if (Array.isArray(heroBanners) && heroBanners.length > 0) {
          finalHero = heroBanners.map(b => ({
            id: b.show_id,
            title: b.title,
            backdropUrl: b.image,
            posterUrl: b.image
          }));
        }

        // Fallback if no active hero banners are configured — pull a small,
        // bounded set of movies instead of filtering the whole catalog.
        if (finalHero.length === 0) {
          const heroRes = await moviesApi.getAll({ category_id: 'hero', limit: 5 });
          const fallbackMovies = heroRes.data.length > 0
            ? heroRes.data
            : (await moviesApi.getAll({ limit: 5 })).data;

          finalHero = fallbackMovies.map((movie, index) => ({
            ...movie,
            backdropUrl: cinematicBackgrounds[index % cinematicBackgrounds.length]
          }));
        }

        // Continue Watching (IDs 11, 16, 17, 18, 19)

        const continueWatching = continueIds
          .map((id) => moviesById.get(id))
          .filter((m) => m !== undefined)
          .map(m => ({

            ...m,

            progress: m.id === '11' ? 80 : m.id === '16' ? 65 : m.id === '17' ? 50 : m.id === '18' ? 80 : 85,

            leftTime: m.id === '11' ? 'S1 E4 • 32m left' : m.id === '16' ? '1h 08m left' : m.id === '17' ? 'S2 E6 • 18m left' : m.id === '18' ? '42m left' : 'S1 E2 • 21m left'

          }));

        // Fallback for Continue Watching if none of the hardcoded ids exist
        // — a small bounded fetch (not the full catalog) standing in for
        // "some other movies", same as before.
        if (continueWatching.length === 0) {
          const fallbackRes = await moviesApi.getAll({ page: 2, limit: 5 });
          fallbackRes.data.forEach((m, idx) => {
            continueWatching.push({
              ...m,
              progress: 30 + idx * 12,
              leftTime: `${15 + idx * 10}m left`
            });
          });
        }

        // Process Dynamic Trays from API

        let dynamicTrays = [];
        if (Array.isArray(traysData) && traysData.length > 0) {
            dynamicTrays = traysData
                // sorting_position should already be sorted from backend, but ensuring it
                .sort((a, b) => a.sorting_position - b.sorting_position)
                .map(tray => {
                    const trayMovies = (tray.shows || [])
                        .map(id => moviesById.get(String(id)))
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

  if (loading) return <HomeSkeleton />;

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
