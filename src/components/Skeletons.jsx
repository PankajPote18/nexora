// Layout-matching loading placeholders. Each one reserves roughly the same
// space as the real content it precedes, so the swap from skeleton -> real
// content shifts the page as little as possible (CLS was measured before
// and after adding these — see project notes).

const RowSkeleton = ({ shape = 'square', count = 6 }) => (
  <div className="py-1 px-4 md:px-6 row-container">
    <div className="mb-1.5 md:mb-2 h-4 md:h-5 w-40 bg-white/10 rounded animate-pulse" />
    <div className="flex gap-2 md:gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex-shrink-0 bg-white/5 rounded-xl animate-pulse ${
            shape === 'rectangle'
              ? 'aspect-video w-[28%] sm:w-[22%] md:w-[16%] lg:w-[13%]'
              : 'aspect-square w-[22%] sm:w-[17%] md:w-[12%] lg:w-[10%]'
          }`}
        />
      ))}
    </div>
  </div>
);

export const HomeSkeleton = () => (
  <div className="w-full bg-bg-dark relative">
    {/* Matches HeroCarousel's default (desktop) heightClass so the real
        carousel mounting in its place doesn't resize this block. */}
    <div className="relative w-full h-[55vh] md:h-[65vh] lg:h-[68vh] mt-14 md:-mt-20 bg-white/5 rounded-2xl md:rounded-none animate-pulse" />
    <div className="flex flex-col gap-y-4 md:gap-y-6 relative z-20 pb-12 mt-4 md:mt-6">
      <RowSkeleton shape="rectangle" count={5} />
      <RowSkeleton shape="square" count={7} />
      <RowSkeleton shape="square" count={7} />
    </div>
  </div>
);

export const DetailSkeleton = () => (
  <div className="w-full bg-[#02040a] text-white pt-6 lg:pt-10 pb-16 px-4 lg:px-12 min-h-[calc(100vh-80px)]">
    <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-5 lg:gap-12">
      <div className="w-full lg:w-[55%] xl:w-[55%] shrink-0 flex justify-center lg:justify-start">
        <div className="w-full aspect-video bg-white/5 rounded-xl lg:rounded-2xl animate-pulse" />
      </div>
      <div className="w-full lg:w-[45%] xl:w-[45%] flex flex-col pt-2 lg:pt-0 gap-4">
        <div className="h-9 lg:h-12 w-3/4 bg-white/10 rounded-lg animate-pulse" />
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-7 w-16 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-7 w-16 bg-white/5 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-2 mt-1">
          <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 mt-2 w-full lg:w-[90%] xl:w-[85%]">
          <div className="h-12 lg:h-14 flex-1 bg-white/10 rounded-xl animate-pulse" />
          <div className="h-12 lg:h-14 flex-1 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
    <div className="max-w-[1440px] mx-auto mt-10 lg:mt-16">
      <RowSkeleton shape="square" count={7} />
    </div>
  </div>
);

// Player's container is already a fixed w-screen h-screen regardless of
// loading state, so this introduces no layout-shift risk — it's purely a
// perceived-speed improvement over a blank black screen.
export const PlayerSkeleton = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-black">
    <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
  </div>
);
