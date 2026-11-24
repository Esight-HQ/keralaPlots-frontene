"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./profile.module.css";
import ActivityChart from "./ActivityChart";
import AgentStatusBanner from "./AgentStatusBanner";
import BuilderStatusBanner from "./BuilderStatusBanner";
import EmptyState from "./EmptyState";
import emptyStyles from "./emptyState.module.css";
import { useAuth } from "../context/AuthContext";
import { propertyApi, formatPropertyImgUrl, DEFAULT_PROPERTY_NO_IMAGE } from "../lib/api";
import { reelsApi } from "../lib/reelsApi";
import { useDashboard } from "../lib/useDashboard";
import { getPropertyUrl } from "../lib/seoHelper";
import {
    dashboardStats as fallbackDashboardStats,
    RANGE_OPTIONS,
} from "./profileData";
import {
    RiHeart3Line,
    RiHeart3Fill,
    RiHome5Line,
    RiChat3Line,
    RiEyeLine,
    RiInformationLine,
    RiArrowDownSLine,
    RiArrowRightSLine,
    RiArrowLeftSLine,
    RiMapPin2Line,
} from "react-icons/ri";
import PropertyIdBadge, { PropertyBadgeRow } from "../componants/propertyIdBadge/PropertyIdBadge";

const STAT_ICONS = {
    favorites: RiHeart3Line,
    added: RiHome5Line,
    contacted: RiChat3Line,
    views: RiEyeLine,
};

/* Pale skyline behind the page title. */
function DashboardArt() {
    return (
        <svg className={styles.headerArt} viewBox="0 0 460 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g fill="#eef2fb">
                <rect x="10" y="46" width="54" height="84" rx="2" />
                <rect x="76" y="26" width="42" height="104" rx="2" />
                <rect x="330" y="34" width="48" height="96" rx="2" />
                <rect x="392" y="54" width="58" height="76" rx="2" />
            </g>
            <rect x="132" y="34" width="86" height="96" rx="3" fill="#dbe5f8" />
            <rect x="226" y="16" width="96" height="114" rx="3" fill="#ffffff" stroke="#dbe5f8" strokeWidth="2" />
            <g fill="#c9d8f2">
                <rect x="150" y="52" width="22" height="18" rx="2" />
                <rect x="180" y="52" width="22" height="18" rx="2" />
                <rect x="150" y="82" width="22" height="18" rx="2" />
                <rect x="180" y="82" width="22" height="18" rx="2" />
                <rect x="244" y="36" width="26" height="20" rx="2" />
                <rect x="280" y="36" width="26" height="20" rx="2" />
                <rect x="244" y="68" width="26" height="20" rx="2" />
                <rect x="280" y="68" width="26" height="20" rx="2" />
                <rect x="262" y="100" width="26" height="30" rx="2" />
            </g>
            <g fill="#cfe0cd">
                <circle cx="106" cy="104" r="18" />
                <circle cx="352" cy="100" r="20" />
            </g>
            <g fill="#b9cdb6">
                <rect x="103" y="104" width="6" height="26" />
                <rect x="349" y="100" width="6" height="30" />
            </g>
        </svg>
    );
}

/**
 * Profile Dashboard — the landing page of /profile.
 *
 * Dynamically data-driven: connects to live backend statistics,
 * real property views & calls time-series, recently viewed properties,
 * and user's tracked listings.
 */
export default function ProfileDashboardPage() {
    const { user } = useAuth();
    const {
        loading,
        stats,
        chartData,
        trackedProperties,
        recentProperties,
        range,
        setRange,
        selectedProperties,
        toggleProperty,
        toggleAllProperties,
        refetch,
    } = useDashboard("30");

    const displayName = user?.name || user?.personal_details?.fullname || "User";
    const firstName = displayName.trim().split(" ")[0] || displayName;

    const [favoriteIds, setFavoriteIds] = useState([]);
    // Live saved counts (properties + reels); null until loaded
    const [savedPropertyTotal, setSavedPropertyTotal] = useState(null);
    const [savedReelTotal, setSavedReelTotal] = useState(null);
    const carouselRef = useRef(null);
    const selectAllRef = useRef(null);

    const allTrackedSelected =
        trackedProperties.length > 0 && selectedProperties.length === trackedProperties.length;

    // Indeterminate can only be set via the DOM property, not a JSX attribute
    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate =
                selectedProperties.length > 0 && selectedProperties.length < trackedProperties.length;
        }
    }, [selectedProperties, trackedProperties]);

    // Sync user favorites list (+ saved reels) — the Favorites card counts both
    useEffect(() => {
        let alive = true;
        const totalOf = (res, list) => {
            const t = Number(res?.meta?.total ?? res?.total);
            return Number.isFinite(t) && t >= list.length ? t : list.length;
        };
        propertyApi.favorites({ limit: 60 })
            .then((res) => {
                if (!alive) return;
                const list = res?.data || [];
                setFavoriteIds(list.map((p) => Number(p.id || p.propertyId)));
                setSavedPropertyTotal(totalOf(res, list));
            })
            .catch(() => {});
        reelsApi.saved({ limit: 60 })
            .then((res) => {
                if (!alive) return;
                setSavedReelTotal(totalOf(res, res?.data || []));
            })
            .catch(() => {});

        return () => {
            alive = false;
        };
    }, []);

    const toggleFavorite = async (propertyId) => {
        const numId = Number(propertyId);
        const isFav = favoriteIds.includes(numId);
        setFavoriteIds((prev) => (isFav ? prev.filter((id) => id !== numId) : [...prev, numId]));
        setSavedPropertyTotal((n) => (n === null ? n : Math.max(0, n + (isFav ? -1 : 1))));

        try {
            await propertyApi.toggleFavorite(numId);
            refetch({ silent: true });
        } catch (err) {
            // Roll back the optimistic change
            setFavoriteIds((prev) => (isFav ? [...prev, numId] : prev.filter((id) => id !== numId)));
            setSavedPropertyTotal((n) => (n === null ? n : Math.max(0, n + (isFav ? 1 : -1))));
            console.error("Failed to toggle favorite:", err);
        }
    };

    /* Favorites = saved properties + saved reels, counted live from the same
       sources as the Saved page (falls back to the dashboard API until loaded). */
    const favoritesLoaded = savedPropertyTotal !== null || savedReelTotal !== null;
    const favoritesCount = favoritesLoaded
        ? (savedPropertyTotal ?? 0) + (savedReelTotal ?? 0)
        : Number(stats.favorites ?? 0);
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const favoritesHint = favoritesLoaded
        ? `${plural(savedPropertyTotal ?? 0, "property", "properties")} · ${plural(savedReelTotal ?? 0, "reel", "reels")}`
        : "Properties & reels saved";
    const statValues = { ...stats, favorites: favoritesCount };

    /* Check if user has any real listings, views, favorites or contacted properties */
    const hasActivity =
        Object.values(statValues).some((value) => Number(value) > 0) ||
        trackedProperties.length > 0 ||
        recentProperties.length > 0;

    const scrollCarousel = (direction) => {
        const track = carouselRef.current;
        if (!track) return;
        track.scrollBy({ left: direction * (track.clientWidth * 0.6), behavior: "smooth" });
    };

    return (
        <>
            <header className={styles.pageHead}>
                <div>
                    <h1 className={styles.pageTitle}>Dashboard</h1>
                    <p className={styles.pageSub}>
                        Welcome back, {firstName}! Here&rsquo;s your property activity overview.
                    </p>
                </div>
                <DashboardArt />
            </header>

            {/* Pending / rejected registration notices only (approved banners & subscription plans hidden on Dashboard) */}
            <AgentStatusBanner />
            <BuilderStatusBanner />

            {/* ---- stat cards ---- */}
            <section className={styles.statRow}>
                {fallbackDashboardStats.map(({ id, label, hint, tone }) => {
                    const Icon = STAT_ICONS[id] || RiHome5Line;
                    const value = Number(statValues[id] ?? 0);
                    const isFavorites = id === "favorites";
                    const content = (
                        <>
                            <span className={`${styles.statIcon} ${styles[tone]}`}>
                                <Icon aria-hidden="true" />
                            </span>
                            <span className={styles.statValue}>
                                {value === 0 ? "0" : String(value).padStart(2, "0")}
                            </span>
                            <span className={styles.statLabel}>{label}</span>
                            <span className={styles.statHint}>{isFavorites ? favoritesHint : hint}</span>
                        </>
                    );
                    return isFavorites ? (
                        <Link
                            key={id}
                            href="/profile/saved-properties"
                            className={`${styles.statCard} ${styles.statCardLink}`}
                            aria-label={`${label}: ${value} — ${favoritesHint}. View saved items`}
                        >
                            {content}
                        </Link>
                    ) : (
                        <article key={id} className={styles.statCard}>
                            {content}
                        </article>
                    );
                })}
            </section>

            {!hasActivity && !loading ? (
                <EmptyState
                    title="No Content Yet"
                    lines={[
                        "You haven’t added or viewed any properties yet.",
                        "Start exploring and manage your property activities here.",
                    ]}
                    className={styles.dashboardEmpty}
                >
                    <Link href="/properties" className={emptyStyles.btn}>
                        <RiHome5Line aria-hidden="true" />
                        Explore Properties
                    </Link>
                </EmptyState>
            ) : (
                <>
                    {/* ---- activity ---- */}
                    <section className={styles.panel}>
                        <div className={styles.panelHead}>
                            <div>
                                <h2 className={styles.panelTitle}>
                                    Property Views &amp; Call History
                                    <span
                                        className={styles.infoDot}
                                        title="Views and calls recorded for the properties you have selected"
                                    >
                                        <RiInformationLine aria-hidden="true" />
                                    </span>
                                </h2>
                                <p className={styles.panelSub}>Which property got the most views and calls</p>
                            </div>

                            <div className={styles.rangeWrap}>
                                <select
                                    className={styles.rangeSelect}
                                    value={range}
                                    onChange={(e) => setRange(e.target.value)}
                                    aria-label="Chart date range"
                                >
                                    {RANGE_OPTIONS.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <RiArrowDownSLine className={styles.rangeChevron} aria-hidden="true" />
                            </div>
                        </div>

                        <div className={styles.activityBody}>
                            {trackedProperties.length > 0 ? (
                                <div className={styles.trackPanel}>
                                    <label className={styles.trackSelectAll}>
                                        <input
                                            type="checkbox"
                                            ref={selectAllRef}
                                            className={styles.trackCheckInput}
                                            checked={allTrackedSelected}
                                            onChange={toggleAllProperties}
                                        />
                                        <span className={styles.trackCheck} aria-hidden="true" />
                                        <span className={styles.trackSelectAllLabel}>
                                            {allTrackedSelected ? "Unselect All" : "Select All"}
                                        </span>
                                    </label>

                                    <div className={styles.trackList}>
                                    {trackedProperties.map((property) => {
                                        const propIdStr = String(property.id || property.propertyId);
                                        const checked = selectedProperties.includes(propIdStr);
                                        const isLast = checked && selectedProperties.length === 1;
                                        return (
                                            <label
                                                key={propIdStr}
                                                className={`${styles.trackItem} ${checked ? styles.trackItemActive : ""}`}
                                                title={isLast ? "Keep at least one property selected" : undefined}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className={styles.trackCheckInput}
                                                    checked={checked}
                                                    onChange={() => toggleProperty(propIdStr)}
                                                />
                                                <span className={styles.trackCheck} aria-hidden="true" />
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    loading="lazy"
                                                    decoding="async"
                                                    src={formatPropertyImgUrl(property.thumb)}
                                                    alt={property.name || property.title || "Property"}
                                                    className={styles.trackThumb}
                                                    onError={(e) => {
                                                        if (e.currentTarget.src !== DEFAULT_PROPERTY_NO_IMAGE) {
                                                            e.currentTarget.src = DEFAULT_PROPERTY_NO_IMAGE;
                                                        }
                                                    }}
                                                />
                                                <span className={styles.trackName}>{property.name || property.title}</span>
                                            </label>
                                        );
                                    })}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.trackList} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "120px", color: "#64748b", fontSize: "13px" }}>
                                    <span>List properties to track their views and calls here.</span>
                                </div>
                            )}

                            <ActivityChart data={chartData} />
                        </div>
                    </section>

                    {/* ---- recently viewed ---- */}
                    {recentProperties.length > 0 && (
                        <section className={styles.panel}>
                            <div className={styles.panelHead}>
                                <h2 className={styles.panelTitle}>Recently Viewed Properties</h2>
                                <Link href="/properties" className={styles.viewAll}>
                                    View All
                                </Link>
                            </div>

                            <div className={styles.carouselWrap}>
                                <button
                                    type="button"
                                    className={`${styles.carouselBtn} ${styles.carouselPrev}`}
                                    onClick={() => scrollCarousel(-1)}
                                    aria-label="Previous properties"
                                >
                                    <RiArrowLeftSLine />
                                </button>

                                <div className={styles.carousel} ref={carouselRef}>
                                    {recentProperties.map((property) => {
                                        const propId = Number(property.id || property.property_id);
                                        const isFav = favoriteIds.includes(propId);

                                        return (
                                            <article key={propId} className={styles.propCard}>
                                                <Link href={getPropertyUrl(property)} className={styles.propCardLink}>
                                                    <div className={styles.propMedia}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            loading="lazy"
                                                            decoding="async"
                                                            src={formatPropertyImgUrl(property.image)}
                                                            alt={property.title || "Property"}
                                                            onError={(e) => {
                                                                if (e.currentTarget.src !== DEFAULT_PROPERTY_NO_IMAGE) {
                                                                    e.currentTarget.src = DEFAULT_PROPERTY_NO_IMAGE;
                                                                }
                                                            }}
                                                        />
                                                        <span className={styles.propBadge}>{property.badge || property.property_type || "Property"}</span>
                                                    </div>

                                                    <div className={styles.propBody}>
                                                        <PropertyBadgeRow style={{ marginBottom: 6 }}>
                                                            <PropertyIdBadge property={property} />
                                                        </PropertyBadgeRow>
                                                        <h3 className={styles.propTitle}>{property.title}</h3>
                                                        <p className={styles.propLocation}>
                                                            <RiMapPin2Line aria-hidden="true" />
                                                            {property.location}
                                                        </p>
                                                        <div className={styles.propFoot}>
                                                            <span className={styles.propPrice}>{property.price}</span>
                                                            <span className={styles.propSpec}>{property.spec || ""}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                                <button
                                                    type="button"
                                                    className={styles.propHeart}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleFavorite(propId);
                                                    }}
                                                    aria-label={
                                                        isFav
                                                            ? `Remove ${property.title} from favorites`
                                                            : `Save ${property.title} to favorites`
                                                    }
                                                    aria-pressed={isFav}
                                                >
                                                    {isFav ? <RiHeart3Fill className={styles.heartOn} /> : <RiHeart3Line />}
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className={`${styles.carouselBtn} ${styles.carouselNext}`}
                                    onClick={() => scrollCarousel(1)}
                                    aria-label="More properties"
                                >
                                    <RiArrowRightSLine />
                                </button>
                            </div>
                        </section>
                    )}
                </>
            )}
        </>
    );
}
