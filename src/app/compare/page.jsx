"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./compare.module.css";
import { propertyApi, formatPropertyImgUrl, handlePropertyImageError, formatAddedDate } from "../lib/api";
import { getSnapshot } from "../lib/compareStore";
import {
    RiArrowRightSLine,
    RiMapPin2Line,
    RiCalendarLine,
    RiCloseLine,
    RiListCheck,
    RiHome5Line,
    RiBuilding2Line,
    RiCheckboxCircleFill,
    RiIndeterminateCircleFill,
    RiStarFill,
    RiCheckLine,
    RiGroupLine,
    RiMapPinRangeLine,
    RiScales3Line,
    RiShareForwardLine,
    RiWhatsappLine,
    RiFileCopyLine,
} from "react-icons/ri";

const inr = (value) => Number(value || 0).toLocaleString("en-IN");

const pricePerSqft = (p) => (p.builtUp > 0 ? Math.round(p.price / p.builtUp) : null);
const avgDistance = (p) => (p.metro + p.airport + p.hospital) / 3;
const FALLBACK_IMAGE = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public";

const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const match = String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
};

const toPropertyKind = (type) => {
    const lower = String(type || "").toLowerCase();
    if (lower.includes("apartment")) return "Apartment";
    if (lower.includes("plot") || lower.includes("land")) return "Plot";
    if (lower.includes("villa") || lower.includes("house")) return "Villa";
    if (lower.includes("office")) return "Office";
    if (lower.includes("shop")) return "Shop";
    if (lower.includes("commercial")) return "Commercial";
    return type || "Property";
};

const distanceKm = (from, to) => {
    if (!from.lat || !from.lng) return null;
    const rad = Math.PI / 180;
    const dLat = (to.lat - from.lat) * rad;
    const dLng = (to.lng - from.lng) * rad;
    const lat1 = from.lat * rad;
    const lat2 = to.lat * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

const normalizeCompareProperty = (raw) => {
    const details = raw.details || {};
    const location = raw.location || {};
    const coords = { lat: Number(location.lat), lng: Number(location.lng) };
    const propertyType = toPropertyKind(raw.type || raw.property_type);
    const builtUp = parseNumber(details.builtupArea || details.built_up_area || raw.area || raw.builtupArea);
    const land = parseNumber(details.plotArea || details.landArea || raw.plot_area || raw.land_area);
    const bhk = parseNumber(details.bedrooms || raw.bedrooms);
    const amenities = [...new Set([...(raw.amenities || []), ...(raw.features || [])].filter(Boolean))];
    const image = formatPropertyImgUrl(raw.images?.[0]?.url || raw.cover_image || raw.image || FALLBACK_IMAGE);
    const possession = details.availability || raw.status || "Contact owner";

    return {
        id: String(raw.id || raw.property_id),
        code: raw.code || `KP${raw.id || raw.property_id}`,
        slug: raw.id || raw.property_id,
        title: raw.title || `${propertyType} in ${location.town || location.district || "Kerala"}`,
        location: location.fullAddress || raw.location_label || [location.locality, location.town, location.district, location.state].filter(Boolean).join(", "),
        area: location.locality || location.town || location.district || "Kerala",
        badge: String(raw.action || raw.listing_type || "").toLowerCase().includes("lease") ? "For Lease" : (String(raw.action || raw.listing_type || "").toLowerCase().includes("rent") ? "For Rent" : "For Sale"),
        price: Number(raw.priceNum ?? raw.price ?? raw.price_sort ?? 0),
        priceLabel: raw.price || raw.price_formatted || raw.price_range || "Price on request",
        bhk,
        propertyType,
        summaryType: propertyType === "Plot" ? propertyType : (bhk ? `${bhk} BHK ${propertyType}` : propertyType),
        builtUp,
        land: land || null,
        possession,
        amenities: amenities.length ? amenities : ["Owner contact available", "Location verified", "Photos available"],
        metro: distanceKm(coords, { lat: 9.9674, lng: 76.2999 }) ?? 0,
        airport: distanceKm(coords, { lat: 10.152, lng: 76.4019 }) ?? 0,
        hospital: distanceKm(coords, { lat: 10.0256, lng: 76.3085 }) ?? 0,
        status: raw.status || "Active",
        image,
        owner: raw.owner?.name || "Property Owner",
        addedDate: formatAddedDate(raw.added_date || raw.addedDate || raw.created_at || raw.added_date_time),
    };
};

/* Each row declares which direction is better, so the green / amber / red marks
   are read off the data rather than written by hand. Rows with no objective
   ordering — the ID and the property type — carry no mark at all: a meaningless
   dot is worse than none. */
const ROWS = [
    { key: "id", label: "Property ID", direction: "none", text: (p) => p.code },
    {
        key: "location",
        label: "Location",
        direction: "lower",
        value: avgDistance, // rated on connectivity, displayed as the place name
        text: (p) => p.location,
    },
    { key: "propertyType", label: "Property Type", direction: "none", text: (p) => p.propertyType },
    { key: "addedDate", label: "Listed Date", direction: "none", text: (p) => p.addedDate || "Recently" },
    { key: "bhk", label: "BHK", direction: "higher", value: (p) => p.bhk, text: (p) => (p.bhk ? `${p.bhk} BHK` : "—") },
    {
        key: "builtUp",
        label: "Built-up Area",
        direction: "higher",
        value: (p) => p.builtUp,
        text: (p) => (p.builtUp ? `${inr(p.builtUp)} sq.ft` : "—"),
    },
    {
        key: "land",
        label: "Land Area",
        direction: "higher",
        value: (p) => p.land,
        text: (p) => (p.land === null ? "—" : `${p.land} Cent`),
    },
    { key: "price", label: "Price", direction: "lower", value: (p) => p.price, text: (p) => p.priceLabel },
    {
        key: "pricePerSqft",
        label: "Price per sq.ft",
        direction: "lower",
        value: pricePerSqft,
        text: (p) => {
            const rate = pricePerSqft(p);
            return rate ? `₹${inr(rate)} / sq.ft` : "On request";
        },
    },
    { key: "amenities", label: "Amenities", direction: "higher", value: (p) => p.amenities.length },
    { key: "metro", label: "Distance to Metro", direction: "lower", value: (p) => p.metro, text: (p) => `${p.metro} km` },
    { key: "airport", label: "Distance to Airport", direction: "lower", value: (p) => p.airport, text: (p) => `${p.airport} km` },
    { key: "hospital", label: "Distance to Hospital", direction: "lower", value: (p) => p.hospital, text: (p) => `${p.hospital} km` },
    { key: "status", label: "Status", direction: "flag", text: (p) => p.status },
];

/* best / worst / mid / none, decided across whichever columns are still shown. */
function markFor(row, property, shown) {
    if (row.direction === "none") return "none";
    if (row.direction === "flag") return property.status === "Active" ? "best" : "worst";

    const own = row.value(property);
    if (own === null || own === undefined) return "none";
    if (shown.length < 2) return "none";

    const values = shown.map(row.value).filter((v) => v !== null && v !== undefined);
    if (values.length < 2) return "none";

    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return "best";

    const bestValue = row.direction === "higher" ? max : min;
    const worstValue = row.direction === "higher" ? min : max;
    if (own === bestValue) return "best";
    if (own === worstValue) return "worst";
    return "mid";
}

function Mark({ mark }) {
    if (mark === "none") return null;
    if (mark === "best") return <RiCheckboxCircleFill className={styles.markBest} aria-hidden="true" />;
    if (mark === "worst") return <RiIndeterminateCircleFill className={styles.markWorst} aria-hidden="true" />;
    return <RiIndeterminateCircleFill className={styles.markMid} aria-hidden="true" />;
}

/* Awards. Each is decided by one stated metric so the reasoning can be checked
   against the table above it. */
function buildAwards(shown) {
    if (shown.length < 2) return [];

    const spread = (fn) => {
        const values = shown.map(fn).filter((v) => v !== null && v !== undefined);
        return { min: Math.min(...values), max: Math.max(...values) };
    };
    const up = (v, { min, max }) => (max === min ? 1 : (v - min) / (max - min));
    const down = (v, range) => 1 - up(v, range);

    const builtUpRange = spread((p) => p.builtUp);
    const landRange = spread((p) => p.land ?? 0);
    const amenityRange = spread((p) => p.amenities.length);
    const comparableRate = (p) => pricePerSqft(p) ?? Number.MAX_SAFE_INTEGER;
    const rateRange = spread(comparableRate);
    const distanceRange = spread(avgDistance);

    const score = (p) =>
        0.25 * up(p.builtUp, builtUpRange) +
        0.15 * up(p.land ?? 0, landRange) +
        0.15 * up(p.amenities.length, amenityRange) +
        0.25 * down(comparableRate(p), rateRange) +
        0.20 * down(avgDistance(p), distanceRange);

    const pickBy = (fn, prefer) =>
        shown.reduce((winner, p) =>
            prefer === "max" ? (fn(p) > fn(winner) ? p : winner) : (fn(p) < fn(winner) ? p : winner)
        );

    const overall = pickBy(score, "max");
    const value = pickBy(comparableRate, "min");
    const location = pickBy(avgDistance, "min");
    const cheapest = pickBy((p) => p.price, "min");
    const largest = pickBy((p) => p.builtUp, "max");

    const spaceLine = (p) => {
        if (p.builtUp > 0) {
            return `Spacious ${p.bhk ? `${p.bhk} BHK ` : ""}${p.propertyType.toLowerCase()} with ${inr(p.builtUp)} sq.ft built-up area${p.land ? ` and ${p.land} cent land` : ""}.`;
        }
        if (p.land) {
            return `Prime ${p.land} cent ${p.propertyType.toLowerCase()} with strong development potential.`;
        }
        return `Well-positioned ${p.propertyType.toLowerCase()} in ${p.area}.`;
    };
    const amenityLine = (p) => {
        const visible = p.amenities.slice(0, 3).join(", ").toLowerCase();
        const remaining = Math.max(p.amenities.length - 3, 0);
        return remaining > 0
            ? `Amenities include ${visible} and ${remaining} more.`
            : `Amenities include ${visible}.`;
    };

    return [
        {
            tone: "overall",
            Icon: RiStarFill,
            kicker: "Best Overall",
            property: overall,
            blurb: `Ideal for buyers looking for a ${overall.propertyType.toLowerCase()} in a well-connected neighbourhood. Offers the best balance of space, amenities, price and future value.`,
            reasonTitle: "Why it's the best overall?",
            reasons: [
                spaceLine(overall),
                `Prime location in ${overall.area} with strong connectivity across Kochi.`,
                amenityLine(overall),
                `Possession in ${overall.possession} for a modern living experience.`,
                pricePerSqft(overall)
                    ? `Works out at ₹${inr(pricePerSqft(overall))} per sq.ft across the compared options.`
                    : `Pricing is listed as ${overall.priceLabel}.`,
            ],
            bestForIcon: RiHome5Line,
            bestFor: "Families looking for space, privacy, and a premium lifestyle.",
        },
        {
            tone: "value",
            Icon: RiStarFill,
            kicker: "Best Value for Money",
            property: value,
            blurb: `Perfect for buyers after the most floor area per rupee. Great for end-users and investors alike.`,
            reasonTitle: "Why it's the best value?",
            reasons: [
                pricePerSqft(value)
                    ? `Lowest rate of the compared options at ₹${inr(pricePerSqft(value))} per sq.ft.`
                    : `Best comparable value from the available price and land details.`,
                value.id === cheapest.id
                    ? `Also the lowest total price at ${value.priceLabel}.`
                    : `Total price of ${value.priceLabel} for ${inr(value.builtUp)} sq.ft.`,
                `Located in ${value.area}, with the metro ${value.metro} km away.`,
                amenityLine(value),
                `Possession in ${value.possession}.`,
            ],
            bestForIcon: RiGroupLine,
            bestFor: "Budget-conscious buyers and investors seeking high returns.",
        },
        {
            tone: "location",
            Icon: RiMapPin2Line,
            kicker: "Best for Location",
            property: location,
            blurb: `Perfect for those who put connectivity first. Closest on average to the metro, airport and hospitals of everything compared here.`,
            reasonTitle: "Why it's the best for location?",
            reasons: [
                `Located in ${location.area} — among Kochi's best connected pockets.`,
                `Metro ${location.metro} km, airport ${location.airport} km, hospital ${location.hospital} km.`,
                spaceLine(location),
                location.id === largest.id
                    ? `The largest home compared, at ${inr(location.builtUp)} sq.ft.`
                    : `Close to schools, hospitals, shopping and IT parks.`,
                amenityLine(location),
            ],
            bestForIcon: RiMapPinRangeLine,
            bestFor: "Buyers who prioritize location, convenience, and long-term value.",
        },
    ];
}

/* Pale skyline behind the page title, drawn inline so the page ships no assets. */
function HeaderArt() {
    return (
        <svg className={styles.headerArt} viewBox="0 0 460 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g fill="#e7eefb">
                <ellipse cx="120" cy="44" rx="46" ry="17" />
                <ellipse cx="152" cy="34" rx="30" ry="14" />
                <ellipse cx="352" cy="38" rx="38" ry="15" />
            </g>
            <g fill="#dbe6f7">
                <rect x="40" y="118" width="86" height="62" rx="3" />
                <path d="M36 120 83 88 130 120Z" />
            </g>
            <g fill="#c9d9f2">
                <rect x="150" y="86" width="120" height="94" rx="3" />
                <path d="M144 88 210 44 276 88Z" />
            </g>
            <g fill="#ffffff">
                <rect x="176" y="108" width="30" height="34" rx="2" />
                <rect x="216" y="108" width="30" height="34" rx="2" />
                <rect x="196" y="152" width="28" height="28" rx="2" />
            </g>
            <g fill="#dbe6f7">
                <rect x="286" y="104" width="104" height="76" rx="3" />
                <path d="M280 106 338 66 396 106Z" />
            </g>
            <g fill="#ffffff">
                <rect x="306" y="124" width="26" height="26" rx="2" />
                <rect x="344" y="124" width="26" height="26" rx="2" />
            </g>
            <g fill="#cfdef4">
                <circle cx="410" cy="150" r="17" />
                <rect x="407" y="150" width="6" height="30" />
                <circle cx="22" cy="156" r="13" />
                <rect x="19" y="156" width="5" height="24" />
            </g>
            <rect x="0" y="178" width="460" height="3" rx="1.5" fill="#c9d9f2" />
        </svg>
    );
}

function CompareView() {
    const searchParams = useSearchParams();

    /* ?ids=KP1,KP2 narrows the set when arriving from Favorites; a direct visit
       compares everything on the shortlist. */
    const requested = (searchParams.get("ids") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    const [removed, setRemoved] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const shareButtonRef = useRef(null);
    const requestedKey = requested.join(",");

    useEffect(() => {
        const onCompareReload = () => setReloadKey((k) => k + 1);
        window.addEventListener("kp:compare-reload", onCompareReload);
        return () => window.removeEventListener("kp:compare-reload", onCompareReload);
    }, []);

    useEffect(() => {
        let alive = true;

        const loadProperties = async () => {
            let ids = requestedKey.split(",").map((v) => v.trim()).filter(Boolean);
            setRemoved([]);
            setLoadError("");

            if (ids.length === 0) {
                try {
                    const stored = getSnapshot()?.list || [];
                    ids = stored.map((p) => p.id).filter(Boolean);
                } catch {}
            }

            if (ids.length === 0) {
                setProperties([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const results = await Promise.allSettled(
                    ids.map(async (rawId) => {
                        const cleanId = String(rawId || "").replace(/^kp/i, "").trim() || rawId;
                        const response = await propertyApi.show(cleanId);
                        if (!response?.success || !response?.data) {
                            throw new Error(response?.message || `Property ${rawId} not found`);
                        }
                        return normalizeCompareProperty(response.data);
                    })
                );

                if (!alive) return;

                const loaded = results
                    .filter((result) => result.status === "fulfilled")
                    .map((result) => result.value);

                setProperties(loaded);
                setLoadError(loaded.length === 0 ? "We couldn't find those properties." : "");
            } catch (error) {
                if (!alive) return;
                setProperties([]);
                setLoadError(error?.response?.data?.message || "Unable to load selected properties.");
            } finally {
                if (alive) setIsLoading(false);
            }
        };

        loadProperties();

        return () => {
            alive = false;
        };
    }, [requestedKey, reloadKey]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (shareButtonRef.current && !shareButtonRef.current.contains(e.target)) {
                setShareMenuOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const shown = properties.filter((p) => !removed.includes(p.id));
    const awards = buildAwards(shown);

    const getShareUrl = () => {
        if (typeof window === "undefined") return "";
        const ids = shown.map((p) => p.id).join(",");
        return `${window.location.origin}${window.location.pathname}?ids=${ids}`;
    };

    const handleShareWhatsApp = () => {
        const shareText = `Check out this property comparison on KeralaPlots:\n${getShareUrl()}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
        setShareMenuOpen(false);
    };

    const handleCopyShareLink = () => {
        navigator.clipboard.writeText(getShareUrl())
            .then(() => triggerToast("Comparison link copied to clipboard!"))
            .catch(() => triggerToast("Failed to copy link."));
        setShareMenuOpen(false);
    };

    const columnIcon = (p) => (p.propertyType === "Villa" || p.propertyType === "Plot" ? RiHome5Line : RiBuilding2Line);

    return (
        <>
            <Nav />

            <main className={styles.page}>
                <div className={styles.container}>
                    {/* ---- Header --------------------------------------------------- */}
                    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                        <Link href="/">Home</Link>
                        <RiArrowRightSLine aria-hidden="true" />
                        <Link href="/favorites">Favorites</Link>
                        <RiArrowRightSLine aria-hidden="true" />
                        <span aria-current="page">Compare Properties</span>
                    </nav>

                    <header className={styles.header}>
                        <div className={styles.headerText}>
                            <h1 className={styles.title}>Compare Properties</h1>
                            <p className={styles.subtitle}>
                                Compare the features, price and key details side by side
                                <br />
                                to find the perfect property for you.
                            </p>

                            {shown.length > 0 && (
                                <div className={styles.shareSection}>
                                    <div className={styles.shareWrapper} ref={shareButtonRef}>
                                        <button
                                            type="button"
                                            className={styles.shareBtn}
                                            onClick={() => setShareMenuOpen((prev) => !prev)}
                                            aria-label="Share comparison"
                                            title="Share comparison"
                                        >
                                            <RiShareForwardLine />
                                            <span>Share Comparison</span>
                                        </button>

                                        {shareMenuOpen && (
                                            <div className={styles.shareTooltip}>
                                                <button
                                                    type="button"
                                                    className={styles.shareTooltipLink}
                                                    onClick={handleShareWhatsApp}
                                                >
                                                    <RiWhatsappLine className={styles.shareTooltipIcon} style={{ color: "#25D366" }} />
                                                    <span>WhatsApp</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.shareTooltipLink}
                                                    onClick={handleCopyShareLink}
                                                >
                                                    <RiFileCopyLine className={styles.shareTooltipIcon} />
                                                    <span>Copy Link</span>
                                                </button>
                                                <div className={styles.shareTooltipArrow}></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <HeaderArt />
                    </header>

                    {isLoading ? (
                        <section className={styles.emptyPanel}>
                            <span className={styles.emptyIcon}>
                                <RiScales3Line aria-hidden="true" />
                            </span>
                            <h2 className={styles.emptyTitle}>Loading selected properties</h2>
                            <p className={styles.emptyText}>Fetching the latest property details for your comparison.</p>
                        </section>
                    ) : shown.length === 0 ? (
                        <section className={styles.emptyPanel}>
                            <span className={styles.emptyIcon}>
                                <RiScales3Line aria-hidden="true" />
                            </span>
                            <h2 className={styles.emptyTitle}>
                                {loadError || properties.length === 0 ? "We couldn't find those properties" : "Nothing left to compare"}
                            </h2>
                            <p className={styles.emptyText}>
                                {loadError || properties.length === 0
                                    ? "The selected property IDs don't match active listings in the system. Pick properties from your favorites to compare again."
                                    : "You\u2019ve removed every property from this comparison. Pick some from your favorites to start again."}
                            </p>
                            <div className={styles.emptyActions}>
                                <Link href="/favorites" className={styles.primaryBtn}>Go to Favorites</Link>
                                {properties.length === 0 ? (
                                    <button type="button" className={styles.ghostBtn} onClick={() => setReloadKey((k) => k + 1)}>
                                        Try Again
                                    </button>
                                ) : (
                                    <button type="button" className={styles.ghostBtn} onClick={() => setRemoved([])}>
                                        Restore comparison
                                    </button>
                                )}
                            </div>
                        </section>
                    ) : (
                        <>
                            {/* ---- Property cards --------------------------------------- */}
                            <section className={styles.cardsPanel}>
                                <div className={styles.cardsRow} data-count={shown.length}>
                                    {shown.map((p) => (
                                        <article key={p.id} className={styles.propCard}>
                                            <button
                                                type="button"
                                                className={styles.removeBtn}
                                                onClick={() => setRemoved((prev) => [...prev, p.id])}
                                                aria-label={`Remove ${p.title} from comparison`}
                                                title="Remove from comparison"
                                            >
                                                <RiCloseLine aria-hidden="true" />
                                            </button>
                                            <div className={styles.propImageWrap}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img loading="lazy" decoding="async" src={p.image} alt={p.title} className={styles.propImage} onError={handlePropertyImageError} />
                                            </div>

                                            <div className={styles.propBody}>
                                                <div className={styles.propTitleRow}>
                                                    <h2 className={styles.propTitle}>
                                                        <Link href={`/properties/${p.slug}`}>{p.title}</Link>
                                                    </h2>
                                                    <span className={styles.saleBadge}>{p.badge}</span>
                                                </div>

                                                <p className={styles.propLocation}>
                                                    <RiMapPin2Line aria-hidden="true" />
                                                    {p.location}
                                                </p>
                                                <p className={styles.propId}>ID: {p.code || p.id}</p>

                                                <div className={styles.propPriceRow}>
                                                    <span className={styles.propPrice}>{p.priceLabel}</span>
                                                    <span className={styles.propType}>{p.summaryType}</span>
                                                </div>

                                                <p className={styles.propPossession}>
                                                    <RiCalendarLine aria-hidden="true" />
                                                    Possession: {p.possession}
                                                </p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            {/* ---- Comparison table ------------------------------------- */}
                            <section className={styles.tablePanel}>
                                <div className={styles.tableScroll}>
                                    <table className={styles.table}>
                                        <caption className={styles.srOnly}>
                                            Feature by feature comparison of {shown.length} properties
                                        </caption>
                                        <thead>
                                            <tr>
                                                <th scope="col" className={styles.featuresHead}>
                                                    <span className={styles.featuresHeadInner}>
                                                        <RiListCheck aria-hidden="true" />
                                                        Features
                                                    </span>
                                                </th>
                                                {shown.map((p, index) => {
                                                    const Icon = columnIcon(p);
                                                    return (
                                                        <th scope="col" key={p.id} className={styles.propHead}>
                                                            <span className={styles.propHeadInner}>
                                                                <Icon className={styles.propHeadIcon} aria-hidden="true" />
                                                                <span>
                                                                    <span className={styles.propHeadLabel}>Property {index + 1}</span>
                                                                    <span className={styles.propHeadName}>{p.title}</span>
                                                                </span>
                                                            </span>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {ROWS.map((row) => (
                                                <tr key={row.key}>
                                                    <th scope="row" className={styles.rowLabel}>{row.label}</th>

                                                    {shown.map((p) => {
                                                        if (row.key === "amenities") {
                                                            const isOpen = !!expanded[p.id];
                                                            const visible = isOpen ? p.amenities : p.amenities.slice(0, 5);
                                                            const hidden = p.amenities.length - 5;
                                                            return (
                                                                <td key={p.id} className={styles.cell}>
                                                                    <span className={styles.amenityHead}>
                                                                        <Mark mark={markFor(row, p, shown)} />
                                                                        {p.amenities.length} amenities
                                                                    </span>
                                                                    <span className={styles.amenityList}>{visible.join(", ")}</span>
                                                                    {hidden > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            className={styles.amenityMore}
                                                                            onClick={() =>
                                                                                setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                                                                            }
                                                                            aria-expanded={isOpen}
                                                                        >
                                                                            {isOpen ? "Show less" : `+${hidden} more`}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        }

                                                        return (
                                                            <td key={p.id} className={styles.cell}>
                                                                <span className={styles.cellInner}>
                                                                    <Mark mark={markFor(row, p, shown)} />
                                                                    {row.text(p)}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {shown.length > 1 && (
                                    <p className={styles.legend}>
                                        <span><RiCheckboxCircleFill className={styles.markBest} aria-hidden="true" /> Best of the compared</span>
                                        <span><RiIndeterminateCircleFill className={styles.markMid} aria-hidden="true" /> In between</span>
                                        <span><RiIndeterminateCircleFill className={styles.markWorst} aria-hidden="true" /> Weakest of the compared</span>
                                    </p>
                                )}
                            </section>

                            {/* ---- Which one is better? --------------------------------- */}
                            {awards.length > 0 ? (
                                <section className={styles.verdictPanel}>
                                    <h2 className={styles.verdictTitle}>Which one is better?</h2>

                                    <div className={styles.verdictGrid}>
                                        {awards.map((award) => (
                                            <article
                                                key={award.kicker}
                                                className={`${styles.verdictCard} ${styles[award.tone]}`}
                                            >
                                                <header className={styles.verdictHead}>
                                                    <span className={styles.verdictIcon}>
                                                        <award.Icon aria-hidden="true" />
                                                    </span>
                                                    <span>
                                                        <span className={styles.verdictKicker}>{award.kicker}</span>
                                                        <span className={styles.verdictName}>{award.property.title}</span>
                                                    </span>
                                                </header>

                                                <p className={styles.verdictBlurb}>{award.blurb}</p>

                                                <h3 className={styles.verdictReasonTitle}>{award.reasonTitle}</h3>
                                                <ul className={styles.verdictReasons}>
                                                    {award.reasons.map((reason) => (
                                                        <li key={reason}>
                                                            <RiCheckLine aria-hidden="true" />
                                                            <span>{reason}</span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                <footer className={styles.bestFor}>
                                                    <span className={styles.bestForIcon}>
                                                        <award.bestForIcon aria-hidden="true" />
                                                    </span>
                                                    <span>
                                                        <span className={styles.bestForLabel}>Best for</span>
                                                        <span className={styles.bestForText}>{award.bestFor}</span>
                                                    </span>
                                                </footer>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            ) : (
                                <p className={styles.needTwo}>
                                    Keep at least two properties side by side to see which one comes out ahead.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </main>

            <Footer />

            {toastMessage && (
                <div className={styles.toast} role="status">
                    {toastMessage}
                </div>
            )}
        </>
    );
}

export default function ComparePage() {
    return (
        <Suspense fallback={null}>
            <CompareView />
        </Suspense>
    );
}
