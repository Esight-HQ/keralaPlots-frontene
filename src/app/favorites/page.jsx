"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../componants/nav/nav";
import styles from "./favorites.module.css";
import { THUMBS_SHOWN } from "./favoritesData";
import {
    subscribe as subscribeCompare,
    getSnapshot as getCompareSnapshot,
    getServerSnapshot as getCompareServerSnapshot,
    addToCompare,
    removeFromCompare,
    COMPARE_MAX,
} from "../lib/compareStore";
import { flyToCompareBucket } from "../lib/flyToCompare";
import { propertyApi, formatPropertyImgUrl, handlePropertyImageError, formatAddedDate } from "../lib/api";
import PropertyIdBadge, { PropertyBadgeRow } from "../componants/propertyIdBadge/PropertyIdBadge";
import { getPropertyCode } from "../lib/propertyCode";
import { reelsApi } from "../lib/reelsApi";
import { useAuth } from "../context/AuthContext";
import { getPropertyUrl } from "../lib/seoHelper";
import { shortPropertyType, areaFromProperty, reelDisplayTitle, formatReelPrice, formatCount, savedReelFromApi } from "../lib/propertyDisplay";
import {
    RiHeart3Fill,
    RiCloseLine,
    RiMapPin2Fill,
    RiHotelBedLine,
    RiCrop2Line,
    RiHome5Line,
    RiBuilding2Line,
    RiFilter3Line,
    RiArrowDownSLine,
    RiShieldCheckLine,
    RiEyeLine,
    RiScales3Line,
    RiScales3Fill,
    RiNotification3Line,
    RiArrowLeftSLine,
    RiArrowRightSLine,
    RiImageLine,
    RiPlayCircleLine,
    RiBookmarkFill,
    RiPlayFill,
    RiHeart3Line,
    RiCompass3Line,
    RiCalendarLine,
    RiArrowRightLine,
} from "react-icons/ri";

/* Bathtub glyph — remixicon has no bath icon, so it is drawn inline */
function BathIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3Z" />
            <path d="M7 12V6.5A2.5 2.5 0 0 1 9.5 4c1.2 0 2.1.8 2.4 1.9" />
            <path d="M5 19l-1 2M19 19l1 2" />
        </svg>
    );
}

/* Header illustration — blue heart beside a house, drawn inline so the page ships no extra assets */
function FavoritesArt() {
    return (
        <svg className={styles.art} viewBox="0 0 400 165" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {/* soft background wash */}
            <ellipse cx="215" cy="150" rx="185" ry="15" fill="#eef2fb" />
            <circle cx="60" cy="40" r="26" fill="#f2f6fd" />
            <circle cx="330" cy="30" r="20" fill="#f2f6fd" />
            {/* trees behind the house */}
            <ellipse cx="196" cy="96" rx="20" ry="30" fill="#dde5f6" />
            <ellipse cx="368" cy="100" rx="19" ry="28" fill="#dde5f6" />
            <ellipse cx="345" cy="112" rx="14" ry="21" fill="#e7edf9" />
            <ellipse cx="214" cy="116" rx="13" ry="19" fill="#e7edf9" />
            {/* house */}
            <path d="M232 78 L288 40 L344 78 Z" fill="#33415c" />
            <rect x="240" y="76" width="96" height="64" rx="3" fill="#ffffff" stroke="#dbe2ee" strokeWidth="1.5" />
            <rect x="250" y="88" width="22" height="20" rx="2" fill="#f4b860" />
            <rect x="304" y="88" width="22" height="20" rx="2" fill="#f4b860" />
            <rect x="279" y="106" width="18" height="34" rx="2" fill="#33415c" />
            <rect x="250" y="118" width="20" height="16" rx="2" fill="#e8eefa" />
            <rect x="306" y="118" width="20" height="16" rx="2" fill="#e8eefa" />
            {/* shrubs at the base */}
            <circle cx="236" cy="138" r="7" fill="#dde5f6" />
            <circle cx="340" cy="138" r="7" fill="#dde5f6" />
            {/* heart */}
            <path
                d="M84 148C84 148 24 111 24 71C24 48 41 33 60 33C71 33 81 39 84 48C87 39 97 33 108 33C127 33 144 48 144 71C144 111 84 148 84 148Z"
                fill="#1d4ed8"
            />
        </svg>
    );
}

/* Saved property listings */
const highlights = [
    { icon: RiShieldCheckLine, title: "Verified Listings", desc: "All properties are verified and trusted" },
    { icon: RiEyeLine, title: "Save & Shortlist", desc: "Save your favorite properties easily" },
    { icon: RiScales3Line, title: "Compare Easily", desc: "Compare features and make the best choice" },
    { icon: RiNotification3Line, title: "Get Notified", desc: "Receive alerts on price drops and offers" },
];

function savedPropertyFromApi(item) {
    const rawGallery = (item.images || []).map((img) => (typeof img === "string" ? img : img.url || img.image_url || img.file_path)).filter(Boolean);
    const gallery = rawGallery.map((u) => formatPropertyImgUrl(u));
    const image = formatPropertyImgUrl(item.image || item.cover_image || gallery[0]);
    const type = shortPropertyType(item.property_type || item.type, item.title);
    const listing = String(item.listing_type || item.action || "").toLowerCase();

    const formattedAddedDate = formatAddedDate(item.added_date || item.addedDate || item.created_at);

    return {
        id: item.id,
        type,
        title: item.title,
        location: item.location_label || [item.locality, item.city, item.district].filter(Boolean).join(", ") || "Kerala",
        price: item.price_formatted || "Price on request",
        priceNum: Number(item.price || item.price_sort || 0),
        age: item.property_age || "",
        purpose: listing.includes("rent") ? "For Rent" : listing.includes("lease") ? "For Lease" : "For Sale",
        beds: item.bedrooms ? `${item.bedrooms} ${Number(item.bedrooms) === 1 ? "Bed" : "Beds"}` : "",
        baths: item.bathrooms ? `${item.bathrooms} ${Number(item.bathrooms) === 1 ? "Bath" : "Baths"}` : "",
        areaLabel: areaFromProperty(item),
        facing: item.facing ? (/facing/i.test(item.facing) ? item.facing : `${item.facing} Facing`) : "",
        addedOn: formattedAddedDate ? `Added ${formattedAddedDate}` : (item.added_date ? `Added ${item.added_date}` : "Saved property"),
        addedTs: Date.now(),
        gallery: gallery.length ? gallery : [image],
        code: getPropertyCode(item),
    };
}

export default function FavoritesPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace("/login?redirect=/favorites");
        }
    }, [isAuthenticated, authLoading, router]);

    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savedReels, setSavedReels] = useState([]);
    const [isReelsLoading, setIsReelsLoading] = useState(true);

    const [activeTab, setActiveTab] = useState("properties");
    const [sortBy, setSortBy] = useState("recent");
    const [filterOpen, setFilterOpen] = useState(false);
    const [typeFilter, setTypeFilter] = useState("all");
    const [loadError, setLoadError] = useState("");
    const [reelsLoadError, setReelsLoadError] = useState("");

    /* Which gallery image each card is showing, keyed by property id. */
    const [activeImage, setActiveImage] = useState({});

    /* Open lightbox: { id, index } or null. */
    const [lightbox, setLightbox] = useState(null);

    // Remove a property from the saved list
    const removeFavorite = async (id) => {
        const previous = favorites;
        setFavorites((prev) => prev.filter((p) => p.id !== id));
        setLightbox((prev) => (prev && prev.id === id ? null : prev));

        try {
            await propertyApi.toggleFavorite(id);
        } catch {
            setFavorites(previous);
        }
    };

    const toggleSavedReel = async (id) => {
        const previous = savedReels;
        setSavedReels((prev) => prev.filter((reel) => reel.id !== id));

        try {
            await reelsApi.toggleSave(id);
        } catch {
            setSavedReels(previous);
        }
    };

    const toggleReelLike = async (id) => {
        const previous = savedReels;
        setSavedReels((prev) => prev.map((reel) => {
            if (reel.id !== id) return reel;
            const nextLiked = !reel.isLiked;
            return {
                ...reel,
                isLiked: nextLiked,
                likes: Math.max(0, reel.likes + (nextLiked ? 1 : -1)),
            };
        }));

        try {
            const response = await reelsApi.toggleLike(id);
            const data = response?.data || {};
            setSavedReels((prev) => prev.map((reel) => (
                reel.id === id
                    ? { ...reel, isLiked: !!data.is_liked, likes: Number(data.likes_count ?? reel.likes) }
                    : reel
            )));
        } catch {
            setSavedReels(previous);
        }
    };

    // ---- compare --------------------------------------------------------------
    const { list: compareList } = useSyncExternalStore(subscribeCompare, getCompareSnapshot, getCompareServerSnapshot);
    const [toast, setToast] = useState("");
    const toastTimer = useRef(null);

    const triggerToast = (message) => {
        setToast(message);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(""), 2400);
    };

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    useEffect(() => {
        let alive = true;

        const loadFavorites = async () => {
            setIsLoading(true);
            try {
                const response = await propertyApi.favorites({ limit: 60 });
                if (!alive) return;
                setFavorites((response.data || []).map(savedPropertyFromApi));
                setLoadError("");
            } catch (error) {
                if (!alive) return;
                setFavorites([]);
                setLoadError(error?.response?.data?.message || "Unable to load saved properties.");
            } finally {
                if (alive) setIsLoading(false);
            }
        };

        const loadSavedReels = async () => {
            setIsReelsLoading(true);
            try {
                const response = await reelsApi.saved({ limit: 60 });
                if (!alive) return;
                setSavedReels((response.data || []).map(savedReelFromApi));
                setReelsLoadError("");
            } catch (error) {
                if (!alive) return;
                setSavedReels([]);
                setReelsLoadError(error?.response?.data?.message || "Unable to load saved reels.");
            } finally {
                if (alive) setIsReelsLoading(false);
            }
        };

        loadFavorites();
        loadSavedReels();

        return () => {
            alive = false;
        };
    }, []);

    const handleToggleCompare = (property, event) => {
        const compareId = String(property.id);
        const alreadyIn = compareList.some((p) => p.id === compareId);

        if (alreadyIn) {
            removeFromCompare(compareId);
            triggerToast("Removed from compare.");
            return;
        }

        const result = addToCompare({
            id: compareId,
            title: property.title,
            image: property.gallery[0],
        });

        if (!result.added) {
            if (result.reason === "full") {
                triggerToast(`You can compare up to ${COMPARE_MAX} properties at a time — remove one first.`);
            }
            return;
        }

        flyToCompareBucket(event.currentTarget, property.gallery[0]);
        triggerToast("Added to compare.");
    };

    // ---- gallery ------------------------------------------------------------
    const showImage = (id, index) => setActiveImage((prev) => ({ ...prev, [id]: index }));

    const openLightbox = (id, index) => setLightbox({ id, index });
    const closeLightbox = useCallback(() => setLightbox(null), []);

    const stepLightbox = useCallback(
        (delta) => {
            setLightbox((prev) => {
                if (!prev) return prev;
                const property = favorites.find((p) => p.id === prev.id);
                if (!property) return null;
                const count = property.gallery.length;
                return { ...prev, index: (prev.index + delta + count) % count };
            });
        },
        [favorites]
    );

    /* Keyboard control while the lightbox is open, and the page behind it is
       locked so it cannot scroll under the overlay. */
    useEffect(() => {
        if (!lightbox) return;

        const onKey = (event) => {
            if (event.key === "Escape") closeLightbox();
            if (event.key === "ArrowRight") stepLightbox(1);
            if (event.key === "ArrowLeft") stepLightbox(-1);
        };

        document.addEventListener("keydown", onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [lightbox, closeLightbox, stepLightbox]);

    const lightboxProperty = lightbox ? favorites.find((p) => p.id === lightbox.id) : null;

    const visible = favorites
        .filter((p) => typeFilter === "all" || p.type === typeFilter)
        .slice()
        .sort((a, b) => {
            if (sortBy === "priceLow") return a.priceNum - b.priceNum;
            if (sortBy === "priceHigh") return b.priceNum - a.priceNum;
            if (sortBy === "oldest") return a.addedTs - b.addedTs;
            return b.addedTs - a.addedTs;
        });

    return (
        <>
            <Nav />

            <main className={styles.page}>
                <div className={styles.container}>
                    {/* ============================ PAGE HEADER ============================ */}
                    <header className={styles.header}>
                        <div className={styles.headerText}>
                            <h1 className={styles.pageTitle}>My Favorites</h1>
                            <p className={styles.pageSub}>Your saved properties and reels in one place.</p>
                            <p className={styles.pageSub}>Switch views to shortlist listings or replay reels later.</p>
                        </div>
                        <FavoritesArt />
                    </header>

                    <div className={styles.savedTabs} role="tablist" aria-label="Saved items">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "properties"}
                            className={`${styles.savedTab} ${activeTab === "properties" ? styles.savedTabActive : ""}`}
                            onClick={() => setActiveTab("properties")}
                        >
                            <RiHome5Line />
                            Properties
                            <span>{favorites.length}</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "reels"}
                            className={`${styles.savedTab} ${activeTab === "reels" ? styles.savedTabActive : ""}`}
                            onClick={() => setActiveTab("reels")}
                        >
                            <RiPlayCircleLine />
                            Reels
                            <span>{savedReels.length}</span>
                        </button>
                    </div>

                    {/* ============================ LIST TOOLBAR ============================ */}
                    <div className={styles.toolbar}>
                        <h2 className={styles.listTitle}>
                            {activeTab === "properties" ? `Saved Properties (${visible.length})` : `Saved Reels (${savedReels.length})`}
                        </h2>

                        {activeTab === "properties" && (
                            <div className={styles.toolbarActions}>
                            <button
                                type="button"
                                className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnActive : ""}`}
                                onClick={() => setFilterOpen((o) => !o)}
                            >
                                <RiFilter3Line className={styles.filterIcon} />
                                Filter
                            </button>

                            <div className={styles.sortWrap}>
                                <select
                                    className={styles.sortSelect}
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    aria-label="Sort saved properties"
                                >
                                    <option value="recent">Recently Added</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="priceLow">Price: Low to High</option>
                                    <option value="priceHigh">Price: High to Low</option>
                                </select>
                                <RiArrowDownSLine className={styles.sortChevron} />
                            </div>
                            </div>
                        )}
                    </div>

                    {activeTab === "properties" && filterOpen && (
                        <div className={styles.filterPanel}>
                            {["all", ...new Set(favorites.map((f) => f.type).filter(Boolean))].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`${styles.filterChip} ${typeFilter === t ? styles.filterChipActive : ""}`}
                                    onClick={() => setTypeFilter(t)}
                                >
                                    {t === "all" ? "All Types" : t}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === "properties" && loadError && (
                        <p className={styles.pageSub}>{loadError}</p>
                    )}

                    {/* ============================ SAVED PROPERTY CARDS ============================ */}
                    {activeTab === "properties" ? isLoading ? (
                        <div className={styles.cardList}>
                            {[1, 2].map((i) => (
                                <article key={i} className={styles.card} style={{ opacity: 0.6, pointerEvents: "none" }}>
                                    <div className={styles.media} style={{ background: "#e2e8f0", minHeight: "200px" }} />
                                    <div style={{ padding: "20px" }}>
                                        <div style={{ height: "20px", width: "60%", background: "#e2e8f0", borderRadius: "4px", marginBottom: "10px" }} />
                                        <div style={{ height: "14px", width: "40%", background: "#f1f5f9", borderRadius: "4px", marginBottom: "12px" }} />
                                        <div style={{ height: "22px", width: "30%", background: "#e2e8f0", borderRadius: "4px" }} />
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : visible.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>
                                <RiHeart3Fill />
                            </span>
                            <h3 className={styles.emptyTitle}>No saved properties yet</h3>
                            <p className={styles.emptyDesc}>
                                Tap the heart on any listing to save it here for later.
                            </p>
                            <Link href="/properties" className={styles.emptyBtn}>
                                Browse Properties
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.cardList}>
                            {visible.map((p) => {
                                const TypeIcon = /villa|house|apartment/i.test(p.type) ? RiHome5Line : RiBuilding2Line;
                                const specs = [
                                    p.beds && { key: "beds", icon: RiHotelBedLine, label: p.beds },
                                    p.baths && { key: "baths", icon: BathIcon, label: p.baths },
                                    p.areaLabel && { key: "area", icon: RiCrop2Line, label: p.areaLabel },
                                    p.facing && { key: "facing", icon: RiCompass3Line, label: p.facing },
                                    { key: "type", icon: TypeIcon, label: p.type },
                                ].filter(Boolean);
                                const isComparing = compareList.some((c) => c.id === String(p.id));
                                const current = activeImage[p.id] ?? 0;
                                /* Derived, so the badge can never promise more photos than exist. */
                                const hiddenPhotos = Math.max(0, p.gallery.length - (THUMBS_SHOWN + 1));

                                return (
                                    <article key={p.id} className={styles.card}>
                                        {/* gallery */}
                                        <div className={styles.media}>
                                            <button
                                                type="button"
                                                className={styles.mainImageWrap}
                                                onClick={() => openLightbox(p.id, current)}
                                                aria-label={`Open photos of ${p.title}`}
                                            >
                                                <img loading="lazy" decoding="async" src={p.gallery[current]} alt={p.title} className={styles.mainImage} onError={handlePropertyImageError} />
                                                <span className={styles.purposeBadge}>{p.purpose}</span>
                                                <span className={styles.zoomHint}>
                                                    <RiImageLine aria-hidden="true" />
                                                    {current + 1} / {p.gallery.length}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                className={styles.heartBtn}
                                                onClick={() => removeFavorite(p.id)}
                                                aria-label={`Remove ${p.title} from favorites`}
                                            >
                                                <RiHeart3Fill />
                                            </button>

                                            <div className={styles.thumbRow}>
                                                {p.gallery.slice(1, THUMBS_SHOWN + 1).map((src, i) => {
                                                    const index = i + 1;
                                                    return (
                                                        <button
                                                            key={src}
                                                            type="button"
                                                            className={`${styles.thumb} ${current === index ? styles.thumbActive : ""}`}
                                                            onClick={() => showImage(p.id, index)}
                                                            aria-label={`Show photo ${index + 1} of ${p.title}`}
                                                            aria-pressed={current === index}
                                                        >
                                                            <img loading="lazy" decoding="async" src={src} alt="" onError={handlePropertyImageError} />
                                                        </button>
                                                    );
                                                })}

                                                {hiddenPhotos > 0 && (
                                                    <button
                                                        type="button"
                                                        className={styles.morePhotos}
                                                        onClick={() => openLightbox(p.id, THUMBS_SHOWN + 1)}
                                                        aria-label={`View all ${p.gallery.length} photos of ${p.title}`}
                                                    >
                                                        <span className={styles.moreCount}>+{hiddenPhotos}</span>
                                                        <span className={styles.moreLabel}>Photos</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* details */}
                                        <div className={styles.info}>
                                            {/* <button
                                                type="button"
                                                className={styles.closeBtn}
                                                onClick={() => removeFavorite(p.id)}
                                                aria-label={`Remove ${p.title}`}
                                            >
                                                <RiCloseLine />
                                            </button> */}

                                            <PropertyBadgeRow style={{ marginBottom: 0 }}>
                                                <span className={styles.typePill}>{p.type}</span>
                                                <PropertyIdBadge code={p.code} />
                                            </PropertyBadgeRow>
                                            <h3 className={styles.cardTitle}>
                                                <Link href={getPropertyUrl(p)} className={styles.cardTitleLink}>{p.title}</Link>
                                            </h3>

                                            <p className={styles.location}>
                                                <RiMapPin2Fill className={styles.pinIcon} />
                                                <span>{p.location}</span>
                                            </p>

                                            <div className={styles.priceRow}>
                                                <span className={styles.price}>{p.price}</span>
                                                {p.age && <span className={styles.age}>{p.age}</span>}
                                            </div>

                                            <ul className={styles.specs}>
                                                {specs.map(({ key, icon: Icon, label }) => (
                                                    <li key={key} className={styles.spec}>
                                                        <Icon className={styles.specIcon} />
                                                        {label}
                                                    </li>
                                                ))}
                                            </ul>

                                            <div className={styles.cardFooter}>
                                                <span className={styles.addedOn}>
                                                    <RiCalendarLine aria-hidden="true" />
                                                    {p.addedOn}
                                                </span>
                                                <div className={styles.cardFooterActions}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.compareCardBtn} ${isComparing ? styles.compareCardBtnActive : ""}`}
                                                        onClick={(e) => handleToggleCompare(p, e)}
                                                    >
                                                        {isComparing ? <RiScales3Fill /> : <RiScales3Line />}
                                                        {isComparing ? "Added" : "Compare"}
                                                    </button>
                                                    <Link href={getPropertyUrl(p)} className={styles.viewBtn}>
                                                        View Details
                                                        <RiArrowRightLine aria-hidden="true" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : isReelsLoading ? (
                        <div className={styles.reelGrid}>
                            {[1, 2, 3].map((item) => (
                                <article key={item} className={`${styles.reelCard} ${styles.reelSkeleton}`}>
                                    <div className={styles.reelPoster} />
                                    <div className={styles.reelInfo}>
                                        <span className={styles.reelSkeletonLine} />
                                        <span className={styles.reelSkeletonShort} />
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : reelsLoadError ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>
                                <RiBookmarkFill />
                            </span>
                            <h3 className={styles.emptyTitle}>Saved reels unavailable</h3>
                            <p className={styles.emptyDesc}>{reelsLoadError}</p>
                            <Link href="/reels" className={styles.emptyBtn}>
                                Browse Reels
                            </Link>
                        </div>
                    ) : savedReels.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>
                                <RiBookmarkFill />
                            </span>
                            <h3 className={styles.emptyTitle}>No saved reels yet</h3>
                            <p className={styles.emptyDesc}>
                                Tap the bookmark on a reel to save it here separately.
                            </p>
                            <Link href="/reels" className={styles.emptyBtn}>
                                Browse Reels
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className={styles.reelGrid}>
                                {savedReels.map((reel) => {
                                    const title = reelDisplayTitle(reel.title);
                                    const price = formatReelPrice(reel.price);
                                    return (
                                        <article key={reel.id} className={styles.reelCard}>
                                            <Link href={`/reels?reel=${reel.id}`} className={styles.reelLink} aria-label={`Watch ${title}`}>
                                                {reel.thumbnail ? (
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
                                                onClick={() => toggleSavedReel(reel.id)}
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
                        </>
                    )}

                    {/* ============================ HIGHLIGHTS ============================ */}
                    <section className={styles.highlights}>
                        {highlights.map((h) => {
                            const Icon = h.icon;
                            return (
                                <div key={h.title} className={styles.highlight}>
                                    <span className={styles.highlightIcon}>
                                        <Icon />
                                    </span>
                                    <div>
                                        <h4 className={styles.highlightTitle}>{h.title}</h4>
                                        <p className={styles.highlightDesc}>{h.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                </div>
            </main>

            {/* ============================ COMPARE TOAST ============================ */}
            {toast && <div className={styles.compareToast}>{toast}</div>}

            {/* ============================ PHOTO LIGHTBOX ============================ */}
            {lightboxProperty && (
                <div
                    className={styles.lightbox}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Photos of ${lightboxProperty.title}`}
                    onClick={closeLightbox}
                >
                    {/* Clicks inside the frame must not reach the backdrop handler. */}
                    <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
                        <header className={styles.lightboxBar}>
                            <span className={styles.lightboxTitle}>{lightboxProperty.title}</span>
                            <span className={styles.lightboxCount}>
                                {lightbox.index + 1} / {lightboxProperty.gallery.length}
                            </span>
                            <button
                                type="button"
                                className={styles.lightboxClose}
                                onClick={closeLightbox}
                                aria-label="Close photos"
                            >
                                <RiCloseLine />
                            </button>
                        </header>

                        <div className={styles.lightboxStage}>
                            <button
                                type="button"
                                className={`${styles.lightboxArrow} ${styles.lightboxPrev}`}
                                onClick={() => stepLightbox(-1)}
                                aria-label="Previous photo"
                            >
                                <RiArrowLeftSLine />
                            </button>

                            <img
                                src={lightboxProperty.gallery[lightbox.index]}
                                alt={`${lightboxProperty.title} — photo ${lightbox.index + 1}`}
                                className={styles.lightboxImage}
                                onError={handlePropertyImageError}
                            />

                            <button
                                type="button"
                                className={`${styles.lightboxArrow} ${styles.lightboxNext}`}
                                onClick={() => stepLightbox(1)}
                                aria-label="Next photo"
                            >
                                <RiArrowRightSLine />
                            </button>
                        </div>

                        <div className={styles.lightboxStrip}>
                            {lightboxProperty.gallery.map((src, i) => (
                                <button
                                    key={src}
                                    type="button"
                                    className={`${styles.lightboxThumb} ${i === lightbox.index ? styles.lightboxThumbActive : ""}`}
                                    onClick={() => setLightbox({ id: lightboxProperty.id, index: i })}
                                    aria-label={`Photo ${i + 1}`}
                                    aria-current={i === lightbox.index}
                                >
                                    <img loading="lazy" decoding="async" src={src} alt="" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
