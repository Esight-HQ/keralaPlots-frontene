"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

const WIDGET_SRC = "https://chatpier.com/api/public/widget/29782218-375d-49d2-abe4-e4383c6a9d84";

const TYPING_MS = 1100; // "AI is typing…" dots before each message
const READ_MS = 3600; // time each greeting message stays before the next

function timeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

function greetingMessages() {
    return [
        `${timeGreeting()}! 👋 I'm your Kerala Plots AI assistant.`,
        "Tell me your budget and preferred town, and I'll shortlist matching plots in seconds.",
        "You can also ask about prices, approvals, or what's nearby.",
    ];
}

export default function ChatpierWidget() {
    // tip: { mode: "greet" | "hover", text, typing, right, bottom }
    const [tip, setTip] = useState(null);
    const bubbleRef = useRef(null);
    const dismissRef = useRef(() => { });

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
        let greeting = false;
        let timers = [];
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const clearTimers = () => {
            timers.forEach(clearTimeout);
            timers = [];
        };

        const position = () => {
            const r = bubble.getBoundingClientRect();
            return {
                right: Math.max(12, window.innerWidth - r.right),
                bottom: window.innerHeight - r.top + 14,
            };
        };

        const showTip = (mode, text, typing = false) => {
            if (!bubble) return;
            setTip({ mode, text, typing, ...position() });
        };

        const markGreeted = () => {
            try { sessionStorage.setItem("kp-bot-greeted", "1"); } catch { }
        };

        const endGreeting = () => {
            greeting = false;
            clearTimers();
            setTip(null);
            bubble?.classList.remove("kp-bot-wave");
            markGreeted();
        };
        dismissRef.current = endGreeting;

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

        const onEnter = () => {
            if (!greeting) showTip("hover", "Hunting for land? Ask me anything.");
        };
        const onLeave = () => {
            if (!greeting) setTip(null);
        };
        const onClick = () => {
            endGreeting();
            if (!bubble) return;
            bubble.classList.remove("kp-bot-boing");
            void bubble.offsetWidth; // restart animation
            bubble.classList.add("kp-bot-boing");
        };

        const runGreeting = () => {
            const messages = greetingMessages();
            greeting = true;
            bubble.classList.add("kp-bot-wave");
            let t = 0;
            messages.forEach((text) => {
                timers.push(setTimeout(() => showTip("greet", text, true), t));
                t += TYPING_MS;
                timers.push(setTimeout(() => showTip("greet", text, false), t));
                t += READ_MS;
            });
            // Leave the last message up a little longer, then tidy away
            timers.push(setTimeout(endGreeting, t + 4000));
        };

        const attach = (el) => {
            bubble = el;
            bubbleRef.current = el;
            el.classList.add("kp-bot");
            el.setAttribute("aria-label", "Chat with Kerala Plots AI assistant");
            el.addEventListener("mouseenter", onEnter);
            el.addEventListener("mouseleave", onLeave);
            el.addEventListener("click", onClick);
            window.addEventListener("mousemove", onMove, { passive: true });

            let greeted = false;
            try { greeted = sessionStorage.getItem("kp-bot-greeted") === "1"; } catch { }
            if (!greeted) timers.push(setTimeout(runGreeting, 2500));
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
            clearTimers();
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

    const openChat = () => {
        dismissRef.current();
        bubbleRef.current?.click();
    };

    return (
        <>
            <Script
                id="chatpier-widget"
                src={WIDGET_SRC}
                strategy="afterInteractive"
            />
            {tip && (
                <div
                    className={`kp-bot-tip kp-bot-tip--${tip.mode}`}
                    style={{ right: tip.right, bottom: tip.bottom }}
                >
                    <div className="kp-bot-tip-head">
                        <span className="kp-bot-tip-avatar" aria-hidden="true" />
                        <span className="kp-bot-tip-name">Kerala Plots AI</span>
                        <span className="kp-bot-tip-status">Online</span>
                        {tip.mode === "greet" && (
                            <button
                                type="button"
                                className="kp-bot-tip-close"
                                aria-label="Dismiss"
                                onClick={() => dismissRef.current()}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div className="kp-bot-tip-body" role="status" aria-live="polite">
                        {tip.typing ? (
                            <span className="kp-bot-typing" aria-label="AI is typing">
                                <i /><i /><i />
                            </span>
                        ) : (
                            <p key={tip.text} className="kp-bot-tip-text">{tip.text}</p>
                        )}
                    </div>

                    {tip.mode === "greet" && (
                        <button type="button" className="kp-bot-tip-cta" onClick={openChat}>
                            Chat now
                            <span aria-hidden="true">→</span>
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
