// Small, provider-agnostic dispatch layer. Not Meta-specific — any tracking
// provider (Meta today, GA/GTM/custom analytics potentially later) can call
// registerProvider() and start receiving pageView()/event() calls without
// this file changing. Only the Meta provider is registered today; existing
// GA/GTM/custom-analytics wiring (useAnalyticsTracker.js) is untouched and
// keeps working exactly as it does now.
import { buildMetaContext } from './metaContext';

const providers = new Map();

export function registerProvider(id, provider) {
    providers.set(id, provider);
}

function resolveTargets(options) {
    if (!options.providers) return Array.from(providers.values());
    return options.providers.map((id) => providers.get(id)).filter(Boolean);
}

// Every dispatch gets its own context (page/UTM/visitor/session/timestamp)
// plus a fresh eventId — the piece that makes future Meta Conversions API
// mirroring possible without a redesign (Pixel + CAPI events sharing the
// same eventID are deduped by Meta automatically).
function buildDispatchContext(extra = {}) {
    return { ...buildMetaContext(), eventId: crypto.randomUUID(), ...extra };
}

export function trackPageView(url, title, options = {}) {
    const context = buildDispatchContext({ pageUrl: url, pageTitle: title });
    resolveTargets(options).forEach((provider) => {
        try {
            provider.pageView?.(context);
        } catch {
            // A provider failing must never break another provider or the caller.
        }
    });
}

export function trackEvent(eventName, params = {}, options = {}) {
    const context = buildDispatchContext();
    resolveTargets(options).forEach((provider) => {
        try {
            provider.event?.(eventName, params, context);
        } catch {
            // Same isolation guarantee as trackPageView above.
        }
    });
}
