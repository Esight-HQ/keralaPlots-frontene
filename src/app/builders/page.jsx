"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./builders.module.css";
import { useAuth } from "../context/AuthContext";
import { builderApi } from "../lib/api";
import { BUILDERS as LOCAL_BUILDERS } from "./buildersData";
import {
    RiSearchLine,
    RiMapPin2Line,
    RiPriceTag3Line,
    RiCalendarLine,
    RiHomeSmileLine,
    RiPhoneFill,
    RiWhatsappLine,
    RiShieldCheckLine,
    RiArrowRightLine,
    RiArrowDownSLine,
    RiCloseLine,
    RiBuilding2Line,
    RiCheckboxCircleLine,
    RiRefreshLine,
    RiLayoutGridLine,
    RiListUnordered,
    RiVerifiedBadgeFill,
    RiEditLine,
    RiTimeLine,
    RiCloseCircleLine,
    RiErrorWarningLine,
} from "react-icons/ri";
import { setBuilderStatus } from "../lib/builderStatus";
import Image from "next/image";
const PAGE_SIZE = 12;
const VIEW_STORAGE_KEY = "kp_builders_view";
const LOGO_COLORS = ["#12296b", "#6d53fd", "#0f766e", "#b45309", "#be123c", "#1d4ed8", "#7c3aed", "#047857"];
const HERO_IMAGE =
    "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/46b1a454-68e6-4059-ed66-c924c07ccd00/public";

/* Kerala's 14 districts with other names / major towns listings may use.
   Kept local (instead of lib/keralaDistricts) so this client page doesn't
   ship the district SEO copy in its bundle. */
const KERALA_DISTRICTS = [
    { slug: "thiruvananthapuram", name: "Thiruvananthapuram", terms: ["trivandrum", "tvm", "kazhakkoottam", "technopark", "neyyattinkara", "attingal", "varkala", "kovalam"] },
    { slug: "kollam", name: "Kollam", terms: ["quilon", "karunagappally", "kottarakkara", "punalur"] },
    { slug: "pathanamthitta", name: "Pathanamthitta", terms: ["thiruvalla", "adoor", "ranni"] },
    { slug: "alappuzha", name: "Alappuzha", terms: ["alleppey", "cherthala", "kayamkulam", "haripad", "chengannur"] },
    { slug: "kottayam", name: "Kottayam", terms: ["pala", "changanassery", "ettumanoor", "vaikom"] },
    { slug: "idukki", name: "Idukki", terms: ["thodupuzha", "munnar", "kattappana", "adimali"] },
    { slug: "ernakulam", name: "Ernakulam", terms: ["kochi", "cochin", "ekm", "kakkanad", "edappally", "vyttila", "kaloor", "aluva", "tripunithura", "angamaly", "kalamassery", "perumbavoor", "muvattupuzha"] },
    { slug: "thrissur", name: "Thrissur", terms: ["trichur", "chalakudy", "guruvayur", "kodungallur", "irinjalakuda"] },
    { slug: "palakkad", name: "Palakkad", terms: ["palghat", "ottapalam", "shoranur", "mannarkkad"] },
    { slug: "malappuram", name: "Malappuram", terms: ["manjeri", "perinthalmanna", "tirur", "kottakkal", "nilambur"] },
    { slug: "kozhikode", name: "Kozhikode", terms: ["calicut", "vadakara", "koyilandy", "ramanattukara"] },
    { slug: "wayanad", name: "Wayanad", terms: ["kalpetta", "sulthan bathery", "mananthavady"] },
    { slug: "kannur", name: "Kannur", terms: ["cannanore", "thalassery", "payyanur", "taliparamba"] },
    { slug: "kasaragod", name: "Kasaragod", terms: ["kasargod", "kanhangad", "nileshwar"] },
];

const SORT_OPTIONS = [
    { value: "popular", label: "Most popular" },
    { value: "name", label: "Name (A–Z)" },
    { value: "projects", label: "Most projects" },
    { value: "experience", label: "Most experienced" },
];

const getName = (b) => String(b.name || b.full_name || "").trim() || "Builder";
const getRole = (b) => String(b.role || b.service_name || "").trim() || "Builder";
const getPlace = (b) => String(b.place || b.service_place || "").trim();
const getPhone = (b) => (b.phone ? String(b.phone).trim() : "");

/* API builders → the same shape as buildersData.js entries. */
const fromApi = (s) => ({
    id: s.id || `api-${getName(s)}`,
    builder_id: s.builder_id || s.id,
    website_id: s.website_id,
    name: getName(s),
    slug: s.slug || (getName(s) ? getName(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : String(s.id)),
    role: getRole(s),
    place: getPlace(s) || "Kerala",
    district: s.district || "",
    locality: s.locality || "",
    user_id: s.user_id || s.created_by || null,
    created_by: s.created_by || s.user_id || null,
    company_name: s.company_name || s.name || "",
    phone: getPhone(s),
    email: s.email || "",
    logo: s.logo || s.avatar || s.photo || "",
    cover: s.cover || s.cover_image || s.banner || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80",
    rate: s.rate || s.starting_price || "",
    since: s.since || s.established_year || null,
    years: s.years || (s.since ? Math.max(1, new Date().getFullYear() - Number(s.since)) : null),
    projects: s.projects !== undefined && s.projects !== null ? Number(s.projects) : null,
    verified: s.verified !== false,
    website_url: s.website_url || "",
    template: s.template || "corporate",
});

const initialsOf = (name) =>
    name
        .replace(/[^A-Za-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w && !/^(and|of|the|&)$/i.test(w))
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("") || "B";

const colorFor = (name) => {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return LOGO_COLORS[h % LOGO_COLORS.length];
};

const currentYear = new Date().getFullYear();

const rateNumber = (value) => {
    const digits = String(value ?? "").replace(/[₹,\s]/g, "");
    return /^\d+(\.\d+)?$/.test(digits) ? Number(digits) : null;
};

const formatRate = (value) => {
    if (value === null || value === undefined || String(value).trim() === "") return "";
    const n = rateNumber(value);
    return n === null ? String(value).trim() : `₹${n.toLocaleString("en-IN")}`;
};

/* Search terms that identify a district: its name, other names and major towns. */
const DISTRICT_TERMS = Object.fromEntries(
    KERALA_DISTRICTS.map((d) => [d.slug, [d.name.toLowerCase(), ...d.terms]])
);

const matchesDistrict = (place, slug) => {
    const text = place.toLowerCase();
    if (!text) return false;
    if (text.includes("all kerala")) return true;
    return (DISTRICT_TERMS[slug] || []).some((term) => text.includes(term));
};

const toWhatsApp = (phone) => {
    let digits = phone.replace(/\D/g, "");
    if (digits.length === 10) digits = `91${digits}`;
    return digits.length >= 11 ? `https://wa.me/${digits}` : "";
};

function BuilderLogo({ name, logo }) {
    const [failed, setFailed] = useState(false);
    if (logo && !failed) {
        return (
            <span className={styles.logo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt={`${name} logo`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
            </span>
        );
    }
    return (
        <span className={`${styles.logo} ${styles.logoInitials}`} style={{ background: colorFor(name) }} aria-hidden="true">
            {initialsOf(name)}
        </span>
    );
}

function BuilderCard({ builder, view = "grid", isOwn = false }) {
    const [coverFailed, setCoverFailed] = useState(false);
    const name = getName(builder);
    const role = getRole(builder);
    const place = getPlace(builder) || "Kerala";
    const phone = getPhone(builder);
    const tel = phone.replace(/\s+/g, "");
    const whatsapp = phone ? toWhatsApp(phone) : "";
    const rate = formatRate(builder.rate);
    const years = builder.years || (builder.since ? Math.max(1, currentYear - Number(builder.since)) : null);
    const slug = builder.slug || (name
        ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
        : (builder.id || "my-builder-page"));
    const detailHref = `/builders/${slug}`;

    return (
        <Link
            href={detailHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.card} ${view === "list" ? styles.cardRow : ""}`}
            aria-label={`View details of ${name}`}
        >
            <div className={styles.cover}>
                {builder.cover && !coverFailed ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={builder.cover}
                        alt={`Project by ${name}`}
                        loading="lazy"
                        decoding="async"
                        onError={() => setCoverFailed(true)}
                    />
                ) : (
                    <span className={styles.coverFallback} aria-hidden="true"><RiBuilding2Line /></span>
                )}
                {isOwn && (
                    <span className={styles.ownBadge} title="Your official builder profile">
                        <RiShieldCheckLine aria-hidden="true" /> Own
                    </span>
                )}
                {builder.verified && (
                    <span className={styles.verified} title="Verified by KeralaPlots">
                        <RiVerifiedBadgeFill aria-hidden="true" /> Verified
                    </span>
                )}
                <BuilderLogo name={name} logo={builder.logo} />
            </div>

            <div className={styles.cardBody}>

                <h3 className={styles.cardName} title={name}>{name}</h3>
                <span className={styles.cardRole} title={role}>{role}</span>

                <p className={styles.cardPlace} title={place}>
                    <RiMapPin2Line aria-hidden="true" />
                    <span>{place}</span>
                </p>

                {(years || builder.projects || rate) && (
                    <ul className={styles.stats}>
                        {years && (
                            <li><RiCalendarLine aria-hidden="true" /> {years}+ yrs</li>
                        )}
                        {builder.projects ? (
                            <li><RiHomeSmileLine aria-hidden="true" /> {builder.projects} projects</li>
                        ) : null}
                        {rate && (
                            <li><RiPriceTag3Line aria-hidden="true" /> From {rate}</li>
                        )}
                    </ul>
                )}
            </div>
        </Link>
    );
}

function CardSkeleton({ view = "grid" }) {
    return (
        <div className={`${styles.card} ${styles.skeleton} ${view === "list" ? styles.cardRow : ""}`} aria-hidden="true">
            <span className={`${styles.cover} ${styles.shimmer}`} />
            <div className={styles.cardBody}>
                <span className={`${styles.logo} ${styles.shimmer}`} />
                <span className={`${styles.shimmer} ${styles.lineLg}`} />
                <span className={`${styles.shimmer} ${styles.lineSm}`} />
                <span className={`${styles.shimmer} ${styles.lineBtn}`} />
            </div>
        </div>
    );
}

export default function BuildersPage() {
    const { isAuthenticated, user } = useAuth();

    // Dynamically fetch approved builders from backend; no static dummy data
    const [builders, setBuilders] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [reloadKey, setReloadKey] = useState(0);

    // Hero form keeps its own draft; the list only updates on submit.
    const [draftQuery, setDraftQuery] = useState("");
    const [draftDistrict, setDraftDistrict] = useState("all");

    const [query, setQuery] = useState("");
    const [district, setDistrict] = useState("all");
    const [sortBy, setSortBy] = useState("popular");
    const [view, setView] = useState("grid"); // grid | list
    const [pendingVerification, setPendingVerification] = useState(null);
    const [showPendingAlert, setShowPendingAlert] = useState(true);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const vParam = params.get("verification");
            const isReg = params.get("registered") === "true";
            const stored = localStorage.getItem("kp_builder_verification_pending");
            const data = stored ? JSON.parse(stored) : null;

            if (vParam) {
                let vStatus = "pending";
                if (vParam === "success" || vParam === "completed" || vParam === "approved") {
                    vStatus = "success";
                } else if (vParam === "failed" || vParam === "rejected") {
                    vStatus = "failed";
                }
                if (vStatus !== "pending") {
                    setBuilderStatus(vStatus === "success" ? "approved" : "rejected", { companyName: data?.companyName || "" });
                    if (data) localStorage.setItem("kp_builder_verification_pending", JSON.stringify({ ...data, status: vStatus }));
                }
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPendingVerification({
                    companyName: data?.companyName || "",
                    reraNumber: data?.reraNumber || "",
                    submittedAt: data?.submittedAt || Date.now(),
                    status: vStatus,
                });
            } else if (data) {
                setPendingVerification(data);
            } else if (isReg) {
                setPendingVerification({ companyName: "", submittedAt: Date.now(), status: "pending" });
            }

            // Sync with authoritative backend builder registration status
            if (isAuthenticated || data?.companyName) {
                builderApi.status().then(async (res) => {
                    const reg = res?.builder || res?.registration;
                    const localCompany = String(data?.companyName || "").trim();
                    const backendCompany = String(reg?.company_name || "").trim();
                    const needsLocalSync = Boolean(
                        localCompany &&
                        (data?.status === "pending" || !data?.status) &&
                        (!reg || backendCompany.toLowerCase() !== localCompany.toLowerCase())
                    );

                    if (needsLocalSync) {
                        // Auto-sync a local-only pending registration (submitted before backend wiring) to the database
                        try {
                            const portalRaw = localStorage.getItem("kp_builder_custom_webpage_data");
                            const portal = portalRaw ? JSON.parse(portalRaw) : {};
                            const phoneRaw = String(data?.phone || portal.phone || user?.phone_number || user?.phone || user?.mobile_number || "7902701482").replace(/\D/g, "");
                            const phone10 = phoneRaw.length > 10 ? phoneRaw.slice(-10) : (phoneRaw.length === 10 ? phoneRaw : "7902701482");
                            const builderTypeVal = Array.isArray(data?.builderType)
                                ? data.builderType.join(", ")
                                : (data?.builderType || portal.builderType || "Residential builder");
                            const syncRes = await builderApi.register({
                                company_name: localCompany,
                                builder_type: builderTypeVal,
                                rera_number: data?.reraNumber || portal.reraNumber || "KRERA-" + Date.now().toString().slice(-6),
                                contact_person: data?.contactPerson || user?.userName || user?.name || user?.username || "Builder Contact",
                                mobile_number: phone10,
                                email: data?.email || portal.email || user?.email || "rasal@esightsolutions.com",
                                district: data?.district || portal.headquarters || "Palakkad",
                                locality: data?.locality || "",
                                company_description: data?.about || portal.about || "",
                                established_year: data?.establishedYear || portal.foundedYear || undefined,
                                company_website: data?.website || portal.website || "",
                                terms_accepted: 1,
                                is_local_sync: 1,
                            });
                            if (syncRes?.success) {
                                setReloadKey((k) => k + 1);
                            }
                        } catch { }
                    } else if (res?.success && reg) {
                        const mappedStatus = reg.approval_status === "approved"
                            ? "success"
                            : (reg.approval_status === "rejected" ? "failed" : "pending");
                        setBuilderStatus(
                            reg.approval_status === "approved" ? "approved" : (reg.approval_status === "rejected" ? "rejected" : "pending"),
                            { companyName: reg.company_name || "" }
                        );
                        const synced = {
                            companyName: reg.company_name || "",
                            reraNumber: reg.rera_number || "",
                            submittedAt: reg.submitted_at || reg.created_at || Date.now(),
                            status: mappedStatus,
                        };
                        setPendingVerification(synced);
                        try {
                            localStorage.setItem("kp_builder_verification_pending", JSON.stringify(synced));
                        } catch { }
                    }
                }).catch(() => {});
            }
        } catch { }
    }, [isAuthenticated, user]);

    const dismissVerificationAlert = () => {
        setShowPendingAlert(false);
        try {
            localStorage.removeItem("kp_builder_verification_pending");
        } catch { }
    };

    // Remember the visitor's grid/list choice (read after mount to avoid a hydration mismatch).
    useEffect(() => {
        try {
            const saved = localStorage.getItem(VIEW_STORAGE_KEY);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (saved === "grid" || saved === "list") setView(saved);
        } catch { }
    }, []);

    const changeView = (next) => {
        setView(next);
        try {
            localStorage.setItem(VIEW_STORAGE_KEY, next);
        } catch { }
    };
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const listRef = useRef(null);

    useEffect(() => {
        let alive = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStatus("loading");
        builderApi
            .list({ force: true })
            .then((list) => {
                if (!alive) return;
                const apiItems = Array.isArray(list) ? list.map(fromApi) : [];
                setBuilders(apiItems);
                setStatus("ready");
            })
            .catch((err) => {
                console.warn("Failed to load builders:", err?.message || err);
                if (alive) setStatus("error");
            });
        return () => {
            alive = false;
        };
    }, [reloadKey]);

    // Reset paging whenever the result set changes.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisibleCount(PAGE_SIZE);
    }, [query, district, sortBy]);


    const checkIsOwn = useCallback((b) => {
        if (!user && !pendingVerification) return false;
        const bUserId = b.user_id || b.created_by;
        if (user && bUserId && (String(bUserId) === String(user.id))) return true;
        if (user?.email && b.email && user.email.toLowerCase() === b.email.toLowerCase()) return true;
        const cleanUserPhone = user?.phone ? String(user.phone).replace(/\D/g, "") : "";
        const cleanBPhone = b.phone ? String(b.phone).replace(/\D/g, "") : "";
        if (cleanUserPhone && cleanBPhone && (cleanUserPhone.endsWith(cleanBPhone) || cleanBPhone.endsWith(cleanUserPhone))) return true;
        const pendingName = (pendingVerification?.companyName || "").trim().toLowerCase();
        const bName = (b.name || b.company_name || "").trim().toLowerCase();
        if (pendingName && bName && pendingName === bName) return true;
        return false;
    }, [user, pendingVerification]);

    const hasApprovedBuilderProfile = useMemo(() => {
        const vStatus = pendingVerification?.status;
        const isVerifiedApproved = vStatus === "success" || vStatus === "completed" || vStatus === "approved";
        const hasOwnCard = builders.some(checkIsOwn);
        return isVerifiedApproved || hasOwnCard;
    }, [pendingVerification, builders, checkIsOwn]);

    const districtsCovered = useMemo(
        () => KERALA_DISTRICTS.filter((d) => builders.some((b) => matchesDistrict(getPlace(b), d.slug))).length,
        [builders]
    );

    const results = useMemo(() => {
        let list = [...builders];
        const q = query.trim().toLowerCase();

        if (q) {
            list = list.filter((b) =>
                `${getName(b)} ${getRole(b)} ${getPlace(b)}`.toLowerCase().includes(q)
            );
        }
        if (district !== "all") {
            list = list.filter((b) => matchesDistrict(getPlace(b), district));
        }
        if (sortBy === "name") {
            list.sort((a, b) => getName(a).localeCompare(getName(b)));
        } else if (sortBy === "projects") {
            list.sort((a, b) => (Number(b.projects) || 0) - (Number(a.projects) || 0));
        } else if (sortBy === "experience") {
            const y = (x) => Number(x.since) || Number.POSITIVE_INFINITY;
            list.sort((a, b) => y(a) - y(b));
        }
        return list;
    }, [builders, query, district, sortBy]);

    const visible = results.slice(0, visibleCount);
    const hasMore = visibleCount < results.length;
    const hasFilters = query.trim() !== "" || district !== "all";
    const activeDistrict = KERALA_DISTRICTS.find((d) => d.slug === district);
    const registerHref = isAuthenticated ? "/register-builder" : "/login?redirect=/register-builder";

    const scrollToList = () => {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleHeroSearch = (e) => {
        e.preventDefault();
        setQuery(draftQuery);
        setDistrict(draftDistrict);
        scrollToList();
    };

    const pickDistrict = (slug) => {
        setDistrict(slug);
        setDraftDistrict(slug);
    };

    const clearFilters = () => {
        setQuery("");
        setDraftQuery("");
        pickDistrict("all");
    };

    return (
        <div className={styles.page}>
            <Nav />

            {/* ── Hero ── */}
            <section className={styles.hero} aria-labelledby="builders-hero-title">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={HERO_IMAGE} alt="" className={styles.heroImg} fetchPriority="high" decoding="async" />
                <div className={styles.heroOverlay} aria-hidden="true" />

                <div className={styles.heroInner}>
                    <span className={styles.eyebrow}>
                        <RiBuilding2Line aria-hidden="true" /> Builders in Kerala
                    </span>
                    <h1 id="builders-hero-title" className={styles.heroTitle}>
                        Build your dream home with trusted builders
                    </h1>
                    <p className={styles.heroSub}>
                        Browse verified builders, construction companies and developers across Kerala.
                        Check their service area and starting rates, then contact them directly.
                    </p>

                    <form className={styles.heroSearch} onSubmit={handleHeroSearch} role="search">
                        <label className={styles.heroField}>
                            <RiSearchLine aria-hidden="true" />
                            <input
                                type="search"
                                value={draftQuery}
                                onChange={(e) => setDraftQuery(e.target.value)}
                                placeholder="Builder name or type of work"
                                aria-label="Search builders"
                            />
                        </label>
                        <label className={`${styles.heroField} ${styles.heroSelect}`}>
                            <RiMapPin2Line aria-hidden="true" />
                            <select
                                value={draftDistrict}
                                onChange={(e) => setDraftDistrict(e.target.value)}
                                aria-label="District"
                            >
                                <option value="all">All districts</option>
                                {KERALA_DISTRICTS.map((d) => (
                                    <option key={d.slug} value={d.slug}>{d.name}</option>
                                ))}
                            </select>
                            <RiArrowDownSLine aria-hidden="true" className={styles.selectChevron} />
                        </label>
                        <button type="submit" className={styles.heroBtn}>
                            <RiSearchLine aria-hidden="true" /> Search
                        </button>
                    </form>

                    {/* <ul className={styles.heroStats}>
                        <li>
                            <strong>{status === "ready" ? builders.length : "—"}</strong>
                            <span>Verified builders</span>
                        </li>
                        <li>
                            <strong>{status === "ready" ? districtsCovered : "—"}</strong>
                            <span>Districts covered</span>
                        </li>
                        <li>
                            <strong>0%</strong>
                            <span>Brokerage – contact directly</span>
                        </li>
                    </ul> */}
                </div>
            </section>

            <main className={styles.container}>
                {pendingVerification && showPendingAlert && (() => {
                    const status = pendingVerification.status || "success";
                    const isSuccess = status === "success" || status === "completed" || status === "approved";
                    const isFailed = status === "failed" || status === "rejected";
                    const isPending = !isSuccess && !isFailed;

                    return (
                        <div
                            className={`${styles.verificationAlert} ${isSuccess
                                ? styles.verificationAlertSuccess
                                : isFailed
                                    ? styles.verificationAlertFailed
                                    : ""
                                }`}
                            role="status"
                            aria-live="polite"
                            aria-labelledby="verification-alert-title"
                        >
                            <div className={styles.alertMain}>
                                <div
                                    className={`${styles.alertIconWrap} ${isSuccess
                                        ? styles.alertIconSuccess
                                        : isFailed
                                            ? styles.alertIconFailed
                                            : ""
                                        }`}
                                    aria-hidden="true"
                                >
                                    {isSuccess && <RiCheckboxCircleLine />}
                                    {isFailed && <RiCloseCircleLine />}
                                    {isPending && <RiTimeLine />}
                                </div>

                                <div className={styles.alertBody}>
                                    <div className={styles.alertHeaderRow}>
                                        {isPending && (
                                            <span className={styles.alertBadge}>
                                                <span className={styles.pulseDot} aria-hidden="true" />
                                                Verification in progress
                                            </span>
                                        )}
                                        {isSuccess && (
                                            <span className={`${styles.alertBadge} ${styles.alertBadgeSuccess}`}>
                                                <RiCheckboxCircleLine aria-hidden="true" />
                                                Verification completed
                                            </span>
                                        )}
                                        {isFailed && (
                                            <span className={`${styles.alertBadge} ${styles.alertBadgeFailed}`}>
                                                <RiErrorWarningLine aria-hidden="true" />
                                                Verification failed
                                            </span>
                                        )}

                                        {pendingVerification.companyName && (
                                            <span className={styles.alertCompanyName} title={pendingVerification.companyName}>
                                                {pendingVerification.companyName}
                                            </span>
                                        )}
                                    </div>

                                    <h3 id="verification-alert-title" className={styles.alertTitle}>
                                        {isSuccess && "Builder verification approved!"}
                                        {isFailed && "Verification incomplete or failed"}
                                        {isPending && "Your builder registration is under review"}
                                    </h3>

                                    <p className={styles.alertText}>
                                        {isSuccess && (
                                            <>
                                                Congratulations! Your company details and K-RERA credentials have been verified. You can now build and publish your official company profile.
                                            </>
                                        )}
                                        {isFailed && (
                                            <>
                                                We could not verify your K-RERA number or registration documents. Please review your submitted details and submit again.
                                            </>
                                        )}
                                        {isPending && (
                                            <>
                                                Application and K-RERA documents received. Verification typically completes within <strong>24–48 hours</strong>.
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className={styles.alertRight}>
                                {isPending && (
                                    <div className={styles.miniStepper} aria-label="Verification progress">
                                        <div className={`${styles.miniStep} ${styles.miniStepDone}`} title="Application Submitted">
                                            <span className={styles.miniStepDot}><RiCheckboxCircleLine aria-hidden="true" /></span>
                                            <span className={styles.miniStepLabel}>Submitted</span>
                                        </div>
                                        <span className={styles.miniStepLine} aria-hidden="true" />
                                        <div className={`${styles.miniStep} ${styles.miniStepActive}`} title="Under Review">
                                            <span className={styles.miniStepDot}><RiTimeLine aria-hidden="true" /></span>
                                            <span className={styles.miniStepLabel}>Review</span>
                                        </div>
                                        <span className={styles.miniStepLine} aria-hidden="true" />
                                        <div className={`${styles.miniStep} ${styles.miniStepUpcoming}`} title="Profile Live">
                                            <span className={styles.miniStepDot}><RiShieldCheckLine aria-hidden="true" /></span>
                                            <span className={styles.miniStepLabel}>Live</span>
                                        </div>
                                    </div>
                                )}

                                {isSuccess && (
                                    <div className={styles.alertActionsGroup}>
                                        <Link
                                            href="/builder-portal"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`${styles.alertActionBtn} ${styles.alertBtnSuccess}`}
                                        >
                                            <RiBuilding2Line aria-hidden="true" /> Builder Portal
                                        </Link>
                                        <Link
                                            href="/register-builder?edit=true"
                                            className={`${styles.alertActionBtn} ${styles.alertBtnSecondary}`}
                                        >
                                            <RiEditLine aria-hidden="true" /> Edit Profile
                                        </Link>
                                    </div>
                                )}

                                {isFailed && (
                                    <Link
                                        href="/register-builder?recheck=true"
                                        className={`${styles.alertActionBtn} ${styles.alertBtnFailed}`}
                                    >
                                        <RiRefreshLine aria-hidden="true" /> Recheck your registration
                                    </Link>
                                )}

                                <button
                                    type="button"
                                    className={styles.alertCloseBtn}
                                    onClick={dismissVerificationAlert}
                                    aria-label="Dismiss verification alert"
                                    title="Dismiss"
                                >
                                    <RiCloseLine aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    );
                })()}


                {/* Persistent quick management buttons if verification approved and alert dismissed */}
                {(!showPendingAlert && hasApprovedBuilderProfile) && (
                    <div className={styles.approvedStickyBar}>
                        <div className={styles.approvedStickyText}>
                            <RiCheckboxCircleLine className={styles.approvedStickyIcon} />
                            <span><strong>Builder verification approved!</strong> Manage your official builder presence:</span>
                        </div>
                        <div className={styles.approvedStickyActions}>
                            <Link href="/builder-portal" target="_blank" rel="noopener noreferrer" className={styles.portalActionBtn}>
                                <RiBuilding2Line /> Builder Portal
                            </Link>
                            <Link href="/register-builder?edit=true" className={styles.profileActionBtn}>
                                <RiEditLine /> Profile / Edit Profile
                            </Link>
                        </div>
                    </div>
                )}

                <div className={styles.mainRow}>
                    {/* ── Builder CTA / Management Card ── */}
                    {!hasApprovedBuilderProfile ? (
                        <section className={styles.cta} aria-labelledby="builders-cta-title">
                            <div className={styles.ctaDetails}>
                                <div className={styles.ctaText}>
                                    <h2 id="builders-cta-title">Are you a builder or developer?</h2>
                                    <p>List your company on KeralaPlots and get enquiries from home buyers and plot owners across Kerala.</p>
                                    <ul className={styles.ctaList}>
                                        <li><RiCheckboxCircleLine aria-hidden="true" /> Build Your Page</li>
                                        <li><RiCheckboxCircleLine aria-hidden="true" /> Verified badge</li>
                                        <li><RiCheckboxCircleLine aria-hidden="true" /> Direct leads</li>
                                    </ul>
                                </div>
                                <Link href={registerHref} className={styles.ctaBtn}>
                                    List your company <RiArrowRightLine aria-hidden="true" />
                                </Link>
                            </div>
                            <div className={styles.ctaImage}>
                                <Image src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/d1146a2e-a6a4-4bbb-5a68-2cbbf8b0f400/public" alt="" fill />
                            </div>
                        </section>
                    ) : (
                        <section className={styles.builderOwnerCard}>
                            <div className={styles.ownerCardHeader}>
                                <div className={styles.ownerCardBadge}>
                                    <RiShieldCheckLine /> Builder Workspace
                                </div>
                                <h3>Manage Your Builder Profile</h3>
                                <p>Update your company projects, pricing, floor plans, and website in one place.</p>
                            </div>
                            <div className={styles.ownerCardActions}>
                                <Link href="/builder-portal" target="_blank" rel="noopener noreferrer" className={styles.ownerCardPrimaryBtn}>
                                    <RiBuilding2Line /> Open Builder Portal
                                </Link>
                                <Link href="/register-builder?edit=true" className={styles.ownerCardSecondaryBtn}>
                                    <RiEditLine /> Edit Builder Profile
                                </Link>
                            </div>
                        </section>
                    )}
                    {/* ── Listing ── */}
                    <section ref={listRef} className={styles.listSection} aria-labelledby="builders-list-title">
                        <div className={styles.listHeader}>
                            <div>
                                <h2 id="builders-list-title" className={styles.listTitle}>
                                    {activeDistrict ? `Builders in ${activeDistrict.name}` : "All builders"}
                                </h2>
                                {status === "ready" && (
                                    <p className={styles.listCount} aria-live="polite">
                                        {results.length === 0
                                            ? "No builders match your search"
                                            : `Showing ${visible.length} of ${results.length} builder${results.length === 1 ? "" : "s"}`}
                                    </p>
                                )}
                            </div>

                            <div className={styles.toolbar}>
                                <label className={styles.sortSelect}>
                                    <span className={styles.srOnly}>Sort by</span>
                                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                        {SORT_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                    <RiArrowDownSLine aria-hidden="true" className={styles.selectChevron} />
                                </label>
                                <div className={styles.viewToggle} role="group" aria-label="Layout">
                                    <button
                                        type="button"
                                        className={`${styles.viewBtn} ${view === "grid" ? styles.viewBtnActive : ""}`}
                                        aria-pressed={view === "grid"}
                                        aria-label="Grid view"
                                        title="Grid view"
                                        onClick={() => changeView("grid")}
                                    >
                                        <RiLayoutGridLine aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.viewBtn} ${view === "list" ? styles.viewBtnActive : ""}`}
                                        aria-pressed={view === "list"}
                                        aria-label="List view"
                                        title="List view"
                                        onClick={() => changeView("list")}
                                    >
                                        <RiListUnordered aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* <div className={styles.chips} role="group" aria-label="Filter by district">
                            <button
                                type="button"
                                className={`${styles.chip} ${district === "all" ? styles.chipActive : ""}`}
                                aria-pressed={district === "all"}
                                onClick={() => pickDistrict("all")}
                            >
                                All Kerala
                            </button>
                            {KERALA_DISTRICTS.map((d) => (
                                <button
                                    key={d.slug}
                                    type="button"
                                    className={`${styles.chip} ${district === d.slug ? styles.chipActive : ""}`}
                                    aria-pressed={district === d.slug}
                                    onClick={() => pickDistrict(district === d.slug ? "all" : d.slug)}
                                >
                                    {d.name}
                                </button>
                            ))}
                        </div> */}

                        {hasFilters && status === "ready" && (
                            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                                <RiCloseLine aria-hidden="true" /> Clear filters
                            </button>
                        )}

                        {status === "loading" && (
                            <div className={view === "list" ? styles.list : styles.grid} aria-busy="true" aria-label="Loading builders">
                                {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} view={view} />)}
                            </div>
                        )}

                        {status === "error" && (
                            <div className={styles.emptyState} role="alert">
                                <h3>We couldn&apos;t load builders</h3>
                                <p>Please check your connection and try again.</p>
                                <button type="button" className={styles.primaryBtn} onClick={() => setReloadKey((k) => k + 1)}>
                                    <RiRefreshLine aria-hidden="true" /> Try again
                                </button>
                            </div>
                        )}

                        {status === "ready" && results.length === 0 && (
                            <div className={styles.emptyState}>
                                {builders.length === 0 ? (
                                    <>
                                        <h3>Builders are joining soon</h3>
                                        <p>No verified builders are listed yet. Are you a builder? Be one of the first on KeralaPlots.</p>
                                        <Link href={registerHref} className={styles.primaryBtn}>
                                            List your company <RiArrowRightLine aria-hidden="true" />
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <h3>No builders found</h3>
                                        <p>Try a different name or district, or clear your filters.</p>
                                        <button type="button" className={styles.primaryBtn} onClick={clearFilters}>
                                            Clear filters
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {status === "ready" && results.length > 0 && (
                            <>
                                <div className={view === "list" ? styles.list : styles.grid}>
                                    {visible.map((b, i) => (
                                        <BuilderCard key={b.id ?? `${getName(b)}-${i}`} builder={b} view={view} isOwn={checkIsOwn(b)} />
                                    ))}
                                </div>
                                {hasMore && (
                                    <div className={styles.loadMoreWrap}>
                                        <button
                                            type="button"
                                            className={styles.loadMoreBtn}
                                            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                        >
                                            Load more builders <RiArrowDownSLine aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
