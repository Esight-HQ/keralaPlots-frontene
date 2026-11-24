/* Same-origin image proxy used by the photo "rotate" button.
   The browser needs the raw pixels of an already-uploaded image to rotate it;
   if the CDN response isn't CORS-readable, it fetches it through here instead.
   Only Kerala Plots image hosts are allowed so this can't be used as an open proxy. */

const ALLOWED_HOSTS = new Set(["imagedelivery.net"]);
const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(request) {
    const target = new URL(request.url).searchParams.get("url");

    if (!target || target.length > 2048) {
        return new Response("Invalid url", { status: 400 });
    }

    let parsed;
    try {
        parsed = new URL(target);
    } catch {
        return new Response("Invalid url", { status: 400 });
    }
    if (
        parsed.protocol !== "https:" ||
        !ALLOWED_HOSTS.has(parsed.hostname) ||
        parsed.username ||
        parsed.password ||
        (parsed.port && parsed.port !== "443")
    ) {
        return new Response("Host not allowed", { status: 400 });
    }

    // redirect: "error" — a redirect can't bounce the request to another host.
    const upstream = await fetch(parsed.toString(), {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!upstream || !upstream.ok) {
        return new Response("Image not found", { status: upstream?.status || 502 });
    }

    const type = (upstream.headers.get("content-type") || "").toLowerCase();
    // SVG can carry script; only raster formats are proxied.
    if (!/^image\/(jpeg|png|webp|avif|gif)\b/.test(type)) {
        return new Response("Not an image", { status: 415 });
    }

    // Refuse oversized files before reading them into memory.
    const declared = Number(upstream.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) {
        return new Response("Image too large", { status: 413 });
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength > MAX_BYTES) {
        return new Response("Image too large", { status: 413 });
    }

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": type,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    });
}
