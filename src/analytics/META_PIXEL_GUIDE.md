# Meta Pixel Integration Guide

This app's Meta Pixel integration lives entirely in `src/analytics/` and plugs into the shared `analyticsService.js` dispatch layer (see `metaEvents.js`'s top comment for how). It runs independently of GA4/GTM (`gaLoader.js`) and the first-party analytics system (`tracker.js`) — none of those files were touched to add this.

## How it initializes

- `MetaPixelBoundary.jsx` is mounted once at the router root in `App.jsx`.
- On mount, `useMetaPixelTracker.js` checks consent (`metaConsent.js`) and, if granted, calls `initializeMetaPixel()` (loads `fbevents.js`, calls `fbq('init', ...)` once) and `installAutoLinkTracking()` (one delegated click listener for the whole app).
- On every route change, it fires a `PageView` via `trackPageView()`.

## How to add a new Meta event

- **If it's one of Meta's official standard events** (`PageView`, `ViewContent`, `Lead`, `Contact`, `CompleteRegistration`, `Search`, `SubmitApplication`, `Purchase`, `Subscribe`, etc.): add its name to the `STANDARD_EVENTS` set in `metaEvents.js`, then export a thin wrapper the same way `trackViewContent`/`trackSearch`/etc. are written — call `trackEvent('YourEventName', params, { providers: ['meta'] })`.
- **If it's a one-off custom event**: no new code needed — call `trackCustomEvent('YourEventName', { any: 'params' })` from anywhere. It's automatically sent via `fbq('trackCustom', ...)`.
- Every event, standard or custom, is automatically enriched with `page_url`, `page_title`, `referrer`, UTM params, `visitor_id`, `session_id`, and `timestamp` — you don't need to pass these yourself.

## How to disable the Meta Pixel

Set `VITE_META_PIXEL_ID=` (empty) in `.env`/`.env.development`. Every loader/tracker function checks this and no-ops — no code changes needed, no script ever loads.

## How to switch Pixel IDs

Change `VITE_META_PIXEL_ID` in `.env` (production) or `.env.development` (local dev) and restart the dev server / redeploy. No code changes.

## Debug mode

Set `VITE_META_PIXEL_DEBUG=true` to log every `init`/`track`/`trackCustom` call (with its full enriched params) to the browser console. Defaults to `true` in `.env.development`, `false` in `.env`.

## Consent

`metaConsent.js` defaults to granted (`hasMarketingConsent()` returns `true`) when nothing is stored — this app has no cookie-consent banner today, so behavior is unchanged from "always load." If a consent banner is added later, call `setMarketingConsent(false)` before the user decides and `setMarketingConsent(true)` once they accept marketing cookies — `useMetaPixelTracker.js` listens for the consent-changed event and will initialize the pixel immediately once consent is granted, with no page reload required.

## Automatic link tracking

`autoLinkTracking.js` watches every click on the page and automatically fires `PhoneClick`/`EmailClick`/`WhatsAppClick`/`DownloadClick`/`OutboundClick` for `tel:`/`mailto:`/WhatsApp/download-looking/cross-origin links — you do not need to add `onClick` handlers to new links for these to be tracked. `Lead`/`Contact`/`SubmitApplication`/`CTAButtonClick` have no automatic trigger (no contact form or shared CTA-button component exists in this codebase yet) — call `trackLead()`/`trackContact()`/`trackSubmitApplication()`/`trackCtaClick()` directly from the relevant `onClick`/`onSubmit` once that UI exists.

## Future: Meta Conversions API (server-side)

Not implemented yet, but designed for: `analyticsService.js` already generates a UUID `eventId` per dispatch and includes it in the event context, which `metaEvents.js` passes to `fbq(..., { eventID })`. A future server-side mirror (a new `providers/metaCapiProvider.js` registered the same way the browser provider is) could POST the same event name/params/`eventId` to a new backend route that calls Meta's Conversions API — using the shared `eventID` for Meta's own Pixel/CAPI deduplication. No refactor needed to add this later, just a new provider registration.

## How to verify events

1. **Meta Pixel Helper** (Chrome extension): install it, browse the site, confirm it detects exactly one pixel (your `VITE_META_PIXEL_ID`) with no "duplicate pixel" or "duplicate PageView" warnings.
2. **Meta Events Manager → Test Events**: open your pixel in [Meta Events Manager](https://business.facebook.com/events_manager2), go to the Test Events tab, browse the live site (or paste the test-event URL/code if using one), and confirm events arrive with the expected parameters:
   - `PageView` on load and on every in-app route change
   - `ViewContent` when opening a movie/show detail page
   - `Search` after typing a real search query
   - `CompleteRegistration` after a successful payment
   - `PhoneClick`/`EmailClick`/`WhatsAppClick`/`DownloadClick`/`OutboundClick` when clicking matching links (test by temporarily adding one, e.g. `<a href="tel:+911234567890">`)
3. With `VITE_META_PIXEL_DEBUG=true`, every event also logs to the browser console as `[MetaPixel] track: <name> <params>` or `[MetaPixel] trackCustom: <name> <params>` — useful for a quick local check before opening Events Manager.
