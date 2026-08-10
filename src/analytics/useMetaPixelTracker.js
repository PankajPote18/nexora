import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { initializeMetaPixel } from './metaPixel';
import { trackPageView } from './metaEvents';
import { installAutoLinkTracking } from './autoLinkTracking';
import { hasMarketingConsent, CONSENT_CHANGED_EVENT } from './metaConsent';
import { captureFbclid } from './metaClickIds';
import { deferToIdle } from './deferToIdle';

// Same excluded paths as useAnalyticsTracker.js's GA/custom tracker, but
// kept as its own local constant rather than importing the other module's —
// this file has zero coupling to the GA tracking module, including its own
// separate StrictMode-dedup ref below.
const EXCLUDED_PREFIXES = ['/admin', '/analytics'];

function isExcluded(pathname) {
    return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function startMetaTracking() {
    if (!hasMarketingConsent()) return;
    // installAutoLinkTracking/captureFbclid are just listener setup + a URL
    // param read — cheap, stay immediate. initializeMetaPixel() is the one
    // that injects and executes fbevents.js (a real third-party script), so
    // it's the part deferred off the critical path (see deferToIdle.js).
    installAutoLinkTracking();
    captureFbclid();
    deferToIdle(initializeMetaPixel);
}

// Mounted once at the app root (see App.jsx's <MetaPixelBoundary />).
export function useMetaPixelTracker() {
    const location = useLocation();
    const lastTrackedKey = useRef(null);

    useEffect(() => {
        startMetaTracking();
        // If no consent banner has run yet, this is a no-op subscription;
        // once a real banner calls setMarketingConsent(true), init/auto-link
        // tracking start without needing a page reload.
        const handleConsentChange = (event) => {
            if (event.detail?.granted) startMetaTracking();
        };
        window.addEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
        return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
    }, []);

    useEffect(() => {
        if (isExcluded(location.pathname)) return;

        const key = `${location.pathname}${location.search}`;
        if (lastTrackedKey.current === key) return;
        lastTrackedKey.current = key;

        trackPageView();
    }, [location.pathname, location.search]);
}
