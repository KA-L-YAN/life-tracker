// Makes the installed app open without a connection: the page shell and the app's fingerprinted
// files are cached. Data (Supabase), map tiles and anything off-site always go to the network.
const CACHE = 'life-tracker-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const put = (key, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(key, copy));
  }
  return res;
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Network first, so a new version shows at once; the saved shell opens when offline.
    event.respondWith(
      fetch(req)
        .then((res) => put('/', res))
        .catch(() => caches.match('/')),
    );
    return;
  }

  // ponytail: old bundles stay cached until CACHE is bumped; bump it if the cache ever gets large.
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
  }
});
