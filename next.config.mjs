import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitReactIcons } from "./scripts/split-react-icons.mjs";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Generated once per build (the webpack hook runs for client + server compilers).
let splitIcons;
const getSplitIcons = () => (splitIcons ??= splitReactIcons(projectRoot));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework/version in an X-Powered-By header.
  poweredByHeader: false,
  /* There is a stray package-lock.json in the home directory, so Turbopack was
     inferring /Users/ample as the workspace root. Pin it to this project. */
  turbopack: {
    root: projectRoot,
  },
  webpack(config, { dev }) {
    // Production builds: give each react-icons icon its own tiny module so
    // every page only ships the icons it uses (see scripts/split-react-icons.mjs).
    if (!dev) {
      const { sets, outDir } = getSplitIcons();
      if (sets.length) {
        config.module.rules.unshift({
          test: /\.(js|jsx|mjs)$/,
          include: path.join(projectRoot, "src"),
          enforce: "pre",
          use: [{ loader: path.join(projectRoot, "scripts/react-icons-split-loader.cjs"), options: { sets, outDir } }],
        });
      }
    }
    return config;
  },
  images: {
    // Optimised images from /_next/image are kept (server + browser) for
    // one month. If you replace an image, give it a new file name.
    minimumCacheTTL: 2592000,
    // AVIF first (smallest), WebP fallback.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "keralaplots.com",
      },
      {
        protocol: "https",
        hostname: "test.keralaplots.com",
      },
      {
        protocol: "https",
        hostname: "api.keralaplots.com",
      },
      {
        protocol: "https",
        hostname: "apitest.keralaplots.com",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8001",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8001",
      },
    ],
  },
  async headers() {
    // One month in the browser, then a day of stale-while-revalidate so a
    // returning visitor never waits on a re-download.
    const longCache = "public, max-age=2592000, stale-while-revalidate=86400";
    // Hosts the site actually loads scripts/styles/media/frames from (GTM,
    // GA, Razorpay checkout, Chatpier widget, Cloudflare Images/Stream,
    // Leaflet via unpkg/jsdelivr, Google Fonts, OSM tiles, YouTube/Vimeo
    // embeds). 'unsafe-inline' stays on script-src/style-src because the
    // app renders inline GTM bootstrap + JSON-LD <script> tags and inline
    // style attributes without per-request nonces — tightening that further
    // is a separate, larger refactor. Excluded from /adminPanel, which is a
    // separately bundled app not covered by this audit.
    const isDev = process.env.NODE_ENV === "development";
    const csp = [
      "default-src 'self'",
      // 'unsafe-eval' is dev-only: React/Next's fast-refresh runtime uses it
      // to reconstruct server error stacks. Neither uses eval() in production.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://connect.facebook.net https://checkout.razorpay.com https://chatpier.com https://*.chatpier.com https://cdn.jsdelivr.net https://unpkg.com https://embed.cloudflarestream.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://chatpier.com https://*.chatpier.com",
      "img-src 'self' data: blob: http://127.0.0.1:8000 http://localhost:8000 http://127.0.0.1:8000 http://localhost:8001 https://imagedelivery.net https://images.unsplash.com https://*.tile.openstreetmap.org https://www.googletagmanager.com https://www.google-analytics.com https://www.facebook.com https://keralaplots.com https://test.keralaplots.com https://api.keralaplots.com https://apitest.keralaplots.com https://chatpier.com https://*.chatpier.com",
      "font-src 'self' data: https://fonts.gstatic.com https://chatpier.com https://*.chatpier.com",
      "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 http://127.0.0.1:8000 http://localhost:8001 ws://localhost:3000 ws://127.0.0.1:3000 https://keralaplots.com https://test.keralaplots.com https://api.keralaplots.com https://apitest.keralaplots.com https://imagedelivery.net https://videodelivery.net https://images.unsplash.com https://*.tile.openstreetmap.org https://nominatim.openstreetmap.org https://checkout.razorpay.com https://api.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.cloudflarestream.com https://chatpier.com https://*.chatpier.com wss://chatpier.com wss://*.chatpier.com",
      "media-src 'self' blob: http://127.0.0.1:8000 http://localhost:8000 https://keralaplots.com https://test.keralaplots.com https://api.keralaplots.com https://apitest.keralaplots.com https://*.cloudflarestream.com https://videodelivery.net https://chatpier.com https://*.chatpier.com",
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://checkout.razorpay.com https://api.razorpay.com https://*.cloudflarestream.com https://iframe.videodelivery.net https://www.googletagmanager.com https://chatpier.com https://*.chatpier.com",
      // hls.js (reels player) runs its demuxer in a blob: Web Worker.
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.razorpay.com",
      "frame-ancestors 'self'",
      // Any stray http:// sub-resource is upgraded to https:// instead of loading insecurely (production only).
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].filter(Boolean).join("; ");
    return [
      {
        // Applies to every route except /adminPanel (a separately bundled
        // static app). Review with real traffic / CSP reports before
        // tightening further, especially the Razorpay checkout flow.
        source: "/((?!adminPanel).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
          // Only the features the site actually uses: microphone (voice notes),
          // camera (photo/video capture), geolocation (property location).
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self), payment=(self \"https://checkout.razorpay.com\" \"https://api.razorpay.com\"), usb=(), serial=(), bluetooth=()",
          },
          // Isolates the window from pages it opens; popups (Razorpay) still work.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        // The admin panel must never appear in search results, and can't be framed.
        source: "/adminPanel/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        source: "/adminPanel",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/:path*.:ext(avif|webp|png|jpg|jpeg|gif|svg|ico|mp4|webm|mov|m4v|woff|woff2|ttf|otf)",
        headers: [{ key: "Cache-Control", value: longCache }],
      },
      {
        // Hashed build files of the admin panel never change
        source: "/adminPanel/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Admin panel shell must always be fresh so updates show immediately
        source: "/adminPanel",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        // Admin routes (not the hashed /assets files, which are cached for a year above).
        source: "/adminPanel/:path((?!assets/).*)",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        // Service worker must be re-checked on every visit so updates roll out
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/adminPanel",
        destination: "/adminPanel/index.html",
      },
      {
        source: "/adminPanel/:path*",
        destination: "/adminPanel/index.html",
      },
    ];
  },
};

export default nextConfig;
