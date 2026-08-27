self.addEventListener('install', (e) => {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', (e) => {
  // Apenas passa as requisições direto
  e.respondWith(fetch(e.request));
});
