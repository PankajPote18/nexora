import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from './tracker';
import { loadGoogleAnalytics, loadGoogleTagManager, trackGaPageview } from './gaLoader';

// Paths this analytics module deliberately never tracks as visitor traffic:
// the admin CMS and the analytics dashboard itself — otherwise the site
// owner's own tool usage would pollute their own visitor data.
const EXCLUDED_PREFIXES = ['/admin', '/analytics'];

function isExcluded(pathname) {
    return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// Mounted once at the app root (see App.jsx's <AnalyticsBoundary />) — fires
// a pageview on first mount and again on every client-side route change,
// since this is an SPA and there's no full page load between routes for a
// traditional beacon to hook into.
export function useAnalyticsTracker() {
    const location = useLocation();
    // React (dev-mode StrictMode) double-invokes effects on mount as a
    // diagnostic — harmless for a typical read-only fetch-in-effect (this
    // codebase's usual pattern, see CLAUDE.md §5), but this effect *creates*
    // a pageview record each time it runs, so back-to-back invocations for
    // the exact same location would otherwise double-count it. This ref
    // only suppresses an immediate repeat of the same location — navigating
    // away and back to the same URL later still tracks normally.
    const lastTrackedKey = useRef(null);

    useEffect(() => {
        loadGoogleAnalytics();
        loadGoogleTagManager();
    }, []);

    useEffect(() => {
        if (isExcluded(location.pathname)) return;

        const key = `${location.pathname}${location.search}`;
        if (lastTrackedKey.current === key) return;
        lastTrackedKey.current = key;

        const url = `${window.location.origin}${location.pathname}${location.search}`;
        const title = document.title;
        trackPageview(url, title);
        trackGaPageview(url, title);
    }, [location.pathname, location.search]);
}
