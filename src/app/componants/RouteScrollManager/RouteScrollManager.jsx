"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/*
 * Opens every page at the top of the screen.
 *
 * Why this is needed: each page renders the fixed <Nav /> as its first element.
 * Next.js only scrolls to the top on navigation when a page's first element is
 * off-screen — a fixed header is always on-screen, so Next skipped the scroll
 * and new pages opened at the previous page's scroll position.
 *
 * Rules:
 *  - New page (link click, router.push/replace, fresh load, refresh) -> top.
 *  - Browser Back / Forward -> keep the browser's restored position.
 *  - URL with a #hash -> scroll to that element instead.
 *  - Query-string-only changes (filters, tabs, pagination) -> left alone.
 */

// useLayoutEffect runs before paint (no visible jump); fall back on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function scrollToTopInstant() {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // Older Safari / some Android browsers ignore "instant" or scroll <body>
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

function scrollToHash(hash) {
    try {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) {
            el.scrollIntoView({ block: "start", behavior: "instant" });
            return true;
        }
    } catch {
        /* ignore malformed hashes */
    }
    return false;
}

export default function RouteScrollManager() {
    const pathname = usePathname();
    const isPopNavigation = useRef(false);
    const isFirstRender = useRef(true);

    // Remember when the user pressed Back / Forward
    useEffect(() => {
        const onPopState = () => {
            isPopNavigation.current = true;
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    useIsoLayoutEffect(() => {
        // First render = full page load or refresh
        if (isFirstRender.current) {
            isFirstRender.current = false;
            const nav = performance.getEntriesByType?.("navigation")?.[0];
            if (nav?.type === "back_forward") return; // let the browser restore
            if (window.location.hash && scrollToHash(window.location.hash)) return;
            scrollToTopInstant();

            // Browsers restore the old scroll position around the load event on
            // refresh — scroll up again once loading finishes (unless the user
            // has already started scrolling).
            let userScrolled = false;
            const markUserScroll = () => {
                userScrolled = true;
            };
            const afterLoad = () => {
                requestAnimationFrame(() => {
                    if (!userScrolled) scrollToTopInstant();
                });
            };
            window.addEventListener("wheel", markUserScroll, { passive: true, once: true });
            window.addEventListener("touchmove", markUserScroll, { passive: true, once: true });
            window.addEventListener("keydown", markUserScroll, { once: true });
            if (document.readyState === "complete") afterLoad();
            else window.addEventListener("load", afterLoad, { once: true });
            return () => {
                window.removeEventListener("wheel", markUserScroll);
                window.removeEventListener("touchmove", markUserScroll);
                window.removeEventListener("keydown", markUserScroll);
                window.removeEventListener("load", afterLoad);
            };
        }

        // Browser Back / Forward: keep the restored position
        if (isPopNavigation.current) {
            isPopNavigation.current = false;
            return;
        }

        if (window.location.hash && scrollToHash(window.location.hash)) return;

        scrollToTopInstant();

        // Run again after paint / late layout shifts (images, fonts, mobile URL bar)
        const raf = requestAnimationFrame(scrollToTopInstant);
        const timer = setTimeout(() => {
            if (window.scrollY < 400) scrollToTopInstant();
        }, 80);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(timer);
        };
    }, [pathname]);

    return null;
}
