const CACHE_NAME = 'otphaven-v1.1.9';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  // Core dependencies from esm.sh
  'https://esm.sh/react@^19.2.4',
  'https://esm.sh/react-dom@^19.2.4',
  'https://esm.sh/lucide-react@^0.564.0',
  'https://esm.sh/framer-motion@^12.34.0',
  'https://esm.sh/html5-qrcode@^2.3.8',
  'https://esm.sh/otpauth@^9.5.0',
  'https://esm.sh/crypto-js@^4.2.0',
  'https://esm.sh/peerjs@1.5.4?bundle-deps',
  'https://esm.sh/qrcode@^1.5.4',
  'https://esm.sh/jszip@^3.10.1'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Cache-first strategy for all resources
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Cache responses from esm.sh, fonts, and local assets
        const shouldCache = 
          event.request.url.includes('esm.sh') ||
          event.request.url.includes('fonts.googleapis.com') ||
          event.request.url.includes('fonts.gstatic.com') ||
          event.request.url.startsWith(self.location.origin);

        if (shouldCache) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      }).catch(() => {
        // Return offline fallback if available
        return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});