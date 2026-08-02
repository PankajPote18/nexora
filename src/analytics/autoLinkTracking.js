// Automatically detects and tracks outbound/WhatsApp/tel/mailto/download
// link clicks via a single delegated listener, instead of relying on each
// such link being manually wired with an onClick. This means the moment a
// WhatsApp/phone/email/download link is added anywhere in the app, it's
// tracked with zero additional code changes.
import { trackWhatsAppClick, trackPhoneClick, trackEmailClick, trackDownload, trackOutboundClick } from './metaEvents';

const WHATSAPP_PATTERN = /wa\.me|api\.whatsapp\.com|whatsapp:\/\//i;
const DOWNLOAD_EXTENSION_PATTERN = /\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|csv|mp4|mov|avi|mp3|apk|dmg|exe)(\?|#|$)/i;

let installed = false;

function classifyLink(link) {
    const href = link.getAttribute('href');
    if (!href) return null;

    if (href.startsWith('tel:')) return 'phone';
    if (href.startsWith('mailto:')) return 'email';
    if (WHATSAPP_PATTERN.test(href)) return 'whatsapp';
    if (link.hasAttribute('download') || DOWNLOAD_EXTENSION_PATTERN.test(href)) return 'download';

    try {
        const resolved = new URL(href, window.location.href);
        if (resolved.hostname && resolved.hostname !== window.location.hostname) return 'outbound';
    } catch {
        // relative/invalid href — not classifiable, ignore.
    }
    return null;
}

function handleClick(event) {
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    const type = classifyLink(link);
    if (!type) return;

    const params = { url: link.getAttribute('href'), text: link.textContent?.trim()?.slice(0, 200) };
    // Purely observational — never preventDefault/stopPropagation, so the
    // link's normal navigation behavior is completely unaffected.
    switch (type) {
        case 'phone':
            trackPhoneClick(params);
            break;
        case 'email':
            trackEmailClick(params);
            break;
        case 'whatsapp':
            trackWhatsAppClick(params);
            break;
        case 'download':
            trackDownload(params);
            break;
        case 'outbound':
            trackOutboundClick(params);
            break;
    }
}

// Called once from useMetaPixelTracker's mount effect (consent-gated
// alongside initializeMetaPixel()). Guarded by its own loaded flag so
// StrictMode's double-invoke in dev doesn't attach two listeners.
export function installAutoLinkTracking() {
    if (installed || typeof document === 'undefined') return;
    installed = true;
    document.addEventListener('click', handleClick, { capture: true });
}
