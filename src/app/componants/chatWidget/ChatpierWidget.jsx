"use client";

import { useEffect } from "react";
import Script from "next/script";

const WIDGET_SRC = "https://chatpier.com/api/public/widget/29782218-375d-49d2-abe4-e4383c6a9d84";

export default function ChatpierWidget() {
    useEffect(() => {
        // Show widget when mounted on the Home page
        document.body.classList.remove("kp-hide-chatpier");
        const existingWrap = document.querySelector(".bb-wrap");
        if (existingWrap) {
            existingWrap.style.display = "";
        }

        // Hide widget when navigating away from the Home page
        return () => {
            document.body.classList.add("kp-hide-chatpier");
            const wrap = document.querySelector(".bb-wrap");
            if (wrap) {
                wrap.classList.remove("bb-open");
                document.body.style.removeProperty("overflow");
                document.documentElement.style.removeProperty("overflow");
                wrap.style.display = "none";
            }
        };
    }, []);

    return (
        <Script
            id="chatpier-widget"
            src={WIDGET_SRC}
            strategy="afterInteractive"
        />
    );
}
