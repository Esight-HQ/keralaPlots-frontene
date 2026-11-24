"use client";

import dynamic from "next/dynamic";

/* Site-wide widgets that render nothing on first paint (offline screen,
   compare bucket, preferences popup). Loading them as separate chunks after
   the page has hydrated keeps their JS and CSS off the critical path of
   every page, without changing what the visitor sees. */
const OfflineScreen = dynamic(() => import("../offline/offlineScreen"), { ssr: false });
const CompareWidget = dynamic(() => import("../compareWidget/compareWidget"), { ssr: false });
const PreferencePopup = dynamic(() => import("../preferencePopup/PreferencePopup"), { ssr: false });

export default function LazyWidgets() {
    return (
        <>
            <OfflineScreen />
            <CompareWidget />
            <PreferencePopup />
        </>
    );
}
