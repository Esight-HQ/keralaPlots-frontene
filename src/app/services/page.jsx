"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./services.module.css";
import { useAuth } from "../context/AuthContext";
import { serviceProviderApi } from "../lib/api";
import {
    RiSearchLine,
    RiArrowDownSLine,
    RiCheckLine,
    RiPhoneFill,
    RiArrowRightLine,
    RiUserSettingsLine,
    RiCheckboxCircleFill,
    RiCheckboxCircleLine,
    RiShieldCheckLine,
    RiTimeLine,
    RiAlertLine,
    RiEditLine,
    RiLoader4Line,
    RiMapPin2Line,
    RiPriceTag3Line
} from "react-icons/ri";

const SERVICES_PAGE_SIZE = 12;

// "1300" / "₹1300" / 1300 -> "₹1,300"; anything non-numeric is shown as-is.
const formatRate = (value) => {
    if (value === null || value === undefined || String(value).trim() === "") return "";
    const raw = String(value).trim();
    const digits = raw.replace(/[₹,\s]/g, "");
    if (/^\d+(\.\d+)?$/.test(digits)) {
        return `₹${Number(digits).toLocaleString("en-IN")}`;
    }
    // Price range stored as "min-max" (min may be 0 for "up to")
    const range = digits.match(/^(\d+(?:\.\d+)?)(?:-|–|—|to)(\d+(?:\.\d+)?)$/i);
    if (range) {
        const [lo, hi] = [Number(range[1]), Number(range[2])];
        const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;
        if (!lo) return `Up to ${fmt(hi)}`;
        return `${fmt(lo)} – ${fmt(hi)}`;
    }
    return raw;
};

const LOCATION_OPTIONS = [
    { value: "All", label: "All Locations" },
    { value: "Kochi", label: "Kochi" },
    { value: "Ernakulam", label: "Ernakulam" },
    { value: "Thrissur", label: "Thrissur" },
    { value: "Trivandrum", label: "Trivandrum" },
    { value: "Kozhikode", label: "Kozhikode" },
    { value: "Kottayam", label: "Kottayam" },
    { value: "Palakkad", label: "Palakkad" },
    { value: "All Kerala", label: "All Kerala" }
];

const SORT_OPTIONS = [
    { value: "popular", label: "Popular" },
    { value: "name", label: "Name (A-Z)" }
];

const SEARCH_PLACEHOLDERS = [
    "Search Services...",
    "Search Architects...",
    "Search Builders...",
    "Search Interior Designers...",
    "Search Legal Consultation...",
    "Search Property Surveyors...",
    "Search Home Loan Advisors...",
];

function CustomSelect({ value, options, onChange, searchable = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selected = options.find((opt) => opt.value === value);
    const filteredOptions = searchable && search.trim()
        ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    return (
        <div className={styles.selectInputWrapper} ref={containerRef}>
            <button
                type="button"
                className={styles.selectInput}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                {selected ? selected.label : "Select"}
            </button>
            <RiArrowDownSLine
                className={styles.selectChevron}
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />

            {isOpen && (
                <div className={styles.selectPopover}>
                    {searchable && (
                        <div className={styles.selectSearchWrapper}>
                            <RiSearchLine className={styles.selectSearchIcon} />
                            <input
                                type="text"
                                className={styles.selectSearchInput}
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    )}
                    <div className={styles.selectOptionsList}>
                        {filteredOptions.length === 0 ? (
                            <div className={styles.selectNoResults}>No results found</div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    className={`${styles.selectOption} ${value === opt.value ? styles.selectOptionActive : ""}`}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    <span>{opt.label}</span>
                                    {value === opt.value && <RiCheckLine />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ServicesPage() {
    const { isAuthenticated, user, loading: authLoading } = useAuth();

    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(true);
    const [myStatus, setMyStatus] = useState({ has_applied: false, status_label: "none", service_provider: null });

    const [searchQuery, setSearchQuery] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [serviceType, setServiceType] = useState("All");
    const [location, setLocation] = useState("All");
    const [sortBy, setSortBy] = useState("popular");
    const [toastMessage, setToastMessage] = useState("");
    const [visibleCount, setVisibleCount] = useState(SERVICES_PAGE_SIZE);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [filterBarStickyTop, setFilterBarStickyTop] = useState(0);

    const providerBannerRef = useRef(null);
    const lastScrollY = useRef(0);

    // Rotate search input placeholder like homeBanner
    useEffect(() => {
        const timer = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
        }, 2500);
        return () => clearInterval(timer);
    }, []);

    // Sticky filters bar: pinned flush to the top while scrolling down (the
    // site nav has hidden itself out of the way by then), but sits below the
    // reappearing nav while scrolling up so the two don't overlap.
    useEffect(() => {
        lastScrollY.current = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const isMobile = window.innerWidth <= 480;
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setFilterBarStickyTop(0);
            } else {
                setFilterBarStickyTop(isMobile ? 55 : 75);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Fetch public services list
    useEffect(() => {
        let alive = true;
        const fetchServices = async () => {
            setLoading(true);
            try {
                const res = await serviceProviderApi.getAll();
                if (alive && res?.data) {
                    setServices(res.data);
                }
            } catch (err) {
                console.error("Failed to load services:", err);
            } finally {
                if (alive) setLoading(false);
            }
        };

        fetchServices();
        return () => { alive = false; };
    }, []);

    // Fetch current user's service provider application status
    useEffect(() => {
        let alive = true;
        if (authLoading) return;

        if (!isAuthenticated) {
            setMyStatus({ has_applied: false, status_label: "none", service_provider: null });
            setStatusLoading(false);
            return;
        }

        const fetchStatus = async () => {
            setStatusLoading(true);
            try {
                const res = await serviceProviderApi.myStatus();
                if (alive && res) {
                    setMyStatus({
                        has_applied: res.has_applied,
                        status_label: res.status_label,
                        service_provider: res.service_provider
                    });
                }
            } catch (err) {
                console.error("Failed to load service provider status:", err);
            } finally {
                if (alive) setStatusLoading(false);
            }
        };

        fetchStatus();
        return () => { alive = false; };
    }, [isAuthenticated, authLoading]);

    const clearAllFilters = () => {
        setSearchQuery("");
        setServiceType("All");
        setLocation("All");
        setSortBy("popular");
    };

    const activeServiceFilterCount =
        (serviceType !== "All" ? 1 : 0) +
        (location !== "All" ? 1 : 0) +
        (sortBy !== "popular" ? 1 : 0);

    const clearServiceFilters = () => {
        setServiceType("All");
        setLocation("All");
        setSortBy("popular");
    };

    // Extract dynamic unique service types from fetched services
    const serviceTypeOptions = useMemo(() => {
        const unique = Array.from(new Set(services.map((s) => s.role || s.service_name).filter(Boolean)));
        return [
            { value: "All", label: "All Services" },
            ...unique.map((u) => ({ value: u, label: u }))
        ];
    }, [services]);

    // Process & Filter Services List (Filter out own card for active service providers)
    const processedServices = useMemo(() => {
        let list = [...services];

        // Self-filtering: exclude own service provider card if user is logged in
        if (isAuthenticated && user) {
            const currentUserId = user.loginId || user.id;
            list = list.filter((s) => !s.user_id || Number(s.user_id) !== Number(currentUserId));
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(
                (s) => (s.name || s.full_name || "").toLowerCase().includes(query) ||
                    (s.role || s.service_name || "").toLowerCase().includes(query) ||
                    (s.place || s.service_place || "").toLowerCase().includes(query)
            );
        }

        if (serviceType !== "All") {
            list = list.filter((s) => (s.role || s.service_name) === serviceType);
        }

        if (location !== "All") {
            list = list.filter((s) => (s.place || s.service_place || "").toLowerCase().includes(location.toLowerCase()));
        }

        if (sortBy === "name") {
            list.sort((a, b) => (a.name || a.full_name || "").localeCompare(b.name || b.full_name || ""));
        }

        return list;
    }, [services, searchQuery, serviceType, location, sortBy, isAuthenticated, user]);

    const visibleServices = processedServices.slice(0, visibleCount);
    const hasMoreServices = visibleCount < processedServices.length;

    const registerHref = isAuthenticated ? "/register-service" : "/login?redirect=/register-service";

    /* ── Dynamic Status / Provider CTA Banner ── */
    const ctaBanner = authLoading || statusLoading ? null : isAuthenticated && myStatus.has_applied && myStatus.status_label === "pending" ? (
        /* PENDING STATUS BANNER */
        <div style={{
            margin: "24px 0 24px",
            padding: "28px 32px",
            borderRadius: "16px",
            background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
            border: "1.5px solid #fde68a",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
        }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", maxWidth: "680px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fef08a", color: "#b45309", display: "grid", placeItems: "center", fontSize: 24, flexShrink: 0 }}>
                    <RiTimeLine />
                </div>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#78350f", margin: 0 }}>Service Provider Application Under Review</h3>
                        <span style={{ padding: "2px 10px", borderRadius: 999, background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending</span>
                    </div>
                    <p style={{ fontSize: 14, color: "#92400e", margin: 0, lineHeight: 1.5 }}>
                        Your service provider application has been submitted and is currently being verified by KeralaPlots Admin. You will receive a notification once approved.
                    </p>
                </div>
            </div>
            <Link href="/register-service?edit=true" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 10, background: "#12296b", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                <RiEditLine /> Edit Application
            </Link>
        </div>

    ) : isAuthenticated && myStatus.has_applied && myStatus.status_label === "approved" ? (
        /* APPROVED STATUS BANNER */
        <div style={{
            margin: "24px 0 24px",
            padding: "24px 32px",
            borderRadius: "16px",
            background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
            border: "1.5px solid #bbf7d0",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#22c55e", color: "#fff", display: "grid", placeItems: "center", fontSize: 24 }}>
                    <RiShieldCheckLine />
                </div>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#14532d", margin: "0 0 2px" }}>You are an Active KeralaPlots Service Provider</h3>
                    <p style={{ fontSize: 14, color: "#166534", margin: 0 }}>Your verified service profile is active and publicly listed in the directory.</p>
                </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {myStatus?.service_provider?.id && (
                    <button
                        type="button"
                        onClick={() => {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#fff", color: "#166534", border: "1.5px solid #86efac", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                    >
                        View Public Profile
                    </button>
                )}
                <Link href="/register-service?edit=true" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#12296b", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                    <RiEditLine /> Edit Service Provider Profile
                </Link>
            </div>
        </div>

    ) : isAuthenticated && myStatus.has_applied && myStatus.status_label === "rejected" ? (
        /* REJECTED STATUS BANNER */
        <div style={{
            margin: "24px 0 24px",
            padding: "24px 32px",
            borderRadius: "16px",
            background: "#fef2f2",
            border: "1.5px solid #fecaca",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fee2e2", color: "#dc2626", display: "grid", placeItems: "center", fontSize: 24 }}>
                    <RiAlertLine />
                </div>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#991b1b", margin: "0 0 2px" }}>Service Provider Application Update</h3>
                    <p style={{ fontSize: 14, color: "#b91c1c", margin: 0 }}>
                        {myStatus.service_provider?.rejection_reason || "Your application was reviewed and could not be approved at this time. Update your details and resubmit."}
                    </p>
                </div>
            </div>
            <Link href="/register-service?edit=true" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#dc2626", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                <RiEditLine /> Update &amp; Resubmit
            </Link>
        </div>

    ) : (
        /* DEFAULT "BECOME A SERVICE PROVIDER" CTA BANNER */
        <div className={styles.providerBanner} ref={providerBannerRef}>
            <div className={styles.providerLeft}>
                <div className={styles.providerHeader}>
                    <div className={styles.providerIconBox}>
                        <RiUserSettingsLine />
                    </div>
                    <h2 className={styles.providerTitle}>
                        You can be a <br /> Service Provider
                    </h2>
                </div>
                <p className={styles.providerDesc}>
                    Grow your business by connecting with property buyers, homeowners, and investors across Kerala.
                </p>
                <Link
                    href={registerHref}
                    className={styles.providerBtn}
                    style={{ textDecoration: "none" }}
                >
                    <span>Become a Service Provider</span>
                    <RiArrowRightLine />
                </Link>
            </div>

            <div className={styles.providerChecklist}>
                <div className={styles.checklistItem}>
                    <RiCheckboxCircleLine />
                    <span>Create your profile</span>
                </div>
                <div className={styles.checklistItem}>
                    <RiCheckboxCircleLine />
                    <span>Get verified</span>
                </div>
                <div className={styles.checklistItem}>
                    <RiCheckboxCircleLine />
                    <span>Get leads &amp; grow</span>
                </div>
                <div className={styles.checklistItem}>
                    <RiCheckboxCircleLine />
                    <span>Build your reputation</span>
                </div>
            </div>

            <div className={styles.providerIllustration}>
                <img
                    src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/f0a56ee8-ebe4-483b-2e68-c61a512ff100/public"
                    alt="Service provider"
                    className={styles.providerPhoto}
                />
            </div>
        </div>
    );

    return (
        <div className={styles.servicesContainer}>
            <Nav />

            {/* Header Section */}
            <div className={styles.headerSection}>
                <div className={styles.container}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.headerTitle}>
                            Services That Simplify Your Real Estate Journey
                        </h1>
                        <p className={styles.headerSub}>
                            Connect with trusted professionals and service providers who make your property buying, selling, or construction experience smooth and hassle-free.
                        </p>
                    </div>
                    <div className={styles.headerBg} />
                </div>
            </div>

            {/* Content section */}
            <div className={styles.container}>
                {ctaBanner}

                {/* Filters */}
                <div className={styles.filtersBar} style={{ top: `${filterBarStickyTop}px` }}>
                    {/* Search — always visible, including on mobile */}
                    <div className={styles.searchWrapper}>
                        <RiSearchLine className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search services"
                        />
                    </div>

                    {/* Mobile Filter Toggle — opens the filter sidebar; hidden on desktop */}
                    <button
                        type="button"
                        className={styles.mobileFilterToggleBtn}
                        onClick={() => setIsMobileFilterOpen(true)}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filters
                        {activeServiceFilterCount > 0 && (
                            <span className={styles.filterCountBadge}>{activeServiceFilterCount}</span>
                        )}
                    </button>

                    {/* Service Type / Location / Sort — inline on desktop; on mobile these
                        same controls live in the filter sidebar below instead. */}
                    <div className={styles.inlineFilters}>
                        <div className={styles.selectGroup}>
                            <label className={styles.selectLabel}>SERVICE TYPE</label>
                            <CustomSelect
                                value={serviceType}
                                options={serviceTypeOptions}
                                onChange={setServiceType}
                                searchable={true}
                            />
                        </div>

                        <div className={styles.selectGroup}>
                            <label className={styles.selectLabel}>LOCATION</label>
                            <CustomSelect
                                value={location}
                                options={LOCATION_OPTIONS}
                                onChange={setLocation}
                                searchable={true}
                            />
                        </div>

                        <div className={styles.selectGroup}>
                            <label className={styles.selectLabel}>SORT BY</label>
                            <CustomSelect
                                value={sortBy}
                                options={SORT_OPTIONS}
                                onChange={setSortBy}
                                searchable={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Filter Sidebar */}
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

                <aside className={`${styles.filterSidebar} ${isMobileFilterOpen ? styles.filterSidebarOpen : ""}`}>
                    <div className={styles.filterSidebarHeader}>
                        <div className={styles.filterTitleGroup}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            <span>Filter</span>
                        </div>
                        <button
                            type="button"
                            className={styles.clearAllBtn}
                            onClick={clearServiceFilters}
                            disabled={activeServiceFilterCount === 0}
                        >
                            Clear All
                        </button>
                    </div>

                    <div className={styles.filterSidebarBody}>
                        <div className={styles.selectGroup}>
                            <label className={styles.selectLabel}>SERVICE TYPE</label>
                            <CustomSelect
                                value={serviceType}
                                options={serviceTypeOptions}
                                onChange={setServiceType}
                                searchable={true}
                            />
                        </div>

                        <div className={styles.selectGroup}>
                            <label className={styles.selectLabel}>LOCATION</label>
                            <CustomSelect
                                value={location}
                                options={LOCATION_OPTIONS}
                                onChange={setLocation}
                                searchable={true}
                            />
                        </div>

                        <div className={styles.selectGroup}>
                            <label className={styles.selectLabel}>SORT BY</label>
                            <CustomSelect
                                value={sortBy}
                                options={SORT_OPTIONS}
                                onChange={setSortBy}
                                searchable={false}
                            />
                        </div>
                    </div>
                </aside>

                {/* Results count */}
                {!loading && processedServices.length > 0 && (
                    <div className={styles.resultsCount}>
                        Showing {visibleServices.length} of {processedServices.length} verified services
                    </div>
                )}

                {/* Services Grid */}
                {loading ? (
                    <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>
                        <RiLoader4Line style={{ fontSize: "32px", color: "#12296b", display: "block", margin: "0 auto 12px" }} />
                        <p style={{ fontWeight: 600, margin: 0 }}>Loading verified service providers...</p>
                    </div>
                ) : processedServices.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: "#001a72", margin: "0 0 6px 0" }}>No service providers found</p>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 16px 0" }}>Try adjusting your search criteria or clear your active filters.</p>
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            style={{ padding: "10px 24px", borderRadius: "50px", background: "#001a72", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "13.5px" }}
                        >
                            Reset All Filters
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={styles.servicesGrid}>
                            {visibleServices.map((service) => {
                                const avatar = service.avatar || service.photo || "/logo_placeholder.png";
                                const name = service.name || service.full_name || "Service Provider";
                                const role = service.role || service.service_name || "Professional";
                                const phone = service.phone ? String(service.phone).trim() : "";
                                const tel = phone.replace(/\s+/g, "");
                                const rate = formatRate(service.rate || service.starting_price);
                                const place = String(service.place || service.service_place || "").trim() || "Kerala";

                                return (
                                    <article key={service.id} className={styles.serviceCard}>
                                        <div className={styles.cardHead}>
                                            <img
                                                src={avatar}
                                                alt={name}
                                                loading="lazy"
                                                decoding="async"
                                                className={styles.serviceAvatar}
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = "/logo_placeholder.png";
                                                }}
                                            />
                                            <div className={styles.cardHeadText}>
                                                <h3 className={styles.serviceName} title={name}>{name}</h3>
                                                <span className={styles.serviceRole} title={role}>{role}</span>
                                            </div>
                                        </div>

                                        <ul className={styles.metaList}>
                                            <li className={styles.metaItem}>
                                                <span className={styles.metaIcon} aria-hidden="true"><RiMapPin2Line /></span>
                                                <span className={styles.metaText}>
                                                    <span className={styles.metaLabel}>Service area</span>
                                                    <span className={styles.metaValue} title={place}>{place}</span>
                                                </span>
                                            </li>
                                            <li className={styles.metaItem}>
                                                <span className={styles.metaIcon} aria-hidden="true"><RiPriceTag3Line /></span>
                                                <span className={styles.metaText}>
                                                    <span className={styles.metaLabel}>Starting rate</span>
                                                    {rate ? (
                                                        <span className={`${styles.metaValue} ${styles.metaPrice}`}>{rate}</span>
                                                    ) : (
                                                        <span className={`${styles.metaValue} ${styles.metaMuted}`}>Price on request</span>
                                                    )}
                                                </span>
                                            </li>
                                            {phone && (
                                                <li className={styles.metaItem}>
                                                    <span className={styles.metaIcon} aria-hidden="true"><RiPhoneFill /></span>
                                                    <span className={styles.metaText}>
                                                        <span className={styles.metaLabel}>Phone</span>
                                                        <a href={`tel:${tel}`} className={`${styles.metaValue} ${styles.metaLink}`} suppressHydrationWarning>
                                                            {phone}
                                                        </a>
                                                    </span>
                                                </li>
                                            )}
                                        </ul>

                                        {phone ? (
                                            <a
                                                href={`tel:${tel}`}
                                                className={styles.serviceCallBtn}
                                                aria-label={`Call ${name}`}
                                                suppressHydrationWarning
                                            >
                                                <RiPhoneFill />
                                                Call Now
                                            </a>
                                        ) : (
                                            <span className={`${styles.serviceCallBtn} ${styles.serviceCallBtnDisabled}`} aria-disabled="true">
                                                <RiPhoneFill />
                                                Phone not available
                                            </span>
                                        )}
                                    </article>
                                );
                            })}
                        </div>

                        {hasMoreServices && (
                            <div className={styles.loadMoreWrapper}>
                                <button
                                    type="button"
                                    className={styles.loadMoreBtn}
                                    onClick={() => setVisibleCount((prev) => prev + SERVICES_PAGE_SIZE)}
                                >
                                    <span>Load More Services</span>
                                    <RiArrowDownSLine />
                                </button>
                            </div>
                        )}
                    </>
                )}

            </div>

            {toastMessage && (
                <div className={styles.toast}>
                    <RiCheckboxCircleFill className={styles.toastIcon} />
                    <span>{toastMessage}</span>
                </div>
            )}

            <Footer />
        </div>
    );
}
