"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Nav from "../componants/nav/nav";
import styles from "./propertyDetail.module.css";
import apiClient, { propertyApi, offersApi, dashboardApi, formatPropertyImgUrl, formatPropertyMediaUrl, handlePropertyImageError, formatAddedDate } from "../lib/api";
import { queuePropertyShare } from "../lib/messagesStore";
import { landAreaUnitLabel } from "../lib/areaUnits";
import { getLoginRedirectUrl } from "../lib/authRedirect";
import {
    subscribe as subscribeCompare,
    getSnapshot as getCompareSnapshot,
    getServerSnapshot as getCompareServerSnapshot,
    addToCompare,
    removeFromCompare,
    COMPARE_MAX,
} from "../lib/compareStore";
import { flyToCompareBucket } from "../lib/flyToCompare";
import {
    RiEyeLine,
    RiSendPlaneLine,
    RiBookmarkLine,
    RiBookmarkFill,
    RiPlayFill,
    RiPauseFill,
    RiVolumeUpFill,
    RiMapPinLine,
    RiCalendarLine,
    RiMessage3Line,
    RiPhoneLine,
    RiCheckboxCircleLine,
    RiBuilding2Line,
    RiCompass3Line,
    RiStackLine,
    RiTimeLine,
    RiLayout2Line,
    RiShieldCheckLine,
    RiEditLine,
    RiArrowLeftSLine,
    RiArrowRightSLine,
    RiCloseLine,
    RiCoinsLine,
    RiHospitalLine,
    RiRoadMapLine,
    RiShoppingBag3Line,
    RiFullscreenLine,
    RiWhatsappLine,
    RiFacebookFill,
    RiInstagramLine,
    RiLink,
    RiPriceTag3Line,
    RiFridgeLine,
    RiParkingBoxLine,
    RiDropLine,
    RiFlashlightLine,
    RiCommunityLine,
    RiCameraLensLine,
    RiBuilding4Line,
    RiRainyLine,
    RiShieldUserLine,
    RiMapPin2Line,
    RiGraduationCapLine,
    RiShoppingCart2Line,
    RiBankCard2Line,
    RiCapsuleLine,
    RiBusLine,
    RiGasStationLine,
    RiErrorWarningLine,
    RiIndeterminateCircleLine,
    RiFileCopyLine,
    RiImageLine,
    RiSpam2Line,
    RiMoreLine,
    RiFlag2Line,
    RiScales3Line,
    RiScales3Fill,
    RiSparkling2Fill,
    RiVerifiedBadgeFill,
    RiVolumeMuteFill,
} from "react-icons/ri";
import { buildPropertySummary } from "../lib/propertySummary";
import dynamic from "next/dynamic";
import CopyPropertyId from "../componants/propertyIdBadge/CopyPropertyId";
import PropertyAreaGuide from "./PropertyAreaGuide";
import { preloadWhenIdle } from "../lib/preloadWhenIdle";
import VoiceNotePlayer from "./VoiceNotePlayer";

/* Dialogs that only open on a click (AI summary, report, contact) are loaded
   as separate chunks, fetched in the background once the page is idle. */
const loadSummaryModal = () => import("./PropertySummaryModal");
const loadReportModal = () => import("./PropertyReportModal");
const loadContactModal = () => import("./PropertyContactModal");
const PropertySummaryModal = dynamic(loadSummaryModal, { ssr: false });
const PropertyReportModal = dynamic(loadReportModal, { ssr: false });
const PropertyContactModal = dynamic(loadContactModal, { ssr: false });

/* Id of the original demo property (kept so items saved to the compare
   list under this id can still be removed). */
const PROPERTY_COMPARE_ID = "luxury-villa-in-kakkanad";

const AMENITIES = [
    { Icon: RiFridgeLine, label: "Modular Kitchen" },
    { Icon: RiParkingBoxLine, label: "Covered Parking" },
    { Icon: RiDropLine, label: "24/7 Water Supply" },
    { Icon: RiFlashlightLine, label: "Power Backup" },
    { Icon: RiCompass3Line, label: "Vastu Compliant" },
    { Icon: RiCommunityLine, label: "Gated Community" },
    { Icon: RiCameraLensLine, label: "CCTV Security" },
    { Icon: RiBuilding4Line, label: "Lift" },
    { Icon: RiRainyLine, label: "Rain Water Harvesting" },
    { Icon: RiShieldUserLine, label: "24/7 Security" },
];

const REPORT_REASONS = [
    { id: "incorrect", Icon: RiErrorWarningLine, label: "Incorrect or misleading information" },
    { id: "sold", Icon: RiIndeterminateCircleLine, label: "Property sold or no longer available" },
    { id: "duplicate", Icon: RiFileCopyLine, label: "Duplicate listing" },
    { id: "images", Icon: RiImageLine, label: "Inappropriate images" },
    { id: "fraud", Icon: RiSpam2Line, label: "Suspicious or fraudulent listing" },
    { id: "other", Icon: RiMoreLine, label: "Other reason" },
];

const REPORT_DETAILS_MAX = 500;

const AUTOPLAY_MS = 4000;

function formatVideoTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange) {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

const getPrefersReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

/* The server can't know the visitor's motion preference. Reporting "no
   preference" for the first render keeps the markup identical on both sides, and
   React swaps in the real value straight after hydration. */
const getPrefersReducedMotionOnServer = () => false;

function extractEmbedUrl(raw) {
    if (!raw || typeof raw !== "string") return null;
    let str = raw.trim();
    if (!str) return null;

    // 1. If it's a full <iframe ... src="..." ...> HTML snippet, extract the src URL
    const iframeSrcMatch = str.match(/src=["']([^"']+)["']/i);
    if (iframeSrcMatch && iframeSrcMatch[1]) {
        str = iframeSrcMatch[1].trim();
    }

    // 2. YouTube URLs (watch, share, short, embed)
    const ytMatch = str.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // 3. Vimeo URLs
    const vimeoMatch = str.match(/vimeo\.com\/(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Do not treat direct MP4/WebM/MOV video files as 3D iframe embeds
    if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(str) || str.includes("/uploads/properties/videos/")) {
        return null;
    }

    // 4. If it is already a valid URL (http/https), return it
    if (/^https?:\/\//i.test(str)) {
        return str;
    }

    return null;
}

export default function PropertyDetailPage({ params }) {
    const router = useRouter();

    useEffect(() => preloadWhenIdle([loadSummaryModal, loadReportModal, loadContactModal]), []);

    // Back button (mobile): go to the previous page if there is one, otherwise the listings page
    const handleBackNavigation = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push("/properties");
        }
    };
    const urlParams = useParams();
    const slugParam = urlParams?.slug || params?.slug;
    const rawId = Array.isArray(slugParam)
        ? slugParam[slugParam.length - 1]
        : (slugParam || urlParams?.id || params?.id);

    // Property API State
    const [propertyData, setPropertyData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserPhone, setCurrentUserPhone] = useState(null);

    useEffect(() => {
        try {
            const uStr = localStorage.getItem("kp_auth_user") || localStorage.getItem("user");
            if (uStr) {
                const u = JSON.parse(uStr);
                setCurrentUserId(u?.loginId || u?.id || null);
                setCurrentUserPhone(u?.mobile || u?.phone || u?.phone_number || null);
            }
        } catch (e) { }
    }, []);

    const isOwner = Boolean(
        (currentUserId && (
            String(currentUserId) === String(propertyData?.owner?.loginId) ||
            String(currentUserId) === String(propertyData?.loginId)
        )) ||
        (currentUserPhone && propertyData?.owner?.phone && (
            String(currentUserPhone).replace(/\D/g, "") === String(propertyData?.owner?.phone).replace(/\D/g, "")
        ))
    );

    const isAuthenticated = Boolean(currentUserId);

    const [visitorCount, setVisitorCount] = useState(null);

    useEffect(() => {
        if (!rawId) return;
        setIsLoading(true);
        apiClient.get(`/properties/${rawId}`)
            .then((res) => {
                if (res.data?.success && res.data?.data) {
                    setPropertyData(res.data.data);
                    if (res.data.data.views !== undefined && res.data.data.views !== null) {
                        setVisitorCount(Number(res.data.data.views));
                    }
                }
            })
            .catch((err) => {
                console.warn("Could not fetch property details from API:", err.message);
            })
            .finally(() => {
                setIsLoading(false);
            });

        // Record visit dynamically
        const cleanId = String(rawId || "").replace(/^[^\d]*/, '').replace(/[^\d].*$/, '') || rawId;
        propertyApi.recordView(cleanId)
            .then((viewRes) => {
                if (viewRes && (viewRes.views !== undefined || viewRes.view_count !== undefined)) {
                    const count = Number(viewRes.views ?? viewRes.view_count);
                    if (!isNaN(count) && count >= 0) {
                        setVisitorCount((prev) => Math.max(prev || 0, count));
                    }
                }
            })
            .catch(() => { });
    }, [rawId]);

    // 1. Gallery Carousel State
    const [activeMediaTab, setActiveMediaTab] = useState("photos"); // "photos", "3d", "floor", "staging", "map"
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // Fullscreen state and ref
    const [isFullscreen, setIsFullscreen] = useState(false);
    const showcaseRef = useRef(null);

    // Scroll state to toggle mobile sticky agent contact bar
    const [showStickyAgent, setShowStickyAgent] = useState(false);

    // Derived dynamic fields
    const title = propertyData?.title || "";
    const propCode = propertyData?.code || ("KP" + (rawId || ""));
    const propLocation = propertyData?.location?.fullAddress || propertyData?.location?.address || propertyData?.location?.locality || "Kerala";
    const propType = propertyData?.type || "Property";
    const propPurpose = propertyData?.action === "lease"
        ? "For Lease"
        : (propertyData?.action === "rent" ? "For Rent" : "For Sale");
    const propPrice = propertyData?.price || "Price on request";
    const isNegotiable = propertyData?.pricingDetails?.find(p => p.label === 'Negotiable')?.value === 'Yes';
    const propDescription = propertyData?.description || "";
    const propSpecsLeft = propertyData?.specsLeft || [];
    const propSpecsRight = propertyData?.specsRight || [];
    const propPricingDetails = propertyData?.pricingDetails || [];
    const propAmenities = propertyData?.amenities || [];
    const addedDateFormatted = formatAddedDate(propertyData?.added_date || propertyData?.addedDate || propertyData?.created_at || propertyData?.added_date_time);

    // Helper to generate dynamic 6 spec cards based on property type
    const typeLower = (propType || "").toLowerCase();
    const d = propertyData?.details || {};

    let dynamicQuickSpecs = [];
    if (typeLower.includes("plot") || typeLower.includes("land")) {
        dynamicQuickSpecs = [
            { Icon: RiBuilding2Line, label: "Property Type", value: propType },
            { Icon: RiCoinsLine, label: "Purpose", value: propPurpose },
            { Icon: RiLayout2Line, label: "Plot Area", value: d.plotArea ? `${d.plotArea} ${landAreaUnitLabel(d.landAreaUnit)}` : "N/A" },
            { Icon: RiRoadMapLine, label: "Road Width", value: d.roadWidth ? `${d.roadWidth} ft` : "—" },
            { Icon: RiShieldCheckLine, label: "Boundary Wall", value: d.boundaryWall ? "Yes" : "No" },
            { Icon: RiCompass3Line, label: "Facing", value: d.facing || "—" },
        ];
    } else if (typeLower.includes("commercial") || typeLower.includes("office") || typeLower.includes("warehouse")) {
        dynamicQuickSpecs = [
            { Icon: RiBuilding2Line, label: "Property Type", value: propType },
            { Icon: RiCoinsLine, label: "Purpose", value: propPurpose },
            { Icon: RiLayout2Line, label: "Built-up Area", value: d.builtupArea ? `${d.builtupArea} sq ft` : "N/A" },
            { Icon: RiStackLine, label: "Space Type", value: d.commercialSubType || "Commercial" },
            { Icon: RiTimeLine, label: "Property Age", value: d.propertyAge || "—" },
            { Icon: RiCompass3Line, label: "Facing", value: d.facing || "—" },
        ];
    } else if (typeLower.includes("apartment")) {
        dynamicQuickSpecs = [
            { Icon: RiBuilding2Line, label: "Property Type", value: "Apartment" },
            { Icon: RiCoinsLine, label: "Purpose", value: propPurpose },
            { Icon: RiLayout2Line, label: "Built-up Area", value: d.builtupArea ? `${d.builtupArea} sq ft` : "N/A" },
            { Icon: RiStackLine, label: "Bedrooms", value: d.bedrooms ? `${d.bedrooms} BHK` : "N/A" },
            { Icon: RiCompass3Line, label: "Bathrooms", value: d.bathrooms ? `${d.bathrooms} Baths` : "N/A" },
            { Icon: RiTimeLine, label: "Floor", value: d.floorNumber ? `Floor ${d.floorNumber}${d.totalFloors ? ` of ${d.totalFloors}` : ""}` : "—" },
        ];
    } else if (typeLower.includes("other")) {
        dynamicQuickSpecs = [
            { Icon: RiBuilding2Line, label: "Property Type", value: "Other" },
            { Icon: RiCoinsLine, label: "Purpose", value: propPurpose },
            { Icon: RiLayout2Line, label: "Built-up Area", value: d.builtupArea ? `${d.builtupArea} sq ft` : (d.plotArea ? `${d.plotArea} ${landAreaUnitLabel(d.landAreaUnit)}` : "N/A") },
            { Icon: RiStackLine, label: "Space Type", value: d.commercialSubType || "Other" },
            { Icon: RiTimeLine, label: "Property Age", value: d.propertyAge || "—" },
            { Icon: RiCompass3Line, label: "Facing", value: d.facing || "—" },
        ];
    } else { // House / Villa
        dynamicQuickSpecs = [
            { Icon: RiBuilding2Line, label: "Property Type", value: propType },
            { Icon: RiCoinsLine, label: "Purpose", value: propPurpose },
            { Icon: RiLayout2Line, label: "Built-up Area", value: d.builtupArea ? `${d.builtupArea} sq ft` : "N/A" },
            { Icon: RiStackLine, label: "Bedrooms", value: d.bedrooms ? `${d.bedrooms} BHK` : "N/A" },
            { Icon: RiCompass3Line, label: "Bathrooms", value: d.bathrooms ? `${d.bathrooms} Baths` : "N/A" },
            { Icon: RiTimeLine, label: "Parking", value: d.carParking ? `${d.carParking} Car(s)` : "Available" },
        ];
    }

    const hasAmenitiesTab = (
        !typeLower.includes("plot") &&
        !typeLower.includes("land") &&
        !typeLower.includes("commercial") &&
        !typeLower.includes("office") &&
        !typeLower.includes("warehouse") &&
        !typeLower.includes("other")
    ) && (propAmenities.length > 0 || typeLower.includes("house") || typeLower.includes("apartment") || typeLower.includes("villa"));
    const propOwner = propertyData?.owner || {
        name: "Property Owner",
        phone: "",
        email: "",
        role: "Owner",
        photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=80",
        verified: true,
    };
    const isOwnerAgent = (propOwner?.role || "").toLowerCase() === "agent" || (propOwner?.user_type || "").toLowerCase() === "agent" || !!(propOwner?.agentId || propOwner?.agent_id);
    const ownerAgentId = propOwner?.agentId || propOwner?.agent_id || (isOwnerAgent ? (propOwner?.id || propOwner?.loginId || propOwner?.login_id || propertyData?.loginId) : null);
    const ownerUserId = propOwner?.loginId || propOwner?.login_id || propOwner?.userId || propOwner?.user_id || propOwner?.id || propertyData?.loginId || propertyData?.login_id;
    const ownerProfileUrl = isOwnerAgent
        ? (ownerAgentId ? `/agent/${ownerAgentId}` : (ownerUserId ? `/agent/${ownerUserId}` : "/agents"))
        : (ownerUserId ? `/user/${ownerUserId}` : "/properties");
    const propLat = propertyData?.location?.lat || 10.0062;
    const propLng = propertyData?.location?.lng || 76.3426;
    const mapEmbedUrl = `https://maps.google.com/maps?q=${propLat},${propLng}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    const rawTour = propertyData?.tourUrl || propertyData?.tour_url || propertyData?.street_view || propertyData?.googlestreetview || null;
    const tourUrl = extractEmbedUrl(rawTour);
    const rawVoiceNote = propertyData?.voice_note || propertyData?.audio || propertyData?.audio_url || propertyData?.voiceNote || propertyData?.audioUrl || null;
    const voiceNoteUrl = typeof rawVoiceNote === "string" ? rawVoiceNote : (rawVoiceNote?.url || rawVoiceNote?.audio_url || null);
    const voiceNoteDuration = Number(rawVoiceNote?.duration || propertyData?.voice_note_duration || propertyData?.audio_duration || 0) || 0;

    // Helper to pick contextual icons for nearby amenities
    const getNearbyIcon = (name) => {
        const n = (name || "").toLowerCase();
        if (n.includes("school") || n.includes("college") || n.includes("university")) return RiGraduationCapLine;
        if (n.includes("hospital") || n.includes("clinic") || n.includes("medical")) return RiHospitalLine;
        if (n.includes("pharmacy")) return RiCapsuleLine;
        if (n.includes("metro") || n.includes("railway") || n.includes("train") || n.includes("bus") || n.includes("transport")) return RiBusLine;
        if (n.includes("airport") || n.includes("flight")) return RiSendPlaneLine;
        if (n.includes("supermarket") || n.includes("market") || n.includes("grocery")) return RiShoppingCart2Line;
        if (n.includes("shopping") || n.includes("mall")) return RiShoppingBag3Line;
        if (n.includes("atm") || n.includes("bank")) return RiBankCard2Line;
        if (n.includes("petrol") || n.includes("fuel") || n.includes("gas")) return RiGasStationLine;
        if (n.includes("restaurant") || n.includes("hotel") || n.includes("cafe") || n.includes("food")) return RiFridgeLine;
        return RiMapPin2Line;
    };

    const propNearbyPlaces = (propertyData?.nearbyPlaces && propertyData.nearbyPlaces.length > 0)
        ? propertyData.nearbyPlaces.map((p) => ({
            Icon: getNearbyIcon(p.name),
            name: p.name,
            distance: p.distance ? (String(p.distance).toLowerCase().includes("km") || String(p.distance).toLowerCase().includes("m") ? p.distance : `${p.distance} km`) : "",
        }))
        : [];

    const defaultPhotoAssets = [
        "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public",
    ];
    const photoAssets = (propertyData?.images && propertyData.images.length > 0)
        ? propertyData.images.map((img) => formatPropertyImgUrl(typeof img === "string" ? img : img?.url || img?.image_url || img?.file_path || img))
        : (propertyData?.cover_image || propertyData?.image)
            ? [formatPropertyImgUrl(propertyData.cover_image || propertyData.image)]
            : defaultPhotoAssets;

    // Playable Property Videos & Malayalam AI Reels (listed directly inside the property images gallery like 99acres)
    const rawVideosList = Array.isArray(propertyData?.videos) ? propertyData.videos : [];
    const propertyVideos = (() => {
        const list = [];
        const seen = new Set();

        const cleanBaseFilename = (url) => {
            if (!url) return "";
            try {
                const p = new URL(url, "http://localhost").pathname;
                const file = p.split("/").pop() || "";
                return file.replace(/_wide(\.[a-z0-9]+)$/i, "$1").toLowerCase();
            } catch {
                return String(url).split("?")[0].replace(/_wide(\.[a-z0-9]+)$/i, "$1").toLowerCase();
            }
        };

        rawVideosList.forEach((v, idx) => {
            const preferredUrl = typeof v === "string" ? v : (v?.wide_url || v?.url || v?.video_url);
            const url = formatPropertyMediaUrl(preferredUrl);
            const baseFile = cleanBaseFilename(url) || url;
            if (!url || seen.has(url) || seen.has(baseFile)) return;
            seen.add(url);
            seen.add(baseFile);
            list.push({
                id: v?.id || `vid-${idx}`,
                url,
                thumbnail: v?.thumbnail_url ? formatPropertyMediaUrl(v.thumbnail_url) : photoAssets[0],
                title: v?.title || "Property Video",
                durationFormatted: v?.duration_formatted || (v?.duration > 0 ? `0:${String(v.duration).padStart(2, "0")}` : null),
                durationSec: Number(v?.duration) || 0,
                isAiMalayalam: Boolean(v?.is_ai_malayalam || String(url).includes("reel_prop_")),
            });
        });

        // Only check single fallbackVidUrl if no videos were loaded from the primary videos list
        if (list.length === 0) {
            const fallbackVidUrl = propertyData?.videoUrl ? formatPropertyMediaUrl(propertyData.videoUrl) : "";
            const fallbackBase = cleanBaseFilename(fallbackVidUrl);
            if (
                fallbackVidUrl &&
                !seen.has(fallbackVidUrl) &&
                !seen.has(fallbackBase) &&
                (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(fallbackVidUrl) || fallbackVidUrl.includes("/uploads/properties/videos/"))
            ) {
                list.push({
                    id: "vid-fallback",
                    url: fallbackVidUrl,
                    thumbnail: photoAssets[0],
                    title: "Property Video",
                    durationFormatted: null,
                    isAiMalayalam: fallbackVidUrl.includes("reel_prop_"),
                });
            }
        }
        return list;
    })();

    const galleryMediaItems = [
        ...propertyVideos.map((vid, idx) => ({
            kind: "video",
            key: `gallery-vid-${vid.id || idx}`,
            ...vid,
        })),
        ...photoAssets.map((photoUrl, idx) => ({
            kind: "photo",
            key: `gallery-photo-${idx}`,
            url: photoUrl,
            thumbnail: photoUrl,
            photoNumber: idx + 1,
        })),
    ];

    const videoPlayerRefs = useRef({});
    const scrubbingVideoKeyRef = useRef(null);
    const [playingVideoKey, setPlayingVideoKey] = useState(null);
    const [videoTimeMap, setVideoTimeMap] = useState({});
    const [videoDurMap, setVideoDurMap] = useState({});
    const [videoMuted, setVideoMuted] = useState(false);

    const toggleSlideVideoPlay = (key) => {
        const el = videoPlayerRefs.current[key];
        if (!el) return;
        if (el.paused) {
            el.play().catch(() => {});
        } else {
            el.pause();
        }
    };

    const seekSlideVideoTo = (key, targetSec) => {
        const el = videoPlayerRefs.current[key];
        if (!el || !Number.isFinite(targetSec)) return;
        const maxDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : (videoDurMap[key] || 0);
        const clamped = Math.max(0, maxDur > 0 ? Math.min(maxDur, targetSec) : targetSec);
        el.currentTime = clamped;
        setVideoTimeMap((prev) => ({ ...prev, [key]: clamped }));
    };

    const skipSlideVideoBy = (key, delta) => {
        const el = videoPlayerRefs.current[key];
        const base = el ? (el.currentTime || 0) : (videoTimeMap[key] || 0);
        seekSlideVideoTo(key, base + delta);
    };

    const toggleSlideVideoMute = (key) => {
        const nextMuted = !videoMuted;
        setVideoMuted(nextMuted);
        Object.values(videoPlayerRefs.current).forEach((el) => {
            if (el) el.muted = nextMuted;
        });
        if (videoPlayerRefs.current[key]) {
            videoPlayerRefs.current[key].muted = nextMuted;
        }
    };

    // Compare shortlist
    const compareBtnRef = useRef(null);
    const { list: compareList } = useSyncExternalStore(subscribeCompare, getCompareSnapshot, getCompareServerSnapshot);
    const isComparing = compareList.some((p) => p.id === propCode || p.id === PROPERTY_COMPARE_ID);

    const handleToggleCompare = () => {
        if (isComparing) {
            removeFromCompare(propCode);
            removeFromCompare(PROPERTY_COMPARE_ID);
            triggerToast("Removed from compare.");
            return;
        }
        const result = addToCompare({
            id: propCode,
            title: title,
            image: photoAssets[0],
        });
        if (!result.added) {
            if (result.reason === "full") {
                triggerToast(`You can compare up to ${COMPARE_MAX} properties at a time — remove one first.`);
            }
            return;
        }
        flyToCompareBucket(compareBtnRef.current, photoAssets[0]);
        triggerToast("Added to compare.");
    };

    useEffect(() => {
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > 200 && currentScrollY > lastScrollY) {
                setShowStickyAgent(true);
            } else {
                setShowStickyAgent(false);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isNative = Boolean(
                document.fullscreenElement === showcaseRef.current ||
                document.webkitFullscreenElement === showcaseRef.current
            );
            if (!isNative && !document.fullscreenElement && !document.webkitFullscreenElement) {
                setIsFullscreen(false);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        };
    }, []);

    const closeFullscreen = useCallback(() => {
        setIsFullscreen(false);
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => { });
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }, []);

    const openFullscreen = useCallback(() => {
        if (!showcaseRef.current) return;
        const element = showcaseRef.current;
        setIsFullscreen(true);
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(() => {
                // Fallback is already handled by isFullscreen state
            });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (isFullscreen) {
            closeFullscreen();
        } else {
            openFullscreen();
        }
    }, [isFullscreen, closeFullscreen, openFullscreen]);

    // Escape key listener to close fullscreen
    useEffect(() => {
        if (!isFullscreen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                closeFullscreen();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen, closeFullscreen]);

    // Prevent body scroll when viewing image in fullscreen / fallback modal
    useEffect(() => {
        if (isFullscreen) {
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prevOverflow;
            };
        }
    }, [isFullscreen]);

    // Reset current photo index when changing media tabs
    useEffect(() => {
        setCurrentPhotoIndex(0);
    }, [activeMediaTab]);

    const floorPlan = (propertyData?.floorPlans && propertyData.floorPlans.length > 0)
        ? propertyData.floorPlans.map((img) => typeof img === "string" ? img : img.url)
        : [];

    const prefersReducedMotion = useSyncExternalStore(
        subscribeToReducedMotion,
        getPrefersReducedMotion,
        getPrefersReducedMotionOnServer
    );

    /* Autoplay runs by default, but stays still for anyone who has asked for
       reduced motion. `null` means "no explicit choice yet" — once the visitor
       presses the button their decision wins either way, so the control still
       works for them. */
    const [autoplayChoice, setAutoplayChoice] = useState(null);
    const isAutoPlaying = autoplayChoice ?? !prefersReducedMotion;

    /* Only the two tabs that actually hold a strip of media items can advance. */
    const isSlideshowTab = activeMediaTab === "photos" || activeMediaTab === "floor";
    const slideCount = activeMediaTab === "floor" ? floorPlan.length : galleryMediaItems.length;
    const currentGalleryItem = activeMediaTab === "photos" ? galleryMediaItems[currentPhotoIndex] : null;
    const isCurrentSlideVideo = currentGalleryItem?.kind === "video";
    const activeGallerySlideKey = currentGalleryItem?.key || null;

    // Pause any non-active video slides when user switches slide or tab
    useEffect(() => {
        Object.entries(videoPlayerRefs.current).forEach(([key, el]) => {
            if (!el) return;
            if (key !== activeGallerySlideKey && !el.paused) {
                try {
                    el.pause();
                } catch (_) { }
            }
        });
    }, [activeGallerySlideKey]);

    /* A dwell timer per slide rather than one fixed interval: because
       currentPhotoIndex is a dependency, arrows, swipes and thumbnail clicks all
       restart the clock, so a manual jump always gets the full 4s to be looked
       at instead of being cut short mid-tick. Video slides never auto-skip! */
    useEffect(() => {
        if (!isAutoPlaying || !isSlideshowTab || slideCount < 2 || isCurrentSlideVideo) return;

        const timer = setTimeout(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % slideCount);
        }, AUTOPLAY_MS);

        return () => clearTimeout(timer);
    }, [isAutoPlaying, isSlideshowTab, slideCount, currentPhotoIndex, isCurrentSlideVideo]);

    // Swipe gestures for main carousel
    const dragStartXRef = useRef(0);
    const isDraggingRef = useRef(false);
    const hasSwipedRef = useRef(false);

    const handleSwipeStart = (clientX, targetEl) => {
        if (targetEl?.closest?.("video")) return;
        dragStartXRef.current = clientX;
        isDraggingRef.current = true;
        hasSwipedRef.current = false;
    };

    const handleSwipeMove = (clientX) => {
        if (!isDraggingRef.current) return;
        const diff = clientX - dragStartXRef.current;
        const len = activeMediaTab === "floor" ? floorPlan.length : galleryMediaItems.length;
        if (len < 2) return;
        if (diff > 50) {
            // swipe right -> prev slide
            setCurrentPhotoIndex((prev) => (prev - 1 + len) % len);
            isDraggingRef.current = false;
            hasSwipedRef.current = true;
        } else if (diff < -50) {
            // swipe left -> next slide
            setCurrentPhotoIndex((prev) => (prev + 1) % len);
            isDraggingRef.current = false;
            hasSwipedRef.current = true;
        }
    };

    const handleSwipeEnd = () => {
        isDraggingRef.current = false;
        setTimeout(() => {
            hasSwipedRef.current = false;
        }, 100);
    };

    const handleShowcaseClick = (e) => {
        // If clicking on control buttons, video player, interactive tabs, etc., let their handlers run
        if (
            e.target.closest("button") ||
            e.target.closest("a") ||
            e.target.closest("video") ||
            e.target.closest(`.${styles.thumbnailTabs}`)
        ) {
            return;
        }
        if (hasSwipedRef.current) return;
        if (!isFullscreen && (activeMediaTab === "photos" || activeMediaTab === "floor") && !isCurrentSlideVideo) {
            openFullscreen();
        }
    };

    // 2. Info Tab Section State
    const [activeInfoTab, setActiveInfoTab] = useState("overview"); // "overview", "details", "amenities", "location"

    useEffect(() => {
        if (!hasAmenitiesTab && activeInfoTab === "amenities") {
            setActiveInfoTab("overview");
        }
    }, [hasAmenitiesTab, activeInfoTab]);

    // 3. User Interactivity States
    const [isSaved, setIsSaved] = useState(false);
    const [offerAmount, setOfferAmount] = useState("");
    const [submittedOffer, setSubmittedOffer] = useState(null);
    const [offerDetails, setOfferDetails] = useState(null);
    const [isEditingOffer, setIsEditingOffer] = useState(false);
    const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
    const [successToast, setSuccessToast] = useState("");
    const [showContactModal, setShowContactModal] = useState(false);

    // Sync saved status from listing
    useEffect(() => {
        if (propertyData) {
            setIsSaved(Boolean(propertyData.is_saved || propertyData.isSaved));
        }
    }, [propertyData]);

    const handleToggleSave = async () => {
        if (!isAuthenticated) {
            router.push(getLoginRedirectUrl());
            return;
        }
        const propId = propertyData?.propertyId || propertyData?.id || rawId;
        if (!propId) return;

        const nextVal = !isSaved;
        setIsSaved(nextVal);
        triggerToast(nextVal ? "Property saved to bookmarks!" : "Property removed from bookmarks.");

        try {
            const res = await propertyApi.toggleFavorite(propId);
            if (res && typeof res.saved === "boolean") {
                setIsSaved(res.saved);
            }
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
            setIsSaved(!nextVal);
            triggerToast("Failed to update saved status.");
        }
    };

    // Fetch existing user offer for this property
    useEffect(() => {
        const fetchMyOffer = async () => {
            const propId = propertyData?.propertyId || propertyData?.id || rawId;
            if (!propId) return;
            try {
                const res = await offersApi.getMyOffer(propId);
                if (res?.success && res.data) {
                    setOfferDetails(res.data);
                    setSubmittedOffer(res.data.offer_amount);
                }
            } catch (e) { }
        };
        fetchMyOffer();
    }, [propertyData?.propertyId, propertyData?.id, rawId]);

    // AI summary popup — built from the listing's own data (see lib/propertySummary)
    const [showSummary, setShowSummary] = useState(false);
    const [summaryCopied, setSummaryCopied] = useState(false);
    const summaryTriggerRef = useRef(null);
    const summaryCloseRef = useRef(null);
    const aiSummary = showSummary ? buildPropertySummary(propertyData) : null;

    const closeSummary = useCallback(() => {
        setShowSummary(false);
        setSummaryCopied(false);
        // Hand focus back to the button that opened it.
        summaryTriggerRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!showSummary) return;
        const onKey = (event) => {
            if (event.key === "Escape") closeSummary();
        };
        document.addEventListener("keydown", onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        summaryCloseRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [showSummary, closeSummary]);

    // Report-a-listing modal
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportDetails, setReportDetails] = useState("");

    const closeReportModal = useCallback(() => {
        setShowReportModal(false);
        /* Cleared on close so reopening never shows a stale half-filled form. */
        setReportReason("");
        setReportDetails("");
    }, []);

    /* Esc closes the report modal and the page behind it is locked so it cannot
       scroll under the overlay. */
    useEffect(() => {
        if (!showReportModal) return;

        const onKey = (event) => {
            if (event.key === "Escape") closeReportModal();
        };

        document.addEventListener("keydown", onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [showReportModal, closeReportModal]);

    const submitReport = () => {
        if (!reportReason) return;
        const chosen = REPORT_REASONS.find((r) => r.id === reportReason);

        /* Typed details are kept while the visitor switches reasons — losing a
           long explanation to a mis-click would be worse — but they only belong
           to "Other", so anything else submits without them. */
        const report = {
            reason: chosen.id,
            details: chosen.id === "other" ? reportDetails.trim() : "",
        };

        closeReportModal();
        triggerToast(`Report submitted: ${chosen.label}. Our team will review this listing.`);
        return report;
    };

    // Form inputs for modals
    const [agentMsg, setAgentMsg] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    useEffect(() => {
        if (title) {
            setAgentMsg(`Hi ${propOwner.name || "there"}, I am interested in "${title}". Please contact me with more information.`);
        }
    }, [title, propOwner.name]);

    const handlePrevPhoto = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const len = activeMediaTab === "floor" ? floorPlan.length : galleryMediaItems.length;
        if (len < 1) return;
        setCurrentPhotoIndex((prev) => (prev - 1 + len) % len);
    };

    const handleNextPhoto = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const len = activeMediaTab === "floor" ? floorPlan.length : galleryMediaItems.length;
        if (len < 1) return;
        setCurrentPhotoIndex((prev) => (prev + 1) % len);
    };

    // "before" or "after"

    // Toast triggers helper
    const triggerToast = (msg) => {
        setSuccessToast(msg);
        setTimeout(() => setSuccessToast(""), 4000);
    };

    const handleOfferSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            router.push(getLoginRedirectUrl());
            return;
        }
        if (!offerAmount.trim() || isSubmittingOffer) return;
        const amt = parseFloat(offerAmount.trim());
        if (isNaN(amt) || amt <= 0) {
            triggerToast("Please enter a valid offer amount.");
            return;
        }

        setIsSubmittingOffer(true);
        const propId = propertyData?.propertyId || propertyData?.id || rawId;
        try {
            const res = await offersApi.submitOffer(propId, { offer_amount: amt });
            if (res?.success) {
                setSubmittedOffer(amt);
                setOfferDetails({
                    offer_amount: amt,
                    status: "pending",
                });
                setIsEditingOffer(false);
                setOfferAmount("");
                triggerToast(`Offer of ₹${Number(amt).toLocaleString("en-IN")} submitted successfully! The owner has been notified.`);
            } else {
                triggerToast(res?.message || "Failed to submit offer.");
            }
        } catch (err) {
            triggerToast(err?.response?.data?.message || "Please sign in to submit an offer.");
        } finally {
            setIsSubmittingOffer(false);
        }
    };

    const handleEditOffer = () => {
        if (!isAuthenticated) {
            router.push(getLoginRedirectUrl());
            return;
        }
        setIsEditingOffer(true);
        setOfferAmount(String(submittedOffer || ""));
    };

    const handleCancelEdit = () => {
        setIsEditingOffer(false);
        setOfferAmount("");
    };

    const handleScheduleSiteVisit = () => {
        if (!isAuthenticated) {
            router.push(getLoginRedirectUrl());
            return;
        }
        const propId = propertyData?.propertyId || propertyData?.id || rawId;
        const ownerLoginId = propOwner.loginId || propOwner.login_id || propOwner.id;
        queuePropertyShare({
            agentName: propOwner.name,
            recipient_id: ownerLoginId,
            property: {
                id: propId,
                title: title,
                image: photoAssets[0],
                price: propPrice,
                location: propLocation,
            },
            note: `Hi ${propOwner.name}, I'd like to schedule a site visit for ${title} (${propCode}). Could you share the available time slots?`,
        });

        router.push("/messages");
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            router.push(getLoginRedirectUrl());
            return;
        }
        if (!agentMsg.trim() || isSendingMessage) return;
        setIsSendingMessage(true);
        const propId = propertyData?.propertyId || propertyData?.id || rawId;
        try {
            await propertyApi.contact(propId, agentMsg.trim());
            triggerToast(`Message sent to ${propOwner.name} successfully!`);
            setShowContactModal(false);
        } catch (error) {
            triggerToast(error?.response?.data?.message || "Couldn't send your enquiry. Please try again.");
        } finally {
            setIsSendingMessage(false);
        }
    };

    const copyLinkToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        triggerToast("Property link copied to clipboard!");
    };

    if (isLoading) {
        return (
            <>
                <Nav />
                <div className={styles.detailsContainer}>
                    <div className={styles.container} style={{ padding: "32px 16px" }}>
                        <div style={{ height: "20px", width: "240px", background: "#e2e8f0", borderRadius: "6px", marginBottom: "24px" }} />
                        <div className={styles.mainLayout}>
                            <div className={styles.leftColumn}>
                                <div style={{ width: "100%", height: "420px", background: "#e2e8f0", borderRadius: "16px", marginBottom: "24px" }} />
                                <div style={{ height: "28px", width: "60%", background: "#e2e8f0", borderRadius: "6px", marginBottom: "12px" }} />
                                <div style={{ height: "18px", width: "40%", background: "#f1f5f9", borderRadius: "6px", marginBottom: "20px" }} />
                                <div style={{ height: "100px", width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px" }} />
                            </div>
                            <div className={styles.rightColumn}>
                                <div style={{ width: "100%", height: "280px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "20px" }}>
                                    <div style={{ height: "32px", width: "50%", background: "#e2e8f0", borderRadius: "6px", marginBottom: "16px" }} />
                                    <div style={{ height: "42px", width: "100%", background: "#e2e8f0", borderRadius: "10px", marginBottom: "10px" }} />
                                    <div style={{ height: "42px", width: "100%", background: "#f1f5f9", borderRadius: "10px" }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (!propertyData) {
        return (
            <>
                <Nav />
                <div className={styles.detailsContainer}>
                    <div className={styles.container} style={{ padding: "80px 16px", textAlign: "center" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
                            Property Not Found
                        </h2>
                        <p style={{ color: "#64748b", marginBottom: "24px" }}>
                            The property you are looking for may have been removed or is unavailable.
                        </p>
                        <Link
                            href="/properties"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                background: "#2563eb",
                                color: "#fff",
                                padding: "10px 20px",
                                borderRadius: "10px",
                                fontWeight: 600,
                                textDecoration: "none"
                            }}
                        >
                            Browse All Properties
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Nav />

            <div className={styles.detailsContainer}>
                {/* Sticky Mobile Agent Bar */}
                <div className={`${styles.stickyAgentBar} ${showStickyAgent ? styles.stickyAgentBarVisible : ""}`}>
                    <Link href={ownerProfileUrl} className={styles.stickyAgentInfo} style={{ textDecoration: "none", color: "inherit" }}>
                        <img
                            src={propOwner.photo || "/logo_placeholder.png"}
                            alt={propOwner.name || "Owner"}
                            className={styles.stickyAgentAvatar}
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/logo_placeholder.png";
                            }}
                        />
                        <div className={styles.stickyAgentMeta}>
                            <span className={styles.stickyAgentName}>{propOwner.name || "Owner"}</span>
                            <span className={styles.stickyAgentPrice}>{propPrice}</span>
                        </div>
                    </Link>
                    <div className={styles.stickyAgentActions}>
                        <button
                            type="button"
                            className={styles.stickyCallBtn}
                            onClick={() => {
                                const propId = propertyData?.propertyId || propertyData?.id || rawId;
                                dashboardApi.recordCall(propId, "phone").catch(() => { });
                                // Never dial a placeholder number when the owner has no phone on file.
                                const digits = String(propOwner.phone || "").replace(/\D/g, "").slice(-10);
                                if (digits.length === 10) window.location.href = `tel:+91${digits}`;
                            }}
                            aria-label={`Call ${propOwner.name || "Owner"}`}
                        >
                            <RiPhoneLine />
                        </button>
                        <button
                            type="button"
                            className={styles.stickyChatBtn}
                            onClick={handleScheduleSiteVisit}
                        >
                            <RiMessage3Line />
                            <span>Chat</span>
                        </button>
                    </div>
                </div>
                <div className={styles.container}>
                    {/* Mobile: back button (replaces breadcrumbs) */}
                    <div className={styles.mobileBackBar}>
                        <button
                            type="button"
                            className={styles.mobileBackBtn}
                            onClick={handleBackNavigation}
                            aria-label="Go back"
                        >
                            <RiArrowLeftSLine />
                            <span>Back</span>
                        </button>
                    </div>

                    {/* Breadcrumbs (desktop / tablet) */}
                    <div className={styles.breadcrumbs}>
                        <Link href="/">Home</Link>
                        <span>&gt;</span>
                        <Link href="/properties">Properties</Link>
                        <span>&gt;</span>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{title}</span>
                    </div>

                    {/* Main Content Layout */}
                    <div className={styles.mainLayout}>

                        {/* ========================================== */}
                        {/* LEFT AREA                                  */}
                        {/* ========================================== */}
                        <div className={styles.leftColumn}>

                            {/* Interactive Hero Media Showcase */}
                            <div
                                ref={showcaseRef}
                                className={`${styles.heroShowcase} ${isFullscreen ? styles.isFullscreenFallback : ""}`}
                                onClick={handleShowcaseClick}
                                onMouseDown={(e) => (activeMediaTab === "photos" || activeMediaTab === "floor") && handleSwipeStart(e.clientX, e.target)}
                                onMouseMove={(e) => (activeMediaTab === "photos" || activeMediaTab === "floor") && handleSwipeMove(e.clientX)}
                                onMouseUp={handleSwipeEnd}
                                onMouseLeave={handleSwipeEnd}
                                onTouchStart={(e) => (activeMediaTab === "photos" || activeMediaTab === "floor") && handleSwipeStart(e.touches[0].clientX, e.target)}
                                onTouchMove={(e) => (activeMediaTab === "photos" || activeMediaTab === "floor") && handleSwipeMove(e.touches[0].clientX)}
                                onTouchEnd={handleSwipeEnd}
                            >
                                {/* 1. Unified Property Videos + Photos Carousel (99acres style) */}
                                {activeMediaTab === "photos" && (
                                    <>
                                        <div
                                            className={styles.photoTrack}
                                            style={{
                                                transform: `translateX(-${currentPhotoIndex * 100}%)`
                                            }}
                                        >
                                            {galleryMediaItems.map((item, idx) => {
                                                if (item.kind === "video") {
                                                    const isVidPlaying = playingVideoKey === item.key;
                                                    const curSec = videoTimeMap[item.key] || 0;
                                                    const durSec = videoDurMap[item.key] || item.durationSec || 0;
                                                    const pct = durSec > 0 ? Math.min(100, (curSec / durSec) * 100) : 0;
                                                    return (
                                                        <div key={item.key} className={styles.videoSlideStage}>
                                                            <div
                                                                className={styles.videoSlideBackdrop}
                                                                style={{
                                                                    backgroundImage: item.thumbnail ? `url("${item.thumbnail}")` : undefined,
                                                                }}
                                                            />
                                                            <span className={styles.videoSlideBadge}>
                                                                <span>▶</span>
                                                                <span>
                                                                    {item.isAiMalayalam
                                                                        ? "മലയാളം Property Reel"
                                                                        : item.title || "Property Video"}
                                                                </span>
                                                            </span>
                                                            <div
                                                                className={styles.videoSlidePlayerWrap}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleSlideVideoPlay(item.key);
                                                                }}
                                                            >
                                                                <video
                                                                    ref={(el) => {
                                                                        videoPlayerRefs.current[item.key] = el;
                                                                    }}
                                                                    src={item.url}
                                                                    poster={item.thumbnail}
                                                                    muted={videoMuted}
                                                                    playsInline
                                                                    preload={Math.abs(idx - currentPhotoIndex) <= 1 ? "metadata" : "none"}
                                                                    className={styles.videoSlidePlayer}
                                                                    onPlay={() => setPlayingVideoKey(item.key)}
                                                                    onPause={() => setPlayingVideoKey((prev) => (prev === item.key ? null : prev))}
                                                                    onEnded={() => setPlayingVideoKey((prev) => (prev === item.key ? null : prev))}
                                                                    onTimeUpdate={(e) => {
                                                                        if (scrubbingVideoKeyRef.current === item.key) return;
                                                                        const t = e.currentTarget.currentTime || 0;
                                                                        setVideoTimeMap((prev) => ({ ...prev, [item.key]: t }));
                                                                    }}
                                                                    onLoadedMetadata={(e) => {
                                                                        const d = e.currentTarget.duration;
                                                                        if (Number.isFinite(d) && d > 0) {
                                                                            setVideoDurMap((prev) => ({ ...prev, [item.key]: d }));
                                                                        }
                                                                    }}
                                                                />
                                                                {!isVidPlaying && (
                                                                    <button
                                                                        type="button"
                                                                        className={styles.videoCenterPlayBtn}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleSlideVideoPlay(item.key);
                                                                        }}
                                                                        aria-label="Play video"
                                                                    >
                                                                        <RiPlayFill style={{ marginLeft: "3px" }} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div
                                                                className={styles.customVideoControlBar}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onTouchStart={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className={styles.videoCtrlBtn}
                                                                    onClick={() => toggleSlideVideoPlay(item.key)}
                                                                    aria-label={isVidPlaying ? "Pause video" : "Play video"}
                                                                >
                                                                    {isVidPlaying ? <RiPauseFill /> : <RiPlayFill />}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className={styles.videoCtrlBtn}
                                                                    onClick={() => skipSlideVideoBy(item.key, -5)}
                                                                    aria-label="Backward 5 seconds"
                                                                    style={{ width: "auto", padding: "0 8px", fontSize: "12px", fontWeight: 700 }}
                                                                >
                                                                    -5s
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className={styles.videoCtrlBtn}
                                                                    onClick={() => skipSlideVideoBy(item.key, 5)}
                                                                    aria-label="Forward 5 seconds"
                                                                    style={{ width: "auto", padding: "0 8px", fontSize: "12px", fontWeight: 700 }}
                                                                >
                                                                    +5s
                                                                </button>

                                                                <span className={styles.videoCtrlTime}>
                                                                    {formatVideoTime(curSec)} / {formatVideoTime(durSec)}
                                                                </span>

                                                                <input
                                                                    type="range"
                                                                    className={styles.videoSeekInput}
                                                                    min={0}
                                                                    max={durSec > 0 ? durSec : 1}
                                                                    step={0.1}
                                                                    value={Math.min(curSec, durSec > 0 ? durSec : 1)}
                                                                    onMouseDown={() => {
                                                                        scrubbingVideoKeyRef.current = item.key;
                                                                    }}
                                                                    onTouchStart={() => {
                                                                        scrubbingVideoKeyRef.current = item.key;
                                                                    }}
                                                                    onPointerDown={() => {
                                                                        scrubbingVideoKeyRef.current = item.key;
                                                                    }}
                                                                    onMouseUp={() => {
                                                                        scrubbingVideoKeyRef.current = null;
                                                                    }}
                                                                    onTouchEnd={() => {
                                                                        scrubbingVideoKeyRef.current = null;
                                                                    }}
                                                                    onPointerUp={() => {
                                                                        scrubbingVideoKeyRef.current = null;
                                                                    }}
                                                                    onChange={(e) => seekSlideVideoTo(item.key, Number(e.target.value))}
                                                                    aria-label="Seek video"
                                                                    style={{
                                                                        background: `linear-gradient(to right, #3b82f6 ${pct}%, rgba(255,255,255,0.28) ${pct}%)`,
                                                                    }}
                                                                />

                                                                <button
                                                                    type="button"
                                                                    className={styles.videoCtrlBtn}
                                                                    onClick={() => toggleSlideVideoMute(item.key)}
                                                                    aria-label={videoMuted ? "Unmute video" : "Mute video"}
                                                                >
                                                                    {videoMuted ? <RiVolumeMuteFill /> : <RiVolumeUpFill />}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className={styles.videoCtrlBtn}
                                                                    onClick={toggleFullscreen}
                                                                    aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                                                                >
                                                                    {isFullscreen ? <RiCloseLine /> : <RiFullscreenLine />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <img
                                                        key={item.key}
                                                        src={item.url}
                                                        /* Load the visible photo and its neighbours now; the rest as the slider reaches them. */
                                                        loading={Math.abs(idx - currentPhotoIndex) <= 1 ? "eager" : "lazy"}
                                                        fetchPriority={idx === 0 ? "high" : "auto"}
                                                        decoding="async"
                                                        alt={`${title} - Photo ${item.photoNumber}`}
                                                        className={styles.sliderImage}
                                                        draggable="false"
                                                        onError={handlePropertyImageError}
                                                    />
                                                );
                                            })}
                                        </div>
                                        {galleryMediaItems.length > 1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    className={`${styles.slideArrow} ${styles.arrowLeft}`}
                                                    onClick={handlePrevPhoto}
                                                    aria-label="Previous media"
                                                >
                                                    <RiArrowLeftSLine />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`${styles.slideArrow} ${styles.arrowRight}`}
                                                    onClick={handleNextPhoto}
                                                    aria-label="Next media"
                                                >
                                                    <RiArrowRightSLine />
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* 2. 3D Video Viewer */}
                                {activeMediaTab === "3d" && tourUrl && (
                                    <div className={styles.threedcontainer}>
                                        <iframe
                                            title="3D Video"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            src={tourUrl}
                                        />
                                        <div style={{
                                            position: "absolute",
                                            top: "20px",
                                            left: "20px",
                                            background: "rgba(15, 23, 42, 0.8)",
                                            color: "#ffffff",
                                            padding: "6px 14px",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            borderRadius: "30px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            pointerEvents: "none"
                                        }}>
                                            <span>▶</span>
                                            <span>3D Video</span>
                                        </div>
                                    </div>
                                )}

                                {/* 3. Floor Plan Mockup */}
                                {activeMediaTab === "floor" && (
                                    <>
                                        <div
                                            className={styles.photoTrack}
                                            style={{
                                                transform: `translateX(-${currentPhotoIndex * 100}%)`
                                            }}
                                        >
                                            {floorPlan.map((asset, idx) => (
                                                <img
                                                    key={idx}
                                                    src={asset}
                                                    loading="lazy"
                                                    decoding="async"
                                                    alt={`Floor Plan ${idx + 1}`}
                                                    className={styles.sliderImage}
                                                    draggable="false"
                                                    onError={handlePropertyImageError}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            className={`${styles.slideArrow} ${styles.arrowLeft}`}
                                            onClick={handlePrevPhoto}
                                        >
                                            <RiArrowLeftSLine />
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.slideArrow} ${styles.arrowRight}`}
                                            onClick={handleNextPhoto}
                                        >
                                            <RiArrowRightSLine />
                                        </button>
                                    </>
                                )}

                                {/* 4. Voice Note Walkthrough */}
                                {activeMediaTab === "voice" && voiceNoteUrl && (
                                    <div className={styles.voiceStage}>
                                        <div className={styles.voiceStagePill}>
                                            <RiVolumeUpFill />
                                            <span>Voice Walkthrough</span>
                                        </div>
                                        <div className={styles.voiceStageCenter}>
                                            <div className={styles.voicePulseCircle}>
                                                <RiVolumeUpFill size={36} />
                                            </div>
                                            <h3 className={styles.voiceStageTitle}>Audio Walkthrough from Property Owner</h3>
                                            <p className={styles.voiceStageDesc}>Listen to personal details and highlights about this listing</p>
                                            <div className={styles.voiceAudioBox}>
                                                <VoiceNotePlayer
                                                    src={voiceNoteUrl}
                                                    title="Owner's audio walkthrough"
                                                    initialDuration={voiceNoteDuration}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.topRightContainer}>
                                    {/* Autoplay toggle (hidden while watching a video slide) */}
                                    {isSlideshowTab && slideCount > 1 && !isCurrentSlideVideo && (
                                        <span className={styles.autoplayWrap}>
                                            <button
                                                type="button"
                                                className={styles.saveBadgeBtn}
                                                onClick={() => setAutoplayChoice(!isAutoPlaying)}
                                                title={isAutoPlaying ? "Pause slideshow" : "Play slideshow"}
                                                aria-label={isAutoPlaying ? "Pause slideshow" : "Play slideshow"}
                                                aria-pressed={isAutoPlaying}
                                            >
                                                {isAutoPlaying ? <RiPauseFill /> : <RiPlayFill />}
                                            </button>

                                            {isAutoPlaying && (
                                                <svg
                                                    key={currentPhotoIndex}
                                                    className={styles.autoplayRing}
                                                    viewBox="0 0 34 34"
                                                    aria-hidden="true"
                                                >
                                                    <circle className={styles.autoplayRingTrack} cx="17" cy="17" r="15.6" />
                                                    <circle
                                                        className={styles.autoplayRingBar}
                                                        cx="17"
                                                        cy="17"
                                                        r="15.6"
                                                        pathLength="100"
                                                        style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                                                    />
                                                </svg>
                                            )}
                                        </span>
                                    )}

                                    {/* Bookmark Save Badge */}
                                    <button
                                        type="button"
                                        className={styles.saveBadgeBtn}
                                        onClick={handleToggleSave}
                                        title={isSaved ? "Saved" : "Save Property"}
                                    >
                                        {isSaved ? (
                                            <RiBookmarkFill style={{ color: "#fff" }} />
                                        ) : (
                                            <RiBookmarkLine />
                                        )}
                                    </button>

                                    {/* Full Screen / Close Button */}
                                    <button
                                        type="button"
                                        className={`${styles.saveBadgeBtn} ${isFullscreen ? styles.activeCloseBadge : ""}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFullscreen();
                                        }}
                                        title={isFullscreen ? "Close image viewer" : "Fullscreen"}
                                        aria-label={isFullscreen ? "Close image viewer" : "Fullscreen"}
                                    >
                                        {isFullscreen ? (
                                            <RiCloseLine size={22} />
                                        ) : (
                                            <RiFullscreenLine />
                                        )}
                                    </button>
                                </div>

                                {/* Gallery Navigation Thumbnail Tabs Overlay */}
                                <div className={`${styles.thumbnailBar} ${activeMediaTab === "photos" && isCurrentSlideVideo ? styles.thumbnailBarWithVideo : ""}`}>
                                    <div className={styles.thumbnailTabs}>
                                        {propertyVideos.length > 0 && (
                                            <button
                                                type="button"
                                                className={`${styles.thumbTab} ${activeMediaTab === "photos" && isCurrentSlideVideo ? styles.thumbTabActive : ""}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMediaTab("photos");
                                                    setCurrentPhotoIndex(0);
                                                }}
                                            >
                                                <span className={styles.thumbIcon}>🎥</span>
                                                <span>Videos ({propertyVideos.length})</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className={`${styles.thumbTab} ${activeMediaTab === "photos" && !isCurrentSlideVideo ? styles.thumbTabActive : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMediaTab("photos");
                                                setCurrentPhotoIndex(propertyVideos.length);
                                            }}
                                        >
                                            <span className={styles.thumbIcon}>📷</span>
                                            <span>Photos ({photoAssets.length})</span>
                                        </button>
                                        {tourUrl && (
                                            <button
                                                type="button"
                                                className={`${styles.thumbTab} ${activeMediaTab === "3d" ? styles.thumbTabActive : ""}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMediaTab("3d");
                                                }}
                                            >
                                                <span className={styles.thumbIcon}>🎬</span>
                                                <span>3D Video</span>
                                            </button>
                                        )}
                                        {floorPlan.length > 0 && (
                                            <button
                                                type="button"
                                                className={`${styles.thumbTab} ${activeMediaTab === "floor" ? styles.thumbTabActive : ""}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMediaTab("floor");
                                                    setCurrentPhotoIndex(0);
                                                }}
                                            >
                                                <span className={styles.thumbIcon}>📐</span>
                                                <span>Floor plan ({floorPlan.length})</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Media Count Badge */}
                                    {(activeMediaTab === "photos" || activeMediaTab === "floor") && (
                                        <div className={styles.imageCountBadge} style={{ pointerEvents: "auto" }}>
                                            {currentPhotoIndex + 1} / {activeMediaTab === "floor" ? floorPlan.length : galleryMediaItems.length}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 99acres-style Horizontal Media Filmstrip (Videos + Property Photos side-by-side) */}
                            {galleryMediaItems.length > 1 && (
                                <div className={styles.mediaFilmstrip} role="tablist" aria-label="Property videos and photos">
                                    {galleryMediaItems.map((item, idx) => {
                                        const isActiveThumb = activeMediaTab === "photos" && currentPhotoIndex === idx;
                                        return (
                                            <button
                                                key={`thumb-${item.key}`}
                                                type="button"
                                                role="tab"
                                                aria-selected={isActiveThumb}
                                                className={`${styles.filmstripThumb} ${isActiveThumb ? styles.filmstripThumbActive : ""}`}
                                                onClick={() => {
                                                    if (activeMediaTab !== "photos") {
                                                        setActiveMediaTab("photos");
                                                    }
                                                    setCurrentPhotoIndex(idx);
                                                }}
                                                title={
                                                    item.kind === "video"
                                                        ? item.isAiMalayalam
                                                            ? "Play Malayalam Property Reel"
                                                            : item.title || "Play Property Video"
                                                        : `View Photo ${item.photoNumber}`
                                                }
                                            >
                                                <img
                                                    src={item.thumbnail}
                                                    alt={item.kind === "video" ? "Property Video Thumbnail" : `Photo ${item.photoNumber}`}
                                                    className={styles.filmstripThumbImg}
                                                    loading="lazy"
                                                    onError={handlePropertyImageError}
                                                />
                                                {item.kind === "video" && (
                                                    <div className={styles.filmstripVideoOverlay}>
                                                        <span className={styles.filmstripPlayCircle}>
                                                            <RiPlayFill />
                                                        </span>
                                                        <span className={styles.filmstripVideoTag}>
                                                            <span>{item.isAiMalayalam ? "മലയാളം" : "Video"}</span>
                                                            {item.durationFormatted && <span>{item.durationFormatted}</span>}
                                                        </span>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {voiceNoteUrl && (
                                <div className={styles.inlineVoiceNote}>
                                    {/* <div className={styles.inlineVoiceIconWrap}>
                                        <RiVolumeUpFill size={22} />
                                    </div>
                                    <div className={styles.inlineVoiceMeta}>
                                        <h4 className={styles.inlineVoiceTitle}>Owner&apos;s Audio Walkthrough</h4>
                                        <p className={styles.inlineVoiceDesc}>Listen to personal audio details about this property</p>
                                    </div> */}
                                    <div className={styles.inlineVoiceAudio}>
                                        <VoiceNotePlayer
                                            src={voiceNoteUrl}
                                            title="Owner's audio walkthrough"
                                            initialDuration={voiceNoteDuration}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Title and ID Block */}
                            <div className={styles.headerBlock}>
                                <div className={styles.titleRow}>
                                    <h1 className={styles.propertyTitle}>{title}</h1>
                                    <button
                                        type="button"
                                        className={styles.reportLink}
                                        onClick={() => setShowReportModal(true)}
                                    >
                                        <RiFlag2Line aria-hidden="true" />
                                        <span>Report this Property</span>
                                    </button>
                                </div>

                                <div className={styles.subtitleRow}>
                                    <CopyPropertyId code={propCode} className={styles.propId} />
                                    <span style={{ color: "#e2e8f0" }}>|</span>
                                    <div className={styles.locRow}>
                                        <RiMapPinLine style={{ color: "#2563eb" }} />
                                        <span>{propLocation}</span>
                                    </div>
                                    {addedDateFormatted && (
                                        <>
                                            <span style={{ color: "#e2e8f0" }}>|</span>
                                            <div className={styles.locRow} style={{ color: "#64748b" }}>
                                                <RiCalendarLine style={{ color: "#64748b" }} />
                                                <span>Listed: {addedDateFormatted}</span>
                                            </div>
                                        </>
                                    )}
                                    <span style={{ color: "#e2e8f0" }}>|</span>
                                    <div className={styles.locRow}>
                                        <RiEyeLine style={{ color: "#2563eb" }} />
                                        <span>{visitorCount ?? propertyData?.views ?? 1} Visited</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    ref={summaryTriggerRef}
                                    className={styles.aiSummaryBtn}
                                    onClick={() => setShowSummary(true)}
                                    disabled={!propertyData}
                                    aria-haspopup="dialog"
                                >
                                    <RiSparkling2Fill aria-hidden="true" />
                                    <span>AI Summary</span>
                                </button>
                                <button
                                    type="button"
                                    className={styles.reportLinkMob}
                                    onClick={() => setShowReportModal(true)}
                                >
                                    <RiFlag2Line aria-hidden="true" />
                                    <span>Report this Property</span>
                                </button>
                            </div>

                            <div className={`${styles.sidebarCard} ${styles.sidebarCardMob || ""}`}>
                                <div className={styles.priceLabelRow}>
                                    <span className={styles.priceBig}>{propPrice}</span>
                                    <span className={styles.negotiableBadge}>{isNegotiable ? "Negotiable" : "Fixed Price"}</span>
                                </div>

                                {isOwner ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                                        <Link
                                            href={`/post-property?edit=${propertyData?.id || rawId}`}
                                            className={styles.ctaBtnPrimary}
                                            style={{
                                                textDecoration: "none",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "8px",
                                                marginBottom: 0
                                            }}
                                        >
                                            <RiEditLine />
                                            <span>Edit Property Listing</span>
                                        </Link>
                                        <div style={{
                                            padding: "10px 14px",
                                            background: "#f0fdf4",
                                            border: "1px solid #bbf7d0",
                                            borderRadius: "10px",
                                            color: "#166534",
                                            fontSize: "13px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}>
                                            <RiShieldCheckLine style={{ fontSize: "18px", flexShrink: 0 }} />
                                            <span>You are viewing your own property</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.ctaBtnPrimary}
                                            onClick={handleScheduleSiteVisit}
                                        >
                                            <RiMessage3Line />
                                            <span>Schedule Site Visit</span>
                                        </button>

                                        <button
                                            type="button"
                                            className={styles.ctaBtnSecondary}
                                            onClick={() => setShowContactModal(true)}
                                        >
                                            <RiPhoneLine />
                                            <span>Contact Agent</span>
                                        </button>

                                        <button
                                            type="button"
                                            ref={compareBtnRef}
                                            className={`${styles.ctaBtnCompare} ${isComparing ? styles.ctaBtnCompareActive : ""}`}
                                            onClick={handleToggleCompare}
                                        >
                                            {isComparing ? <RiScales3Fill /> : <RiScales3Line />}
                                            <span>{isComparing ? "Added to Compare" : "Add to Compare"}</span>
                                        </button>
                                    </>
                                )}
                                <div className={styles.sharePropertyRow}>
                                    <span className={styles.shareLabel}>Share Property</span>
                                    <div className={styles.shareIconsList}>
                                        <button
                                            type="button"
                                            className={styles.shareIconBtn}
                                            onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this property on Keralaplots: ${title} - ` + window.location.href)}`, "_blank", "noopener,noreferrer")}
                                            title="Share on WhatsApp"
                                        >
                                            <RiWhatsappLine />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.shareIconBtn}
                                            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank", "noopener,noreferrer")}
                                            title="Share on Facebook"
                                        >
                                            <RiFacebookFill />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.shareIconBtn}
                                            onClick={() => window.open("https://instagram.com", "_blank", "noopener,noreferrer")}
                                            title="Share on Instagram"
                                        >
                                            <RiInstagramLine />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.shareIconBtn}
                                            onClick={copyLinkToClipboard}
                                            title="Copy Link"
                                        >
                                            <RiLink />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Specifications Row */}
                            <div className={styles.specificationsRow}>
                                {dynamicQuickSpecs.map((spec, sIdx) => {
                                    const SpecIcon = spec.Icon;
                                    return (
                                        <div key={sIdx} className={styles.specCard}>
                                            <div className={styles.specIconCircle}>
                                                <SpecIcon />
                                            </div>
                                            <div className={styles.specMeta}>
                                                <span className={styles.specLabel}>{spec.label}</span>
                                                <span className={styles.specValue}>{spec.value}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Description & Detail Tabs */}
                            <div className={styles.tabsSection}>
                                <div className={styles.tabMenu}>
                                    <button
                                        type="button"
                                        className={`${styles.tabBtn} ${activeInfoTab === "overview" ? styles.tabBtnActive : ""}`}
                                        onClick={() => setActiveInfoTab("overview")}
                                    >
                                        Overview
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tabBtn} ${activeInfoTab === "details" ? styles.tabBtnActive : ""}`}
                                        onClick={() => setActiveInfoTab("details")}
                                    >
                                        Details
                                    </button>
                                    {hasAmenitiesTab && (
                                        <button
                                            type="button"
                                            className={`${styles.tabBtn} ${activeInfoTab === "amenities" ? styles.tabBtnActive : ""}`}
                                            onClick={() => setActiveInfoTab("amenities")}
                                        >
                                            Amenities
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={`${styles.tabBtn} ${activeInfoTab === "nearby" ? styles.tabBtnActive : ""}`}
                                        onClick={() => setActiveInfoTab("nearby")}
                                    >
                                        Nearby Places
                                    </button>
                                </div>

                                {/* Dynamic Tab Body */}
                                {activeInfoTab === "overview" && (
                                    <div>


                                        <p className={styles.tabBodyText}>
                                            {propDescription}
                                        </p>

                                        {/* Bullet checks */}
                                        <div className={styles.bulletChecksGrid}>
                                            {((propertyData?.features && propertyData.features.length > 0)
                                                ? propertyData.features
                                                : [
                                                    "Prime Location",
                                                    "Vastu Compliant",
                                                    "Gated Community",
                                                    "24/7 Security",
                                                    "High-quality Construction",
                                                    "Ready to Move",
                                                ]
                                            ).map((feat, idx) => (
                                                <div key={idx} className={styles.checkItem}>
                                                    <RiCheckboxCircleLine className={styles.checkIcon} />
                                                    <span>{feat}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Property Highlights */}
                                        <h3 className={styles.sectionTitle}>Property Highlights</h3>
                                        <div className={styles.highlightsGrid}>
                                            <div className={styles.highlightCard}>
                                                <RiCompass3Line className={styles.highlightIcon} />
                                                <span className={styles.highlightText}>{propertyData?.details?.facing || "East Facing"}</span>
                                            </div>

                                            <div className={styles.highlightCard}>
                                                <RiBuilding2Line className={styles.highlightIcon} />
                                                <span className={styles.highlightText}>{propertyData?.details?.floors ? `${propertyData.details.floors} Floor(s)` : "Independent"}</span>
                                            </div>

                                            <div className={styles.highlightCard}>
                                                <RiTimeLine className={styles.highlightIcon} />
                                                <span className={styles.highlightText}>{propertyData?.details?.propertyAge || "Ready to Move"}</span>
                                            </div>

                                            <div className={styles.highlightCard}>
                                                <RiBuilding2Line className={styles.highlightIcon} />
                                                <span className={styles.highlightText}>{propertyData?.details?.furnishing || "Semi Furnished"}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeInfoTab === "details" && (
                                    <div className={styles.detailsTab}>
                                        <p className={styles.tabBodyText}>
                                            Complete verified technical details, structural specifications, and pricing break-up for this property.
                                        </p>

                                        {/* ---- Property Information ---- */}
                                        <h3 className={styles.detailsHeading}>Property Information</h3>
                                        <div className={styles.infoColumns}>
                                            {[propSpecsLeft, propSpecsRight].map((column, columnIndex) => (
                                                <dl key={columnIndex} className={styles.infoCard}>
                                                    {column.map(([label, value]) => (
                                                        <div key={label} className={styles.infoRow}>
                                                            <dt className={styles.infoLabel}>{label}</dt>
                                                            <dd className={styles.infoValue}>{value || "—"}</dd>
                                                        </div>
                                                    ))}
                                                </dl>
                                            ))}
                                        </div>

                                        {/* ---- Pricing Details ---- */}
                                        <h3 className={styles.detailsHeading}>Pricing Details</h3>
                                        <div className={styles.pricingRow}>
                                            {propPricingDetails.map(({ label, value }) => (
                                                <div key={label} className={styles.pricingCard}>
                                                    <span className={styles.pricingLabel}>{label}</span>
                                                    <span className={styles.pricingValue}>{value || "—"}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* ---- Property Features ---- */}
                                        <h3 className={styles.detailsHeading}>Property Features</h3>
                                        <ul className={styles.amenityGrid}>
                                            {((propertyData?.features && propertyData.features.length > 0)
                                                ? propertyData.features
                                                : [
                                                    "Prime Location",
                                                    "Vastu Compliant",
                                                    "Gated Community",
                                                    "24/7 Security",
                                                    "High-quality Construction",
                                                    "Ready to Move",
                                                ]
                                            ).map((feat, idx) => (
                                                <li key={idx} className={styles.featureTile}>
                                                    <RiCheckboxCircleLine className={styles.featureIcon} aria-hidden="true" />
                                                    <span className={styles.featureLabel}>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {activeInfoTab === "amenities" && hasAmenitiesTab && (
                                    <div className={styles.detailsTab}>
                                        <h3 className={styles.detailsHeading}>Amenities</h3>
                                        <p className={styles.sectionLede}>
                                            This property offers essential amenities for a comfortable and convenient lifestyle.
                                        </p>

                                        <ul className={styles.amenityGrid}>
                                            {(propAmenities.length > 0 ? propAmenities : AMENITIES.map(a => a.label)).map((item, idx) => {
                                                const label = typeof item === "string" ? item : (item.label || item.name || "Amenity");
                                                return (
                                                    <li key={idx} className={styles.featureTile}>
                                                        <RiCheckboxCircleLine className={styles.featureIcon} aria-hidden="true" />
                                                        <span className={styles.featureLabel}>{label}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}

                                {activeInfoTab === "nearby" && (
                                    <div className={styles.detailsTab}>
                                        <h3 className={styles.detailsHeading}>Nearby Places</h3>
                                        <p className={styles.sectionLede}>Everything you need, just around the corner.</p>

                                        <ul className={styles.placeGrid}>
                                            {propNearbyPlaces.map(({ Icon, name, distance }) => (
                                                <li key={name} className={styles.placeCard}>
                                                    <span className={styles.placeIcon}>
                                                        <Icon aria-hidden="true" />
                                                    </span>
                                                    <span>
                                                        <span className={styles.placeName}>{name}</span>
                                                        <span className={styles.placeDistance}>{distance}</span>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                            </div>

                            {/* District / area guide: short details + links to the district and area pages (desktop) */}
                            {propertyData && (
                                <div className={styles.desktopAreaGuide}>
                                    <PropertyAreaGuide property={propertyData} idPrefix="area-guide-desktop" />
                                </div>
                            )}

                        </div>

                        {/* ========================================== */}
                        {/* RIGHT SIDEBAR COLUMN                       */}
                        {/* ========================================== */}
                        <div className={styles.rightColumn}>

                            {/* 1. Price & CTA Actions Card */}
                            <div className={`${styles.sidebarCard} ${styles.sidebarCardDesc}`}>
                                <div className={styles.priceLabelRow}>
                                    <span className={styles.priceBig}>{propPrice}</span>
                                    <span className={styles.negotiableBadge}>{isNegotiable ? "Negotiable" : "Fixed Price"}</span>
                                </div>

                                {isOwner ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                                        <Link
                                            href={`/post-property?edit=${propertyData?.id || rawId}`}
                                            className={styles.ctaBtnPrimary}
                                            style={{
                                                textDecoration: "none",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "8px",
                                                marginBottom: 0
                                            }}
                                        >
                                            <RiEditLine />
                                            <span>Edit Property Listing</span>
                                        </Link>
                                        <div style={{
                                            padding: "10px 14px",
                                            background: "#f0fdf4",
                                            border: "1px solid #bbf7d0",
                                            borderRadius: "10px",
                                            color: "#166534",
                                            fontSize: "13px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}>
                                            <RiShieldCheckLine style={{ fontSize: "18px", flexShrink: 0 }} />
                                            <span>You are viewing your own property</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.ctaBtnPrimary}
                                            onClick={handleScheduleSiteVisit}
                                        >
                                            <RiMessage3Line />
                                            <span>Schedule Site Visit</span>
                                        </button>

                                        <button
                                            type="button"
                                            className={styles.ctaBtnSecondary}
                                            onClick={() => setShowContactModal(true)}
                                        >
                                            <RiPhoneLine />
                                            <span>Contact Agent</span>
                                        </button>

                                        <button
                                            type="button"
                                            ref={compareBtnRef}
                                            className={`${styles.ctaBtnCompare} ${isComparing ? styles.ctaBtnCompareActive : ""}`}
                                            onClick={handleToggleCompare}
                                        >
                                            {isComparing ? <RiScales3Fill /> : <RiScales3Line />}
                                            <span>{isComparing ? "Added to Compare" : "Add to Compare"}</span>
                                        </button>
                                    </>
                                )}

                                {/* Share Row */}
                                <div className={styles.sharePropertyRow}>
                                    <span className={styles.shareLabel}>Share Property</span>
                                    <div className={styles.shareIconsList}>
                                        <button
                                            type="button"
                                            className={styles.shareIconBtn}
                                            onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this property on Keralaplots: ${title} - ` + window.location.href)}`, "_blank", "noopener,noreferrer")}
                                            title="Share on WhatsApp"
                                        >
                                            <RiWhatsappLine />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.shareIconBtn}
                                            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank", "noopener,noreferrer")}
                                            title="Share on Facebook"
                                        >
                                            <RiFacebookFill />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.shareIconBtn}
                                            onClick={() => window.open("https://instagram.com", "_blank", "noopener,noreferrer")}
                                            title="Share on Instagram"
                                        >
                                            <RiInstagramLine />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.shareIconBtn}
                                            onClick={copyLinkToClipboard}
                                            title="Copy Link"
                                        >
                                            <RiLink />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Listed By Agent Profile Card */}
                            <div className={styles.sidebarCard}>
                                <h4 className={styles.agentCardTitle}>Listed By</h4>

                                <div className={styles.agentInfoProfile}>
                                    <Link
                                        href={ownerProfileUrl}
                                        style={{ textDecoration: "none", display: "inline-block", flexShrink: 0 }}
                                        title={`View ${propOwner.name || "profile"}`}
                                    >
                                        <img loading="lazy" decoding="async"
                                            src={propOwner.photo || "/logo_placeholder.png"}
                                            alt={propOwner.name}
                                            className={styles.agentAvatar}
                                            style={{ cursor: "pointer", transition: "transform 0.15s ease" }}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = "/logo_placeholder.png";
                                            }}
                                        />
                                    </Link>
                                    <div className={styles.agentIdentity}>
                                        <div className={styles.agentNameRow}>
                                            <Link href={ownerProfileUrl} style={{ textDecoration: "none", color: "inherit" }}>
                                                <span className={styles.agentName} style={{ cursor: "pointer" }}>{propOwner.name}</span>
                                            </Link>
                                            <div className={styles.verifiedBadge}>
                                                <RiVerifiedBadgeFill />
                                                {/* <span>Verified</span> */}
                                            </div>
                                        </div>
                                        <Link href={ownerProfileUrl} style={{ textDecoration: "none", color: "inherit" }}>
                                            <span className={styles.agentRole} style={{ cursor: "pointer" }}>
                                                {propOwner.role || (isOwnerAgent ? "Agent" : "User")}
                                            </span>
                                        </Link>
                                    </div>
                                </div>

                                <Link
                                    href={ownerProfileUrl}
                                    className={styles.ctaBtnSecondary}
                                    style={{
                                        marginTop: "14px",
                                        marginBottom: 0,
                                        textDecoration: "none",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    View All Properties
                                </Link>
                            </div>

                            {/* 3. Make an Offer Form Card (Only for external visitors) */}
                            {!isOwner && (
                                <div className={styles.sidebarCard}>
                                    <h4 className={styles.offerTitle}>
                                        <RiPriceTag3Line />
                                        <span>{submittedOffer && !isEditingOffer ? "Your Offer" : "Make an Offer"}</span>
                                    </h4>

                                    {submittedOffer && !isEditingOffer ? (
                                        <div className={styles.submittedOfferBox}>
                                            <div className={styles.offerAmountBox}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                                    <p className={styles.offerDesc} style={{ margin: 0 }}>You submitted an offer:</p>
                                                    <span style={{
                                                        fontSize: "12px",
                                                        fontWeight: 600,
                                                        padding: "3px 8px",
                                                        borderRadius: "999px",
                                                        textTransform: "capitalize",
                                                        background: offerDetails?.status === 'accepted' ? '#dcfce7' : (offerDetails?.status === 'rejected' ? '#fee2e2' : (offerDetails?.status === 'countered' ? '#e0e7ff' : '#fef3c7')),
                                                        color: offerDetails?.status === 'accepted' ? '#166534' : (offerDetails?.status === 'rejected' ? '#991b1b' : (offerDetails?.status === 'countered' ? '#3730a3' : '#92400e')),
                                                    }}>
                                                        {offerDetails?.status || 'Pending'}
                                                    </span>
                                                </div>
                                                <div className={styles.submittedAmount}>₹{Number(submittedOffer).toLocaleString("en-IN")}</div>
                                                {offerDetails?.counter_amount && (
                                                    <div style={{ marginTop: "8px", padding: "8px", background: "#f5f3ff", borderRadius: "8px", border: "1px solid #e0e7ff", fontSize: "13px", color: "#4338ca" }}>
                                                        <strong>Owner Counter-Offer:</strong> ₹{Number(offerDetails.counter_amount).toLocaleString("en-IN")}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                className={styles.ctaBtnPrimary}
                                                onClick={handleEditOffer}
                                                style={{ marginBottom: "12px" }}
                                            >
                                                Edit Offer
                                            </button>
                                            <p className={styles.offerHelperText}>
                                                <RiShieldCheckLine />
                                                <span>The owner has been notified of your offer.</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className={styles.offerDesc}>
                                                {isEditingOffer
                                                    ? "Modify your offer amount for the property."
                                                    : "Interested in this property? Make an offer to the owner."}
                                            </p>

                                            <form onSubmit={handleOfferSubmit}>
                                                <div className={styles.inputPrefixWrapper}>
                                                    <span className={styles.currencyPrefix}>₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Enter your offer amount"
                                                        className={styles.offerInput}
                                                        value={offerAmount}
                                                        onChange={(e) => setOfferAmount(e.target.value)}
                                                        required
                                                        disabled={isSubmittingOffer}
                                                    />
                                                </div>

                                                <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                                                    <button
                                                        type="submit"
                                                        className={styles.ctaBtnPrimary}
                                                        style={{ marginBottom: isEditingOffer ? "0px" : "12px" }}
                                                        disabled={isSubmittingOffer}
                                                    >
                                                        {isSubmittingOffer ? (
                                                            isEditingOffer ? "Updating..." : "Submitting..."
                                                        ) : (
                                                            isEditingOffer ? "Update Offer" : "Submit Offer"
                                                        )}
                                                    </button>
                                                    {isEditingOffer && (
                                                        <button
                                                            type="button"
                                                            className={styles.ctaBtnSecondary}
                                                            onClick={handleCancelEdit}
                                                            style={{ marginBottom: "12px" }}
                                                            disabled={isSubmittingOffer}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </form>

                                            {!isEditingOffer && (
                                                <p className={styles.offerHelperText}>
                                                    <RiShieldCheckLine />
                                                    <span>Your offer will be sent to the property owner for review.</span>
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* 4. Location Details Card */}
                            <div className={styles.sidebarCard}>
                                <div className={styles.mapCardTitleRow}>
                                    <h4 className={styles.mapCardTitle}>
                                        <RiMapPinLine />
                                        <span>Location / Map</span>
                                    </h4>
                                    <a
                                        href={`https://maps.google.com/maps?q=${encodeURIComponent(propLocation)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.viewMapLink}
                                    >
                                        View on Map
                                    </a>
                                </div>

                                {/* Mini Map Preview */}
                                <div className={styles.miniMapContainer}>
                                    <iframe
                                        src={mapEmbedUrl}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                    ></iframe>
                                </div>

                                <div className={styles.mapAddressRow}>
                                    <RiMapPinLine />
                                    <span>{propLocation}</span>
                                </div>

                                {/* Nearby Places stats */}
                                <div className={styles.nearbyGrid}>
                                    {propNearbyPlaces.slice(0, 4).map(({ Icon, name, distance }, idx) => (
                                        <div key={name || idx} className={styles.nearbyItem}>
                                            <Icon className={styles.nearbyIcon} />
                                            <span>{distance} to {name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* District / area guide (Mobile/Tablet <= 992px: moved under map section) */}
                            {propertyData && (
                                <div className={styles.mobileAreaGuide}>
                                    <PropertyAreaGuide property={propertyData} idPrefix="area-guide-mobile" />
                                </div>
                            )}

                        </div>

                    </div>
                </div>
            </div>

            {/* Global Success Notifications Toast */}
            {successToast && (
                <div className={styles.successAlert}>
                    <RiCheckboxCircleLine style={{ color: "#10b981", fontSize: "20px" }} />
                    <span>{successToast}</span>
                </div>
            )}

            {/* ========================================== */}
            {/* CONTACT AGENT QUICK SEND MODAL             */}
            {/* ========================================== */}
            {/* ============================ AI SUMMARY MODAL ============================ */}
            {showSummary && aiSummary && <PropertySummaryModal aiSummary={aiSummary} closeSummary={closeSummary} summaryCloseRef={summaryCloseRef} />}

            {/* ============================ REPORT LISTING MODAL ============================ */}
            {showReportModal && (
                <PropertyReportModal
                    REPORT_DETAILS_MAX={REPORT_DETAILS_MAX}
                    REPORT_REASONS={REPORT_REASONS}
                    closeReportModal={closeReportModal}
                    reportDetails={reportDetails}
                    reportReason={reportReason}
                    setReportDetails={setReportDetails}
                    setReportReason={setReportReason}
                    submitReport={submitReport}
                />
            )}

            {showContactModal && (
                <PropertyContactModal
                    agentMsg={agentMsg}
                    handleContactSubmit={handleContactSubmit}
                    isSendingMessage={isSendingMessage}
                    propOwner={propOwner}
                    propertyData={propertyData}
                    rawId={rawId}
                    setAgentMsg={setAgentMsg}
                    setShowContactModal={setShowContactModal}
                />
            )}
        </>
    );
}
