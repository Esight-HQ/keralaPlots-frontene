/* Flies a small clone of a property photo from wherever "Add to Compare"
   was clicked to the fixed bottom-right corner the compare widget lives in,
   shrinking and fading it along the way. Targets a fixed viewport point
   rather than the widget's real DOM rect since the widget may not even be
   mounted yet on the very first add. Shared by every page with its own
   "Add to Compare" entry point, so the effect always looks the same. */
export function flyToCompareBucket(originEl, imageUrl) {
    if (typeof window === "undefined" || !originEl) return;

    const rect = originEl.getBoundingClientRect();
    const SIZE = 56;
    const originX = rect.left + rect.width / 2 - SIZE / 2;
    const originY = rect.top + rect.height / 2 - SIZE / 2;

    const flyer = document.createElement("div");
    flyer.style.cssText = `
        position: fixed;
        left: ${originX}px;
        top: ${originY}px;
        width: ${SIZE}px;
        height: ${SIZE}px;
        border-radius: 14px;
        background-image: url("${imageUrl}");
        background-size: cover;
        background-position: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        pointer-events: none;
        transition: transform 0.75s cubic-bezier(0.32, 1.4, 0.55, 1), opacity 0.75s ease-in, border-radius 0.75s ease;
        transform-origin: top left;
    `;
    document.body.appendChild(flyer);

    const targetX = window.innerWidth - 40;
    const targetY = window.innerHeight - 40;
    const finalSize = 12;
    const scale = finalSize / SIZE;
    const dx = targetX - finalSize / 2 - originX;
    const dy = targetY - finalSize / 2 - originY;

    // Two rAFs so the browser paints the flyer at its starting spot before
    // the transition kicks in — one frame isn't reliably enough.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            flyer.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
            flyer.style.opacity = "0.2";
            flyer.style.borderRadius = "50%";
        });
    });

    setTimeout(() => {
        flyer.remove();
        window.dispatchEvent(new CustomEvent("kp:compare-item-landed"));
    }, 780);
}
