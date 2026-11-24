"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./homeCategories.module.css";
import { propertyApi } from "../lib/api";

const FALLBACK_IMAGE = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public";

const CATEGORIES = [
    {
        id: "house",
        title: "House",
        type: "House",
        href: "/properties",
        image: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/1038ef58-0235-456e-d5b0-4956c59fc000/public",
    },
    {
        id: "apartments",
        title: "Apartments",
        type: "Apartment",
        href: "/properties",
        image: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/211a1ced-fae6-4dc4-e6dd-ef8318fcd500/public",
    },
    {
        id: "villas",
        title: "Villas",
        type: "Villa",
        href: "/properties",
        image: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/d139d093-a05a-4882-6ea0-82f497b0a500/public",
    },
    {
        id: "plots",
        title: "Plots",
        type: "Plot",
        href: "/properties",
        image: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/4f5c4b81-03e3-4e8a-021c-a57d63998700/public",
    },
    {
        id: "commercial",
        title: "Commercial",
        type: "Commercial",
        href: "/properties",
        image: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/5125b1bc-1248-47f1-2a0a-7ec56a7b0a00/public",
    },
    {
        id: "others",
        title: "Others",
        type: "Other",
        href: "/properties",
        image: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/0c712d52-17c0-4855-9ab2-f8716e89b200/public",
    },
];

/* Map a raw property_type facet key from the API to one of the home categories. */
const bucketFor = (rawKey) => {
    const key = String(rawKey || "").toLowerCase().replace(/[\s\-_/]+/g, " ").trim();
    if (!key) return "others";
    if (key.includes("land") || key.includes("plot")) return "plots";
    if (key.includes("apartment") || key.includes("flat")) return "apartments";
    if (key.includes("house") || key.includes("home")) return "house";
    if (key.includes("villa")) return "villas";
    if (["commercial", "shop", "office", "industrial", "warehouse", "building"].some((w) => key.includes(w))) return "commercial";
    return "others";
};

const formatCount = (n) => `${Number(n).toLocaleString("en-IN")} ${n === 1 ? "Property" : "Properties"}`;

export default function HomeCategories() {
    const [counts, setCounts] = useState(null); // null = loading, {} = unavailable
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        const loadCounts = async () => {
            try {
                const res = await propertyApi.list({ limit: 1 });
                const facetTypes = res?.facets?.property_type;
                if (!alive) return;

                if (facetTypes && typeof facetTypes === "object") {
                    const next = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
                    for (const [rawKey, count] of Object.entries(facetTypes)) {
                        next[bucketFor(rawKey)] += Number(count) || 0;
                    }
                    setCounts(next);
                } else {
                    setCounts({});
                }
            } catch (err) {
                console.error("Failed to load category counts:", err);
                if (alive) setCounts({});
            } finally {
                if (alive) setLoading(false);
            }
        };

        loadCounts();
        return () => {
            alive = false;
        };
    }, []);

    const applyFallback = (img) => {
        if (img && !img.src.endsWith(FALLBACK_IMAGE)) {
            img.src = FALLBACK_IMAGE;
        }
    };
    const handleImageError = (e) => applyFallback(e.currentTarget);
    // Catches images that failed before hydration attached onError.
    const checkImageRef = (img) => {
        if (img && img.complete && img.naturalWidth === 0) applyFallback(img);
    };

    return (
        <section className={styles.categoriesSection}>
            <div className={styles.container}>
                <div className={styles.categoriesMain}>
                    <div className={styles.headerRow}>
                        <h2 className={styles.sectionTitle}>Find Properties That Fit Your Needs</h2>
                        <Link
                            href="/properties"
                            onClick={() => {
                                try {
                                    sessionStorage.removeItem("kp_search_params");
                                } catch (e) {}
                            }}
                            className={styles.viewAllLink}
                        >
                            View All
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </Link>
                    </div>
                    <div className={styles.gridRow}>
                        {CATEGORIES.map((cat) => {
                            const count = counts?.[cat.id];
                            const hasCount = typeof count === "number";
                            return (
                                <Link
                                    key={cat.id}
                                    href="/properties"
                                    onClick={() => {
                                        try {
                                            sessionStorage.setItem("kp_search_params", JSON.stringify({ type: cat.type }));
                                        } catch (e) {}
                                    }}
                                    className={styles.itemCard}
                                >
                                    <div className={styles.imageWrapper}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={cat.image}
                                            alt={`${cat.title} for sale and rent in Kerala`}
                                            className={styles.cardImage}
                                            loading="lazy"
                                            onError={handleImageError}
                                            ref={checkImageRef}
                                        />
                                    </div>
                                    <div className={styles.cardDetails}>
                                        <div className={styles.titleRow}>
                                            <h3 className={styles.itemTitle}>{cat.title}</h3>
                                            {loading ? (
                                                <span className={styles.countSkeleton} aria-hidden="true" />
                                            ) : hasCount ? (
                                                <span className={styles.countText}>{formatCount(count)}</span>
                                            ) : null}
                                        </div>
                                        <div className={styles.exploreBtn}>
                                            <span>Explore Now</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M5 12h14M12 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
