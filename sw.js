/* 槽頂距離紀錄 Service Worker — 版本需與 index.html 的 APP_VERSION 一致 */
const VERSION = '1.1.0';
const CACHE = 'tank-headspace-v' + VERSION;
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('tank-headspace-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 頁面：有網路時取最新版（3 秒逾時改用快取），斷網時用快取 */
function networkFirst(req){
  return new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(req, {ignoreSearch:true})
      .then(r => r || caches.match('./index.html'))
      .then(r => { if (!done && r){ done = true; resolve(r); } });
    const timer = setTimeout(fallback, 3000);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res && res.ok){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
      }
      if (!done){ done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      caches.match(req, {ignoreSearch:true})
        .then(r => r || caches.match('./index.html'))
        .then(r => { if (!done){ done = true; resolve(r || new Response('離線中，且尚未建立快取。請連上網路後開啟一次。', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}})); } });
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate'){ e.respondWith(networkFirst(req)); return; }
  e.respondWith(caches.match(req, {ignoreSearch:true}).then(r => r || fetch(req)));
});
