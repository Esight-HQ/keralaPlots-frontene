"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RiMapPin2Fill, RiArrowRightLine } from "react-icons/ri";
import styles from "./homeDistricts.module.css";
import { propertyApi } from "../lib/api";
import { KERALA_DISTRICTS as DISTRICTS, districtForKey as districtFor } from "../lib/keralaDistricts";

const MOBILE_VISIBLE = 8;

const formatCount = (n) => `${Number(n).toLocaleString("en-IN")} ${n === 1 ? "property" : "properties"}`;

export default function HomeDistricts() {
    // null = loading, false = counts unavailable, object = { [district]: { count, keys[] } }
    const [stats, setStats] = useState(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const res = await propertyApi.list({ limit: 1 });
                const facet = res?.facets?.district;
                if (!alive) return;

                if (!facet || typeof facet !== "object") {
                    setStats(false);
                    return;
                }

                const next = Object.fromEntries(DISTRICTS.map((d) => [d.name, { count: 0, keys: [] }]));
                for (const [rawKey, count] of Object.entries(facet)) {
                    const district = districtFor(rawKey);
                    if (!district) continue;
                    next[district.name].count += Number(count) || 0;
                    next[district.name].keys.push(rawKey);
                }
                setStats(next);
            } catch (err) {
                console.error("Failed to load district counts:", err);
                if (alive) setStats(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    const isLoading = stats === null;
    const hasCounts = !!stats;

    // Fixed order (as in the design); counts fill in once loaded.
    const districts = useMemo(() => {
        return DISTRICTS.map((d) => ({
            ...d,
            count: hasCounts ? stats[d.name].count : null,
            // Filter by the exact names the listings use so the results page matches the count.
            filterValue: hasCounts && stats[d.name].keys.length ? stats[d.name].keys.join(",") : d.name,
        }));
    }, [stats, hasCounts]);

    const total = hasCounts ? districts.reduce((sum, d) => sum + d.count, 0) : 0;
    const maxCount = hasCounts ? Math.max(1, ...districts.map((d) => d.count)) : 1;

    return (
        <section className={styles.districtSection} aria-labelledby="home-districts-title">
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <div>
                        <h2 id="home-districts-title" className={styles.sectionTitle}>Explore Properties by District</h2>
                        <p className={styles.sectionSubtitle}>
                            {hasCounts && total > 0
                                ? `${total.toLocaleString("en-IN")} listings across all 14 districts of Kerala`
                                : "Browse listings across all 14 districts of Kerala"}
                        </p>
                    </div>
                    <Link href="/properties" className={styles.viewAllBtn}>
                        View All Properties
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>
                </div>

                <ul className={`${styles.districtGrid} ${showAll ? styles.districtGridExpanded : ""}`}>
                    {districts.map((d, index) => {
                        const isEmpty = hasCounts && d.count === 0;
                        const share = hasCounts ? Math.round((d.count / maxCount) * 100) : 0;

                        return (
                            <li key={d.name} className={`${styles.districtItem} ${index >= MOBILE_VISIBLE ? styles.mobileExtra : ""}`}>
                                <Link
                                    href={`/district/${d.slug}`}
                                    className={`${styles.districtCard} ${isEmpty ? styles.districtCardEmpty : ""}`}
                                    aria-label={hasCounts ? `${d.name}: ${formatCount(d.count)}` : `View properties in ${d.name}`}
                                >
                                    <span className={styles.photoWrap}>
                                        <img
                                            src={d.image}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            className={styles.photo}
                                            onError={(e) => {
                                                // Retry once without cache (a stale cached 404), then fall back to the gradient.
                                                const img = e.currentTarget;
                                                if (!img.dataset.retried) {
                                                    img.dataset.retried = "1";
                                                    img.src = `${d.image}?r=${Date.now()}`;
                                                } else {
                                                    img.style.visibility = "hidden";
                                                }
                                            }}
                                        />
                                        <span className={styles.codeBadge} aria-hidden="true">{d.short}</span>
                                    </span>

                                    {/* <span className={styles.pinBubble} aria-hidden="true">
                                        <RiMapPin2Fill />
                                    </span> */}

                                    <span className={styles.cardBody}>
                                        <span className={styles.cardText}>
                                            <span className={styles.districtName} title={d.name}>{d.label}</span>
                                            <span className={styles.districtCount}>
                                                {isLoading ? (
                                                    <span className={styles.countSkeleton} aria-hidden="true" />
                                                ) : hasCounts ? (
                                                    isEmpty ? "No listings yet" : formatCount(d.count)
                                                ) : (
                                                    "View properties"
                                                )}
                                            </span>
                                        </span>
                                        <span className={styles.arrowBtn} aria-hidden="true">
                                            <RiArrowRightLine />
                                        </span>
                                    </span>

                                    {/* <span
                                        className={styles.accentBar}
                                        aria-hidden="true"
                                        style={{ width: hasCounts ? `${isEmpty ? 0 : Math.max(18, Math.round(share * 0.6))}%` : "18%" }}
                                    /> */}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {!showAll && (
                    <button type="button" className={styles.showAllBtn} onClick={() => setShowAll(true)}>
                        Show all 14 districts
                    </button>
                )}
            </div>
        </section>
    );
}
