"use client";

import { useEffect } from "react";

// Registers /sw.js, which keeps images and video files cached on the
// visitor's device for ~6 months. Production only, so media you change
// during development always shows up straight away.
export default function MediaCacheRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (!("serviceWorker" in navigator)) return;

        const register = () => {
            navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
        };

        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });
    }, []);

    return null;
}
