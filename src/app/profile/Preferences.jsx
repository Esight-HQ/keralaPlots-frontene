"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
    RiWallet3Line,
    RiMapPinLine,
    RiHome4Line,
    RiStarSmileLine,
    RiEditLine,
    RiEqualizerLine,
    RiSearchEyeLine,
    RiDeleteBin6Line,
    RiCheckboxCircleFill,
    RiAddLine,
    RiArrowRightLine,
    RiSparklingLine,
    RiCheckLine,
} from "react-icons/ri";
import { useAuth } from "../context/AuthContext";
import { preferencesApi, handlePropertyImgError } from "../lib/api";
import { getPropertyUrl } from "../lib/seoHelper";
import {
    PREFERENCES_CHANGED_EVENT,
    budgetLabel,
    clearPreferences,
    getUserIdFrom,
    hasAnyPreference,
    openPreferencesPopup,
    parsePreferences,
    preferencesToPropertiesUrl,
    propertyTypeLabel,
    readPreferencesRaw,
    subscribePreferences,
    syncPreferencesFromBackend,
} from "../lib/preferencesStore";
import styles from "./preferences.module.css";
import PropertyIdBadge, { PropertyBadgeRow } from "../componants/propertyIdBadge/PropertyIdBadge";

const formatSaved = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function Preferences() {
    const { user } = useAuth();
    const userId = getUserIdFrom(user);

    // Live view of localStorage: updates after the popup saves, or from another tab.
    const raw = useSyncExternalStore(
        subscribePreferences,
        () => readPreferencesRaw(userId),
        () => null
    );
    const prefs = useMemo(() => parsePreferences(raw), [raw]);
    const hasPrefs = hasAnyPreference(prefs);

    const [confirmClear, setConfirmClear] = useState(false);
    const [toast, setToast] = useState("");
    const toastTimer = useRef(null);
    const [matchingProperties, setMatchingProperties] = useState([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    // Initial sync from backend if localStorage is empty
    useEffect(() => {
        if (user && !raw) {
            syncPreferencesFromBackend(user);
        }
    }, [user, raw]);

    // Fetch matching properties whenever preferences exist
    useEffect(() => {
        if (!hasPrefs) {
            setMatchingProperties([]);
            return;
        }

        let isMounted = true;
        setLoadingMatches(true);

        const prefsData = {
            budget: prefs?.budget || [],
            locations: prefs?.locations || [],
            localities: prefs?.localities || [],
            property_types: prefs?.propertyTypes || [],
            amenities: prefs?.amenities || [],
        };

        preferencesApi.getMatches(userId || null, 8, prefsData)
            .then((res) => {
                if (isMounted && res?.status && Array.isArray(res.data)) {
                    setMatchingProperties(res.data);
                }
            })
            .catch((err) => {
                console.warn("Failed to load preference matches:", err);
            })
            .finally(() => {
                if (isMounted) setLoadingMatches(false);
            });

        return () => {
            isMounted = false;
        };
    }, [hasPrefs, userId, raw, prefs]);

    // "Saved" confirmation whenever preferences change while this page is open.
    useEffect(() => {
        const onChange = () => {
            clearTimeout(toastTimer.current);
            setToast("Preferences updated");
            toastTimer.current = setTimeout(() => setToast(""), 2600);
        };
        window.addEventListener(PREFERENCES_CHANGED_EVENT, onChange);
        return () => {
            window.removeEventListener(PREFERENCES_CHANGED_EVENT, onChange);
            clearTimeout(toastTimer.current);
        };
    }, []);

    const sections = prefs
        ? [
            {
                step: 0,
                title: "Budget",
                Icon: RiWallet3Line,
                items: prefs.budget.map(budgetLabel),
                empty: "Any budget",
            },
            {
                step: 1,
                title: "Location",
                Icon: RiMapPinLine,
                items: [
                    ...prefs.localities.map((l) => `${l.name}, ${l.district}`),
                    ...prefs.locations.map((d) => `${d} (district)`),
                ],
                empty: "Anywhere in Kerala",
            },
            {
                step: 2,
                title: "Property type",
                Icon: RiHome4Line,
                items: prefs.propertyTypes.map(propertyTypeLabel),
                empty: "Any type",
            },
            {
                step: 3,
                title: "Amenities",
                Icon: RiStarSmileLine,
                items: prefs.amenities,
                empty: "No must-haves",
            },
        ]
        : [];

    const handleClear = () => {
        clearPreferences(user);
        setConfirmClear(false);
    };

    return (
        <section className={styles.page}>
            <header className={styles.head}>
                <div>
                    <h1 className={styles.pageTitle}>My Preferences</h1>
                    <p className={styles.pageSub}>
                        What you&apos;re looking for — we use this to show you matching properties.
                    </p>
                </div>
                {hasPrefs && (
                    <button type="button" className={styles.editBtn} onClick={() => openPreferencesPopup({ mode: "edit", step: 0 })}>
                        <RiEditLine aria-hidden="true" /> Edit preferences
                    </button>
                )}
            </header>

            {!hasPrefs ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true">
                        <RiEqualizerLine />
                    </span>
                    <h2 className={styles.emptyTitle}>No preferences yet</h2>
                    <p className={styles.emptyText}>
                        Tell us your budget, preferred locations, property type and must-have amenities, and
                        we&apos;ll show you properties that fit.
                    </p>
                    <button type="button" className={styles.primaryBtn} onClick={() => openPreferencesPopup({ mode: "edit", step: 0 })}>
                        <RiAddLine aria-hidden="true" /> Set your preferences
                    </button>
                </div>
            ) : (
                <>
                    <div className={styles.grid}>
                        {sections.map(({ step, title, Icon, items, empty }) => (
                            <article key={title} className={styles.card}>
                                <div className={styles.cardHead}>
                                    <span className={styles.cardIcon} aria-hidden="true">
                                        <Icon />
                                    </span>
                                    <h2 className={styles.cardTitle}>{title}</h2>
                                    <button
                                        type="button"
                                        className={styles.cardEdit}
                                        onClick={() => openPreferencesPopup({ mode: "edit", step })}
                                        aria-label={`Edit ${title.toLowerCase()}`}
                                    >
                                        <RiEditLine aria-hidden="true" /> Edit
                                    </button>
                                </div>
                                {items.length ? (
                                    <ul className={styles.chips}>
                                        {items.map((item) => (
                                            <li key={item} className={styles.chip}>
                                                <RiCheckboxCircleFill aria-hidden="true" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className={styles.notSet}>{empty}</p>
                                )}
                            </article>
                        ))}
                    </div>

                    <div className={styles.footer}>
                        <Link href={preferencesToPropertiesUrl(prefs)} className={styles.secondaryBtn}>
                            <RiSearchEyeLine aria-hidden="true" /> View matching properties
                        </Link>

                        <div className={styles.footerRight}>
                            {prefs.savedAt && <span className={styles.savedAt}>Last updated {formatSaved(prefs.savedAt)}</span>}
                            {confirmClear ? (
                                <span className={styles.confirm} role="group" aria-label="Confirm clearing preferences">
                                    Clear all preferences?
                                    <button type="button" className={styles.dangerBtn} onClick={handleClear}>
                                        Yes, clear
                                    </button>
                                    <button type="button" className={styles.textBtn} onClick={() => setConfirmClear(false)}>
                                        Cancel
                                    </button>
                                </span>
                            ) : (
                                <button type="button" className={styles.textBtn} onClick={() => setConfirmClear(true)}>
                                    <RiDeleteBin6Line aria-hidden="true" /> Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {(prefs.localities.length > 0 || prefs.amenities.length > 0) && (
                        <p className={styles.note}>
                            Search results are filtered by district, budget and property type. Your localities and
                            amenities are saved and will be used as those filters become available.
                        </p>
                    )}

                    {/* Matched Properties Section */}
                    {hasPrefs && (
                        <div className={styles.matchesSection}>
                            <div className={styles.matchesHead}>
                                <h3 className={styles.matchesTitle}>
                                    <RiSparklingLine className="text-violet-600" />
                                    Properties Matching Your Preferences
                                    {matchingProperties.length > 0 && (
                                        <span className={styles.matchBadgeCount}>{matchingProperties.length} found</span>
                                    )}
                                </h3>
                                <Link href={preferencesToPropertiesUrl(prefs)} className={styles.secondaryBtn} style={{ minHeight: "38px", fontSize: "13.5px" }}>
                                    View all matches <RiArrowRightLine />
                                </Link>
                            </div>

                            {loadingMatches ? (
                                <div className={styles.loadingMatchesGrid}>
                                    <div className={styles.skeletonCard}></div>
                                    <div className={styles.skeletonCard}></div>
                                    <div className={styles.skeletonCard}></div>
                                    <div className={styles.skeletonCard}></div>
                                </div>
                            ) : matchingProperties.length > 0 ? (
                                <div className={styles.matchesGrid}>
                                    {matchingProperties.map((prop) => {
                                        const percent = prop.match_percentage || 0;
                                        const badgeClass = percent >= 80 ? styles.matchHigh : (percent >= 65 ? styles.matchGood : styles.matchMedium);
                                        const breakdown = prop.match_breakdown || {};
                                        const propUrl = getPropertyUrl(prop.propertyId || prop.id, prop.propertyTitle || prop.title);

                                        return (
                                            <article key={prop.propertyId || prop.id} className={styles.matchCard}>
                                                <Link href={propUrl} className={styles.matchImgWrapper}>
                                                    <img loading="lazy" decoding="async"
                                                        src={prop.image || "/nophoto.webp"}
                                                        alt={prop.propertyTitle || "Property"}
                                                        className={styles.matchImg}
                                                        onError={handlePropertyImgError}
                                                    />
                                                    <div className={`${styles.matchPercentBadge} ${badgeClass}`}>
                                                        🎯 {percent}% Match
                                                    </div>
                                                </Link>

                                                <div className={styles.matchBody}>
                                                    <PropertyBadgeRow style={{ marginBottom: 6 }}>
                                                        <PropertyIdBadge property={prop} />
                                                    </PropertyBadgeRow>
                                                    <div className={styles.matchPrice}>{prop.price || "Price on Request"}</div>
                                                    <Link href={propUrl} style={{ textDecoration: "none", color: "inherit" }}>
                                                        <h4 className={styles.matchPropTitle}>{prop.propertyTitle}</h4>
                                                    </Link>
                                                    <div className={styles.matchLocation}>
                                                        <RiMapPinLine aria-hidden="true" />
                                                        <span>{prop.location || prop.district || "Kerala"}</span>
                                                    </div>

                                                    <div className={styles.matchTags}>
                                                        {breakdown.location?.matched && (
                                                            <span className={`${styles.matchTag} ${styles.matchTagHighlight}`}>
                                                                <RiCheckLine /> Location
                                                            </span>
                                                        )}
                                                        {breakdown.budget?.matched && (
                                                            <span className={`${styles.matchTag} ${styles.matchTagHighlight}`}>
                                                                <RiCheckLine /> Budget
                                                            </span>
                                                        )}
                                                        {breakdown.type?.matched && (
                                                            <span className={`${styles.matchTag} ${styles.matchTagHighlight}`}>
                                                                <RiCheckLine /> {prop.propertyType || "Type"}
                                                            </span>
                                                        )}
                                                        {breakdown.amenities?.matched && (
                                                            <span className={styles.matchTag}>
                                                                {breakdown.amenities.detail || "Amenities"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <Link href={propUrl} className={styles.matchViewBtn}>
                                                        View Property <RiArrowRightLine />
                                                    </Link>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className={styles.noMatchesCard}>
                                    <p>No exact matching properties found matching your current preference criteria right now.</p>
                                    <Link href={preferencesToPropertiesUrl(prefs)} className={styles.secondaryBtn}>
                                        Explore all available properties in your locations <RiArrowRightLine />
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`} role="status" aria-live="polite">
                {toast && (
                    <>
                        <RiCheckboxCircleFill aria-hidden="true" /> {toast}
                    </>
                )}
            </div>
        </section>
    );
}
