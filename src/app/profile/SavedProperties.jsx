"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import styles from "./savedProperties.module.css";
import emptyStyles from "./emptyState.module.css";
import EmptyState from "./EmptyState";
import { fallbackImageFor } from "../lib/addedPropertiesStore";
import { propertyApi, formatPropertyImgUrl, handlePropertyImageError, formatAddedDate } from "../lib/api";
import { getPropertyUrl } from "../lib/seoHelper";
import { reelsApi } from "../lib/reelsApi";
import {
    shortPropertyType,
    areaFromProperty,
    reelDisplayTitle,
    formatReelPrice,
    formatCount,
    savedReelFromApi,
} from "../lib/propertyDisplay";
import {
    RiSearchLine,
    RiCloseLine,
    RiMapPin2Fill,
    RiHotelBedLine,
    RiCrop2Line,
    RiHome5Line,
    RiBuilding2Line,
    RiLandscapeLine,
    RiHeart3Fill,
    RiHeartLine,
    RiHeart3Line,
    RiBookmarkFill,
    RiPlayFill,
    RiEyeLine,
    RiFilmLine,
} from "react-icons/ri";

/* Bathtub glyph — remixicon has no bath icon, so it is drawn inline */
function BathIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3Z" />
            <path d="M7 12V6.5A2.5 2.5 0 0 1 9.5 4c1.2 0 2.1.8 2.4 1.9" />
            <path d="M5 19l-1 2M19 19l1 2" />
        </svg>
    );
}

const TYPE_PILL_CLASS = {
    Villa: styles.typeVilla,
    House: styles.typeHouse,
    Apartment: styles.typeApartment,
    "Plot / Land": styles.typePlot,
    "Commercial Land": styles.typePlot,
    "Agricultural Land": styles.typePlot,
};

const isLandType = (type) => /plot|land/i.test(type || "");

/* Icon standing in for the property type in the spec strip. */
const TYPE_ICON = {
    Villa: RiHome5Line,
    House: RiHome5Line,
    Apartment: RiBuilding2Line,
};

function savedPropertyFromApi(item) {
    const gallery = (item.images || []).map((img) => (typeof img === "string" ? img : img.url || img.image_url || img.file_path)).filter(Boolean);
    const image = formatPropertyImgUrl(item.image || item.cover_image || gallery[0] || fallbackImageFor(item.property_type));
    const type = shortPropertyType(item.property_type || item.type, item.title);

    const formattedAddedDate = formatAddedDate(item.added_date || item.addedDate || item.created_at);

    return {
        id: item.id,
        code: item.code || `KP${item.id}`,
        type,
        title: item.title || "Property",
        location: item.location_label || [item.locality, item.city, item.district].filter(Boolean).join(", ") || "Kerala",
        price: item.price_formatted || "Price on request",
        priceNum: Number(item.price || item.price_sort || 0),
        beds: item.bedrooms ? `${item.bedrooms} Beds` : "",
        baths: item.bathrooms ? `${item.bathrooms} Baths` : "",
        area: areaFromProperty(item),
        savedOn: formattedAddedDate ? `Added ${formattedAddedDate}` : (item.saved_date || "Recently saved"),
        savedTs: item.saved_at ? new Date(item.saved_at).getTime() : Date.now(),
        image,
    };
}

/* Columns the table can be ordered by. */
const SORTABLE = {
    price: { label: "Price", value: (p) => p.priceNum },
    type: { label: "Property Type", value: (p) => p.type },
    saved: { label: "Saved On", value: (p) => p.savedTs },
};

/**
 * "Saved Properties" panel of the profile page — the listings this user has
 * favorited, unsaveable right from the row via the heart toggle.
 */
export default function SavedProperties() {
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState({ key: "saved", direction: "desc" });
    const [removingId, setRemovingId] = useState(null);
    const [tab, setTab] = useState("properties"); // properties | reels
    const [reels, setReels] = useState([]);
    const [reelsLoading, setReelsLoading] = useState(true);

    // Open on the Reels tab when the URL says ?tab=reels
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get("tab") === "reels") setTab("reels");
    }, []);

    const switchTab = (next) => {
        setTab(next);
        setQuery("");
        const url = new URL(window.location.href);
        if (next === "reels") url.searchParams.set("tab", "reels");
        else url.searchParams.delete("tab");
        window.history.replaceState(window.history.state, "", url);
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            setReelsLoading(true);
            try {
                const response = await reelsApi.saved({ limit: 60 });
                if (alive) setReels((response.data || []).map(savedReelFromApi));
            } catch {
                if (alive) setReels([]);
            } finally {
                if (alive) setReelsLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    const visibleReels = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return reels;
        return reels.filter((r) =>
            `${r.title} ${r.location} ${r.creator} ${r.price}`.toLowerCase().includes(needle)
        );
    }, [reels, query]);

    const removeReel = async (id) => {
        const previous = reels;
        setReels((prev) => prev.filter((r) => r.id !== id));
        try {
            await reelsApi.toggleSave(id);
        } catch {
            setReels(previous);
        }
    };

    const toggleReelLike = async (id) => {
        const previous = reels;
        setReels((prev) => prev.map((r) => (
            r.id === id ? { ...r, isLiked: !r.isLiked, likes: Math.max(0, r.likes + (r.isLiked ? -1 : 1)) } : r
        )));
        try {
            const response = await reelsApi.toggleLike(id);
            const data = response?.data || {};
            setReels((prev) => prev.map((r) => (
                r.id === id ? { ...r, isLiked: !!data.is_liked, likes: Number(data.likes_count ?? r.likes) } : r
            )));
        } catch {
            setReels(previous);
        }
    };

    useEffect(() => {
        let alive = true;

        const loadSaved = async () => {
            setIsLoading(true);
            try {
                const response = await propertyApi.favorites({ limit: 60 });
                if (alive) {
                    setProperties((response.data || []).map(savedPropertyFromApi));
                }
            } catch {
                if (alive) setProperties([]);
            } finally {
                if (alive) setIsLoading(false);
            }
        };

        loadSaved();

        return () => {
            alive = false;
        };
    }, []);

    const applySort = (key) => {
        setSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "desc" ? "asc" : "desc" }
                : { key, direction: "desc" }
        );
    };

    const sortHeader = (key) => (
        <button
            type="button"
            className={styles.sortBtn}
            onClick={() => applySort(key)}
            aria-label={`Sort by ${SORTABLE[key].label}`}
        >
            {SORTABLE[key].label}
        </button>
    );

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        const filtered = properties.filter(
            (p) =>
                !needle ||
                p.title.toLowerCase().includes(needle) ||
                p.code.toLowerCase().includes(needle) ||
                p.location.toLowerCase().includes(needle) ||
                p.type.toLowerCase().includes(needle)
        );

        const read = SORTABLE[sort.key].value;
        return [...filtered].sort((a, b) => {
            const left = read(a);
            const right = read(b);
            const order = typeof left === "string" ? left.localeCompare(right) : left - right;
            return sort.direction === "asc" ? order : -order;
        });
    }, [properties, query, sort]);

    // Unsave a property without leaving the list — same backend toggle the
    // standalone Favorites page uses, so the two stay in sync.
    const removeFavorite = async (id) => {
        const previous = properties;
        setRemovingId(id);
        setProperties((prev) => prev.filter((p) => p.id !== id));

        try {
            await propertyApi.toggleFavorite(id);
        } catch {
            setProperties(previous);
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <section className={styles.page}>
            <div className={styles.container}>
                {/* ============================ SECTION HEADER ============================ */}
                <header>
                    <h1 className={styles.pageTitle}>Saved</h1>
                    <p className={styles.pageSub}>Properties and reels you&apos;ve saved on Keralaplots.</p>
                </header>

                <div className={styles.savedTabs} role="tablist" aria-label="Saved items">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "properties"}
                        className={`${styles.savedTab} ${tab === "properties" ? styles.savedTabActive : ""}`}
                        onClick={() => switchTab("properties")}
                    >
                        <RiHome5Line aria-hidden="true" />
                        Properties
                        <span className={styles.savedTabCount}>{isLoading ? "…" : properties.length}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "reels"}
                        className={`${styles.savedTab} ${tab === "reels" ? styles.savedTabActive : ""}`}
                        onClick={() => switchTab("reels")}
                    >
                        <RiFilmLine aria-hidden="true" />
                        Reels
                        <span className={styles.savedTabCount}>{reelsLoading ? "…" : reels.length}</span>
                    </button>
                </div>

                {tab === "reels" ? (
                    <>
                        {reelsLoading ? (
                            <div className={styles.toolbar}>
                                <span className={styles.total}>Loading your saved reels…</span>
                            </div>
                        ) : reels.length > 0 && (
                            <div className={styles.toolbar}>
                                <span className={styles.total}>
                                    Total {visibleReels.length} Saved {visibleReels.length === 1 ? "Reel" : "Reels"}
                                </span>
                                <div className={styles.searchWrap}>
                                    <RiSearchLine className={styles.searchIcon} />
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder="Search by title, location, creator..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        aria-label="Search your saved reels"
                                    />
                                    {query && (
                                        <button type="button" className={styles.searchClear} onClick={() => setQuery("")} aria-label="Clear search">
                                            <RiCloseLine />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {reelsLoading ? (
                            <div className={styles.reelGrid} aria-hidden="true">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className={`${styles.reelCard} ${styles.reelSkeleton}`} />
                                ))}
                            </div>
                        ) : visibleReels.length === 0 ? (
                            reels.length === 0 ? (
                                <EmptyState
                                    title="No Saved Reels Yet"
                                    lines={[
                                        "You haven’t saved any reels yet.",
                                        "Tap the bookmark on a reel to save it here.",
                                    ]}
                                    className={styles.emptyPlacement}
                                >
                                    <Link href="/reels" className={emptyStyles.btn}>
                                        <RiFilmLine aria-hidden="true" />
                                        Browse Reels
                                    </Link>
                                </EmptyState>
                            ) : (
                                <EmptyState
                                    title="No Matches Found"
                                    lines={["No saved reels match your search.", "Try a different title, location or creator."]}
                                    className={styles.emptyPlacement}
                                >
                                    <button type="button" className={emptyStyles.btn} onClick={() => setQuery("")}>
                                        Clear Search
                                    </button>
                                </EmptyState>
                            )
                        ) : (
                            <div className={styles.reelGrid}>
                                {visibleReels.map((reel) => {
                                    const title = reelDisplayTitle(reel.title);
                                    const price = formatReelPrice(reel.price);
                                    return (
                                        <article key={reel.id} className={styles.reelCard}>
                                            <Link href={`/reels?reel=${reel.id}`} className={styles.reelLink} aria-label={`Watch ${title}`}>
                                                {reel.thumbnail ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={reel.thumbnail} alt="" loading="lazy" decoding="async" className={styles.reelImg} />
                                                ) : (
                                                    <span className={styles.reelNoThumb} />
                                                )}
                                                <span className={styles.reelShade} aria-hidden="true" />
                                                <span className={styles.reelViews}>
                                                    <RiEyeLine aria-hidden="true" />
                                                    {formatCount(reel.views)}
                                                </span>
                                                <span className={styles.reelPlayBtn} aria-hidden="true">
                                                    <RiPlayFill />
                                                </span>
                                                <span className={styles.reelInfo}>
                                                    {price && <span className={styles.reelPrice}>{price}</span>}
                                                    <span className={styles.reelTitle}>{title}</span>
                                                    <span className={styles.reelMeta}>
                                                        <RiMapPin2Fill aria-hidden="true" />
                                                        <span>{reel.location}</span>
                                                    </span>
                                                    <span className={styles.reelCreator}>
                                                        <span className={styles.reelAvatar} aria-hidden="true">
                                                            {(reel.creator || "K").charAt(0).toUpperCase()}
                                                        </span>
                                                        <span className={styles.reelCreatorName}>{reel.creator}</span>
                                                    </span>
                                                </span>
                                            </Link>
                                            <button
                                                type="button"
                                                className={styles.reelSaveBtn}
                                                onClick={() => removeReel(reel.id)}
                                                aria-label={`Remove ${title} from saved reels`}
                                                title="Remove from saved"
                                            >
                                                <RiBookmarkFill />
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.reelLikeBtn} ${reel.isLiked ? styles.reelLikeActive : ""}`}
                                                onClick={() => toggleReelLike(reel.id)}
                                                aria-pressed={reel.isLiked}
                                                aria-label={reel.isLiked ? "Unlike reel" : "Like reel"}
                                            >
                                                {reel.isLiked ? <RiHeart3Fill /> : <RiHeart3Line />}
                                                <span>{formatCount(reel.likes)}</span>
                                            </button>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                <>

                {/* ============================ TOOLBAR ============================ */}
                {isLoading ? (
                    <div className={styles.toolbar}>
                        <span className={styles.total}>Loading your saved properties…</span>
                    </div>
                ) : properties.length > 0 && (
                    <div className={styles.toolbar}>
                        <span className={styles.total}>
                            Total {visible.length} Saved {visible.length === 1 ? "Property" : "Properties"}
                        </span>

                        <div className={styles.searchWrap}>
                            <RiSearchLine className={styles.searchIcon} />
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search by property name, ID, location..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                aria-label="Search your saved properties"
                            />
                            {query && (
                                <button
                                    type="button"
                                    className={styles.searchClear}
                                    onClick={() => setQuery("")}
                                    aria-label="Clear search"
                                >
                                    <RiCloseLine />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ============================ TABLE HEADER ============================ */}
                {visible.length > 0 && (
                    <div className={styles.tableHead}>
                        <span className={`${styles.headCell} ${styles.headCellFirst}`}>Property Details</span>
                        <span className={styles.headCell}>{sortHeader("price")}</span>
                        <span className={styles.headCell}>{sortHeader("type")}</span>
                        <span className={styles.headCell}>{sortHeader("saved")}</span>
                    </div>
                )}

                {/* ============================ ROWS ============================ */}
                {!isLoading && visible.length === 0 ? (
                    properties.length === 0 ? (
                        <EmptyState
                            title="No Saved Properties Yet"
                            lines={[
                                "You haven’t saved any properties yet.",
                                "Tap the heart on a listing to save it for later.",
                            ]}
                            className={styles.emptyPlacement}
                        >
                            <Link href="/properties" className={emptyStyles.btn}>
                                <RiHome5Line aria-hidden="true" />
                                Explore Properties
                            </Link>
                        </EmptyState>
                    ) : (
                        <EmptyState
                            title="No Matches Found"
                            lines={[
                                "No saved properties match your search.",
                                "Try a different name, ID or location.",
                            ]}
                            className={styles.emptyPlacement}
                        >
                            <button type="button" className={emptyStyles.btn} onClick={() => setQuery("")}>
                                Clear Search
                            </button>
                        </EmptyState>
                    )
                ) : (
                    <div className={styles.rowList}>
                        {visible.map((p) => {
                            const TypeIcon = TYPE_ICON[p.type] ?? (isLandType(p.type) ? RiLandscapeLine : RiBuilding2Line);

                            return (
                                <article key={p.id} className={styles.row}>
                                    {/* ---- property details ---- */}
                                    <div className={styles.details}>
                                        <div className={styles.thumbBox}>
                                            <Link
                                                href={getPropertyUrl(p)}
                                                className={styles.thumbWrap}
                                                aria-label={`Open ${p.title}`}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img loading="lazy" decoding="async"
                                                    src={p.image}
                                                    alt={p.title}
                                                    className={styles.thumb}
                                                    onError={handlePropertyImageError}
                                                />
                                                <span className={styles.idBadge}>ID: {p.code}</span>
                                            </Link>

                                            <button
                                                type="button"
                                                className={styles.favToggle}
                                                onClick={() => removeFavorite(p.id)}
                                                disabled={removingId === p.id}
                                                aria-label={`Remove ${p.title} from saved properties`}
                                            >
                                                {removingId === p.id ? <RiHeartLine /> : <RiHeart3Fill />}
                                            </button>
                                        </div>

                                        <div className={styles.detailsText}>
                                            <h2 className={styles.titleRow}>
                                                <Link href={getPropertyUrl(p)} className={styles.title}>
                                                    {p.title}
                                                </Link>
                                            </h2>

                                            <p className={styles.location}>
                                                <RiMapPin2Fill className={styles.pinIcon} />
                                                {p.location}
                                            </p>

                                            <ul className={styles.specs}>
                                                {p.beds && (
                                                    <li className={styles.spec}>
                                                        <RiHotelBedLine className={styles.specIcon} />
                                                        {p.beds}
                                                    </li>
                                                )}
                                                {p.baths && (
                                                    <li className={styles.spec}>
                                                        <BathIcon className={styles.specIcon} />
                                                        {p.baths}
                                                    </li>
                                                )}
                                                {p.area && (
                                                    <li className={styles.spec}>
                                                        {isLandType(p.type) ? (
                                                            <RiLandscapeLine className={styles.specIcon} />
                                                        ) : (
                                                            <RiCrop2Line className={styles.specIcon} />
                                                        )}
                                                        {p.area}
                                                    </li>
                                                )}
                                                {!isLandType(p.type) && (
                                                    <li className={styles.spec}>
                                                        <TypeIcon className={styles.specIcon} />
                                                        {p.type}
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* ---- table cells (stacked labels appear on narrow panels) ---- */}
                                    <div className={styles.stack}>
                                        <div className={styles.stackCell}>
                                            <span className={styles.stackLabel}>Price</span>
                                            <span className={styles.price}>{p.price}</span>
                                        </div>

                                        <div className={styles.stackCell}>
                                            <span className={styles.stackLabel}>Property Type</span>
                                            <span className={styles.typeCell}>
                                                <span className={`${styles.typePill} ${TYPE_PILL_CLASS[p.type] ?? styles.typeDefault}`}>
                                                    {p.type}
                                                </span>
                                            </span>
                                        </div>

                                        <div className={styles.stackCell}>
                                            <span className={styles.stackLabel}>Saved On</span>
                                            <span className={styles.savedOn}>{p.savedOn}</span>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
                </>
                )}
            </div>
        </section>
    );
}
