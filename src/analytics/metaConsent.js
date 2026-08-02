// Consent gate for the Meta Pixel. No cookie-consent banner exists in this
// codebase today, so hasMarketingConsent() defaults to granted when nothing
// is stored — current behavior (pixel loads immediately) is preserved. When
// a real consent banner is built later, it just needs to call
// setMarketingConsent() before/after the user decides; nothing here needs
// to change for that integration to work.
const CONSENT_KEY = 'clickbuz_marketing_consent';
export const CONSENT_CHANGED_EVENT = 'clickbuz:consent-changed';

export function hasMarketingConsent() {
    try {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (stored === null) return true;
        return stored === 'granted';
    } catch {
        return true;
    }
}

export function setMarketingConsent(granted) {
    try {
        localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
    } catch {
        // storage full/disabled — the in-memory dispatch below still lets
        // anything listening this session react to the choice.
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: { granted } }));
    }
}
