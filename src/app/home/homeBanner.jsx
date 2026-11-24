"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import styles from "./homeBanner.module.css";
import { BsStars } from "react-icons/bs";
import Link from "next/link";
import dynamic from "next/dynamic";
import { preloadWhenIdle } from "../lib/preloadWhenIdle";

/* The full-screen mobile search only appear after a click, so they load as separate
   chunks (fetched in the background once the page is idle). */
import { saveRecentSearch } from "./recentSearches";
const loadHomeMobileSearchOverlay = () => import("./HomeMobileSearchOverlay");
const HomeMobileSearchOverlay = dynamic(loadHomeMobileSearchOverlay, { ssr: false });

// Hero banner media (Cloudflare Stream video + Cloudflare Images placeholder)
const DESKTOP_BANNER_VIDEO_ID = "8d5541ef7f74eca7493d3af5c584986a";
const DESKTOP_BANNER_POSTER =
    "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/dfbc3e7b-07e9-42b5-7e40-52024acc9200/public";
const DESKTOP_BANNER_VIDEO_SRC =
    `https://iframe.videodelivery.net/${DESKTOP_BANNER_VIDEO_ID}` +
    `?autoplay=true&muted=true&loop=true&controls=false&preload=auto` +
    `&poster=${encodeURIComponent(DESKTOP_BANNER_POSTER)}`;

const MOBILE_BANNER_VIDEO_ID = "feea082b58f4362af4f2baae53d03195";
const MOBILE_BANNER_POSTER =
    "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/affeb6e1-d2fe-4e21-5c53-bc3f50579f00/public";
const MOBILE_BANNER_VIDEO_SRC =
    `https://iframe.videodelivery.net/${MOBILE_BANNER_VIDEO_ID}` +
    `?autoplay=true&muted=true&loop=true&controls=false&preload=auto` +
    `&poster=${encodeURIComponent(MOBILE_BANNER_POSTER)}`;

const subscribeMobile = (callback) => {
    const mql = window.matchMedia("(max-width: 768px)");
    if (mql.addEventListener) {
        mql.addEventListener("change", callback);
    } else {
        mql.addListener(callback);
    }
    return () => {
        if (mql.removeEventListener) {
            mql.removeEventListener("change", callback);
        } else {
            mql.removeListener(callback);
        }
    };
};
const getMobileSnapshot = () => window.matchMedia("(max-width: 768px)").matches;
const getMobileServerSnapshot = () => false;
// Searchable Dropdown Helper Component
function SearchableDropdown({ label, value, onChange, options, icon }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    // Close dropdown popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt) =>
        opt.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={styles.filterBox} ref={containerRef} onClick={() => setIsOpen(!isOpen)}>
            <div className={styles.filterIcon}>{icon}</div>
            <div className={styles.filterContent}>
                <span className={styles.filterLabel}>{label}</span>
                <span className={styles.filterSelectText}>{value || `Select ${label}`}</span>
            </div>
            <svg
                className={styles.chevronIcon}
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path d="M6 9l6 6 6-6" />
            </svg>

            {/* Searchable Options Popover */}
            {isOpen && (
                <div className={styles.dropdownPopover} onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        className={styles.dropdownSearchInput}
                        placeholder={`Search ${label}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    <div className={styles.dropdownOptionsList}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt}
                                    className={`${styles.dropdownOption} ${value === opt ? styles.dropdownOptionSelected : ""}`}
                                    onClick={() => {
                                        onChange(opt);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    <span>{opt}</span>
                                    {value === opt && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className={styles.noOptionsText}>No matching options</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function HomeBanner() {
    useEffect(() => preloadWhenIdle([loadHomeMobileSearchOverlay]), []);

    const router = useRouter();
    const [activeTab, setActiveTab] = useState("Buy");
    const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [location, setLocation] = useState("");
    const [propertyType, setPropertyType] = useState("");
    const [budget, setBudget] = useState("");
    const [pillStyle, setPillStyle] = useState({ transform: "translateX(0px)", width: "0px" });

    // Hero banner video state — the placeholder image shows until the
    // Cloudflare player reports it is actually playing.
    const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getMobileServerSnapshot);
    const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [lastMobile, setLastMobile] = useState(isMobile);
    const bannerIframeRef = useRef(null);
    const videoRevealTimer = useRef(null);

    if (lastMobile !== isMobile) {
        setLastMobile(isMobile);
        setIsVideoReady(false);
    }

    useEffect(() => {
        // Respect reduced-motion and data-saver: keep just the still image.
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const saveData = navigator.connection?.saveData;
        // Load the player only after first paint so the placeholder image
        // stays the page's LCP element and the video doesn't block it.
        let idleId;
        if (!reduceMotion && !saveData) {
            const start = () => setShouldLoadVideo(true);
            idleId = window.requestIdleCallback
                ? window.requestIdleCallback(start, { timeout: 1500 })
                : window.setTimeout(start, 300);
        }

        // Cloudflare Stream's iframe posts player events to the parent window.
        const onMessage = (e) => {
            let host = "";
            try { host = new URL(e.origin).hostname; } catch { return; }
            if (!/(videodelivery\.net|cloudflarestream\.com)$/.test(host)) return;
            let data = e.data;
            if (typeof data === "string") {
                try { data = JSON.parse(data); } catch { return; }
            }
            const evt = data?.eventName || data?.event || data?.type;
            if (evt === "playing" || evt === "play" || evt === "timeupdate") {
                clearTimeout(videoRevealTimer.current);
                setIsVideoReady(true);
            }
        };
        window.addEventListener("message", onMessage);
        return () => {
            window.removeEventListener("message", onMessage);
            clearTimeout(videoRevealTimer.current);
            if (idleId) (window.cancelIdleCallback || window.clearTimeout)(idleId);
        };
    }, []);

    // Mobile search popup — the full search card collapses into a single
    // compact bar below the mobile breakpoint; tapping it opens this
    // full-screen locality picker instead.
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [mobileLocationInput, setMobileLocationInput] = useState("");
    const [isLocating, setIsLocating] = useState(false);
    const [isMobileListening, setIsMobileListening] = useState(false);
    const [isDesktopListening, setIsDesktopListening] = useState(false);
    // Whatever the mobile flow last actually searched for — shown on the
    // compact bar afterwards instead of the rotating examples.
    const [mobileSearchLabel, setMobileSearchLabel] = useState("");

    // Rotating example searches — cycle the compact bar's placeholder text
    // (and the popup input's placeholder) every 2s so it demonstrates the
    // range of things that can be searched for, not just localities.
    const exampleSearches = [
        "New Projects in Kochi",
        "3 BHK Apartments in Kakkanad",
        "Villas for Sale in Edappally",
        "Plots in Aluva",
        "Budget Homes in Vyttila",
        "Commercial Space in Marine Drive",
    ];
    const [exampleIndex, setExampleIndex] = useState(0);

    // Rotating AI Search Placeholders (English & Malayalam)
    const aiSearchPlaceholders = [
        "Describe your dream property...",
        "നിങ്ങളുടെ പ്രോപ്പർട്ടിയെക്കുറിച്ച് ഇവിടെ വിശദമായി സംസാരിക്കാം",
    ];
    const [aiPlaceholderIndex, setAiPlaceholderIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setExampleIndex((i) => (i + 1) % exampleSearches.length);
        }, 2000);

        const aiTimer = setInterval(() => {
            setAiPlaceholderIndex((i) => (i + 1) % aiSearchPlaceholders.length);
        }, 3500);

        return () => {
            clearInterval(timer);
            clearInterval(aiTimer);
        };
    }, []);

    const tabs = ["Buy", "Rent", "Lease"];

    // Simplified 3-way segmented control shown inside the mobile popup,
    // mapped back onto the same activeTab state the desktop tabs use.
    const mobileTabs = [
        { label: "Buy", value: "Buy" },
        { label: "Rent", value: "Rent" },
        { label: "Lease", value: "Lease" },
    ];

    const popularLocalities = [
        "Kakkanad",
        "Edappally",
        "Tripunithura",
        "Marine Drive",
        "Kadavanthara",
        "Thrikkakara",
        "Aluva",
        "Vyttila",
        "Kaloor",
        "Kalamassery",
        "Palarivattom",
        "Panampilly Nagar",
    ];

    // Beyond plain localities, the mobile search understands property-shaped
    // queries too — "search anything related to properties", not just where.
    const propertySearchSuggestions = [
        "1 BHK Apartments",
        "2 BHK Apartments",
        "3 BHK Apartments",
        "Villas",
        "Independent House",
        "Plots",
        "New Projects",
        "Commercial Space",
        "Builder Floor",
        "Penthouse",
        "Budget Homes",
        "Gated Community",
    ];

    const propertyTypeOptions = [
        "Villas",
        "Apartments",
        "Plots",
        "Independent House",
        "Commercial",
        "Others",
    ];

    const locationOptions = [
        "Kochi",
        "Trivandrum",
        "Thrissur",
        "Kozhikode",
        "Kottayam",
        "Palakkad",
        "Alappuzha",
        "Kannur",
        "Kollam",
        "Malappuram",
        "Wayanad",
        "Idukki",
        "Pathanamthitta",
        "Kasaragod",
    ];

    const budgetOptions = [
        "Under 50L",
        "Under 1 Cr",
        "1 Cr - 2 Cr",
        "2 Cr+",
    ];

    const tabRefs = useRef([]);

    // Lock page scroll behind the full-screen popup, and let Escape close it.
    useEffect(() => {
        if (!mobileSearchOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e) => {
            if (e.key === "Escape") setMobileSearchOpen(false);
        };
        document.addEventListener("keydown", onKey);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKey);
        };
    }, [mobileSearchOpen]);

    // Update active tab sliding indicator position
    useEffect(() => {
        const activeIndex = tabs.indexOf(activeTab);
        const currentTab = tabRefs.current[activeIndex];
        if (currentTab) {
            setPillStyle({
                transform: `translateX(${currentTab.offsetLeft}px)`,
                width: `${currentTab.offsetWidth}px`,
            });
        }
    }, [activeTab]);

    // Build sentence ONLY when items are selected
    useEffect(() => {
        if (!location && !propertyType && !budget) {
            return;
        }

        let action = activeTab.toLowerCase();
        if (action === "quick sell") action = "sell";

        let parts = [];
        parts.push(`I want to ${action}`);

        if (propertyType) {
            let typeName = propertyType;
            if (propertyType === "Villas") typeName = "Villa";
            if (propertyType === "Apartments") typeName = "Apartment";
            if (propertyType === "Plots") typeName = "Plot";
            const article = ["Apartment"].includes(typeName) ? "an" : "a";
            parts.push(`${article} ${typeName}`);
        } else {
            parts.push("a property");
        }

        if (location) {
            parts.push(`in ${location}`);
        }

        if (budget) {
            let budgetText = budget.toLowerCase();
            if (budget === "Under 50L") budgetText = "under 50 Lakhs";
            if (budget === "Under 1 Cr") budgetText = "under 1 Cr";
            if (budget === "1 Cr - 2 Cr") budgetText = "between 1 Cr - 2 Cr";
            if (budget === "2 Cr+") budgetText = "above 2 Cr";
            parts.push(budgetText);
        }

        setSearchQuery(parts.join(" "));
    }, [activeTab, propertyType, location, budget]);

    const executeSearch = (customQuery) => {
        const queryText = customQuery !== undefined ? customQuery : searchQuery;

        let currentPurpose = null;
        let currentType = propertyType;
        let currentLocation = location;
        let currentBudget = budget;

        if (queryText && queryText.trim()) {
            const trimmed = queryText.trim();
            const lower = trimmed.toLowerCase();

            // Detect purpose from speech (e.g. "for rent", "on lease", "to buy", "for sale")
            if (/\b(rent|rental)\b/i.test(lower)) {
                currentPurpose = "rent";
            } else if (/\b(lease)\b/i.test(lower)) {
                currentPurpose = "lease";
            } else if (/\b(buy|sale|purchase)\b/i.test(lower)) {
                currentPurpose = "buy";
            } else if (hasUserSelectedTab) {
                currentPurpose = activeTab.toLowerCase();
            }

            // Detect property type from speech if not explicitly selected
            if (!currentType) {
                if (/\b(villa|villas)\b/i.test(lower)) {
                    currentType = "Villas";
                } else if (/\b(apartment|apartments|flat|flats)\b/i.test(lower)) {
                    currentType = "Apartments";
                } else if (/\b(plot|plots|land)\b/i.test(lower)) {
                    currentType = "Plots";
                } else if (/\b(house|home)\b/i.test(lower)) {
                    currentType = "Independent House";
                } else if (/\b(commercial|office|shop)\b/i.test(lower)) {
                    currentType = "Commercial";
                }
            }

            // Detect location from speech if not explicitly selected
            if (!currentLocation) {
                const matchedCity = locationOptions.find((loc) =>
                    new RegExp(`\\b${loc}\\b`, "i").test(lower)
                );
                if (matchedCity) {
                    currentLocation = matchedCity;
                } else {
                    const matchedLocality = popularLocalities.find((loc) =>
                        new RegExp(`\\b${loc}\\b`, "i").test(lower)
                    );
                    if (matchedLocality) {
                        currentLocation = matchedLocality;
                    }
                }
            }

            // Detect budget from speech if not explicitly selected
            if (!currentBudget) {
                if (/\b(under|below|less than)\s*50\s*(l|lac|lakh|lakhs)?\b/i.test(lower)) {
                    currentBudget = "Under 50L";
                } else if (/\b(under|below|less than)\s*1\s*(cr|crore|crores)?\b/i.test(lower)) {
                    currentBudget = "Under 1 Cr";
                } else if (/\b(1\s*(to|-)\s*2\s*cr|1\s*cr\s*-\s*2\s*cr)\b/i.test(lower)) {
                    currentBudget = "1 Cr - 2 Cr";
                } else if (/\b(above|over|more than)\s*2\s*cr\b/i.test(lower)) {
                    currentBudget = "2 Cr+";
                }
            }
        } else {
            // No custom query written — user used the structured dropdowns + tab
            currentPurpose = activeTab.toLowerCase();
        }

        let typeVal = null;
        if (currentType) {
            typeVal = currentType;
            if (currentType === "Villas") typeVal = "Villa";
            if (currentType === "Apartments") typeVal = "Apartment";
            if (currentType === "Plots") typeVal = "Plot";
            if (currentType === "Others") typeVal = "Other";
            if (currentType === "Independent House") typeVal = "House";
        }

        const searchPayload = {};
        if (currentPurpose) searchPayload.purpose = currentPurpose;
        if (typeVal) searchPayload.type = typeVal;
        if (currentLocation) searchPayload.location = currentLocation;
        if (currentBudget) searchPayload.budget = currentBudget;
        if (queryText && queryText.trim()) {
            const trimmed = queryText.trim();
            const lower = trimmed.toLowerCase();
            if (!lower.startsWith("i want to")) {
                searchPayload.query = trimmed;
            }
        }

        try {
            if (Object.keys(searchPayload).length > 0) {
                sessionStorage.setItem("kp_search_params", JSON.stringify(searchPayload));
            } else {
                sessionStorage.removeItem("kp_search_params");
            }
        } catch (e) {
            console.error("Failed to store search params in sessionStorage", e);
        }

        router.push("/properties");
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        executeSearch(searchQuery);
    };

    // Tapping a suggestion (a locality, a city, or a property phrase like
    // "3 BHK Apartments") runs the search immediately as a free-text query —
    // the /properties page already matches that broadly against title,
    // location and type, so this isn't limited to location names only.
    const runMobileSearch = (pickedText) => {
        const finalText = (pickedText ?? mobileLocationInput).trim();
        if (!finalText) return;

        const searchPayload = {
            query: finalText,
        };
        if (activeTab) {
            searchPayload.purpose = activeTab.toLowerCase();
        }

        saveRecentSearch(finalText);
        setMobileSearchLabel(finalText);
        setMobileSearchOpen(false);
        setMobileLocationInput("");

        try {
            sessionStorage.setItem("kp_search_params", JSON.stringify(searchPayload));
        } catch (e) {
            console.error("Failed to store search params in sessionStorage", e);
        }

        router.push("/properties");
    };

    const handleMobileLocationSubmit = (e) => {
        e.preventDefault();
        if (!mobileLocationInput.trim()) return;
        runMobileSearch(mobileLocationInput.trim());
    };

    // Reverse-geocodes the browser's GPS fix into a real locality name via the
    // same free Nominatim API the post-property location step already uses,
    // instead of just labelling the search "Current Location".
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Location access isn't available in this browser.");
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await res.json();
                    const addr = data?.address || {};
                    const resolved = addr.suburb || addr.neighbourhood || addr.town || addr.city_district || addr.city || addr.village || "Current Location";
                    runMobileSearch(resolved);
                } catch {
                    runMobileSearch("Current Location");
                } finally {
                    setIsLocating(false);
                }
            },
            () => {
                setIsLocating(false);
                alert("Couldn't access your location. Please allow location permission and try again.");
            }
        );
    };

    // Shared Web Speech API wrapper — feeds the transcript into whichever text
    // field triggered it (the mobile popup's locality input, or the desktop
    // AI search bar) and tracks a per-surface "listening" flag for the mic
    // button's active state.
    const startVoiceSearch = (onResult, setListening) => {
        const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
        if (!SpeechRecognition) {
            alert("Voice search isn't supported in this browser — try Chrome.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (e) => onResult(e.results[0][0].transcript);
        recognition.onend = () => setListening(false);
        recognition.onerror = () => setListening(false);
        setListening(true);
        recognition.start();
    };

    const handleMobileVoiceSearch = () => {
        if (isMobileListening) return;
        startVoiceSearch((text) => {
            setMobileLocationInput(text);
            setTimeout(() => {
                runMobileSearch(text);
            }, 300);
        }, setIsMobileListening);
    };

    const handleDesktopVoiceSearch = () => {
        if (isDesktopListening) return;
        startVoiceSearch((text) => {
            setSearchQuery(text);
            setTimeout(() => {
                executeSearch(text);
            }, 400);
        }, setIsDesktopListening);
    };

    // Suggestions shown under the mobile search input — localities, cities,
    // and property-shaped phrases, all live-filtered as the user types.
    // Nothing renders until there's an actual query; this isn't a static
    // "Popular Localities" browse list, it's search suggestions.
    const mobileSuggestionPool = [...popularLocalities, ...locationOptions, ...propertySearchSuggestions];
    const trimmedMobileQuery = mobileLocationInput.trim();
    const filteredSuggestions = trimmedMobileQuery
        ? mobileSuggestionPool.filter((item) =>
            item.toLowerCase().includes(trimmedMobileQuery.toLowerCase())
        )
        : [];

    return (
        <section className={styles.heroSection}>
            {/* Smooth Crossfading Background Image Layers */}
            <div className={styles.heroBannerThumbnails}>
                <div className={styles.heroBannerThumbnailsBox}>
                    {/* Placeholder — paints instantly and stays visible until the
                        video is actually playing, so there's never a blank box. */}
                    <picture className={`${styles.bannerPoster} ${isVideoReady ? styles.bannerPosterHidden : ""}`}>
                        <source media="(max-width: 768px)" srcSet={MOBILE_BANNER_POSTER} />
                        <img
                            src={DESKTOP_BANNER_POSTER}
                            alt="Kerala Plots — find your perfect property across Kerala"
                            fetchPriority="high"
                            decoding="async"
                        />
                    </picture>
                    {shouldLoadVideo && (
                        <iframe
                            key={isMobile ? "mobile-banner-video" : "desktop-banner-video"}
                            ref={bannerIframeRef}
                            src={isMobile ? MOBILE_BANNER_VIDEO_SRC : DESKTOP_BANNER_VIDEO_SRC}
                            title="Kerala Plots banner video"
                            className={`${styles.bannerVideo} ${isVideoReady ? styles.bannerVideoVisible : ""}`}
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                            loading="eager"
                            tabIndex={-1}
                            aria-hidden="true"
                            scrolling="no"
                            onLoad={() => {
                                // Fallback in case the player's "playing" event
                                // never reaches us — reveal shortly after load.
                                clearTimeout(videoRevealTimer.current);
                                videoRevealTimer.current = setTimeout(() => setIsVideoReady(true), 2500);
                            }}
                        />
                    )}
                    <div className={styles.heroBannerDetailsBox}>
                        <h1>Find Land, Homes & Everything in Between</h1>
                        <p>Buy, rent or lease verified plots, houses, villas, flats and commercial spaces across Kerala with AI-powered search.</p>
                    </div>
                </div>
            </div>
            {/* {tabs.map((tab) => (
                <div
                    key={tab}
                    className={`${styles.bgLayer} ${activeTab === tab ? styles.bgLayerActive : ""}`}
                    style={{
                        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.96) 35%, rgba(255, 255, 255, 0.4) 60%, rgba(255, 255, 255, 0.05) 100%), url('${tabBackgrounds[tab]}')`,
                    }}
                />
            ))} */}

            {/* <div className={styles.heroContentContainer}>
                <div className={styles.heroTextGroup}>
                    <h1 className={styles.heroTitle}>
                        Find Your Perfect Property<br />
                        Across Kerala's{" "}
                        <span className={styles.blueHighlight}>Most Desirable Locations</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Explore verified apartments, villas, plots, commercial spaces, and new
                        projects across Kerala. From Kochi and Trivandrum to Thrissur, Calicut,
                        and beyond, discover properties with AI-powered search.
                    </p>
                </div>
            </div> */}

            <div className={styles.cardsWrapper}>
                {/* Compact Search Bar — shown only below the mobile breakpoint,
                    replacing the full search card. Tapping it opens the
                    full-screen locality picker instead of expanding inline. */}
                <button
                    type="button"
                    className={styles.mobileSearchBar}
                    onClick={() => setMobileSearchOpen(true)}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>
                        Search{" "}
                        <strong>
                            {mobileSearchLabel || exampleSearches[exampleIndex]}
                        </strong>
                    </span>
                </button>

                {/* Left Card: Search & Filters */}
                <div className={styles.searchCard}>
                    {/* Navigation Tabs */}
                    <div className={styles.tabsRow}>
                        {/* Animated Sliding Active Pill Background */}
                        <div className={styles.activePill} style={pillStyle} />

                        {tabs.map((tab, index) => (
                            <button
                                key={tab}
                                ref={(el) => (tabRefs.current[index] = el)}
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setHasUserSelectedTab(true);
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Combined Search & Filter Box */}
                    <div className={styles.combinedFilterBox}>
                        {/* Dropdown Filters Grid */}
                        <div className={styles.filtersRow}>
                            {/* Filter 1: Property Type (Searchable) */}
                            <SearchableDropdown
                                label="Property Type"
                                value={propertyType}
                                onChange={setPropertyType}
                                options={propertyTypeOptions}
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 21h18M3 7l9-4 9 4v14H3V7z" />
                                        <path d="M9 21v-6h6v6" />
                                    </svg>
                                }
                            />

                            {/* Filter 2: Location (Searchable) */}
                            <SearchableDropdown
                                label="Location"
                                value={location}
                                onChange={setLocation}
                                options={locationOptions}
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                }
                            />

                            {/* Filter 3: Budget (Searchable) */}
                            <SearchableDropdown
                                label="Budget"
                                value={budget}
                                onChange={setBudget}
                                options={budgetOptions}
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                                        <line x1="7" y1="7" x2="7.01" y2="7" />
                                    </svg>
                                }
                            />
                        </div>

                        {/* AI Prompt Input Bar */}
                        <form onSubmit={handleSearch} className={styles.searchBarContainer}>
                            <div className={styles.sparkleIcon}>
                                {/* 4-point AI sparkle star SVG */}
                                {/* <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                                </svg> */}
                                <BsStars />
                            </div>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder={aiSearchPlaceholders[aiPlaceholderIndex]}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className={styles.searchRightActions}>
                                <button
                                    type="button"
                                    className={`${styles.micBtn} ${isDesktopListening ? styles.micBtnActive : ""}`}
                                    title={isDesktopListening ? "Listening..." : "Voice Search"}
                                    onClick={handleDesktopVoiceSearch}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" />
                                        <line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                </button>
                                <button type="submit" className={styles.searchSubmitBtn} aria-label="Search">
                                    <span className={styles.submitText}>Search</span>
                                    <span className={styles.submitIcon}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Card: Sell Or Rent CTA */}
                <div className={styles.ctaCard}>
                    <div>
                        <div className={styles.ctaHeader}>
                            <div className={styles.ctaHeaderIcon}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="10" y1="10" x2="14" y2="10" />
                                </svg>
                            </div>
                            <h3 className={styles.ctaTitle}>Sell Or Rent Your Property</h3>
                        </div>
                        <p className={styles.ctaDescription}>
                            List your property in minutes and reach thousands of verified buyers
                            and tenants across Kerala with complete transparency and expert support.
                        </p>
                    </div>
                    <Link href={"/post-property"} className={styles.ctaButton}>
                        Post Property
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* Mobile Full-Screen Locality Picker */}
            {mobileSearchOpen && (
                <HomeMobileSearchOverlay
                    activeTab={activeTab}
                    exampleIndex={exampleIndex}
                    exampleSearches={exampleSearches}
                    filteredSuggestions={filteredSuggestions}
                    handleMobileLocationSubmit={handleMobileLocationSubmit}
                    handleMobileVoiceSearch={handleMobileVoiceSearch}
                    handleUseCurrentLocation={handleUseCurrentLocation}
                    isLocating={isLocating}
                    isMobileListening={isMobileListening}
                    mobileLocationInput={mobileLocationInput}
                    mobileTabs={mobileTabs}
                    propertySearchSuggestions={propertySearchSuggestions}
                    popularLocalities={popularLocalities}
                    cityOptions={locationOptions}
                    runMobileSearch={runMobileSearch}
                    setActiveTab={setActiveTab}
                    setHasUserSelectedTab={setHasUserSelectedTab}
                    setMobileLocationInput={setMobileLocationInput}
                    setMobileSearchOpen={setMobileSearchOpen}
                    trimmedMobileQuery={trimmedMobileQuery}
                />
            )}
        </section>
    );
}
