"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./homeFeaturedProperty.module.css";
import { propertyApi, formatPropertyImgUrl, handlePropertyImageError, formatAddedDate } from "../lib/api";
import PropertyIdBadge, { PropertyBadgeRow } from "../componants/propertyIdBadge/PropertyIdBadge";
import { getPropertyCode } from "../lib/propertyCode";
import { useAuth } from "../context/AuthContext";
import { getPropertyUrl } from "../lib/seoHelper";
import { getLoginRedirectUrl } from "../lib/authRedirect";

export default function HomeFeaturedProperty() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [properties, setProperties] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        let alive = true;

        const loadFeatured = async () => {
            try {
                setIsLoading(true);
                const res = await propertyApi.list({ limit: 4, sort_by: "newest" });
                if (alive) {
                    const mapped = (res?.data || []).slice(0, 4).map((p) => {
                        const loc = [p.locality || p.town, p.district, "Kerala"].filter(Boolean).join(", ");
                        const listingType = p.listing_type || p.action || "buy";
                        const badge = listingType === "rent" ? "For Rent" : listingType === "lease" ? "For Lease" : "For Sale";

                        const pTitle = p.title || p.propertyTitle || "Featured Property";
                        const pId = p.id || p.propertyId;
                        const addedDateFormatted = formatAddedDate(p.added_date || p.addedDate || p.created_at || p.added_date_time);
                        const propType = (p.property_type || p.type || p.category_name || "").trim();

                        // Check if property is land, plot, or commercial/agricultural without bedrooms
                        const isLand = Boolean(
                            /land|plot|commercial|agricultural/i.test(propType) ||
                            /land|plot/i.test(pTitle) ||
                            (!p.bedrooms && !p.bathrooms)
                        );

                        // Extract / determine area / cents
                        let areaText = p.area || "";
                        if (!areaText || areaText === "1 Sq Ft" || areaText === "N/A") {
                            const textToSearch = `${pTitle} ${p.description || ""}`;
                            const centMatch = textToSearch.match(/(\d+(?:\.\d+)?)\s*(?:cent|cents)\b/i);
                            const acreMatch = textToSearch.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres)\b/i);
                            const sqftMatch = textToSearch.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:sq\s*ft|sqft|sq-ft)\b/i);
                            if (centMatch) {
                                areaText = `${centMatch[1]} Cent`;
                            } else if (acreMatch) {
                                areaText = `${acreMatch[1]} Acre`;
                            } else if (sqftMatch) {
                                areaText = `${sqftMatch[1]} Sq Ft`;
                            } else if (isLand) {
                                areaText = "Plot";
                            } else {
                                areaText = "1,800 Sq Ft";
                            }
                        }

                        let features = [];
                        if (!isLand && p.bedrooms) {
                            // Residential House / Villa / Apartment
                            features = [
                                { type: "bed", text: `${p.bedrooms} Beds` },
                                { type: "bath", text: `${p.bathrooms || 1} Baths` },
                                { type: "area", text: areaText },
                            ];
                        } else {
                            // Land / Plot / Commercial property (3 sections: Cents/Area, Facing, Ownership/Type)
                            const facingVal = p.facing && p.facing !== "N/A"
                                ? (p.facing.toLowerCase().includes("facing") ? p.facing : `${p.facing} Facing`)
                                : null;

                            const ownershipVal = p.ownership && p.ownership !== "N/A"
                                ? p.ownership
                                : null;

                            const typeLabel = propType ? propType.replace(/^Residential\s+/i, "") : "Land";

                            features = [
                                { type: "area", text: areaText || "Plot" },
                                { type: facingVal ? "compass" : "type", text: facingVal || typeLabel },
                                { type: ownershipVal ? "shield" : "type", text: ownershipVal || typeLabel },
                            ];
                        }

                        return {
                            id: pId,
                            title: pTitle,
                            price: p.price_formatted || (p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : "Price on Request"),
                            location: loc || "Kerala",
                            status: badge,
                            features: features,
                            image: formatPropertyImgUrl(p.image || p.cover_image),
                            href: getPropertyUrl(pId, pTitle),
                            isSaved: !!p.is_saved,
                            addedDate: addedDateFormatted,
                            code: getPropertyCode({ ...p, id: pId }),
                        };
                    });
                    setProperties(mapped);
                    setLoadError("");

                    // Initialize favorites from is_saved flag
                    const initialSaved = mapped.filter((p) => p.isSaved).map((p) => p.id);
                    setFavorites((prev) => [...new Set([...prev, ...initialSaved])]);
                }
            } catch (err) {
                console.error("Failed to load featured properties:", err);
                if (alive) {
                    setProperties([]);
                    setLoadError("Unable to load featured properties right now.");
                }
            } finally {
                if (alive) setIsLoading(false);
            }

            // Sync with favorites API if logged in
            if (!isAuthenticated) {
                setFavorites([]);
                return;
            }

            try {
                const favRes = await propertyApi.favorites();
                if (alive && favRes?.data) {
                    const allFavIds = (favRes.data || []).map((p) => p.id || p.propertyId);
                    setFavorites((prev) => [...new Set([...prev, ...allFavIds])]);
                }
            } catch {
                // Not authenticated or error
            }
        };

        loadFeatured();

        const handleAuthChange = () => loadFeatured();
        window.addEventListener("kp_auth_changed", handleAuthChange);

        return () => {
            alive = false;
            window.removeEventListener("kp_auth_changed", handleAuthChange);
        };
    }, [isAuthenticated]);

    const toggleFavorite = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            router.push(getLoginRedirectUrl());
            return;
        }
        const wasFav = favorites.includes(id);

        // Optimistic update
        setFavorites((prev) => (wasFav ? prev.filter((favId) => favId !== id) : [...prev, id]));

        try {
            const res = await propertyApi.toggleFavorite(id);
            if (res && typeof res.saved === "boolean") {
                setFavorites((prev) => (res.saved ? [...new Set([...prev, id])] : prev.filter((favId) => favId !== id)));
            }
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
            // Rollback on failure
            setFavorites((prev) => (wasFav ? [...prev, id] : prev.filter((favId) => favId !== id)));
        }
    };

    return (
        <section className={styles.featuredSection}>
            <div className={styles.container}>
                {/* Header Row */}
                <div className={styles.headerRow}>
                    <div>
                        <h2 className={styles.mainTitle}>Explore Our Featured Properties</h2>
                    </div>

                    <Link href="/properties" className={styles.viewAllBtn}>
                        View All Properties
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>
                </div>

                {/* 4 Properties Cards Grid */}
                {loadError && !isLoading && (
                    <div className={styles.emptyState}>{loadError}</div>
                )}

                {isLoading ? (
                    <div className={styles.propertiesGrid}>
                        {[1, 2, 3, 4].map((item) => (
                            <article key={item} className={`${styles.propertyCard} ${styles.skeletonCard}`}>
                                <div className={styles.skeletonImage} />
                                <div className={styles.cardBody}>
                                    <span className={styles.skeletonLineWide} />
                                    <span className={styles.skeletonLine} />
                                    <span className={styles.skeletonLineShort} />
                                </div>
                            </article>
                        ))}
                    </div>
                ) : properties.length === 0 && !loadError ? (
                    <div className={styles.emptyState}>No featured properties available yet.</div>
                ) : (
                    <div className={styles.propertiesGrid}>
                        {properties.map((property) => {
                            const isFav = favorites.includes(property.id);
                            return (
                                <Link key={property.id} href={property.href} className={styles.propertyCard}>
                                    {/* Property Top Image */}
                                    <div className={styles.imageBox}>
                                        {property.image ? (
                                            <img
                                                loading="lazy"
                                                decoding="async"
                                                src={property.image}
                                                alt={property.title}
                                                className={styles.cardImage}
                                                onError={handlePropertyImageError}
                                            />
                                        ) : (
                                            <div className={styles.imagePlaceholder}>
                                                <span>KeralaPlots</span>
                                            </div>
                                        )}

                                        {/* For Sale / For Rent Badge */}
                                        <span className={styles.statusBadge}>{property.status}</span>

                                        {/* Favorite Heart Button */}
                                        <button
                                            type="button"
                                            className={`${styles.favBtn} ${isFav ? styles.favBtnActive : ""}`}
                                            onClick={(e) => toggleFavorite(e, property.id)}
                                            title={isFav ? "Remove from favorites" : "Add to favorites"}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Property Info Body */}
                                    <div className={styles.cardBody}>
                                        <PropertyBadgeRow style={{ marginBottom: 10 }}>
                                            <PropertyIdBadge code={property.code} />
                                            {property.addedDate && (
                                                <span className={styles.cardAddedDate} title={`Added on ${property.addedDate}`}>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    {property.addedDate}
                                                </span>
                                            )}
                                        </PropertyBadgeRow>
                                        <div className={styles.priceRow}>
                                            <div className={styles.priceTag}>{property.price}</div>
                                        </div>
                                        <h3 className={styles.propertyTitle}>{property.title}</h3>

                                        <div className={styles.locationRow}>
                                            <svg className={styles.locationIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            <span>{property.location}</span>
                                        </div>

                                        {/* Features Footer (3 Sections) */}
                                        <div className={styles.featuresRow}>
                                            {(property.features || []).map((feat, idx) => (
                                                <div key={idx} className={styles.featureItem}>
                                                    {feat.type === "bed" && (
                                                        <svg className={styles.featureIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M2 4v16M2 8h20v12M2 12h20M12 4v4" />
                                                        </svg>
                                                    )}
                                                    {feat.type === "bath" && (
                                                        <svg className={styles.featureIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
                                                            <path d="M6 12V5a2 2 0 0 1 2-2h3" />
                                                        </svg>
                                                    )}
                                                    {feat.type === "area" && (
                                                        <svg className={styles.featureIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                            <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                                                        </svg>
                                                    )}
                                                    {feat.type === "compass" && (
                                                        <svg className={styles.featureIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                                        </svg>
                                                    )}
                                                    {feat.type === "shield" && (
                                                        <svg className={styles.featureIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                        </svg>
                                                    )}
                                                    {feat.type === "type" && (
                                                        <svg className={styles.featureIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M3 21h18M3 10h18M5 6l7-3 7 3" />
                                                        </svg>
                                                    )}
                                                    <span>{feat.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
