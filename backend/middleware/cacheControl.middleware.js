// Short-lived HTTP cache header for read-heavy public GET endpoints backed
// by data that's only ever changed through the (currently unguarded) admin
// panel — not on every request. stale-while-revalidate lets a repeat
// navigation reuse the previous response instantly while the browser
// revalidates in the background, instead of every page transition paying a
// full round-trip for data that's usually unchanged.
module.exports = (maxAgeSeconds = 30, staleWhileRevalidateSeconds = 300) => (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`);
    next();
};
