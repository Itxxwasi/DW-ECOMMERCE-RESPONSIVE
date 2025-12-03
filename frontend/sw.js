/**
 * Service Worker for D.Watson Pharmacy
 * Provides offline caching and performance optimization
 */

const CACHE_NAME = 'dwatson-v2';
const STATIC_CACHE_NAME = 'dwatson-static-v2';
const API_CACHE_NAME = 'dwatson-api-v2';

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/css/style.css',
    '/css/dwatson-styles.css',
    '/css/home.css',
    '/js/main.js',
    '/js/home.js',
    '/images/logo.png'
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
        }).catch(err => {
            console.error('[SW] Failed to cache static assets:', err);
        })
    );
    self.skipWaiting(); // Activate immediately
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker v2...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches (v1)
                    if (cacheName.startsWith('dwatson-') && !cacheName.includes('v2')) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // Take control of all pages immediately
        })
    );
});

// Fetch event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip admin routes
    if (url.pathname.startsWith('/admin')) {
        return;
    }
    
    // Handle API requests with network-first strategy
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            caches.open(API_CACHE_NAME).then((cache) => {
                return fetch(request).then((response) => {
                    // Cache successful API responses
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        cache.put(request, responseClone);
                    }
                    return response;
                }).catch(() => {
                    // Fallback to cache if network fails
                    return cache.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return offline response if no cache
                        return new Response(
                            JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
                            {
                                status: 503,
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                    });
                });
            })
        );
        return;
    }
    
    // Handle static assets with cache-first strategy
    if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request).then((response) => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(STATIC_CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                });
            })
        );
        return;
    }
    
    // Handle HTML pages with network-first strategy
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request).then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                });
                return response;
            }).catch(() => {
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Return offline page
                    return caches.match('/').then((indexPage) => {
                        return indexPage || new Response('Offline', { status: 503 });
                    });
                });
            })
        );
        return;
    }
});

// Background sync for offline form submissions (future enhancement)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-forms') {
        event.waitUntil(syncForms());
    }
});

async function syncForms() {
    // Implementation for syncing forms when back online
    console.log('[SW] Syncing forms...');
}

