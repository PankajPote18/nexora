// Defers non-critical third-party script loading (Meta Pixel, GA4/GTM) until
// after the page has fired `load` and the main thread is idle, so their
// parse/execute cost never competes with this app's own first paint / LCP /
// initial interactivity — Lighthouse flagged these scripts blocking the main
// thread for 1,280ms combined when loaded eagerly on mount. Safari has no
// `requestIdleCallback`, hence the setTimeout fallback.
export function deferToIdle(fn, timeout = 3000) {
    if (typeof window === 'undefined') return;

    const run = () => {
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(fn, { timeout });
        } else {
            setTimeout(fn, 1);
        }
    };

    if (document.readyState === 'complete') {
        run();
    } else {
        window.addEventListener('load', run, { once: true });
    }
}
