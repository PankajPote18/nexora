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
