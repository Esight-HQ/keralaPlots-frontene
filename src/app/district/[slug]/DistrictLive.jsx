"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { propertyApi, formatPropertyImgUrl, handlePropertyImageError, formatAddedDate } from "../../lib/api";
import { getPropertyUrl } from "../../lib/seoHelper";
import { getLoginRedirectUrl } from "../../lib/authRedirect";
import { getPropertyCode } from "../../lib/propertyCode";
import { useAuth } from "../../context/AuthContext";
import PropertyIdBadge, { PropertyBadgeRow } from "../../componants/propertyIdBadge/PropertyIdBadge";
// Same card styles as the /properties page, so listings look identical everywhere.
import cardStyles from "../../properties/properties.module.css";
import { facetKeysFor, districtSearchHref } from "../../lib/keralaDistricts";
import styles from "./district.module.css";

/* ---------- shared: which district names the listings use + total count ---------- */

let facetPromise = null;
const loadDistrictFacets = () => {
    if (!facetPromise) {
        facetPromise = propertyApi
            .list({ limit: 1 })
            .then((res) => res?.facets?.district || null)
            .catch(() => {
                facetPromise = null; // allow a retry on the next mount
                return null;
            });
    }
    return facetPromise;
};

/** { loading, count (null if unknown), filterValue } for a district. */
function useDistrictFilter(district) {
    const [state, setState] = useState({ loading: true, count: null, filterValue: district.name });

    useEffect(() => {
        let alive = true;
        loadDistrictFacets().then((facet) => {
            if (!alive) return;
            if (!facet) {
                setState({ loading: false, count: null, filterValue: district.name });
                return;
            }
            const keys = facetKeysFor(district, facet);
            const count = keys.reduce((sum, k) => sum + (Number(facet[k]) || 0), 0);
            setState({ loading: false, count, filterValue: keys.length ? keys.join(",") : district.name });
        });
        return () => {
            alive = false;
        };
    }, [district]); // eslint-disable-line react-hooks/exhaustive-deps

    return state;
}

const formatCount = (n) => Number(n).toLocaleString("en-IN");

/* "Thrissur Town" / "Kozhikode City" -> "Thrissur" / "Kozhikode": listings rarely include the suffix. */
const searchTermFor = (place) => (place ? place.replace(/\s+(Town|City)$/i, "").trim() : "");

/** Listing count for a town/area inside a district (district filter + text search). */
function usePlaceCount(district, place) {
    const { loading: filterLoading, filterValue } = useDistrictFilter(district);
    const [state, setState] = useState({ loading: true, count: null });

    useEffect(() => {
        if (!place || filterLoading) return;
        let alive = true;
        propertyApi
            .list({ district: filterValue, search: searchTermFor(place), limit: 1 })
            .then((res) => {
                if (!alive) return;
                const total = res?.meta?.total ?? res?.total;
                setState({ loading: false, count: total === undefined || total === null ? null : Number(total) });
            })
            .catch(() => alive && setState({ loading: false, count: null }));
        return () => {
            alive = false;
        };
    }, [place, filterLoading, filterValue]);

    return { ...state, filterValue, loading: filterLoading || state.loading };
}

/** District numbers, or the town's numbers when `place` is given. */
function useListingScope(district, place) {
    const districtState = useDistrictFilter(district);
    const placeState = usePlaceCount(district, place);
    return place ? placeState : districtState;
}

export function DistrictListingCount({ district, place }) {
    const { loading, count } = useListingScope(district, place);
    if (loading) return <span className={styles.countSkeleton} aria-label="Loading" />;
    if (count === null) return "Browse";
    return formatCount(count);
}

export function DistrictViewAllLink({ district, place, className }) {
    const { count, filterValue } = useListingScope(district, place);
    return (
        <Link href={districtSearchHref(filterValue, searchTermFor(place))} className={className}>
            {count ? `View all ${formatCount(count)} properties` : "View all properties"}
            <span className={styles.btnArrow} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
            </span>
        </Link>
    );
}

export function DistrictPlaceLink({ district, place, className, children }) {
    const { filterValue } = useDistrictFilter(district);
    return (
        <Link href={districtSearchHref(filterValue, place)} className={className}>
            {children}
        </Link>
    );
}

/* ---------- listings ---------- */

const TABS = [
    { id: "all", label: "All" },
    { id: "buy", label: "For Sale" },
    { id: "rent", label: "For Rent" },
];

const PAGE_SIZE = 8;

/* Same fields as the /properties page card (normalizeProperty there). */
const areaFromText = (p) => {
    const a = p.area && p.area !== "N/A" && p.area !== "1 Sq Ft" ? p.area : "";
    if (a) return a;
    const text = `${p.title || ""} ${p.description || ""}`;
    const cent = text.match(/(\d+(?:\.\d+)?)\s*(?:cent|cents)\b/i);
    const acre = text.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres)\b/i);
    const sqft = text.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:sq\s*ft|sqft|sq-ft)\b/i);
    if (cent) return `${cent[1]} Cent`;
    if (acre) return `${acre[1]} Acre`;
    if (sqft) return `${sqft[1]} Sq Ft`;
    return "";
};

const mapProperty = (p) => {
    const id = p.id || p.propertyId;
    const title = p.title || p.propertyTitle || "Property";
    const listingType = p.listing_type || p.action || "buy";
    const location = p.location_label || [p.locality || p.town, p.city, p.district].filter(Boolean).join(", ");
    const facing = p.facing && p.facing !== "N/A" ? p.facing : "";
    return {
        id,
        title,
        href: getPropertyUrl(id, title),
        image: formatPropertyImgUrl(p.image || p.cover_image),
        price: p.price_formatted || (Number(p.price) ? `₹${Number(p.price).toLocaleString("en-IN")}` : "Price on request"),
        badge: listingType === "rent" ? "For Rent" : listingType === "lease" ? "For Lease" : "For Sale",
        location: location || "Kerala",
        type: String(p.property_type || p.type || "").replace(/^Residential\s+/i, "").trim() || "Plot",
        beds: p.bedrooms ? `${p.bedrooms} Beds` : "",
        baths: p.bathrooms ? `${p.bathrooms} ${Number(p.bathrooms) === 1 ? "Bath" : "Baths"}` : "",
        area: areaFromText(p),
        facing: facing ? (facing.toLowerCase().includes("facing") ? facing : `${facing} Facing`) : "",
        ownership: p.ownership && p.ownership !== "N/A" ? p.ownership : "Freehold",
        addedDate: formatAddedDate(p.added_date || p.addedDate || p.created_at || p.added_date_time),
        code: getPropertyCode({ ...p, id }),
        isSaved: !!p.is_saved,
        isOwner: !!p.is_owner,
        ownerId: p.login_id || p.owner?.id,
    };
};

export function DistrictListings({ district, place }) {
    const areaName = place || district.name;
    const search = searchTermFor(place);
    const { loading: filterLoading, filterValue } = useDistrictFilter(district);
    const [tab, setTab] = useState("all");
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(null);
    const [typeFacet, setTypeFacet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [favorites, setFavorites] = useState([]);
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    const currentLoginId = user?.loginId || user?.id;

    useEffect(() => {
        if (filterLoading) return;
        let alive = true;
        setLoading(true);
        setError("");

        const query = { district: filterValue, limit: PAGE_SIZE, sort_by: "newest" };
        if (search) query.search = search;
        if (tab !== "all") query.listing_type = tab;

        propertyApi
            .list(query)
            .then((res) => {
                if (!alive) return;
                const list = (res?.data || []).map(mapProperty).slice(0, PAGE_SIZE);
                setItems(list);
                setFavorites(list.filter((item) => item.isSaved).map((item) => item.id));
                setTotal(Number(res?.meta?.total ?? res?.total ?? list.length));
                if (tab === "all") setTypeFacet(res?.facets?.property_type || null);
            })
            .catch(() => {
                if (!alive) return;
                setItems([]);
                setTotal(null);
                setError("We couldn't load listings right now. Please try again.");
            })
            .finally(() => {
                if (alive) setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [filterLoading, filterValue, tab, reloadKey, search]);

    const toggleFavorite = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            router.push(getLoginRedirectUrl());
            return;
        }
        const wasSaved = favorites.includes(id);
        setFavorites((prev) => (wasSaved ? prev.filter((f) => f !== id) : [...prev, id]));
        try {
            const res = await propertyApi.toggleFavorite(id);
            if (typeof res?.saved === "boolean") {
                setFavorites((prev) => {
                    const next = prev.filter((f) => f !== id);
                    return res.saved ? [...next, id] : next;
                });
            }
        } catch {
            setFavorites((prev) => (wasSaved ? [...new Set([...prev, id])] : prev.filter((f) => f !== id)));
        }
    };

    const typeChips = typeFacet
        ? Object.entries(typeFacet)
            .filter(([, n]) => Number(n) > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
        : [];

    const viewAllHref = districtSearchHref(filterValue, search) + (tab !== "all" ? `&listing_type=${tab}` : "");

    return (
        <>
            <div className={styles.sectionHead}>
                <div>
                    <h2 className={styles.sectionTitle}>Latest properties in {areaName}</h2>
                    <p className={styles.sectionSubtitle}>
                        {total !== null && !loading
                            ? `${formatCount(total)} ${total === 1 ? "listing" : "listings"}${tab === "buy" ? " for sale" : tab === "rent" ? " for rent" : ""}`
                            : "Fresh listings from owners and verified agents"}
                    </p>
                </div>
                <div className={styles.tabs} role="tablist" aria-label="Listing type">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.id}
                            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* {typeChips.length > 0 && (
                <div className={styles.typeChips}>
                    <span className={styles.typeChipsLabel}>Browse by type:</span>
                    {typeChips.map(([type, n]) => (
                        <Link
                            key={type}
                            href={`${districtSearchHref(filterValue, search)}&property_type=${encodeURIComponent(type)}`}
                            className={styles.typeChip}
                        >
                            {type.replace(/^Residential\s+/i, "")}
                            <span className={styles.typeChipCount}>{formatCount(n)}</span>
                        </Link>
                    ))}
                </div>
            )} */}

            {loading ? (
                <ul className={styles.propertyGrid} aria-busy="true">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <li key={i} className={styles.propertySkeleton}>
                            <span className={styles.skeletonImage} />
                            <span className={styles.skeletonLine} style={{ width: "45%" }} />
                            <span className={styles.skeletonLine} style={{ width: "85%" }} />
                            <span className={styles.skeletonLine} style={{ width: "60%" }} />
                        </li>
                    ))}
                </ul>
            ) : error ? (
                <div className={styles.emptyState}>
                    <p className={styles.emptyTitle}>{error}</p>
                    <button type="button" className={styles.secondaryBtn} onClick={() => setReloadKey((k) => k + 1)}>
                        Retry
                    </button>
                </div>
            ) : items.length === 0 ? (
                <div className={styles.emptyState}>
                    <p className={styles.emptyTitle}>
                        No {tab === "rent" ? "rental " : tab === "buy" ? "sale " : ""}listings in {areaName} yet
                    </p>
                    <p className={styles.emptyText}>New properties are added every day. Check back soon, or be the first to list here.</p>
                    <Link href="/post-property" className={styles.primaryBtn}>
                        Post your property
                    </Link>
                </div>
            ) : (
                <>
                    <ul className={styles.propertyGrid}>
                        {items.map((p) => {
                            const isFav = favorites.includes(p.id);
                            const isOwn = p.isOwner || (currentLoginId && String(p.ownerId) === String(currentLoginId));
                            return (
                                <li key={p.id} className={styles.propertyItem}>
                                    <Link href={p.href} className={cardStyles.propertyCard} style={{ textDecoration: "none", color: "inherit", height: "100%" }}>
                                        <div className={cardStyles.imageWrapper}>
                                            <img
                                                loading="lazy"
                                                decoding="async"
                                                src={p.image}
                                                alt={p.title}
                                                className={cardStyles.cardImage}
                                                onError={handlePropertyImageError}
                                            />
                                            <span className={`${cardStyles.badge} ${cardStyles.forSaleBadge}`}>{p.badge}</span>
                                            <button
                                                type="button"
                                                className={cardStyles.cardFavoriteBtn}
                                                onClick={(e) => toggleFavorite(e, p.id)}
                                                title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                                aria-label={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                                aria-pressed={isFav}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? "#ef4444" : "none"} stroke={isFav ? "#ef4444" : "#1e293b"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className={cardStyles.cardContent}>
                                            {(p.addedDate || p.code) && (
                                                <PropertyBadgeRow>
                                                    <PropertyIdBadge code={p.code} />
                                                    {p.addedDate && (
                                                        <span className={cardStyles.cardAddedDate} title={`Added on ${p.addedDate}`}>
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
                                            )}
                                            <h3 className={cardStyles.cardTitle}>{p.title}</h3>

                                            <div className={cardStyles.locationRow}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                <span>{p.location}</span>
                                            </div>

                                            <div className={cardStyles.priceRow}>
                                                <div className={cardStyles.price}>{p.price}</div>
                                                <div className={cardStyles.priceRightGroup}>
                                                    {isOwn && <span className={cardStyles.ownPropertyBadge}>Own Property</span>}
                                                </div>
                                            </div>

                                            <div className={cardStyles.metaGrid}>
                                                {p.beds ? (
                                                    <>
                                                        <div className={cardStyles.metaItem}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M2 4v16M2 8h20v12M2 12h20M18 4v4" />
                                                            </svg>
                                                            <span>{p.beds}</span>
                                                        </div>
                                                        {p.baths && (
                                                            <div className={cardStyles.metaItem}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1zM6 12V5a2 2 0 0 1 2-2h3v9" />
                                                                </svg>
                                                                <span>{p.baths}</span>
                                                            </div>
                                                        )}
                                                        {p.area && (
                                                            <div className={cardStyles.metaItem}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                </svg>
                                                                <span>{p.area}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={cardStyles.metaItem}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                                                            </svg>
                                                            <span>{p.area || "Plot"}</span>
                                                        </div>
                                                        <div className={cardStyles.metaItem}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                                            </svg>
                                                            <span>{p.facing || p.type}</span>
                                                        </div>
                                                        <div className={cardStyles.metaItem}>
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
                                </li>
                            );
                        })}
                    </ul>

                    {total > items.length && (
                        <div className={styles.listingsFooter}>
                            <Link href={viewAllHref} className={styles.primaryBtn}>
                                View all {formatCount(total)} properties
                                <span aria-hidden="true"> →</span>
                            </Link>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

/** Exclusive accordion: only one FAQ item expanded at a time. */
export function DistrictFaqAccordion({ faqs = [] }) {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <div className={styles.faqList}>
            {faqs.map((f, i) => {
                const isOpen = openIndex === i;
                return (
                    <details
                        key={`${f.q}-${i}`}
                        className={styles.faqItem}
                        open={isOpen}
                    >
                        <summary
                            className={styles.faqQuestion}
                            onClick={(e) => {
                                e.preventDefault();
                                setOpenIndex((prev) => (prev === i ? -1 : i));
                            }}
                        >
                            <span>{f.q}</span>
                            <span className={styles.faqToggle} aria-hidden="true" />
                        </summary>
                        <p className={styles.faqAnswer}>{f.a}</p>
                    </details>
                );
            })}
        </div>
    );
}

