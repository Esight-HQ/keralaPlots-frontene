"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Nav from "../componants/nav/nav";
import styles from "./agents.module.css";
import NoAgents from "./noAgents";
import Footer from "../componants/footer/footer";
import { useAuth } from "../context/AuthContext";
import { agentApi } from "../lib/api";
import {
    RiSearchLine,
    RiMapPinLine,
    RiBriefcaseLine,
    RiBuilding2Line,
    RiArrowRightLine,
    RiArrowDownSLine,
    RiStarFill,
    RiUserAddLine,
    RiShieldCheckLine,
    RiFundsLine,
    RiAwardLine,
    RiTeamLine,
    RiCheckLine,
    RiTimeLine,
    RiEditLine,
    RiAlertLine,
    RiLoader4Line,
    RiWhatsappLine,
    RiVerifiedBadgeFill,
} from "react-icons/ri";

/* ─── Custom dropdown (preserved from original) ─── */
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
                                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(""); }}
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

/* ─── Static data ─── */
const LOCATION_OPTIONS = [
    { value: "All", label: "All Locations" },
    { value: "Kochi", label: "Kochi" },
    { value: "Trivandrum", label: "Trivandrum" },
    { value: "Thrissur", label: "Thrissur" },
    { value: "Kozhikode", label: "Kozhikode" },
    { value: "Kottayam", label: "Kottayam" },
    { value: "Palakkad", label: "Palakkad" },
    { value: "Alappuzha", label: "Alappuzha" },
    { value: "Kannur", label: "Kannur" },
    { value: "Kollam", label: "Kollam" },
    { value: "Malappuram", label: "Malappuram" },
    { value: "Wayanad", label: "Wayanad" },
    { value: "Idukki", label: "Idukki" },
    { value: "Pathanamthitta", label: "Pathanamthitta" },
    { value: "Kasaragod", label: "Kasaragod" },
];

const SPECIALIZATION_OPTIONS = [
    { value: "All", label: "All Types" },
    { value: "Villa", label: "Villas & Luxury Homes" },
    { value: "Apartment", label: "Apartments & Flats" },
    { value: "Plot", label: "Plots & Land" },
    { value: "Commercial", label: "Commercial Properties" },
    { value: "Property", label: "Residential Specialist" },
];

const SORT_OPTIONS = [
    { value: "rating", label: "Top Rated" },
    { value: "experience", label: "Most Experienced" },
];

const AGENT_BENEFITS = [
    { Icon: RiUserAddLine, title: "Grow Your Business", desc: "Expand your reach and connect with serious property buyers." },
    { Icon: RiShieldCheckLine, title: "Get Verified", desc: "Build trust with our verified agent verification process." },
    { Icon: RiFundsLine, title: "Get Leads & Grow", desc: "Receive quality leads and grow your real estate business." },
    { Icon: RiAwardLine, title: "Build Your Reputation", desc: "Showcase your expertise and build a strong professional brand." },
];

const AGENTS_PAGE_SIZE = 8;

/* ─── Main Page ─── */
export default function Page() {
    const { isAuthenticated, user, loading: authLoading } = useAuth();

    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [agentStatusLoading, setAgentStatusLoading] = useState(true);
    const [myAgentStatus, setMyAgentStatus] = useState({ has_applied: false, status: "none", agent: null });

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("All");
    const [selectedSpec, setSelectedSpec] = useState("All");
    const [selectedSort, setSelectedSort] = useState("rating");
    const [visibleCount, setVisibleCount] = useState(AGENTS_PAGE_SIZE);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [filterBarStickyTop, setFilterBarStickyTop] = useState(0);

    const resultsRef = useRef(null);
    const lastScrollY = useRef(0);

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

    /* Load public agents list */
    useEffect(() => {
        let alive = true;
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await agentApi.list({ limit: 50 });
                if (alive && res?.data) setAgents(res.data);
            } catch (err) {
                console.error("Failed to load agents:", err);
            } finally {
                if (alive) setLoading(false);
            }
        };
        loadData();
        return () => { alive = false; };
    }, []);

    /* Check current user's agent application status */
    useEffect(() => {
        let alive = true;
        if (authLoading) return;

        if (!isAuthenticated) {
            setMyAgentStatus({ has_applied: false, status: "none", agent: null });
            setAgentStatusLoading(false);
            return;
        }

        const checkStatus = async () => {
            setAgentStatusLoading(true);
            try {
                const statusRes = await agentApi.myStatus();
                if (alive && statusRes) setMyAgentStatus(statusRes);
            } catch (err) {
                console.error("Failed to check agent status:", err);
            } finally {
                if (alive) setAgentStatusLoading(false);
            }
        };

        checkStatus();
        return () => { alive = false; };
    }, [isAuthenticated, authLoading]);

    const resetFilters = () => {
        setSearchQuery("");
        setSelectedLocation("All");
        setSelectedSpec("All");
        setSelectedSort("rating");
        setVisibleCount(AGENTS_PAGE_SIZE);
    };

    const activeAgentFilterCount =
        (selectedLocation !== "All" ? 1 : 0) +
        (selectedSpec !== "All" ? 1 : 0) +
        (selectedSort !== "rating" ? 1 : 0);

    const clearAgentFilters = () => {
        setSelectedLocation("All");
        setSelectedSpec("All");
        setSelectedSort("rating");
    };

    const browseAllAgents = () => {
        resetFilters();
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    /* Filter + sort */
    const processedAgents = useMemo(() => {
        let list = [...agents];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((a) =>
                a.name?.toLowerCase().includes(q) ||
                a.designation?.toLowerCase().includes(q) ||
                a.location?.toLowerCase().includes(q) ||
                a.place?.toLowerCase().includes(q)
            );
        }
        if (selectedLocation !== "All") {
            list = list.filter((a) =>
                a.place?.toLowerCase().includes(selectedLocation.toLowerCase()) ||
                a.location?.toLowerCase().includes(selectedLocation.toLowerCase())
            );
        }
        if (selectedSpec !== "All") {
            list = list.filter((a) =>
                a.designation?.toLowerCase().includes(selectedSpec.toLowerCase())
            );
        }
        if (selectedSort === "rating") list.sort((a, b) => (b.rating || 5) - (a.rating || 5));

        // When logged in as an agent, exclude own profile from the public directory list (handled by banner)
        if (isAuthenticated && (myAgentStatus?.agent?.id || user?.loginId || user?.id)) {
            const myId = myAgentStatus?.agent?.id;
            const myLoginId = user?.loginId || user?.id;
            list = list.filter((a) => (myId ? a.id !== myId : true) && (myLoginId ? a.login_id !== myLoginId : true));
        }

        return list;
    }, [agents, searchQuery, selectedLocation, selectedSpec, selectedSort, isAuthenticated, myAgentStatus, user]);

    useEffect(() => { setVisibleCount(AGENTS_PAGE_SIZE); }, [searchQuery, selectedLocation, selectedSpec, selectedSort]);

    const visibleAgents = processedAgents.slice(0, visibleCount);
    const hasMoreAgents = visibleCount < processedAgents.length;

    const { has_applied, status: agentStatus, agent: myAgent } = myAgentStatus;

    /* ── Dynamic Agent Status / CTA panel ── */
    const ctaPanel = authLoading || agentStatusLoading ? null : isAuthenticated && has_applied && agentStatus === "pending" ? (
        /* PENDING — hide apply card, show status banner */
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
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#78350f", margin: 0 }}>Agent Application Under Review</h3>
                        <span style={{ padding: "2px 10px", borderRadius: 999, background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending</span>
                    </div>
                    <p style={{ fontSize: 14, color: "#92400e", margin: 0, lineHeight: 1.5 }}>
                        Your agent profile has been submitted and is currently being verified by KeralaPlots Admin. You will receive a notification once approved.
                    </p>
                </div>
            </div>
            <Link href="/register-agent?edit=true" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 10, background: "#12296b", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                <RiEditLine /> Edit Application
            </Link>
        </div>

    ) : isAuthenticated && has_applied && agentStatus === "approved" ? (
        /* APPROVED — hide apply card, show active badge */
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
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#14532d", margin: "0 0 2px" }}>You are an Active KeralaPlots Agent</h3>
                    <p style={{ fontSize: 14, color: "#166534", margin: 0 }}>Your verified agent profile is active and publicly listed in the directory.</p>
                </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
                {myAgent?.id && (
                    <Link href={`/agent/${myAgent.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#fff", color: "#166534", border: "1.5px solid #86efac", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                        View Public Profile
                    </Link>
                )}
                <Link href="/register-agent?edit=true" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#12296b", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                    <RiEditLine /> Edit Agent Profile
                </Link>
            </div>
        </div>

    ) : isAuthenticated && has_applied && agentStatus === "rejected" ? (
        /* REJECTED — notice with resubmit */
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
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#991b1b", margin: "0 0 2px" }}>Agent Application Update</h3>
                    <p style={{ fontSize: 14, color: "#b91c1c", margin: 0 }}>
                        {myAgent?.rejection_reason || "Your application was reviewed and could not be approved at this time. Update your details and resubmit."}
                    </p>
                </div>
            </div>
            <Link href="/register-agent?edit=true" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#dc2626", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                <RiEditLine /> Update &amp; Resubmit
            </Link>
        </div>

    ) : (
        /* DEFAULT — standard join panel for guests + users who haven't applied */
        <section className={styles.joinPanel}>
            <div className={styles.joinLeft}>
                <div className={styles.joinIconBox}>
                    <RiTeamLine aria-hidden="true" />
                </div>
                <div className={styles.joinTitleBox}>
                    <h2 className={styles.joinTitle}>Looking to Join Our Agent Network?</h2>
                    <Link
                        href={isAuthenticated ? "/register-agent" : "/login?redirect=/register-agent"}
                        className={styles.applyBtn}
                    >
                        <span>Apply as Agent</span>
                        <RiArrowRightLine aria-hidden="true" />
                    </Link>
                </div>
            </div>
            <ul className={styles.benefitsRow}>
                {AGENT_BENEFITS.map(({ Icon, title, desc }) => (
                    <li key={title} className={styles.benefitItem}>
                        <span className={styles.benefitIconBox}><Icon aria-hidden="true" /></span>
                        <h3 className={styles.benefitTitle}>{title}</h3>
                        <p className={styles.benefitDesc}>{desc}</p>
                    </li>
                ))}
            </ul>
        </section>
    );

    return (
        <>
            <Nav />
            <div className={styles.agentsContainer}>

                {/* ── Header ── */}
                <div className={styles.headerSection}>
                    <div className={styles.container}>
                        <div className={styles.headerContent}>
                            <h1 className={styles.headerTitle}>Our Trusted Agents</h1>
                            <p className={styles.headerSub}>
                                Meet our experienced and verified real estate professionals who are dedicated to
                                helping you find the perfect property in Kerala.
                            </p>
                        </div>
                    </div>
                    <div className={styles.headerBg} />
                </div>

                {/* ── Filter bar ── */}
                <div className={styles.container}>
                    {ctaPanel}

                    <div className={styles.filtersBar} style={{ top: `${filterBarStickyTop}px` }}>
                        {/* Search — always visible, including on mobile */}
                        <div className={styles.searchWrapper}>
                            <RiSearchLine className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search agents by name or location..."
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
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
                            {activeAgentFilterCount > 0 && (
                                <span className={styles.filterCountBadge}>{activeAgentFilterCount}</span>
                            )}
                        </button>

                        {/* Location / Specialization / Sort — inline on desktop; on mobile these
                            same controls live in the filter sidebar below instead. */}
                        <div className={styles.inlineFilters}>
                            <div className={styles.selectGroup}>
                                <span className={styles.selectLabel}>Location</span>
                                <CustomSelect
                                    value={selectedLocation}
                                    options={LOCATION_OPTIONS}
                                    onChange={(v) => { setSelectedLocation(v); }}
                                    searchable
                                />
                            </div>

                            <div className={styles.selectGroup}>
                                <span className={styles.selectLabel}>Specialization</span>
                                <CustomSelect
                                    value={selectedSpec}
                                    options={SPECIALIZATION_OPTIONS}
                                    onChange={(v) => { setSelectedSpec(v); }}
                                />
                            </div>

                            <div className={styles.selectGroup}>
                                <span className={styles.selectLabel}>Sort By</span>
                                <CustomSelect
                                    value={selectedSort}
                                    options={SORT_OPTIONS}
                                    onChange={(v) => { setSelectedSort(v); }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Mobile Filter Sidebar ── */}
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
                                onClick={clearAgentFilters}
                                disabled={activeAgentFilterCount === 0}
                            >
                                Clear All
                            </button>
                        </div>

                        <div className={styles.filterSidebarBody}>
                            <div className={styles.selectGroup}>
                                <span className={styles.selectLabel}>Location</span>
                                <CustomSelect
                                    value={selectedLocation}
                                    options={LOCATION_OPTIONS}
                                    onChange={(v) => { setSelectedLocation(v); }}
                                    searchable
                                />
                            </div>

                            <div className={styles.selectGroup}>
                                <span className={styles.selectLabel}>Specialization</span>
                                <CustomSelect
                                    value={selectedSpec}
                                    options={SPECIALIZATION_OPTIONS}
                                    onChange={(v) => { setSelectedSpec(v); }}
                                />
                            </div>

                            <div className={styles.selectGroup}>
                                <span className={styles.selectLabel}>Sort By</span>
                                <CustomSelect
                                    value={selectedSort}
                                    options={SORT_OPTIONS}
                                    onChange={(v) => { setSelectedSort(v); }}
                                />
                            </div>
                        </div>
                    </aside>

                    {/* ── Results ── */}
                    <div ref={resultsRef}>
                        {loading ? (
                            <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>
                                <RiLoader4Line style={{ fontSize: "32px", color: "#12296b", display: "block", margin: "0 auto 12px" }} />
                                <p style={{ fontWeight: 600, margin: 0 }}>Loading verified agents...</p>
                            </div>
                        ) : processedAgents.length === 0 ? (
                            <NoAgents
                                isAgent={isAuthenticated && has_applied && agentStatus === "approved"}
                                isAuthenticated={isAuthenticated}
                                isSearching={Boolean(searchQuery.trim() || selectedLocation !== "All" || selectedSpec !== "All")}
                                onBrowseAll={browseAllAgents}
                            />
                        ) : (
                            <>
                                <div className={styles.agentsGrid}>
                                    {visibleAgents.map((agent) => {
                                        const phone = String(agent.phone || agent.phn_no || "").replace(/\D/g, "");
                                        const expRaw = String(agent.experience || (agent.experience_years ? `${agent.experience_years}+ Years` : "5+ Years"))
                                            .replace(/\s*experience/gi, "")
                                            .trim();
                                        const experience = /year/i.test(expRaw) ? expRaw : `${expRaw} Years`;
                                        const spec = agent.designation || agent.specialization || "Property Advisor";
                                        return (
                                            <article key={agent.id} className={styles.agentCard}>
                                                <div className={styles.cardBanner}>
                                                    <span className={styles.bannerPattern} aria-hidden="true" />
                                                    <span className={styles.ratingBadge} title={`Rated ${agent.rating || "5.0"}`}>
                                                        <RiStarFill aria-hidden="true" />
                                                        <span>{agent.rating ? Number(agent.rating).toFixed(1) : "5.0"}</span>
                                                    </span>
                                                </div>

                                                <div className={styles.cardBody}>
                                                    <div className={styles.avatarContainer}>
                                                        <div className={styles.avatarRing}>
                                                            <img
                                                                loading="lazy"
                                                                decoding="async"
                                                                src={agent.photo || agent.avatar || "/logo_placeholder.png"}
                                                                alt={agent.name}
                                                                className={styles.avatarImg}
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = "/logo_placeholder.png";
                                                                }}
                                                            />
                                                        </div>
                                                        <span className={styles.verifiedTick} title="Verified Agent" aria-label="Verified Agent">
                                                            <RiVerifiedBadgeFill aria-hidden="true" />
                                                        </span>
                                                    </div>

                                                    <h3 className={styles.agentName} title={agent.name}>
                                                        <Link href={`/agent/${agent.id}`} className={styles.cardLink}>
                                                            {agent.name}
                                                        </Link>
                                                    </h3>
                                                    <p className={styles.agentSpec} title={spec}>{spec}</p>
                                                    <span className={styles.locationPill} title={agent.place || agent.location || "Kerala"}>
                                                        <RiMapPinLine aria-hidden="true" />
                                                        <span>{agent.place || agent.location || "Kerala"}</span>
                                                    </span>

                                                    <div className={styles.agentDetails}>
                                                        <div className={styles.detailRow}>
                                                            <span className={styles.detailIcon} aria-hidden="true"><RiAwardLine /></span>
                                                            <div className={styles.detailText}>
                                                                <span className={styles.detailVal}>{experience}</span>
                                                                <span className={styles.detailLbl}>Experience</span>
                                                            </div>
                                                        </div>
                                                        <span className={styles.detailDivider} aria-hidden="true" />
                                                        <div className={styles.detailRow}>
                                                            <span className={styles.detailIcon} aria-hidden="true"><RiBuilding2Line /></span>
                                                            <div className={styles.detailText}>
                                                                <span className={styles.detailVal}>{agent.properties_sold || "50+"}</span>
                                                                <span className={styles.detailLbl}>Properties Sold</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={styles.cardActions}>
                                                        <Link href={`/agent/${agent.id}`} className={styles.viewProfileBtn} aria-label={`View profile of ${agent.name}`}>
                                                            <span>View Profile</span>
                                                            <RiArrowRightLine className={styles.btnArrow} aria-hidden="true" />
                                                        </Link>
                                                        {phone && (
                                                            <a
                                                                href={`https://wa.me/${phone}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={styles.whatsappBtn}
                                                                title="Chat on WhatsApp"
                                                                aria-label={`Chat with ${agent.name} on WhatsApp`}
                                                            >
                                                                <RiWhatsappLine aria-hidden="true" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>

                                {hasMoreAgents && (
                                    <div className={styles.loadMoreWrapper}>
                                        <span className={styles.loadMoreCount}>
                                            Showing {visibleAgents.length} of {processedAgents.length} agents
                                        </span>
                                        <button
                                            type="button"
                                            className={styles.loadMoreBtn}
                                            onClick={() => setVisibleCount((c) => c + AGENTS_PAGE_SIZE)}
                                        >
                                            <span>Load More Agents</span>
                                            <RiArrowDownSLine />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
