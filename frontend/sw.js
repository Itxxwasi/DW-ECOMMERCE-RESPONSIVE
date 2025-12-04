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

// Helper function to check if a URL is cacheable
function isCacheableUrl(url) {
    // Only cache http:// and https:// URLs
    // Skip chrome-extension://, file://, data:, blob:, etc.
    const scheme = url.protocol;
    return scheme === 'http:' || scheme === 'https:';
}

// Install event - Cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            // Filter out non-cacheable URLs and cache only valid ones
            const cacheableAssets = STATIC_ASSETS.filter(url => {
                try {
                    const urlObj = new URL(url, self.location.origin);
                    return isCacheableUrl(urlObj);
                } catch {
                    return false;
                }
            });
            return cache.addAll(cacheableAssets.map(url => new Request(url, { cache: 'reload' })));
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
    
    // Skip non-cacheable URL schemes (chrome-extension, file, data, blob, etc.)
    if (!isCacheableUrl(url)) {
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
                    // Cache successful API responses (only if URL is cacheable)
                    if (response.status === 200 && isCacheableUrl(url)) {
                        const responseClone = response.clone();
                        cache.put(request, responseClone).catch((err) => {
                            console.warn('[SW] Failed to cache API response:', request.url, err);
                        });
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
                    // Only cache if URL is cacheable
                    if (isCacheableUrl(url)) {
                        const responseToCache = response.clone();
                        caches.open(STATIC_CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache).catch((err) => {
                                console.warn('[SW] Failed to cache resource:', request.url, err);
                            });
                        });
                    }
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
                // Only cache if URL is cacheable
                if (isCacheableUrl(url)) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone).catch((err) => {
                            console.warn('[SW] Failed to cache HTML page:', request.url, err);
                        });
                    });
                }
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

