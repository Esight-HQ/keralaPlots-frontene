"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { shouldResetAuthScroll } from "../../lib/authRedirect";

function AuthScrollManagerInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const prevRestorationRef = useRef(null);

    const performInstantScrollToTop = () => {
        // Prevent the browser from restoring the previous scroll position
        if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
            if (prevRestorationRef.current === null) {
                prevRestorationRef.current = window.history.scrollRestoration;
            }
            window.history.scrollRestoration = "manual";
        }

        // 1. Immediate instant scroll
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant",
        });

        // 2. Next animation frame (DOM painted at top)
        requestAnimationFrame(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant",
            });

            // 3. Small timeout to override any late image loads / hydration adjustments
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: "instant",
                });

                // Restore previous history scrollRestoration behavior so normal browser navigation is preserved
                if (
                    typeof window !== "undefined" &&
                    "scrollRestoration" in window.history &&
                    prevRestorationRef.current !== null
                ) {
                    window.history.scrollRestoration = prevRestorationRef.current;
                    prevRestorationRef.current = null;
                }
            }, 60);
        });
    };

    useEffect(() => {
        if (shouldResetAuthScroll()) {
            performInstantScrollToTop();
        }
    }, [pathname, searchParams]);

    return null;
}

export default function AuthScrollManager() {
    return (
        <Suspense fallback={null}>
            <AuthScrollManagerInner />
        </Suspense>
    );
}
