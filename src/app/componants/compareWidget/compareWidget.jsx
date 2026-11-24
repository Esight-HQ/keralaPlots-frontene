"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    removeFromCompare,
    clearCompare,
} from "../../lib/compareStore";
import { RiScales3Line, RiCloseLine, RiArrowRightLine } from "react-icons/ri";
import styles from "./compareWidget.module.css";

/* Root-layout-level, like OfflineScreen — this is the only way to have a
   widget survive navigation without wiring it into every page individually.
   Renders nothing until there's actually something to compare. */
export default function CompareWidget() {
    const { hydrated, list } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const [bump, setBump] = useState(false);

    // The property page's "fly to bucket" animation fires this once the
    // flying thumbnail lands, so the bucket can react even though it lives
    // in a completely different part of the tree.
    useEffect(() => {
        const onLanded = () => {
            setBump(true);
            const timer = setTimeout(() => setBump(false), 500);
            return () => clearTimeout(timer);
        };
        window.addEventListener("kp:compare-item-landed", onLanded);
        return () => window.removeEventListener("kp:compare-item-landed", onLanded);
    }, []);

    if (!hydrated || list.length === 0) return null;

    return (
        <div id="kp-compare-widget" className={`${styles.widget} ${bump ? styles.widgetBump : ""}`}>
            <div className={styles.header}>
                <span className={styles.title}>
                    <RiScales3Line /> Compare ({list.length}/3)
                </span>
                <button type="button" className={styles.clearBtn} onClick={clearCompare} aria-label="Clear compare list">
                    <RiCloseLine />
                </button>
            </div>

            <div className={styles.thumbs}>
                {list.map((p) => (
                    <div key={p.id} className={styles.thumbWrap}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img loading="lazy" decoding="async" src={p.image} alt={p.title} className={styles.thumb} />
                        <button
                            type="button"
                            className={styles.removeThumbBtn}
                            onClick={() => removeFromCompare(p.id)}
                            aria-label={`Remove ${p.title} from compare`}
                        >
                            <RiCloseLine />
                        </button>
                    </div>
                ))}
            </div>

            <Link
                href={`/compare?ids=${list.map((p) => p.id).join(",")}`}
                className={styles.compareBtn}
                onClick={() => {
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("kp:compare-reload"));
                    }
                }}
            >
                Compare Now <RiArrowRightLine />
            </Link>
        </div>
    );
}
