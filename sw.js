const CACHE = 'my-ryadom-improvements-7';
const CACHE_PREFIX = 'my-ryadom-';

const FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './admin.html',
  './admin.js',
  './lesson-builder.js',
  './lesson-library.html',
  './lesson-library.js',
  './lesson-library-canonical.js',
  './manifest.webmanifest',
  './README.md',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './docs/00_DOCS_INDEX_RU.md',
  './docs/01_PROJECT_SPEC_RU.md',
  './docs/02_METHODOLOGY_RU.md',
  './docs/03_FGOS_ALIGNMENT_PRELIMINARY_RU.md',
  './docs/04_SOURCES_AND_SAFETY_RU.md',
  './docs/05_ANNUAL_PLAN_RU.md',
  './docs/06_TEACHER_GUIDE_RU.md',
  './docs/07_PARENT_GUIDE_RU.md',
  './docs/08_FULL_LESSON_PROGRAM_RU.md',
  './docs/09_STUDENT_WORKSHEETS_RU.md',
  './docs/10_SCHOOL_CABINET_RU.md',
  './docs/11_SCHOOL_YEAR_CHECKLIST_RU.md',
  './docs/12_PSYCHOLOGIST_WORKFLOW_RU.md',
  './docs/13_METHODIST_IMPLEMENTATION_RU.md',
  './docs/14_LESSON_MAP_AND_V1_13_RU.md',
  './docs/15_LESSON_7_BOUNDARIES_RU.md',
  './docs/16_STUDENT_ROUTE_V1_15_RU.md',
  './docs/17_STUDENT_ROUTE_AND_PWA_V1_16_RU.md',
  './docs/18_QA_FIXES_V1_18_RU.md',
  './docs/19_ROUTE_MAP_AND_V1_21_BETA_RU.md'
];

self.addEventListener('install', event => {
  // If even one required asset is missing, installation fails and the
  // currently active service worker remains in control.
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) return cachedResponse;

    // Query parameters such as ?mode=student do not change the HTML file.
    if (request.mode === 'navigate') {
      const pageUrl = new URL(request.url);
      pageUrl.search = '';
      pageUrl.hash = '';

      const pageResponse = await cache.match(pageUrl.href);
      if (pageResponse) return pageResponse;
    }

    try {
      const networkResponse = await fetch(request);

      // Cache only successful same-origin responses. Never cache POST,
      // failed responses, or cross-origin resources.
      if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
        await cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (error) {
      if (request.mode === 'navigate') {
        const appShell = await cache.match('./index.html');
        if (appShell) return appShell;
      }

      return new Response(
        'Ресурс недоступен офлайн. Подключитесь к интернету и повторите попытку.',
        {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }
  })());
});
