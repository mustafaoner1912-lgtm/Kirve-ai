const CACHE = "kirve-ai-shell-v0.5.7";
const SHELL = ["/", "/style.css?v=0.5.7", "/app.js?v=0.5.7", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("kirve-ai-shell-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname === "/login" || url.pathname.startsWith("/health")) return;
  const isShellAsset = url.pathname === "/" || ["/style.css", "/app.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"].includes(url.pathname);
  if (!isShellAsset) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      const redirectedToLogin = new URL(response.url).pathname === "/login";
      if (response.ok && !redirectedToLogin) {
        const copy = response.clone();
        await caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    } catch {
      return (await caches.match(request)) || new Response("KİRVE AI çevrimdışı. İnternet bağlantısı gelince tekrar dene.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
