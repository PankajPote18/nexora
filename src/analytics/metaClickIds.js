// Captures Meta's click-id tracking tokens so the checkout flow
// (PlansPage.jsx) can send them to the backend for the server-side
// Conversions API mirror (see backend/utils/metaCapi.util.js). Separate from
// metaContext.js's per-event context builder since these need to persist
// across page views between landing and checkout, not just live on one call.
import { hasMarketingConsent } from './metaConsent';

const FBC_STORAGE_KEY = 'clickbuz_meta_fbc';

// Meta's own documented _fbc construction format: fb.1.<timestamp>.<fbclid>
// See https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc
export function captureFbclid() {
    if (typeof window === 'undefined' || !hasMarketingConsent()) return;

    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (!fbclid) return;

    try {
        window.localStorage.setItem(FBC_STORAGE_KEY, `fb.1.${Date.now()}.${fbclid}`);
    } catch {
        // storage full/disabled — nothing to persist, checkout will just
        // send no fbc for this session.
    }
}

export function getStoredFbc() {
    try {
        return window.localStorage.getItem(FBC_STORAGE_KEY) || null;
    } catch {
        return null;
    }
}

// Meta's own first-party _fbp cookie, set by fbevents.js once the Pixel
// loads (see metaPixel.js) — read directly since it may not exist yet if
// the user reaches checkout before the pixel script finishes loading.
export function getFbpCookie() {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
    return match ? match[1] : null;
}
