// Captures the affiliate/marketing partner's per-click `click_id` query
// param (TrafficMedia24 integration — see backend/utils/affiliatePostback.util.js
// and CLAUDE.md §26) so it survives navigation from landing to checkout,
// where the backend needs it to fire the S2S conversion postback.
//
// This is NOT the same thing as:
//   - visitor_id (src/analytics/tracker.js) — this app's own internal
//     analytics identifier, one per browser, unrelated to any affiliate.
//   - MARKETING_CLICK_ID (backend/.env, CLAUDE.md §25) — ONE static,
//     integration-level id generated once by us and given to marketing; it
//     is never read from a request and never varies per visitor.
// Never conflate any of the three. This module only ever reads/writes the
// one storage key below.
const CLICK_ID_STORAGE_KEY = 'clickbuz_affiliate_click_id';

// Affiliate click ids are opaque partner-generated tokens — restrict to a
// conservative, URL-safe charset so a malformed/hostile value can never
// reach the outbound postback URL unescaped-looking or absurdly long.
const CLICK_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function safeGet(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSet(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // storage full/disabled — nothing to persist; checkout will just
        // proceed with no click_id for this visit.
    }
}

export function isValidClickId(value) {
    return typeof value === 'string' && CLICK_ID_RE.test(value);
}

// Called once on app mount and (deliberately) again on every route change —
// cheap (a URL param read + one localStorage write) and only ever acts when
// the current URL actually carries a `click_id`, so it's safe to call
// unconditionally without needing its own separate wiring. Overwrites any
// previously stored value on purpose: a URL that arrives with a fresh
// click_id is itself the authoritative, current signal from the partner —
// same convention this codebase already uses for Meta's fbclid capture (see
// captureFbclid in metaClickIds.js). If the URL has no click_id at all, the
// previously stored value (if any) is left untouched so it survives
// onward navigation within the same visit.
export function captureClickId() {
    if (typeof window === 'undefined') return;

    const raw = new URLSearchParams(window.location.search).get('click_id');
    if (!raw) return;

    if (!isValidClickId(raw)) {
        console.warn('[AffiliateClickId] Ignoring malformed click_id query param');
        return;
    }

    safeSet(CLICK_ID_STORAGE_KEY, raw);
}

// Read back at checkout time (PlansPage.jsx) to send along with
// POST /api/payments/create. Re-validated on read as defense in depth
// against anything that could have written to this key outside
// captureClickId() (e.g. directly via devtools).
export function getStoredClickId() {
    const value = safeGet(CLICK_ID_STORAGE_KEY);
    return isValidClickId(value) ? value : null;
}
