// Classifies a visit into one of: direct, organic_search, referral, social,
// paid_social, paid_search, email, display, unknown. Pure function, no I/O —
// UTM parameters (when present) always win over referrer sniffing, since
// they're an explicit, intentional signal (e.g. a Google Ads click still
// carries google.com as the referrer domain but should be paid_search, not
// organic_search).

const SEARCH_ENGINE_DOMAINS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'baidu.', 'yandex.'];
const SOCIAL_DOMAINS = [
    'facebook.', 'instagram.', 'twitter.', 'x.com', 't.co', 'linkedin.',
    'whatsapp.', 'youtube.', 'pinterest.', 'tiktok.', 'reddit.', 'snapchat.'
];
const PAID_SOCIAL_SOURCES = ['facebook', 'instagram', 'linkedin', 'tiktok', 'snapchat', 'pinterest', 'twitter', 'x'];
const PAID_SEARCH_SOURCES = ['google', 'bing', 'yahoo'];
const PAID_MEDIUM_RE = /cpc|ppc|paid|cpm|display|banner/i;

function getDomain(url) {
    if (!url) return null;
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

function classifyTrafficSource({ referrerUrl, landingUrl, utmSource, utmMedium }) {
    const referrerDomain = getDomain(referrerUrl);
    const landingDomain = getDomain(landingUrl);

    if (utmSource) {
        const source = utmSource.toLowerCase();
        const medium = (utmMedium || '').toLowerCase();

        if (medium === 'email') return 'email';
        if (medium === 'display' || medium === 'banner') return 'display';
        if (PAID_MEDIUM_RE.test(medium)) {
            return PAID_SOCIAL_SOURCES.includes(source) ? 'paid_social' : 'paid_search';
        }
        if (medium === 'social' || PAID_SOCIAL_SOURCES.includes(source)) return 'social';
        if (medium === 'organic' || PAID_SEARCH_SOURCES.includes(source)) return 'organic_search';
        return 'referral';
    }

    if (!referrerDomain || (landingDomain && referrerDomain === landingDomain)) {
        return 'direct';
    }

    if (SEARCH_ENGINE_DOMAINS.some((d) => referrerDomain.includes(d))) return 'organic_search';
    if (SOCIAL_DOMAINS.some((d) => referrerDomain.includes(d))) return 'social';

    return 'referral';
}

module.exports = { classifyTrafficSource, getDomain };
