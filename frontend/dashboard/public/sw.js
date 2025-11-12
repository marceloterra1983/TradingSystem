/**
 * Service Worker - TradingSystem Dashboard
 * Manual implementation for Vite 7 compatibility
 * Phase 2.3 - Browser Caching
 */

// Service Worker version for cache busting
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `dashboard-${CACHE_VERSION}`;
const API_CACHE_NAME = `api-cache-${CACHE_VERSION}`;
const DOCS_CACHE_NAME = `docs-cache-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

// Cache strategies configuration
const CACHE_STRATEGIES = {
  // Static assets: Cache-First (long-lived)
  static: {
    pattern: /\.(js|css|woff|woff2|ttf|eot|ico|png|jpg|jpeg|svg|gif)$/,
    cacheName: CACHE_NAME,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  // API requests: Network-First (fresh data priority)
  api: {
    pattern: /^https?:\/\/localhost:(9080|3200|3400)\/api\/.*/,
    cacheName: API_CACHE_NAME,
    maxAge: 5 * 60 * 1000, // 5 minutes
  },
  // Documentation: Cache-First (content rarely changes)
  docs: {
    pattern: /^https?:\/\/localhost:9080\/docs\/.*/,
    cacheName: DOCS_CACHE_NAME,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting(); // Activate immediately
    }).catch((error) => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches (different version)
          if (cacheName !== CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== DOCS_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine cache strategy
  let strategy = null;

  if (CACHE_STRATEGIES.api.pattern.test(url.href)) {
    strategy = 'networkFirst';
  } else if (CACHE_STRATEGIES.docs.pattern.test(url.href)) {
    strategy = 'cacheFirst';
  } else if (CACHE_STRATEGIES.static.pattern.test(url.pathname)) {
    strategy = 'cacheFirst';
  }

  if (strategy === 'networkFirst') {
    event.respondWith(networkFirst(request, API_CACHE_NAME, CACHE_STRATEGIES.api.maxAge));
  } else if (strategy === 'cacheFirst') {
    const cacheName = url.pathname.includes('/docs/') ? DOCS_CACHE_NAME : CACHE_NAME;
    event.respondWith(cacheFirst(request, cacheName));
  }
  // If no strategy matches, let browser handle it (pass-through)
});

/**
 * Network-First strategy
 * Try network first, fallback to cache if network fails
 */
async function networkFirst(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // Clone response before caching (response can only be used once)
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Check if cache is stale
      const cacheTime = new Date(cachedResponse.headers.get('date')).getTime();
      const now = Date.now();

      if (now - cacheTime < maxAge) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
      } else {
        console.log('[SW] Cache is stale:', request.url);
      }
    }

    // No cache available or cache is stale
    throw error;
  }
}

/**
 * Cache-First strategy
 * Try cache first, fallback to network if not in cache
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }

  // Not in cache, fetch from network
  console.log('[SW] Fetching from network:', request.url);
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', request.url, error);
    throw error;
  }
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

console.log('[SW] Service Worker loaded, version:', CACHE_VERSION);
