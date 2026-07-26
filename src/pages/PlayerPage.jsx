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
  // - Standard Fullscreen API (Chrome/Firefox/Edge, desktop and Android).
  // - Vendor-prefixed webkitRequestFullscreen (older WebKit).
  // - iOS Safari doesn't support the Fullscreen API on arbitrary elements —
  //   only <video> itself supports native fullscreen there — so as a last
  //   resort we use the video element's own webkitEnterFullscreen(). iOS also
  //   has no Screen Orientation lock API at all, so orientation lock is
  //   skipped entirely in that case rather than throwing.
  const enterFullscreenLandscape = async () => {
    const container = containerRef.current;
    const video = videoRef.current;

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
      } catch (err) {
        console.log("Orientation lock failed or not supported:", err);
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
        // Auto fullscreen + landscape on mobile only — desktop/laptop
        // playback is untouched.
        const isMobile = window.innerWidth < 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isMobile && !document.fullscreenElement) {
          enterFullscreenLandscape();
        }
      }
      setIsPlaying(!isPlaying);
    }
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
      } else {
        try {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(err => console.log("Orientation lock failed:", err));
          }
        } catch (err) {
          console.log(err);
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Attempt to lock screen orientation to landscape on mobile
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock("landscape");
        }
      } catch (err) {
        console.log("Orientation lock failed or not supported on load:", err);
      }
    };
    lockOrientation();

    return () => {
      // Exit fullscreen if still active
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

      {/* Top Bar — always visible (loading, empty, and playing states) */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-6">
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
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-1">10</span>
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
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-1">10</span>
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
