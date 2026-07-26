// Bunny CDN's "Optimizer" add-on can resize images on the fly via
// ?width=/?quality= query params, so the browser downloads only the pixels
// actually needed for a given layout slot instead of the full uploaded
// original. CONFIRMED via direct curl testing against this project's real
// CDN pull zone (clickbuz-media.b-cdn.net): requesting an image with
// ?width=200 (and with ?class=optimized&width=200) returns the exact same
// Content-Length as the unparameterized original — Optimizer is NOT
// currently enabled. Appending these params today would do nothing (same
// bytes served) and would fragment the CDN cache (the same file cached
// under several different query-string keys for zero benefit).
//
// This file is therefore a no-op by default. To activate real responsive
// delivery once Optimizer is enabled (Bunny dashboard -> Pull Zone
// "clickbuz-media" -> Optimizer), set VITE_BUNNY_OPTIMIZER_ENABLED=true.
// `quality` is deliberately pinned high (100) — this only ever requests a
// smaller pixel width to match the display slot, it never re-encodes at
// lower fidelity.
const OPTIMIZER_ENABLED = import.meta.env.VITE_BUNNY_OPTIMIZER_ENABLED === 'true';

export const isBunnyOptimizerEnabled = () => OPTIMIZER_ENABLED;

const isBunnyUrl = (url) => typeof url === 'string' && /\.b-cdn\.net\//.test(url);

// Width-specific URL for a single size. Returns the original URL untouched
// when Optimizer is off or the URL isn't Bunny-hosted (e.g. Unsplash
// fallback images).
export const bunnyImageUrl = (url, width) => {
  if (!OPTIMIZER_ENABLED || !width || !isBunnyUrl(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('width', String(width));
    u.searchParams.set('quality', '100');
    return u.toString();
  } catch {
    return url;
  }
};

// `srcset` string across a set of widths — undefined (i.e. not rendered)
// whenever Optimizer is off, so the plain `src` is what the browser uses.
export const bunnyImageSrcSet = (url, widths) => {
  if (!OPTIMIZER_ENABLED || !isBunnyUrl(url) || !widths?.length) return undefined;
  return widths.map((w) => `${bunnyImageUrl(url, w)} ${w}w`).join(', ');
};
