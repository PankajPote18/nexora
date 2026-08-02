// Reusable Meta Pixel event helpers. Every helper here funnels through
// analyticsService.trackEvent()/trackPageView() scoped to the 'meta'
// provider (registered below), rather than calling fbq() directly — that's
// what makes this pixel's tracking pluggable into the shared dispatch layer
// instead of staying an isolated, one-off integration.
//
// --- How to add a new Meta event ---
// If it's one of Meta's official standard events, add its name to
// STANDARD_EVENTS below and export a thin wrapper calling
// trackEvent('YourEventName', params, { providers: ['meta'] }). If it's a
// one-off custom event, no new code is needed at all — just call
// trackCustomEvent('YourEventName', params) from anywhere.
import { registerProvider, trackEvent, trackPageView as dispatchPageView } from './analyticsService';
import { META_PIXEL_DEBUG } from './metaPixel';

// Meta's official standard events this app fires — everything else goes
// through fbq('trackCustom', ...) instead, since Meta has no standard event
// for things like a WhatsApp/phone/email click.
const STANDARD_EVENTS = new Set([
    'PageView',
    'ViewContent',
    'Lead',
    'Contact',
    'CompleteRegistration',
    'Search',
    'SubmitApplication',
]);

function logDebug(method, name, params) {
    if (META_PIXEL_DEBUG) {
        console.log(`[MetaPixel] ${method}:`, name, params);
    }
}

function fireFbq(method, name, enrichedParams, eventId) {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
    try {
        // eventID lets a future Meta Conversions API mirror dedupe against
        // this browser-side Pixel event, per Meta's own documented mechanism.
        window.fbq(method, name, enrichedParams, { eventID: eventId });
    } catch (err) {
        if (META_PIXEL_DEBUG) console.warn('[MetaPixel] event failed:', name, err);
    }
}

function buildEnrichedParams(params, context) {
    return {
        ...params,
        page_url: context.pageUrl,
        page_title: context.pageTitle,
        referrer: context.referrer,
        ...context.utm,
        visitor_id: context.visitorId,
        session_id: context.sessionId,
        timestamp: context.timestamp,
    };
}

// The actual 'meta' provider — registered once at module load. This is
// where debug logging, standard-vs-custom mapping, and context enrichment
// all live, so every track* helper below stays a thin, declarative wrapper.
registerProvider('meta', {
    pageView(context) {
        const enrichedParams = buildEnrichedParams({}, context);
        logDebug('track', 'PageView', enrichedParams);
        fireFbq('track', 'PageView', enrichedParams, context.eventId);
    },
    event(eventName, params, context) {
        const method = STANDARD_EVENTS.has(eventName) ? 'track' : 'trackCustom';
        const enrichedParams = buildEnrichedParams(params, context);
        logDebug(method, eventName, enrichedParams);
        fireFbq(method, eventName, enrichedParams, context.eventId);
    },
});

export function trackPageView() {
    dispatchPageView(window.location.href, document.title, { providers: ['meta'] });
}

export function trackViewContent({ contentName, contentCategory, contentIds, contentType = 'product' } = {}) {
    trackEvent(
        'ViewContent',
        { content_name: contentName, content_category: contentCategory, content_ids: contentIds, content_type: contentType },
        { providers: ['meta'] }
    );
}

export function trackLead(params = {}) {
    trackEvent('Lead', params, { providers: ['meta'] });
}

export function trackContact(params = {}) {
    trackEvent('Contact', params, { providers: ['meta'] });
}

export function trackCompleteRegistration({ status = true, value, currency } = {}) {
    trackEvent('CompleteRegistration', { status, value, currency }, { providers: ['meta'] });
}

export function trackSearch({ searchString, contentCategory } = {}) {
    trackEvent('Search', { search_string: searchString, content_category: contentCategory }, { providers: ['meta'] });
}

export function trackSubmitApplication(params = {}) {
    trackEvent('SubmitApplication', params, { providers: ['meta'] });
}

export function trackWhatsAppClick(params = {}) {
    trackEvent('WhatsAppClick', params, { providers: ['meta'] });
}

export function trackPhoneClick(params = {}) {
    trackEvent('PhoneClick', params, { providers: ['meta'] });
}

export function trackEmailClick(params = {}) {
    trackEvent('EmailClick', params, { providers: ['meta'] });
}

export function trackDownload(params = {}) {
    trackEvent('DownloadClick', params, { providers: ['meta'] });
}

export function trackCtaClick(params = {}) {
    trackEvent('CTAButtonClick', params, { providers: ['meta'] });
}

export function trackOutboundClick(params = {}) {
    trackEvent('OutboundClick', params, { providers: ['meta'] });
}

export function trackCustomEvent(eventName, params = {}) {
    trackEvent(eventName, params, { providers: ['meta'] });
}
