"use client";

import { useEffect } from "react";

/**
 * Blocks the zoom gestures the viewport meta tag can't reach:
 * ctrl/cmd+wheel and trackpad pinch (both fire as a ctrl-flagged wheel
 * event), the keyboard shortcuts, and Safari's non-standard gesture
 * events. Touch pinch-zoom is handled by `touch-action` in globals.css;
 * this only adds the multi-touch fallback for engines that ignore it.
 */
export default function PreventZoom() {
    useEffect(() => {
        const blockCtrlWheel = (event) => {
            if (event.ctrlKey) event.preventDefault();
        };

        const blockZoomKeys = (event) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                ["+", "-", "=", "_", "0"].includes(event.key)
            ) {
                event.preventDefault();
            }
        };

        const blockTouchZoom = (event) => {
            if (event.touches.length > 1) event.preventDefault();
        };

        const blockGesture = (event) => event.preventDefault();

        window.addEventListener("wheel", blockCtrlWheel, { passive: false });
        window.addEventListener("keydown", blockZoomKeys);
        window.addEventListener("touchmove", blockTouchZoom, { passive: false });
        // Safari only; other engines never fire these.
        window.addEventListener("gesturestart", blockGesture);
        window.addEventListener("gesturechange", blockGesture);

        return () => {
            window.removeEventListener("wheel", blockCtrlWheel);
            window.removeEventListener("keydown", blockZoomKeys);
            window.removeEventListener("touchmove", blockTouchZoom);
            window.removeEventListener("gesturestart", blockGesture);
            window.removeEventListener("gesturechange", blockGesture);
        };
    }, []);

    return null;
}
