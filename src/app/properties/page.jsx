"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../componants/nav/nav";
import PropertiesBanner from "../componants/propertiesBanner/propertiesBanner";
import styles from "./properties.module.css";
import "./leafletMap.css";
import PropertyIdBadge, { PropertyBadgeRow } from "../componants/propertyIdBadge/PropertyIdBadge";
import PropertyIdSearch from "./PropertyIdSearch";
import { getPropertyCode } from "../lib/propertyCode";
import { RiRefreshLine, RiHome4Line, RiMapPinLine, RiSearchLine, RiCompass3Line, RiUserLine } from "react-icons/ri";
import { propertyApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getPropertyUrl } from "../lib/seoHelper";
import { getLoginRedirectUrl } from "../lib/authRedirect";
import dynamic from "next/dynamic";
import { preloadWhenIdle } from "../lib/preloadWhenIdle";

/* The AI search popup only appear after a click, so they load as separate
   chunks (fetched in the background once the page is idle). */
const loadPropertiesAiSearchModal = () => import("./PropertiesAiSearchModal");
const PropertiesAiSearchModal = dynamic(loadPropertiesAiSearchModal, { ssr: false });

/* Bands are half-open (min inclusive, max exclusive) so a price on a boundary
   lands in exactly one of them. */
const PRICE_BANDS = [
    { id: "under25", label: "Under ₹25 Lakh", min: 0, max: 2500000 },
    { id: "25to50", label: "₹25 - ₹50 Lakh", min: 2500000, max: 5000000 },
    { id: "50to100", label: "₹50 Lakh - ₹1 Crore", min: 5000000, max: 10000000 },
    { id: "100to200", label: "₹1 - ₹2 Crore", min: 10000000, max: 20000000 },
    { id: "above200", label: "Above ₹2 Crore", min: 20000000, max: Infinity },
];

/* Mutually exclusive, so these are radios rather than checkboxes. */
const POSTED_OPTIONS = [
    { id: "any", label: "Anytime" },
    { id: "1", label: "Last 24 hours" },
    { id: "7", label: "Last 7 days" },
    { id: "30", label: "Last 30 days" },
];

const OWNERSHIP_TYPES = ["Freehold", "Leasehold", "Co-operative Society", "Power of Attorney"];

export const KERALA_CENTER = [10.3528, 76.5120];
export const KERALA_DEFAULT_ZOOM = 7.8;

export const KERALA_DISTRICTS = [
    { name: "All Kerala", lat: 10.3528, lng: 76.5120, zoom: 7.8, label: "All Kerala (Overview)" },
    { name: "Ernakulam", lat: 9.9816, lng: 76.2999, zoom: 11.5, label: "Kochi / Ernakulam" },
    { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366, zoom: 11.5, label: "Thiruvananthapuram" },
    { name: "Thrissur", lat: 10.5276, lng: 76.2144, zoom: 11.5, label: "Thrissur" },
    { name: "Kozhikode", lat: 11.2588, lng: 75.7804, zoom: 11.5, label: "Kozhikode" },
    { name: "Palakkad", lat: 10.7867, lng: 76.6548, zoom: 11.5, label: "Palakkad" },
    { name: "Kottayam", lat: 9.5916, lng: 76.5222, zoom: 11.5, label: "Kottayam" },
    { name: "Alappuzha", lat: 9.4981, lng: 76.3388, zoom: 11.5, label: "Alappuzha" },
    { name: "Kannur", lat: 11.8745, lng: 75.3704, zoom: 11.5, label: "Kannur" },
    { name: "Kollam", lat: 8.8932, lng: 76.6141, zoom: 11.5, label: "Kollam" },
    { name: "Malappuram", lat: 11.0732, lng: 76.0740, zoom: 11.5, label: "Malappuram" },
    { name: "Wayanad", lat: 11.6103, lng: 76.0827, zoom: 11, label: "Wayanad" },
    { name: "Idukki", lat: 9.8494, lng: 76.9804, zoom: 10.5, label: "Idukki" },
    { name: "Kasaragod", lat: 12.5102, lng: 74.9852, zoom: 11, label: "Kasaragod" },
    { name: "Pathanamthitta", lat: 9.2648, lng: 76.7870, zoom: 11, label: "Pathanamthitta" },
];

/* "Kakkanad, Kochi, Kerala" -> "Kochi"; "Kottayam, Kerala" -> "Kottayam".
   The district is the segment before the state, so the options can be derived
   from the listings instead of hardcoded and drifting out of sync. */
function districtOf(location) {
    if (!location) return "";
    const parts = location.split(",").map((part) => part.trim());
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

function formatPriceValue(value, fallback = "Price on request") {
    const price = Number(value || 0);
    return price > 0 ? `₹${price.toLocaleString("en-IN")}` : fallback;
}

function getDistrictFallbackCoords(district, city, locality) {
    const raw = [locality, city, district].filter(Boolean).join(" ").toLowerCase();

    // Direct district alias matching
    if (raw.includes("alleppey") || raw.includes("alappuzha")) return { lat: 9.4981, lng: 76.3388 };
    if (raw.includes("kasargod") || raw.includes("kasaragod")) return { lat: 12.5102, lng: 74.9852 };
    if (raw.includes("trivandrum") || raw.includes("thiruvananthapuram")) return { lat: 8.5241, lng: 76.9366 };
    if (raw.includes("calicut") || raw.includes("kozhikode")) return { lat: 11.2588, lng: 75.7804 };
    if (raw.includes("palghat") || raw.includes("palakkad")) return { lat: 10.7867, lng: 76.6548 };
    if (raw.includes("trichur") || raw.includes("thrissur")) return { lat: 10.5276, lng: 76.2144 };
    if (raw.includes("quilon") || raw.includes("kollam")) return { lat: 8.8932, lng: 76.6141 };
    if (raw.includes("wynad") || raw.includes("wayanad")) return { lat: 11.6103, lng: 76.0827 };
    if (raw.includes("kottayam")) return { lat: 9.5916, lng: 76.5222 };
    if (raw.includes("malappuram")) return { lat: 11.0732, lng: 76.0740 };
    if (raw.includes("idukki")) return { lat: 9.8494, lng: 76.9804 };
    if (raw.includes("pathanamthitta")) return { lat: 9.2648, lng: 76.7870 };
    if (raw.includes("kannur") || raw.includes("cannanore")) return { lat: 11.8745, lng: 75.3704 };
    if (raw.includes("angamaly") || raw.includes("kakkanad") || raw.includes("aluva") || raw.includes("kochi") || raw.includes("cochin") || raw.includes("ernakulam")) {
        return { lat: 9.9816, lng: 76.2999 };
    }

    for (const d of KERALA_DISTRICTS) {
        if (d.name === "All Kerala") continue;
        if (raw.includes(d.name.toLowerCase())) {
            return { lat: d.lat, lng: d.lng };
        }
    }

    return { lat: 10.0159, lng: 76.3419 };
}

function formatPropertyImgUrl(raw) {
    if (!raw) return "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public";
    const str = String(raw).trim();
    if (str.startsWith("http://") || str.startsWith("https://")) {
        return str;
    }
    if (str === "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public" || str === "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public") {
        return "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public";
    }
    if (str.includes("KeralaPlots-Image-") || str.endsWith(".webp")) {
        const fname = str.split("/").pop();
        return `https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImageLow/${fname}`;
    }
    if (str.startsWith("/uploads/") || str.startsWith("uploads/")) {
        return `https://keralaplots.com/${str.replace(/^\/+/, "")}`;
    }
    return `https://keralaplots.com/uploads/properties/images/${str.replace(/^\/+/, "")}`;
}

function handleImageError(e) {
    const currentSrc = e.currentTarget.src || "";
    const filename = currentSrc.split("/").pop() || "";
    if (filename.includes("KeralaPlots-") || filename.endsWith(".webp")) {
        if (!currentSrc.includes("PropertyImageLow")) {
            e.currentTarget.src = `https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImageLow/${filename}`;
            return;
        }
    } else if (filename && !currentSrc.includes("/uploads/properties/images/") && !filename.includes("https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public")) {
        e.currentTarget.src = `https://keralaplots.com/uploads/properties/images/${filename}`;
        return;
    }
    e.currentTarget.src = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public";
}

function formatAddedDate(rawDate) {
    if (!rawDate) return "";
    const str = String(rawDate).trim();
    if (!str) return "";

    // Match DD-MM-YYYY or DD/MM/YYYY or DD-MM-YYYY HH:mm:ss
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }

    return str;
}

function normalizeProperty(apiProperty) {
    const listingType = apiProperty.listing_type || apiProperty.action || "buy";
    const image = formatPropertyImgUrl(apiProperty.image || apiProperty.cover_image);
    const location = apiProperty.location_label || [apiProperty.locality, apiProperty.city, apiProperty.district].filter(Boolean).join(", ");
    let propertyType = apiProperty.property_type || apiProperty.type || "Residential House";
    if (propertyType.toLowerCase().includes("house / villa") || propertyType.toLowerCase().includes("house/villa")) {
        const titleLower = (apiProperty.title || "").toLowerCase();
        if (titleLower.includes("villa") && !titleLower.includes("house")) {
            propertyType = "Residential Villa";
        } else if (titleLower.includes("house") && !titleLower.includes("villa")) {
            propertyType = "Residential House";
        }
    }
    const fallbackCoords = getDistrictFallbackCoords(apiProperty.district, apiProperty.city, apiProperty.locality);
    const lat = apiProperty.latitude && Number(apiProperty.latitude) !== 0 ? Number(apiProperty.latitude) : fallbackCoords.lat;
    const lng = apiProperty.longitude && Number(apiProperty.longitude) !== 0 ? Number(apiProperty.longitude) : fallbackCoords.lng;
    const addedDateFormatted = formatAddedDate(apiProperty.added_date || apiProperty.addedDate || apiProperty.created_at || apiProperty.added_date_time);

    return {
        id: apiProperty.id,
        login_id: apiProperty.login_id || apiProperty.owner?.id,
        is_owner: !!apiProperty.is_owner,
        owner: apiProperty.owner,
        title: apiProperty.title || `${propertyType} in ${apiProperty.locality || apiProperty.city || "Kerala"}`,
        location: location || "Kerala",
        price: apiProperty.price_formatted || formatPriceValue(apiProperty.price, apiProperty.price_range),
        priceNum: Number(apiProperty.price || apiProperty.price_sort || 0),
        purpose: listingType === "sell" || listingType === "sale" ? "buy" : listingType,
        category: propertyType,
        badge: listingType === "rent" ? "For Rent" : listingType === "lease" ? "For Lease" : "For Sale",
        badgeType: "sale",
        beds: apiProperty.bedrooms ? `${apiProperty.bedrooms} Beds` : "",
        baths: apiProperty.bathrooms ? `${apiProperty.bathrooms} Baths` : "",
        area: (() => {
            let a = apiProperty.area || "";
            if (!a || a === "1 Sq Ft" || a === "N/A") {
                const text = `${apiProperty.title || ""} ${apiProperty.description || ""}`;
                const mCent = text.match(/(\d+(?:\.\d+)?)\s*(?:cent|cents)\b/i);
                const mAcre = text.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres)\b/i);
                const mSqft = text.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:sq\s*ft|sqft|sq-ft)\b/i);
                if (mCent) return `${mCent[1]} Cent`;
                if (mAcre) return `${mAcre[1]} Acre`;
                if (mSqft) return `${mSqft[1]} Sq Ft`;
            }
            return a;
        })(),
        type: propertyType,
        facing: apiProperty.facing || "",
        image,
        lat,
        lng,
        postedDaysAgo: 0,
        ownership: apiProperty.ownership || "Freehold",
        isSaved: !!apiProperty.is_saved,
        views: apiProperty.views || 0,
        addedDate: addedDateFormatted,
        code: getPropertyCode(apiProperty),
    };
}

const PURPOSE_LABELS = { buy: "Buy", rent: "Rent", lease: "Lease" };

const TYPE_GROUPS = [
    { group: "Residential", options: ["Residential Apartment", "Residential House", "Residential Villa", "Residential Land"] },
    { group: "Commercial", options: ["Commercial Shop", "Commercial Office", "Commercial Land", "Commercial Building", "Commercial Other"] },
    { group: "Industrial", options: ["Industrial Building", "Industrial Land"] },
    { group: "Agricultural", options: ["Agricultural Land"] },
];

const ALL_TYPE_OPTIONS = TYPE_GROUPS.flatMap((g) => g.options);

const activeKeysOf = (map) => Object.keys(map).filter((key) => map[key]);

/* One matcher per category. The result list and the per-option counts both run
   through these, so the two can never drift apart. */
const MATCHERS = {
    purpose: (item, sel) => {
        const keys = activeKeysOf(sel);
        return keys.length === 0 || keys.includes(item.purpose);
    },
    type: (item, sel) => {
        const keys = activeKeysOf(sel);
        if (keys.length === 0) return true;
        const itemCat = (item.category || item.type || "").toLowerCase();
        return keys.some((k) => {
            const kLower = k.toLowerCase();
            const isVillaFilter = kLower.includes("villa");
            const isHouseFilter = (kLower.includes("house") || kLower.includes("home")) && !isVillaFilter;

            if (isVillaFilter) {
                return itemCat.includes("villa");
            }
            if (isHouseFilter) {
                return (itemCat.includes("house") || itemCat.includes("home")) && (!itemCat.includes("villa") || itemCat.includes("house"));
            }

            return (
                itemCat.includes(kLower) ||
                kLower.includes(itemCat) ||
                (kLower.includes("apartment") && (itemCat.includes("apartment") || itemCat.includes("flat"))) ||
                (kLower.includes("land") && (itemCat.includes("land") || itemCat.includes("plot"))) ||
                (kLower.includes("plot") && (itemCat.includes("land") || itemCat.includes("plot"))) ||
                (kLower.includes("commercial") && itemCat.includes("commercial")) ||
                (kLower.includes("other") && (itemCat.includes("other") || itemCat.includes("others")))
            );
        });
    },
    location: (item, sel) => {
        const keys = activeKeysOf(sel);
        if (keys.length === 0) return true;
        const itemLoc = (item.location || "").toLowerCase();
        return keys.some((k) => {
            const kLower = k.toLowerCase();
            if (kLower === "all kerala") return true;
            if (kLower === "kochi" || kLower === "ernakulam") {
                return itemLoc.includes("kochi") || itemLoc.includes("ernakulam");
            }
            return itemLoc.includes(kLower);
        });
    },
    price: (item, sel) => {
        const bands = PRICE_BANDS.filter((band) => sel[band.id]);
        return bands.length === 0 || bands.some((band) => item.priceNum >= band.min && item.priceNum < band.max);
    },
    posted: (item, sel) => sel === "any" || item.postedDaysAgo <= Number(sel),
    ownership: (item, sel) => {
        const keys = activeKeysOf(sel);
        return keys.length === 0 || keys.includes(item.ownership);
    },
    search: (item, sel) => {
        const term = sel.trim().toLowerCase();
        if (!term) return true;

        // Strip stop words
        const stopWords = ["i", "want", "to", "buy", "rent", "lease", "a", "an", "the", "in", "for", "property", "looking"];
        const words = term.split(/\s+/).filter((w) => w.length > 1 && !stopWords.includes(w));
        if (words.length === 0) return true;

        const fullItemText = `${item.title} ${item.location} ${item.category} ${item.type} ${item.purpose}`.toLowerCase();
        return words.every((w) => {
            const stem = w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w;
            const aliases = [w, stem];
            if (w === "kochi" || w === "cochin") aliases.push("ernakulam");
            if (w === "ernakulam") aliases.push("kochi");
            if (w === "calicut") aliases.push("kozhikode");
            if (w === "trivandrum") aliases.push("thiruvananthapuram");
            if (w === "flat" || w === "flats") aliases.push("apartment");
            if (w === "apartment" || w === "apartments") aliases.push("flat");
            if (w === "land") aliases.push("plot");
            if (w === "plot" || w === "plots") aliases.push("land");

            return aliases.some((alias) => fullItemText.includes(alias));
        });
    },
};

/* One option row. An option that would return nothing is dimmed and disabled
   rather than hidden, so the list stays stable while you work through it. */
function FilterOption({ type = "checkbox", name, label, count, checked, onChange }) {
    const disabled = count === 0 && !checked;

    return (
        <label className={`${styles.optionRow} ${disabled ? styles.optionRowDisabled : ""}`}>
            <input
                type={type}
                name={name}
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className={styles.optionInput}
            />
            <span className={styles.optionBox} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </span>
            <span className={styles.optionLabel}>{label}</span>
            <span className={styles.optionCount}>{count}</span>
        </label>
    );
}

/* Accordion header with the count of what is active inside it, so a collapsed
   section still tells you it is filtering. */
function SectionHeader({ title, isOpen, activeCount, onToggle }) {
    return (
        <button
            type="button"
            className={styles.accordionHeader}
            onClick={onToggle}
            aria-expanded={isOpen}
        >
            <span className={styles.accordionTitle}>
                {title}
                {activeCount > 0 && <span className={styles.sectionBadge}>{activeCount}</span>}
            </span>
            <span className={`${styles.accordionChevron} ${isOpen ? styles.accordionChevronOpen : ""}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </span>
        </button>
    );
}

function NoPropertiesFoundArt() {
    return (
        <svg
            className={styles.noResultsArt}
            viewBox="0 0 520 300"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* hill behind everything */}
            <path d="M120 254c14-56 66-96 128-96s114 40 128 96Z" fill="#f1f3f9" />

            {/* clouds */}
            <g fill="#e8ebf5">
                <circle cx="150" cy="82" r="10" />
                <circle cx="164" cy="75" r="13" />
                <circle cx="178" cy="82" r="9" />
                <rect x="150" y="81" width="28" height="10" rx="5" />

                <circle cx="362" cy="62" r="11" />
                <circle cx="378" cy="54" r="15" />
                <circle cx="394" cy="62" r="10" />
                <rect x="362" y="61" width="32" height="11" rx="5.5" />
            </g>

            {/* tree 1 (left) */}
            <path d="M164 254v-52" stroke="#c3cadf" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M164 214l-12-11M164 226l12-11" stroke="#c3cadf" strokeWidth="3" strokeLinecap="round" />
            <path d="M164 156c18 0 30 14 30 30s-12 28-30 28-30-12-30-28 12-30 30-30Z" fill="#e9ecf6" stroke="#c3cadf" strokeWidth="3" />

            {/* tree 2 (right) */}
            <path d="M364 254v-52" stroke="#c3cadf" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M364 214l-12-11M364 226l12-11" stroke="#c3cadf" strokeWidth="3" strokeLinecap="round" />
            <path d="M364 156c18 0 30 14 30 30s-12 28-30 28-30-12-30-28 12-30 30-30Z" fill="#e9ecf6" stroke="#c3cadf" strokeWidth="3" />

            {/* property document sheet in background */}
            <rect x="210" y="55" width="100" height="146" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3.5" />

            {/* house sketch on the document */}
            <path d="M235 106 l25 -20 l25 20 Z" fill="none" stroke="#cbd5e1" strokeWidth="3.5" strokeLinejoin="round" />
            <rect x="242" y="106" width="36" height="28" fill="none" stroke="#cbd5e1" strokeWidth="3.5" strokeLinejoin="round" />
            <rect x="254" y="118" width="12" height="16" fill="none" stroke="#cbd5e1" strokeWidth="3" />

            {/* lines under house */}
            <line x1="226" y1="152" x2="294" y2="152" stroke="#e8ebf5" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="226" y1="166" x2="274" y2="166" stroke="#e8ebf5" strokeWidth="4.5" strokeLinecap="round" />

            {/* magnifying glass overlaying document */}
            <circle cx="292" cy="186" r="24" fill="#ffffff" stroke="#12296b" strokeWidth="4.5" />
            <line x1="308" y1="202" x2="326" y2="220" stroke="#12296b" strokeWidth="6" strokeLinecap="round" />

            {/* X inside magnifying glass lens */}
            <line x1="284" y1="178" x2="300" y2="194" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="300" y1="178" x2="284" y2="194" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" />

            {/* ground */}
            <path d="M108 255h304" stroke="#c9cfe4" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
    );
}

export default function PropertiesPage() {
    useEffect(() => preloadWhenIdle([loadPropertiesAiSearchModal]), []);

    const router = useRouter();
    const { user: currentUser } = useAuth();
    const currentLoginId = currentUser?.loginId || currentUser?.id || currentUser?.login_id;

    // View mode state: "grid" or "list"
    const [viewMode, setViewMode] = useState("grid");

    // Sort By state
    const [sortBy, setSortBy] = useState("newest");

    // Search Assistant state
    const [searchTerm, setSearchTerm] = useState("");

    // Favorites state: array of saved property IDs
    const [favorites, setFavorites] = useState([1, 3]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Smooth filter loading state
    const [isFiltering, setIsFiltering] = useState(true);

    // AI Search Modal open state
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Map View toggled state
    const [showMap, setShowMap] = useState(false);

    // Active property highlighted on the map popup details
    const [selectedMapPropertyId, setSelectedMapPropertyId] = useState(null);

    // Accordion Expand/Collapse state
    const [openAccordions, setOpenAccordions] = useState({
        purpose: true,
        propertyType: true,
        location: false,
        priceRange: false,
        postedDate: false,
        ownershipType: false,
    });

    // Selected Purpose Filter State
    const [selectedPurpose, setSelectedPurpose] = useState({
        buy: false,
        rent: false,
        lease: false,
    });

    // Selected Property Type Checkboxes State
    const [selectedTypes, setSelectedTypes] = useState({});

    // Selected district checkboxes, keyed by district name
    const [selectedLocations, setSelectedLocations] = useState({});

    // Active district selected in Map View location filter
    const [activeMapDistrict, setActiveMapDistrict] = useState("All Kerala");

    // Narrows the district list only — it never changes what is selected
    const [locationQuery, setLocationQuery] = useState("");

    // Selected price bands, keyed by band id
    const [selectedPriceBands, setSelectedPriceBands] = useState({});

    // Single posted-date window: "any" | "1" | "7" | "30" (days)
    const [postedWithin, setPostedWithin] = useState("any");

    // Selected ownership types, keyed by ownership name
    const [selectedOwnership, setSelectedOwnership] = useState({});

    // Filter by specific user/agent who added properties
    const [filterUserId, setFilterUserId] = useState(null);
    const [filterOwnerName, setFilterOwnerName] = useState("");

    // Mobile filters drawer open state
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    // Tracks narrow viewports so pagination can show fewer page buttons
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 640px)");
        setIsMobile(mq.matches);
        const handleChange = (e) => setIsMobile(e.matches);
        mq.addEventListener("change", handleChange);
        return () => mq.removeEventListener("change", handleChange);
    }, []);

    // Read query parameters from URL or sessionStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            let sessionData = null;
            try {
                const stored = sessionStorage.getItem("kp_search_params");
                if (stored) {
                    sessionData = JSON.parse(stored);
                }
            } catch (err) {
                console.error("Failed to parse stored search params", err);
            }

            const params = new URLSearchParams(window.location.search);
            const query = params.get("query") || params.get("search") || sessionData?.query;
            const purpose = params.get("purpose") || params.get("listing_type") || sessionData?.purpose;
            const loc = params.get("location") || params.get("district") || sessionData?.location;
            const type = params.get("type") || params.get("property_type") || sessionData?.type;
            const bud = params.get("budget") || sessionData?.budget;
            const userIdParam = params.get("user_id") || params.get("loginId") || params.get("login_id") || sessionData?.user_id;
            const ownerNameParam = params.get("owner_name") || params.get("user_name") || params.get("agent_name") || sessionData?.owner_name;

            // Keep URL clean: remove query params from browser address bar
            if (window.location.search) {
                window.history.replaceState({}, "", window.location.pathname);
            }

            if (userIdParam) {
                setFilterUserId(userIdParam);
            }
            if (ownerNameParam) {
                setFilterOwnerName(ownerNameParam);
            }

            if (query && !query.toLowerCase().startsWith("i want to")) {
                setSearchTerm(query);
            }
            if (purpose) {
                const purpKey = purpose.toLowerCase() === "sell" || purpose.toLowerCase() === "sale" ? "buy" : purpose.toLowerCase();
                setSelectedPurpose({
                    buy: purpKey === "buy",
                    rent: purpKey === "rent",
                    lease: purpKey === "lease",
                });
            }
            if (loc) {
                // One district or a comma-separated list (from saved preferences).
                const locs = {};
                loc.split(",").forEach((part) => {
                    const locClean = part.replace(" / Ernakulam", "").trim();
                    if (locClean) locs[locClean] = true;
                });
                setSelectedLocations(locs);
            }
            if (type) {
                // One type or a comma-separated list (from saved preferences).
                const typesToSelect = {};
                type.split(",").map((t) => t.trim()).filter(Boolean).forEach((seg) => {
                    const tLower = seg.toLowerCase();
                    if (tLower.includes("apart")) {
                        typesToSelect["Residential Apartment"] = true;
                    } else if (tLower.includes("villa") && (tLower.includes("house") || tLower.includes("/"))) {
                        typesToSelect["Residential House"] = true;
                        typesToSelect["Residential Villa"] = true;
                    } else if (tLower.includes("villa")) {
                        typesToSelect["Residential Villa"] = true;
                    } else if (tLower.includes("house") || tLower.includes("home")) {
                        typesToSelect["Residential House"] = true;
                    } else if (tLower.includes("plot") || tLower.includes("land")) {
                        typesToSelect["Residential Land"] = true;
                    } else if (tLower.includes("commercial")) {
                        typesToSelect["Commercial Building"] = true;
                        typesToSelect["Commercial Shop"] = true;
                        typesToSelect["Commercial Office"] = true;
                    } else if (tLower.includes("other")) {
                        typesToSelect["Commercial Other"] = true;
                        typesToSelect["Residential Others"] = true;
                    } else {
                        typesToSelect[seg] = true;
                    }
                });
                setSelectedTypes(typesToSelect);
            }
            // Price-band ids, e.g. "50to100,100to200" (from saved preferences)
            const budIds = bud ? bud.split(",").map((b) => b.trim()) : [];
            if (budIds.length && budIds.every((b) => PRICE_BANDS.some((band) => band.id === b))) {
                setSelectedPriceBands(Object.fromEntries(budIds.map((b) => [b, true])));
            } else if (bud) {
                if (bud === "Under 50L") {
                    setSelectedPriceBands({
                        under25: true,
                        "25to50": true,
                    });
                } else if (bud === "Under 1 Cr") {
                    setSelectedPriceBands({
                        under25: true,
                        "25to50": true,
                        "50to100": true,
                    });
                } else if (bud === "1 Cr - 2 Cr") {
                    setSelectedPriceBands({
                        "100to200": true,
                    });
                } else if (bud === "2 Cr+") {
                    setSelectedPriceBands({
                        above200: true,
                    });
                }
            }
        }
    }, []);

    // AI Search suggestion phrases
    const suggestions = [
        "beachfront properties in Kochi under ₹1 Cr",
        "2 BHK apartments for rent in Kakkanad",
        "luxury villa for sale in Thrissur",
        "plots under 30 lakhs in Palakkad",
    ];

    const [apiProperties, setApiProperties] = useState([]);
    const [mapProperties, setMapProperties] = useState([]);
    const [apiMeta, setApiMeta] = useState({ current_page: 1, last_page: 1, per_page: 8, total: 0 });
    const [facets, setFacets] = useState(null);
    const [apiError, setApiError] = useState("");
    const allProperties = apiProperties;

    // Categories combine with AND; options within one category combine with OR.
    const filterState = {
        purpose: selectedPurpose,
        type: selectedTypes,
        location: selectedLocations,
        price: selectedPriceBands,
        posted: postedWithin,
        ownership: selectedOwnership,
        search: searchTerm,
    };

    const matchesExcept = (item, exceptKey) =>
        Object.keys(MATCHERS).every(
            (key) => key === exceptKey || MATCHERS[key](item, filterState[key])
        );

    const filteredProperties = allProperties
        .filter((item) => matchesExcept(item, null))
        .sort((a, b) => {
            if (sortBy === "priceLow") return a.priceNum - b.priceNum;
            if (sortBy === "priceHigh") return b.priceNum - a.priceNum;
            return 0; // preserve API order (payment added date / publish date order)
        });

    const mapRef = useRef(null);
    const markersRef = useRef({});
    const markersLayerRef = useRef(null);
    const [mapInitialized, setMapInitialized] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.__kpNavigate = (url) => {
                router.push(url);
            };
        }
    }, [router]);

    const buildPropertyQuery = useCallback(() => {
        const activeBands = PRICE_BANDS.filter((band) => selectedPriceBands[band.id]);
        const query = {
            page: currentPage,
            limit: 12,
            sort_by: sortBy,
        };

        if (searchTerm.trim() && !searchTerm.trim().toLowerCase().startsWith("i want to")) {
            query.search = searchTerm.trim();
        }
        if (activeKeysOf(selectedPurpose).length) query.listing_type = activeKeysOf(selectedPurpose).join(",");
        if (activeKeysOf(selectedTypes).length) {
            const types = activeKeysOf(selectedTypes);
            const queryTypes = [];
            types.forEach((t) => {
                queryTypes.push(t);
                if (t === "Residential House") {
                    queryTypes.push("House", "Independent House", "Home");
                } else if (t === "Residential Villa") {
                    queryTypes.push("Villa", "Independent Villa");
                }
            });
            query.property_type = Array.from(new Set(queryTypes)).join(",");
        }
        if (activeKeysOf(selectedLocations).length) query.district = activeKeysOf(selectedLocations).join(",");
        if (activeKeysOf(selectedOwnership).length) query.ownership = activeKeysOf(selectedOwnership).join(",");
        if (postedWithin !== "any") query.posted_within = postedWithin;
        if (filterUserId) query.user_id = filterUserId;
        if (activeBands.length) {
            query.min_price = Math.min(...activeBands.map((band) => band.min));
            const finiteMaxes = activeBands.map((band) => band.max).filter(Number.isFinite);
            if (finiteMaxes.length === activeBands.length) {
                query.max_price = Math.max(...finiteMaxes);
            }
        }

        return query;
    }, [currentPage, sortBy, searchTerm, selectedPurpose, selectedTypes, selectedLocations, selectedOwnership, postedWithin, selectedPriceBands, filterUserId]);

    useEffect(() => {
        let alive = true;

        const fetchProperties = async () => {
            setIsFiltering(true);
            try {
                const response = await propertyApi.list(buildPropertyQuery());
                if (!alive) return;

                const items = (response.data || []).map(normalizeProperty);
                setApiProperties(items);
                setFavorites(items.filter((item) => item.isSaved).map((item) => item.id));
                setApiMeta(response.meta || {
                    current_page: response.current_page || 1,
                    last_page: response.last_page || 1,
                    per_page: response.per_page || 8,
                    total: response.total || items.length,
                });
                if (response.facets) {
                    setFacets(response.facets);
                }
                setApiError("");
            } catch (error) {
                if (!alive) return;
                setApiProperties([]);
                setApiError(error?.response?.data?.message || "Unable to load live properties.");
            } finally {
                if (alive) setIsFiltering(false);
            }
        };

        fetchProperties();

        return () => {
            alive = false;
        };
    }, [buildPropertyQuery]);

    useEffect(() => {
        if (!showMap) return;
        let alive = true;

        const fetchMapProperties = async () => {
            try {
                const { page, limit, sort_by, ...filters } = buildPropertyQuery();
                let mapData = [];

                try {
                    const response = await propertyApi.map(filters);
                    if (response?.data && response.data.length > 1) {
                        mapData = response.data;
                    }
                } catch (e) {
                    console.warn("Map API call failed, falling back to list:", e);
                }

                // If map returned only 1 property (due to remote backend filtering by lat/lng) or empty,
                // fetch full matching list with limit: 500 so all matching properties in Kerala show on map
                if (!mapData || mapData.length <= 1) {
                    try {
                        const listResponse = await propertyApi.list({ ...filters, limit: 500 });
                        if (listResponse?.data && listResponse.data.length > 0) {
                            mapData = listResponse.data;
                        }
                    } catch (e) {
                        console.warn("List fallback failed:", e);
                    }
                }

                if (alive && mapData && mapData.length > 0) {
                    setMapProperties(mapData.map(normalizeProperty));
                }
            } catch {
                if (alive) setMapProperties([]);
            }
        };

        fetchMapProperties();

        return () => {
            alive = false;
        };
    }, [showMap, buildPropertyQuery]);

    // 1. Initialize Leaflet Map once
    useEffect(() => {
        if (!showMap) {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersLayerRef.current = null;
                markersRef.current = {};
            }
            return;
        }

        const initMap = () => {
            const L = window.L;
            if (!L) return;

            const mapDom = document.getElementById("leaflet-real-map");
            if (!mapDom) return;

            if (mapRef.current) return; // Map already initialized

            const newMap = L.map("leaflet-real-map", {
                center: KERALA_CENTER,
                zoom: KERALA_DEFAULT_ZOOM,
                zoomControl: true,
                minZoom: 7,
                maxBounds: [
                    [7.0, 73.0],
                    [14.0, 79.0],
                ],
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                subdomains: ["a", "b", "c"],
                maxZoom: 19,
            }).addTo(newMap);

            const markersLayer = L.layerGroup().addTo(newMap);

            newMap.on("popupclose", () => {
                document.querySelectorAll(".custom-leaflet-price-pin").forEach((el) => {
                    el.classList.remove("active-pin");
                });
                setSelectedMapPropertyId(null);
            });

            mapRef.current = newMap;
            markersLayerRef.current = markersLayer;
            setMapInitialized((prev) => !prev);
        };

        if (!window.L) {
            if (!document.getElementById("leaflet-css")) {
                const link = document.createElement("link");
                link.id = "leaflet-css";
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }

            if (!document.getElementById("leaflet-js")) {
                const script = document.createElement("script");
                script.id = "leaflet-js";
                script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
                script.onload = initMap;
                document.body.appendChild(script);
            }
        } else {
            initMap();
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersLayerRef.current = null;
                markersRef.current = {};
            }
        };
    }, [showMap]);

    // 2. Synchronize markers & view dynamically whenever properties, search, or filters change
    useEffect(() => {
        if (!showMap || !mapRef.current || !markersLayerRef.current || !window.L) return;

        const L = window.L;
        const propertiesForMap = (mapProperties && mapProperties.length > 1)
            ? mapProperties
            : (filteredProperties && filteredProperties.length > 0
                ? filteredProperties
                : (allProperties && allProperties.length > 0 ? allProperties : mapProperties));

        markersLayerRef.current.clearLayers();
        const markers = {};

        const duplicateGroups = propertiesForMap.reduce((groups, property) => {
            const key = `${Number(property.lat).toFixed(6)},${Number(property.lng).toFixed(6)}`;
            groups[key] = groups[key] || [];
            groups[key].push(property.id);
            return groups;
        }, {});

        const bounds = [];
        const isInsideKerala = (lat, lng) => lat >= 8.0 && lat <= 13.0 && lng >= 74.5 && lng <= 78.0;

        propertiesForMap.forEach((p) => {
            const positionKey = `${Number(p.lat).toFixed(6)},${Number(p.lng).toFixed(6)}`;
            const group = duplicateGroups[positionKey] || [];
            const duplicateIndex = group.indexOf(p.id);
            const hasDuplicates = group.length > 1 && duplicateIndex >= 0;

            let markerLat = Number(p.lat);
            let markerLng = Number(p.lng);

            if (hasDuplicates) {
                const ring = Math.floor(duplicateIndex / 8);
                const angleStep = (Math.PI * 2) / Math.min(group.length, 8);
                const angle = (duplicateIndex % 8) * angleStep + (ring * 0.4);
                const radius = 0.007 + (ring * 0.006);
                markerLat += Math.sin(angle) * radius;
                markerLng += Math.cos(angle) * radius;
            }

            if (!isInsideKerala(markerLat, markerLng)) {
                markerLat = KERALA_CENTER[0];
                markerLng = KERALA_CENTER[1];
            }

            const priceLabel =
                p.priceNum >= 10000000
                    ? `₹ ${(p.priceNum / 10000000).toFixed(2)} Cr`
                    : `₹ ${(p.priceNum / 100000).toFixed(0)} L`;

            const customHtml = `
                <div class="custom-leaflet-price-pin" id="price-pin-${p.id}">
                    <span class="home-icon">🏠</span>
                    <span class="price-val">${priceLabel}</span>
                </div>
            `;

            const customIcon = L.divIcon({
                html: customHtml,
                className: "leaflet-custom-marker-wrapper",
                iconSize: [90, 36],
                iconAnchor: [45, 36],
            });

            const targetUrl = getPropertyUrl(p);
            const specsHtml = p.beds
                ? `<span>🛏️ ${p.beds}</span> <span>🚿 ${p.baths}</span> <span>📏 ${p.area}</span>`
                : `<span>📏 ${p.cent || p.area || 'Plot'}</span> <span>🧭 ${p.facing ? (p.facing.toLowerCase().includes('facing') ? p.facing : `${p.facing} Facing`) : (p.type || 'Land')}</span> <span>🛡️ ${p.ownership || 'Freehold'}</span>`;

            const popupHtml = `
                <div class="leaflet-card-popup" style="cursor: pointer;" onclick="window.__kpNavigate && window.__kpNavigate('${targetUrl}')">
                    <div class="leaflet-card-image-wrapper">
                        <img src="${p.image || 'https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public'}" alt="${p.title}" class="leaflet-card-image" />
                        <span class="leaflet-card-badge">${p.badge || 'Verified'}</span>
                    </div>
                    <div class="leaflet-card-content">
                        ${(p.addedDate || p.code) ? `<div class="leaflet-card-badges">${p.addedDate ? `<span style="font-size:10.5px; font-weight:600; color:#64748b; background:#f1f5f9; padding:2px 6px; border-radius:4px; width: fit-content;">📅 ${p.addedDate}</span>` : ''}${p.code ? `<span class="leaflet-card-id">ID: ${p.code}</span>` : ''}</div>` : ''}
                        <h4 class="leaflet-card-title">${p.title}</h4>
                        <div class="leaflet-card-loc">
                            📍 <span>${p.location}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <div class="leaflet-card-price" style="margin-bottom:0;">${p.price}</div>
                        </div>
                        <div class="leaflet-card-specs">
                            ${specsHtml}
                        </div>
                        <a href="${targetUrl}" class="leaflet-card-btn" onclick="event.preventDefault(); window.__kpNavigate && window.__kpNavigate('${targetUrl}')">
                            View Details
                        </a>
                    </div>
                </div>
            `;

            const marker = L.marker([markerLat, markerLng], { icon: customIcon });
            marker.addTo(markersLayerRef.current);
            bounds.push([markerLat, markerLng]);

            marker.bindPopup(popupHtml, {
                className: "custom-leaflet-popup-card",
                maxWidth: 280,
                minWidth: 260,
                autoPan: true,
                autoPanPaddingTopLeft: L.point(40, 60),
                autoPanPaddingBottomRight: L.point(40, 160),
                closeButton: true,
                offset: L.point(0, -14),
            });

            marker.on("click", (e) => {
                if (window.L && window.L.DomEvent) {
                    window.L.DomEvent.stopPropagation(e);
                }
                marker.openPopup();
                if (mapRef.current) {
                    mapRef.current.panTo([markerLat, markerLng], {
                        animate: true,
                        duration: 0.4,
                    });
                }
            });

            marker.on("popupopen", () => {
                document.querySelectorAll(".custom-leaflet-price-pin").forEach((el) => {
                    el.classList.remove("active-pin");
                });
                const activePinDom = document.getElementById(`price-pin-${p.id}`);
                if (activePinDom) {
                    activePinDom.classList.add("active-pin");
                }
            });

            marker.on("popupclose", () => {
                const activePinDom = document.getElementById(`price-pin-${p.id}`);
                if (activePinDom) {
                    activePinDom.classList.remove("active-pin");
                }
            });

            markers[p.id] = marker;
        });

        markersRef.current = markers;

        // Auto-navigate map camera based on search or active district
        const activeDistrictKey = activeKeysOf(selectedLocations)[0] || (activeMapDistrict !== "All Kerala" ? activeMapDistrict : null);
        const activeDistrictObj = KERALA_DISTRICTS.find((d) => d.name === activeDistrictKey);

        if (searchTerm.trim()) {
            if (bounds.length === 1) {
                mapRef.current.flyTo(bounds[0], 13.5, { duration: 1.0 });
            } else if (bounds.length > 1) {
                mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
            } else {
                // If no matching property coordinates in state, geocode the search query in Kerala
                const timer = setTimeout(() => {
                    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&viewbox=74.5,13.0,77.8,8.0&bounded=0&q=${encodeURIComponent(searchTerm.trim() + ", Kerala")}`)
                        .then((res) => res.json())
                        .then((data) => {
                            if (data && data.length > 0 && mapRef.current) {
                                const lat = parseFloat(data[0].lat);
                                const lon = parseFloat(data[0].lon);
                                mapRef.current.flyTo([lat, lon], 12.5, { duration: 1.0 });
                            }
                        })
                        .catch(() => { });
                }, 400);
                return () => clearTimeout(timer);
            }
        } else if (activeDistrictObj) {
            mapRef.current.flyTo([activeDistrictObj.lat, activeDistrictObj.lng], activeDistrictObj.zoom || 11.5, { duration: 1.0 });
        } else if (bounds.length > 1) {
            mapRef.current.fitBounds(bounds, {
                padding: [60, 60],
                maxZoom: 12,
            });
        } else if (bounds.length === 1) {
            mapRef.current.flyTo(bounds[0], 12, { duration: 1.0 });
        } else {
            mapRef.current.setView(KERALA_CENTER, KERALA_DEFAULT_ZOOM);
        }
    }, [showMap, mapInitialized, mapProperties, allProperties, filteredProperties, searchTerm, activeMapDistrict, selectedLocations, router]);

    // Computed Autocomplete Typing Suggestions based on search input
    const typingSuggestions = searchTerm.trim()
        ? [
            ...new Set(
                allProperties
                    .map((p) => p.location.split(",")[0].trim())
                    .filter((loc) => loc.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((loc) => `Properties in ${loc}`)
            ),
            ...new Set(
                allProperties
                    .map((p) => p.category)
                    .filter((cat) => cat.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((cat) => `${cat} listings`)
            ),
            ...new Set(
                allProperties
                    .filter(
                        (p) =>
                            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.location.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 3)
                    .map((p) => p.title)
            ),
        ].slice(0, 5)
        : [];

    // The districts present in Kerala districts or facets or current page
    const locationOptions = useMemo(() => {
        const fromDistricts = KERALA_DISTRICTS.filter((d) => d.name !== "All Kerala").map((d) => d.name);
        const fromFacets = facets?.district ? Object.keys(facets.district) : [];
        const fromProps = allProperties.map((item) => districtOf(item.location));
        return [...new Set([...fromDistricts, ...fromFacets, ...fromProps].filter(Boolean))].sort();
    }, [facets, allProperties]);

    /* A district already ticked stays listed even when it doesn't match the
       query — otherwise an active filter disappears from view and the result
       count looks unexplained. */
    const visibleLocationOptions = locationOptions.filter(
        (district) =>
            selectedLocations[district] ||
            district.toLowerCase().includes(locationQuery.trim().toLowerCase())
    );

    /* Every filter change returns to page one. Without this, narrowing the
       results while on a later page leaves you looking at an empty grid.
       Updates are functional so two rapid toggles can't clobber each other. */
    const toggleKeyed = (setter) => (key, checked) => {
        setter((prev) => ({ ...prev, [key]: checked }));
        setCurrentPage(1);
    };

    const togglePurpose = toggleKeyed(setSelectedPurpose);
    const toggleType = toggleKeyed(setSelectedTypes);
    const toggleLocation = toggleKeyed(setSelectedLocations);
    const togglePriceBand = toggleKeyed(setSelectedPriceBands);
    const toggleOwnership = toggleKeyed(setSelectedOwnership);

    const changePostedWithin = (id) => {
        setPostedWithin(id);
        setCurrentPage(1);
    };

    const changeSearchTerm = (value) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    const changeSortBy = (value) => {
        setSortBy(value);
        setCurrentPage(1);
    };

    const clearAllFilters = () => {
        setSelectedPurpose({ buy: false, rent: false, lease: false });
        setSelectedTypes({});
        setSelectedLocations({});
        setLocationQuery("");
        setSelectedPriceBands({});
        setPostedWithin("any");
        setSelectedOwnership({});
        setSearchTerm("");
        setSortBy("newest");
        setActiveMapDistrict("All Kerala");
        setFilterUserId(null);
        setFilterOwnerName("");
        setCurrentPage(1);

        try {
            sessionStorage.removeItem("kp_search_params");
        } catch (e) {}

        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("user_id");
            url.searchParams.delete("loginId");
            url.searchParams.delete("login_id");
            url.searchParams.delete("owner_name");
            url.searchParams.delete("agent_name");
            url.searchParams.delete("user_name");
            window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
        }
    };

    useEffect(() => {
        const handleResetEvent = () => {
            clearAllFilters();
        };
        window.addEventListener("kp:reset-properties-filters", handleResetEvent);
        return () => window.removeEventListener("kp:reset-properties-filters", handleResetEvent);
    }, []);

    const handleSelectMapDistrict = (districtName) => {
        setActiveMapDistrict(districtName);
        const districtInfo = KERALA_DISTRICTS.find((d) => d.name === districtName);

        if (districtName === "All Kerala" || !districtInfo) {
            setSelectedLocations({});
            setCurrentPage(1);
            if (mapRef.current) {
                mapRef.current.flyTo(KERALA_CENTER, KERALA_DEFAULT_ZOOM, { duration: 1.2 });
            }
        } else {
            setSelectedLocations({ [districtName]: true });
            setCurrentPage(1);
            if (mapRef.current) {
                mapRef.current.flyTo([districtInfo.lat, districtInfo.lng], districtInfo.zoom || 11.5, { duration: 1.2 });
            }
        }
    };

    const handleResetKeralaFocus = () => {
        setActiveMapDistrict("All Kerala");
        setSelectedLocations({});
        setSearchTerm("");
        setCurrentPage(1);
        if (mapRef.current) {
            mapRef.current.flyTo(KERALA_CENTER, KERALA_DEFAULT_ZOOM, { duration: 1.2 });
        }
    };

    /* Real counts computed across the complete database dataset */
    const facetCount = (categoryKey, predicate) =>
        allProperties.filter((item) => matchesExcept(item, categoryKey) && predicate(item)).length;

    const purposeCount = (key) => {
        if (facets?.purpose && typeof facets.purpose[key] === "number") {
            return facets.purpose[key];
        }
        return facetCount("purpose", (item) => item.purpose === key);
    };

    const typeCount = (label) => {
        if (!facets?.property_type) {
            return facetCount("type", (item) => {
                const itemCat = (item.category || item.type || "").toLowerCase();
                const cleanL = String(label || "").toLowerCase();
                if (cleanL.includes("villa")) return itemCat.includes("villa");
                if (cleanL.includes("house") || cleanL.includes("home")) {
                    return (itemCat.includes("house") || itemCat.includes("home")) && (!itemCat.includes("villa") || itemCat.includes("house"));
                }
                return itemCat.includes(cleanL) || cleanL.includes(itemCat);
            });
        }
        const cleanLabel = String(label || "").toLowerCase().replace(/[\s\-_/]+/g, " ").trim();
        let sum = 0;
        for (const [rawKey, count] of Object.entries(facets.property_type)) {
            const cleanKey = String(rawKey || "").toLowerCase().replace(/[\s\-_/]+/g, " ").trim();
            if (
                cleanKey === cleanLabel ||
                (cleanLabel === "residential villa" && (cleanKey === "villa" || cleanKey.includes("villa") || cleanKey.includes("independent villa"))) ||
                (cleanLabel === "residential house" && (cleanKey === "house" || cleanKey === "home" || (cleanKey.includes("house") && !cleanKey.includes("villa")) || cleanKey.includes("independent house"))) ||
                ((cleanLabel === "residential house" || cleanLabel === "residential villa") && (cleanKey === "residential house villa" || cleanKey === "house villa")) ||
                (cleanLabel === "residential apartment" && cleanKey.includes("apartment")) ||
                (cleanLabel === "residential land" && cleanKey.includes("residential land")) ||
                (cleanLabel === "commercial shop" && cleanKey.includes("shop")) ||
                (cleanLabel === "commercial office" && cleanKey.includes("office")) ||
                (cleanLabel === "commercial land" && cleanKey.includes("commercial land")) ||
                (cleanLabel === "commercial building" && cleanKey.includes("commercial building")) ||
                (cleanLabel === "commercial other" && (cleanKey.includes("commercial other") || cleanKey.includes("others"))) ||
                (cleanLabel === "industrial building" && cleanKey.includes("industrial building")) ||
                (cleanLabel === "industrial land" && cleanKey.includes("industrial land")) ||
                (cleanLabel === "agricultural land" && cleanKey.includes("agricultural"))
            ) {
                sum += count;
            }
        }
        return sum;
    };

    const locationCount = (district) => {
        if (facets?.district) {
            const dLower = district.toLowerCase();
            for (const [key, count] of Object.entries(facets.district)) {
                if (
                    key.toLowerCase() === dLower ||
                    (dLower.includes("kochi") && key.toLowerCase().includes("ernakulam")) ||
                    (dLower.includes("ernakulam") && key.toLowerCase().includes("kochi"))
                ) {
                    return count;
                }
            }
            return 0;
        }
        return facetCount("location", (item) => districtOf(item.location) === district);
    };

    const priceCount = (band) => {
        if (facets?.price_bands && typeof facets.price_bands[band.id] === "number") {
            return facets.price_bands[band.id];
        }
        return facetCount("price", (item) => item.priceNum >= band.min && item.priceNum < band.max);
    };

    const postedCount = (id) => {
        if (facets?.posted && typeof facets.posted[id] === "number") {
            return facets.posted[id];
        }
        return facetCount("posted", (item) => id === "any" || item.postedDaysAgo <= Number(id));
    };

    const ownershipCount = (name) => {
        if (facets?.ownership) {
            const nLower = name.toLowerCase();
            for (const [key, count] of Object.entries(facets.ownership)) {
                if (key.toLowerCase() === nLower) return count;
            }
            return 0;
        }
        return facetCount("ownership", (item) => item.ownership === name);
    };

    // Active count per section, so a collapsed section still says it is filtering
    const sectionCounts = {
        purpose: activeKeysOf(selectedPurpose).length,
        propertyType: activeKeysOf(selectedTypes).length,
        location: activeKeysOf(selectedLocations).length,
        priceRange: activeKeysOf(selectedPriceBands).length,
        postedDate: postedWithin === "any" ? 0 : 1,
        ownershipType: activeKeysOf(selectedOwnership).length,
    };

    /* Flattened so each active filter can be removed on its own, instead of
       Clear All being the only way out. */
    const activeChips = [
        ...activeKeysOf(selectedPurpose).map((key) => ({
            id: `purpose:${key}`,
            label: PURPOSE_LABELS[key],
            remove: () => togglePurpose(key, false),
        })),
        ...activeKeysOf(selectedTypes).map((key) => ({
            id: `type:${key}`,
            label: key,
            remove: () => toggleType(key, false),
        })),
        ...activeKeysOf(selectedLocations).map((key) => ({
            id: `location:${key}`,
            label: key,
            remove: () => toggleLocation(key, false),
        })),
        ...PRICE_BANDS.filter((band) => selectedPriceBands[band.id]).map((band) => ({
            id: `price:${band.id}`,
            label: band.label,
            remove: () => togglePriceBand(band.id, false),
        })),
        ...(postedWithin !== "any"
            ? [{
                id: "posted",
                label: POSTED_OPTIONS.find((option) => option.id === postedWithin).label,
                remove: () => changePostedWithin("any"),
            }]
            : []),
        ...activeKeysOf(selectedOwnership).map((key) => ({
            id: `ownership:${key}`,
            label: key,
            remove: () => toggleOwnership(key, false),
        })),
        ...(searchTerm.trim()
            ? [{ id: "search", label: `“${searchTerm.trim()}”`, remove: () => changeSearchTerm("") }]
            : []),
        ...(filterUserId
            ? [{
                id: "user",
                label: `Listed by: ${filterOwnerName || `User #${filterUserId}`}`,
                remove: () => {
                    setFilterUserId(null);
                    setFilterOwnerName("");
                    if (typeof window !== "undefined") {
                        const url = new URL(window.location.href);
                        url.searchParams.delete("user_id");
                        url.searchParams.delete("loginId");
                        url.searchParams.delete("login_id");
                        url.searchParams.delete("owner_name");
                        url.searchParams.delete("agent_name");
                        url.searchParams.delete("user_name");
                        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
                    }
                }
            }]
            : []),
    ];

    /* Group headings act as real select-all toggles. Ticking the group turns on
       every option under it that could still return something. */
    const toggleTypeGroup = (options, checked) => {
        setSelectedTypes((prev) => {
            const next = { ...prev };
            options.forEach((label) => {
                if (checked) {
                    if (typeCount(label) > 0) next[label] = true;
                } else {
                    delete next[label];
                }
            });
            return next;
        });
        setCurrentPage(1);
    };

    // Calculate Pagination
    const itemsPerPage = apiMeta.per_page || 12;
    const totalPages = Math.max(1, apiMeta.last_page || Math.ceil((apiMeta.total || filteredProperties.length) / itemsPerPage));

    /* Clamped rather than reset in an effect, so a stale page number can never
       render an out-of-range slice. */
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const firstOnPage = (safePage - 1) * itemsPerPage;
    const pagedProperties = apiMeta.total ? filteredProperties : filteredProperties.slice(firstOnPage, firstOnPage + itemsPerPage);

    // Smart sliding pagination (e.g. 1 2 3 4 5 ... 27 or 1 ... 5 6 7 ... 27)
    const getPaginationItems = () => {
        // Mobile: cap at 5 page-number slots so the row never overflows the viewport.
        if (isMobile) {
            if (totalPages <= 5) {
                return Array.from({ length: totalPages }, (_, i) => i + 1);
            }
            if (safePage <= 3) {
                return [1, 2, 3, "...", totalPages];
            }
            if (safePage >= totalPages - 2) {
                return [1, "...", totalPages - 2, totalPages - 1, totalPages];
            }
            return [1, "...", safePage, "...", totalPages];
        }

        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (safePage <= 4) {
            return [1, 2, 3, 4, 5, "...", totalPages];
        }
        if (safePage >= totalPages - 3) {
            return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
    };

    // Toggle Favorite handler
    const toggleFavorite = async (e, id) => {
        e.stopPropagation();
        e.preventDefault();
        if (!currentUser) {
            router.push(getLoginRedirectUrl());
            return;
        }
        const wasSaved = favorites.includes(id);
        setFavorites((prev) =>
            prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
        );

        try {
            const response = await propertyApi.toggleFavorite(id);
            setFavorites((prev) => {
                const next = prev.filter((favId) => favId !== id);
                return response.saved ? [...next, id] : next;
            });
            setApiProperties((prev) => prev.map((item) => item.id === id ? { ...item, isSaved: response.saved } : item));
        } catch {
            setFavorites((prev) => wasSaved ? [...new Set([...prev, id])] : prev.filter((favId) => favId !== id));
        }
    };

    // Toggle Accordion section
    const toggleAccordion = (key) => {
        setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // suggestion select handler
    const handleSuggestionSelect = (text) => {
        const cleanText = text
            .replace(/under ₹\d+\s*(Cr|Lakhs|lakhs)?/i, "")
            .replace(/for sale|for rent/i, "")
            .trim();
        if (text.includes("Kochi")) {
            setSearchTerm("Kochi");
        } else if (text.includes("Kakkanad")) {
            setSearchTerm("Kakkanad");
        } else if (text.includes("Thrissur")) {
            setSearchTerm("Thrissur");
        } else if (text.includes("Palakkad")) {
            setSearchTerm("Palakkad");
        } else {
            setSearchTerm(cleanText);
        }
        setIsModalOpen(false);
    };

    // Change page handler
    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 120, behavior: "smooth" });
        }
    };

    return (
        <div className={styles.propertiesPage}>
            {/* Top Fixed Header Navigation */}
            <Nav />

            <PropertiesBanner />
            <div className={styles.container}>
                <div className={styles.mainLayout}>

                    {/* ========================================== */}
                    {/* LEFT SIDEBAR FILTERS                      */}
                    {/* ========================================== */}
                    {isMobileFilterOpen && (
                        <div
                            className={styles.sidebarBackdrop}
                            onClick={() => setIsMobileFilterOpen(false)}
                        >
                            <button
                                type="button"
                                className={styles.closeSidebarBtnMobile}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMobileFilterOpen(false);
                                }}
                                aria-label="Close filters"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <aside className={`${styles.sidebar} ${isMobileFilterOpen ? styles.sidebarOpen : ""}`}>
                        {/* Filter Header */}
                        <div className={styles.filterHeader}>
                            <div className={styles.filterTitleGroup}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                <span>Filter</span>
                                {activeChips.length > 0 && (
                                    <span className={styles.filterCountPill}>{activeChips.length}</span>
                                )}
                            </div>

                            <button
                                type="button"
                                className={styles.clearAllBtn}
                                onClick={clearAllFilters}
                                disabled={activeChips.length === 0}
                            >
                                Clear All
                            </button>

                        </div>

                        {/* What is currently applied, each removable on its own */}
                        {activeChips.length > 0 && (
                            <div className={styles.activeChips}>
                                {activeChips.map((chip) => (
                                    <button
                                        key={chip.id}
                                        type="button"
                                        className={styles.chip}
                                        onClick={chip.remove}
                                        title={`Remove ${chip.label}`}
                                    >
                                        <span className={styles.chipLabel}>{chip.label}</span>
                                        <span className={styles.chipX} aria-hidden="true">×</span>
                                        <span className={styles.srOnly}>Remove filter {chip.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className={styles.matchLine}>
                            <strong>{apiMeta.total || filteredProperties.length}</strong>
                            {(apiMeta.total || filteredProperties.length) === 1 ? " property matches" : " properties match"}
                        </p>

                        {/* AI Search Assistant Search Box Trigger */}
                        <div className={styles.aiSearchPill} onClick={() => setIsModalOpen(true)} style={{ display: 'none' }}>
                            <div className={styles.aiIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                            </div>
                            <div className={styles.aiInputGroup}>
                                <span className={styles.aiLabel}>Ask AI Assistant</span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    readOnly
                                    placeholder='E.g. "beachfront in Kochi"'
                                    className={styles.aiInput}
                                />
                            </div>
                            <div className={styles.micIcon} title="Voice Search">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            </div>
                        </div>

                        {/* Accordion 1: Purpose */}
                        <div className={styles.accordionSection}>
                            <SectionHeader
                                title="Purpose"
                                isOpen={openAccordions.purpose}
                                activeCount={sectionCounts.purpose}
                                onToggle={() => toggleAccordion("purpose")}
                            />

                            {openAccordions.purpose && (
                                <div className={styles.optionGroup}>
                                    {Object.keys(PURPOSE_LABELS).map((key) => (
                                        <FilterOption
                                            key={key}
                                            label={PURPOSE_LABELS[key]}
                                            count={purposeCount(key)}
                                            checked={!!selectedPurpose[key]}
                                            onChange={(checked) => togglePurpose(key, checked)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Accordion 2: Property Type */}
                        <div className={styles.accordionSection}>
                            <SectionHeader
                                title="Property Type"
                                isOpen={openAccordions.propertyType}
                                activeCount={sectionCounts.propertyType}
                                onToggle={() => toggleAccordion("propertyType")}
                            />

                            {openAccordions.propertyType && (
                                <div className={styles.typeGroups}>
                                    {TYPE_GROUPS.map(({ group, options }) => {
                                        const available = options.filter((label) => typeCount(label) > 0);
                                        const checkedInGroup = options.filter((label) => selectedTypes[label]);
                                        const allOn = available.length > 0 && available.every((label) => selectedTypes[label]);

                                        return (
                                            <div key={group} className={styles.typeGroup}>
                                                <label className={styles.groupToggle}>
                                                    <input
                                                        type="checkbox"
                                                        checked={allOn}
                                                        disabled={available.length === 0}
                                                        ref={(el) => {
                                                            if (el) el.indeterminate = !allOn && checkedInGroup.length > 0;
                                                        }}
                                                        onChange={(event) => toggleTypeGroup(options, event.target.checked)}
                                                        className={styles.optionInput}
                                                    />
                                                    <span className={styles.optionBox} aria-hidden="true">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </span>
                                                    <span className={styles.groupToggleLabel}>All {group}</span>
                                                </label>

                                                <div className={styles.optionGroup}>
                                                    {options.map((label) => (
                                                        <FilterOption
                                                            key={label}
                                                            label={label.replace(`${group} `, "")}
                                                            count={typeCount(label)}
                                                            checked={!!selectedTypes[label]}
                                                            onChange={(checked) => toggleType(label, checked)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Accordion 3: Location */}
                        <div className={styles.accordionSection}>
                            <SectionHeader
                                title="Location"
                                isOpen={openAccordions.location}
                                activeCount={sectionCounts.location}
                                onToggle={() => toggleAccordion("location")}
                            />

                            {openAccordions.location && (
                                <>
                                    <div className={styles.filterSearchWrapper}>
                                        <span className={styles.filterSearchIcon}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                                                <circle cx="11" cy="11" r="8" />
                                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                            </svg>
                                        </span>
                                        <input
                                            type="text"
                                            value={locationQuery}
                                            onChange={(e) => setLocationQuery(e.target.value)}
                                            placeholder="Search district"
                                            className={styles.filterSearchInput}
                                            aria-label="Search districts"
                                        />
                                        {locationQuery && (
                                            <button
                                                type="button"
                                                className={styles.filterSearchClear}
                                                onClick={() => setLocationQuery("")}
                                                aria-label="Clear district search"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>

                                    {visibleLocationOptions.length > 0 ? (
                                        <div className={styles.optionGroup}>
                                            {visibleLocationOptions.map((district) => (
                                                <FilterOption
                                                    key={district}
                                                    label={district}
                                                    count={locationCount(district)}
                                                    checked={!!selectedLocations[district]}
                                                    onChange={(checked) => toggleLocation(district, checked)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={styles.filterNoMatch}>
                                            No district matches &ldquo;{locationQuery.trim()}&rdquo;
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Accordion 4: Price Range */}
                        <div className={styles.accordionSection}>
                            <SectionHeader
                                title="Price Range"
                                isOpen={openAccordions.priceRange}
                                activeCount={sectionCounts.priceRange}
                                onToggle={() => toggleAccordion("priceRange")}
                            />

                            {openAccordions.priceRange && (
                                <div className={styles.optionGroup}>
                                    {PRICE_BANDS.map((band) => (
                                        <FilterOption
                                            key={band.id}
                                            label={band.label}
                                            count={priceCount(band)}
                                            checked={!!selectedPriceBands[band.id]}
                                            onChange={(checked) => togglePriceBand(band.id, checked)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Accordion 5: Posted Date */}
                        <div className={styles.accordionSection}>
                            <SectionHeader
                                title="Posted Date"
                                isOpen={openAccordions.postedDate}
                                activeCount={sectionCounts.postedDate}
                                onToggle={() => toggleAccordion("postedDate")}
                            />

                            {openAccordions.postedDate && (
                                <div className={styles.optionGroup}>
                                    {POSTED_OPTIONS.map((option) => (
                                        <FilterOption
                                            key={option.id}
                                            type="radio"
                                            name="postedWithin"
                                            label={option.label}
                                            count={postedCount(option.id)}
                                            checked={postedWithin === option.id}
                                            onChange={() => changePostedWithin(option.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Accordion 6: Ownership Type */}
                        <div className={styles.accordionSection} style={{ borderBottom: "none" }}>
                            <SectionHeader
                                title="Ownership Type"
                                isOpen={openAccordions.ownershipType}
                                activeCount={sectionCounts.ownershipType}
                                onToggle={() => toggleAccordion("ownershipType")}
                            />

                            {openAccordions.ownershipType && (
                                <div className={styles.optionGroup}>
                                    {OWNERSHIP_TYPES.map((name) => (
                                        <FilterOption
                                            key={name}
                                            label={name}
                                            count={ownershipCount(name)}
                                            checked={!!selectedOwnership[name]}
                                            onChange={(checked) => toggleOwnership(name, checked)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* ========================================== */}
                    {/* RIGHT CONTENT AREA                        */}
                    {/* ========================================== */}
                    <main className={styles.contentArea}>

                        {/* Top Bar: Title & AI Assistant */}
                        <div className={styles.topBar}>
                            <div className={styles.titleArea}>
                                <h1 className={styles.pageTitle}>
                                    {filterUserId
                                        ? (filterOwnerName ? `${filterOwnerName}'s Properties` : "My Properties")
                                        : (activeKeysOf(selectedLocations).length === 1
                                            ? `Properties in ${activeKeysOf(selectedLocations)[0]}`
                                            : "Properties in Kerala")
                                    }
                                </h1>
                                <span className={styles.totalCount}>Total {apiMeta.total || filteredProperties.length} Properties</span>
                            </div>

                            <div className={styles.topRightActions}>
                                {/* Mobile Filter Toggle Button */}
                                <button
                                    type="button"
                                    className={styles.mobileFilterToggleBtn}
                                    onClick={() => setIsMobileFilterOpen(true)}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                    </svg>
                                    Filters
                                    {activeChips.length > 0 && (
                                        <span className={styles.filterCountBadge}>{activeChips.length}</span>
                                    )}
                                </button>

                                {/* Map View Toggle Button */}
                                <button
                                    type="button"
                                    className={`${styles.mapViewBtn} ${showMap ? styles.mapViewBtnActive : ""}`}
                                    onClick={() => setShowMap(!showMap)}
                                >
                                    {showMap ? (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="8" y1="6" x2="21" y2="6" />
                                                <line x1="8" y1="12" x2="21" y2="12" />
                                                <line x1="8" y1="18" x2="21" y2="18" />
                                                <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
                                                <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                                                <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
                                            </svg>
                                            Show List
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            Map View
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Banner when filtered to a specific user's / agent's properties */}
                        {filterUserId && (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: "12px",
                                background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                                border: "1.5px solid #86efac",
                                padding: "14px 20px",
                                borderRadius: "14px",
                                marginBottom: "24px",
                                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.08)"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{
                                        width: "38px",
                                        height: "38px",
                                        borderRadius: "50%",
                                        background: "#dcfce7",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#15803d",
                                        fontSize: "20px",
                                        flexShrink: 0
                                    }}>
                                        <RiUserLine />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#166534" }}>
                                            Showing properties listed by {filterOwnerName || `User #${filterUserId}`}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#15803d", marginTop: "2px" }}>
                                            {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"} added by this user
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterUserId(null);
                                        setFilterOwnerName("");
                                        if (typeof window !== "undefined") {
                                            const url = new URL(window.location.href);
                                            url.searchParams.delete("user_id");
                                            url.searchParams.delete("loginId");
                                            url.searchParams.delete("login_id");
                                            url.searchParams.delete("owner_name");
                                            url.searchParams.delete("agent_name");
                                            url.searchParams.delete("user_name");
                                            window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
                                        }
                                    }}
                                    style={{
                                        background: "#ffffff",
                                        border: "1.5px solid #22c55e",
                                        color: "#15803d",
                                        padding: "8px 18px",
                                        borderRadius: "8px",
                                        fontSize: "13px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    View All Properties
                                </button>
                            </div>
                        )}

                        {/* Render REAL GEOGRAPHIC LEAFLET MAP if toggled, else LIST/GRID VIEW */}
                        {showMap ? (
                            <>
                                {/* Map Location Search & Filter Control Bar */}
                                <div className={styles.mapLocationControlBar}>
                                    <div className={styles.mapLocationSearchWrap}>
                                        <RiMapPinLine className={styles.mapLocationPinIcon} />
                                        <select
                                            className={styles.mapDistrictSelect}
                                            value={activeMapDistrict}
                                            onChange={(e) => handleSelectMapDistrict(e.target.value)}
                                            aria-label="Filter by District"
                                        >
                                            {KERALA_DISTRICTS.map((d) => (
                                                <option key={d.name} value={d.name}>
                                                    {d.label || d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.mapLocalityInputWrap}>
                                        <RiSearchLine className={styles.mapLocalitySearchIcon} />
                                        <input
                                            type="text"
                                            placeholder="Search locality / town (e.g. Kakkanad, Edappally)..."
                                            value={searchTerm}
                                            onChange={(e) => changeSearchTerm(e.target.value)}
                                            className={styles.mapLocalityInput}
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                className={styles.mapLocalityClearBtn}
                                                onClick={() => changeSearchTerm("")}
                                                aria-label="Clear locality search"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className={styles.mapResetFocusBtn}
                                        onClick={handleResetKeralaFocus}
                                        title="Reset map view to Kerala"
                                    >
                                        <RiCompass3Line /> Focus Kerala
                                    </button>
                                </div>

                                {/* Quick District Filter Pills (All 14 Districts of Kerala) */}
                                <div className={styles.mapQuickDistrictPills}>
                                    {KERALA_DISTRICTS.map((d) => (
                                        <button
                                            key={d.name}
                                            type="button"
                                            className={`${styles.mapDistrictPill} ${activeMapDistrict === d.name ? styles.mapDistrictPillActive : ""}`}
                                            onClick={() => handleSelectMapDistrict(d.name)}
                                        >
                                            {d.name === "All Kerala" ? "🌴 All Kerala" : d.name === "Ernakulam" ? "🏢 Kochi / Ernakulam" : d.name}
                                        </button>
                                    ))}
                                </div>

                                <div className={styles.mapWrapper}>
                                    {/* Real Interactive Leaflet OpenStreetMap Engine Container */}
                                    <div id="leaflet-real-map" className={styles.leafletMapContainer}></div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Controls Bar: Property ID search (left) · Sort & Grid/List toggle (right) */}
                                <div className={styles.controlsRow}>
                                    {/* Global search: property ID, location, property type, keywords */}
                                    <PropertyIdSearch
                                        loadedProperties={allProperties}
                                        searchTerm={searchTerm}
                                        onSearch={changeSearchTerm}
                                        districts={locationOptions}
                                        typeOptions={ALL_TYPE_OPTIONS}
                                        normalize={normalizeProperty}
                                        onPickDistrict={(name) => {
                                            setSelectedLocations({ [name]: true });
                                            changeSearchTerm("");
                                        }}
                                        onPickType={(type) => {
                                            setSelectedTypes({ [type]: true });
                                            changeSearchTerm("");
                                        }}
                                    />

                                    <div className={styles.controlsRight}>
                                        {/* Sort By Dropdown */}
                                        <div className={styles.sortWrapper}>
                                            <span className={styles.sortLabel}>Sort by:</span>
                                            <select
                                                className={styles.sortSelect}
                                                value={sortBy}
                                                onChange={(e) => changeSortBy(e.target.value)}
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="priceLow">Price: Low to High</option>
                                                <option value="priceHigh">Price: High to Low</option>
                                                <option value="popular">Most Popular</option>
                                            </select>
                                        </div>

                                        {/* Grid vs List View Buttons */}
                                        <div className={styles.viewToggleGroup}>
                                            <button
                                                type="button"
                                                className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
                                                onClick={() => setViewMode("grid")}
                                                title="Grid View"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                                </svg>
                                            </button>

                                            <button
                                                type="button"
                                                className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
                                                onClick={() => setViewMode("list")}
                                                title="List View"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="8" y1="6" x2="21" y2="6" />
                                                    <line x1="8" y1="12" x2="21" y2="12" />
                                                    <line x1="8" y1="18" x2="21" y2="18" />
                                                    <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
                                                    <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                                                    <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Properties Grid or List View with Filter Loading Overlay */}
                                <div className={styles.gridLoadingWrapper}>
                                    {/* Filter Loader Overlay */}
                                    {isFiltering && (
                                        <div className={styles.loaderOverlay}>
                                            <div className={styles.spinner} />
                                            <span className={styles.loadingText}>Updating Properties...</span>
                                        </div>
                                    )}

                                    {filteredProperties.length > 0 ? (
                                        <div
                                            className={viewMode === "grid" ? styles.propertyGrid : styles.propertyList}
                                            style={{ opacity: isFiltering ? 0.35 : 1 }}
                                        >
                                            {pagedProperties.map((item) => {
                                                const isFav = favorites.includes(item.id);
                                                const isOwn = item.is_owner || (currentLoginId && (
                                                    String(item.login_id) === String(currentLoginId) ||
                                                    String(item.owner?.id) === String(currentLoginId)
                                                ));

                                                return (
                                                    <Link
                                                        key={item.id}
                                                        href={getPropertyUrl(item)}
                                                        className={`${styles.propertyCard} ${viewMode === "list" ? styles.propertyCardList : ""}`}
                                                        style={{ textDecoration: "none", color: "inherit" }}
                                                    >
                                                        {/* Photo & Badge & Favorite Button */}
                                                        <div className={styles.imageWrapper}>
                                                            <img
                                                                loading="lazy"
                                                                decoding="async"
                                                                src={item.image}
                                                                alt={item.title}
                                                                className={styles.cardImage}
                                                                onError={handleImageError}
                                                            />

                                                            {/* Status Badge */}
                                                            <span className={`${styles.badge} ${item.badgeType === "new" ? styles.newListingBadge : styles.forSaleBadge}`}>
                                                                {item.badge}
                                                            </span>

                                                            {/* Favorite Heart Toggle Button */}
                                                            <button
                                                                type="button"
                                                                className={styles.cardFavoriteBtn}
                                                                onClick={(e) => toggleFavorite(e, item.id)}
                                                                title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                                            >
                                                                <svg
                                                                    width="18"
                                                                    height="18"
                                                                    viewBox="0 0 24 24"
                                                                    fill={isFav ? "#ef4444" : "none"}
                                                                    stroke={isFav ? "#ef4444" : "#1e293b"}
                                                                    strokeWidth="2.2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Details */}
                                                        <div className={styles.cardContent}>
                                                            {(item.addedDate || item.code) && (
                                                                <PropertyBadgeRow>
                                                                    <PropertyIdBadge code={item.code} />
                                                                    {item.addedDate && (
                                                                        <span className={styles.cardAddedDate} title={`Added on ${item.addedDate}`}>
                                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                                                <line x1="3" y1="10" x2="21" y2="10" />
                                                                            </svg>
                                                                            {item.addedDate}
                                                                        </span>
                                                                    )}
                                                                </PropertyBadgeRow>
                                                            )}
                                                            <h3 className={styles.cardTitle}>{item.title}</h3>

                                                            {/* Location */}
                                                            <div className={styles.locationRow}>
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                                    <circle cx="12" cy="10" r="3" />
                                                                </svg>
                                                                <span>{item.location}</span>
                                                            </div>

                                                            {/* Price, Added Date & Own Property badge */}
                                                            <div className={styles.priceRow}>
                                                                <div className={styles.price}>{item.price}</div>
                                                                <div className={styles.priceRightGroup}>

                                                                    {isOwn && (
                                                                        <span className={styles.ownPropertyBadge}>
                                                                            Own Property
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Meta Specifications */}
                                                            <div className={styles.metaGrid}>
                                                                {item.beds ? (
                                                                    <>
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <path d="M2 4v16M2 8h20v12M2 12h20M18 4v4" />
                                                                            </svg>
                                                                            <span>{item.beds}</span>
                                                                        </div>
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1zM6 12V5a2 2 0 0 1 2-2h3v9" />
                                                                            </svg>
                                                                            <span>{item.baths}</span>
                                                                        </div>
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                            </svg>
                                                                            <span>{item.area}</span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                                                                            </svg>
                                                                            <span>{item.cent || item.area || "Plot"}</span>
                                                                        </div>
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <circle cx="12" cy="12" r="10" />
                                                                                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                                                            </svg>
                                                                            <span>{item.facing ? (item.facing.toLowerCase().includes('facing') ? item.facing : `${item.facing} Facing`) : item.type}</span>
                                                                        </div>
                                                                        <div className={styles.metaItem}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                                            </svg>
                                                                            <span>{item.ownership || "Freehold"}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    ) : isFiltering ? (
                                        <div className={viewMode === "grid" ? styles.propertyGrid : styles.propertyList}>
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className={styles.propertyCard} style={{ opacity: 0.6, pointerEvents: "none" }}>
                                                    <div className={styles.imageWrapper} style={{ background: "#e2e8f0", minHeight: "220px" }} />
                                                    <div className={styles.cardContent} style={{ padding: "16px" }}>
                                                        <div style={{ height: "18px", width: "70%", background: "#e2e8f0", borderRadius: "4px", marginBottom: "10px" }} />
                                                        <div style={{ height: "14px", width: "45%", background: "#f1f5f9", borderRadius: "4px", marginBottom: "12px" }} />
                                                        <div style={{ height: "20px", width: "35%", background: "#e2e8f0", borderRadius: "4px" }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.noResults}>
                                            <NoPropertiesFoundArt />
                                            <h3 className={styles.noResultsTitle}>No Properties Found</h3>
                                            <p className={styles.noResultsSub}>
                                                We couldn&rsquo;t find any properties matching your search.
                                            </p>
                                            <p className={styles.noResultsSub}>
                                                Try different keywords or adjust your search criteria.
                                            </p>

                                            <div className={styles.noResultsButtonsRow}>
                                                <button
                                                    type="button"
                                                    className={styles.clearSearchBtn}
                                                    onClick={clearAllFilters}
                                                >
                                                    <RiRefreshLine />
                                                    <span>Clear Search</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.browseAllPropertiesBtn}
                                                    onClick={clearAllFilters}
                                                >
                                                    <RiHome4Line />
                                                    <span>Browse All Properties</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Pagination Component */}
                                {filteredProperties.length > 0 && (
                                    <div className={styles.paginationWrapper}>
                                        <span className={styles.paginationInfo}>
                                            Showing {firstOnPage + 1} - {firstOnPage + pagedProperties.length} of {apiMeta.total || filteredProperties.length} Properties
                                        </span>

                                        <div className={styles.paginationNav}>
                                            {/* Previous Button */}
                                            <button
                                                type="button"
                                                className={styles.pageBtn}
                                                disabled={safePage === 1}
                                                onClick={() => handlePageChange(safePage - 1)}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M15 18l-6-6 6-6" />
                                                </svg>
                                                Prev
                                            </button>

                                            {/* Page Numbers with Smart Sliding Window */}
                                            {getPaginationItems().map((item, idx) => {
                                                if (item === "...") {
                                                    return (
                                                        <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
                                                            …
                                                        </span>
                                                    );
                                                }
                                                const pageNum = item;
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        type="button"
                                                        className={`${styles.pageBtn} ${safePage === pageNum ? styles.pageBtnActive : ""}`}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        aria-current={safePage === pageNum ? "page" : undefined}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            {/* Next Button */}
                                            <button
                                                type="button"
                                                className={styles.pageBtn}
                                                disabled={safePage === totalPages}
                                                onClick={() => handlePageChange(safePage + 1)}
                                            >
                                                Next
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M9 18l6-6-6-6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                    </main>
                </div>
            </div>

            {/* ========================================== */}
            {/* AI SEARCH POPUP MODAL                     */}
            {/* ========================================== */}
            {isModalOpen && (
                <PropertiesAiSearchModal
                    changeSearchTerm={changeSearchTerm}
                    handleSuggestionSelect={handleSuggestionSelect}
                    searchTerm={searchTerm}
                    setIsModalOpen={setIsModalOpen}
                    setSearchTerm={setSearchTerm}
                    suggestions={suggestions}
                    typingSuggestions={typingSuggestions}
                />
            )}

        </div>
    );
}
