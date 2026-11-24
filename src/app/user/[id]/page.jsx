"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../../componants/nav/nav";
import Footer from "../../componants/footer/footer";
import styles from "./userProfile.module.css";
import { heroScript } from "./heroFont";
import { userApi, propertyApi, handlePropertyImgError, formatPropertyImgUrl, DEFAULT_PROPERTY_NO_IMAGE } from "../../lib/api";
import { getPropertyUrl } from "../../lib/seoHelper";
import { getPropertyCode } from "../../lib/propertyCode";
import { getLoginRedirectUrl } from "../../lib/authRedirect";
import { useAuth } from "../../context/AuthContext";
import PropertyIdBadge, { PropertyBadgeRow } from "../../componants/propertyIdBadge/PropertyIdBadge";
import {
    RiMapPinLine,
    RiArrowRightSLine,
    RiPhoneFill,
    RiShareForwardLine,
    RiHome4Line,
    RiFilmLine,
    RiUser3Line,
    RiEyeLine,
    RiPlayFill,
    RiShieldCheckFill,
    RiHashtag,
    RiFileCopyLine,
    RiBriefcase4Line,
    RiMailLine,
    RiCalendarLine,
    RiPhoneLine,
    RiWhatsappLine,
    RiChat3Line,
    RiCheckboxCircleLine,
} from "react-icons/ri";

/* "01-03-2025 15:56:54" -> "Mar 2025" */
function formatMemberSince(raw) {
    if (!raw) return "";
    const str = String(raw).trim();
    const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    const d = dmy ? new Date(+dmy[3], +dmy[2] - 1, +dmy[1]) : new Date(str.replace(" ", "T"));
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/* "01-03-2025 15:56:54" -> "01 Mar 2025" */
function formatFullDate(raw) {
    if (!raw) return "";
    const str = String(raw).trim();
    const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    const d = dmy ? new Date(+dmy[3], +dmy[2] - 1, +dmy[1]) : new Date(str.replace(" ", "T"));
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* "9496187119" -> "+91 94961 87119" (other formats are shown as given) */
function formatPhone(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : String(raw);
}

/* Same date format as the /properties cards, e.g. "06 Oct 2026". */
function formatAddedDate(raw) {
    if (!raw) return "";
    const str = String(raw).trim();
    const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    const d = dmy ? new Date(+dmy[3], +dmy[2] - 1, +dmy[1]) : new Date(str.replace(" ", "T"));
    return isNaN(d.getTime())
        ? str
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* Maps a property from the user-profile API onto the fields the
   /properties card shows. Missing fields are simply left out of the card. */
function normalizeProfileProperty(p) {
    const listing = String(p.listing_type || p.action || p.purpose || "").toLowerCase();
    const facing = p.facing ? (/facing/i.test(p.facing) ? p.facing : `${p.facing} Facing`) : "";
    const image = p.image || p.cover_image;
    return {
        id: p.id,
        code: getPropertyCode(p),
        title: p.title || `Property #${p.id}`,
        image: image ? formatPropertyImgUrl(image) : DEFAULT_PROPERTY_NO_IMAGE,
        location: p.location_label || p.location || [p.locality, p.city, p.district].filter(Boolean).join(", ") || "Kerala",
        price: p.price_formatted || p.price || "Price on request",
        badge: listing.includes("rent") ? "For Rent" : listing.includes("lease") ? "For Lease" : "For Sale",
        type: p.property_type || p.type || "Property",
        beds: p.bedrooms ? `${p.bedrooms} Beds` : "",
        baths: p.bathrooms ? `${p.bathrooms} Baths` : "",
        area: p.cent || (p.area && p.area !== "N/A" && p.area !== "1 Sq Ft" ? p.area : ""),
        facing,
        ownership: p.ownership || "Freehold",
        isSaved: !!p.is_saved,
        addedDate: formatAddedDate(p.added_date || p.created_at),
    };
}

export default function UserProfilePage({ params }) {
    const { id } = use(params);
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("properties");
    const [toastMessage, setToastMessage] = useState("");
    const [avatarError, setAvatarError] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const { user: currentUser } = useAuth();

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3200);
    };

    const fetchUserProfile = useCallback(async () => {
        setLoading(true);
        try {
            const res = await userApi.getUser(id);
            if (res?.data) {
                setUser(res.data);
                const initialSaved = (res.data.properties || [])
                    .filter((p) => p.is_saved || p.isSaved)
                    .map((p) => Number(p.id));
                if (initialSaved.length > 0) {
                    setFavorites((prev) => [...new Set([...prev, ...initialSaved])]);
                }
            }
        } catch (err) {
            console.error("Failed to load user profile:", err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // Sync logged-in user's favorites from API
    useEffect(() => {
        if (!currentUser) {
            setFavorites([]);
            return;
        }
        let alive = true;
        propertyApi.favorites({ limit: 100 })
            .then((favRes) => {
                if (alive && favRes?.data) {
                    const allFavIds = (favRes.data || []).map((p) => Number(p.id || p.propertyId));
                    setFavorites((prev) => [...new Set([...prev, ...allFavIds])]);
                }
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [currentUser]);

    // Same favourite toggle as the /properties cards (optimistic, rolls back on error)
    const toggleFavorite = async (e, propId) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser) {
            router.push(getLoginRedirectUrl());
            return;
        }
        const numId = Number(propId);
        const wasSaved = favorites.some((f) => Number(f) === numId);
        setFavorites((prev) => (wasSaved ? prev.filter((f) => Number(f) !== numId) : [...prev, numId]));
        try {
            const response = await propertyApi.toggleFavorite(numId);
            setFavorites((prev) => {
                const next = prev.filter((f) => Number(f) !== numId);
                const isNowSaved = typeof response?.saved === "boolean" ? response.saved : !wasSaved;
                return isNowSaved ? [...next, numId] : next;
            });
            triggerToast(wasSaved ? "Removed from saved properties" : "Saved to your favorites");
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
            setFavorites((prev) => (wasSaved ? [...new Set([...prev, numId])] : prev.filter((f) => Number(f) !== numId)));
            triggerToast("Failed to update saved properties");
        }
    };

    const copyText = async (text, msg) => {
        try {
            await navigator.clipboard.writeText(text);
            triggerToast(msg);
        } catch {
            triggerToast("Could not copy.");
        }
    };

    const handleShare = async () => {
        if (typeof window === "undefined") return;
        try {
            await navigator.clipboard.writeText(window.location.href);
            triggerToast("Profile link copied to clipboard!");
        } catch {
            triggerToast("Could not copy link.");
        }
    };

    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const displayName = user?.fullname || user?.username || "KeralaPlots User";
    // Only list active properties on public profile (draft or inactive listings must not be listed)
    const properties = (user?.properties || []).filter((p) => {
        return p.status === "active" || p.status === 1 || p.status === "1" || p.status === "Active";
    });
    // Only list active reels on the public user profile page (draft or hidden reels must not be listed)
    const reels = (user?.reels || []).filter((r) => {
        return r.status === "active" || r.status === 1 || r.status === "1" || r.status === "Active";
    });
    const locationStr = [user?.town, user?.district, "Kerala"].filter(Boolean).join(", ") || "Kerala, India";
    const phone = user?.mobile || user?.phone;
    const phoneDigits = String(phone || "").replace(/\D/g, "");
    const whatsappUrl = phoneDigits.length >= 10
        ? `https://wa.me/${phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits}?text=${encodeURIComponent(`Hi ${displayName}, I found your profile on KeralaPlots.`)}`
        : "";
    const roleLabel = user?.role
        ? String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1).toLowerCase()
        : "Member";
    const memberSince = formatMemberSince(user?.join_date);
    const isActive = !user?.status || String(user.status).toLowerCase() === "active" || String(user.status) === "1";
    const tagline = user?.about || user?.bio || (String(user?.role || "").toLowerCase() === "agent"
        ? "Trusted real estate advisor helping you find the perfect property in Kerala."
        : "KeralaPlots member listing properties across Kerala.");

    return (
        <>
            <Nav />
            <div className={styles.profileContainer}>

                <div className={styles.container}>
                    {/* Breadcrumb Navigation */}
                    <div className={styles.breadcrumb}>
                        <Link href="/">Home</Link>
                        <RiArrowRightSLine />
                        <Link href="/reels">Reels</Link>
                        <RiArrowRightSLine />
                        <span>{loading ? "User Profile" : displayName}</span>
                    </div>

                    {loading ? (
                        <div className={styles.loadingWrap}>
                            <p>Loading user profile...</p>
                        </div>
                    ) : !user ? (
                        <div className={styles.notFoundBox}>
                            <h1 className={styles.notFoundTitle}>User Not Found</h1>
                            <p className={styles.notFoundText}>
                                We couldn&apos;t find the user profile you are looking for. The user might have been removed or the link is incorrect.
                            </p>
                            <div className={styles.heroActionsRow} style={{ justifyContent: "center", width: "100%" }}>
                                <Link href="/reels" className={styles.primaryBtn}>
                                    Explore Reels
                                </Link>
                                <Link href="/properties" className={styles.secondaryBtn}>
                                    Browse Properties
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ===================== HERO PROFILE CARD ===================== */}
                            <section className={styles.heroSection}>
                                <div className={styles.heroBody}>
                                    {/* Avatar */}
                                    <div className={styles.heroPhotoWrap}>
                                        <div className={styles.heroPhotoCard}>
                                            {user.avatar && !avatarError ? (
                                                <img
                                                    src={user.avatar}
                                                    alt={displayName}
                                                    className={styles.heroPhotoImg}
                                                    onError={() => setAvatarError(true)}
                                                />
                                            ) : (
                                                <span className={styles.heroInitials}>{getInitials(displayName)}</span>
                                            )}
                                        </div>
                                        {isActive && <span className={styles.onlineDot} title="Active member" />}
                                    </div>

                                    {/* Name, meta, stats & tagline */}
                                    <div className={styles.heroInfoCol}>
                                        <div className={styles.nameRow}>
                                            <h1 className={styles.heroName}>{displayName}</h1>
                                            <span className={styles.roleBadge}>
                                                <RiShieldCheckFill />
                                                {roleLabel}
                                            </span>
                                        </div>

                                        <div className={styles.heroMetaRow}>
                                            <span className={styles.heroMetaItem}>
                                                <RiMapPinLine />
                                                {locationStr}
                                            </span>
                                            {phone && (
                                                <a href={`tel:${phone}`} className={styles.heroMetaItem}>
                                                    <RiPhoneLine />
                                                    {formatPhone(phone)}
                                                </a>
                                            )}
                                        </div>

                                        <div className={styles.statsRow}>
                                            <button type="button" className={`${styles.statItem} ${styles.statHighlight}`} onClick={() => setActiveTab("properties")}>
                                                <strong>{properties.length}</strong>
                                                <span>{properties.length === 1 ? "Property" : "Properties"}</span>
                                            </button>
                                            <button type="button" className={styles.statItem} onClick={() => setActiveTab("reels")}>
                                                <strong>{reels.length}</strong>
                                                <span>{reels.length === 1 ? "Reel" : "Reels"}</span>
                                            </button>
                                            {memberSince && (
                                                <span className={styles.statItem}>
                                                    <RiCalendarLine className={styles.statIcon} />
                                                    <span>Member since <strong>{memberSince}</strong></span>
                                                </span>
                                            )}
                                        </div>

                                        <p className={styles.heroTagline}>{tagline}</p>
                                    </div>

                                    {/* Actions + script tagline */}
                                    <div className={styles.heroSide}>
                                        <div className={styles.heroActionsRow}>
                                            {phone && (
                                                <a href={`tel:${phone}`} className={styles.primaryBtn}>
                                                    <RiPhoneFill />
                                                    Call
                                                </a>
                                            )}
                                            {whatsappUrl && (
                                                <a
                                                    href={whatsappUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`${styles.secondaryBtn} ${styles.waBtn}`}
                                                >
                                                    <RiWhatsappLine className={styles.waIcon} />
                                                    WhatsApp
                                                </a>
                                            )}
                                            <Link href={`/messages?user=${user.id}`} className={styles.secondaryBtn}>
                                                <RiChat3Line />
                                                Message
                                            </Link>
                                            <button
                                                type="button"
                                                className={styles.shareBtn}
                                                onClick={handleShare}
                                                title="Copy profile link"
                                                aria-label="Copy profile link"
                                            >
                                                <RiShareForwardLine />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ===================== TAB CONTROLS ===================== */}
                            <div className={styles.tabsNav} role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "properties"}
                                    className={`${styles.tabBtn} ${activeTab === "properties" ? styles.tabBtnActive : ""}`}
                                    onClick={() => setActiveTab("properties")}
                                >
                                    <RiHome4Line />
                                    Properties
                                    <span className={styles.tabBadge}>{properties.length}</span>
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "reels"}
                                    className={`${styles.tabBtn} ${activeTab === "reels" ? styles.tabBtnActive : ""}`}
                                    onClick={() => setActiveTab("reels")}
                                >
                                    <RiFilmLine />
                                    <span><span className={styles.tabLabelLong}>Posted </span>Reels</span>
                                    <span className={styles.tabBadge}>{reels.length}</span>
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "about"}
                                    className={`${styles.tabBtn} ${activeTab === "about" ? styles.tabBtnActive : ""}`}
                                    onClick={() => setActiveTab("about")}
                                >
                                    <RiUser3Line />
                                    <span>About<span className={styles.tabLabelLong}> Profile</span></span>
                                </button>
                            </div>

                            {/* ===================== TAB CONTENT: PROPERTIES ===================== */}
                            {activeTab === "properties" && (
                                <div>
                                    {properties.length === 0 ? (
                                        <div className={styles.emptyBox}>
                                            <h3 className={styles.emptyTitle}>No Properties Listed Yet</h3>
                                            <p className={styles.emptyText}>
                                                {displayName} has not listed any properties on KeralaPlots yet.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className={styles.propertyGrid}>
                                            {properties.map((raw) => {
                                                const p = normalizeProfileProperty(raw);
                                                const isFav = favorites.some((f) => Number(f) === Number(p.id));
                                                return (
                                                    <Link
                                                        key={p.id}
                                                        href={getPropertyUrl(raw)}
                                                        className={styles.propertyCard}
                                                    >
                                                        {/* Photo, status badge & favourite */}
                                                        <div className={styles.imageWrapper}>
                                                            <img
                                                                loading="lazy"
                                                                decoding="async"
                                                                src={p.image}
                                                                alt={p.title}
                                                                className={styles.cardImage}
                                                                onError={handlePropertyImgError}
                                                            />
                                                            <span className={styles.statusBadge}>{p.badge}</span>
                                                            <button
                                                                type="button"
                                                                className={styles.cardFavoriteBtn}
                                                                onClick={(e) => toggleFavorite(e, p.id)}
                                                                title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                                                aria-label={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? "#ef4444" : "none"} stroke={isFav ? "#ef4444" : "#1e293b"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Details */}
                                                        <div className={styles.cardContent}>
                                                            <PropertyBadgeRow>
                                                                <PropertyIdBadge code={p.code} />
                                                                {p.addedDate && (
                                                                    <span className={styles.cardAddedDate} title={`Added on ${p.addedDate}`}>
                                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                                            <line x1="16" y1="2" x2="16" y2="6" />
                                                                            <line x1="8" y1="2" x2="8" y2="6" />
                                                                            <line x1="3" y1="10" x2="21" y2="10" />
                                                                        </svg>
                                                                        {p.addedDate}
                                                                    </span>
                                                                )}
                                                            </PropertyBadgeRow>

                                                            <h3 className={styles.cardTitle}>{p.title}</h3>

                                                            <div className={styles.locationRow}>
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                                    <circle cx="12" cy="10" r="3" />
                                                                </svg>
                                                                <span>{p.location}</span>
                                                            </div>

                                                            <div className={styles.priceRow}>
                                                                <div className={styles.price}>{p.price}</div>
                                                            </div>

                                                            <div className={styles.metaGrid}>
                                                                {p.beds ? (
                                                                    <>
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <path d="M2 4v16M2 8h20v12M2 12h20M18 4v4" />
                                                                            </svg>
                                                                            <span>{p.beds}</span>
                                                                        </div>
                                                                        {p.baths && (
                                                                            <div className={styles.metaItem}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1zM6 12V5a2 2 0 0 1 2-2h3v9" />
                                                                                </svg>
                                                                                <span>{p.baths}</span>
                                                                            </div>
                                                                        )}
                                                                        {p.area && (
                                                                            <div className={styles.metaItem}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                                </svg>
                                                                                <span>{p.area}</span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                                                                            </svg>
                                                                            <span>{p.area || p.type}</span>
                                                                        </div>
                                                                        {p.facing && (
                                                                            <div className={styles.metaItem}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <circle cx="12" cy="12" r="10" />
                                                                                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                                                                </svg>
                                                                                <span>{p.facing}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                                            </svg>
                                                                            <span>{p.ownership}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>

                                    )}
                                </div>
                            )}

                            {/* ===================== TAB CONTENT: REELS ===================== */}
                            {activeTab === "reels" && (
                                <div>
                                    {reels.length === 0 ? (
                                        <div className={styles.emptyBox}>
                                            <h3 className={styles.emptyTitle}>No Reels Uploaded Yet</h3>
                                            <p className={styles.emptyText}>
                                                {displayName} has not uploaded any real estate video reels yet.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className={styles.reelsGrid}>
                                            {reels.map((reel) => (
                                                <Link
                                                    key={reel.reel_id || reel.id}
                                                    href={`/reels?reelId=${reel.reel_id || reel.id}`}
                                                    className={styles.reelCard}
                                                    title={reel.title || reel.caption}
                                                >
                                                    <img loading="lazy" decoding="async"
                                                        src={reel.thumbnail_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80"}
                                                        alt={reel.title || "Reel"}
                                                        className={styles.reelThumbnail}
                                                        onError={(e) => {
                                                            e.currentTarget.src = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80";
                                                        }}
                                                    />
                                                    <div className={styles.reelPlayOverlay}>
                                                        <RiPlayFill />
                                                    </div>
                                                    <div className={styles.reelOverlay}>
                                                        <div className={styles.reelTop}>
                                                            {reel.price ? (
                                                                <span className={styles.reelPriceBadge}>
                                                                    ₹{reel.price}
                                                                </span>
                                                            ) : <span />}
                                                        </div>
                                                        <div className={styles.reelBottom}>
                                                            <p className={styles.reelCaption}>
                                                                {reel.caption || reel.title || "Real Estate Video"}
                                                            </p>
                                                            {reel.location && (
                                                                <div className={styles.reelLocation}>
                                                                    <RiMapPinLine />
                                                                    <span>{reel.location}</span>
                                                                </div>
                                                            )}
                                                            <div className={styles.reelViews}>
                                                                <RiEyeLine />
                                                                <span>{(reel.views_count || 0).toLocaleString()} views</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ===================== TAB CONTENT: ABOUT ===================== */}
                            {activeTab === "about" && (
                                <div className={`${styles.aboutLayout} ${!(phone || user.email) ? styles.aboutLayoutSingle : ""}`}>
                                    {/* Profile details */}
                                    <div className={styles.aboutCard}>
                                        <div className={styles.aboutHeader}>
                                            <h2 className={styles.aboutTitle}>Profile Information</h2>
                                            <p className={styles.aboutIntro}>{tagline}</p>
                                        </div>

                                        <dl className={styles.infoGrid}>
                                            <div className={styles.infoItem}>
                                                <span className={styles.infoIcon}><RiUser3Line /></span>
                                                <div className={styles.infoText}>
                                                    <dt className={styles.infoLabel}>Member Name</dt>
                                                    <dd className={styles.infoValue}>{displayName}</dd>
                                                </div>
                                            </div>

                                            <div className={styles.infoItem}>
                                                <span className={styles.infoIcon}><RiHashtag /></span>
                                                <div className={styles.infoText}>
                                                    <dt className={styles.infoLabel}>Member ID</dt>
                                                    <dd className={styles.infoValue}>
                                                        KP-U{user.id}
                                                        <button
                                                            type="button"
                                                            className={styles.copyBtn}
                                                            onClick={() => copyText(`KP-U${user.id}`, "Member ID copied")}
                                                            title="Copy member ID"
                                                            aria-label="Copy member ID"
                                                        >
                                                            <RiFileCopyLine />
                                                        </button>
                                                    </dd>
                                                </div>
                                            </div>

                                            <div className={styles.infoItem}>
                                                <span className={styles.infoIcon}><RiBriefcase4Line /></span>
                                                <div className={styles.infoText}>
                                                    <dt className={styles.infoLabel}>Account Role</dt>
                                                    <dd className={styles.infoValue}>{roleLabel}</dd>
                                                </div>
                                            </div>

                                            <div className={styles.infoItem}>
                                                <span className={styles.infoIcon}><RiShieldCheckFill /></span>
                                                <div className={styles.infoText}>
                                                    <dt className={styles.infoLabel}>Status</dt>
                                                    <dd className={styles.infoValue}>
                                                        <span className={`${styles.statusPill} ${isActive ? "" : styles.statusPillMuted}`}>
                                                            <span className={styles.statusDot} />
                                                            {isActive ? "Active" : "Inactive"}
                                                        </span>
                                                    </dd>
                                                </div>
                                            </div>

                                            <div className={styles.infoItem}>
                                                <span className={styles.infoIcon}><RiMapPinLine /></span>
                                                <div className={styles.infoText}>
                                                    <dt className={styles.infoLabel}>Location</dt>
                                                    <dd className={styles.infoValue}>{locationStr}</dd>
                                                </div>
                                            </div>

                                            <div className={styles.infoItem}>
                                                <span className={styles.infoIcon}><RiCalendarLine /></span>
                                                <div className={styles.infoText}>
                                                    <dt className={styles.infoLabel}>Member Since</dt>
                                                    <dd className={styles.infoValue}>{formatFullDate(user.join_date) || "Recently joined"}</dd>
                                                </div>
                                            </div>
                                        </dl>
                                    </div>

                                    {/* Contact */}
                                    {(phone || user.email) && (
                                        <aside className={styles.contactCard}>
                                            <h3 className={styles.contactTitle}>Contact {displayName}</h3>
                                            <p className={styles.contactSub}>Reach out directly about any of their listings.</p>

                                            <div className={styles.contactList}>
                                                {phone && (
                                                    <a href={`tel:${phone}`} className={styles.contactRow}>
                                                        <span className={styles.contactIcon}><RiPhoneLine /></span>
                                                        <span className={styles.contactText}>
                                                            <span className={styles.contactLabel}>Phone</span>
                                                            <span className={styles.contactValue}>{formatPhone(phone)}</span>
                                                        </span>
                                                    </a>
                                                )}
                                                {user.email && (
                                                    <a href={`mailto:${user.email}`} className={styles.contactRow}>
                                                        <span className={styles.contactIcon}><RiMailLine /></span>
                                                        <span className={styles.contactText}>
                                                            <span className={styles.contactLabel}>Email</span>
                                                            <span className={styles.contactValue}>{user.email}</span>
                                                        </span>
                                                    </a>
                                                )}
                                            </div>

                                            {phone && (
                                                <div className={styles.contactActions}>
                                                    <a href={`tel:${phone}`} className={styles.primaryBtn}>
                                                        <RiPhoneFill />
                                                        Call
                                                    </a>
                                                    {whatsappUrl && (
                                                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.secondaryBtn}>
                                                            <RiWhatsappLine className={styles.waIcon} />
                                                            WhatsApp
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </aside>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {toastMessage && (
                    <div className={styles.toast} role="status">
                        <RiCheckboxCircleLine className={styles.toastIcon} />
                        <span>{toastMessage}</span>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}
