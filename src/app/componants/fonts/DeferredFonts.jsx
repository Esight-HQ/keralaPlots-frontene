"use client";

import { useEffect } from "react";

/* The decorative fonts (Caveat handwriting captions, Playfair Display banner
   fallback) used to be loaded twice — a CSS @import plus a <link> — both
   render-blocking, so no page could paint until Google Fonts answered.
   They now load after the page is interactive; text shows immediately in the
   fallback font and swaps when the font arrives (font-display: swap). */
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Playfair+Display:wght@400&display=swap";

export default function DeferredFonts() {
    useEffect(() => {
        if (document.querySelector(`link[data-kp-fonts]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = FONT_CSS;
        link.dataset.kpFonts = "1";
        document.head.appendChild(link);
    }, []);
    return null;
}
