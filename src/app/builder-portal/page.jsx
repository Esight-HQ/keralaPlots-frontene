"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import styles from "./builderPortal.module.css";
import {
    RiBuilding2Line,
    RiUploadCloud2Line,
    RiImageAddLine,
    RiDeleteBinLine,
    RiEditLine,
    RiAddLine,
    RiCheckLine,
    RiShieldCheckLine,
    RiVerifiedBadgeFill,
    RiMapPin2Line,
    RiPhoneFill,
    RiWhatsappLine,
    RiMailLine,
    RiArrowRightLine,
    RiCloseLine,
    RiSmartphoneLine,
    RiComputerLine,
    RiTabletLine,
    RiFileCopyLine,
    RiSparklingLine,
    RiMagicLine,
    RiRefreshLine,
    RiCalendarLine,
    RiHomeSmileLine,
    RiLockLine,
    RiFileList3Line,
    RiRoadMapLine,
    RiBankLine,
    RiCheckboxCircleLine,
    RiArrowDownSLine,
    RiLayoutGridLine,
    RiLayoutMasonryLine,
    RiShareForwardLine,
    RiDownloadLine,
    RiBookmarkLine,
    RiStarFill,
    RiCropLine,
    RiMoneyRupeeCircleLine,
    RiGalleryLine,
    RiArrowLeftSLine,
    RiArrowRightSLine,
    RiLoader4Line,
    RiInboxArchiveLine,
    RiVipCrownLine,
    RiAlertLine,
} from "react-icons/ri";
import { builderApi } from "../lib/api";
import { agentSubscriptionApi } from "../lib/agentSubscriptionApi";
import {
    CorporateKeyFacts,
    CorporateTrustStats,
    CorporateQuickNav,
    CorporateOverview,
    CorporateSpecs,
    CorporateProjects,
    CorporateUnits,
    CorporateNeighborhood,
    CorporateContact,
} from "./CorporateSections";
import BannerCropModal from "./BannerCropModal";
import LogoCropModal from "./LogoCropModal";
import ProjectCropModal from "./ProjectCropModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import SectionModal from "./SectionModal";
import BuilderSearchableSelect, { mergeUniqueOptions } from "./BuilderSearchableSelect";

import { DUMMY_BUILDER_DATA } from "./dummyBuilderData";

const STORAGE_KEY = "kp_builder_custom_webpage_data";

// Breaks a long add/edit form into clearly labeled steps so the user can
// scan what's left instead of facing one undifferentiated wall of fields.
function FieldGroupHeading({ icon: Icon, children }) {
    return (
        <div className={styles.fieldGroupHeading}>
            {Icon && <Icon />}
            <span>{children}</span>
        </div>
    );
}

function ReqStar() {
    return (
        <span style={{ color: "#ef4444", marginLeft: "3px", fontWeight: 700 }} aria-hidden="true">
            *
        </span>
    );
}

function FieldError({ msg }) {
    if (!msg) return null;
    return (
        <p
            role="alert"
            data-field-error="true"
            style={{
                color: "#dc2626",
                fontSize: "12px",
                fontWeight: 600,
                marginTop: "5px",
                marginBottom: 0,
                display: "flex",
                alignItems: "center",
                gap: "4px",
            }}
        >
            <RiAlertLine style={{ flexShrink: 0, fontSize: "13.5px" }} />
            <span>{msg}</span>
        </p>
    );
}

const INVALID_INPUT_STYLE = { borderColor: "#ef4444", backgroundColor: "#fffafb" };
const INVALID_UPLOAD_STYLE = { borderColor: "#ef4444", backgroundColor: "#fff5f5" };

// Bank "logo" monogram: HDFC Bank -> HDFC, State Bank of India -> SBI
const BANK_STOPWORDS = new Set(["of", "the", "and", "&", "ltd", "limited"]);
const BANK_COLORS = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2", "#4f46e5", "#be185d"];
const getBankInitials = (name) => {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "?";
    if (/^[A-Z]{2,5}$/.test(words[0])) return words[0];
    const initials = words
        .filter((w) => !BANK_STOPWORDS.has(w.toLowerCase()))
        .map((w) => w.charAt(0).toUpperCase())
        .join("");
    return initials.slice(0, 4) || words[0].charAt(0).toUpperCase();
};
const getBankColor = (index) => BANK_COLORS[index % BANK_COLORS.length];
// Stable colour per bank name (same bank → same colour everywhere).
const bankColorFor = (name) => {
    let hash = 0;
    for (const ch of String(name || "")) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return BANK_COLORS[hash % BANK_COLORS.length];
};

/* Hide broken images (offline / expired URLs) instead of showing alt text,
   and reveal them again once a new source loads successfully. */
const hideBrokenImg = (e) => {
    e.currentTarget.style.visibility = "hidden";
};
const showLoadedImg = (e) => {
    e.currentTarget.style.visibility = "";
};

/* The live preview adapts to the width it is actually rendered at (not the
   browser viewport), so a desktop preview squeezed beside the editor, the
   tablet / mobile device frames and real phones all get the right layout. */
const PREVIEW_MOBILE_MAX = 640;
const PREVIEW_TABLET_MAX = 1000;
const getPreviewLayout = (width) => {
    if (width <= PREVIEW_MOBILE_MAX) return "mobile";
    if (width <= PREVIEW_TABLET_MAX) return "tablet";
    return "desktop";
};

/* Safe ID generator for React 19 */
const generateUniqueId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/* Character length limits */
const MAX_HEADLINE_LENGTH = 80;
const MAX_TAGLINE_LENGTH = 120;
const MAX_ABOUT_LENGTH = 600;

/* Curated architectural presets */
const BANNER_PRESETS = [
    {
        id: "preset-1",
        label: "Luxury Villa",
        url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop&q=80",
    },
    {
        id: "preset-2",
        label: "Vedaanta Lotus — Guruvayur",
        url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=80",
    },
    {
        id: "preset-3",
        label: "Contemporary Estate",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80",
    },
    {
        id: "preset-4",
        label: "Tropical Mansion",
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&auto=format&fit=crop&q=80",
    },
];

const BUILDER_CATEGORIES = [
    "Residential Builder & Developer",
    "Luxury Villa Developer",
    "Apartment & High-Rise Developer",
    "Gated Community & Plot Developer",
    "Waterfront & Luxury Residences",
    "Senior Living & Retirement Communities",
    "Commercial & Retail Developer",
    "Integrated Township Developer",
    "Eco & Sustainable Architecture",
    "Building Contractor & Engineering",
];

const CURRENT_YEAR = new Date().getFullYear();
const ESTABLISHED_YEARS = Array.from(
    { length: CURRENT_YEAR - 1950 + 1 },
    (_, i) => String(CURRENT_YEAR - i)
);

const KERALA_DISTRICTS_LIST = [
    "Ernakulam (Kochi)",
    "Thiruvananthapuram",
    "Thrissur",
    "Kozhikode (Calicut)",
    "Kottayam",
    "Palakkad",
    "Kollam",
    "Kannur",
    "Alappuzha",
    "Malappuram",
    "Pathanamthitta",
    "Idukki",
    "Wayanad",
    "Kasaragod",
];

const LAND_AREA_OPTIONS = [
    "25 Cents (~0.25 Acres)",
    "40 Cents (~1.5 Acres)",
    "50 Cents (~0.5 Acres)",
    "75 Cents (~0.75 Acres)",
    "1.0 Acre",
    "1.5 Acres",
    "2.0 Acres",
    "2.5 Acres",
    "3.5 Acres",
    "5.0 Acres",
    "7.5 Acres",
    "10.0+ Acres (Integrated Campus)",
];

const TOWERS_OPTIONS = [
    "1 Tower (G + 4 Floors)",
    "1 Tower (G + 9 Floors)",
    "1 Tower (G + 12 Floors)",
    "1 Tower (G + 14 Floors)",
    "2 Towers (G + 12 Floors)",
    "2 Towers (G + 14 Floors)",
    "3 Towers (G + 15 Floors)",
    "4 Towers (G + 18 Floors)",
    "Gated Community (Independent Villas)",
    "Exclusive Plotted Development",
];

const TOTAL_UNITS_OPTIONS = [
    "12 Luxury Signature Villas",
    "24 Exclusive Villas / Suites",
    "36 Premium Apartments",
    "48 Apartments",
    "68 Senior Apartments",
    "84 Apartments",
    "120 Luxury Units",
    "160 Apartments (2 Towers)",
    "240 High-Rise Condos",
    "300+ Master-Planned Community Units",
];

const POSSESSION_OPTIONS = [
    "Ready to Move",
    "Ready to Move (Handover in progress)",
    "Under Construction (Possession 2025)",
    "Under Construction (Possession 2026)",
    "Under Construction (Possession 2027)",
    "Under Construction (Possession 2028)",
    "Newly Launched (Pre-Booking Open)",
    "Nearing Completion (Finishing Stage)",
];

const CONFIG_TYPE_OPTIONS = [
    "Studio / 1 RK",
    "1 BHK",
    "1.5 BHK",
    "2 BHK",
    "2.5 BHK",
    "3 BHK",
    "3.5 BHK",
    "4 BHK",
    "4+ BHK",
    "Penthouse",
    "Villa",
];

const CONSTRUCTION_PROGRESS_OPTIONS = [
    "Just Launched (0% Complete)",
    "15% Complete",
    "25% Complete",
    "40% Complete",
    "50% Complete",
    "65% Complete",
    "75% Complete",
    "90% Complete",
    "100% Complete (Ready to Move)",
];

const POPULAR_LOAN_BANKS = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Federal Bank",
    "Canara Bank",
    "Axis Bank",
    "Bank of Baroda",
    "Punjab National Bank",
    "South Indian Bank",
    "LIC Housing Finance",
    "Union Bank of India",
    "Kerala Gramin Bank",
];

const COMPLETED_PROJECTS_OPTIONS = [
    "3+ Projects",
    "5+ Projects",
    "10+ Projects",
    "12+ Projects",
    "15+ Projects",
    "20+ Projects",
    "25+ Projects",
    "35+ Projects",
    "50+ Projects",
    "75+ Projects",
    "100+ Projects",
];

const ONGOING_PROJECTS_OPTIONS = [
    "1 Project",
    "2 Projects",
    "3 Projects",
    "4 Projects",
    "5 Projects",
    "6 Projects",
    "8 Projects",
    "10+ Projects",
    "12+ Projects",
    "15+ Projects",
];

const HAPPY_FAMILIES_OPTIONS = [
    "150+ Families",
    "300+ Families",
    "500+ Families",
    "850+ Families",
    "1,000+ Families",
    "1,200+ Families",
    "1,500+ Families",
    "2,000+ Families",
    "2,500+ Families",
    "3,500+ Families",
    "5,000+ Families",
    "10,000+ Families",
];

const DELIVERED_SQFT_OPTIONS = [
    "250K+ Sq. Ft.",
    "500K+ Sq. Ft.",
    "750K+ Sq. Ft.",
    "1.0M+ Sq. Ft.",
    "1.1M+ Sq. Ft.",
    "1.5M+ Sq. Ft.",
    "2.0M+ Sq. Ft.",
    "2.4M+ Sq. Ft.",
    "3.0M+ Sq. Ft.",
    "5.0M+ Sq. Ft.",
    "7.5M+ Sq. Ft.",
    "10.0M+ Sq. Ft.",
];

const POPULAR_PROJECT_AMENITIES = [
    "Clubhouse",
    "Swimming Pool",
    "Gymnasium",
    "24/7 Security",
    "Children's Play Area",
    "Power Backup",
    "Landscaped Gardens",
    "Jogging Track",
    "EV Charging Point",
    "Intercom & CCTV",
];

const PROJECT_LOCATION_OPTIONS = [
    "Kakkanad, Kochi",
    "Marine Drive, Kochi",
    "Edappally, Kochi",
    "Panampilly Nagar, Kochi",
    "Aluva, Kochi",
    "Tripunithura, Kochi",
    "Kaloor, Kochi",
    "Kadavanthra, Kochi",
    "Vyttila, Kochi",
    "Vellayambalam, Trivandrum",
    "Kazhakoottam, Trivandrum",
    "Pattom, Trivandrum",
    "Kowdiar, Trivandrum",
    "East Hill, Kozhikode",
    "Palazhi, Kozhikode",
    "Kuriachira, Thrissur",
    "Round North, Thrissur",
    "Kottayam Central, Kottayam",
    "Chandanathope, Kollam",
    "Kanjikode, Palakkad",
];

const PROJECT_PRICE_OPTIONS = [
    "₹45 Lakhs - ₹75 Lakhs",
    "₹60 Lakhs - ₹95 Lakhs",
    "₹80 Lakhs - ₹1.25 Cr",
    "₹85 Lakhs - ₹1.75 Cr",
    "₹1.2 Cr - ₹2.2 Cr",
    "₹1.5 Cr - ₹3 Cr",
    "₹2 Cr - ₹4.5 Cr",
    "₹3 Cr - ₹7 Cr",
    "₹5 Cr - ₹12 Cr (Ultra Luxury)",
    "₹40 Lakhs onwards",
    "₹75 Lakhs onwards",
    "₹1.25 Cr onwards",
    "₹2.5 Cr onwards",
    "Price on Request",
];

const PROJECT_CATEGORY_OPTIONS = [
    "2 & 3 BHK Luxury Apartments",
    "3 & 4 BHK Luxury Villas",
    "4 & 5 BHK Waterfront Signature Villas",
    "Ultra-Luxury Penthouse & Sky Residences",
    "Premium High-Rise Gated Community",
    "Waterfront Luxury Residences",
    "Gated Villa Community",
    "Boutique Residential Suites",
    "Green Eco-Living Township",
    "Residential Land & Developed Plots",
    "Commercial Retail & Office Spaces",
];

const EMPTY_NEW_PROJECT = {
    title: "",
    type: "",
    location: "",
    price: "",
    status: "",
    reraNumber: "",
    possessionDate: "",
    highlights: "",
    image: "",
    amenities: [],
    landArea: "",
    towers: "",
    totalUnits: "",
    constructionProgress: "",
    configurations: [],
    gallery: [],
    brochureUrl: "",
    brochureName: "",
    neighborhood: [],
};

const GALLERY_CATEGORY_OPTIONS = ["Exterior", "Interior", "Amenities", "Floor Plan", "Master Plan"];

const PROPERTY_TITLE_OPTIONS = [
    "Type A — 2 BHK Premium",
    "Type B — 2.5 BHK Luxury",
    "Type C — 3 BHK Grand",
    "Type D — 3 BHK Sky Residence",
    "Type E — 4 BHK Luxury Villa",
    "Type F — 4 BHK Penthouse",
    "Type G — 5 BHK Sky Mansion",
    "Studio Suite / Compact 1 BHK",
    "Independent Duplex Villa",
    "Custom Configuration",
];

const PROPERTY_SQFT_OPTIONS = [
    "750 sq.ft",
    "950 sq.ft",
    "1,150 sq.ft",
    "1,350 sq.ft",
    "1,550 sq.ft",
    "1,650 sq.ft",
    "1,850 sq.ft",
    "2,150 sq.ft",
    "2,450 sq.ft",
    "2,850 sq.ft",
    "3,200 sq.ft",
    "3,800 sq.ft",
    "4,500+ sq.ft",
];

const PROPERTY_PRICE_OPTIONS = [
    "₹45 Lakhs",
    "₹55 Lakhs",
    "₹68 Lakhs",
    "₹75 Lakhs",
    "₹85 Lakhs",
    "₹95 Lakhs",
    "₹1.15 Cr",
    "₹1.35 Cr",
    "₹1.65 Cr",
    "₹1.95 Cr",
    "₹2.25 Cr",
    "₹2.85 Cr",
    "₹3.50 Cr",
    "₹4.50 Cr+",
    "Price on request",
];

const PROPERTY_ROOMS_OPTIONS = [
    "1 Bed • 1 Bath",
    "2 Beds • 2 Baths",
    "2 Beds • 2 Baths • Balcony",
    "3 Beds • 3 Baths",
    "3 Beds • 3 Baths • Balcony",
    "3 Beds • 3 Baths • Maid Room",
    "4 Beds • 4 Baths • Balcony",
    "4 Beds • 4 Baths • Maid Room & Study",
    "5 Beds • 5 Baths • Private Terrace",
    "Duplex Layout • 4 Beds • 4 Baths",
];

const PROPERTY_STATUS_OPTIONS = [
    "Available",
    "Ready to Move",
    "Under Construction",
    "Only 2 Units Left",
    "Only 1 Unit Left",
    "Fast Selling",
    "Under Offer",
    "Sold Out",
    "Booking Open",
];

const EMPTY_NEW_PROPERTY = {
    title: "",
    sqft: "",
    price: "",
    rooms: "",
    status: "Available",
    image: "",
};

const SPECIFICATION_CATEGORY_OPTIONS = [
    "Civil Structure",
    "Flooring & Tiling",
    "Doors & Windows",
    "Kitchen & Utility",
    "Sanitary & CP Fittings",
    "Electrical & Wiring",
    "Painting & Finishes",
    "Elevators & Lifts",
    "Security & Surveillance",
    "Water Supply & Treatment",
    "Power Backup & Energy",
    "Custom Category",
];

const SPEC_CATEGORY_SUGGESTIONS = {
    "Civil Structure": "RCC framed earthquake-resistant structure with solid block masonry and premium plaster finishes conforming to IS standards.",
    "Flooring & Tiling": "Italian marble / 800x800mm double charged vitrified tiles in living/dining; laminated wooden flooring in master bedroom; anti-skid ceramic tiles in balconies.",
    "Doors & Windows": "Teak wood main entrance door with digital biometric lock; factory-finished engineered flush interior doors; UPVC / powder-coated heavy aluminium sliding windows.",
    "Kitchen & Utility": "Polished granite platform with stainless steel double bowl sink, reticulated piped gas supply provision, and premium ceramic wall dado up to 2 feet.",
    "Sanitary & CP Fittings": "Wall-hung EWC with concealed cisterns, thermostatic diverters, premium chromium-plated fittings from Grohe / Kohler / Jaguar or equivalent.",
    "Electrical & Wiring": "Concealed fire-retardant copper wiring from Finolex / Havells, modular touch-switches from Legrand / Schneider, dedicated EV charging conduits.",
    "Painting & Finishes": "Interior walls finished with acrylic emulsion over double-coat putty; exterior weather-proof silicone texture paint from Asian Paints / Jotun.",
    "Elevators & Lifts": "High-speed automatic 8 to 13 passenger stretcher elevators from Otis / Schindler with ARD (Automatic Rescue Device) and CCTV surveillance.",
    "Security & Surveillance": "24/7 round-the-clock security with multi-tier access control, boom barriers, video door phone intercom, and perimeter infrared sensors.",
    "Water Supply & Treatment": "Hydro-pneumatic pressurized water supply system, treated drinking water through centralized multi-stage RO and STP plant.",
    "Power Backup & Energy": "100% full DG generator backup for elevators, common areas, and designated light/fan loads inside individual residences.",
};

const EMPTY_NEW_SPEC = {
    category: "",
    details: "",
    image: "",
};

const NEIGHBORHOOD_CATEGORY_OPTIONS = [
    "Transit & Metro Station",
    "IT Park & Tech Corridor",
    "International Airport",
    "Super Specialty Hospital",
    "Shopping Mall & Entertainment",
    "School & Educational Hub",
    "Worship & Cultural Center",
    "National Highway & Expressway",
    "Financial & Commercial Center",
    "Railway Station",
    "Custom Category",
];

const NEIGHBORHOOD_DISTANCE_OPTIONS = [
    "200 Meters (Walking distance)",
    "500 Meters (2 Mins walk)",
    "1.0 Km (3 Mins drive)",
    "2.0 Km (5 Mins drive)",
    "3.5 Km (7 Mins drive)",
    "5.0 Km (10 Mins drive)",
    "8.0 Km (15 Mins drive)",
    "12.0 Km (20 Mins drive)",
    "18.0 Km (25 Mins drive)",
    "25.0 Km (35 Mins / Airport drive)",
    "Custom Distance",
];

const POPULAR_LANDMARK_PRESETS = [
    "Kochi Metro Station",
    "Infopark Kochi",
    "SmartCity Kochi",
    "Cochin International Airport",
    "Lulu International Mall",
    "Aster Medcity",
    "Rajagiri Hospital",
    "Amrita Hospital",
    "Chottanikkara Temple",
    "Edappally Toll Junction",
    "Central Railway Station",
    "NH 66 Expressway",
];

const LANDMARK_PRESET_CATEGORIES = {
    "Kochi Metro Station": "Transit & Metro Station",
    "Infopark Kochi": "IT Park & Tech Corridor",
    "SmartCity Kochi": "IT Park & Tech Corridor",
    "Cochin International Airport": "International Airport",
    "Lulu International Mall": "Shopping Mall & Entertainment",
    "Aster Medcity": "Super Specialty Hospital",
    "Rajagiri Hospital": "Super Specialty Hospital",
    "Amrita Hospital": "Super Specialty Hospital",
    "Chottanikkara Temple": "Worship & Cultural Center",
    "Edappally Toll Junction": "National Highway & Expressway",
    "Central Railway Station": "Railway Station",
    "NH 66 Expressway": "National Highway & Expressway",
};

const EMPTY_NEW_NEIGHBORHOOD = {
    landmark: "",
    category: "Transit & Metro Station",
    distance: "1.0 Km (3 Mins drive)",
};

/* Initial empty state for first-time entrance */
const EMPTY_BUILDER_DATA = {
    template: "corporate",
    companyName: "",
    headline: "",
    tagline: "",
    logoUrl: "",
    bannerUrl: "",
    heroGallery: [],
    builderType: "",
    reraNumber: "",
    establishedYear: "",
    headquarters: "",
    fullAddress: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    about: "",
    stats: {
        completedProjects: "",
        ongoingProjects: "",
        happyFamilies: "",
        deliveredSqFt: "",
    },
    keyFacts: {
        landArea: "",
        towers: "",
        totalUnits: "",
        possession: "",
        approvedBanks: [],
    },
    specifications: [],
    neighborhood: [],
    projects: [],
    properties: [],
};
const loadSavedBuilderData = () => {
    if (typeof window === "undefined") return null;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        return {
            ...EMPTY_BUILDER_DATA,
            ...parsed,
            stats: { ...EMPTY_BUILDER_DATA.stats, ...(parsed.stats || {}) },
            keyFacts: { ...EMPTY_BUILDER_DATA.keyFacts, ...(parsed.keyFacts || {}) },
            specifications: parsed.specifications || [],
            neighborhood: parsed.neighborhood || [],
            projects: parsed.projects || [],
            properties: parsed.properties || [],
        };
    } catch {
        return null;
    }
};

// Order + labels for the section popup's left rail and Previous / Next buttons.
const SECTION_META = [
    { key: "branding", title: "Branding & Hero Banner", icon: RiImageAddLine },
    { key: "details", title: "Details & Key Facts", icon: RiBuilding2Line },
    { key: "projects", title: "Featured Projects", icon: RiHomeSmileLine },
    { key: "properties", title: "Units & Floor Plans", icon: RiCalendarLine },
    { key: "specs", title: "Building Specifications", icon: RiFileList3Line },
    { key: "contact", title: "Contact & Enquiries", icon: RiPhoneFill },
];

const ALL_SECTIONS_CLOSED = {
    branding: false,
    details: false,
    projects: false,
    properties: false,
    specs: false,
    contact: false,
};

export default function BuilderPortalPage() {
    // Start from the empty template on both server and client (avoids a hydration
    // mismatch), then restore saved website data from backend API / localStorage after mount.
    const [data, setData] = useState(EMPTY_BUILDER_DATA);
    const [authStatus, setAuthStatus] = useState("loading"); // loading | approved | pending | resubmission_required | rejected | unregistered
    const [websiteMeta, setWebsiteMeta] = useState(null);
    const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState("");
    const [builderSubscription, setBuilderSubscription] = useState(null);
    const [quotaAlert, setQuotaAlert] = useState("");
    const [enquiriesList, setEnquiriesList] = useState([]);
    const [isEnquiriesOpen, setIsEnquiriesOpen] = useState(false);
    const saveTimerRef = useRef(null);

    // Custom dropdown options entered by the user during this session, avoids duplicates and automatically merges
    const [customDropdownOptions, setCustomDropdownOptions] = useState({});

    const handleAddNewDropdownOption = (fieldKey, newVal) => {
        if (!newVal || typeof newVal !== "string") return;
        const trimmed = newVal.trim();
        if (!trimmed) return;
        setCustomDropdownOptions((prev) => {
            const existing = prev[fieldKey] || [];
            if (existing.some((x) => x.toLowerCase() === trimmed.toLowerCase())) {
                return prev;
            }
            return {
                ...prev,
                [fieldKey]: [...existing, trimmed],
            };
        });
    };

    const getFieldOptions = (fieldKey, presetOptions, dataValues = []) => {
        return mergeUniqueOptions(presetOptions, customDropdownOptions[fieldKey], dataValues);
    };

    const fetchEnquiries = async () => {
        try {
            const enqRes = await builderApi.getEnquiries();
            const list = enqRes?.data || enqRes?.enquiries;
            if (enqRes && enqRes.success && Array.isArray(list)) {
                setEnquiriesList(list);
            }
        } catch { }
        try {
            const localEnqs = JSON.parse(localStorage.getItem("kp_builder_enquiries") || "[]");
            if (Array.isArray(localEnqs) && localEnqs.length > 0) {
                setEnquiriesList((prev) => {
                    const existingIds = new Set(prev.map((e) => String(e.id)));
                    const additional = localEnqs.filter((e) => !existingIds.has(String(e.id)));
                    return [...prev, ...additional];
                });
            }
        } catch { }
    };

    useEffect(() => {
        let mounted = true;

        async function initPortal() {
            const localSaved = loadSavedBuilderData();
            if (localSaved && mounted) {
                setData(localSaved);
            }

            try {
                const websiteRes = await builderApi.getWebsite();
                if (!mounted) return;
                if (websiteRes && websiteRes.success) {
                    setAuthStatus(websiteRes.builder?.approval_status || "approved");
                    setWebsiteMeta(websiteRes.website);
                    if (websiteRes.subscription) {
                        setBuilderSubscription(websiteRes.subscription);
                    }
                    if (websiteRes.data) {
                        const merged = {
                            ...EMPTY_BUILDER_DATA,
                            ...websiteRes.data,
                            heroGallery: Array.isArray(websiteRes.data.heroGallery) ? websiteRes.data.heroGallery : (localSaved?.heroGallery || []),
                            stats: { ...EMPTY_BUILDER_DATA.stats, ...(websiteRes.data.stats || {}) },
                            keyFacts: { ...EMPTY_BUILDER_DATA.keyFacts, ...(websiteRes.data.keyFacts || {}) },
                            specifications: (websiteRes.data.specifications || []).map((s, idx) => {
                                if (s?.image) return s;
                                const localList = Array.isArray(localSaved?.specifications) ? localSaved.specifications : [];
                                const localMatch = localList.find((ls) => String(ls.id) === String(s.id))
                                    || (localList[idx] && localList[idx].category === s.category ? localList[idx] : null);
                                return localMatch?.image ? { ...s, image: localMatch.image } : s;
                            }),
                            neighborhood: websiteRes.data.neighborhood || [],
                            projects: websiteRes.data.projects || [],
                            properties: websiteRes.data.properties || [],
                        };
                        setData(merged);
                        try {
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                        } catch { }
                    }
                    try {
                        const enqRes = await builderApi.getEnquiries();
                        const list = enqRes?.data || enqRes?.enquiries;
                        if (enqRes && enqRes.success && Array.isArray(list)) {
                            setEnquiriesList(list);
                        }
                    } catch { }
                    return;
                }
            } catch (err) {
                console.warn("Website check note, verifying builder status:", err?.message || err);
            }

            try {
                const statusRes = await builderApi.status();
                if (!mounted) return;
                const builderObj = statusRes?.builder || statusRes?.registration;
                if (statusRes && statusRes.has_applied && builderObj) {
                    setAuthStatus(statusRes.status || builderObj.approval_status || "pending");
                    setData((prev) => ({
                        ...(localSaved || prev),
                        companyName: prev.companyName || builderObj.company_name || "",
                        builderType: prev.builderType || builderObj.builder_type || "",
                        establishedYear: prev.establishedYear || (builderObj.established_year ? String(builderObj.established_year) : ""),
                        reraNumber: prev.reraNumber || builderObj.rera_number || "",
                        phone: prev.phone || builderObj.mobile_number || "",
                        whatsapp: prev.whatsapp || builderObj.mobile_number || "",
                        email: prev.email || builderObj.email || "",
                        website: prev.website || builderObj.company_website || "",
                        headquarters: prev.headquarters || builderObj.district || "",
                        about: prev.about || builderObj.company_description || "",
                    }));
                } else {
                    setAuthStatus("unregistered");
                    if (!localSaved) {
                        setData(JSON.parse(JSON.stringify(DUMMY_BUILDER_DATA)));
                    }
                }
            } catch {
                if (mounted) {
                    setAuthStatus("unregistered");
                    if (!localSaved) {
                        setData(JSON.parse(JSON.stringify(DUMMY_BUILDER_DATA)));
                    }
                }
            }
        }

        initPortal();

        const refreshSubFromEntitlements = async () => {
            try {
                const entRes = await agentSubscriptionApi.getUnifiedSubscriptions();
                const activeB = entRes?.data?.active_builder_subscription;
                if (activeB && activeB.is_active) {
                    setBuilderSubscription({
                        has_active_plan: true,
                        subscription_id: activeB.id,
                        plan_id: activeB.plan_id,
                        plan_title: activeB.plan_title,
                        project_limit: activeB.project_limit,
                        project_unlimited: activeB.project_unlimited,
                        project_used: activeB.project_used,
                        project_remaining: activeB.project_remaining,
                        unit_limit: activeB.unit_limit,
                        unit_unlimited: activeB.unit_unlimited,
                        unit_used: activeB.unit_used,
                        unit_remaining: activeB.unit_remaining,
                        days_remaining: activeB.days_remaining,
                        expires_at_formatted: activeB.expires_at_formatted,
                    });
                } else if (entRes?.success) {
                    setBuilderSubscription((prev) => ({
                        ...(prev || {}),
                        has_active_plan: false,
                        plan_title: null,
                        project_limit: 0,
                        project_unlimited: false,
                        unit_limit: 0,
                        unit_unlimited: false,
                    }));
                }
            } catch {}
        };

        let bc = null;
        if (typeof BroadcastChannel !== "undefined") {
            try {
                bc = new BroadcastChannel("kp_subscriptions_sync");
                bc.onmessage = () => refreshSubFromEntitlements();
            } catch {}
        }
        const onWindowFocus = () => refreshSubFromEntitlements();
        if (typeof window !== "undefined") {
            window.addEventListener("focus", onWindowFocus);
        }

        return () => {
            mounted = false;
            if (bc) {
                try { bc.close(); } catch {}
            }
            if (typeof window !== "undefined") {
                window.removeEventListener("focus", onWindowFocus);
            }
        };
    }, []);

    // Studio Accordion Sections State
    const [openSections, setOpenSections] = useState({
        branding: false,
        details: false,
        projects: false,
        properties: false,
        specs: false,
        contact: false,
    });

    // Each section's editor opens in a popup — only one at a time.
    const toggleSection = (key) => {
        setOpenSections({ ...ALL_SECTIONS_CLOSED, [key]: true });
    };

    // Deep-link support from Dashboard quick-actions (?section=projects or ?section=units)
    useEffect(() => {
        if (typeof window === "undefined") return;
        const requested = new URLSearchParams(window.location.search).get("section");
        if (requested === "projects") {
            setOpenSections({ ...ALL_SECTIONS_CLOSED, projects: true });
        } else if (requested === "units" || requested === "properties") {
            setOpenSections({ ...ALL_SECTIONS_CLOSED, properties: true });
        }
    }, []);

    const closeSections = () => {
        setOpenSections({ ...ALL_SECTIONS_CLOSED });
    };

    const expandAll = () => {
        setOpenSections({
            branding: true,
            details: true,
            projects: true,
            properties: true,
            specs: true,
            contact: true,
        });
    };

    const collapseAll = () => {
        setOpenSections({
            branding: false,
            details: false,
            projects: false,
            properties: false,
            specs: false,
            contact: false,
        });
    };

    // Section & Form Validation Error States
    const [brandingErrors, setBrandingErrors] = useState({});
    const [detailsErrors, setDetailsErrors] = useState({});
    const [newProjectErrors, setNewProjectErrors] = useState({});
    const [editProjectErrors, setEditProjectErrors] = useState({});
    const [newUnitErrors, setNewUnitErrors] = useState({});
    const [editUnitErrors, setEditUnitErrors] = useState({});
    const [newSpecErrors, setNewSpecErrors] = useState({});
    const [editSpecErrors, setEditSpecErrors] = useState({});

    const scrollModalFirstError = () => {
        if (typeof document === "undefined") return;
        requestAnimationFrame(() => {
            const errEl = document.querySelector('[data-field-error="true"]');
            if (errEl) {
                errEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    };

    const computeBrandingErrors = (d = data) => {
        const errs = {};
        if (!String(d?.logoUrl || "").trim()) errs.logoUrl = "Company Logo required";
        if (!String(d?.bannerUrl || "").trim()) errs.bannerUrl = "Hero Banner Background required";
        if (!String(d?.headline || "").trim()) errs.headline = "Hero Headline required";
        if (!String(d?.tagline || "").trim()) errs.tagline = "Tagline / Vision Statement required";
        return errs;
    };

    const computeDetailsErrors = (d = data) => {
        const errs = {};
        if (!String(d?.companyName || "").trim()) errs.companyName = "Company Full Legal Name required";
        if (!String(d?.builderType || "").trim()) errs.builderType = "Builder Category required";
        if (!String(d?.establishedYear || "").trim()) errs.establishedYear = "Founded Year required";
        if (!String(d?.reraNumber || "").trim()) errs.reraNumber = "K-RERA Number required";
        if (!String(d?.fullAddress || "").trim()) errs.fullAddress = "Registered Head Office Address required";
        if (!String(d?.about || "").trim()) errs.about = "About Company & Project Story required";
        if (!String(d?.stats?.completedProjects || "").trim()) errs.completedProjects = "Completed Projects required";
        if (!String(d?.stats?.ongoingProjects || "").trim()) errs.ongoingProjects = "Ongoing Projects required";
        if (!String(d?.stats?.happyFamilies || "").trim()) errs.happyFamilies = "Happy Families required";
        if (!String(d?.stats?.deliveredSqFt || "").trim()) errs.deliveredSqFt = "Delivered Sq. Ft. required";
        return errs;
    };

    const computeProjectErrors = (proj) => {
        const errs = {};
        if (!String(proj?.title || "").trim()) errs.title = "Project Title required";
        if (!String(proj?.location || "").trim()) errs.location = "Location / City required";
        if (!String(proj?.price || "").trim()) errs.price = "Price Range required";
        if (!String(proj?.status || "").trim()) errs.status = "Construction Status required";
        if (!String(proj?.type || "").trim()) errs.type = "Property Category required";
        if (!String(proj?.landArea || "").trim()) errs.landArea = "Land Area required";
        if (!String(proj?.towers || "").trim()) errs.towers = "Towers required";
        if (!String(proj?.totalUnits || "").trim()) errs.totalUnits = "Total Units required";
        if (!String(proj?.constructionProgress || "").trim()) errs.constructionProgress = "Construction Progress required";
        if (!String(proj?.image || "").trim()) errs.image = "Project Photo required";
        return errs;
    };

    const computeUnitErrors = (unit) => {
        const errs = {};
        if (!String(unit?.title || "").trim()) errs.title = "Floor Plan Title / Type required";
        if (!String(unit?.sqft || "").trim()) errs.sqft = "Super Built-up Area required";
        if (!String(unit?.price || "").trim()) errs.price = "Starting Price required";
        if (!String(unit?.rooms || "").trim()) errs.rooms = "Rooms / Bedrooms required";
        if (!String(unit?.image || "").trim()) errs.image = "Floor Plan / Unit Photo required";
        return errs;
    };

    const computeSpecErrors = (spec, excludeId = null, allSpecs = data.specifications || []) => {
        const errs = {};
        const cat = String(spec?.category || "").trim();
        if (!cat) {
            errs.category = "Specification Category required";
        } else {
            const isDup = allSpecs.some(
                (s) =>
                    String(s.id) !== String(excludeId ?? "") &&
                    String(s.category || "").trim().toLowerCase() === cat.toLowerCase()
            );
            if (isDup) {
                errs.category = "Specification Category already added — choose another category";
            }
        }
        if (!String(spec?.details || "").trim()) {
            errs.details = "Material & Engineering Standards required";
        }
        return errs;
    };

    // Section field completion calculator
    const getSectionProgress = (key) => {
        switch (key) {
            case "branding": {
                const fields = [
                    Boolean(data.logoUrl && data.logoUrl.trim()),
                    Boolean(data.bannerUrl && data.bannerUrl.trim()),
                    Boolean(data.headline && data.headline.trim()),
                    Boolean(data.tagline && data.tagline.trim()),
                ];
                const filled = fields.filter(Boolean).length;
                const percent = Math.round((filled / fields.length) * 100);
                return { filled, total: fields.length, percent, isComplete: percent === 100 };
            }
            case "details": {
                const fields = [
                    Boolean(data.companyName && data.companyName.trim()),
                    Boolean(data.builderType && data.builderType.trim()),
                    Boolean(data.establishedYear && String(data.establishedYear).trim()),
                    Boolean(data.reraNumber && data.reraNumber.trim()),
                    Boolean(data.fullAddress && data.fullAddress.trim()),
                    Boolean(data.about && data.about.trim()),
                    Boolean(data.stats?.completedProjects && data.stats.completedProjects.trim()),
                    Boolean(data.stats?.ongoingProjects && data.stats.ongoingProjects.trim()),
                    Boolean(data.stats?.happyFamilies && data.stats.happyFamilies.trim()),
                    Boolean(data.stats?.deliveredSqFt && data.stats.deliveredSqFt.trim()),
                ];
                const filled = fields.filter(Boolean).length;
                const percent = Math.round((filled / fields.length) * 100);
                return { filled, total: fields.length, percent, isComplete: percent === 100 };
            }
            case "contact": {
                const fields = [
                    Boolean(data.phone && data.phone.trim()),
                    Boolean(data.whatsapp && data.whatsapp.trim()),
                    Boolean(data.email && data.email.trim()),
                    Boolean(data.website && data.website.trim()),
                ];
                const filled = fields.filter(Boolean).length;
                const percent = Math.round((filled / fields.length) * 100);
                return { filled, total: fields.length, percent, isComplete: percent === 100 };
            }
            case "projects": {
                const list = data.projects || [];
                const count = list.length;
                const allValid = count > 0 && list.every((p) => Object.keys(computeProjectErrors(p)).length === 0);
                return { filled: count, total: 1, percent: allValid ? 100 : count > 0 ? 60 : 0, isComplete: allValid, count };
            }
            case "properties": {
                const list = data.properties || [];
                const count = list.length;
                const allValid = count > 0 && list.every((u) => Object.keys(computeUnitErrors(u)).length === 0);
                return { filled: count, total: 1, percent: allValid ? 100 : count > 0 ? 60 : 0, isComplete: allValid, count };
            }
            case "specs": {
                const list = data.specifications || [];
                const count = list.length;
                const allValid = count > 0 && list.every((s) => Object.keys(computeSpecErrors(s, s.id, list)).length === 0);
                return { filled: count, total: 1, percent: allValid ? 100 : count > 0 ? 60 : 0, isComplete: allValid, count };
            }
            case "location": {
                const count = data.neighborhood?.length || 0;
                return { filled: count, total: 1, percent: count > 0 ? 100 : 0, isComplete: count > 0, count };
            }
            case "template": {
                return { filled: 1, total: 1, percent: 100, isComplete: true };
            }
            default:
                return { filled: 0, total: 0, percent: 0, isComplete: false };
        }
    };

    const validateActiveSection = (sectionKey) => {
        if (sectionKey === "branding") {
            const errs = computeBrandingErrors();
            setBrandingErrors(errs);
            return Object.keys(errs).length === 0;
        }
        if (sectionKey === "details") {
            const errs = computeDetailsErrors();
            setDetailsErrors(errs);
            return Object.keys(errs).length === 0;
        }
        if (sectionKey === "projects") {
            if (isCreatingProject) {
                const errs = computeProjectErrors(newProjectData);
                setNewProjectErrors(errs);
                return Object.keys(errs).length === 0;
            }
            if (editingProjectId) {
                const proj = (data.projects || []).find((p) => p.id === editingProjectId);
                if (proj) {
                    const errs = computeProjectErrors(proj);
                    setEditProjectErrors(errs);
                    return Object.keys(errs).length === 0;
                }
            }
        }
        if (sectionKey === "properties") {
            if (isCreatingProperty) {
                const errs = computeUnitErrors(newPropertyData);
                setNewUnitErrors(errs);
                return Object.keys(errs).length === 0;
            }
            if (editingPropertyId) {
                const unit = (data.properties || []).find((u) => u.id === editingPropertyId);
                if (unit) {
                    const errs = computeUnitErrors(unit);
                    setEditUnitErrors(errs);
                    return Object.keys(errs).length === 0;
                }
            }
        }
        if (sectionKey === "specs") {
            if (isCreatingSpec) {
                const errs = computeSpecErrors(newSpecData);
                setNewSpecErrors(errs);
                return Object.keys(errs).length === 0;
            }
            if (editingSpecId) {
                const sp = (data.specifications || []).find((s) => s.id === editingSpecId);
                if (sp) {
                    const errs = computeSpecErrors(sp, sp.id);
                    setEditSpecErrors(errs);
                    return Object.keys(errs).length === 0;
                }
            }
        }
        return true;
    };

    // Shared props for every section popup (rail + Previous / Next navigation + validation).
    const sectionNav = {
        sections: SECTION_META.map((m) => ({ ...m, ...getSectionProgress(m.key) })),
        onNavigate: (key) => toggleSection(key),
        onDone: (activeKey) => validateActiveSection(activeKey),
        onBeforeNavigate: (fromKey) => validateActiveSection(fromKey),
    };

    const renderProgressBadge = (key) => {
        const prog = getSectionProgress(key);
        if (prog.isComplete) {
            return (
                <span className={`${styles.accordionBadge} ${styles.accordionBadgeCompleted}`}>
                    <RiCheckLine /> Completed
                </span>
            );
        }
        if (prog.percent > 0) {
            return (
                <span className={`${styles.accordionBadge} ${styles.accordionBadgeInProgress}`}>
                    {prog.percent}%
                </span>
            );
        }
        return (
            <span className={`${styles.accordionBadge} ${styles.accordionBadgeEmpty}`}>
                0%
            </span>
        );
    };

    // Overall progress score across the main sections
    const trackedSections = ["branding", "details", "projects", "properties", "specs", "contact"];
    const overallProgressPercent = Math.round(
        trackedSections.reduce((sum, key) => sum + getSectionProgress(key).percent, 0) / trackedSections.length
    );

    const [deviceView, setDeviceView] = useState("desktop"); // desktop | tablet | mobile
    const [mobileTab, setMobileTab] = useState("editor"); // 'editor' | 'preview'
    const [previewLayout, setPreviewLayout] = useState("desktop"); // measured: desktop | tablet | mobile
    const previewPageRef = useRef(null);

    // Switching between Editor and Preview on phones/tablets starts at the top
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth <= 1024) {
            window.scrollTo({ top: 0, behavior: "auto" });
            document
                .querySelectorAll("[data-panel-scroll]")
                .forEach((el) => el.scrollTo({ top: 0, behavior: "auto" }));
        }
    }, [mobileTab]);

    // Keep the preview layout in sync with the real rendered width of the page canvas
    useEffect(() => {
        const node = previewPageRef.current;
        if (!node || typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect?.width || node.clientWidth;
            if (width > 0) setPreviewLayout(getPreviewLayout(width));
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);

    // Active project & unit being edited in forms (null by default; only shown when clicking Edit)
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingPropertyId, setEditingPropertyId] = useState(null);
    const [customBankInput, setCustomBankInput] = useState("");

    // Project creation state
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [newProjectData, setNewProjectData] = useState(EMPTY_NEW_PROJECT);
    const [newAmenityInput, setNewAmenityInput] = useState("");
    const [editAmenityInput, setEditAmenityInput] = useState("");
    const newProjectImageInputRef = useRef(null);
    const editProjectImageInputRef = useRef(null);
    const newProjectGalleryInputRef = useRef(null);
    const editProjectGalleryInputRef = useRef(null);
    const newProjectBrochureInputRef = useRef(null);
    const editProjectBrochureInputRef = useRef(null);
    const [newGalleryCategory, setNewGalleryCategory] = useState(GALLERY_CATEGORY_OPTIONS[0]);
    const [editGalleryCategory, setEditGalleryCategory] = useState(GALLERY_CATEGORY_OPTIONS[0]);
    const [newConfigDraft, setNewConfigDraft] = useState({ type: "", area: "", price: "" });
    const [editConfigDraft, setEditConfigDraft] = useState({ type: "", area: "", price: "" });
    const [newLandmarkDraft, setNewLandmarkDraft] = useState({ landmark: "", category: "Transit & Metro Station", distance: "" });
    const [editLandmarkDraft, setEditLandmarkDraft] = useState({ landmark: "", category: "Transit & Metro Station", distance: "" });
    const [editingNewLandmarkId, setEditingNewLandmarkId] = useState(null);
    const [editingExistingLandmarkId, setEditingExistingLandmarkId] = useState(null);

    // Property unit creation state
    const [isCreatingProperty, setIsCreatingProperty] = useState(false);
    const [newPropertyData, setNewPropertyData] = useState(EMPTY_NEW_PROPERTY);
    const newPropertyImageInputRef = useRef(null);
    const editPropertyImageInputRef = useRef(null);

    // Specifications creation state
    const [editingSpecId, setEditingSpecId] = useState(null);
    const [isCreatingSpec, setIsCreatingSpec] = useState(false);
    const [newSpecData, setNewSpecData] = useState(EMPTY_NEW_SPEC);

    // Neighborhood creation state
    const [editingNeighborhoodId, setEditingNeighborhoodId] = useState(null);
    const [isCreatingNeighborhood, setIsCreatingNeighborhood] = useState(false);
    const [newNeighborhoodData, setNewNeighborhoodData] = useState(EMPTY_NEW_NEIGHBORHOOD);

    const logoInputRef = useRef(null);
    const bannerInputRef = useRef(null);
    const heroGalleryInputRef = useRef(null);
    const newSpecImageInputRef = useRef(null);
    const editSpecImageInputRef = useRef(null);
    const newProjectBoxRef = useRef(null);
    const editProjectBoxRef = useRef(null);
    const newPropertyBoxRef = useRef(null);
    const editPropertyBoxRef = useRef(null);
    const newSpecBoxRef = useRef(null);
    const editSpecBoxRef = useRef(null);
    const newLandmarkComposerRef = useRef(null);
    const editLandmarkComposerRef = useRef(null);

    const scrollToEditorBox = (targetRef) => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                targetRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 40);
        });
    };

    // Banner Crop State (16:7 resolution)
    const [bannerCropModalOpen, setBannerCropModalOpen] = useState(false);
    const [bannerImageToCrop, setBannerImageToCrop] = useState(null);

    // Hero carousel: which photo is showing when there are multiple
    const [heroSlide, setHeroSlide] = useState(0);

    // Hero gallery crop state (16:7, reused for each of the 2 extra photos)
    const [heroGalleryCropModalOpen, setHeroGalleryCropModalOpen] = useState(false);
    const [heroGalleryImageToCrop, setHeroGalleryImageToCrop] = useState(null);
    const [heroGalleryCropTarget, setHeroGalleryCropTarget] = useState(null);

    // Logo Crop State (Transparency & Dynamic Ratios)
    const [logoCropModalOpen, setLogoCropModalOpen] = useState(false);
    const [logoImageToCrop, setLogoImageToCrop] = useState(null);

    // Project Image Crop State (16:9 ratio)
    const [projectCropModalOpen, setProjectCropModalOpen] = useState(false);
    const [projectImageToCrop, setProjectImageToCrop] = useState(null);
    const [projectCropTarget, setProjectCropTarget] = useState(null); // 'new' or projectId

    // Property / Unit Photo Crop State (16:9 ratio)
    const [propertyCropModalOpen, setPropertyCropModalOpen] = useState(false);
    const [propertyImageToCrop, setPropertyImageToCrop] = useState(null);
    const [propertyCropTarget, setPropertyCropTarget] = useState(null); // 'new' or propertyId

    // Custom Delete Confirmation Modal State
    const [deleteConfirmConfig, setDeleteConfirmConfig] = useState(null);

    // Live Builder Plan Quotas (Projects & Floor Units)
    const hasActiveBuilderSub = Boolean(builderSubscription?.has_active_plan);
    const activeBuilderPlanTitle = builderSubscription?.plan_title || "No Active Builder Plan";
    const projectUnlimitedFlag = Boolean(builderSubscription?.project_unlimited);
    const projectLimitNum = Number(builderSubscription?.project_limit || 0);
    const projectsUsedCount = (data.projects || []).length;
    const projectsPendingCount = projectUnlimitedFlag ? null : Math.max(0, projectLimitNum - projectsUsedCount);
    const projectsOverCount =
        !projectUnlimitedFlag && projectsUsedCount > projectLimitNum
            ? projectsUsedCount - projectLimitNum
            : 0;
    const canAddMoreProjects =
        hasActiveBuilderSub && (projectUnlimitedFlag || projectsUsedCount < projectLimitNum);

    const unitUnlimitedFlag = Boolean(builderSubscription?.unit_unlimited);
    const unitLimitNum = Number(builderSubscription?.unit_limit || 0);
    const unitsUsedCount = (data.properties || []).length;
    const unitsPendingCount = unitUnlimitedFlag ? null : Math.max(0, unitLimitNum - unitsUsedCount);
    const unitsOverCount =
        !unitUnlimitedFlag && unitsUsedCount > unitLimitNum ? unitsUsedCount - unitLimitNum : 0;
    const canAddMoreUnits =
        hasActiveBuilderSub && (unitUnlimitedFlag || unitsUsedCount < unitLimitNum);

    // Save changes to localStorage and debounced backend persistence
    const updateData = (updater) => {
        setData((prev) => {
            const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch { }

            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            setSaveStatus("saving");
            saveTimerRef.current = setTimeout(async () => {
                try {
                    const res = await builderApi.saveWebsite(next);
                    if (res && res.success) {
                        setSaveStatus("saved");
                        setQuotaAlert("");
                        if (res.subscription) {
                            setBuilderSubscription(res.subscription);
                        }
                        if (typeof BroadcastChannel !== "undefined") {
                            try {
                                const bc = new BroadcastChannel("kp_subscriptions_sync");
                                bc.postMessage({ type: "SUBSCRIPTION_UPDATED", ts: Date.now() });
                                bc.close();
                            } catch {}
                        }
                        if (res.slug) {
                            setWebsiteMeta((m) => ({
                                ...(m || {}),
                                slug: res.slug,
                                publication_status: res.publication_status || m?.publication_status || "draft",
                            }));
                        }
                        setTimeout(() => setSaveStatus("idle"), 2500);
                    } else {
                        setSaveStatus("error");
                        if (res?.message) setQuotaAlert(res.message);
                    }
                } catch (err) {
                    setSaveStatus("error");
                    const msg = err?.response?.data?.message || err?.message;
                    if (msg) setQuotaAlert(msg);
                }
            }, 600);

            return next;
        });
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
    };

    const uploadAndPersistMedia = async (dataUriOrFile, type) => {
        try {
            const res = await builderApi.uploadMedia({ data: dataUriOrFile, type });
            if (res && res.success && res.url) {
                return res.url;
            }
        } catch (err) {
            console.warn(`Media upload note for ${type}:`, err?.message || err);
        }
        return dataUriOrFile;
    };

    // Fill demo content while respecting the active Builder Plan's project & unit limits
    const fillDemoData = () => {
        const cloned = JSON.parse(JSON.stringify(DUMMY_BUILDER_DATA));
        if (!hasActiveBuilderSub) {
            cloned.projects = [];
            cloned.properties = [];
            setQuotaAlert("Demo branding & company details filled. Purchase a Builder Plan to add demo Projects & Floor Units.");
        } else {
            if (!projectUnlimitedFlag) {
                cloned.projects = (cloned.projects || []).slice(0, projectLimitNum);
            }
            if (!unitUnlimitedFlag) {
                cloned.properties = (cloned.properties || []).slice(0, unitLimitNum);
            }
            setQuotaAlert("");
        }
        updateData(() => cloned);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const rawResult = reader.result;
            if (rawResult) {
                setLogoImageToCrop(rawResult);
                setLogoCropModalOpen(true);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleLogoCropApply = async (croppedUrl) => {
        setBrandingErrors((e) => ({ ...e, logoUrl: undefined }));
        updateData({ logoUrl: croppedUrl });
        setLogoCropModalOpen(false);
        setLogoImageToCrop(null);
        const uploadedUrl = await uploadAndPersistMedia(croppedUrl, "logo");
        if (uploadedUrl && uploadedUrl !== croppedUrl) {
            updateData({ logoUrl: uploadedUrl });
        }
    };

    const handleLogoCropClose = () => {
        setLogoCropModalOpen(false);
        setLogoImageToCrop(null);
    };

    const handleOpenCropCurrentLogo = () => {
        if (data.logoUrl) {
            setLogoImageToCrop(data.logoUrl);
            setLogoCropModalOpen(true);
        }
    };

    const handleBannerUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const rawResult = reader.result;
            if (rawResult) {
                setBannerImageToCrop(rawResult);
                setBannerCropModalOpen(true);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleBannerCropApply = async (croppedUrl) => {
        setBrandingErrors((e) => ({ ...e, bannerUrl: undefined }));
        updateData({ bannerUrl: croppedUrl });
        setBannerCropModalOpen(false);
        setBannerImageToCrop(null);
        const uploadedUrl = await uploadAndPersistMedia(croppedUrl, "banner");
        if (uploadedUrl && uploadedUrl !== croppedUrl) {
            updateData({ bannerUrl: uploadedUrl });
        }
    };

    const handleBannerCropClose = () => {
        setBannerCropModalOpen(false);
        setBannerImageToCrop(null);
    };

    const handleOpenCropCurrentBanner = () => {
        if (data.bannerUrl) {
            setBannerImageToCrop(data.bannerUrl);
            setBannerCropModalOpen(true);
        }
    };

    /* ── Hero gallery: up to 2 extra photos alongside the cover banner (max 3 total), each 16:7 crop-enabled ── */
    const handleHeroGalleryUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const rawResult = reader.result;
            if (!rawResult) return;
            setHeroGalleryCropTarget("new");
            setHeroGalleryImageToCrop(rawResult);
            setHeroGalleryCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const removeHeroGalleryImage = (imgId) => {
        updateData((p) => ({ ...p, heroGallery: (p.heroGallery || []).filter((g) => g.id !== imgId) }));
    };

    const handleOpenCropHeroGalleryImage = (img) => {
        setHeroGalleryCropTarget(img.id);
        setHeroGalleryImageToCrop(img.url);
        setHeroGalleryCropModalOpen(true);
    };

    const handleHeroGalleryCropApply = async (croppedUrl) => {
        const target = heroGalleryCropTarget;
        const newId = `${Date.now()}`;
        if (target === "new") {
            updateData((p) => {
                const existing = p.heroGallery || [];
                if (existing.length >= 2) return p;
                return { ...p, heroGallery: [...existing, { id: newId, url: croppedUrl }] };
            });
        } else if (target) {
            updateData((p) => ({
                ...p,
                heroGallery: (p.heroGallery || []).map((g) => (g.id === target ? { ...g, url: croppedUrl } : g)),
            }));
        }
        setHeroGalleryCropModalOpen(false);
        setHeroGalleryImageToCrop(null);
        setHeroGalleryCropTarget(null);

        const uploadedUrl = await uploadAndPersistMedia(croppedUrl, "banner");
        if (uploadedUrl && uploadedUrl !== croppedUrl) {
            const matchId = target === "new" ? newId : target;
            updateData((p) => ({
                ...p,
                heroGallery: (p.heroGallery || []).map((g) => (g.id === matchId ? { ...g, url: uploadedUrl } : g)),
            }));
        }
    };

    const handleHeroGalleryCropClose = () => {
        setHeroGalleryCropModalOpen(false);
        setHeroGalleryImageToCrop(null);
        setHeroGalleryCropTarget(null);
    };

    // Project image 16:9 crop handlers
    const handleProjectCropApply = async (croppedUrl) => {
        const target = projectCropTarget;
        if (target === "new") {
            setNewProjectErrors((e) => ({ ...e, image: undefined }));
            setNewProjectData((prev) => ({ ...prev, image: croppedUrl }));
        } else if (target) {
            setEditProjectErrors((e) => ({ ...e, image: undefined }));
            editProject(target, "image", croppedUrl);
        }
        setProjectCropModalOpen(false);
        setProjectImageToCrop(null);
        setProjectCropTarget(null);

        const uploadedUrl = await uploadAndPersistMedia(croppedUrl, "project");
        if (uploadedUrl && uploadedUrl !== croppedUrl) {
            if (target === "new") {
                setNewProjectData((prev) => ({ ...prev, image: uploadedUrl }));
            } else if (target) {
                editProject(target, "image", uploadedUrl);
            }
        }
    };

    const handleProjectCropClose = () => {
        setProjectCropModalOpen(false);
        setProjectImageToCrop(null);
        setProjectCropTarget(null);
    };

    // Property image 16:9 crop handlers
    const handlePropertyCropApply = async (croppedUrl) => {
        const target = propertyCropTarget;
        if (target === "new") {
            setNewUnitErrors((e) => ({ ...e, image: undefined }));
            setNewPropertyData((prev) => ({ ...prev, image: croppedUrl }));
        } else if (target) {
            setEditUnitErrors((e) => ({ ...e, image: undefined }));
            editProperty(target, "image", croppedUrl);
        }
        setPropertyCropModalOpen(false);
        setPropertyImageToCrop(null);
        setPropertyCropTarget(null);

        const uploadedUrl = await uploadAndPersistMedia(croppedUrl, "property");
        if (uploadedUrl && uploadedUrl !== croppedUrl) {
            if (target === "new") {
                setNewPropertyData((prev) => ({ ...prev, image: uploadedUrl }));
            } else if (target) {
                editProperty(target, "image", uploadedUrl);
            }
        }
    };

    const handlePropertyCropClose = () => {
        setPropertyCropModalOpen(false);
        setPropertyImageToCrop(null);
        setPropertyCropTarget(null);
    };

    // Project handlers
    const startAddNewProject = () => {
        if (!hasActiveBuilderSub) {
            setQuotaAlert("An active Builder Plan is required before adding projects. Choose a Builder Plan on the Pricing page.");
            setOpenSections({ ...ALL_SECTIONS_CLOSED, projects: true });
            return;
        }
        if (!projectUnlimitedFlag && projectsUsedCount >= projectLimitNum) {
            setQuotaAlert(
                `Your ${activeBuilderPlanTitle} plan limit of ${projectLimitNum} active project${projectLimitNum === 1 ? "" : "s"} has been reached (${projectsUsedCount} added). Delete an existing project or upgrade your Builder Plan.`
            );
            setOpenSections({ ...ALL_SECTIONS_CLOSED, projects: true });
            return;
        }
        setQuotaAlert("");
        setNewProjectErrors({});
        setEditProjectErrors({});
        setIsCreatingProject(true);
        setEditingProjectId(null);
        setNewProjectData({ ...EMPTY_NEW_PROJECT });
        setNewAmenityInput("");
        setNewConfigDraft({ type: "", area: "", price: "" });
        setOpenSections({ ...ALL_SECTIONS_CLOSED, projects: true });
        scrollToEditorBox(newProjectBoxRef);
    };

    const cancelNewProject = () => {
        setIsCreatingProject(false);
        setNewProjectErrors({});
        setNewProjectData({ ...EMPTY_NEW_PROJECT });
        setNewAmenityInput("");
        setNewConfigDraft({ type: "", area: "", price: "" });
    };

    const saveNewProject = () => {
        if (!hasActiveBuilderSub) {
            setQuotaAlert("An active Builder Plan is required before adding projects.");
            return;
        }
        if (!projectUnlimitedFlag && projectsUsedCount >= projectLimitNum) {
            setQuotaAlert(
                `Project limit reached (${projectsUsedCount}/${projectLimitNum}) on ${activeBuilderPlanTitle}. Upgrade your Builder Plan to add more projects.`
            );
            setIsCreatingProject(false);
            return;
        }
        const errs = computeProjectErrors(newProjectData);
        setNewProjectErrors(errs);
        if (Object.keys(errs).length > 0) {
            scrollModalFirstError();
            return;
        }
        const title = newProjectData.title.trim();
        const newProj = {
            ...newProjectData,
            id: generateUniqueId(),
            title,
        };
        updateData((prev) => ({
            ...prev,
            projects: [newProj, ...(prev.projects || [])],
        }));
        setIsCreatingProject(false);
        setEditingProjectId(null);
        setNewProjectErrors({});
        setNewProjectData({ ...EMPTY_NEW_PROJECT });
        setNewAmenityInput("");
        setNewConfigDraft({ type: "", area: "", price: "" });
        setNewLandmarkDraft({ landmark: "", category: "Transit & Metro Station", distance: "" });
        setEditingNewLandmarkId(null);
    };

    const allKnownLandmarks = useMemo(() => {
        const fromProjects = (data.projects || []).flatMap((p) => (p.neighborhood || []).map((n) => n.landmark));
        const fromNewProj = (newProjectData.neighborhood || []).map((n) => n.landmark);
        const fromGlobal = (data.neighborhood || []).map((n) => n.landmark);
        return mergeUniqueOptions(
            POPULAR_LANDMARK_PRESETS,
            customDropdownOptions.landmarkName,
            fromProjects,
            fromNewProj,
            fromGlobal,
            newLandmarkDraft.landmark,
            editLandmarkDraft.landmark
        );
    }, [
        data.projects,
        data.neighborhood,
        newProjectData.neighborhood,
        customDropdownOptions.landmarkName,
        newLandmarkDraft.landmark,
        editLandmarkDraft.landmark,
    ]);

    const allKnownAmenities = useMemo(() => {
        const fromProjects = (data.projects || []).flatMap((p) => p.amenities || []);
        return mergeUniqueOptions(
            POPULAR_PROJECT_AMENITIES,
            customDropdownOptions.projectAmenity,
            fromProjects,
            newProjectData.amenities || []
        );
    }, [data.projects, customDropdownOptions.projectAmenity, newProjectData.amenities]);

    const allKnownSpecCategories = useMemo(() => {
        const basePresets = SPECIFICATION_CATEGORY_OPTIONS.filter((c) => c !== "Custom Category");
        const fromSpecs = (data.specifications || []).map((s) => s.category);
        return mergeUniqueOptions(
            basePresets,
            customDropdownOptions.specCategory,
            fromSpecs,
            newSpecData.category
        );
    }, [data.specifications, customDropdownOptions.specCategory, newSpecData.category]);

    const selectPresetForNewLandmark = (preset) => {
        setNewLandmarkDraft((prev) => ({
            ...prev,
            landmark: preset,
            category: LANDMARK_PRESET_CATEGORIES[preset] || prev.category || "Transit & Metro Station",
        }));
    };

    const selectPresetForEditLandmark = (preset) => {
        setEditLandmarkDraft((prev) => ({
            ...prev,
            landmark: preset,
            category: LANDMARK_PRESET_CATEGORIES[preset] || prev.category || "Transit & Metro Station",
        }));
    };

    const startEditNewProjectLandmark = (item) => {
        setEditingNewLandmarkId(item.id);
        setNewLandmarkDraft({
            landmark: item.landmark || "",
            category: item.category || "Transit & Metro Station",
            distance: item.distance || "",
        });
        scrollToEditorBox(newLandmarkComposerRef);
    };

    const cancelEditNewProjectLandmark = () => {
        setEditingNewLandmarkId(null);
        setNewLandmarkDraft({ landmark: "", category: "Transit & Metro Station", distance: "" });
    };

    const addNewProjectLandmark = () => {
        const lm = (newLandmarkDraft.landmark || "").trim();
        if (!lm) return;
        const cat = newLandmarkDraft.category?.trim() || LANDMARK_PRESET_CATEGORIES[lm] || "Transit & Metro Station";
        const dist = newLandmarkDraft.distance?.trim() || "2.0 Km (5 Mins drive)";
        handleAddNewDropdownOption("landmarkName", lm);
        handleAddNewDropdownOption("landmarkCategory", cat);
        handleAddNewDropdownOption("distanceTime", dist);

        if (editingNewLandmarkId) {
            setNewProjectData((prev) => ({
                ...prev,
                neighborhood: (prev.neighborhood || []).map((l) =>
                    l.id === editingNewLandmarkId ? { ...l, landmark: lm, category: cat, distance: dist } : l
                ),
            }));
            setEditingNewLandmarkId(null);
        } else {
            const item = {
                id: "lm-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
                landmark: lm,
                category: cat,
                distance: dist,
            };
            setNewProjectData((prev) => {
                const existing = prev.neighborhood || [];
                const dupIdx = existing.findIndex((x) => x.landmark?.toLowerCase() === lm.toLowerCase());
                if (dupIdx !== -1) {
                    const updated = [...existing];
                    updated[dupIdx] = { ...updated[dupIdx], landmark: lm, category: cat, distance: dist };
                    return { ...prev, neighborhood: updated };
                }
                return { ...prev, neighborhood: [...existing, item] };
            });
        }
        setNewLandmarkDraft({ landmark: "", category: "Transit & Metro Station", distance: "" });
    };

    const removeNewProjectLandmark = (lmId) => {
        if (editingNewLandmarkId === lmId) cancelEditNewProjectLandmark();
        setNewProjectData((prev) => ({
            ...prev,
            neighborhood: (prev.neighborhood || []).filter((l) => l.id !== lmId),
        }));
    };

    const startEditExistingProjectLandmark = (item) => {
        setEditingExistingLandmarkId(item.id);
        setEditLandmarkDraft({
            landmark: item.landmark || "",
            category: item.category || "Transit & Metro Station",
            distance: item.distance || "",
        });
        scrollToEditorBox(editLandmarkComposerRef);
    };

    const cancelEditExistingProjectLandmark = () => {
        setEditingExistingLandmarkId(null);
        setEditLandmarkDraft({ landmark: "", category: "Transit & Metro Station", distance: "" });
    };

    const addEditProjectLandmark = (projectId) => {
        const lm = (editLandmarkDraft.landmark || "").trim();
        if (!lm) return;
        const cat = editLandmarkDraft.category?.trim() || LANDMARK_PRESET_CATEGORIES[lm] || "Transit & Metro Station";
        const dist = editLandmarkDraft.distance?.trim() || "2.0 Km (5 Mins drive)";
        handleAddNewDropdownOption("landmarkName", lm);
        handleAddNewDropdownOption("landmarkCategory", cat);
        handleAddNewDropdownOption("distanceTime", dist);

        const existing = currentProject?.neighborhood || [];
        if (editingExistingLandmarkId) {
            const updated = existing.map((l) =>
                l.id === editingExistingLandmarkId ? { ...l, landmark: lm, category: cat, distance: dist } : l
            );
            editProject(projectId, "neighborhood", updated);
            setEditingExistingLandmarkId(null);
        } else {
            const dupIdx = existing.findIndex((x) => x.landmark?.toLowerCase() === lm.toLowerCase());
            if (dupIdx !== -1) {
                const updated = [...existing];
                updated[dupIdx] = { ...updated[dupIdx], landmark: lm, category: cat, distance: dist };
                editProject(projectId, "neighborhood", updated);
            } else {
                const item = {
                    id: "lm-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
                    landmark: lm,
                    category: cat,
                    distance: dist,
                };
                editProject(projectId, "neighborhood", [...existing, item]);
            }
        }
        setEditLandmarkDraft({ landmark: "", category: "Transit & Metro Station", distance: "" });
    };

    const removeEditProjectLandmark = (projectId, lmId) => {
        if (editingExistingLandmarkId === lmId) cancelEditExistingProjectLandmark();
        const existing = currentProject?.neighborhood || [];
        editProject(projectId, "neighborhood", existing.filter((l) => l.id !== lmId));
    };

    const handleNewProjectImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const rawResult = reader.result;
            if (rawResult) {
                setProjectCropTarget("new");
                setProjectImageToCrop(rawResult);
                setProjectCropModalOpen(true);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleEditProjectImageUpload = (projectId, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const rawResult = reader.result;
            if (rawResult) {
                setProjectCropTarget(projectId);
                setProjectImageToCrop(rawResult);
                setProjectCropModalOpen(true);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    /* ── Project gallery (multiple categorised photos) ── */
    const handleNewProjectGalleryUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result;
            if (!url) return;
            setNewProjectData((p) => ({
                ...p,
                gallery: [...(p.gallery || []), { id: `${Date.now()}`, url, category: newGalleryCategory }],
            }));
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const removeNewProjectGalleryImage = (imgId) => {
        setNewProjectData((p) => ({ ...p, gallery: (p.gallery || []).filter((g) => g.id !== imgId) }));
    };

    const handleEditProjectGalleryUpload = (projectId, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result;
            if (!url) return;
            const project = (data.projects || []).find((p) => p.id === projectId);
            const current = project?.gallery || [];
            editProject(projectId, "gallery", [...current, { id: `${Date.now()}`, url, category: editGalleryCategory }]);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const removeEditProjectGalleryImage = (projectId, imgId) => {
        const project = (data.projects || []).find((p) => p.id === projectId);
        const current = project?.gallery || [];
        editProject(projectId, "gallery", current.filter((g) => g.id !== imgId));
    };

    /* ── Project brochure upload ── */
    const handleNewProjectBrochureUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result;
            if (!url) return;
            setNewProjectData((p) => ({ ...p, brochureUrl: url, brochureName: file.name }));
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleEditProjectBrochureUpload = (projectId, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result;
            if (!url) return;
            editProject(projectId, "brochureUrl", url);
            editProject(projectId, "brochureName", file.name);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    /* ── Project configurations (BHK type / area / price rows) ── */
    const addNewProjectConfig = () => {
        const { type, area, price } = newConfigDraft;
        if (!type.trim() && !area.trim() && !price.trim()) return;
        setNewProjectData((p) => ({
            ...p,
            configurations: [...(p.configurations || []), { id: `${Date.now()}`, type: type.trim(), area: area.trim(), price: price.trim() }],
        }));
        setNewConfigDraft({ type: "", area: "", price: "" });
    };

    const removeNewProjectConfig = (configId) => {
        setNewProjectData((p) => ({ ...p, configurations: (p.configurations || []).filter((c) => c.id !== configId) }));
    };

    const addEditProjectConfig = (projectId) => {
        const { type, area, price } = editConfigDraft;
        if (!type.trim() && !area.trim() && !price.trim()) return;
        const project = (data.projects || []).find((p) => p.id === projectId);
        const current = project?.configurations || [];
        editProject(projectId, "configurations", [...current, { id: `${Date.now()}`, type: type.trim(), area: area.trim(), price: price.trim() }]);
        setEditConfigDraft({ type: "", area: "", price: "" });
    };

    const removeEditProjectConfig = (projectId, configId) => {
        const project = (data.projects || []).find((p) => p.id === projectId);
        const current = project?.configurations || [];
        editProject(projectId, "configurations", current.filter((c) => c.id !== configId));
    };

    const toggleNewProjectAmenity = (amenity) => {
        setNewProjectData((prev) => {
            const current = prev.amenities || [];
            const exists = current.some((a) => String(a).trim().toLowerCase() === amenity.toLowerCase());
            const updated = exists
                ? current.filter((a) => String(a).trim().toLowerCase() !== amenity.toLowerCase())
                : [...current, amenity];
            return { ...prev, amenities: updated };
        });
    };

    const addNewProjectCustomAmenity = () => {
        const trimmed = newAmenityInput.trim();
        if (!trimmed) return;
        const canonical = allKnownAmenities.find((a) => a.toLowerCase() === trimmed.toLowerCase()) || trimmed;
        handleAddNewDropdownOption("projectAmenity", canonical);
        setNewProjectData((prev) => {
            const current = prev.amenities || [];
            if (current.some((a) => String(a).trim().toLowerCase() === canonical.toLowerCase())) return prev;
            return { ...prev, amenities: [...current, canonical] };
        });
        setNewAmenityInput("");
    };

    const toggleEditProjectAmenity = (projectId, amenity) => {
        const project = (data.projects || []).find((p) => p.id === projectId);
        if (!project) return;
        const current = project.amenities || [];
        const exists = current.some((a) => String(a).trim().toLowerCase() === amenity.toLowerCase());
        const updated = exists
            ? current.filter((a) => String(a).trim().toLowerCase() !== amenity.toLowerCase())
            : [...current, amenity];
        editProject(projectId, "amenities", updated);
    };

    const addEditProjectCustomAmenity = (projectId) => {
        const trimmed = editAmenityInput.trim();
        if (!trimmed) return;
        const canonical = allKnownAmenities.find((a) => a.toLowerCase() === trimmed.toLowerCase()) || trimmed;
        handleAddNewDropdownOption("projectAmenity", canonical);
        const project = (data.projects || []).find((p) => p.id === projectId);
        if (!project) return;
        const current = project.amenities || [];
        if (!current.some((a) => String(a).trim().toLowerCase() === canonical.toLowerCase())) {
            editProject(projectId, "amenities", [...current, canonical]);
        }
        setEditAmenityInput("");
    };

    const removeProject = (id, e) => {
        e?.stopPropagation();
        const project = (data.projects || []).find((p) => p.id === id);
        setDeleteConfirmConfig({
            title: "Delete Project?",
            itemName: project?.title || "Untitled Project",
            itemType: "Project",
            description: "Are you sure you want to delete this project? It will be permanently removed from your builder portfolio and live showcase.",
            confirmText: "Delete",
            onConfirm: () => {
                updateData((prev) => ({
                    ...prev,
                    projects: (prev.projects || []).filter((p) => p.id !== id),
                }));
                if (editingProjectId === id) {
                    setEditingProjectId(null);
                }
            },
        });
    };

    const editProject = (id, key, val) => {
        if (val && String(val).trim()) {
            setEditProjectErrors((e) => ({ ...e, [key]: undefined }));
        }
        updateData((prev) => ({
            ...prev,
            projects: (prev.projects || []).map((p) => (p.id === id ? { ...p, [key]: val } : p)),
        }));
    };

    const finishEditingProject = () => {
        const proj = (data.projects || []).find((p) => p.id === editingProjectId);
        if (proj) {
            const errs = computeProjectErrors(proj);
            setEditProjectErrors(errs);
            if (Object.keys(errs).length > 0) {
                scrollModalFirstError();
                return;
            }
        }
        setEditProjectErrors({});
        setEditingProjectId(null);
    };

    // Property unit handlers
    const startAddNewProperty = () => {
        if (!hasActiveBuilderSub) {
            setQuotaAlert("An active Builder Plan is required before adding floor plans / units. Choose a Builder Plan on the Pricing page.");
            setOpenSections({ ...ALL_SECTIONS_CLOSED, properties: true });
            return;
        }
        if (!unitUnlimitedFlag && unitsUsedCount >= unitLimitNum) {
            setQuotaAlert(
                `Your ${activeBuilderPlanTitle} plan limit of ${unitLimitNum} floor plan${unitLimitNum === 1 ? "" : "s"} / unit${unitLimitNum === 1 ? "" : "s"} has been reached (${unitsUsedCount} added). Delete an existing unit or upgrade your Builder Plan.`
            );
            setOpenSections({ ...ALL_SECTIONS_CLOSED, properties: true });
            return;
        }
        setQuotaAlert("");
        setNewUnitErrors({});
        setEditUnitErrors({});
        setIsCreatingProperty(true);
        setEditingPropertyId(null);
        setNewPropertyData({ ...EMPTY_NEW_PROPERTY });
        if (newPropertyImageInputRef.current) newPropertyImageInputRef.current.value = "";
        setOpenSections({ ...ALL_SECTIONS_CLOSED, properties: true });
        scrollToEditorBox(newPropertyBoxRef);
    };

    const cancelNewProperty = () => {
        setIsCreatingProperty(false);
        setNewUnitErrors({});
        setNewPropertyData({ ...EMPTY_NEW_PROPERTY });
        if (newPropertyImageInputRef.current) newPropertyImageInputRef.current.value = "";
    };

    const saveNewProperty = () => {
        if (!hasActiveBuilderSub) {
            setQuotaAlert("An active Builder Plan is required before adding floor plans / units.");
            return;
        }
        if (!unitUnlimitedFlag && unitsUsedCount >= unitLimitNum) {
            setQuotaAlert(
                `Unit / Floor Plan limit reached (${unitsUsedCount}/${unitLimitNum}) on ${activeBuilderPlanTitle}. Upgrade your Builder Plan to add more units.`
            );
            setIsCreatingProperty(false);
            return;
        }
        const errs = computeUnitErrors(newPropertyData);
        setNewUnitErrors(errs);
        if (Object.keys(errs).length > 0) {
            scrollModalFirstError();
            return;
        }
        const newId = generateUniqueId();
        const created = {
            id: newId,
            title: newPropertyData.title.trim(),
            sqft: newPropertyData.sqft.trim(),
            price: newPropertyData.price.trim(),
            rooms: newPropertyData.rooms.trim(),
            status: newPropertyData.status || "Available",
            image: newPropertyData.image || "",
        };
        updateData((prev) => ({
            ...prev,
            properties: [...(prev.properties || []), created],
        }));
        setIsCreatingProperty(false);
        setEditingPropertyId(null);
        setNewUnitErrors({});
        setNewPropertyData({ ...EMPTY_NEW_PROPERTY });
    };

    const removeProperty = (id, e) => {
        e?.stopPropagation();
        const prop = (data.properties || []).find((p) => p.id === id);
        setDeleteConfirmConfig({
            title: "Delete Property Unit?",
            itemName: prop?.title || "Untitled Unit",
            itemType: "Property Unit",
            description: "Are you sure you want to delete this property unit? It will be permanently removed from your inventory and floor plans.",
            confirmText: "Delete",
            onConfirm: () => {
                updateData((prev) => ({
                    ...prev,
                    properties: (prev.properties || []).filter((p) => p.id !== id),
                }));
                if (editingPropertyId === id) {
                    setEditingPropertyId(null);
                }
            },
        });
    };

    const editProperty = (id, key, val) => {
        if (val && String(val).trim()) {
            setEditUnitErrors((e) => ({ ...e, [key]: undefined }));
        }
        updateData((prev) => ({
            ...prev,
            properties: (prev.properties || []).map((p) => (p.id === id ? { ...p, [key]: val } : p)),
        }));
    };

    const finishEditingUnit = () => {
        const unit = (data.properties || []).find((u) => u.id === editingPropertyId);
        if (unit) {
            const errs = computeUnitErrors(unit);
            setEditUnitErrors(errs);
            if (Object.keys(errs).length > 0) {
                scrollModalFirstError();
                return;
            }
        }
        setEditUnitErrors({});
        setEditingPropertyId(null);
    };

    const handleNewPropertyImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const rawResult = reader.result;
            if (rawResult) {
                setPropertyCropTarget("new");
                setPropertyImageToCrop(rawResult);
                setPropertyCropModalOpen(true);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleEditPropertyImageUpload = (id, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const rawResult = reader.result;
            if (rawResult) {
                setPropertyCropTarget(id);
                setPropertyImageToCrop(rawResult);
                setPropertyCropModalOpen(true);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    // Specifications handlers
    const startAddNewSpecification = () => {
        setNewSpecErrors({});
        setEditSpecErrors({});
        setIsCreatingSpec(true);
        setEditingSpecId(null);
        setNewSpecData({ ...EMPTY_NEW_SPEC });
        setOpenSections({ ...ALL_SECTIONS_CLOSED, specs: true });
        scrollToEditorBox(newSpecBoxRef);
    };

    const cancelNewSpecification = () => {
        setIsCreatingSpec(false);
        setNewSpecErrors({});
        setNewSpecData({ ...EMPTY_NEW_SPEC });
    };

    const saveNewSpecification = () => {
        const errs = computeSpecErrors(newSpecData);
        setNewSpecErrors(errs);
        if (Object.keys(errs).length > 0) {
            scrollModalFirstError();
            return;
        }
        const newId = generateUniqueId();
        const created = {
            id: newId,
            category: newSpecData.category.trim(),
            details: newSpecData.details.trim(),
            image: newSpecData.image || "",
        };
        updateData((prev) => ({
            ...prev,
            specifications: [...(prev.specifications || []), created],
        }));
        setIsCreatingSpec(false);
        setEditingSpecId(null);
        setNewSpecErrors({});
        setNewSpecData({ ...EMPTY_NEW_SPEC });
    };

    const removeSpecification = (id, e) => {
        e?.stopPropagation();
        const spec = (data.specifications || []).find((s) => s.id === id);
        setDeleteConfirmConfig({
            title: "Delete Specification?",
            itemName: spec?.category || "Specification",
            itemType: "Specification",
            description: "Are you sure you want to delete this specification item from your construction specifications?",
            confirmText: "Delete",
            onConfirm: () => {
                updateData((prev) => ({
                    ...prev,
                    specifications: (prev.specifications || []).filter((s) => s.id !== id),
                }));
                if (editingSpecId === id) {
                    setEditingSpecId(null);
                }
            },
        });
    };

    const editSpecification = (id, key, val) => {
        if (key === "details" && val && String(val).trim()) {
            setEditSpecErrors((e) => ({ ...e, details: undefined }));
        }
        updateData((prev) => ({
            ...prev,
            specifications: (prev.specifications || []).map((s) => (s.id === id ? { ...s, [key]: val } : s)),
        }));
    };

    // Select category WITHOUT auto-filling Material & Engineering Standards (user writes description) + check duplicate
    const handleCategorySelectForNew = (cat) => {
        const trimmed = String(cat || "").trim();
        const isDup =
            trimmed !== "" &&
            (data.specifications || []).some(
                (s) => String(s.category || "").trim().toLowerCase() === trimmed.toLowerCase()
            );
        setNewSpecErrors((prev) => ({
            ...prev,
            category: !trimmed
                ? "Specification Category required"
                : isDup
                ? "Specification Category already added — choose another category"
                : undefined,
        }));
        setNewSpecData((prev) => ({
            ...prev,
            category: cat,
        }));
    };

    const handleCategorySelectForEdit = (id, cat) => {
        const trimmed = String(cat || "").trim();
        const isDup =
            trimmed !== "" &&
            (data.specifications || []).some(
                (s) =>
                    String(s.id) !== String(id) &&
                    String(s.category || "").trim().toLowerCase() === trimmed.toLowerCase()
            );
        setEditSpecErrors((prev) => ({
            ...prev,
            category: !trimmed
                ? "Specification Category required"
                : isDup
                ? "Specification Category already added — choose another category"
                : undefined,
        }));
        if (isDup) return;
        updateData((prev) => ({
            ...prev,
            specifications: (prev.specifications || []).map((s) =>
                s.id === id ? { ...s, category: cat } : s
            ),
        }));
    };

    const finishEditingSpec = () => {
        const sp = (data.specifications || []).find((s) => s.id === editingSpecId);
        if (sp) {
            const errs = computeSpecErrors(sp, sp.id);
            setEditSpecErrors(errs);
            if (Object.keys(errs).length > 0) {
                scrollModalFirstError();
                return;
            }
        }
        setEditSpecErrors({});
        setEditingSpecId(null);
    };

    const handleNewSpecImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result;
            if (!url) return;
            setNewSpecData((p) => ({ ...p, image: url }));
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleEditSpecImageUpload = (id, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result;
            if (!url) return;
            editSpecification(id, "image", url);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    // Neighborhood handlers
    const startAddNewNeighborhood = () => {
        setIsCreatingNeighborhood(true);
        setEditingNeighborhoodId(null);
        setNewNeighborhoodData({ ...EMPTY_NEW_NEIGHBORHOOD });
        setOpenSections({ ...ALL_SECTIONS_CLOSED, location: true });
    };

    const cancelNewNeighborhood = () => {
        setIsCreatingNeighborhood(false);
        setNewNeighborhoodData({ ...EMPTY_NEW_NEIGHBORHOOD });
    };

    const saveNewNeighborhood = () => {
        if (!newNeighborhoodData.landmark.trim()) {
            alert("Please enter or select a landmark name.");
            return;
        }
        const newId = generateUniqueId();
        const created = {
            id: newId,
            landmark: newNeighborhoodData.landmark.trim(),
            category: newNeighborhoodData.category || "Transit & Metro Station",
            distance: newNeighborhoodData.distance || "1.0 Km (3 Mins drive)",
        };
        updateData((prev) => ({
            ...prev,
            neighborhood: [...(prev.neighborhood || []), created],
        }));
        setIsCreatingNeighborhood(false);
        setEditingNeighborhoodId(null);
        setNewNeighborhoodData({ ...EMPTY_NEW_NEIGHBORHOOD });
    };

    const removeNeighborhood = (id, e) => {
        e?.stopPropagation();
        const item = (data.neighborhood || []).find((n) => n.id === id);
        setDeleteConfirmConfig({
            title: "Delete Landmark?",
            itemName: item?.landmark || "Landmark",
            itemType: "Landmark",
            description: "Are you sure you want to delete this neighborhood connectivity and landmark point?",
            confirmText: "Delete",
            onConfirm: () => {
                updateData((prev) => ({
                    ...prev,
                    neighborhood: (prev.neighborhood || []).filter((n) => n.id !== id),
                }));
                if (editingNeighborhoodId === id) {
                    setEditingNeighborhoodId(null);
                }
            },
        });
    };

    const editNeighborhood = (id, key, val) => {
        updateData((prev) => ({
            ...prev,
            neighborhood: (prev.neighborhood || []).map((n) => (n.id === id ? { ...n, [key]: val } : n)),
        }));
    };

    // Approved loan banks handlers
    const toggleApprovedBank = (bankName) => {
        updateData((prev) => {
            const currentBanks = prev.keyFacts?.approvedBanks || [];
            const exists = currentBanks.includes(bankName);
            const updated = exists
                ? currentBanks.filter((b) => b !== bankName)
                : [...currentBanks, bankName];
            return {
                ...prev,
                keyFacts: {
                    ...prev.keyFacts,
                    approvedBanks: updated,
                },
            };
        });
    };

    const addCustomBank = () => {
        const trimmed = customBankInput.trim();
        if (!trimmed) return;
        updateData((prev) => {
            const currentBanks = prev.keyFacts?.approvedBanks || [];
            if (currentBanks.includes(trimmed)) return prev;
            return {
                ...prev,
                keyFacts: {
                    ...prev.keyFacts,
                    approvedBanks: [...currentBanks, trimmed],
                },
            };
        });
        setCustomBankInput("");
    };

    const removeApprovedBank = (bankName) => {
        updateData((prev) => ({
            ...prev,
            keyFacts: {
                ...prev.keyFacts,
                approvedBanks: (prev.keyFacts?.approvedBanks || []).filter((b) => b !== bankName),
            },
        }));
    };

    // Reset / Clear All to Empty State
    const clearAllData = () => {
        setDeleteConfirmConfig({
            title: "Clear All Layout Data?",
            itemName: "All Builder Showcase Fields",
            itemType: "Showcase Data",
            description: "Are you sure you want to clear all data and start completely fresh? All fields, uploaded pictures, projects, and floor plans will be emptied.",
            confirmText: "Clear Everything",
            onConfirm: () => {
                if (logoInputRef.current) logoInputRef.current.value = "";
                if (bannerInputRef.current) bannerInputRef.current.value = "";
                setEditingProjectId(null);
                setEditingPropertyId(null);
                setCustomBankInput("");
                setIsCreatingProject(false);
                setNewProjectData({ ...EMPTY_NEW_PROJECT });
                setNewAmenityInput("");
                setEditAmenityInput("");
                if (newProjectImageInputRef.current) newProjectImageInputRef.current.value = "";
                if (editProjectImageInputRef.current) editProjectImageInputRef.current.value = "";
                setIsCreatingProperty(false);
                setNewPropertyData({ ...EMPTY_NEW_PROPERTY });
                if (newPropertyImageInputRef.current) newPropertyImageInputRef.current.value = "";
                if (editPropertyImageInputRef.current) editPropertyImageInputRef.current.value = "";
                setIsCreatingSpec(false);
                setEditingSpecId(null);
                setNewSpecData({ ...EMPTY_NEW_SPEC });
                setIsCreatingNeighborhood(false);
                setEditingNeighborhoodId(null);
                setNewNeighborhoodData({ ...EMPTY_NEW_NEIGHBORHOOD });
                setBannerCropModalOpen(false);
                setBannerImageToCrop(null);
                setLogoCropModalOpen(false);
                setLogoImageToCrop(null);
                setProjectCropModalOpen(false);
                setProjectImageToCrop(null);
                setProjectCropTarget(null);
                setPropertyCropModalOpen(false);
                setPropertyImageToCrop(null);
                setPropertyCropTarget(null);
                setOpenSections({
                    branding: false,
                    details: false,
                    projects: false,
                    properties: false,
                    specs: false,
                    location: false,
                    contact: false,
                });

                setData(() => {
                    const freshEmpty = {
                        ...EMPTY_BUILDER_DATA,
                        template: "corporate",
                    };
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(freshEmpty));
                    } catch { }
                    return freshEmpty;
                });

                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 2000);
            },
        });
    };

    const slug = websiteMeta?.slug || (data.companyName
        ? data.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
        : "my-builder-page");

    const publishedUrl = websiteMeta?.published_url || `https://keralaplots.com/builders/${slug}`;

    const handleCopy = () => {
        navigator.clipboard?.writeText(publishedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handlePublish = async () => {
        setPublishError("");

        // 1. Validate Branding & Hero Banner
        const bErrs = computeBrandingErrors();
        setBrandingErrors(bErrs);
        if (Object.keys(bErrs).length > 0) {
            setOpenSections({ ...ALL_SECTIONS_CLOSED, branding: true });
            scrollModalFirstError();
            return;
        }

        // 2. Validate Details & Key Facts
        const dErrs = computeDetailsErrors();
        setDetailsErrors(dErrs);
        if (Object.keys(dErrs).length > 0) {
            setOpenSections({ ...ALL_SECTIONS_CLOSED, details: true });
            scrollModalFirstError();
            return;
        }

        // 3. Validate any existing Projects
        for (const p of data.projects || []) {
            const pErrs = computeProjectErrors(p);
            if (Object.keys(pErrs).length > 0) {
                setIsCreatingProject(false);
                setEditingProjectId(p.id);
                setEditProjectErrors(pErrs);
                setOpenSections({ ...ALL_SECTIONS_CLOSED, projects: true });
                scrollModalFirstError();
                return;
            }
        }

        // 4. Validate any existing Units & Floor Plans
        for (const u of data.properties || []) {
            const uErrs = computeUnitErrors(u);
            if (Object.keys(uErrs).length > 0) {
                setIsCreatingProperty(false);
                setEditingPropertyId(u.id);
                setEditUnitErrors(uErrs);
                setOpenSections({ ...ALL_SECTIONS_CLOSED, properties: true });
                scrollModalFirstError();
                return;
            }
        }

        // 5. Validate any existing Building Specifications
        for (const s of data.specifications || []) {
            const sErrs = computeSpecErrors(s, s.id, data.specifications || []);
            if (Object.keys(sErrs).length > 0) {
                setIsCreatingSpec(false);
                setEditingSpecId(s.id);
                setEditSpecErrors(sErrs);
                setOpenSections({ ...ALL_SECTIONS_CLOSED, specs: true });
                scrollModalFirstError();
                return;
            }
        }

        setIsPublishing(true);
        try {
            const res = await builderApi.publishWebsite(data);
            if (res && res.success) {
                setWebsiteMeta((prev) => ({
                    ...(prev || {}),
                    publication_status: "published",
                    slug: res.slug || slug,
                    published_url: res.url || `https://keralaplots.com/builders/${res.slug || slug}`,
                }));
                setIsPublishModalOpen(true);
            } else {
                const msg = res?.message || "Please complete required fields before publishing.";
                setPublishError(msg);
                alert(msg);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to publish webpage.";
            setPublishError(msg);
            if (authStatus === "unregistered") {
                setIsPublishModalOpen(true);
            } else {
                alert(msg);
            }
        } finally {
            setIsPublishing(false);
        }
    };

    const handleUnpublish = async () => {
        if (!confirm("Are you sure you want to unpublish your website? It will no longer be visible to public visitors.")) return;
        try {
            const res = await builderApi.unpublishWebsite();
            if (res && res.success) {
                setWebsiteMeta((prev) => ({
                    ...(prev || {}),
                    publication_status: "unpublished",
                }));
                alert("Your website has been unpublished.");
                setIsPublishModalOpen(false);
            }
        } catch {
            alert("Failed to unpublish website. Please try again.");
        }
    };

    const handleContactSubmit = (e) => {
        e.preventDefault();
        setContactSuccess(true);
        setTimeout(() => setContactSuccess(false), 4000);
    };

    const currentProject = (data.projects || []).find((p) => p.id === editingProjectId) || null;
    const currentProperty = (data.properties || []).find((p) => p.id === editingPropertyId) || null;
    const currentSpec = (data.specifications || []).find((s) => s.id === editingSpecId) || null;
    const currentNeighborhood = (data.neighborhood || []).find((n) => n.id === editingNeighborhoodId) || null;

    // Hero banner images: cover photo + up to 2 extra photos (3 max), shown as a carousel
    const heroImages = [data.bannerUrl, ...(data.heroGallery || []).map((g) => g.url)].filter(Boolean).slice(0, 3);
    const heroSlideCount = heroImages.length;
    const activeHeroSlide = heroSlideCount > 0 ? heroSlide % heroSlideCount : 0;

    useEffect(() => {
        if (heroSlideCount <= 1) return;
        const id = setInterval(() => {
            setHeroSlide((i) => (i + 1) % heroSlideCount);
        }, 5000);
        return () => clearInterval(id);
    }, [heroSlideCount]);

    const goToHeroSlide = (i) => setHeroSlide(i);
    const prevHeroSlide = () => setHeroSlide((i) => (i - 1 + heroSlideCount) % heroSlideCount);
    const nextHeroSlide = () => setHeroSlide((i) => (i + 1) % heroSlideCount);

    // ────────── TEMPLATE 3 SECTION RENDERERS (Corporate / Executive Style) ──────────
    // Corporate-template sections are shared with the public builder page (see builder-portal/CorporateSections.jsx)
    const renderTemplate3KeyFacts = () => null;

    const renderTemplate3Overview = () => <CorporateOverview data={data} isEditor />;

    const renderTemplate3Specs = () => <CorporateSpecs specifications={data.specifications || []} isEditor />;

    const renderTemplate3Projects = () => (
        <CorporateProjects
            projects={data.projects || []}
            neighborhood={data.neighborhood || []}
            mapQuery={data.fullAddress || data.headquarters || ""}
            isEditor
        />
    );

    const renderTemplate3Units = () => <CorporateUnits units={data.properties || []} isEditor />;

    const renderTemplate3Neighborhood = () => null;

    const renderTemplate3Contact = () => (
        <CorporateContact data={data} contactSuccess={contactSuccess} onSubmit={handleContactSubmit} isEditor />
    );

    const renderFooter = () => (
        <footer className={styles.webFooter}>
            <p>© {new Date().getFullYear()} {data.companyName || "Builder Portfolio"}. All Rights Reserved.</p>
            <p>K-RERA: {data.reraNumber || "Registration in Process"} • Listed on KeralaPlots Verified Builder Network</p>
        </footer>
    );

    return (
        <div className={styles.portalPage} data-section-modal-root="">
            {/* ── Topbar ── */}
            <header className={styles.topbar}>
                <div className={styles.topbarLeft}>
                    <Link href="/builder-portal" className={styles.portalBrand} title="Return to Builders Directory">
                        <div className={styles.brandLogoIcon}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img onError={hideBrokenImg} onLoad={showLoadedImg} src="/user-placeholder.jpg" alt="" />
                        </div>
                        <div className={styles.brandText}>
                            <span className={styles.brandTitle}>KeralaPlots Studio</span>
                            <span className={styles.brandSub}>Builder Webpage Portal</span>
                        </div>
                    </Link>
                </div>

                <div className={styles.topbarCenter}>
                    {/* Desktop Device Simulation Switcher (visible on desktop > 1024px) */}
                    <div className={styles.desktopDeviceSwitcher}>
                        <button
                            type="button"
                            onClick={() => setDeviceView("desktop")}
                            aria-pressed={deviceView === "desktop"}
                            className={`${styles.deviceBtn} ${deviceView === "desktop" ? styles.deviceBtnActive : ""}`}
                            title="Desktop Live Preview"
                        >
                            <RiComputerLine /> Desktop
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeviceView("tablet")}
                            aria-pressed={deviceView === "tablet"}
                            className={`${styles.deviceBtn} ${deviceView === "tablet" ? styles.deviceBtnActive : ""}`}
                            title="Tablet Preview"
                        >
                            <RiTabletLine /> Tablet
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeviceView("mobile")}
                            aria-pressed={deviceView === "mobile"}
                            className={`${styles.deviceBtn} ${deviceView === "mobile" ? styles.deviceBtnActive : ""}`}
                            title="Mobile Phone Preview"
                        >
                            <RiSmartphoneLine /> Mobile
                        </button>
                    </div>

                    {/* Mobile/Tablet Workspace Switcher (visible on <= 1024px) */}
                    <div className={styles.mobileModeSwitcher}>
                        <button
                            type="button"
                            onClick={() => setMobileTab("editor")}
                            className={`${styles.modeSwitchBtn} ${mobileTab === "editor" ? styles.modeSwitchBtnActive : ""}`}
                            title="Studio Editor"
                            aria-label="Studio Editor"
                            aria-pressed={mobileTab === "editor"}
                        >
                            <RiEditLine />
                            <span className={styles.modeSwitchLabel}>Edit</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileTab("preview")}
                            className={`${styles.modeSwitchBtn} ${mobileTab === "preview" ? styles.modeSwitchBtnActive : ""}`}
                            title="Live Preview"
                            aria-label="Live Preview"
                            aria-pressed={mobileTab === "preview"}
                        >
                            <RiComputerLine />
                            <span className={styles.modeSwitchLabel}>Preview</span>
                        </button>
                    </div>
                </div>

                <div className={styles.topbarRight}>
                    <div className={styles.autoSaveText} title={saveStatus === "saving" ? "Saving to server..." : saveStatus === "saved" ? "All changes saved to database" : "Auto-saved"}>
                        <span className={styles.savedDot} style={{
                            backgroundColor: saveStatus === "saving" ? "#f59e0b" : saveStatus === "error" ? "#ef4444" : "#10b981"
                        }} />
                        <span className={styles.autoSaveLabel} role="status" aria-live="polite" style={saveStatus === "error" ? { color: "#dc2626", fontWeight: 700 } : undefined}>
                            {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Limit reached — not saved" : saveStatus === "saved" ? "Saved to cloud" : savedNotice ? "Saved!" : "Auto-saved"}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            fetchEnquiries();
                            setIsEnquiriesOpen(true);
                        }}
                        className={styles.resetBtn}
                        style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", fontWeight: 600 }}
                        title="View website customer enquiries and site visits"
                    >
                        <RiInboxArchiveLine />
                        <span className={styles.resetBtnLabel}>Enquiries</span>
                        {enquiriesList.length > 0 && (
                            <span style={{
                                background: "#059669",
                                color: "#fff",
                                fontSize: "11px",
                                fontWeight: "700",
                                padding: "1px 6px",
                                borderRadius: "10px",
                                marginLeft: "4px"
                            }}>
                                {enquiriesList.length}
                            </span>
                        )}
                    </button>

                    <button type="button" onClick={clearAllData} className={styles.resetBtn} title="Clear all data and start fresh" aria-label="Clear all data and start fresh">
                        <RiRefreshLine /> <span className={styles.resetBtnLabel}>Clear / Reset</span>
                    </button>

                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className={`${styles.publishBtn} ${styles.desktopOnlyBtn}`}
                    >
                        {isPublishing ? (
                            <><RiLoader4Line className={styles.spin} /> <span className={styles.publishBtnLabel}>Publishing…</span></>
                        ) : websiteMeta?.publication_status === "published" ? (
                            <><RiCheckLine /> <span className={styles.publishBtnLabel}>Update / Live</span></>
                        ) : (
                            <><RiSparklingLine /> <span className={styles.publishBtnLabel}>Publish Webpage</span></>
                        )}
                    </button>
                </div>
            </header>

            {/* ── Main Workspace ── */}
            <div className={styles.workspace} data-mobile-tab={mobileTab}>
                {/* ── Studio Editor Panel (Left Accordion) ── */}
                <aside className={styles.editorPanel}>
                    {/* ── Builder Subscription Plan & Quotas Summary ── */}
                    <div
                        style={{
                            margin: "12px 12px 4px",
                            padding: "13px 14px",
                            borderRadius: "12px",
                            background: hasActiveBuilderSub ? "#f8fafc" : "#fffbeb",
                            border: `1.5px solid ${
                                !hasActiveBuilderSub
                                    ? "#fcd34d"
                                    : projectsOverCount > 0 || unitsOverCount > 0
                                    ? "#fca5a5"
                                    : "#d1fae5"
                            }`,
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 800, color: "#0f172a" }}>
                                <RiVipCrownLine style={{ color: hasActiveBuilderSub ? "#059669" : "#d97706", fontSize: "15px" }} />
                                <span>{hasActiveBuilderSub ? activeBuilderPlanTitle : "No Active Builder Plan"}</span>
                            </div>
                            <Link
                                href="/pricing?for=builder"
                                style={{
                                    fontSize: "11.5px",
                                    fontWeight: 700,
                                    color: hasActiveBuilderSub ? "#2563eb" : "#b45309",
                                    textDecoration: "none",
                                    background: hasActiveBuilderSub ? "#eff6ff" : "#fef3c7",
                                    padding: "3px 9px",
                                    borderRadius: "999px",
                                }}
                            >
                                {hasActiveBuilderSub ? "Upgrade Plan →" : "Choose Plan →"}
                            </Link>
                        </div>

                        {hasActiveBuilderSub ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                <div
                                    style={{
                                        background: "#ffffff",
                                        border: `1px solid ${projectsOverCount > 0 ? "#fca5a5" : "#e2e8f0"}`,
                                        borderRadius: "9px",
                                        padding: "8px 10px",
                                    }}
                                >
                                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                        Projects Limit
                                    </div>
                                    <div style={{ fontSize: "13px", fontWeight: 800, color: projectsOverCount > 0 ? "#dc2626" : "#0f172a", marginTop: "2px" }}>
                                        {projectUnlimitedFlag
                                            ? `${projectsUsedCount} / Unlimited`
                                            : `${projectsUsedCount} / ${projectLimitNum} Used`}
                                    </div>
                                    <div style={{ fontSize: "11px", fontWeight: 600, color: projectsOverCount > 0 ? "#dc2626" : projectsPendingCount === 0 ? "#d97706" : "#059669", marginTop: "1px" }}>
                                        {projectUnlimitedFlag
                                            ? "Unlimited allowed"
                                            : projectsOverCount > 0
                                            ? `${projectsOverCount} Over Limit`
                                            : `${projectsPendingCount} Pending`}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        background: "#ffffff",
                                        border: `1px solid ${unitsOverCount > 0 ? "#fca5a5" : "#e2e8f0"}`,
                                        borderRadius: "9px",
                                        padding: "8px 10px",
                                    }}
                                >
                                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                        Units &amp; Floor Plans
                                    </div>
                                    <div style={{ fontSize: "13px", fontWeight: 800, color: unitsOverCount > 0 ? "#dc2626" : "#0f172a", marginTop: "2px" }}>
                                        {unitUnlimitedFlag
                                            ? `${unitsUsedCount} / Unlimited`
                                            : `${unitsUsedCount} / ${unitLimitNum} Used`}
                                    </div>
                                    <div style={{ fontSize: "11px", fontWeight: 600, color: unitsOverCount > 0 ? "#dc2626" : unitsPendingCount === 0 ? "#d97706" : "#059669", marginTop: "1px" }}>
                                        {unitUnlimitedFlag
                                            ? "Unlimited allowed"
                                            : unitsOverCount > 0
                                            ? `${unitsOverCount} Over Limit`
                                            : `${unitsPendingCount} Pending`}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontSize: "12px", color: "#92400e", lineHeight: 1.45 }}>
                                Purchase a Builder Plan to unlock Project &amp; Floor Unit quotas and publish your builder webpage.
                            </div>
                        )}
                    </div>

                    {/* Accordion Toolbar with Quick Actions */}
                    <div className={styles.accordionToolbar}>
                        <div className={styles.accordionToolbarTitle}>
                            <RiLayoutGridLine style={{ color: "#10b981", fontSize: "14px" }} />
                            <span>Page Sections</span>
                        </div>
                        <div className={styles.accordionToolbarProgress}>
                            <span className={`${styles.overallProgressText} ${overallProgressPercent < 100 ? styles.overallProgressTextIncomplete : ""}`}>
                                {overallProgressPercent}% Complete
                            </span>
                        </div>
                    </div>

                    {/* Accordion List Container */}
                    <div className={styles.accordionList}>

                        {/* ── Accordion 1: Branding & Hero Banner ── */}
                        <div className={`${styles.accordionItem} ${openSections.branding ? styles.accordionItemOpen : ""}`}>
                            <button
                                type="button"
                                onClick={() => toggleSection("branding")}
                                className={`${styles.accordionHeader} ${openSections.branding ? styles.accordionHeaderOpen : ""}`}
                                aria-haspopup="dialog"
                            >
                                <div className={styles.accordionHeaderLeft}>
                                    <div className={styles.accordionIconBox}>
                                        <RiImageAddLine />
                                    </div>
                                    <div className={styles.accordionHeaderText}>
                                        <h3 className={styles.accordionTitle}>Branding &amp; Hero Banner</h3>
                                        <span className={styles.accordionSubtitle}>Logo, cover banner &amp; tagline</span>
                                    </div>
                                </div>
                                <div className={styles.accordionHeaderRight}>
                                    {renderProgressBadge("branding")}
                                    <RiArrowRightSLine
                                        className={styles.accordionChevron}
                                    />
                                </div>
                            </button>

                            <SectionModal
                                open={openSections.branding}
                                activeKey="branding"
                                {...sectionNav}
                                onClose={closeSections}
                                icon={<RiImageAddLine />}
                                title={<>Branding &amp; Hero Banner</>}
                                subtitle={<>Logo, cover banner &amp; tagline</>}
                                badge={renderProgressBadge("branding")}
                            >
                                <div className={styles.accordionBody}>
                                    <div className={styles.editorSectionHeader}>
                                        <h2 className={styles.sectionTitle}>Branding &amp; Hero Banner</h2>
                                        <p className={styles.sectionDesc}>Upload your official company logo and high-resolution cover photo.</p>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>
                                            <span>Company Logo <ReqStar /></span>
                                            <span className={styles.labelHint}>PNG, SVG or JPG • Auto-Crop &amp; Transparency Supported</span>
                                        </label>
                                        {data.logoUrl ? (
                                            <div className={styles.logoPreviewWrapper}>
                                                <div className={styles.previewLogoContainer}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img onError={hideBrokenImg} onLoad={showLoadedImg} src={data.logoUrl} alt="Logo" className={styles.previewLogoImg} />
                                                </div>
                                                <div className={styles.logoActionBtns}>
                                                    <button
                                                        type="button"
                                                        onClick={handleOpenCropCurrentLogo}
                                                        className={styles.cropLogoBtn}
                                                        title="Crop &amp; Adjust Logo"
                                                    >
                                                        <RiCropLine /> Crop / Adjust
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => logoInputRef.current?.click()}
                                                        className={styles.changeLogoBtn}
                                                        title="Change Company Logo"
                                                    >
                                                        <RiImageAddLine /> Change
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateData({ logoUrl: "" })}
                                                        className={styles.removeLogoBtn}
                                                        title="Remove Logo"
                                                    >
                                                        <RiDeleteBinLine /> Remove
                                                    </button>
                                                </div>
                                                <input
                                                    ref={logoInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className={styles.hiddenInput}
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className={styles.uploadCard}
                                                style={brandingErrors.logoUrl ? INVALID_UPLOAD_STYLE : undefined}
                                                onClick={() => logoInputRef.current?.click()}
                                            >
                                                <RiUploadCloud2Line className={styles.uploadIcon} />
                                                <p className={styles.uploadText}>Click to upload company logo</p>
                                                <p className={styles.uploadHint}>PNG, SVG or JPG • Auto-Crop tool enabled</p>
                                                <input
                                                    ref={logoInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className={styles.hiddenInput}
                                                />
                                            </div>
                                        )}
                                        <FieldError msg={brandingErrors.logoUrl} />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>
                                            <span>Hero Banner Background <ReqStar /></span>
                                            <span className={styles.labelHint}>16:7 Widescreen ratio (1600×700px) • Auto-Crop Enabled</span>
                                        </label>
                                        {data.bannerUrl ? (
                                            <div className={styles.previewImageContainer}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img onError={hideBrokenImg} onLoad={showLoadedImg} src={data.bannerUrl} alt="Hero banner" className={styles.previewImg} />
                                                <div className={styles.bannerActionBtns}>
                                                    <button
                                                        type="button"
                                                        onClick={handleOpenCropCurrentBanner}
                                                        className={styles.cropBannerBtn}
                                                        title="Crop &amp; Reposition Banner (16:7)"
                                                    >
                                                        <RiCropLine /> Crop / Adjust
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => bannerInputRef.current?.click()}
                                                        className={styles.changeImageBtn}
                                                        title="Change Banner Photo"
                                                    >
                                                        <RiImageAddLine /> Change
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateData({ bannerUrl: "" })}
                                                        className={styles.removeBannerBtn}
                                                        title="Remove Banner Photo"
                                                    >
                                                        <RiDeleteBinLine /> Remove
                                                    </button>
                                                </div>
                                                <span className={styles.ratioBadgeInPreview}>
                                                    <RiCropLine /> 16:7 Banner
                                                </span>
                                                <input
                                                    ref={bannerInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleBannerUpload}
                                                    className={styles.hiddenInput}
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className={styles.uploadCard}
                                                style={brandingErrors.bannerUrl ? INVALID_UPLOAD_STYLE : undefined}
                                                onClick={() => bannerInputRef.current?.click()}
                                            >
                                                <RiImageAddLine className={styles.uploadIcon} />
                                                <p className={styles.uploadText}>Click to upload cover banner</p>
                                                <p className={styles.uploadHint}>PNG, JPG or WEBP • Crop to 16:7 (1600×700px)</p>
                                                <input
                                                    ref={bannerInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleBannerUpload}
                                                    className={styles.hiddenInput}
                                                />
                                            </div>
                                        )}
                                        <FieldError msg={brandingErrors.bannerUrl} />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>
                                            <span>Additional Hero Photos</span>
                                            <span className={styles.labelHint}>Up to 2 more photos shown alongside the cover banner (3 max)</span>
                                        </label>

                                        {data.heroGallery?.length > 0 && (
                                            <div className={styles.galleryGrid}>
                                                {data.heroGallery.map((img) => (
                                                    <div key={img.id} className={styles.galleryThumb}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={img.url} alt="Hero gallery" className={styles.galleryThumbImg} />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenCropHeroGalleryImage(img)}
                                                            className={styles.galleryThumbCrop}
                                                            title="Crop &amp; reposition (16:7)"
                                                        >
                                                            <RiCropLine />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeHeroGalleryImage(img.id)}
                                                            className={styles.galleryThumbRemove}
                                                            title="Remove photo"
                                                        >
                                                            <RiCloseLine />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {(data.heroGallery?.length || 0) < 2 && (
                                            <div className={styles.galleryUploadRow}>
                                                <input
                                                    ref={heroGalleryInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleHeroGalleryUpload}
                                                    className={styles.hiddenInput}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => heroGalleryInputRef.current?.click()}
                                                    className={styles.projectImageChangeBtn}
                                                >
                                                    <RiUploadCloud2Line /> Add Photo
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <div className={styles.fieldHeaderRow}>
                                            <label className={styles.label}>
                                                <span>Hero Headline <ReqStar /></span>
                                                <span className={styles.labelHint}>Main prominent title shown on banner (Max {MAX_HEADLINE_LENGTH} letters)</span>
                                            </label>
                                            <span
                                                className={`${styles.charCountBadge} ${(data.headline || "").length >= MAX_HEADLINE_LENGTH
                                                    ? styles.charCountBadgeLimit
                                                    : (data.headline || "").length >= MAX_HEADLINE_LENGTH - 10
                                                        ? styles.charCountBadgeWarn
                                                        : (data.headline || "").length > 0
                                                            ? styles.charCountBadgeActive
                                                            : ""
                                                    }`}
                                            >
                                                {(data.headline || "").length} / {MAX_HEADLINE_LENGTH}
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={data.headline || ""}
                                            maxLength={MAX_HEADLINE_LENGTH}
                                            onChange={(e) => {
                                                const v = e.target.value.slice(0, MAX_HEADLINE_LENGTH);
                                                if (v.trim()) setBrandingErrors((er) => ({ ...er, headline: undefined }));
                                                updateData({ headline: v });
                                            }}
                                            className={styles.input}
                                            style={brandingErrors.headline ? INVALID_INPUT_STYLE : undefined}
                                            placeholder="e.g. Crafting Timeless Architectural Landmarks Across Kerala"
                                        />
                                        <FieldError msg={brandingErrors.headline} />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <div className={styles.fieldHeaderRow}>
                                            <label className={styles.label}>
                                                <span>Tagline / Vision Statement <ReqStar /></span>
                                                <span className={styles.labelHint}>Secondary subtitle or architectural promise (Max {MAX_TAGLINE_LENGTH} letters)</span>
                                            </label>
                                            <span
                                                className={`${styles.charCountBadge} ${(data.tagline || "").length >= MAX_TAGLINE_LENGTH
                                                    ? styles.charCountBadgeLimit
                                                    : (data.tagline || "").length >= MAX_TAGLINE_LENGTH - 15
                                                        ? styles.charCountBadgeWarn
                                                        : (data.tagline || "").length > 0
                                                            ? styles.charCountBadgeActive
                                                            : ""
                                                    }`}
                                            >
                                                {(data.tagline || "").length} / {MAX_TAGLINE_LENGTH}
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={data.tagline || ""}
                                            maxLength={MAX_TAGLINE_LENGTH}
                                            onChange={(e) => {
                                                const v = e.target.value.slice(0, MAX_TAGLINE_LENGTH);
                                                if (v.trim()) setBrandingErrors((er) => ({ ...er, tagline: undefined }));
                                                updateData({ tagline: v });
                                            }}
                                            className={styles.input}
                                            style={brandingErrors.tagline ? INVALID_INPUT_STYLE : undefined}
                                            placeholder="e.g. Luxury 3 & 4 BHK Riverfront Residences at Marine Drive, Kochi"
                                        />
                                        <FieldError msg={brandingErrors.tagline} />
                                    </div>
                                </div>
                            </SectionModal>
                        </div>

                        {/* ── Accordion 2: Company Details & Key Facts ── */}
                        <div className={`${styles.accordionItem} ${openSections.details ? styles.accordionItemOpen : ""}`}>
                            <button
                                type="button"
                                onClick={() => toggleSection("details")}
                                className={`${styles.accordionHeader} ${openSections.details ? styles.accordionHeaderOpen : ""}`}
                                aria-haspopup="dialog"
                            >
                                <div className={styles.accordionHeaderLeft}>
                                    <div className={styles.accordionIconBox}>
                                        <RiBuilding2Line />
                                    </div>
                                    <div className={styles.accordionHeaderText}>
                                        <h3 className={styles.accordionTitle}>Details &amp; Key Facts</h3>
                                        <span className={styles.accordionSubtitle}>K-RERA, address, stats &amp; banks</span>
                                    </div>
                                </div>
                                <div className={styles.accordionHeaderRight}>
                                    {renderProgressBadge("details")}
                                    <RiArrowRightSLine
                                        className={styles.accordionChevron}
                                    />
                                </div>
                            </button>

                            <SectionModal
                                open={openSections.details}
                                activeKey="details"
                                {...sectionNav}
                                onClose={closeSections}
                                icon={<RiBuilding2Line />}
                                title={<>Details &amp; Key Facts</>}
                                subtitle={<>K-RERA, address, stats &amp; banks</>}
                                badge={renderProgressBadge("details")}
                            >
                                <div className={styles.accordionBody}>
                                    <div className={styles.editorSectionHeader}>
                                        <h2 className={styles.sectionTitle}>Company Details &amp; Credibility</h2>
                                        <p className={styles.sectionDesc}>Provide verified K-RERA credentials, office location, and track record.</p>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Company Full Legal Name <ReqStar /></label>
                                        <input
                                            type="text"
                                            value={data.companyName}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                if (v.trim()) setDetailsErrors((er) => ({ ...er, companyName: undefined }));
                                                updateData({ companyName: v });
                                            }}
                                            className={styles.input}
                                            style={detailsErrors.companyName ? INVALID_INPUT_STYLE : undefined}
                                            placeholder="e.g. Skyline Royal Developers"
                                        />
                                        <FieldError msg={detailsErrors.companyName} />
                                    </div>

                                    <div className={styles.grid2}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Builder Category <ReqStar /></label>
                                            <BuilderSearchableSelect
                                                value={data.builderType || ""}
                                                invalid={Boolean(detailsErrors.builderType)}
                                                onChange={(val) => {
                                                    if (String(val || "").trim()) setDetailsErrors((er) => ({ ...er, builderType: undefined }));
                                                    updateData({ builderType: val });
                                                }}
                                                options={getFieldOptions("builderCategory", BUILDER_CATEGORIES, [data.builderType])}
                                                placeholder="Select builder category..."
                                                onAddNew={(val) => handleAddNewDropdownOption("builderCategory", val)}
                                            />
                                            <FieldError msg={detailsErrors.builderType} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Founded Year <ReqStar /></label>
                                            <select
                                                value={data.establishedYear || ""}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (v) setDetailsErrors((er) => ({ ...er, establishedYear: undefined }));
                                                    updateData({ establishedYear: v });
                                                }}
                                                className={styles.select}
                                                style={detailsErrors.establishedYear ? INVALID_INPUT_STYLE : undefined}
                                            >
                                                <option value="">Select established year...</option>
                                                {ESTABLISHED_YEARS.map((year) => (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                ))}
                                                {data.establishedYear && !ESTABLISHED_YEARS.includes(String(data.establishedYear)) && (
                                                    <option value={data.establishedYear}>
                                                        {data.establishedYear}
                                                    </option>
                                                )}
                                            </select>
                                            <FieldError msg={detailsErrors.establishedYear} />
                                        </div>
                                    </div>

                                    <div className={styles.grid2}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>K-RERA Number <ReqStar /></label>
                                            <input
                                                type="text"
                                                value={data.reraNumber}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (v.trim()) setDetailsErrors((er) => ({ ...er, reraNumber: undefined }));
                                                    updateData({ reraNumber: v });
                                                }}
                                                className={styles.input}
                                                style={detailsErrors.reraNumber ? INVALID_INPUT_STYLE : undefined}
                                                placeholder="e.g. K-RERA/PRJ/ERN/2024/0084"
                                            />
                                            <FieldError msg={detailsErrors.reraNumber} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Main District / City</label>
                                            <select
                                                value={data.headquarters || ""}
                                                onChange={(e) => updateData({ headquarters: e.target.value })}
                                                className={styles.select}
                                            >
                                                <option value="">Select district / city...</option>
                                                {KERALA_DISTRICTS_LIST.map((dist) => (
                                                    <option key={dist} value={dist}>
                                                        {dist}
                                                    </option>
                                                ))}
                                                {data.headquarters && !KERALA_DISTRICTS_LIST.includes(data.headquarters) && (
                                                    <option value={data.headquarters}>
                                                        {data.headquarters}
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Registered Head Office Address <ReqStar /></label>
                                        <textarea
                                            value={data.fullAddress}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                if (v.trim()) setDetailsErrors((er) => ({ ...er, fullAddress: undefined }));
                                                updateData({ fullAddress: v });
                                            }}
                                            className={styles.textarea}
                                            style={detailsErrors.fullAddress ? INVALID_INPUT_STYLE : undefined}
                                            rows={2}
                                            placeholder="e.g. 4th Floor, Skyline Towers, Civil Line Road, Kakkanad, Kochi - 682030"
                                        />
                                        <FieldError msg={detailsErrors.fullAddress} />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <div className={styles.fieldHeaderRow}>
                                            <label className={styles.label}>
                                                <span>About Company &amp; Project Story <ReqStar /></span>
                                                <span className={styles.labelHint}>Company background, vision and mission (Max {MAX_ABOUT_LENGTH} letters)</span>
                                            </label>
                                            <span
                                                className={`${styles.charCountBadge} ${(data.about || "").length >= MAX_ABOUT_LENGTH
                                                    ? styles.charCountBadgeLimit
                                                    : (data.about || "").length >= MAX_ABOUT_LENGTH - 40
                                                        ? styles.charCountBadgeWarn
                                                        : (data.about || "").length > 0
                                                            ? styles.charCountBadgeActive
                                                            : ""
                                                    }`}
                                            >
                                                {(data.about || "").length} / {MAX_ABOUT_LENGTH}
                                            </span>
                                        </div>
                                        <textarea
                                            value={data.about || ""}
                                            maxLength={MAX_ABOUT_LENGTH}
                                            onChange={(e) => {
                                                const v = e.target.value.slice(0, MAX_ABOUT_LENGTH);
                                                if (v.trim()) setDetailsErrors((er) => ({ ...er, about: undefined }));
                                                updateData({ about: v });
                                            }}
                                            rows={4}
                                            className={styles.textarea}
                                            style={detailsErrors.about ? INVALID_INPUT_STYLE : undefined}
                                            placeholder="Share your company background, engineering standards, architectural vision, and mission..."
                                        />
                                        <FieldError msg={detailsErrors.about} />
                                    </div>

                                    {/* Project Key Facts and Approved Loan Banks hidden per user request */}

                                    <div className={styles.editorSectionHeader} style={{ marginTop: "12px" }}>
                                        <h3 className={styles.sectionTitle} style={{ fontSize: "14.5px" }}>
                                            Performance Counters <ReqStar />
                                        </h3>
                                    </div>

                                    <div className={styles.grid2}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Completed Projects <ReqStar /></label>
                                            <BuilderSearchableSelect
                                                value={data.stats?.completedProjects || ""}
                                                invalid={Boolean(detailsErrors.completedProjects)}
                                                onChange={(val) => {
                                                    if (String(val || "").trim()) setDetailsErrors((er) => ({ ...er, completedProjects: undefined }));
                                                    updateData((p) => ({ ...p, stats: { ...p.stats, completedProjects: val } }));
                                                }}
                                                options={getFieldOptions("completedProjects", COMPLETED_PROJECTS_OPTIONS, [data.stats?.completedProjects])}
                                                placeholder="Select completed projects..."
                                                onAddNew={(val) => handleAddNewDropdownOption("completedProjects", val)}
                                            />
                                            <FieldError msg={detailsErrors.completedProjects} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Ongoing Projects <ReqStar /></label>
                                            <BuilderSearchableSelect
                                                value={data.stats?.ongoingProjects || ""}
                                                invalid={Boolean(detailsErrors.ongoingProjects)}
                                                onChange={(val) => {
                                                    if (String(val || "").trim()) setDetailsErrors((er) => ({ ...er, ongoingProjects: undefined }));
                                                    updateData((p) => ({ ...p, stats: { ...p.stats, ongoingProjects: val } }));
                                                }}
                                                options={getFieldOptions("ongoingProjects", ONGOING_PROJECTS_OPTIONS, [data.stats?.ongoingProjects])}
                                                placeholder="Select ongoing projects..."
                                                onAddNew={(val) => handleAddNewDropdownOption("ongoingProjects", val)}
                                            />
                                            <FieldError msg={detailsErrors.ongoingProjects} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Happy Families <ReqStar /></label>
                                            <BuilderSearchableSelect
                                                value={data.stats?.happyFamilies || ""}
                                                invalid={Boolean(detailsErrors.happyFamilies)}
                                                onChange={(val) => {
                                                    if (String(val || "").trim()) setDetailsErrors((er) => ({ ...er, happyFamilies: undefined }));
                                                    updateData((p) => ({ ...p, stats: { ...p.stats, happyFamilies: val } }));
                                                }}
                                                options={getFieldOptions("happyFamilies", HAPPY_FAMILIES_OPTIONS, [data.stats?.happyFamilies])}
                                                placeholder="Select happy families..."
                                                onAddNew={(val) => handleAddNewDropdownOption("happyFamilies", val)}
                                            />
                                            <FieldError msg={detailsErrors.happyFamilies} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Delivered Sq. Ft. <ReqStar /></label>
                                            <BuilderSearchableSelect
                                                value={data.stats?.deliveredSqFt || ""}
                                                invalid={Boolean(detailsErrors.deliveredSqFt)}
                                                onChange={(val) => {
                                                    if (String(val || "").trim()) setDetailsErrors((er) => ({ ...er, deliveredSqFt: undefined }));
                                                    updateData((p) => ({ ...p, stats: { ...p.stats, deliveredSqFt: val } }));
                                                }}
                                                options={getFieldOptions("deliveredSqFt", DELIVERED_SQFT_OPTIONS, [data.stats?.deliveredSqFt])}
                                                placeholder="Select delivered sq. ft..."
                                                onAddNew={(val) => handleAddNewDropdownOption("deliveredSqFt", val)}
                                            />
                                            <FieldError msg={detailsErrors.deliveredSqFt} />
                                        </div>
                                    </div>
                                </div>
                            </SectionModal>
                        </div>

                        {/* ── Accordion 3: Projects Showcase ── */}
                        <div className={`${styles.accordionItem} ${openSections.projects ? styles.accordionItemOpen : ""}`}>
                            <button
                                type="button"
                                onClick={() => toggleSection("projects")}
                                className={`${styles.accordionHeader} ${openSections.projects ? styles.accordionHeaderOpen : ""}`}
                                aria-haspopup="dialog"
                            >
                                <div className={styles.accordionHeaderLeft}>
                                    <div className={styles.accordionIconBox}>
                                        <RiHomeSmileLine />
                                    </div>
                                    <div className={styles.accordionHeaderText}>
                                        <h3 className={styles.accordionTitle}>Featured Projects</h3>
                                        <span className={styles.accordionSubtitle}>
                                            {hasActiveBuilderSub
                                                ? projectUnlimitedFlag
                                                    ? `${projectsUsedCount} Projects (Unlimited Plan)`
                                                    : `${projectsUsedCount} / ${projectLimitNum} Projects · ${
                                                          projectsOverCount > 0
                                                              ? `${projectsOverCount} over limit`
                                                              : `${projectsPendingCount} pending`
                                                      }`
                                                : `${projectsUsedCount} Landmark developments`}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.accordionHeaderRight}>
                                    {renderProgressBadge("projects")}
                                    <RiArrowRightSLine
                                        className={styles.accordionChevron}
                                    />
                                </div>
                            </button>

                            <SectionModal
                                open={openSections.projects}
                                activeKey="projects"
                                {...sectionNav}
                                onClose={closeSections}
                                icon={<RiHomeSmileLine />}
                                title={<>Featured Projects</>}
                                subtitle={
                                    <>
                                        {hasActiveBuilderSub
                                            ? projectUnlimitedFlag
                                                ? `${projectsUsedCount} Added · Plan Limit: Unlimited Projects`
                                                : `${projectsUsedCount} of ${projectLimitNum} Used · ${
                                                      projectsOverCount > 0
                                                          ? `${projectsOverCount} Over Plan Limit`
                                                          : `${projectsPendingCount} Pending`
                                                  } (${activeBuilderPlanTitle})`
                                            : `${projectsUsedCount} Landmark developments · Builder Plan required`}
                                    </>
                                }
                                badge={renderProgressBadge("projects")}
                            >
                                <div className={styles.accordionBody}>
                                    <div className={styles.editorSectionHeader}>
                                        <h2 className={styles.sectionTitle}>Featured Projects ({projectsUsedCount})</h2>
                                        <p className={styles.sectionDesc}>Showcase your signature developments with prices, status and photos.</p>
                                    </div>

                                    {/* Builder Plan Project Quota & Limit Banner */}
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            flexWrap: "wrap",
                                            gap: "10px",
                                            padding: "12px 15px",
                                            marginBottom: "14px",
                                            borderRadius: "12px",
                                            background: !hasActiveBuilderSub
                                                ? "#fffbeb"
                                                : projectsOverCount > 0
                                                ? "#fef2f2"
                                                : !canAddMoreProjects
                                                ? "#fffbeb"
                                                : "#ecfdf5",
                                            border: `1.5px solid ${
                                                !hasActiveBuilderSub
                                                    ? "#fcd34d"
                                                    : projectsOverCount > 0
                                                    ? "#fca5a5"
                                                    : !canAddMoreProjects
                                                    ? "#fcd34d"
                                                    : "#a7f3d0"
                                            }`,
                                        }}
                                    >
                                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                                                {hasActiveBuilderSub ? (
                                                    projectUnlimitedFlag ? (
                                                        <>Plan Quota ({activeBuilderPlanTitle}): Unlimited Active Projects ({projectsUsedCount} added)</>
                                                    ) : (
                                                        <>
                                                            Plan Project Limit ({activeBuilderPlanTitle}): {projectsUsedCount} of {projectLimitNum} Used &bull;{" "}
                                                            <span style={{ color: projectsOverCount > 0 ? "#dc2626" : projectsPendingCount === 0 ? "#b45309" : "#059669" }}>
                                                                {projectsOverCount > 0
                                                                    ? `${projectsOverCount} Over Limit`
                                                                    : `${projectsPendingCount} Pending`}
                                                            </span>
                                                        </>
                                                    )
                                                ) : (
                                                    <>No Active Builder Plan &bull; Project Limit: 0</>
                                                )}
                                            </span>
                                            <span style={{ fontSize: "12px", color: "#475569" }}>
                                                {!hasActiveBuilderSub
                                                    ? "Purchase a Builder Plan to add landmark projects to your webpage."
                                                    : projectsOverCount > 0
                                                    ? `You have ${projectsUsedCount} projects, exceeding your ${projectLimitNum}-project limit. Please delete ${projectsOverCount} project(s) below or upgrade your plan so changes save to your live page.`
                                                    : !canAddMoreProjects
                                                    ? `You have used all ${projectLimitNum} project slot(s) on your current plan. Upgrade to add more projects.`
                                                    : "You can add new projects up to your active Builder Plan limit."}
                                            </span>
                                        </div>
                                        {(!hasActiveBuilderSub || !canAddMoreProjects || projectsOverCount > 0) && (
                                            <Link
                                                href="/pricing?for=builder"
                                                style={{
                                                    padding: "7px 14px",
                                                    borderRadius: "8px",
                                                    background: "#0f172a",
                                                    color: "#ffffff",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    textDecoration: "none",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {hasActiveBuilderSub ? "Upgrade Builder Plan →" : "Choose Builder Plan →"}
                                            </Link>
                                        )}
                                    </div>

                                    {quotaAlert && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "10px 14px",
                                                marginBottom: "14px",
                                                borderRadius: "10px",
                                                background: "#fef2f2",
                                                border: "1px solid #fca5a5",
                                                color: "#991b1b",
                                                fontSize: "12.5px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            <RiAlertLine style={{ flexShrink: 0, fontSize: "16px" }} />
                                            <span>{quotaAlert}</span>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={startAddNewProject}
                                        disabled={!canAddMoreProjects}
                                        className={styles.addItemBtn}
                                        style={
                                            !canAddMoreProjects
                                                ? {
                                                      opacity: 0.65,
                                                      cursor: "not-allowed",
                                                      background: "#f8fafc",
                                                      color: "#64748b",
                                                      borderColor: "#cbd5e1",
                                                  }
                                                : undefined
                                        }
                                    >
                                        {canAddMoreProjects ? (
                                            <>
                                                <RiAddLine /> Add New Project
                                                {!projectUnlimitedFlag && ` (${projectsPendingCount} remaining)`}
                                            </>
                                        ) : !hasActiveBuilderSub ? (
                                            <>
                                                <RiLockLine /> Purchase Builder Plan to Add Projects
                                            </>
                                        ) : (
                                            <>
                                                <RiLockLine /> Project Limit Reached ({projectsUsedCount}/{projectLimitNum} Used)
                                            </>
                                        )}
                                    </button>

                                    {/* ── Add New Project Empty Form ── */}
                                    {isCreatingProject && (
                                        <div ref={newProjectBoxRef} className={styles.editBox}>
                                            <div className={styles.editBoxHeader}>
                                                <h3 className={styles.editBoxTitle}>
                                                    <RiAddLine style={{ color: "#10b981", verticalAlign: "middle", marginRight: "4px" }} />
                                                    Add New Landmark Project
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={cancelNewProject}
                                                    className={styles.actionIconBtn}
                                                    title="Cancel"
                                                >
                                                    <RiCloseLine />
                                                </button>
                                            </div>

                                            <FieldGroupHeading icon={RiHomeSmileLine}>Basic Details</FieldGroupHeading>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Project Title <ReqStar /></label>
                                                <input
                                                    type="text"
                                                    value={newProjectData.title}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        if (v.trim()) setNewProjectErrors((er) => ({ ...er, title: undefined }));
                                                        setNewProjectData((p) => ({ ...p, title: v }));
                                                    }}
                                                    className={styles.input}
                                                    style={newProjectErrors.title ? INVALID_INPUT_STYLE : undefined}
                                                    placeholder="e.g. Grand Vista Waterfront Residences"
                                                />
                                                <FieldError msg={newProjectErrors.title} />
                                            </div>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Location / City <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newProjectData.location}
                                                        invalid={Boolean(newProjectErrors.location)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewProjectErrors((er) => ({ ...er, location: undefined }));
                                                            setNewProjectData((p) => ({ ...p, location: val }));
                                                        }}
                                                        options={getFieldOptions("projectLocation", PROJECT_LOCATION_OPTIONS, (data.projects || []).map((p) => p.location))}
                                                        placeholder="Select location / city..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("projectLocation", val)}
                                                    />
                                                    <FieldError msg={newProjectErrors.location} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Price Range <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newProjectData.price}
                                                        invalid={Boolean(newProjectErrors.price)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewProjectErrors((er) => ({ ...er, price: undefined }));
                                                            setNewProjectData((p) => ({ ...p, price: val }));
                                                        }}
                                                        options={getFieldOptions("projectPrice", PROJECT_PRICE_OPTIONS, (data.projects || []).map((p) => p.price))}
                                                        placeholder="Select price range..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("projectPrice", val)}
                                                    />
                                                    <FieldError msg={newProjectErrors.price} />
                                                </div>
                                            </div>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Construction Status <ReqStar /></label>
                                                    <select
                                                        value={newProjectData.status}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            if (v) setNewProjectErrors((er) => ({ ...er, status: undefined }));
                                                            setNewProjectData((p) => ({ ...p, status: v }));
                                                        }}
                                                        className={styles.select}
                                                        style={newProjectErrors.status ? INVALID_INPUT_STYLE : undefined}
                                                    >
                                                        <option value="">Select construction status...</option>
                                                        <option value="Ready to Move">Ready to Move</option>
                                                        <option value="Under Construction">Under Construction</option>
                                                        <option value="New Launch">New Launch</option>
                                                        <option value="Nearing Completion">Nearing Completion</option>
                                                        <option value="Sold Out">Sold Out</option>
                                                    </select>
                                                    <FieldError msg={newProjectErrors.status} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Property Category <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newProjectData.type}
                                                        invalid={Boolean(newProjectErrors.type)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewProjectErrors((er) => ({ ...er, type: undefined }));
                                                            setNewProjectData((p) => ({ ...p, type: val }));
                                                        }}
                                                        options={getFieldOptions("projectCategory", PROJECT_CATEGORY_OPTIONS, (data.projects || []).map((p) => p.type))}
                                                        placeholder="Select property category..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("projectCategory", val)}
                                                    />
                                                    <FieldError msg={newProjectErrors.type} />
                                                </div>
                                            </div>

                                            <FieldGroupHeading icon={RiShieldCheckLine}>Legal &amp; Possession</FieldGroupHeading>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>
                                                        <span>K-RERA Number</span>
                                                        <span className={styles.labelHint}>Project-specific registration</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newProjectData.reraNumber}
                                                        onChange={(e) => setNewProjectData((p) => ({ ...p, reraNumber: e.target.value }))}
                                                        className={styles.input}
                                                        placeholder="e.g. K-RERA/PRJ/ERN/2024/0084"
                                                    />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Possession Date</label>
                                                    <input
                                                        type="text"
                                                        value={newProjectData.possessionDate}
                                                        onChange={(e) => setNewProjectData((p) => ({ ...p, possessionDate: e.target.value }))}
                                                        className={styles.input}
                                                        placeholder="e.g. Dec 2027"
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Project Highlights / Overview</span>
                                                    <span className={styles.labelHint}>USPs buyers should know (optional)</span>
                                                </label>
                                                <textarea
                                                    value={newProjectData.highlights}
                                                    onChange={(e) => setNewProjectData((p) => ({ ...p, highlights: e.target.value }))}
                                                    className={styles.textarea}
                                                    rows={3}
                                                    placeholder="e.g. Premium waterfront towers with private marina access, landscaped sky gardens on every 10th floor, and 5-minute connectivity to NH 66."
                                                />
                                            </div>

                                            <FieldGroupHeading icon={RiLayoutGridLine}>Project Scale <ReqStar /></FieldGroupHeading>

                                            {/* Quick Facts: scale of the development */}
                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Land Area <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newProjectData.landArea}
                                                        invalid={Boolean(newProjectErrors.landArea)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewProjectErrors((er) => ({ ...er, landArea: undefined }));
                                                            setNewProjectData((p) => ({ ...p, landArea: val }));
                                                        }}
                                                        options={getFieldOptions("landArea", LAND_AREA_OPTIONS, (data.projects || []).map((p) => p.landArea))}
                                                        placeholder="Select land area..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("landArea", val)}
                                                    />
                                                    <FieldError msg={newProjectErrors.landArea} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Towers <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newProjectData.towers}
                                                        invalid={Boolean(newProjectErrors.towers)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewProjectErrors((er) => ({ ...er, towers: undefined }));
                                                            setNewProjectData((p) => ({ ...p, towers: val }));
                                                        }}
                                                        options={getFieldOptions("towers", TOWERS_OPTIONS, (data.projects || []).map((p) => p.towers))}
                                                        placeholder="Select towers & floors..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("towers", val)}
                                                    />
                                                    <FieldError msg={newProjectErrors.towers} />
                                                </div>
                                            </div>
                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Total Units <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newProjectData.totalUnits}
                                                        invalid={Boolean(newProjectErrors.totalUnits)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewProjectErrors((er) => ({ ...er, totalUnits: undefined }));
                                                            setNewProjectData((p) => ({ ...p, totalUnits: val }));
                                                        }}
                                                        options={getFieldOptions("totalUnits", TOTAL_UNITS_OPTIONS, (data.projects || []).map((p) => p.totalUnits))}
                                                        placeholder="Select total units..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("totalUnits", val)}
                                                    />
                                                    <FieldError msg={newProjectErrors.totalUnits} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Construction Progress <ReqStar /></label>
                                                    <select
                                                        value={newProjectData.constructionProgress}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            if (v) setNewProjectErrors((er) => ({ ...er, constructionProgress: undefined }));
                                                            setNewProjectData((p) => ({ ...p, constructionProgress: v }));
                                                        }}
                                                        className={styles.select}
                                                        style={newProjectErrors.constructionProgress ? INVALID_INPUT_STYLE : undefined}
                                                    >
                                                        <option value="">Select construction progress...</option>
                                                        {CONSTRUCTION_PROGRESS_OPTIONS.map((prog) => (
                                                            <option key={prog} value={prog}>{prog}</option>
                                                        ))}
                                                        {newProjectData.constructionProgress && !CONSTRUCTION_PROGRESS_OPTIONS.includes(newProjectData.constructionProgress) && (
                                                            <option value={newProjectData.constructionProgress}>{newProjectData.constructionProgress}</option>
                                                        )}
                                                    </select>
                                                    <FieldError msg={newProjectErrors.constructionProgress} />
                                                </div>
                                            </div>

                                            {/* Configurations & Pricing */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Configurations &amp; Pricing</span>
                                                    <span className={styles.labelHint}>Add each BHK type with its area and price</span>
                                                </label>

                                                {newProjectData.configurations?.length > 0 && (
                                                    <div className={styles.configList}>
                                                        {newProjectData.configurations.map((cfg) => (
                                                            <div key={cfg.id} className={styles.configItem}>
                                                                <span className={styles.configItemText}>
                                                                    <strong>{cfg.type || "Configuration"}</strong>
                                                                    {cfg.area && ` · ${cfg.area}`}
                                                                    {cfg.price && ` · ${cfg.price}`}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeNewProjectConfig(cfg.id)}
                                                                    className={styles.amenityRemoveBtn}
                                                                    title="Remove configuration"
                                                                >
                                                                    <RiCloseLine />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className={styles.configRow}>
                                                    <BuilderSearchableSelect
                                                        value={newConfigDraft.type}
                                                        onChange={(val) => setNewConfigDraft((d) => ({ ...d, type: val }))}
                                                        options={getFieldOptions("configType", CONFIG_TYPE_OPTIONS, (data.projects || []).flatMap((p) => (p.configurations || []).map((c) => c.type)))}
                                                        placeholder="Type..."
                                                        compact
                                                        onAddNew={(val) => handleAddNewDropdownOption("configType", val)}
                                                    />
                                                    <BuilderSearchableSelect
                                                        value={newConfigDraft.area}
                                                        onChange={(val) => setNewConfigDraft((d) => ({ ...d, area: val }))}
                                                        options={getFieldOptions("configArea", PROPERTY_SQFT_OPTIONS, (data.projects || []).flatMap((p) => (p.configurations || []).map((c) => c.area)))}
                                                        placeholder="Carpet area..."
                                                        compact
                                                        onAddNew={(val) => handleAddNewDropdownOption("configArea", val)}
                                                    />
                                                    <BuilderSearchableSelect
                                                        value={newConfigDraft.price}
                                                        onChange={(val) => setNewConfigDraft((d) => ({ ...d, price: val }))}
                                                        options={getFieldOptions("configPrice", PROPERTY_PRICE_OPTIONS, (data.projects || []).flatMap((p) => (p.configurations || []).map((c) => c.price)))}
                                                        placeholder="Price..."
                                                        compact
                                                        onAddNew={(val) => handleAddNewDropdownOption("configPrice", val)}
                                                    />
                                                    <button type="button" onClick={addNewProjectConfig} className={styles.bankAddBtn}>
                                                        + Add
                                                    </button>
                                                </div>
                                            </div>

                                            <FieldGroupHeading icon={RiGalleryLine}>Media</FieldGroupHeading>

                                            {/* Project Photo Upload */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Project Photo (File Upload) <ReqStar /></label>
                                                <input
                                                    type="file"
                                                    ref={newProjectImageInputRef}
                                                    onChange={handleNewProjectImageUpload}
                                                    accept="image/*"
                                                    className={styles.hiddenInput}
                                                />
                                                {newProjectData.image ? (
                                                    <div className={styles.projectImagePreview}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img onError={hideBrokenImg} onLoad={showLoadedImg} src={newProjectData.image} alt="New project preview" className={styles.projectPreviewImg} />
                                                        <span className={styles.ratioBadgeInPreview}>
                                                            <RiCropLine /> 16:9 Project Photo
                                                        </span>
                                                        <div className={styles.projectImageActions}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setProjectCropTarget("new");
                                                                    setProjectImageToCrop(newProjectData.image);
                                                                    setProjectCropModalOpen(true);
                                                                }}
                                                                className={styles.projectImageChangeBtn}
                                                                title="Crop or adjust 16:9 photo"
                                                            >
                                                                <RiCropLine /> Crop 16:9
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => newProjectImageInputRef.current?.click()}
                                                                className={styles.projectImageChangeBtn}
                                                            >
                                                                <RiUploadCloud2Line /> Change Photo
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewProjectData((p) => ({ ...p, image: "" }))}
                                                                className={styles.projectImageRemoveBtn}
                                                            >
                                                                <RiDeleteBinLine /> Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => newProjectImageInputRef.current?.click()}
                                                        className={styles.uploadCard}
                                                        style={newProjectErrors.image ? INVALID_UPLOAD_STYLE : undefined}
                                                    >
                                                        <RiImageAddLine className={styles.uploadIcon} />
                                                        <p className={styles.uploadText}>Click to Upload Project Photo</p>
                                                        <p className={styles.uploadHint}>PNG, JPG or WEBP • Crop to 16:9 (1600×900px)</p>
                                                    </div>
                                                )}
                                                <FieldError msg={newProjectErrors.image} />
                                            </div>

                                            {/* Project Gallery (multiple categorised photos) */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Project Gallery</span>
                                                    <span className={styles.labelHint}>Exterior, interior, amenities, floor plan &amp; master plan photos</span>
                                                </label>

                                                {newProjectData.gallery?.length > 0 && (
                                                    <div className={styles.galleryGrid}>
                                                        {newProjectData.gallery.map((img) => (
                                                            <div key={img.id} className={styles.galleryThumb}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={img.url} alt={img.category} className={styles.galleryThumbImg} />
                                                                <span className={styles.galleryThumbCategory}>{img.category}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeNewProjectGalleryImage(img.id)}
                                                                    className={styles.galleryThumbRemove}
                                                                    title="Remove photo"
                                                                >
                                                                    <RiCloseLine />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <input
                                                    type="file"
                                                    ref={newProjectGalleryInputRef}
                                                    onChange={handleNewProjectGalleryUpload}
                                                    accept="image/*"
                                                    className={styles.hiddenInput}
                                                />
                                                <div className={styles.galleryUploadRow}>
                                                    <select
                                                        value={newGalleryCategory}
                                                        onChange={(e) => setNewGalleryCategory(e.target.value)}
                                                        className={styles.select}
                                                    >
                                                        {GALLERY_CATEGORY_OPTIONS.map((cat) => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => newProjectGalleryInputRef.current?.click()}
                                                        className={styles.projectImageChangeBtn}
                                                    >
                                                        <RiUploadCloud2Line /> Add Photo
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Brochure Upload */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Brochure</span>
                                                    <span className={styles.labelHint}>PDF or image (optional)</span>
                                                </label>
                                                <input
                                                    type="file"
                                                    ref={newProjectBrochureInputRef}
                                                    onChange={handleNewProjectBrochureUpload}
                                                    accept="application/pdf,image/*"
                                                    className={styles.hiddenInput}
                                                />
                                                {newProjectData.brochureUrl ? (
                                                    <div className={styles.brochureRow}>
                                                        <RiFileList3Line />
                                                        <span className={styles.brochureName}>{newProjectData.brochureName || "Brochure uploaded"}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => newProjectBrochureInputRef.current?.click()}
                                                            className={styles.projectImageChangeBtn}
                                                        >
                                                            Replace
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewProjectData((p) => ({ ...p, brochureUrl: "", brochureName: "" }))}
                                                            className={styles.projectImageRemoveBtn}
                                                        >
                                                            <RiDeleteBinLine /> Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => newProjectBrochureInputRef.current?.click()}
                                                        className={styles.uploadCard}
                                                    >
                                                        <RiFileList3Line className={styles.uploadIcon} />
                                                        <p className={styles.uploadText}>Click to Upload Brochure</p>
                                                        <p className={styles.uploadHint}>PDF, PNG or JPG</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Key Amenities */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Key Amenities</span>
                                                    <span className={styles.labelHint}>Tap to select or type custom</span>
                                                </label>

                                                {newProjectData.amenities && newProjectData.amenities.length > 0 && (
                                                    <div className={styles.amenityChipsRow}>
                                                        {newProjectData.amenities.map((am, i) => (
                                                            <span key={i} className={styles.amenityChip}>
                                                                {am}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleNewProjectAmenity(am)}
                                                                    className={styles.amenityRemoveBtn}
                                                                    title={`Remove ${am}`}
                                                                >
                                                                    <RiCloseLine />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className={styles.quickAmenityPills}>
                                                    {allKnownAmenities.map((am) => {
                                                        const isSelected = (newProjectData.amenities || []).some(
                                                            (a) => String(a).trim().toLowerCase() === am.toLowerCase()
                                                        );
                                                        return (
                                                            <button
                                                                key={am}
                                                                type="button"
                                                                onClick={() => toggleNewProjectAmenity(am)}
                                                                className={`${styles.quickAmenityBtn} ${isSelected ? styles.quickAmenityBtnActive : ""}`}
                                                                aria-pressed={isSelected}
                                                            >
                                                                <span className={styles.quickAmenityIcon} aria-hidden="true">{isSelected ? <RiCheckLine /> : <RiAddLine />}</span>
                                                                <span>{am}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className={styles.bankCustomRow} style={{ marginTop: "8px" }}>
                                                    <input
                                                        type="text"
                                                        value={newAmenityInput}
                                                        onChange={(e) => setNewAmenityInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                addNewProjectCustomAmenity();
                                                            }
                                                        }}
                                                        className={styles.input}
                                                        placeholder="Type custom amenity (e.g. Helipad, Squash Court)..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={addNewProjectCustomAmenity}
                                                        className={styles.bankAddBtn}
                                                        disabled={!newAmenityInput.trim()}
                                                    >
                                                        + Add
                                                    </button>
                                                </div>
                                            </div>

                                            <FieldGroupHeading icon={RiRoadMapLine}>Neighborhood &amp; Distances</FieldGroupHeading>
                                            <div className={styles.neighborhoodSubBar}>
                                                <p className={styles.groupHint}>Tag nearby transit hubs, IT parks, hospitals, schools and malls with travel times.</p>
                                                {(newProjectData.neighborhood && newProjectData.neighborhood.length > 0) && (
                                                    <span className={styles.neighborhoodCountBadge}>
                                                        <RiCheckboxCircleLine /> {newProjectData.neighborhood.length} {newProjectData.neighborhood.length === 1 ? "Landmark" : "Landmarks"}
                                                    </span>
                                                )}
                                            </div>

                                            {(newProjectData.neighborhood && newProjectData.neighborhood.length > 0) && (
                                                <div className={styles.landmarksList}>
                                                    {newProjectData.neighborhood.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className={`${styles.landmarkItem} ${editingNewLandmarkId === item.id ? styles.landmarkItemEditing : ""}`}
                                                        >
                                                            <div className={styles.landmarkIcon}><RiMapPin2Line /></div>
                                                            <div className={styles.landmarkContent}>
                                                                <h4 className={styles.landmarkName}>{item.landmark}</h4>
                                                                <div className={styles.landmarkMeta}>
                                                                    <span className={styles.landmarkCategoryPill}>{item.category || "Landmark"}</span>
                                                                    <span className={styles.landmarkDistancePill}>{item.distance || "Nearby"}</span>
                                                                </div>
                                                            </div>
                                                            <div className={styles.landmarkActions}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEditNewProjectLandmark(item)}
                                                                    className={styles.actionIconBtn}
                                                                    title="Edit landmark"
                                                                >
                                                                    <RiEditLine />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeNewProjectLandmark(item.id)}
                                                                    className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                                                                    title="Remove landmark"
                                                                >
                                                                    <RiDeleteBinLine />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div
                                                ref={newLandmarkComposerRef}
                                                className={`${styles.landmarkComposer} ${editingNewLandmarkId ? styles.landmarkComposerEditing : ""}`}
                                            >
                                                <div className={styles.landmarkComposerHeader}>
                                                    <span className={styles.landmarkComposerTitle}>
                                                        {editingNewLandmarkId ? (
                                                            <>
                                                                <RiEditLine /> Editing Landmark
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RiMapPin2Line /> Add Nearby Landmark
                                                            </>
                                                        )}
                                                    </span>
                                                    {editingNewLandmarkId && (
                                                        <button
                                                            type="button"
                                                            onClick={cancelEditNewProjectLandmark}
                                                            className={styles.landmarkCancelEditBtn}
                                                        >
                                                            <RiCloseLine /> Cancel
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>
                                                        <span>Landmark Name</span>
                                                        <span className={styles.labelHint}>Select or create custom</span>
                                                    </label>
                                                    <BuilderSearchableSelect
                                                        value={newLandmarkDraft.landmark}
                                                        onChange={(val) => {
                                                            setNewLandmarkDraft((prev) => ({
                                                                ...prev,
                                                                landmark: val,
                                                                category: LANDMARK_PRESET_CATEGORIES[val] || prev.category,
                                                            }));
                                                        }}
                                                        options={allKnownLandmarks}
                                                        placeholder="Search or type a new landmark name..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("landmarkName", val)}
                                                    />
                                                    <div className={styles.quickAmenityPills} style={{ marginTop: "10px" }}>
                                                        {allKnownLandmarks.map((preset) => {
                                                            const isDraftMatch = newLandmarkDraft.landmark?.trim().toLowerCase() === preset.toLowerCase();
                                                            const isAlreadyTagged = (newProjectData.neighborhood || []).some(
                                                                (n) => n.landmark?.trim().toLowerCase() === preset.toLowerCase()
                                                            );
                                                            const isActive = isDraftMatch || isAlreadyTagged;
                                                            return (
                                                                <button
                                                                    key={preset}
                                                                    type="button"
                                                                    onClick={() => selectPresetForNewLandmark(preset)}
                                                                    className={`${styles.quickAmenityBtn} ${isActive ? styles.quickAmenityBtnActive : ""}`}
                                                                    aria-pressed={isActive}
                                                                >
                                                                    <span className={styles.quickAmenityIcon} aria-hidden="true">
                                                                        {isActive ? <RiCheckLine /> : <RiAddLine />}
                                                                    </span>
                                                                    <span>{preset}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className={styles.grid2}>
                                                    <div className={styles.formGroup}>
                                                        <label className={styles.label}>Category</label>
                                                        <BuilderSearchableSelect
                                                            value={newLandmarkDraft.category}
                                                            onChange={(val) => setNewLandmarkDraft((prev) => ({ ...prev, category: val }))}
                                                            options={getFieldOptions("landmarkCategory", NEIGHBORHOOD_CATEGORY_OPTIONS, [
                                                                ...(newProjectData.neighborhood || []).map((l) => l.category),
                                                                ...(data.projects || []).flatMap((p) => (p.neighborhood || []).map((l) => l.category)),
                                                            ])}
                                                            placeholder="Select or type category..."
                                                            onAddNew={(val) => handleAddNewDropdownOption("landmarkCategory", val)}
                                                        />
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label className={styles.label}>Distance / Travel Time</label>
                                                        <BuilderSearchableSelect
                                                            value={newLandmarkDraft.distance}
                                                            onChange={(val) => setNewLandmarkDraft((prev) => ({ ...prev, distance: val }))}
                                                            options={getFieldOptions("distanceTime", NEIGHBORHOOD_DISTANCE_OPTIONS, [
                                                                ...(newProjectData.neighborhood || []).map((l) => l.distance),
                                                                ...(data.projects || []).flatMap((p) => (p.neighborhood || []).map((l) => l.distance)),
                                                            ])}
                                                            placeholder="e.g. 2.0 Km (5 Mins drive)..."
                                                            onAddNew={(val) => handleAddNewDropdownOption("distanceTime", val)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.landmarkComposerFooter}>
                                                    <span className={styles.landmarkFooterNote}>
                                                        New landmarks automatically save to dropdown suggestions.
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={addNewProjectLandmark}
                                                        disabled={!newLandmarkDraft.landmark?.trim()}
                                                        className={styles.landmarkSubmitBtn}
                                                    >
                                                        {editingNewLandmarkId ? (
                                                            <>
                                                                <RiCheckLine /> Save Landmark
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RiAddLine /> Add Landmark to Project
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className={styles.editBoxActions}>
                                                <button
                                                    type="button"
                                                    onClick={cancelNewProject}
                                                    className={styles.editBoxCancelBtn}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={saveNewProject}
                                                    className={styles.editBoxSaveBtn}
                                                >
                                                    <RiCheckLine /> Save
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Existing Projects List ── */}
                                    {(!data.projects || data.projects.length === 0) ? (
                                        <div className={styles.emptyTipBox}>
                                            <RiHomeSmileLine style={{ fontSize: "24px", color: "#94a3b8" }} />
                                            <span>You haven&apos;t added any projects yet. Click <strong>&quot;+ Add New Project&quot;</strong> above to create your first landmark development.</span>
                                        </div>
                                    ) : (
                                        <div className={styles.itemList}>
                                            {data.projects.map((project) => (
                                                <div
                                                    key={project.id}
                                                    onClick={() => {
                                                        setIsCreatingProject(false);
                                                        setEditingProjectId(project.id);
                                                        scrollToEditorBox(editProjectBoxRef);
                                                    }}
                                                    className={`${styles.itemCard} ${!isCreatingProject && editingProjectId === project.id ? styles.itemCardActive : ""}`}
                                                >
                                                    <div className={styles.itemInfo}>
                                                        {project.image ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img onError={hideBrokenImg} onLoad={showLoadedImg} src={project.image} alt="" className={styles.itemThumb} />
                                                        ) : (
                                                            <div className={styles.itemThumbPlaceholder}>
                                                                <RiBuilding2Line />
                                                            </div>
                                                        )}
                                                        <div className={styles.itemDetails}>
                                                            <p className={styles.itemName}>{project.title || "Untitled Project"}</p>
                                                            <p className={styles.itemSub}>{project.location || "Location pending"} • {project.price || "Price on request"}</p>
                                                        </div>
                                                    </div>

                                                    <div className={styles.itemActions}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsCreatingProject(false);
                                                                setEditingProjectId(project.id);
                                                                scrollToEditorBox(editProjectBoxRef);
                                                            }}
                                                            className={styles.actionIconBtn}
                                                            title="Edit project"
                                                        >
                                                            <RiEditLine />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => removeProject(project.id, e)}
                                                            className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                                                            title="Delete project"
                                                        >
                                                            <RiDeleteBinLine />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── Edit Existing Project Form ── */}
                                    {!isCreatingProject && currentProject && (
                                        <div ref={editProjectBoxRef} className={styles.editBox}>
                                            <div className={styles.editBoxHeader}>
                                                <h3 className={styles.editBoxTitle}>
                                                    <RiEditLine style={{ color: "#2563eb", verticalAlign: "middle", marginRight: "4px" }} />
                                                    Editing: {currentProject.title || "Untitled Project"}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingProjectId(null)}
                                                    className={styles.actionIconBtn}
                                                    title="Close editor"
                                                >
                                                    <RiCloseLine />
                                                </button>
                                            </div>

                                            <FieldGroupHeading icon={RiHomeSmileLine}>Basic Details</FieldGroupHeading>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Project Title <ReqStar /></label>
                                                <input
                                                    type="text"
                                                    value={currentProject.title || ""}
                                                    onChange={(e) => editProject(currentProject.id, "title", e.target.value)}
                                                    className={styles.input}
                                                    style={editProjectErrors.title ? INVALID_INPUT_STYLE : undefined}
                                                    placeholder="e.g. Grand Vista Waterfront Residences"
                                                />
                                                <FieldError msg={editProjectErrors.title} />
                                            </div>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Location / City <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProject.location || ""}
                                                        invalid={Boolean(editProjectErrors.location)}
                                                        onChange={(val) => editProject(currentProject.id, "location", val)}
                                                        options={getFieldOptions("projectLocation", PROJECT_LOCATION_OPTIONS, (data.projects || []).map((p) => p.location))}
                                                        placeholder="Select location / city..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("projectLocation", val)}
                                                    />
                                                    <FieldError msg={editProjectErrors.location} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Price Range <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProject.price || ""}
                                                        invalid={Boolean(editProjectErrors.price)}
                                                        onChange={(val) => editProject(currentProject.id, "price", val)}
                                                        options={getFieldOptions("projectPrice", PROJECT_PRICE_OPTIONS, (data.projects || []).map((p) => p.price))}
                                                        placeholder="Select price range..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("projectPrice", val)}
                                                    />
                                                    <FieldError msg={editProjectErrors.price} />
                                                </div>
                                            </div>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Construction Status <ReqStar /></label>
                                                    <select
                                                        value={currentProject.status || ""}
                                                        onChange={(e) => editProject(currentProject.id, "status", e.target.value)}
                                                        className={styles.select}
                                                        style={editProjectErrors.status ? INVALID_INPUT_STYLE : undefined}
                                                    >
                                                        <option value="">Select construction status...</option>
                                                        <option value="Ready to Move">Ready to Move</option>
                                                        <option value="Under Construction">Under Construction</option>
                                                        <option value="New Launch">New Launch</option>
                                                        <option value="Nearing Completion">Nearing Completion</option>
                                                        <option value="Sold Out">Sold Out</option>
                                                    </select>
                                                    <FieldError msg={editProjectErrors.status} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Property Category <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProject.type || ""}
                                                        invalid={Boolean(editProjectErrors.type)}
                                                        onChange={(val) => editProject(currentProject.id, "type", val)}
                                                        options={getFieldOptions("projectCategory", PROJECT_CATEGORY_OPTIONS, (data.projects || []).map((p) => p.type))}
                                                        placeholder="Select property category..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("projectCategory", val)}
                                                    />
                                                    <FieldError msg={editProjectErrors.type} />
                                                </div>
                                            </div>

                                            <FieldGroupHeading icon={RiShieldCheckLine}>Legal &amp; Possession</FieldGroupHeading>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>
                                                        <span>K-RERA Number</span>
                                                        <span className={styles.labelHint}>Project-specific registration</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={currentProject.reraNumber || ""}
                                                        onChange={(e) => editProject(currentProject.id, "reraNumber", e.target.value)}
                                                        className={styles.input}
                                                        placeholder="e.g. K-RERA/PRJ/ERN/2024/0084"
                                                    />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Possession Date</label>
                                                    <input
                                                        type="text"
                                                        value={currentProject.possessionDate || ""}
                                                        onChange={(e) => editProject(currentProject.id, "possessionDate", e.target.value)}
                                                        className={styles.input}
                                                        placeholder="e.g. Dec 2027"
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Project Highlights / Overview</span>
                                                    <span className={styles.labelHint}>USPs buyers should know (optional)</span>
                                                </label>
                                                <textarea
                                                    value={currentProject.highlights || ""}
                                                    onChange={(e) => editProject(currentProject.id, "highlights", e.target.value)}
                                                    className={styles.textarea}
                                                    rows={3}
                                                    placeholder="e.g. Premium waterfront towers with private marina access, landscaped sky gardens on every 10th floor, and 5-minute connectivity to NH 66."
                                                />
                                            </div>

                                            <FieldGroupHeading icon={RiLayoutGridLine}>Project Scale <ReqStar /></FieldGroupHeading>

                                            {/* Quick Facts: scale of the development */}
                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Land Area <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProject.landArea || ""}
                                                        invalid={Boolean(editProjectErrors.landArea)}
                                                        onChange={(val) => editProject(currentProject.id, "landArea", val)}
                                                        options={getFieldOptions("landArea", LAND_AREA_OPTIONS, (data.projects || []).map((p) => p.landArea))}
                                                        placeholder="Select land area..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("landArea", val)}
                                                    />
                                                    <FieldError msg={editProjectErrors.landArea} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Towers <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProject.towers || ""}
                                                        invalid={Boolean(editProjectErrors.towers)}
                                                        onChange={(val) => editProject(currentProject.id, "towers", val)}
                                                        options={getFieldOptions("towers", TOWERS_OPTIONS, (data.projects || []).map((p) => p.towers))}
                                                        placeholder="Select towers & floors..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("towers", val)}
                                                    />
                                                    <FieldError msg={editProjectErrors.towers} />
                                                </div>
                                            </div>
                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Total Units <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProject.totalUnits || ""}
                                                        invalid={Boolean(editProjectErrors.totalUnits)}
                                                        onChange={(val) => editProject(currentProject.id, "totalUnits", val)}
                                                        options={getFieldOptions("totalUnits", TOTAL_UNITS_OPTIONS, (data.projects || []).map((p) => p.totalUnits))}
                                                        placeholder="Select total units..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("totalUnits", val)}
                                                    />
                                                    <FieldError msg={editProjectErrors.totalUnits} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Construction Progress <ReqStar /></label>
                                                    <select
                                                        value={currentProject.constructionProgress || ""}
                                                        onChange={(e) => editProject(currentProject.id, "constructionProgress", e.target.value)}
                                                        className={styles.select}
                                                        style={editProjectErrors.constructionProgress ? INVALID_INPUT_STYLE : undefined}
                                                    >
                                                        <option value="">Select construction progress...</option>
                                                        {CONSTRUCTION_PROGRESS_OPTIONS.map((prog) => (
                                                            <option key={prog} value={prog}>{prog}</option>
                                                        ))}
                                                        {currentProject.constructionProgress && !CONSTRUCTION_PROGRESS_OPTIONS.includes(currentProject.constructionProgress) && (
                                                            <option value={currentProject.constructionProgress}>{currentProject.constructionProgress}</option>
                                                        )}
                                                    </select>
                                                    <FieldError msg={editProjectErrors.constructionProgress} />
                                                </div>
                                            </div>

                                            {/* Configurations & Pricing */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Configurations &amp; Pricing</span>
                                                    <span className={styles.labelHint}>Add each BHK type with its area and price</span>
                                                </label>

                                                {currentProject.configurations?.length > 0 && (
                                                    <div className={styles.configList}>
                                                        {currentProject.configurations.map((cfg) => (
                                                            <div key={cfg.id} className={styles.configItem}>
                                                                <span className={styles.configItemText}>
                                                                    <strong>{cfg.type || "Configuration"}</strong>
                                                                    {cfg.area && ` · ${cfg.area}`}
                                                                    {cfg.price && ` · ${cfg.price}`}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeEditProjectConfig(currentProject.id, cfg.id)}
                                                                    className={styles.amenityRemoveBtn}
                                                                    title="Remove configuration"
                                                                >
                                                                    <RiCloseLine />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className={styles.configRow}>
                                                    <BuilderSearchableSelect
                                                        value={editConfigDraft.type}
                                                        onChange={(val) => setEditConfigDraft((d) => ({ ...d, type: val }))}
                                                        options={getFieldOptions("configType", CONFIG_TYPE_OPTIONS, (data.projects || []).flatMap((p) => (p.configurations || []).map((c) => c.type)))}
                                                        placeholder="Type..."
                                                        compact
                                                        onAddNew={(val) => handleAddNewDropdownOption("configType", val)}
                                                    />
                                                    <BuilderSearchableSelect
                                                        value={editConfigDraft.area}
                                                        onChange={(val) => setEditConfigDraft((d) => ({ ...d, area: val }))}
                                                        options={getFieldOptions("configArea", PROPERTY_SQFT_OPTIONS, (data.projects || []).flatMap((p) => (p.configurations || []).map((c) => c.area)))}
                                                        placeholder="Carpet area..."
                                                        compact
                                                        onAddNew={(val) => handleAddNewDropdownOption("configArea", val)}
                                                    />
                                                    <BuilderSearchableSelect
                                                        value={editConfigDraft.price}
                                                        onChange={(val) => setEditConfigDraft((d) => ({ ...d, price: val }))}
                                                        options={getFieldOptions("configPrice", PROPERTY_PRICE_OPTIONS, (data.projects || []).flatMap((p) => (p.configurations || []).map((c) => c.price)))}
                                                        placeholder="Price..."
                                                        compact
                                                        onAddNew={(val) => handleAddNewDropdownOption("configPrice", val)}
                                                    />
                                                    <button type="button" onClick={() => addEditProjectConfig(currentProject.id)} className={styles.bankAddBtn}>
                                                        + Add
                                                    </button>
                                                </div>
                                            </div>

                                            <FieldGroupHeading icon={RiGalleryLine}>Media</FieldGroupHeading>

                                            {/* Project Photo Upload */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Project Photo (File Upload) <ReqStar /></label>
                                                <input
                                                    type="file"
                                                    ref={editProjectImageInputRef}
                                                    onChange={(e) => handleEditProjectImageUpload(currentProject.id, e)}
                                                    accept="image/*"
                                                    className={styles.hiddenInput}
                                                />
                                                {currentProject.image ? (
                                                    <div className={styles.projectImagePreview}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img onError={hideBrokenImg} onLoad={showLoadedImg} src={currentProject.image} alt={currentProject.title} className={styles.projectPreviewImg} />
                                                        <span className={styles.ratioBadgeInPreview}>
                                                            <RiCropLine /> 16:9 Project Photo
                                                        </span>
                                                        <div className={styles.projectImageActions}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setProjectCropTarget(currentProject.id);
                                                                    setProjectImageToCrop(currentProject.image);
                                                                    setProjectCropModalOpen(true);
                                                                }}
                                                                className={styles.projectImageChangeBtn}
                                                                title="Crop or adjust 16:9 photo"
                                                            >
                                                                <RiCropLine /> Crop 16:9
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editProjectImageInputRef.current?.click()}
                                                                className={styles.projectImageChangeBtn}
                                                            >
                                                                <RiUploadCloud2Line /> Change Photo
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editProject(currentProject.id, "image", "")}
                                                                className={styles.projectImageRemoveBtn}
                                                            >
                                                                <RiDeleteBinLine /> Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => editProjectImageInputRef.current?.click()}
                                                        className={styles.uploadCard}
                                                        style={editProjectErrors.image ? INVALID_UPLOAD_STYLE : undefined}
                                                    >
                                                        <RiImageAddLine className={styles.uploadIcon} />
                                                        <p className={styles.uploadText}>Click to Upload Project Photo</p>
                                                        <p className={styles.uploadHint}>PNG, JPG or WEBP • Crop to 16:9 (1600×900px)</p>
                                                    </div>
                                                )}
                                                <FieldError msg={editProjectErrors.image} />
                                            </div>

                                            {/* Project Gallery (multiple categorised photos) */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Project Gallery</span>
                                                    <span className={styles.labelHint}>Exterior, interior, amenities, floor plan &amp; master plan photos</span>
                                                </label>

                                                {currentProject.gallery?.length > 0 && (
                                                    <div className={styles.galleryGrid}>
                                                        {currentProject.gallery.map((img) => (
                                                            <div key={img.id} className={styles.galleryThumb}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={img.url} alt={img.category} className={styles.galleryThumbImg} />
                                                                <span className={styles.galleryThumbCategory}>{img.category}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeEditProjectGalleryImage(currentProject.id, img.id)}
                                                                    className={styles.galleryThumbRemove}
                                                                    title="Remove photo"
                                                                >
                                                                    <RiCloseLine />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <input
                                                    type="file"
                                                    ref={editProjectGalleryInputRef}
                                                    onChange={(e) => handleEditProjectGalleryUpload(currentProject.id, e)}
                                                    accept="image/*"
                                                    className={styles.hiddenInput}
                                                />
                                                <div className={styles.galleryUploadRow}>
                                                    <select
                                                        value={editGalleryCategory}
                                                        onChange={(e) => setEditGalleryCategory(e.target.value)}
                                                        className={styles.select}
                                                    >
                                                        {GALLERY_CATEGORY_OPTIONS.map((cat) => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => editProjectGalleryInputRef.current?.click()}
                                                        className={styles.projectImageChangeBtn}
                                                    >
                                                        <RiUploadCloud2Line /> Add Photo
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Brochure Upload */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Brochure</span>
                                                    <span className={styles.labelHint}>PDF or image (optional)</span>
                                                </label>
                                                <input
                                                    type="file"
                                                    ref={editProjectBrochureInputRef}
                                                    onChange={(e) => handleEditProjectBrochureUpload(currentProject.id, e)}
                                                    accept="application/pdf,image/*"
                                                    className={styles.hiddenInput}
                                                />
                                                {currentProject.brochureUrl ? (
                                                    <div className={styles.brochureRow}>
                                                        <RiFileList3Line />
                                                        <span className={styles.brochureName}>{currentProject.brochureName || "Brochure uploaded"}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => editProjectBrochureInputRef.current?.click()}
                                                            className={styles.projectImageChangeBtn}
                                                        >
                                                            Replace
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                editProject(currentProject.id, "brochureUrl", "");
                                                                editProject(currentProject.id, "brochureName", "");
                                                            }}
                                                            className={styles.projectImageRemoveBtn}
                                                        >
                                                            <RiDeleteBinLine /> Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => editProjectBrochureInputRef.current?.click()}
                                                        className={styles.uploadCard}
                                                    >
                                                        <RiFileList3Line className={styles.uploadIcon} />
                                                        <p className={styles.uploadText}>Click to Upload Brochure</p>
                                                        <p className={styles.uploadHint}>PDF, PNG or JPG</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Key Amenities */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Key Amenities</span>
                                                    <span className={styles.labelHint}>Tap to select or type custom</span>
                                                </label>

                                                {currentProject.amenities && currentProject.amenities.length > 0 && (
                                                    <div className={styles.amenityChipsRow}>
                                                        {currentProject.amenities.map((am, i) => (
                                                            <span key={i} className={styles.amenityChip}>
                                                                {am}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleEditProjectAmenity(currentProject.id, am)}
                                                                    className={styles.amenityRemoveBtn}
                                                                    title={`Remove ${am}`}
                                                                >
                                                                    <RiCloseLine />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className={styles.quickAmenityPills}>
                                                    {allKnownAmenities.map((am) => {
                                                        const isSelected = (currentProject.amenities || []).some(
                                                            (a) => String(a).trim().toLowerCase() === am.toLowerCase()
                                                        );
                                                        return (
                                                            <button
                                                                key={am}
                                                                type="button"
                                                                onClick={() => toggleEditProjectAmenity(currentProject.id, am)}
                                                                className={`${styles.quickAmenityBtn} ${isSelected ? styles.quickAmenityBtnActive : ""}`}
                                                                aria-pressed={isSelected}
                                                            >
                                                                <span className={styles.quickAmenityIcon} aria-hidden="true">{isSelected ? <RiCheckLine /> : <RiAddLine />}</span>
                                                                <span>{am}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className={styles.bankCustomRow} style={{ marginTop: "8px" }}>
                                                    <input
                                                        type="text"
                                                        value={editAmenityInput}
                                                        onChange={(e) => setEditAmenityInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                addEditProjectCustomAmenity(currentProject.id);
                                                            }
                                                        }}
                                                        className={styles.input}
                                                        placeholder="Type custom amenity (e.g. Helipad, Squash Court)..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => addEditProjectCustomAmenity(currentProject.id)}
                                                        className={styles.bankAddBtn}
                                                        disabled={!editAmenityInput.trim()}
                                                    >
                                                        + Add
                                                    </button>
                                                </div>
                                            </div>

                                            <FieldGroupHeading icon={RiRoadMapLine}>Neighborhood &amp; Distances</FieldGroupHeading>
                                            <div className={styles.neighborhoodSubBar}>
                                                <p className={styles.groupHint}>Tag nearby transit hubs, IT parks, hospitals, schools and malls with travel times.</p>
                                                {(currentProject.neighborhood && currentProject.neighborhood.length > 0) && (
                                                    <span className={styles.neighborhoodCountBadge}>
                                                        <RiCheckboxCircleLine /> {currentProject.neighborhood.length} {currentProject.neighborhood.length === 1 ? "Landmark" : "Landmarks"}
                                                    </span>
                                                )}
                                            </div>

                                            {(currentProject.neighborhood && currentProject.neighborhood.length > 0) && (
                                                <div className={styles.landmarksList}>
                                                    {currentProject.neighborhood.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className={`${styles.landmarkItem} ${editingExistingLandmarkId === item.id ? styles.landmarkItemEditing : ""}`}
                                                        >
                                                            <div className={styles.landmarkIcon}><RiMapPin2Line /></div>
                                                            <div className={styles.landmarkContent}>
                                                                <h4 className={styles.landmarkName}>{item.landmark}</h4>
                                                                <div className={styles.landmarkMeta}>
                                                                    <span className={styles.landmarkCategoryPill}>{item.category || "Landmark"}</span>
                                                                    <span className={styles.landmarkDistancePill}>{item.distance || "Nearby"}</span>
                                                                </div>
                                                            </div>
                                                            <div className={styles.landmarkActions}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEditExistingProjectLandmark(item)}
                                                                    className={styles.actionIconBtn}
                                                                    title="Edit landmark"
                                                                >
                                                                    <RiEditLine />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeEditProjectLandmark(currentProject.id, item.id)}
                                                                    className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                                                                    title="Remove landmark"
                                                                >
                                                                    <RiDeleteBinLine />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {(() => {
                                                const isEditingExistingLm = Boolean(
                                                    editingExistingLandmarkId &&
                                                    (currentProject.neighborhood || []).some((x) => x.id === editingExistingLandmarkId)
                                                );
                                                return (
                                                    <div
                                                        ref={editLandmarkComposerRef}
                                                        className={`${styles.landmarkComposer} ${isEditingExistingLm ? styles.landmarkComposerEditing : ""}`}
                                                    >
                                                        <div className={styles.landmarkComposerHeader}>
                                                            <span className={styles.landmarkComposerTitle}>
                                                                {isEditingExistingLm ? (
                                                                    <>
                                                                        <RiEditLine /> Editing Landmark
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <RiMapPin2Line /> Add Nearby Landmark
                                                                    </>
                                                                )}
                                                            </span>
                                                            {isEditingExistingLm && (
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelEditExistingProjectLandmark}
                                                                    className={styles.landmarkCancelEditBtn}
                                                                >
                                                                    <RiCloseLine /> Cancel
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className={styles.formGroup}>
                                                            <label className={styles.label}>
                                                                <span>Landmark Name</span>
                                                                <span className={styles.labelHint}>Select or create custom</span>
                                                            </label>
                                                            <BuilderSearchableSelect
                                                                value={editLandmarkDraft.landmark}
                                                                onChange={(val) => {
                                                                    setEditLandmarkDraft((prev) => ({
                                                                        ...prev,
                                                                        landmark: val,
                                                                        category: LANDMARK_PRESET_CATEGORIES[val] || prev.category,
                                                                    }));
                                                                }}
                                                                options={allKnownLandmarks}
                                                                placeholder="Search or type a new landmark name..."
                                                                onAddNew={(val) => handleAddNewDropdownOption("landmarkName", val)}
                                                            />
                                                            <div className={styles.quickAmenityPills} style={{ marginTop: "10px" }}>
                                                                {allKnownLandmarks.map((preset) => {
                                                                    const isDraftMatch = editLandmarkDraft.landmark?.trim().toLowerCase() === preset.toLowerCase();
                                                                    const isAlreadyTagged = (currentProject.neighborhood || []).some(
                                                                        (n) => n.landmark?.trim().toLowerCase() === preset.toLowerCase()
                                                                    );
                                                                    const isActive = isDraftMatch || isAlreadyTagged;
                                                                    return (
                                                                        <button
                                                                            key={preset}
                                                                            type="button"
                                                                            onClick={() => selectPresetForEditLandmark(preset)}
                                                                            className={`${styles.quickAmenityBtn} ${isActive ? styles.quickAmenityBtnActive : ""}`}
                                                                            aria-pressed={isActive}
                                                                        >
                                                                            <span className={styles.quickAmenityIcon} aria-hidden="true">
                                                                                {isActive ? <RiCheckLine /> : <RiAddLine />}
                                                                            </span>
                                                                            <span>{preset}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        <div className={styles.grid2}>
                                                            <div className={styles.formGroup}>
                                                                <label className={styles.label}>Category</label>
                                                                <BuilderSearchableSelect
                                                                    value={editLandmarkDraft.category}
                                                                    onChange={(val) => setEditLandmarkDraft((prev) => ({ ...prev, category: val }))}
                                                                    options={getFieldOptions("landmarkCategory", NEIGHBORHOOD_CATEGORY_OPTIONS, [
                                                                        ...(currentProject.neighborhood || []).map((l) => l.category),
                                                                        ...(data.projects || []).flatMap((p) => (p.neighborhood || []).map((l) => l.category)),
                                                                    ])}
                                                                    placeholder="Select or type category..."
                                                                    onAddNew={(val) => handleAddNewDropdownOption("landmarkCategory", val)}
                                                                />
                                                            </div>
                                                            <div className={styles.formGroup}>
                                                                <label className={styles.label}>Distance / Travel Time</label>
                                                                <BuilderSearchableSelect
                                                                    value={editLandmarkDraft.distance}
                                                                    onChange={(val) => setEditLandmarkDraft((prev) => ({ ...prev, distance: val }))}
                                                                    options={getFieldOptions("distanceTime", NEIGHBORHOOD_DISTANCE_OPTIONS, [
                                                                        ...(currentProject.neighborhood || []).map((l) => l.distance),
                                                                        ...(data.projects || []).flatMap((p) => (p.neighborhood || []).map((l) => l.distance)),
                                                                    ])}
                                                                    placeholder="e.g. 2.0 Km (5 Mins drive)..."
                                                                    onAddNew={(val) => handleAddNewDropdownOption("distanceTime", val)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className={styles.landmarkComposerFooter}>
                                                            <span className={styles.landmarkFooterNote}>
                                                                New landmarks automatically save to dropdown suggestions.
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => addEditProjectLandmark(currentProject.id)}
                                                                disabled={!editLandmarkDraft.landmark?.trim()}
                                                                className={styles.landmarkSubmitBtn}
                                                            >
                                                                {isEditingExistingLm ? (
                                                                    <>
                                                                        <RiCheckLine /> Save Landmark
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <RiAddLine /> Add Landmark to Project
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            <div className={styles.editBoxActions}>
                                                <button
                                                    type="button"
                                                    onClick={() => removeProject(currentProject.id)}
                                                    className={styles.editBoxDeleteBtn}
                                                >
                                                    <RiDeleteBinLine /> Delete
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={finishEditingProject}
                                                    className={styles.editBoxSaveBtn}
                                                >
                                                    <RiCheckLine /> Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SectionModal>
                        </div>

                        {/* ── Accordion 4: Available Properties & Units ── */}
                        <div className={`${styles.accordionItem} ${openSections.properties ? styles.accordionItemOpen : ""}`}>
                            <button
                                type="button"
                                onClick={() => toggleSection("properties")}
                                className={`${styles.accordionHeader} ${openSections.properties ? styles.accordionHeaderOpen : ""}`}
                                aria-haspopup="dialog"
                            >
                                <div className={styles.accordionHeaderLeft}>
                                    <div className={styles.accordionIconBox}>
                                        <RiCalendarLine />
                                    </div>
                                    <div className={styles.accordionHeaderText}>
                                        <h3 className={styles.accordionTitle}>Available Units &amp; Floor Plans</h3>
                                        <span className={styles.accordionSubtitle}>
                                            {hasActiveBuilderSub
                                                ? unitUnlimitedFlag
                                                    ? `${unitsUsedCount} Units (Unlimited Plan)`
                                                    : `${unitsUsedCount} / ${unitLimitNum} Units · ${
                                                          unitsOverCount > 0
                                                              ? `${unitsOverCount} over limit`
                                                              : `${unitsPendingCount} pending`
                                                      }`
                                                : `${unitsUsedCount} Units & configurations`}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.accordionHeaderRight}>
                                    {renderProgressBadge("properties")}
                                    <RiArrowRightSLine
                                        className={styles.accordionChevron}
                                    />
                                </div>
                            </button>

                            <SectionModal
                                open={openSections.properties}
                                activeKey="properties"
                                {...sectionNav}
                                onClose={closeSections}
                                icon={<RiCalendarLine />}
                                title={<>Available Units &amp; Floor Plans</>}
                                subtitle={
                                    <>
                                        {hasActiveBuilderSub
                                            ? unitUnlimitedFlag
                                                ? `${unitsUsedCount} Added · Plan Limit: Unlimited Floor Units`
                                                : `${unitsUsedCount} of ${unitLimitNum} Used · ${
                                                      unitsOverCount > 0
                                                          ? `${unitsOverCount} Over Plan Limit`
                                                          : `${unitsPendingCount} Pending`
                                                  } (${activeBuilderPlanTitle})`
                                            : `${unitsUsedCount} Units & configurations · Builder Plan required`}
                                    </>
                                }
                                badge={renderProgressBadge("properties")}
                            >
                                <div className={styles.accordionBody}>
                                    <div className={styles.editorSectionHeader}>
                                        <h2 className={styles.sectionTitle}>Available Properties &amp; Units ({unitsUsedCount})</h2>
                                        <p className={styles.sectionDesc}>List active floor plans, sizes and pricing for prospective buyers.</p>
                                    </div>

                                    {/* Builder Plan Units & Floor Plans Quota Banner */}
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            flexWrap: "wrap",
                                            gap: "10px",
                                            padding: "12px 15px",
                                            marginBottom: "14px",
                                            borderRadius: "12px",
                                            background: !hasActiveBuilderSub
                                                ? "#fffbeb"
                                                : unitsOverCount > 0
                                                ? "#fef2f2"
                                                : !canAddMoreUnits
                                                ? "#fffbeb"
                                                : "#ecfdf5",
                                            border: `1.5px solid ${
                                                !hasActiveBuilderSub
                                                    ? "#fcd34d"
                                                    : unitsOverCount > 0
                                                    ? "#fca5a5"
                                                    : !canAddMoreUnits
                                                    ? "#fcd34d"
                                                    : "#a7f3d0"
                                            }`,
                                        }}
                                    >
                                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                                                {hasActiveBuilderSub ? (
                                                    unitUnlimitedFlag ? (
                                                        <>Plan Quota ({activeBuilderPlanTitle}): Unlimited Units &amp; Floor Plans ({unitsUsedCount} added)</>
                                                    ) : (
                                                        <>
                                                            Plan Units &amp; Floor Plans Limit ({activeBuilderPlanTitle}): {unitsUsedCount} of {unitLimitNum} Used &bull;{" "}
                                                            <span style={{ color: unitsOverCount > 0 ? "#dc2626" : unitsPendingCount === 0 ? "#b45309" : "#059669" }}>
                                                                {unitsOverCount > 0
                                                                    ? `${unitsOverCount} Over Limit`
                                                                    : `${unitsPendingCount} Pending`}
                                                            </span>
                                                        </>
                                                    )
                                                ) : (
                                                    <>No Active Builder Plan &bull; Units &amp; Floor Plans Limit: 0</>
                                                )}
                                            </span>
                                            <span style={{ fontSize: "12px", color: "#475569" }}>
                                                {!hasActiveBuilderSub
                                                    ? "Purchase a Builder Plan to list available units and floor plans."
                                                    : unitsOverCount > 0
                                                    ? `You have ${unitsUsedCount} floor units, exceeding your ${unitLimitNum}-unit limit. Please delete ${unitsOverCount} unit(s) below or upgrade your plan.`
                                                    : !canAddMoreUnits
                                                    ? `You have used all ${unitLimitNum} floor unit slot(s) on your current plan. Upgrade to add more units.`
                                                    : "You can add floor plans and property units up to your active Builder Plan limit."}
                                            </span>
                                        </div>
                                        {(!hasActiveBuilderSub || !canAddMoreUnits || unitsOverCount > 0) && (
                                            <Link
                                                href="/pricing?for=builder"
                                                style={{
                                                    padding: "7px 14px",
                                                    borderRadius: "8px",
                                                    background: "#0f172a",
                                                    color: "#ffffff",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    textDecoration: "none",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {hasActiveBuilderSub ? "Upgrade Builder Plan →" : "Choose Builder Plan →"}
                                            </Link>
                                        )}
                                    </div>

                                    {quotaAlert && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "10px 14px",
                                                marginBottom: "14px",
                                                borderRadius: "10px",
                                                background: "#fef2f2",
                                                border: "1px solid #fca5a5",
                                                color: "#991b1b",
                                                fontSize: "12.5px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            <RiAlertLine style={{ flexShrink: 0, fontSize: "16px" }} />
                                            <span>{quotaAlert}</span>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={startAddNewProperty}
                                        disabled={!canAddMoreUnits}
                                        className={styles.addItemBtn}
                                        style={
                                            !canAddMoreUnits
                                                ? {
                                                      opacity: 0.65,
                                                      cursor: "not-allowed",
                                                      background: "#f8fafc",
                                                      color: "#64748b",
                                                      borderColor: "#cbd5e1",
                                                  }
                                                : undefined
                                        }
                                    >
                                        {canAddMoreUnits ? (
                                            <>
                                                <RiAddLine /> Add Property Unit
                                                {!unitUnlimitedFlag && ` (${unitsPendingCount} remaining)`}
                                            </>
                                        ) : !hasActiveBuilderSub ? (
                                            <>
                                                <RiLockLine /> Purchase Builder Plan to Add Units
                                            </>
                                        ) : (
                                            <>
                                                <RiLockLine /> Unit Limit Reached ({unitsUsedCount}/{unitLimitNum} Used)
                                            </>
                                        )}
                                    </button>

                                    {/* ── Add New Property Unit Empty Form ── */}
                                    {isCreatingProperty && (
                                        <div ref={newPropertyBoxRef} className={styles.editBox}>
                                            <div className={styles.editBoxHeader}>
                                                <h3 className={styles.editBoxTitle}>
                                                    <RiAddLine style={{ color: "#10b981", verticalAlign: "middle", marginRight: "4px" }} />
                                                    Add New Property Unit
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={cancelNewProperty}
                                                    className={styles.actionIconBtn}
                                                    title="Cancel"
                                                >
                                                    <RiCloseLine />
                                                </button>
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Floor Plan Title / Type <ReqStar /></label>
                                                <BuilderSearchableSelect
                                                    value={newPropertyData.title}
                                                    invalid={Boolean(newUnitErrors.title)}
                                                    onChange={(val) => {
                                                        if (String(val || "").trim()) setNewUnitErrors((er) => ({ ...er, title: undefined }));
                                                        setNewPropertyData((p) => ({ ...p, title: val }));
                                                    }}
                                                    options={getFieldOptions("propertyTitle", PROPERTY_TITLE_OPTIONS, (data.properties || []).map((p) => p.title))}
                                                    placeholder="Select floor plan title / type..."
                                                    onAddNew={(val) => handleAddNewDropdownOption("propertyTitle", val)}
                                                />
                                                <FieldError msg={newUnitErrors.title} />
                                            </div>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Super Built-up Area <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newPropertyData.sqft}
                                                        invalid={Boolean(newUnitErrors.sqft)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewUnitErrors((er) => ({ ...er, sqft: undefined }));
                                                            setNewPropertyData((p) => ({ ...p, sqft: val }));
                                                        }}
                                                        options={getFieldOptions("propertySqft", PROPERTY_SQFT_OPTIONS, (data.properties || []).map((p) => p.sqft))}
                                                        placeholder="Select built-up area..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("propertySqft", val)}
                                                    />
                                                    <FieldError msg={newUnitErrors.sqft} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Starting Price <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newPropertyData.price}
                                                        invalid={Boolean(newUnitErrors.price)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewUnitErrors((er) => ({ ...er, price: undefined }));
                                                            setNewPropertyData((p) => ({ ...p, price: val }));
                                                        }}
                                                        options={getFieldOptions("propertyPrice", PROPERTY_PRICE_OPTIONS, (data.properties || []).map((p) => p.price))}
                                                        placeholder="Select starting price..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("propertyPrice", val)}
                                                    />
                                                    <FieldError msg={newUnitErrors.price} />
                                                </div>
                                            </div>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Rooms / Bedrooms <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={newPropertyData.rooms}
                                                        invalid={Boolean(newUnitErrors.rooms)}
                                                        onChange={(val) => {
                                                            if (String(val || "").trim()) setNewUnitErrors((er) => ({ ...er, rooms: undefined }));
                                                            setNewPropertyData((p) => ({ ...p, rooms: val }));
                                                        }}
                                                        options={getFieldOptions("propertyRooms", PROPERTY_ROOMS_OPTIONS, (data.properties || []).map((p) => p.rooms))}
                                                        placeholder="Select rooms / configuration..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("propertyRooms", val)}
                                                    />
                                                    <FieldError msg={newUnitErrors.rooms} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Availability Tag</label>
                                                    <select
                                                        value={newPropertyData.status}
                                                        onChange={(e) => setNewPropertyData((p) => ({ ...p, status: e.target.value }))}
                                                        className={styles.select}
                                                    >
                                                        {PROPERTY_STATUS_OPTIONS.map((status) => (
                                                            <option key={status} value={status}>{status}</option>
                                                        ))}
                                                        {newPropertyData.status && !PROPERTY_STATUS_OPTIONS.includes(newPropertyData.status) && (
                                                            <option value={newPropertyData.status}>{newPropertyData.status}</option>
                                                        )}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Floor Plan / Unit Photo Upload */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Floor Plan / Unit Photo (File Upload) <ReqStar /></label>
                                                <input
                                                    type="file"
                                                    ref={newPropertyImageInputRef}
                                                    onChange={handleNewPropertyImageUpload}
                                                    accept="image/*"
                                                    className={styles.hiddenInput}
                                                />
                                                {newPropertyData.image ? (
                                                    <div className={styles.projectImagePreview}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img onError={hideBrokenImg} onLoad={showLoadedImg} src={newPropertyData.image} alt="Unit preview" className={styles.projectPreviewImg} />
                                                        <span className={styles.ratioBadgeInPreview}>
                                                            <RiCropLine /> 16:9 Floor Plan
                                                        </span>
                                                        <div className={styles.projectImageActions}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPropertyCropTarget("new");
                                                                    setPropertyImageToCrop(newPropertyData.image);
                                                                    setPropertyCropModalOpen(true);
                                                                }}
                                                                className={styles.projectImageChangeBtn}
                                                                title="Crop or adjust 16:9 unit photo"
                                                            >
                                                                <RiCropLine /> Crop 16:9
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => newPropertyImageInputRef.current?.click()}
                                                                className={styles.projectImageChangeBtn}
                                                            >
                                                                <RiUploadCloud2Line /> Change Photo
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewPropertyData((p) => ({ ...p, image: "" }))}
                                                                className={styles.projectImageRemoveBtn}
                                                            >
                                                                <RiDeleteBinLine /> Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => newPropertyImageInputRef.current?.click()}
                                                        className={styles.uploadCard}
                                                        style={newUnitErrors.image ? INVALID_UPLOAD_STYLE : undefined}
                                                    >
                                                        <RiImageAddLine className={styles.uploadIcon} />
                                                        <p className={styles.uploadText}>Click to Upload Floor Plan / Unit Photo</p>
                                                        <p className={styles.uploadHint}>PNG, JPG or WEBP • Crop to 16:9 (1600×900px)</p>
                                                    </div>
                                                )}
                                                <FieldError msg={newUnitErrors.image} />
                                            </div>

                                            <div className={styles.editBoxActions}>
                                                <button
                                                    type="button"
                                                    onClick={cancelNewProperty}
                                                    className={styles.editBoxCancelBtn}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={saveNewProperty}
                                                    className={styles.editBoxSaveBtn}
                                                >
                                                    <RiCheckLine /> Save
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Existing Property Units List ── */}
                                    {(!data.properties || data.properties.length === 0) ? (
                                        <div className={styles.emptyTipBox}>
                                            <RiCalendarLine style={{ fontSize: "24px", color: "#94a3b8" }} />
                                            <span>No units or floor plans listed yet. Click <strong>&quot;+ Add Property Unit&quot;</strong> above to list unit configurations.</span>
                                        </div>
                                    ) : (
                                        <div className={styles.itemList}>
                                            {data.properties.map((prop) => (
                                                <div
                                                    key={prop.id}
                                                    onClick={() => {
                                                        setIsCreatingProperty(false);
                                                        setEditingPropertyId(prop.id);
                                                        scrollToEditorBox(editPropertyBoxRef);
                                                    }}
                                                    className={`${styles.itemCard} ${!isCreatingProperty && editingPropertyId === prop.id ? styles.itemCardActive : ""}`}
                                                >
                                                    <div className={styles.itemInfo}>
                                                        {prop.image ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img onError={hideBrokenImg} onLoad={showLoadedImg} src={prop.image} alt="" className={styles.itemThumb} />
                                                        ) : (
                                                            <div className={styles.itemThumbPlaceholder}>
                                                                <RiLayoutMasonryLine />
                                                            </div>
                                                        )}
                                                        <div className={styles.itemDetails}>
                                                            <p className={styles.itemName}>{prop.title || "Untitled Unit"}</p>
                                                            <p className={styles.itemSub}>{prop.sqft || "-"} • {prop.price || "Price on request"} • {prop.status || "Available"}</p>
                                                        </div>
                                                    </div>

                                                    <div className={styles.itemActions}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsCreatingProperty(false);
                                                                setEditingPropertyId(prop.id);
                                                                scrollToEditorBox(editPropertyBoxRef);
                                                            }}
                                                            className={styles.actionIconBtn}
                                                            title="Edit unit"
                                                        >
                                                            <RiEditLine />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => removeProperty(prop.id, e)}
                                                            className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                                                            title="Delete unit"
                                                        >
                                                            <RiDeleteBinLine />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── Edit Existing Property Unit Form ── */}
                                    {!isCreatingProperty && currentProperty && (
                                        <div ref={editPropertyBoxRef} className={styles.editBox}>
                                            <div className={styles.editBoxHeader}>
                                                <h3 className={styles.editBoxTitle}>
                                                    <RiEditLine style={{ color: "#2563eb", verticalAlign: "middle", marginRight: "4px" }} />
                                                    Editing Unit: {currentProperty.title || "Untitled Unit"}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingPropertyId(null)}
                                                    className={styles.actionIconBtn}
                                                    title="Close editor"
                                                >
                                                    <RiCloseLine />
                                                </button>
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Floor Plan Title / Type <ReqStar /></label>
                                                <BuilderSearchableSelect
                                                    value={currentProperty.title || ""}
                                                    invalid={Boolean(editUnitErrors.title)}
                                                    onChange={(val) => editProperty(currentProperty.id, "title", val)}
                                                    options={getFieldOptions("propertyTitle", PROPERTY_TITLE_OPTIONS, (data.properties || []).map((p) => p.title))}
                                                    placeholder="Select floor plan title / type..."
                                                    onAddNew={(val) => handleAddNewDropdownOption("propertyTitle", val)}
                                                />
                                                <FieldError msg={editUnitErrors.title} />
                                            </div>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Super Built-up Area <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProperty.sqft || ""}
                                                        invalid={Boolean(editUnitErrors.sqft)}
                                                        onChange={(val) => editProperty(currentProperty.id, "sqft", val)}
                                                        options={getFieldOptions("propertySqft", PROPERTY_SQFT_OPTIONS, (data.properties || []).map((p) => p.sqft))}
                                                        placeholder="Select built-up area..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("propertySqft", val)}
                                                    />
                                                    <FieldError msg={editUnitErrors.sqft} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Starting Price <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProperty.price || ""}
                                                        invalid={Boolean(editUnitErrors.price)}
                                                        onChange={(val) => editProperty(currentProperty.id, "price", val)}
                                                        options={getFieldOptions("propertyPrice", PROPERTY_PRICE_OPTIONS, (data.properties || []).map((p) => p.price))}
                                                        placeholder="Select starting price..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("propertyPrice", val)}
                                                    />
                                                    <FieldError msg={editUnitErrors.price} />
                                                </div>
                                            </div>

                                            <div className={styles.grid2}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Rooms / Bedrooms <ReqStar /></label>
                                                    <BuilderSearchableSelect
                                                        value={currentProperty.rooms || ""}
                                                        invalid={Boolean(editUnitErrors.rooms)}
                                                        onChange={(val) => editProperty(currentProperty.id, "rooms", val)}
                                                        options={getFieldOptions("propertyRooms", PROPERTY_ROOMS_OPTIONS, (data.properties || []).map((p) => p.rooms))}
                                                        placeholder="Select rooms / configuration..."
                                                        onAddNew={(val) => handleAddNewDropdownOption("propertyRooms", val)}
                                                    />
                                                    <FieldError msg={editUnitErrors.rooms} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Availability Tag</label>
                                                    <select
                                                        value={currentProperty.status || "Available"}
                                                        onChange={(e) => editProperty(currentProperty.id, "status", e.target.value)}
                                                        className={styles.select}
                                                    >
                                                        {PROPERTY_STATUS_OPTIONS.map((status) => (
                                                            <option key={status} value={status}>{status}</option>
                                                        ))}
                                                        {currentProperty.status && !PROPERTY_STATUS_OPTIONS.includes(currentProperty.status) && (
                                                            <option value={currentProperty.status}>{currentProperty.status}</option>
                                                        )}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Floor Plan / Unit Photo Upload */}
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Floor Plan / Unit Photo (File Upload) <ReqStar /></label>
                                                <input
                                                    type="file"
                                                    ref={editPropertyImageInputRef}
                                                    onChange={(e) => handleEditPropertyImageUpload(currentProperty.id, e)}
                                                    accept="image/*"
                                                    className={styles.hiddenInput}
                                                />
                                                {currentProperty.image ? (
                                                    <div className={styles.projectImagePreview}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img onError={hideBrokenImg} onLoad={showLoadedImg} src={currentProperty.image} alt={currentProperty.title} className={styles.projectPreviewImg} />
                                                        <span className={styles.ratioBadgeInPreview}>
                                                            <RiCropLine /> 16:9 Floor Plan
                                                        </span>
                                                        <div className={styles.projectImageActions}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPropertyCropTarget(currentProperty.id);
                                                                    setPropertyImageToCrop(currentProperty.image);
                                                                    setPropertyCropModalOpen(true);
                                                                }}
                                                                className={styles.projectImageChangeBtn}
                                                                title="Crop or adjust 16:9 unit photo"
                                                            >
                                                                <RiCropLine /> Crop 16:9
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editPropertyImageInputRef.current?.click()}
                                                                className={styles.projectImageChangeBtn}
                                                            >
                                                                <RiUploadCloud2Line /> Change Photo
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editProperty(currentProperty.id, "image", "")}
                                                                className={styles.projectImageRemoveBtn}
                                                            >
                                                                <RiDeleteBinLine /> Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => editPropertyImageInputRef.current?.click()}
                                                        className={styles.uploadCard}
                                                        style={editUnitErrors.image ? INVALID_UPLOAD_STYLE : undefined}
                                                    >
                                                        <RiImageAddLine className={styles.uploadIcon} />
                                                        <p className={styles.uploadText}>Click to Upload Floor Plan / Unit Photo</p>
                                                        <p className={styles.uploadHint}>PNG, JPG or WEBP • Crop to 16:9 (1600×900px)</p>
                                                    </div>
                                                )}
                                                <FieldError msg={editUnitErrors.image} />
                                            </div>

                                            <div className={styles.editBoxActions}>
                                                <button
                                                    type="button"
                                                    onClick={() => removeProperty(currentProperty.id)}
                                                    className={styles.editBoxDeleteBtn}
                                                >
                                                    <RiDeleteBinLine /> Delete
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={finishEditingUnit}
                                                    className={styles.editBoxSaveBtn}
                                                >
                                                    <RiCheckLine /> Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SectionModal>
                        </div>

                        {/* ── Accordion 5: Building Specifications ── */}
                        <div className={`${styles.accordionItem} ${openSections.specs ? styles.accordionItemOpen : ""}`}>
                            <button
                                type="button"
                                onClick={() => toggleSection("specs")}
                                className={`${styles.accordionHeader} ${openSections.specs ? styles.accordionHeaderOpen : ""}`}
                                aria-haspopup="dialog"
                            >
                                <div className={styles.accordionHeaderLeft}>
                                    <div className={styles.accordionIconBox}>
                                        <RiFileList3Line />
                                    </div>
                                    <div className={styles.accordionHeaderText}>
                                        <h3 className={styles.accordionTitle}>Building Specifications</h3>
                                        <span className={styles.accordionSubtitle}>{data.specifications?.length || 0} Structural &amp; material specs</span>
                                    </div>
                                </div>
                                <div className={styles.accordionHeaderRight}>
                                    {renderProgressBadge("specs")}
                                    <RiArrowRightSLine
                                        className={styles.accordionChevron}
                                    />
                                </div>
                            </button>

                            <SectionModal
                                open={openSections.specs}
                                activeKey="specs"
                                {...sectionNav}
                                onClose={closeSections}
                                icon={<RiFileList3Line />}
                                title={<>Building Specifications</>}
                                subtitle={<>{data.specifications?.length || 0} Structural &amp; material specs</>}
                                badge={renderProgressBadge("specs")}
                            >
                                <div className={styles.accordionBody}>
                                    <div className={styles.editorSectionHeader}>
                                        <h2 className={styles.sectionTitle}>
                                            <RiFileList3Line /> Building Specifications ({data.specifications?.length || 0})
                                        </h2>
                                        <p className={styles.sectionDesc}>Detailed construction, structural and material standards.</p>
                                    </div>

                                    <button type="button" onClick={startAddNewSpecification} className={styles.addItemBtn}>
                                        <RiAddLine /> Add New Specification
                                    </button>

                                    {/* ── Add New Specification Empty Form ── */}
                                    {isCreatingSpec && (
                                        <div ref={newSpecBoxRef} className={styles.editBox}>
                                            <div className={styles.editBoxHeader}>
                                                <h3 className={styles.editBoxTitle}>
                                                    <RiAddLine style={{ color: "#10b981", verticalAlign: "middle", marginRight: "4px" }} />
                                                    Add New Building Specification
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={cancelNewSpecification}
                                                    className={styles.actionIconBtn}
                                                    title="Cancel"
                                                >
                                                    <RiCloseLine />
                                                </button>
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Specification Category <ReqStar /></label>
                                                <BuilderSearchableSelect
                                                    value={newSpecData.category}
                                                    invalid={Boolean(newSpecErrors.category)}
                                                    onChange={(val) => handleCategorySelectForNew(val)}
                                                    options={getFieldOptions(
                                                        "specCategory",
                                                        SPECIFICATION_CATEGORY_OPTIONS.filter((c) => c !== "Custom Category"),
                                                        (data.specifications || []).map((s) => s.category)
                                                    ).filter(
                                                        (opt) =>
                                                            !(data.specifications || []).some(
                                                                (s) => String(s.category || "").trim().toLowerCase() === opt.toLowerCase()
                                                            ) || opt.toLowerCase() === String(newSpecData.category || "").trim().toLowerCase()
                                                    )}
                                                    placeholder="Select specification category..."
                                                    onAddNew={(val) => handleAddNewDropdownOption("specCategory", val)}
                                                />
                                                <FieldError msg={newSpecErrors.category} />
                                            </div>

                                            {/* Quick select pills */}
                                            <div className={styles.quickAmenityPills} style={{ marginBottom: "14px" }}>
                                                {allKnownSpecCategories.map((cat) => {
                                                    const isAlreadyUsed = (data.specifications || []).some(
                                                        (s) => String(s.category || "").trim().toLowerCase() === cat.toLowerCase()
                                                    );
                                                    const isSelected = Boolean(
                                                        newSpecData.category &&
                                                        newSpecData.category.trim().toLowerCase() === cat.toLowerCase()
                                                    );
                                                    return (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => handleCategorySelectForNew(cat)}
                                                            className={`${styles.quickAmenityBtn} ${isSelected ? styles.quickAmenityBtnActive : ""}`}
                                                            style={isAlreadyUsed && !isSelected ? { opacity: 0.5, borderStyle: "dashed" } : undefined}
                                                            title={isAlreadyUsed ? `${cat} is already added` : cat}
                                                            aria-pressed={isSelected}
                                                        >
                                                            <span className={styles.quickAmenityIcon} aria-hidden="true">
                                                                {isSelected || isAlreadyUsed ? <RiCheckLine /> : <RiAddLine />}
                                                            </span>
                                                            <span>{cat}{isAlreadyUsed ? " (Added)" : ""}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Material &amp; Engineering Standards <ReqStar /></span>
                                                    <span className={styles.labelHint}>Enter your specification description</span>
                                                </label>
                                                <textarea
                                                    value={newSpecData.details}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        if (v.trim()) setNewSpecErrors((er) => ({ ...er, details: undefined }));
                                                        setNewSpecData((p) => ({ ...p, details: v }));
                                                    }}
                                                    className={styles.textarea}
                                                    style={newSpecErrors.details ? INVALID_INPUT_STYLE : undefined}
                                                    rows={3}
                                                    placeholder="Enter your material, brand, and engineering specification details..."
                                                />
                                                <FieldError msg={newSpecErrors.details} />
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Specification Photo</span>
                                                    <span className={styles.labelHint}>Optional — shown instead of a stock photo for this category</span>
                                                </label>
                                                {newSpecData.image ? (
                                                    <div className={styles.galleryThumb} style={{ width: "96px" }}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={newSpecData.image} alt="Specification" className={styles.galleryThumbImg} />
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewSpecData((p) => ({ ...p, image: "" }))}
                                                            className={styles.galleryThumbRemove}
                                                            title="Remove photo"
                                                        >
                                                            <RiCloseLine />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={styles.galleryUploadRow}>
                                                        <input
                                                            ref={newSpecImageInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleNewSpecImageUpload}
                                                            className={styles.hiddenInput}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => newSpecImageInputRef.current?.click()}
                                                            className={styles.projectImageChangeBtn}
                                                        >
                                                            <RiUploadCloud2Line /> Add Photo
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={styles.editBoxActions}>
                                                <button
                                                    type="button"
                                                    onClick={cancelNewSpecification}
                                                    className={styles.editBoxCancelBtn}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={saveNewSpecification}
                                                    className={styles.editBoxSaveBtn}
                                                >
                                                    <RiCheckLine /> Save
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Existing Specifications List ── */}
                                    {(!data.specifications || data.specifications.length === 0) ? (
                                        <div className={styles.emptyTipBox}>
                                            <RiFileList3Line style={{ fontSize: "24px", color: "#94a3b8" }} />
                                            <span>No specifications added. Click <strong>&quot;+ Add New Specification&quot;</strong> above to specify civil, flooring, or sanitary details.</span>
                                        </div>
                                    ) : (
                                        <div className={styles.itemList}>
                                            {data.specifications.map((spec) => (
                                                <div
                                                    key={spec.id}
                                                    onClick={() => {
                                                        setIsCreatingSpec(false);
                                                        setEditingSpecId(spec.id);
                                                        scrollToEditorBox(editSpecBoxRef);
                                                    }}
                                                    className={`${styles.itemCard} ${!isCreatingSpec && editingSpecId === spec.id ? styles.itemCardActive : ""}`}
                                                >
                                                    <div className={styles.itemInfo}>
                                                        {spec.image ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img onError={hideBrokenImg} onLoad={showLoadedImg} src={spec.image} alt={spec.category || ""} className={styles.itemThumb} />
                                                        ) : (
                                                            <div className={styles.itemThumbPlaceholder}>
                                                                <RiFileList3Line />
                                                            </div>
                                                        )}
                                                        <div className={styles.itemDetails}>
                                                            <p className={styles.itemName}>{spec.category || "Untitled Specification"}</p>
                                                            <p className={styles.itemSub} style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                                {spec.details || "No details provided"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className={styles.itemActions}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsCreatingSpec(false);
                                                                setEditingSpecId(spec.id);
                                                                scrollToEditorBox(editSpecBoxRef);
                                                            }}
                                                            className={styles.actionIconBtn}
                                                            title="Edit specification"
                                                        >
                                                            <RiEditLine />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => removeSpecification(spec.id, e)}
                                                            className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                                                            title="Delete specification"
                                                        >
                                                            <RiDeleteBinLine />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── Edit Existing Specification Form ── */}
                                    {!isCreatingSpec && currentSpec && (
                                        <div ref={editSpecBoxRef} className={styles.editBox}>
                                            <div className={styles.editBoxHeader}>
                                                <h3 className={styles.editBoxTitle}>
                                                    <RiEditLine style={{ color: "#2563eb", verticalAlign: "middle", marginRight: "4px" }} />
                                                    Editing: {currentSpec.category || "Specification"}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSpecId(null)}
                                                    className={styles.actionIconBtn}
                                                    title="Close editor"
                                                >
                                                    <RiCloseLine />
                                                </button>
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Specification Category <ReqStar /></label>
                                                <BuilderSearchableSelect
                                                    value={currentSpec.category || ""}
                                                    invalid={Boolean(editSpecErrors.category)}
                                                    onChange={(val) => handleCategorySelectForEdit(currentSpec.id, val)}
                                                    options={getFieldOptions(
                                                        "specCategory",
                                                        SPECIFICATION_CATEGORY_OPTIONS.filter((c) => c !== "Custom Category"),
                                                        (data.specifications || []).map((s) => s.category)
                                                    ).filter(
                                                        (opt) =>
                                                            !(data.specifications || []).some(
                                                                (s) =>
                                                                    String(s.id) !== String(currentSpec.id) &&
                                                                    String(s.category || "").trim().toLowerCase() === opt.toLowerCase()
                                                            ) || opt.toLowerCase() === String(currentSpec.category || "").trim().toLowerCase()
                                                    )}
                                                    placeholder="Select specification category..."
                                                    onAddNew={(val) => handleAddNewDropdownOption("specCategory", val)}
                                                />
                                                <FieldError msg={editSpecErrors.category} />
                                            </div>

                                            {/* Quick select pills */}
                                            <div className={styles.quickAmenityPills} style={{ marginBottom: "14px" }}>
                                                {allKnownSpecCategories.map((cat) => {
                                                    const isUsedElsewhere = (data.specifications || []).some(
                                                        (s) =>
                                                            String(s.id) !== String(currentSpec.id) &&
                                                            String(s.category || "").trim().toLowerCase() === cat.toLowerCase()
                                                    );
                                                    const isSelected = Boolean(
                                                        currentSpec.category &&
                                                        currentSpec.category.trim().toLowerCase() === cat.toLowerCase()
                                                    );
                                                    return (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => handleCategorySelectForEdit(currentSpec.id, cat)}
                                                            className={`${styles.quickAmenityBtn} ${isSelected ? styles.quickAmenityBtnActive : ""}`}
                                                            style={isUsedElsewhere && !isSelected ? { opacity: 0.5, borderStyle: "dashed" } : undefined}
                                                            title={isUsedElsewhere ? `${cat} is already added` : cat}
                                                            aria-pressed={isSelected}
                                                        >
                                                            <span className={styles.quickAmenityIcon} aria-hidden="true">
                                                                {isSelected || isUsedElsewhere ? <RiCheckLine /> : <RiAddLine />}
                                                            </span>
                                                            <span>{cat}{isUsedElsewhere ? " (Added)" : ""}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Material &amp; Engineering Standards <ReqStar /></span>
                                                    <span className={styles.labelHint}>Enter your specification description</span>
                                                </label>
                                                <textarea
                                                    value={currentSpec.details || ""}
                                                    onChange={(e) => editSpecification(currentSpec.id, "details", e.target.value)}
                                                    className={styles.textarea}
                                                    style={editSpecErrors.details ? INVALID_INPUT_STYLE : undefined}
                                                    rows={3}
                                                    placeholder="Enter your material, brand, and engineering specification details..."
                                                />
                                                <FieldError msg={editSpecErrors.details} />
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>
                                                    <span>Specification Photo</span>
                                                    <span className={styles.labelHint}>Optional — shown instead of a stock photo for this category</span>
                                                </label>
                                                {currentSpec.image ? (
                                                    <div className={styles.galleryThumb} style={{ width: "96px" }}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={currentSpec.image} alt="Specification" className={styles.galleryThumbImg} />
                                                        <button
                                                            type="button"
                                                            onClick={() => editSpecification(currentSpec.id, "image", "")}
                                                            className={styles.galleryThumbRemove}
                                                            title="Remove photo"
                                                        >
                                                            <RiCloseLine />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={styles.galleryUploadRow}>
                                                        <input
                                                            ref={editSpecImageInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleEditSpecImageUpload(currentSpec.id, e)}
                                                            className={styles.hiddenInput}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => editSpecImageInputRef.current?.click()}
                                                            className={styles.projectImageChangeBtn}
                                                        >
                                                            <RiUploadCloud2Line /> Add Photo
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={styles.editBoxActions}>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSpecification(currentSpec.id)}
                                                    className={styles.editBoxDeleteBtn}
                                                >
                                                    <RiDeleteBinLine /> Delete
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={finishEditingSpec}
                                                    className={styles.editBoxSaveBtn}
                                                >
                                                    <RiCheckLine /> Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SectionModal>
                        </div>

                        {/* ── Accordion 7: Contact & Direct Enquiries ── */}
                        <div className={`${styles.accordionItem} ${openSections.contact ? styles.accordionItemOpen : ""}`}>
                            <button
                                type="button"
                                onClick={() => toggleSection("contact")}
                                className={`${styles.accordionHeader} ${openSections.contact ? styles.accordionHeaderOpen : ""}`}
                                aria-haspopup="dialog"
                            >
                                <div className={styles.accordionHeaderLeft}>
                                    <div className={styles.accordionIconBox}>
                                        <RiPhoneFill />
                                    </div>
                                    <div className={styles.accordionHeaderText}>
                                        <h3 className={styles.accordionTitle}>Contact &amp; Enquiries</h3>
                                        <span className={styles.accordionSubtitle}>Phone, WhatsApp, email &amp; website</span>
                                    </div>
                                </div>
                                <div className={styles.accordionHeaderRight}>
                                    {renderProgressBadge("contact")}
                                    <RiArrowRightSLine
                                        className={styles.accordionChevron}
                                    />
                                </div>
                            </button>

                            <SectionModal
                                open={openSections.contact}
                                activeKey="contact"
                                {...sectionNav}
                                onClose={closeSections}
                                icon={<RiPhoneFill />}
                                title={<>Contact &amp; Enquiries</>}
                                subtitle={<>Phone, WhatsApp, email &amp; website</>}
                                badge={renderProgressBadge("contact")}
                            >
                                <div className={styles.accordionBody}>
                                    <div className={styles.editorSectionHeader}>
                                        <h2 className={styles.sectionTitle}>Contact &amp; Direct Enquiries</h2>
                                        <p className={styles.sectionDesc}>Connect with potential home buyers directly without intermediaries.</p>
                                    </div>

                                    <div className={styles.grid2}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Direct Phone Number</label>
                                            <input
                                                type="tel"
                                                value={data.phone}
                                                onChange={(e) => updateData({ phone: e.target.value })}
                                                className={styles.input}
                                                placeholder="e.g. 9847012345"
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>WhatsApp Number</label>
                                            <input
                                                type="tel"
                                                value={data.whatsapp}
                                                onChange={(e) => updateData({ whatsapp: e.target.value })}
                                                className={styles.input}
                                                placeholder="e.g. 9847012345"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.grid2}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Official Email</label>
                                            <input
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => updateData({ email: e.target.value })}
                                                className={styles.input}
                                                placeholder="e.g. enquiries@company.com"
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Website URL</label>
                                            <input
                                                type="text"
                                                value={data.website}
                                                onChange={(e) => updateData({ website: e.target.value })}
                                                className={styles.input}
                                                placeholder="e.g. www.company.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </SectionModal>
                        </div>
                    </div>
                </aside>

                {/* ── Live Preview Panel (Right) ── */}
                <main className={styles.previewPanel} data-panel-scroll="">
                    <div
                        className={`${styles.previewFrameWrapper} ${deviceView === "mobile"
                            ? styles.deviceFrameMobile
                            : deviceView === "tablet"
                                ? styles.deviceFrameTablet
                                : ""
                            } ${previewLayout === "mobile"
                                ? styles.previewFrameMobile
                                : previewLayout === "tablet"
                                    ? styles.previewFrameTablet
                                    : ""
                            }`}
                        data-preview-layout={previewLayout}
                    >
                        <div className={styles.previewFrameContainer}>
                            {/* Simulated Browser Chrome Topbar */}
                            <div className={styles.browserTopBar}>
                                <div className={styles.browserDots}>
                                    <span className={`${styles.browserDot} ${styles.dotRed}`} />
                                    <span className={`${styles.browserDot} ${styles.dotYellow}`} />
                                    <span className={`${styles.browserDot} ${styles.dotGreen}`} />
                                </div>
                                <div className={styles.browserAddressBar}>
                                    <RiLockLine style={{ color: "#10b981", fontSize: "13px" }} />
                                    <a
                                        href={`/builders/${slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                        title="Open builder details page in next tab"
                                    >
                                        <span>{publishedUrl}</span>
                                        <RiShareForwardLine style={{ fontSize: "12px", opacity: 0.7 }} />
                                    </a>
                                </div>
                            </div>

                            {/* ── Live Rendered Webpage ── */}
                            <div className={styles.pageContainer} ref={previewPageRef}>
                                {/* Rendered Header (Universal Across Templates) */}
                                <header className={styles.webHeader}>
                                    <div className={styles.webLogoGroup}>
                                        {data.logoUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img onError={hideBrokenImg} onLoad={showLoadedImg} src={data.logoUrl} alt={data.companyName || "Builder logo"} className={styles.webLogoImg} />
                                        ) : (
                                            <span className={styles.webLogoInitials}>
                                                {data.companyName?.trim()?.charAt(0)?.toUpperCase() || "B"}
                                            </span>
                                        )}
                                        <span className={styles.webCompanyName}>
                                            {/* {data.companyName || "Your Company Name"} */}
                                            <RiVerifiedBadgeFill className={styles.webVerifiedTag} title="Verified Developer" />
                                            <span>Verified</span>
                                        </span>
                                    </div>

                                    <div className={styles.webHeaderActions}>
                                        {data.phone && (
                                            <a href={`tel:${data.phone}`} className={styles.webCallBtn}>
                                                <RiPhoneFill /> Call
                                            </a>
                                        )}
                                        {data.whatsapp && (
                                            <a
                                                href={`https://wa.me/91${data.whatsapp.replace(/\D/g, "")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.webWaBtn}
                                            >
                                                <RiWhatsappLine /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </header>

                                {/* ────────── BUILDER PROFILE PAGE ────────── */}
                                <>
                                        {/* 1. Corporate Hero: Banner Image First, Text & Buttons Below */}
                                        <section className={styles.corporateHero}>
                                            <div className={styles.corporateHeroImageWrap}>
                                                {heroImages.length > 0 ? (
                                                    <>
                                                        {heroImages.map((src, i) => (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img key={i} onError={hideBrokenImg} onLoad={showLoadedImg}
                                                                src={src}
                                                                alt={data.companyName ? `${data.companyName} Cover Banner ${i + 1}` : `Corporate Hero Banner ${i + 1}`}
                                                                className={`${styles.corporateHeroBgImg} ${i === activeHeroSlide ? styles.heroSlideActive : ""}`}
                                                            />
                                                        ))}
                                                        {heroSlideCount > 1 && (
                                                            <>
                                                                <button type="button" onClick={prevHeroSlide} className={styles.heroCarouselPrev} aria-label="Previous photo">
                                                                    <RiArrowLeftSLine />
                                                                </button>
                                                                <button type="button" onClick={nextHeroSlide} className={styles.heroCarouselNext} aria-label="Next photo">
                                                                    <RiArrowRightSLine />
                                                                </button>
                                                                <div className={styles.heroCarouselDots}>
                                                                    {heroImages.map((_, i) => (
                                                                        <button
                                                                            key={i}
                                                                            type="button"
                                                                            onClick={() => goToHeroSlide(i)}
                                                                            className={`${styles.heroCarouselDot} ${i === activeHeroSlide ? styles.heroCarouselDotActive : ""}`}
                                                                            aria-label={`Show photo ${i + 1}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className={styles.webHeroDefaultBg} />
                                                )}
                                            </div>
                                            <div className={styles.corporateHeroInner}>
                                                <h1 className={styles.corporateTitle}>{data.headline || data.companyName || "Signature Architectural Developer"}</h1>
                                                {data.tagline ? (
                                                    <p className={styles.corporateSubtitle}>{data.tagline}</p>
                                                ) : data.about ? (
                                                    <p className={styles.corporateSubtitle}>{data.about}</p>
                                                ) : (
                                                    <p className={styles.corporateSubtitle}>Quality homes across Kerala, built with care and delivered on time.</p>
                                                )}
                                                <div className={styles.corporateActionsRow}>
                                                    <a href="#t3-projects" className={styles.corporatePrimaryBtn}>
                                                        <RiHomeSmileLine /> View Our Projects
                                                    </a>
                                                    <a href="#t3-contact" className={styles.corporateSecondaryBtn}>
                                                        <RiPhoneFill /> Talk to the Builder
                                                    </a>
                                                </div>
                                            </div>
                                        </section>

                                        {/* 2. Track record + jump links */}
                                        <CorporateTrustStats data={data} />
                                        <CorporateQuickNav data={data} isEditor />

                                        {/* 3. Projects → prices → location: what visitors look for first */}
                                        {renderTemplate3Projects()}
                                        {renderTemplate3Units()}
                                        {renderTemplate3Neighborhood()}

                                        {/* 4. Supporting detail */}
                                        {renderTemplate3Specs()}
                                        {renderTemplate3KeyFacts()}
                                        {renderTemplate3Overview()}

                                        {/* 5. Contact */}
                                        {renderTemplate3Contact()}
                                </>

                                {/* Rendered Footer */}
                                {renderFooter()}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Mobile Responsive Action Button Group (White background toolbar with Toggle on Left & Publish on Right) */}
                <div className={styles.mobileButtonGroup}>
                    {mobileTab === "editor" ? (
                        <button
                            type="button"
                            onClick={() => setMobileTab("preview")}
                            className={styles.mobileGroupToggleBtn}
                            title="View Live Webpage Preview"
                        >
                            <RiComputerLine />
                            <span className={styles.mobileGroupBtnFullText}>Live Preview ({overallProgressPercent}%)</span>
                            <span className={styles.mobileGroupBtnShortText}>Preview ({overallProgressPercent}%)</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setMobileTab("editor")}
                            className={styles.mobileGroupToggleBtn}
                            title="Return to Studio Editor"
                        >
                            <RiEditLine />
                            <span className={styles.mobileGroupBtnFullText}>Back to Editor</span>
                            <span className={styles.mobileGroupBtnShortText}>Editor</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className={styles.mobileGroupPublishBtn}
                        title="Publish Builder Webpage"
                    >
                        {isPublishing ? (
                            <><RiLoader4Line className={styles.spin} /> <span className={styles.mobileGroupBtnFullText}>Publishing…</span></>
                        ) : (
                            <>
                                <RiSparklingLine />
                                <span className={styles.mobileGroupBtnFullText}>Publish Webpage</span>
                                <span className={styles.mobileGroupBtnShortText}>Publish</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Publish Modal ── */}
            {isPublishModalOpen && (
                <div className={styles.modalBackdrop} onClick={() => setIsPublishModalOpen(false)}>
                    <div className={styles.publishModal} onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setIsPublishModalOpen(false)}
                            className={styles.modalCloseBtn}
                            aria-label="Close modal"
                        >
                            <RiCloseLine />
                        </button>

                        <div className={styles.celebrationIcon}>
                            <RiSparklingLine />
                        </div>

                        <h3 className={styles.modalTitle}>Your Builder Webpage is Live!</h3>
                        <p className={styles.modalDesc}>
                            Your official builder portfolio has been published with verified credentials, floor plans, and direct enquiry channels.
                        </p>

                        <div className={styles.urlBox}>
                            <a
                                href={`/builders/${slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.urlText}
                                title="Open builder webpage in next tab"
                                style={{ textDecoration: "none", color: "inherit" }}
                            >
                                {publishedUrl}
                            </a>
                            <button type="button" onClick={handleCopy} className={styles.copyBtn}>
                                <RiFileCopyLine /> {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsPublishModalOpen(false);
                                    window.open(`/builders/${slug}`, "_blank", "noopener,noreferrer");
                                }}
                                className={styles.primaryModalBtn}
                            >
                                View Live Public Webpage <RiArrowRightLine />
                            </button>
                            {websiteMeta?.publication_status === "published" && (
                                <button
                                    type="button"
                                    onClick={handleUnpublish}
                                    style={{
                                        padding: "10px 18px",
                                        borderRadius: "8px",
                                        border: "1px solid #fecaca",
                                        background: "#fef2f2",
                                        color: "#b91c1c",
                                        fontWeight: "600",
                                        fontSize: "13px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Unpublish Webpage
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsPublishModalOpen(false)}
                                className={styles.secondaryModalBtn}
                            >
                                Continue Editing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Enquiries Modal ── */}
            {isEnquiriesOpen && (
                <div className={styles.modalBackdrop} onClick={() => setIsEnquiriesOpen(false)}>
                    <div className={styles.publishModal} style={{ maxWidth: "720px", maxHeight: "85vh", overflowY: "auto", textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setIsEnquiriesOpen(false)}
                            className={styles.modalCloseBtn}
                            aria-label="Close modal"
                        >
                            <RiCloseLine />
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                            <RiInboxArchiveLine style={{ fontSize: "24px", color: "#059669" }} />
                            <h3 className={styles.modalTitle} style={{ margin: 0 }}>Direct Website Enquiries</h3>
                        </div>
                        <p className={styles.modalDesc} style={{ margin: "0 0 20px" }}>
                            Incoming inquiries and inspection visit bookings from your public website page.
                        </p>

                        {enquiriesList.length === 0 ? (
                            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "12px" }}>
                                <p style={{ margin: 0, fontWeight: "600" }}>No enquiries received yet.</p>
                                <small>Customer leads submitted on your published page will appear here immediately.</small>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {enquiriesList.map((enq) => {
                                    const cName = enq.name || enq.customer_name || "Customer";
                                    const cPhone = enq.phone || enq.mobile_number || "";
                                    const cMsg = enq.message || enq.requirements || "";
                                    const cStatus = enq.status || enq.enquiry_status || "new";
                                    const cDate = enq.createdAt || enq.created_at;
                                    const isRead = Boolean(enq.read ?? enq.is_read);
                                    return (
                                        <div key={enq.id} style={{
                                            padding: "16px",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "10px",
                                            background: isRead ? "#f8fafc" : "#ffffff",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                                <strong style={{ fontSize: "15px", color: "#0f172a" }}>{cName}</strong>
                                                <span style={{
                                                    fontSize: "12px",
                                                    padding: "2px 8px",
                                                    borderRadius: "12px",
                                                    background: cStatus === "contacted" ? "#ecfdf5" : "#eff6ff",
                                                    color: cStatus === "contacted" ? "#047857" : "#1d4ed8",
                                                    fontWeight: "600"
                                                }}>
                                                    {cStatus === "contacted" ? "Contacted" : "New Lead"}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                                                {cPhone && <span><strong>Mobile:</strong> <a href={`tel:${cPhone}`} style={{ color: "#2563eb" }}>+91 {cPhone}</a></span>}
                                                {enq.email && <span><strong>Email:</strong> <a href={`mailto:${enq.email}`} style={{ color: "#2563eb" }}>{enq.email}</a></span>}
                                                {enq.visitTime && <span><strong>Visit:</strong> {enq.visitTime}</span>}
                                                <span><strong>Date:</strong> {cDate ? new Date(cDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recent"}</span>
                                            </div>
                                            {cMsg && (
                                                <p style={{ margin: "4px 0 10px", fontSize: "13px", color: "#334155", background: "#f1f5f9", padding: "8px 12px", borderRadius: "6px" }}>
                                                    {cMsg}
                                                </p>
                                            )}
                                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            await builderApi.updateEnquiry(enq.id, { status: "contacted", read: true });
                                                            setEnquiriesList((prev) => prev.map((item) => item.id === enq.id ? { ...item, status: "contacted", enquiry_status: "contacted", read: true, is_read: true } : item));
                                                        } catch { }
                                                    }}
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: "6px",
                                                        border: "1px solid #cbd5e1",
                                                        background: "#fff",
                                                        fontSize: "12px",
                                                        cursor: "pointer",
                                                        color: "#334155"
                                                    }}
                                                >
                                                    Mark Contacted
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 16:7 Banner Crop Modal ── */}
            <BannerCropModal
                isOpen={bannerCropModalOpen}
                imageSrc={bannerImageToCrop}
                onClose={handleBannerCropClose}
                onApply={handleBannerCropApply}
            />

            {/* ── 16:7 Additional Hero Photo Crop Modal ── */}
            <BannerCropModal
                isOpen={heroGalleryCropModalOpen}
                imageSrc={heroGalleryImageToCrop}
                onClose={handleHeroGalleryCropClose}
                onApply={handleHeroGalleryCropApply}
                title="Crop Hero Photo"
                subtitle="Reposition & scale this photo to fit the 16:7 hero header"
                applyLabel="Save Photo"
            />

            {/* ── Company Logo Crop Modal ── */}
            <LogoCropModal
                isOpen={logoCropModalOpen}
                imageSrc={logoImageToCrop}
                onClose={handleLogoCropClose}
                onApply={handleLogoCropApply}
            />

            {/* ── 16:9 Project Image Crop Modal ── */}
            <ProjectCropModal
                isOpen={projectCropModalOpen}
                imageSrc={projectImageToCrop}
                onClose={handleProjectCropClose}
                onApply={handleProjectCropApply}
            />

            {/* ── 16:9 Property / Floor Plan Crop Modal ── */}
            <ProjectCropModal
                isOpen={propertyCropModalOpen}
                imageSrc={propertyImageToCrop}
                title="Crop Floor Plan / Unit Photo"
                subtitle="Reposition & scale your floor plan or unit photo to the 16:9 showcase ratio"
                badge="16:9 Ratio"
                onClose={handlePropertyCropClose}
                onApply={handlePropertyCropApply}
            />

            {/* ── Custom Delete Confirmation Modal ── */}
            <DeleteConfirmModal
                isOpen={!!deleteConfirmConfig}
                title={deleteConfirmConfig?.title}
                itemName={deleteConfirmConfig?.itemName}
                itemType={deleteConfirmConfig?.itemType}
                description={deleteConfirmConfig?.description}
                confirmText={deleteConfirmConfig?.confirmText}
                onClose={() => setDeleteConfirmConfig(null)}
                onConfirm={() => {
                    const cb = deleteConfirmConfig?.onConfirm;
                    setDeleteConfirmConfig(null);
                    cb?.();
                }}
            />
        </div>
    );
}
