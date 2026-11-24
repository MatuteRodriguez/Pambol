// PAMBOL · Service worker
// Red primero para la app (siempre la versión más nueva si hay internet),
// copia local solo como respaldo sin conexión. Nunca guarda datos de Supabase.
// Sube VERSION en cada despliegue para que los teléfonos vean "Actualizar".
const VERSION = 'pambol-2.0.0';
const SHELL = [
  './', 'index.html', 'manifest.json',
  'css/pambol.css', 'css/native.css', 'css/cloud.css',
  'js/config.js', 'js/data.js', 'js/app.js', 'js/cloud.js', 'js/cloud-ui.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Supabase (datos, sesión, tiempo real) y cualquier otra API: directo a la red
  if (url.origin !== location.origin && !CDN.includes(url.hostname)) return;
  if (url.pathname.endsWith('/admin.html') || url.pathname.endsWith('/js/admin.js')) return;

  // Librerías y fuentes con versión fija: caché primero
  if (url.origin !== location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  // Íconos e imágenes: caché primero
  if (/\.(png|jpg|jpeg|webp|svg|ico)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  // App (HTML, JS, CSS, manifest): red primero, copia local sin conexión
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
