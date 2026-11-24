"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./homeFeaturedBuilders.module.css";
import { builderApi, resolveBackendOrigin } from "../lib/api";
import {
    RiBuilding2Line,
    RiVerifiedBadgeFill,
    RiMapPin2Line,
    RiArrowRightLine,
    RiCalendarLine,
    RiHomeSmileLine,
    RiPriceTag3Line,
} from "react-icons/ri";

const LOGO_COLORS = ["#12296b", "#6d53fd", "#0f766e", "#b45309", "#be123c", "#1d4ed8", "#7c3aed", "#047857"];

const colorFor = (name) => {
    let h = 0;
    const str = name || "Builder";
    for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return LOGO_COLORS[h % LOGO_COLORS.length];
};

const initialsOf = (name) =>
    (name || "Builder")
        .replace(/[^A-Za-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w && !/^(and|of|the|&)$/i.test(w))
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("") || "B";

const currentYear = new Date().getFullYear();

const rateNumber = (value) => {
    const digits = String(value ?? "").replace(/[₹,\s]/g, "");
    return /^\d+(\.\d+)?$/.test(digits) ? Number(digits) : null;
};

const formatRate = (value) => {
    if (value === null || value === undefined || String(value).trim() === "") return "";
    const n = rateNumber(value);
    return n === null ? String(value).trim() : `₹${n.toLocaleString("en-IN")}`;
};

function BuilderLogo({ name, logo }) {
    const [failed, setFailed] = useState(false);
    if (logo && !failed) {
        return (
            <span className={styles.logo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={logo}
                    alt={`${name} logo`}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                />
            </span>
        );
    }
    return (
        <span
            className={`${styles.logo} ${styles.logoInitials}`}
            style={{ background: colorFor(name) }}
            aria-hidden="true"
        >
            {initialsOf(name)}
        </span>
    );
}

function normalizeBuilderAssetUrl(raw) {
    const val = String(raw || "").trim();
    if (!val) return "";
    if (/^(https?:\/\/|data:|blob:)/i.test(val)) return val;
    if (val.startsWith("//")) return `https:${val}`;
    const origin = resolveBackendOrigin();
    return `${origin}/${val.replace(/^\/+/, "")}`;
}

function BuilderCard({ builder }) {
    const [coverFailed, setCoverFailed] = useState(false);
    const name = builder.name || "Trusted Developer";
    const role = builder.role || "Residential Builder";
    const place = builder.place || "Kerala";
    const rate = formatRate(builder.rate);
    const years = builder.years || (builder.since ? Math.max(1, currentYear - Number(builder.since)) : null);
    const slug =
        builder.slug ||
        (name
            ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
            : String(builder.id || "builder"));
    const detailHref = `/builders/${slug}`;

    return (
        <Link
            href={detailHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.builderCard}
            aria-label={`View details of ${name}`}
        >
            <div className={styles.cover}>
                {builder.cover && !coverFailed ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={builder.cover}
                        alt={`Project by ${name}`}
                        loading="lazy"
                        decoding="async"
                        onError={() => setCoverFailed(true)}
                    />
                ) : (
                    <span className={styles.coverFallback} aria-hidden="true">
                        <RiBuilding2Line />
                    </span>
                )}
                {builder.verified && (
                    <span className={styles.verified} title="Verified by KeralaPlots">
                        <RiVerifiedBadgeFill aria-hidden="true" /> Verified
                    </span>
                )}
                <BuilderLogo name={name} logo={builder.logo} />
            </div>

            <div className={styles.cardBody}>
                <h3 className={styles.cardName} title={name}>
                    {name}
                </h3>
                <span className={styles.cardRole} title={role}>
                    {role}
                </span>

                <p className={styles.cardPlace} title={place}>
                    <RiMapPin2Line aria-hidden="true" />
                    <span>{place}</span>
                </p>

                {(years || builder.projects || rate) && (
                    <ul className={styles.stats}>
                        {years && (
                            <li>
                                <RiCalendarLine aria-hidden="true" /> {years}+ yrs
                            </li>
                        )}
                        {builder.projects ? (
                            <li>
                                <RiHomeSmileLine aria-hidden="true" /> {builder.projects} projects
                            </li>
                        ) : null}
                        {rate && (
                            <li>
                                <RiPriceTag3Line aria-hidden="true" /> From {rate}
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </Link>
    );
}

export default function HomeFeaturedBuilders() {
    const carouselRef = useRef(null);
    const [builders, setBuilders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activePage, setActivePage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch live approved builders dynamically from the backend API
    useEffect(() => {
        let isMounted = true;

        const loadBuilders = async () => {
            setIsLoading(true);
            try {
                const res = await builderApi.list({ force: true });
                const list = Array.isArray(res) ? res : [];
                const seenIds = new Set();
                const dynamicBuilders = [];

                list.forEach((s, idx) => {
                    const rawName = String(s?.name || s?.company_name || s?.full_name || "").trim();
                    if (!rawName) return;
                    const dedupeKey = String(s?.slug || s?.builder_id || s?.id || rawName.toLowerCase());
                    if (seenIds.has(dedupeKey)) return;
                    seenIds.add(dedupeKey);

                    dynamicBuilders.push({
                        id: s.id || `builder-${idx}`,
                        slug:
                            s.slug ||
                            rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                        name: rawName,
                        role: s.role || s.service_name || "Residential Builder",
                        place: s.place || s.service_place || "Kerala",
                        logo: normalizeBuilderAssetUrl(s.logo || s.avatar || s.photo || ""),
                        cover: normalizeBuilderAssetUrl(s.cover || s.cover_image || s.banner || ""),
                        rate: s.rate || s.starting_price || "",
                        since: s.since || s.established_year || null,
                        years: s.years || null,
                        projects: s.projects !== undefined && s.projects !== null && Number(s.projects) > 0
                            ? Number(s.projects)
                            : null,
                        verified: s.verified !== false,
                    });
                });

                if (isMounted) {
                    setBuilders(dynamicBuilders);
                }
            } catch (err) {
                console.warn("Failed to load featured builders:", err?.message || err);
                if (isMounted) {
                    setBuilders([]);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadBuilders();

        return () => {
            isMounted = false;
        };
    }, []);

    // Check scroll boundaries and update active dot
    const checkScroll = useCallback(() => {
        const el = carouselRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;

        // Calculate approximate active page
        if (clientWidth > 0) {
            const pages = Math.max(1, Math.ceil(scrollWidth / clientWidth));
            setTotalPages(pages);
            const curr = Math.min(pages - 1, Math.max(0, Math.round(scrollLeft / clientWidth)));
            setActivePage(curr);
        }
    }, []);

    useEffect(() => {
        const el = carouselRef.current;
        if (!el) return;

        el.addEventListener("scroll", checkScroll, { passive: true });
        window.addEventListener("resize", checkScroll);
        checkScroll();

        return () => {
            el.removeEventListener("scroll", checkScroll);
            window.removeEventListener("resize", checkScroll);
        };
    }, [checkScroll, builders]);

    const scrollToPage = (pageIndex) => {
        const el = carouselRef.current;
        if (!el) return;
        el.scrollTo({ left: pageIndex * el.clientWidth, behavior: "smooth" });
    };

    const handleKeyDown = (e) => {
        const el = carouselRef.current;
        if (!el) return;
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
        }
    };

    if (!isLoading && builders.length === 0) {
        return null;
    }

    return (
        <section className={styles.section} aria-labelledby="featured-builders-heading">
            <div className={styles.container}>
                {/* Header Row */}
                <div className={styles.headerRow}>
                    <div className={styles.headerLeft}>
                        <h2 id="featured-builders-heading" className={styles.sectionTitle}>
                            Featured Builders &amp; Developers
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            Discover Kerala&apos;s leading residential builders, luxury villa architects, and gated township developers with verified K-RERA credentials.
                        </p>
                    </div>

                    <div className={styles.headerRight}>
                        <Link href="/builders" className={styles.viewAllBtn} title="View all verified builders directory">
                            View All Builders <RiArrowRightLine />
                        </Link>
                    </div>
                </div>

                {/* Carousel Track (3 Items In A Row) */}
                <div className={styles.carouselWrapper}>
                    <div
                        ref={carouselRef}
                        className={styles.carouselTrack}
                        tabIndex={0}
                        role="region"
                        aria-label="Featured builders slider"
                        onKeyDown={handleKeyDown}
                    >
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className={`${styles.builderCard} ${styles.skeletonCard}`} aria-hidden="true">
                                    <div className={`${styles.skeletonCover} ${styles.shimmer}`} />
                                    <div className={styles.cardBody}>
                                        <div className={`${styles.skeletonLogo} ${styles.shimmer}`} />
                                        <div className={`${styles.skeletonLine} ${styles.shimmer}`} style={{ width: "70%" }} />
                                        <div className={`${styles.skeletonLine} ${styles.shimmer}`} style={{ width: "45%" }} />
                                        <div className={`${styles.skeletonPills} ${styles.shimmer}`} />
                                    </div>
                                </div>
                            ))
                        ) : builders.length === 0 ? (
                            <div className={styles.emptyState}>No featured builders available right now.</div>
                        ) : (
                            builders.map((builder, idx) => (
                                <BuilderCard key={builder.id || idx} builder={builder} />
                            ))
                        )}
                    </div>
                </div>

                {/* Progress Dots Indicators */}
                {totalPages > 1 && (
                    <div className={styles.dotsRow} role="tablist" aria-label="Carousel pagination">
                        {Array.from({ length: totalPages }).map((_, dotIdx) => (
                            <button
                                key={dotIdx}
                                type="button"
                                role="tab"
                                aria-selected={dotIdx === activePage}
                                aria-label={`Go to slide page ${dotIdx + 1}`}
                                onClick={() => scrollToPage(dotIdx)}
                                className={`${styles.dot} ${dotIdx === activePage ? styles.dotActive : ""}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}