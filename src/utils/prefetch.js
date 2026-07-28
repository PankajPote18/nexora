// Intelligent, targeted prefetching — as opposed to the blanket "prefetch
// everything on Home's idle callback" approach this replaces. Each chunk is
// only ever fetched once per session (module-level flags), and only in
// response to a real signal that the user is likely headed there next:
// hovering/focusing a movie card (-> they're likely to open its Detail
// page), or actually opening a Detail page (-> they're likely to hit
// "Watch now" next).
let detailPrefetched = false;
export const prefetchDetailPage = () => {
  if (detailPrefetched) return;
  detailPrefetched = true;
  import('../pages/DetailPage');
};

let playerPrefetched = false;
export const prefetchPlayerPage = () => {
  if (playerPrefetched) return;
  playerPrefetched = true;
  import('../pages/PlayerPage');
};

// Search and Settings are also route-split (see App.jsx) but, unlike Detail/
// Player above, had no prefetch at all — their only entry point (Sidebar's
// nav links) is a plain <Link> with no hover/focus/touch handler, so every
// navigation to either paid the full chunk-fetch-then-render cost with zero
// head start. That's the concrete cause behind these two specific pages
// "feeling slower" than Home (which isn't lazy-loaded at all).
let searchPrefetched = false;
export const prefetchSearchPage = () => {
  if (searchPrefetched) return;
  searchPrefetched = true;
  import('../pages/SearchPage');
};

let settingsPrefetched = false;
export const prefetchSettingsPage = () => {
  if (settingsPrefetched) return;
  settingsPrefetched = true;
  import('../pages/SettingsPage');
};

let settingsDetailPrefetched = false;
export const prefetchSettingsDetailPage = () => {
  if (settingsDetailPrefetched) return;
  settingsDetailPrefetched = true;
  import('../pages/SettingsDetailPage');
};
