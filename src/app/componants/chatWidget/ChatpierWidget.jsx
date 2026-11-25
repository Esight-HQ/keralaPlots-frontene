"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const WIDGET_SRC = "https://chatpier.com/api/public/widget/29782218-375d-49d2-abe4-e4383c6a9d84";

const GREETINGS = [
    "Hi! I'm Kerala Plots AI ✨",
    "Looking for a plot? Ask me anything",
    "I can find properties by budget & location",
];

export default function ChatpierWidget() {
    const [tip, setTip] = useState(null); // { text, right, bottom }

    useEffect(() => {
        // Show widget when mounted on the Home page
        document.body.classList.remove("kp-hide-chatpier");
        const existingWrap = document.querySelector(".bb-wrap");
        if (existingWrap) {
            existingWrap.style.display = "";
        }

        let bubble = null;
        let raf = 0;
        let idleTimer = 0;
        const timers = [];
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const placeTip = (text) => {
            if (!bubble) return;
            const r = bubble.getBoundingClientRect();
            setTip({
                text,
                right: Math.max(12, window.innerWidth - r.right),
                bottom: window.innerHeight - r.top + 12,
            });
        };

        // Eyes follow the cursor
        const onMove = (e) => {
            if (!bubble || reduceMotion) return;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const r = bubble.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                const dist = Math.hypot(dx, dy) || 1;
                const reach = Math.min(1, dist / 260);
                bubble.style.setProperty("--kp-eye-x", `${((dx / dist) * 5 * reach).toFixed(2)}px`);
                bubble.style.setProperty("--kp-eye-y", `${((dy / dist) * 4 * reach).toFixed(2)}px`);
                bubble.classList.remove("kp-bot-sleepy");
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => bubble && bubble.classList.add("kp-bot-sleepy"), 12000);
            });
        };

        const onEnter = () => bubble && placeTip("Tap to chat with our AI 💬");
        const onLeave = () => setTip(null);
        const onClick = () => {
            setTip(null);
            if (!bubble) return;
            bubble.classList.remove("kp-bot-boing");
            void bubble.offsetWidth; // restart animation
            bubble.classList.add("kp-bot-boing");
            try { sessionStorage.setItem("kp-bot-greeted", "1"); } catch { }
        };

        const attach = (el) => {
            bubble = el;
            el.classList.add("kp-bot");
            el.setAttribute("aria-label", "Chat with Kerala Plots AI assistant");
            el.addEventListener("mouseenter", onEnter);
            el.addEventListener("mouseleave", onLeave);
            el.addEventListener("click", onClick);
            window.addEventListener("mousemove", onMove, { passive: true });

            // Friendly greeting once per session: wave + rotating speech bubble
            let greeted = false;
            try { greeted = sessionStorage.getItem("kp-bot-greeted") === "1"; } catch { }
            if (!greeted) {
                timers.push(setTimeout(() => {
                    el.classList.add("kp-bot-wave");
                    GREETINGS.forEach((text, i) => {
                        timers.push(setTimeout(() => placeTip(text), i * 3200));
                    });
                    timers.push(setTimeout(() => {
                        setTip(null);
                        el.classList.remove("kp-bot-wave");
                        try { sessionStorage.setItem("kp-bot-greeted", "1"); } catch { }
                    }, GREETINGS.length * 3200));
                }, 2500));
            }
        };

        // Chatpier injects its bubble asynchronously — wait for it
        const found = document.querySelector(".bb-bubble:not(.bb-video)");
        let observer = null;
        if (found) {
            attach(found);
        } else {
            observer = new MutationObserver(() => {
                const el = document.querySelector(".bb-bubble:not(.bb-video)");
                if (el) {
                    observer.disconnect();
                    attach(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        // Hide widget when navigating away from the Home page
        return () => {
            observer?.disconnect();
            timers.forEach(clearTimeout);
            clearTimeout(idleTimer);
            cancelAnimationFrame(raf);
            window.removeEventListener("mousemove", onMove);
            if (bubble) {
                bubble.removeEventListener("mouseenter", onEnter);
                bubble.removeEventListener("mouseleave", onLeave);
                bubble.removeEventListener("click", onClick);
            }
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
        <>
            <Script
                id="chatpier-widget"
                src={WIDGET_SRC}
                strategy="afterInteractive"
            />
            {tip && (
                <div
                    key={tip.text}
                    className="kp-bot-tip"
                    role="status"
                    style={{ right: tip.right, bottom: tip.bottom }}
                >
                    <span className="kp-bot-tip-badge">AI</span>
                    {tip.text}
                </div>
            )}
        </>
    );
}
