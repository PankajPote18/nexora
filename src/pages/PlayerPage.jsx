import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Settings, Play, Pause, RotateCcw, RotateCw, Maximize, Minimize, VideoOff } from 'lucide-react';
import { PlayerSkeleton } from '../components/Skeletons';

// Portrait-mode detection is read synchronously (both here and as the
// useState initializer below) instead of only inside a post-mount effect.
// Computing it in an effect meant the very first paint always used the
// normal (non-rotated) layout, then flipped to the fixed/rotated one a
// frame later on any portrait mobile device — a huge, measured layout
// shift (CLS ~0.5) for a transition that has nothing to do with data
// loading. The rotated layout is now correct from the first render;
// resize/orientationchange are still tracked live for actual device
// rotation, unchanged.
const computeIsPortrait = () => {
  if (typeof window === 'undefined') return false;
  const isMobile = window.innerWidth < 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  return isMobile && window.innerHeight > window.innerWidth;
};

// iPadOS 13+ reports as "Macintosh" in the UA string but is still a touch
// device with no mouse — the maxTouchPoints check catches that case too.
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// Real touch hardware only — deliberately NOT the same "narrow viewport"
// heuristic used elsewhere (computeIsPortrait's isMobile check). That looser
// check treats any window under 1024px as "mobile", which also matches a
// mouse-only laptop with its browser window simply narrowed — a device that
// has a fixed, non-rotating screen. Attempting fullscreen + orientation
// lock there always throws NotSupportedError (no orientation hardware to
// lock), which was showing up as a scary console error for exactly that
// case. Only genuine touch devices get the fullscreen/landscape treatment;
// desktop/laptop playback (per the original intent) stays untouched.
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

const PlayerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [movie, setMovie] = useState(null);
  const [isLoadingMovie, setIsLoadingMovie] = useState(true);
  const [isPortrait, setIsPortrait] = useState(computeIsPortrait);
  const controlsTimeoutRef = useRef(null);

  const hasVideo = Boolean(movie?.videoUrl);

  // Keep tracking live orientation/resize changes — the initial value is
  // now already correct (see computeIsPortrait above), so this only needs
  // to react to changes after mount.
  useEffect(() => {
    const checkOrientation = () => setIsPortrait(computeIsPortrait());

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Fetch the movie record — the only source of truth for videoUrl. No
  // hardcoded/sample video is ever used as a fallback (see hasVideo above).
  useEffect(() => {
    const fetchMovie = async () => {
      setIsLoadingMovie(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/movies/${id}`);
        if (response.ok) {
          const data = await response.json();
          setMovie(data);
        }
      } catch (error) {
        console.error("Error fetching movie:", error);
      } finally {
        setIsLoadingMovie(false);
      }
    };
    fetchMovie();
  }, [id]);

  // Handle controls visibility timeout
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Enters fullscreen and (where supported) locks landscape orientation.
  // Falls back gracefully across browsers:
  // - iOS Safari first, specifically: screen.orientation.lock() exists
  //   there as a stub but always rejects with NotSupportedError (Apple
  //   never implemented it — web content can't force orientation), and
  //   Safari's generic Element.requestFullscreen() on our custom UI
  //   container doesn't auto-rotate the way native video fullscreen does.
  //   The video element's own webkitEnterFullscreen() is the only path
  //   that reliably lands in landscape on iOS — its native fullscreen
  //   video player rotates to match the video's own orientation on its
  //   own, with no orientation-lock call needed or possible. Modern iOS
  //   Safari *does* define Element.requestFullscreen now, so without this
  //   explicit check first, the generic path below would be taken instead
  //   and silently stay portrait.
  // - Standard Fullscreen API (Chrome/Firefox/Edge, desktop and Android).
  // - Vendor-prefixed webkitRequestFullscreen (older WebKit).
  // - Any other browser without a video-level fullscreen fallback either:
  //   no-op, playback just continues un-rotated.
  const enterFullscreenLandscape = async () => {
    const container = containerRef.current;
    const video = videoRef.current;

    if (isIOS() && video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }

    try {
      if (container?.requestFullscreen) {
        await container.requestFullscreen();
      } else if (container?.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
        return;
      } else {
        return;
      }
    } catch (err) {
      console.log("Fullscreen request failed:", err);
      return;
    }

    if (screen.orientation?.lock) {
      try {
        await screen.orientation.lock("landscape");
      } catch {
        // Expected on a lot of real hardware even now that we're in
        // fullscreen on a genuine touch device (isTouchDevice() already
        // filtered out mouse-only laptops before this ever runs) — some
        // Android WebViews/browsers simply don't implement this API. The
        // CSS-based rotation below (isPortrait/portraitStyles) is what
        // actually guarantees the visual landscape layout on a portrait
        // phone; this call is a bonus that also locks against the OS
        // rotating it back, when the platform supports it. Not logged as an
        // error — it's a known, unactionable platform gap, not a bug.
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      // Fullscreen/orientation-lock must be requested synchronously inside
      // this click/tap handler, not deferred to the video's `play` event —
      // browsers only honor those APIs while "user activation" from the
      // gesture that triggered this handler is still active, and that
      // activation window is gone by the time an async DOM event like
      // `play` fires later. enterFullscreenLandscape() is an async function,
      // but calling it (without awaiting) still issues its first
      // requestFullscreen()/webkitEnterFullscreen() call synchronously here,
      // which is what actually matters.
      if (isTouchDevice() && !document.fullscreenElement) {
        enterFullscreenLandscape();
      }
      videoRef.current.play();
    }
    // isPlaying itself is updated by the video's onPlay/onPause handlers
    // below, not here — play() is async (it returns a Promise, and can be
    // rejected/blocked), so the DOM event is the only reliable signal that
    // playback actually started.
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
      setCurrentTime(formatTime(current));
      setDuration(formatTime(total - current)); // Remaining time
    }
  };

  const handleSeek = (e) => {
    const newTime = (e.target.value / 100) * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    setProgress(e.target.value);
  };

  const skip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      enterFullscreenLandscape();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        try {
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
        } catch (err) {
          console.log(err);
        }
      }
      // No lock() call here on the isFull branch — that already happens
      // once, directly inside enterFullscreenLandscape right after
      // fullscreen is granted. Calling it again here (on the fullscreenchange
      // event that same requestFullscreen() call itself fires) raced a
      // second, overlapping lock() request against the first and aborted it
      // (AbortError: "canceled this call").
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Exit fullscreen / unlock orientation on unmount (leaving the player).
  // There used to also be an immediate screen.orientation.lock("landscape")
  // call here on mount — that can never succeed (the document isn't in
  // fullscreen yet at mount time, which orientation lock requires almost
  // everywhere) and only produced a guaranteed console error on every page
  // load. The real lock happens in enterFullscreenLandscape, once fullscreen
  // has actually been granted, triggered by the video's play event.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (err) {
        console.log(err);
      }
    };
  }, []);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const portraitStyles = isPortrait ? {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '100vh',
    height: '100vw',
    transform: 'translate(-50%, -50%) rotate(90deg)',
    transformOrigin: 'center',
    zIndex: 9999,
    overflow: 'hidden',
  } : {};

  return (
    <div
      ref={containerRef}
      style={portraitStyles}
      className="relative w-screen h-screen bg-black overflow-hidden select-none"
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* HTML5 Video — only rendered when the movie actually has a Bunny CDN
          videoUrl. No sample/fallback video is ever used. */}
      {hasVideo && (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={movie.videoUrl}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
          playsInline
        >
          Your browser does not support the video tag.
        </video>
      )}

      {/* Loading placeholder — same fixed-size container either way, so
          swapping it out for the video/empty-state carries no CLS risk. */}
      {isLoadingMovie && <PlayerSkeleton />}

      {/* Empty state — shown once the movie has loaded and has no videoUrl */}
      {!hasVideo && !isLoadingMovie && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 rounded-full bg-[#090d16] border border-gray-800 flex items-center justify-center mb-6">
            <VideoOff size={36} className="text-gray-500" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Video not available</h2>
          <p className="text-gray-400 text-sm max-w-sm">This movie does not have a video yet. Please check back later.</p>
        </div>
      )}

      {/* Top Bar — always visible (loading, empty, and playing states). z-20
          so it stays above the Playback Controls Overlay below: that
          overlay's "Center Controls" div stretches via flex-1 to fill the
          space between the top bar and the bottom bar (it's the only
          flex-growing child of a justify-between column), which put an
          invisible click-catching area directly over the close/settings
          buttons whenever both shared the same z-10 — the later one in DOM
          order (the overlay) was winning the tie and swallowing the click. */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6">
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none -z-10"></div>
        <div className="flex items-center space-x-6">
          <button onClick={() => navigate(`/movie/${id}`)} className="text-white hover:text-gray-300 transition p-2">
            <X size={32} />
          </button>
          <div className="flex flex-col ml-4">
            <h1 className="text-white text-xl font-bold">{movie ? movie.title : 'Loading...'}</h1>
          </div>
        </div>
        {hasVideo && (
          <div className="flex items-center space-x-6">
            <button className="text-white hover:text-gray-300 transition p-2">
              <Settings size={28} />
            </button>
          </div>
        )}
      </div>

      {/* Playback Controls Overlay — only meaningful when a video is playing */}
      {hasVideo && (
        <div
          className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Bottom Gradient */}
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"></div>

          {/* Center Controls */}
          <div className="relative z-10 flex-1 flex items-center justify-center space-x-12">
            <button
              onClick={() => skip(-10)}
              className="text-white hover:text-gray-300 hover:scale-110 transition-transform p-4 relative"
            >
              <RotateCcw size={48} strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold mt-1">10</span>
            </button>

            <button
              onClick={togglePlay}
              className="w-24 h-24 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause size={48} fill="currentColor" />
              ) : (
                <Play size={48} fill="currentColor" className="ml-2" />
              )}
            </button>

            <button
              onClick={() => skip(10)}
              className="text-white hover:text-gray-300 hover:scale-110 transition-transform p-4 relative"
            >
              <RotateCw size={48} strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold mt-1">10</span>
            </button>
          </div>

          {/* Bottom Bar */}
          <div className="relative z-10 px-8 pb-8 flex flex-col">
            {/* Progress Bar Container */}
            <div className="flex items-center space-x-4 mb-2">
              <span className="text-white text-sm font-medium w-12 text-center">{currentTime}</span>

              <div className="flex-grow relative group cursor-pointer h-6 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden relative z-10">
                  <div
                    className="h-full bg-[#00A8E1] transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                {/* Scrub thumb */}
                <div
                  className="absolute w-4 h-4 bg-white rounded-full z-10 shadow transition-transform group-hover:scale-125"
                  style={{ left: `calc(${progress}% - 8px)` }}
                ></div>
              </div>

              <span className="text-gray-300 text-sm font-medium w-16 text-center">-{duration}</span>

              <button onClick={toggleFullscreen} className="text-white hover:text-gray-300 ml-4">
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerPage;
