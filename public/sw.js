/* KeralaPlots media cache service worker
 *
 * Keeps images and video files on the visitor's device for one month so
 * returning visitors don't re-download them — including media served from
 * Cloudflare Images, Cloudflare Stream thumbnails, Unsplash and the Kerala
 * Plots API, whose own Cache-Control headers we can't change from this app.
 *
 * Images: cache-first. A cached copy is served instantly; after MAX_AGE it is
 *         refetched quietly in the background.
 * Videos: direct video files (.mp4/.webm/.mov/.m4v) are saved whole the first
 *         time they play and then served from the device, including the byte
 *         ranges the <video> element asks for. Cloudflare Stream videos play
 *         inside Cloudflare's own iframe, which a website's service worker is
 *         not allowed to see, so those are cached by Cloudflare/the browser.
 * HTML, API calls and JS/CSS are never touched (JS/CSS are cached by the
 * browser for a year via their hashed file names).
 *
 * To force every visitor to drop their cached media (e.g. after replacing a
 * file without renaming it), bump CACHE_VERSION.
 */
const CACHE_VERSION = "v3"; // v3: let external CDNs stream natively; never block first-visit images on CSP connect-src
const MEDIA_CACHE = `kp-media-${CACHE_VERSION}`;
const META_CACHE = `kp-media-meta-${CACHE_VERSION}`;
const VIDEO_CACHE = `kp-video-${CACHE_VERSION}`;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // one month
const MAX_ENTRIES = 600; // images
const MAX_VIDEOS = 20;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // don't keep files larger than 60 MB

// Only cache our own origin + KeralaPlots API uploads in the Service Worker.
// External CDNs (imagedelivery.net, videodelivery.net, images.unsplash.com) already send
// long-lived CDN Cache-Control headers and load faster & safer directly through native <img>
// without triggering Service Worker `connect-src` CSP checks on first-time visits.
const MEDIA_HOSTS = [
  "keralaplots.com",
  "test.keralaplots.com",
  "api.keralaplots.com",
  "apitest.keralaplots.com",
];

const IMAGE_EXT = /\.(avif|webp|png|jpe?g|gif|svg|ico)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([MEDIA_CACHE, META_CACHE, VIDEO_CACHE]);
      for (const key of await caches.keys()) {
        if ((key.startsWith("kp-media") || key.startsWith("kp-video")) && !keep.has(key)) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })()
  );
});

function hostAllowed(hostname) {
  return MEDIA_HOSTS.some((h) => hostname === h || hostname.endsWith("." + h));
}

function isImageRequest(request, url) {
  if (request.method !== "GET") return false;
  if (request.headers.has("range")) return false;

  const sameOrigin = url.origin === self.location.origin;

  // Next.js image optimizer output
  if (sameOrigin && url.pathname === "/_next/image") return true;

  const looksLikeImage =
    request.destination === "image" ||
    IMAGE_EXT.test(url.pathname) ||
    url.pathname.includes("/thumbnails/");

  if (!looksLikeImage) return false;
  if (sameOrigin) return !url.pathname.startsWith("/adminPanel");
  return hostAllowed(url.hostname);
}

function isVideoRequest(request, url) {
  if (request.method !== "GET") return false;
  if (!VIDEO_EXT.test(url.pathname)) return false;
  if (url.origin === self.location.origin) return !url.pathname.startsWith("/adminPanel");
  return hostAllowed(url.hostname);
}

/* ---------- shared helpers ---------- */

async function isFresh(key) {
  const meta = await caches.open(META_CACHE);
  const saved = await meta.match(key);
  if (!saved) return false;
  const savedAt = Number(await saved.text());
  return Date.now() - savedAt < MAX_AGE_MS;
}

async function stamp(key) {
  const meta = await caches.open(META_CACHE);
  await meta.put(key, new Response(String(Date.now())));
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const meta = await caches.open(META_CACHE);
  const keys = await cache.keys();
  const extra = keys.length - max;
  for (let i = 0; i < extra; i++) {
    await cache.delete(keys[i]);
    await meta.delete(keys[i].url);
  }
}

/* ---------- images ---------- */

// Ask cross-origin hosts for a CORS copy first: it is stored at its real size
// (opaque copies count as several MB each against the browser's storage
// quota). Hosts without CORS fall back to the page's normal request.
async function fetchImage(request, url) {
  if (url.origin !== self.location.origin && request.mode === "no-cors") {
    try {
      const corsResponse = await fetch(url.href, { mode: "cors", credentials: "omit" });
      if (corsResponse.ok) return corsResponse;
    } catch (err) {
      // no CORS on this host — use the page's own request below
    }
  }
  return fetch(request);
}

async function refreshImage(request, url) {
  try {
    const response = await fetchImage(request, url);
    // Opaque (no-cors) responses have status 0 but are valid images.
    if (response && (response.ok || response.type === "opaque")) {
      const media = await caches.open(MEDIA_CACHE);
      await media.put(url.href, response.clone());
      await stamp(url.href);
      await trim(MEDIA_CACHE, MAX_ENTRIES);
    }
    return response;
  } catch (err) {
    return null;
  }
}

async function handleImage(event, request, url) {
  const media = await caches.open(MEDIA_CACHE);
  const cached = await media.match(url.href);

  // An opaque copy can't be handed to a CORS request (e.g. <img crossorigin>).
  if (cached && !(cached.type === "opaque" && request.mode === "cors")) {
    if (!(await isFresh(url.href))) event.waitUntil(refreshImage(request, url));
    return cached;
  }

  const response = await refreshImage(request, url);
  return response || fetch(request);
}

/* ---------- videos ---------- */

const videoDownloads = new Set();

async function saveWholeVideo(href) {
  if (videoDownloads.has(href)) return;
  videoDownloads.add(href);
  try {
    const sameOrigin = new URL(href).origin === self.location.origin;
    const response = await fetch(href, { mode: sameOrigin ? "same-origin" : "cors", credentials: "omit" });
    if (response.status !== 200) return;
    const size = Number(response.headers.get("content-length") || 0);
    if (size && size > MAX_VIDEO_BYTES) return;
    const blob = await response.blob();
    if (blob.size > MAX_VIDEO_BYTES) return;
    const headers = new Headers({
      "Content-Type": response.headers.get("content-type") || blob.type || "video/mp4",
      "Content-Length": String(blob.size),
      "Accept-Ranges": "bytes",
    });
    const cache = await caches.open(VIDEO_CACHE);
    await cache.put(href, new Response(blob, { status: 200, headers }));
    await stamp(href);
    await trim(VIDEO_CACHE, MAX_VIDEOS);
  } catch (err) {
    // Host doesn't allow CORS or the download failed — it just streams next time.
  } finally {
    videoDownloads.delete(href);
  }
}

// Build the 206 Partial Content reply a <video> element expects.
async function rangeResponse(request, cached) {
  const range = request.headers.get("range");
  if (!range) return cached;

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) return cached;

  const blob = await cached.blob();
  let start = match[1] === "" ? null : Number(match[1]);
  let end = match[2] === "" ? null : Number(match[2]);
  if (start === null) {
    // suffix range: the last N bytes
    start = Math.max(blob.size - (end || 0), 0);
    end = blob.size - 1;
  } else if (end === null || end >= blob.size) {
    end = blob.size - 1;
  }
  if (start >= blob.size || start > end) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${blob.size}` },
    });
  }

  const slice = blob.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": cached.headers.get("content-type") || "video/mp4",
      "Content-Length": String(slice.size),
      "Content-Range": `bytes ${start}-${end}/${blob.size}`,
      "Accept-Ranges": "bytes",
    },
  });
}

async function handleVideo(event, request, url) {
  const cache = await caches.open(VIDEO_CACHE);
  const cached = await cache.match(url.href);

  if (cached) {
    if (!(await isFresh(url.href))) event.waitUntil(saveWholeVideo(url.href));
    return rangeResponse(request, cached);
  }

  // First play: stream from the network as usual and save a full copy in
  // the background for next time.
  event.waitUntil(saveWholeVideo(url.href));
  return fetch(request);
}

/* ---------- router ---------- */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  if (isVideoRequest(request, url)) {
    event.respondWith(handleVideo(event, request, url).catch(() => fetch(request)));
    return;
  }

  if (isImageRequest(request, url)) {
    event.respondWith(handleImage(event, request, url).catch(() => fetch(request)));
  }
});
