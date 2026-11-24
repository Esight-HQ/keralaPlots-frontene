/* Downloads lazily-loaded chunks in the background once the browser is idle,
   so a component split out of the first load is already there by the time
   the visitor needs it (e.g. the next step of a form, or a modal).
   Usage: useEffect(() => preloadWhenIdle([loadA, loadB]), []); */
export function preloadWhenIdle(loaders) {
    if (typeof window === "undefined") return undefined;

    const run = () => {
        loaders.forEach((load) => {
            load().catch(() => {});
        });
    };

    if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(run, { timeout: 3000 });
        return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(run, 1500);
    return () => window.clearTimeout(timer);
}
