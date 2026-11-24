/**
 * Authentication Redirect & Safe URL Utilities
 * Preserves the exact user destination (path, query params, hash) across the login flow
 * and guards against open-redirect vulnerabilities.
 */

const AUTH_REDIRECT_FLAG = "kp_auth_redirect";

/**
 * Returns the login URL with the current page URL safely encoded as the redirect parameter.
 * Preserves pathname, search query parameters, and hash fragment.
 */
export function getLoginRedirectUrl(fallback = "/") {
    if (typeof window === "undefined") {
        return "/login";
    }

    const pathname = window.location.pathname || "/";

    // Prevent redirect loops if already on login or auth pages
    if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
        return "/login";
    }

    const currentUrl =
        pathname +
        (window.location.search || "") +
        (window.location.hash || "");

    return `/login?redirect=${encodeURIComponent(currentUrl)}`;
}

/**
 * Validates and sanitizes a redirect target to prevent open redirect vulnerabilities.
 * Only relative internal paths (starting with a single "/") are allowed.
 * Malicious external schemes, protocol-relative URLs ("//"), backslashes, and login loops fallback to /profile.
 */
export function getSafeRedirect(url) {
    if (!url || typeof url !== "string") return "/profile";

    try {
        // URLSearchParams has already decoded the value once; decode again only
        // to catch double-encoded tricks such as "%2F%2Fevil.com".
        let decoded = url;
        try {
            decoded = decodeURIComponent(url);
        } catch {
            return "/profile";
        }

        // Browsers silently strip tabs/newlines and treat "\" like "/", so
        // "/\tevil.com" or "/\\evil.com" would become "//evil.com". Reject any
        // control character, whitespace or backslash outright.
        if (/[\u0000-\u001F\u007F\\]/.test(decoded) || /^\/\s/.test(decoded)) return "/profile";

        // Must be a single-slash relative path ("/x", never "//x").
        if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/profile";
        if (!url.startsWith("/") || url.startsWith("//")) return "/profile";

        // Final check: resolving it against our own origin must stay on our origin.
        const base = typeof window !== "undefined" ? window.location.origin : "https://keralaplots.com";
        const resolved = new URL(url, base); // keep the original encoding of the query
        if (resolved.origin !== base) return "/profile";

        const path = resolved.pathname + resolved.search + resolved.hash;

        // Prevent redirecting back to login or auth routes
        if (path.startsWith("/login") || path.startsWith("/auth/")) return "/profile";

        return path;
    } catch {
        return "/profile";
    }
}

/**
 * Flags that an authentication redirect has just occurred so that the destination page
 * scrolls to the top instantly and prevents the browser from restoring previous scroll position.
 */
export function markAuthRedirect() {
    if (typeof window !== "undefined") {
        try {
            sessionStorage.setItem(AUTH_REDIRECT_FLAG, "true");
            if ("scrollRestoration" in window.history) {
                window.history.scrollRestoration = "manual";
            }
        } catch {
            // Ignore potential storage exceptions (private mode quotas, etc.)
        }
    }
}

/**
 * Checks whether an auth redirect just occurred. If so, consumes the flag (one-time use)
 * and returns true.
 */
export function shouldResetAuthScroll() {
    if (typeof window === "undefined") return false;
    try {
        const flag = sessionStorage.getItem(AUTH_REDIRECT_FLAG);
        if (flag === "true") {
            sessionStorage.removeItem(AUTH_REDIRECT_FLAG);
            return true;
        }
    } catch {
        return false;
    }
    return false;
}
