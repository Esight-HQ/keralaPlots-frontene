"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../builder-portal/builderPortal.module.css";
import page from "./builderPage.module.css";
import { BUILDERS as LOCAL_BUILDERS } from "../buildersData";
import { builderApi } from "../../lib/api";
import {
    RiBuilding2Line,
    RiRoadMapLine,
    RiHomeSmileLine,
    RiCalendarLine,
    RiShieldCheckLine,
    RiBankLine,
    RiFileList3Line,
    RiMapPin2Line,
    RiPhoneFill,
    RiWhatsappLine,
    RiMailLine,
    RiVerifiedBadgeFill,
    RiArrowRightLine,
    RiShareForwardLine,
    RiCheckboxCircleLine,
    RiArrowLeftLine,
    RiArrowLeftSLine,
    RiArrowRightSLine,
} from "react-icons/ri";
import { addEnquiry } from "../../lib/builderEnquiries";
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
} from "../../builder-portal/CorporateSections";

const toSlug = (text) =>
    String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const currentYear = new Date().getFullYear();

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

// Hide images that fail to load (avoids showing broken-image alt text)
const hideBrokenImg = (e) => { e.currentTarget.style.visibility = "hidden"; };
const showLoadedImg = (e) => { e.currentTarget.style.visibility = ""; };

// Same breakpoints as the builder-portal live preview so the tuned layouts are reused
const MOBILE_MAX = 640;
const TABLET_MAX = 1000;
const getLayout = (width) => (width <= MOBILE_MAX ? "mobile" : width <= TABLET_MAX ? "tablet" : "desktop");

export default function BuilderDetailPage({ params }) {
    const resolvedParams = use(params);
    const rawId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : "";
    const router = useRouter();

    const handleGoBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            try {
                if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
                    router.back();
                    return;
                }
            } catch {
                // fallback to /builders
            }
        }
        router.push("/builders");
    };

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [contactSuccess, setContactSuccess] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [layout, setLayout] = useState("desktop");
    const [heroSlide, setHeroSlide] = useState(0);

    // Track viewport width -> layout bucket
    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const update = () => setLayout(getLayout(window.innerWidth));
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Auto-advance the hero photo carousel when there are multiple photos
    useEffect(() => {
        const count = data ? [data.bannerUrl, ...(data.heroGallery || []).map((g) => g.url)].filter(Boolean).slice(0, 3).length : 0;
        if (count <= 1) return undefined;
        const id = setInterval(() => {
            setHeroSlide((i) => (i + 1) % count);
        }, 5000);
        return () => clearInterval(id);
    }, [data]);

    // Load data from custom portal storage, local baseline, or API
    useEffect(() => {
        let isMounted = true;

        const loadBuilderData = async () => {
            setIsLoading(true);
            try {
                // 0. Try fetching published builder website from backend API by slug
                try {
                    const apiRes = await builderApi.getPublicWebsite(rawId);
                    if (apiRes && apiRes.success && apiRes.data) {
                        if (isMounted) {
                            setData(apiRes.data);
                            setIsLoading(false);
                            return;
                        }
                    }
                } catch {
                    // Continue to local/custom fallback
                }

                // 1. Check custom portal saved in localStorage
                if (typeof window !== "undefined") {
                    try {
                        const saved = localStorage.getItem("kp_builder_custom_webpage_data");
                        if (saved) {
                            const parsed = JSON.parse(saved);
                            if (parsed?.companyName) {
                                const customSlug = toSlug(parsed.companyName);
                                if (rawId === "custom-portal" || rawId === customSlug || rawId === "my-builder-page" || rawId === "vedaanta-lotus" || rawId === "sample-portal") {
                                    if (isMounted) {
                                        setData(parsed);
                                        setIsLoading(false);
                                        return;
                                    }
                                }
                            }
                        }
                    } catch { }
                }

                // 2. Check local curated builders from buildersData.js
                const localMatch = (LOCAL_BUILDERS || []).find(
                    (b) => b.id === rawId || toSlug(b.name) === rawId || b.name.toLowerCase().includes(rawId.toLowerCase())
                );

                if (localMatch && isMounted) {
                    const years = localMatch.since ? Math.max(1, currentYear - Number(localMatch.since)) : 12;
                    const builderData = {
                        template: "landing",
                        companyName: localMatch.name,
                        headline: `${localMatch.name} — Luxury Residences & Communities`,
                        tagline: `Pioneering sustainable architecture, signature villas, and gated living across ${localMatch.place || "Kerala"}`,
                        logoUrl: localMatch.logo || "",
                        bannerUrl: localMatch.cover || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80",
                        builderType: localMatch.role || "Residential Builder & Luxury Developer",
                        reraNumber: `K-RERA/PRJ/${toSlug(localMatch.name).substring(0, 3).toUpperCase()}/2023/048`,
                        establishedYear: String(localMatch.since || 2012),
                        headquarters: localMatch.place || "Kochi, Kerala",
                        fullAddress: `${localMatch.place || "Kakkanad"}, Kerala, India`,
                        phone: localMatch.phone || "9847123456",
                        whatsapp: localMatch.phone || "9847123456",
                        email: `contact@${toSlug(localMatch.name)}.com`,
                        website: `www.${toSlug(localMatch.name)}.com`,
                        about: `${localMatch.name} is one of Kerala's premier architectural construction and property development firms with over ${years} years of heritage in ${localMatch.place}. Combining seismic-resistant RCC structural engineering, vastu-compliant layouts, and curated green spaces, we deliver timeless homes designed for generational luxury.`,
                        stats: {
                            completedProjects: `${localMatch.projects || 28}+`,
                            ongoingProjects: "4",
                            happyFamilies: `${(localMatch.projects || 28) * 18}+`,
                            deliveredSqFt: `${((localMatch.projects || 28) * 0.075).toFixed(1)}M+`,
                        },
                        keyFacts: {
                            landArea: "2.4 Acres (Scenic Waterfront Enclave)",
                            towers: "2 Towers (G + 14 Floors) & 24 Luxury Villas",
                            totalUnits: "148 Premium Residences",
                            possession: "Ready to Move & Ongoing Handover",
                            approvedBanks: ["State Bank of India", "HDFC Bank", "ICICI Bank", "Federal Bank", "Canara Bank"],
                        },
                        specifications: [
                            {
                                id: 1,
                                category: "Civil & Superstructure",
                                details: "Seismic Zone III compliant RCC framed structure with high-grade solid concrete block masonry in cement mortar.",
                            },
                            {
                                id: 2,
                                category: "Flooring & Finishes",
                                details: "800x800mm imported vitrified tiles in living/dining. Anti-skid vitrified tiles in utility and balconies with toughened glass railings.",
                            },
                            {
                                id: 3,
                                category: "Sanitary & CP Fittings",
                                details: "Wall-hung sanitaryware and concealed thermostatic divertors by Grohe / Kohler. Solar water heating connectivity.",
                            },
                            {
                                id: 4,
                                category: "Electrical & Home Automation",
                                details: "Concealed copper wiring with Finolex cables and modular switches by Schneider. Video door phone and smart lock ready.",
                            },
                        ],
                        neighborhood: [
                            { id: 1, landmark: "Nearest Metro & Transit Station", category: "Transit & Metro", distance: "850 Meters (3 mins drive)" },
                            { id: 2, landmark: "Lulu International Mall", category: "Shopping & Retail", distance: "2.4 Km (6 mins drive)" },
                            { id: 3, landmark: "Multi-Speciality Hospital", category: "Healthcare Hub", distance: "3.2 Km (8 mins drive)" },
                            { id: 4, landmark: "International ICSE / IB School", category: "Education Center", distance: "1.5 Km (4 mins drive)" },
                        ],
                        projects: [
                            {
                                id: 1,
                                title: `${localMatch.name} Crest Luxury Villas`,
                                location: localMatch.place || "Kerala",
                                price: "₹85 Lakhs – 1.45 Cr",
                                status: "Ready to Move",
                                image: localMatch.cover || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&auto=format&fit=crop&q=75",
                                amenities: ["Clubhouse", "Infinity Pool", "24/7 Security", "Solar Lighting"],
                            },
                            {
                                id: 2,
                                title: `${localMatch.name} Boulevard Heights`,
                                location: localMatch.place || "Kerala",
                                price: "₹55 Lakhs – 92 Lakhs",
                                status: "Under Construction",
                                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&auto=format&fit=crop&q=75",
                                amenities: ["Gymnasium", "Children Play Park", "Power Backup", "CCTV Surveillance"],
                            },
                            {
                                id: 3,
                                title: `${localMatch.name} Waterfront Enclave`,
                                location: localMatch.place || "Kerala",
                                price: "₹68 Lakhs onwards",
                                status: "New Launch",
                                image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=75",
                                amenities: ["Jogging Track", "Private Deck", "Landscaped Gardens", "EV Charging"],
                            },
                        ],
                        properties: [
                            {
                                id: 1,
                                title: "3 BHK Royal Luxury Villa",
                                rooms: "3 Bedrooms • 3 Bathrooms • 2 Balconies",
                                sqft: "2,150 Sq Ft",
                                price: "₹85 Lakhs",
                                status: "Available",
                                image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=75",
                            },
                            {
                                id: 2,
                                title: "4 BHK Presidential Penthouse",
                                rooms: "4 Bedrooms • 4 Bathrooms • Terrace Garden",
                                sqft: "2,980 Sq Ft",
                                price: "₹1.35 Cr",
                                status: "Available",
                                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=75",
                            },
                        ],
                    };
                    setData(builderData);
                    setIsLoading(false);
                    return;
                }

                // 3. Check API Service Providers
                try {
                    const apiList = await builderApi.list();
                    if (Array.isArray(apiList) && apiList.length > 0) {
                        const apiMatch = apiList.find(
                            (s) => String(s.id) === rawId || toSlug(s.name || s.company_name) === rawId
                        );
                        if (apiMatch && isMounted) {
                            const name = apiMatch.name || apiMatch.full_name || apiMatch.company_name || "Kerala Builder";
                            const builderData = {
                                template: "landing",
                                companyName: name,
                                headline: `${name} — Architectural Excellence`,
                                tagline: `Verified real estate builder & turnkey development in ${apiMatch.place || "Kerala"}`,
                                logoUrl: apiMatch.logo || apiMatch.photo || "",
                                bannerUrl: apiMatch.cover || apiMatch.banner || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop&q=80",
                                builderType: apiMatch.role || "Residential Builder",
                                reraNumber: "K-RERA/PRJ/KER/2022/104",
                                establishedYear: String(apiMatch.since || 2015),
                                headquarters: apiMatch.place || "Kerala, India",
                                fullAddress: `${apiMatch.place || "Kerala"}, India`,
                                phone: apiMatch.phone || "9847123456",
                                whatsapp: apiMatch.phone || "9847123456",
                                email: `contact@${toSlug(name)}.com`,
                                website: `www.${toSlug(name)}.com`,
                                about: `${name} provides turnkey residential construction, architectural consulting, and villa community developments across ${apiMatch.place || "Kerala"}.`,
                                stats: {
                                    completedProjects: `${apiMatch.projects || 18}+`,
                                    ongoingProjects: "3",
                                    happyFamilies: "250+",
                                    deliveredSqFt: "450K+",
                                },
                                keyFacts: {
                                    landArea: "1.2 Acres",
                                    towers: "1 Tower (G + 10 Floors)",
                                    totalUnits: "64 Units",
                                    possession: "Ongoing",
                                    approvedBanks: ["SBI", "HDFC Bank", "Federal Bank"],
                                },
                                specifications: [
                                    { id: 1, category: "Civil Structure", details: "RCC framed earthquake resistant construction." },
                                    { id: 2, category: "Flooring", details: "Vitrified tiles in all rooms with anti-skid in bathrooms." },
                                ],
                                neighborhood: [
                                    { id: 1, landmark: "Central Junction", category: "Transit", distance: "1.0 Km" },
                                ],
                                projects: [
                                    {
                                        id: 1,
                                        title: `${name} Landmark Residences`,
                                        location: apiMatch.place || "Kerala",
                                        price: apiMatch.rate || "₹55 Lakhs onwards",
                                        status: "Ready to Move",
                                        image: apiMatch.cover || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=75",
                                        amenities: ["Gated Security", "Car Parking", "Water Supply"],
                                    },
                                ],
                                properties: [],
                            };
                            setData(builderData);
                            setIsLoading(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch API builder:", e.message);
                }

                // 4. Default fallback
                if (isMounted) {
                    const cleanName = rawId
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ");

                    const fallbackData = {
                        template: "landing",
                        companyName: cleanName || "Kerala Verified Builder",
                        headline: `${cleanName || "Signature Builder"} — Luxury Architectural Living`,
                        tagline: "Building world-class residential landmarks, villas, and modern townships across Kerala",
                        logoUrl: "",
                        bannerUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80",
                        builderType: "Residential Builder & Developer",
                        reraNumber: "K-RERA/PRJ/KER/2023/001",
                        establishedYear: "2015",
                        headquarters: "Ernakulam, Kerala",
                        fullAddress: "Ernakulam, Kerala, India",
                        phone: "9847123456",
                        whatsapp: "9847123456",
                        email: "contact@keralaplots.com",
                        website: "www.keralaplots.com",
                        about: `${cleanName || "This firm"} is an approved real estate builder on KeralaPlots, recognized for architectural finesse, verified titles, and timely project delivery.`,
                        stats: {
                            completedProjects: "24+",
                            ongoingProjects: "5",
                            happyFamilies: "450+",
                            deliveredSqFt: "1.2M+",
                        },
                        keyFacts: {
                            landArea: "2.0 Acres",
                            towers: "2 Towers & Luxury Villas",
                            totalUnits: "120 Units",
                            possession: "Ready to Move & In Progress",
                            approvedBanks: ["State Bank of India", "HDFC Bank", "ICICI Bank", "Federal Bank"],
                        },
                        specifications: [
                            { id: 1, category: "Civil Structure", details: "RCC framed earthquake resistant structure." },
                            { id: 2, category: "Flooring", details: "Vitrified tiles in all living spaces." },
                        ],
                        neighborhood: [
                            { id: 1, landmark: "Metro Station", category: "Transit", distance: "1.2 Km" },
                        ],
                        projects: [
                            {
                                id: 1,
                                title: `${cleanName || "Signature"} Landmark Villas`,
                                location: "Kerala, India",
                                price: "₹65 Lakhs onwards",
                                status: "Ready to Move",
                                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&auto=format&fit=crop&q=75",
                                amenities: ["Security", "Clubhouse", "Play Area"],
                            },
                        ],
                        properties: [],
                    };
                    setData(fallbackData);
                }
            } catch (err) {
                console.warn("Error loading builder webpage:", err?.message || err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadBuilderData();

        return () => {
            isMounted = false;
        };
    }, [rawId]);

    const handleShare = async () => {
        if (typeof window !== "undefined") {
            const url = window.location.href;
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: data?.companyName || "Builder Webpage",
                        text: `Check out ${data?.companyName} on KeralaPlots`,
                        url,
                    });
                } else {
                    await navigator.clipboard.writeText(url);
                    setToastMessage("Page link copied to clipboard!");
                    setTimeout(() => setToastMessage(""), 3000);
                }
            } catch {
                await navigator.clipboard.writeText(url);
                setToastMessage("Page link copied to clipboard!");
                setTimeout(() => setToastMessage(""), 3000);
            }
        }
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const field = (key) => String(fd.get(key) || "").trim();
        const formName = form.querySelector("h3, h4")?.textContent?.trim() || "Enquiry form";

        const nameVal = field("name");
        const phoneVal = field("phone");
        const emailVal = field("email");
        const messageVal = field("message");
        const visitVal = field("visit");

        // Save the lead locally so it shows up under Profile → Enquiries
        addEnquiry({
            builderId: rawId,
            builderName: data?.companyName || "",
            template: "corporate",
            source: formName,
            name: nameVal,
            phone: phoneVal,
            email: emailVal,
            message: messageVal,
            visitTime: visitVal,
            pageUrl: typeof window !== "undefined" ? window.location.href : "",
        });

        // Persist enquiry to backend database (builder_enquiries + in-app notification)
        try {
            await builderApi.submitPublicEnquiry(rawId, {
                name: nameVal,
                phone: phoneVal,
                email: emailVal,
                message: messageVal,
                visit_time: visitVal,
                source: formName,
            });
        } catch {
            // Local fallback already saved above
        }

        form.reset();

        setContactSuccess(true);
        setTimeout(() => {
            setContactSuccess(false);
            setToastMessage(`Enquiry dispatched directly to ${data?.companyName || "developer"}!`);
            setTimeout(() => setToastMessage(""), 4000);
        }, 1200);
    };

    if (isLoading || !data) {
        return (
            <div className={page.skeletonPage} aria-busy="true" aria-label="Loading builder page">
                <div className={page.skeletonHeader}>
                    <span className={`${page.skel} ${page.skelLogo}`} />
                    <span className={`${page.skel} ${page.skelLine}`} style={{ width: "160px" }} />
                </div>
                <div className={`${page.skel} ${page.skelHero}`} />
                <div className={page.skeletonBody}>
                    <span className={`${page.skel} ${page.skelLine}`} style={{ width: "40%", height: "22px" }} />
                    <span className={`${page.skel} ${page.skelLine}`} style={{ width: "90%" }} />
                    <span className={`${page.skel} ${page.skelLine}`} style={{ width: "75%" }} />
                    <div className={page.skeletonGrid}>
                        {[0, 1, 2, 3].map((i) => <span key={i} className={`${page.skel} ${page.skelCard}`} />)}
                    </div>
                </div>
            </div>
        );
    }

    // ────────── TEMPLATE 3 SECTION RENDERERS (Corporate / Executive Style) ──────────
    // Corporate-template sections are shared with the Builder Portal preview (see builder-portal/CorporateSections.jsx)
    const renderTemplate3KeyFacts = () => null;

    const renderTemplate3Overview = () => <CorporateOverview data={data} />;

    const renderTemplate3Specs = () => <CorporateSpecs specifications={data.specifications || []} />;

    const renderTemplate3Projects = () => (
        <CorporateProjects
            projects={data.projects || []}
            neighborhood={data.neighborhood || []}
            mapQuery={data.fullAddress || data.headquarters || ""}
        />
    );

    const renderTemplate3Units = () => <CorporateUnits units={data.properties || []} />;

    const renderTemplate3Neighborhood = () => null;

    const renderTemplate3Contact = () => (
        <CorporateContact data={data} contactSuccess={contactSuccess} onSubmit={handleContactSubmit} />
    );

    // ────────── RENDERED FOOTER (Universal) ──────────
    const renderFooter = () => (
        <footer className={styles.webFooter}>
            <p>© {new Date().getFullYear()} {data.companyName || "Builder Portfolio"}. All Rights Reserved.</p>
            <p>
                K-RERA: {data.reraNumber || "Registration in Process"} • Listed on KeralaPlots Verified Builder Network
            </p>
        </footer>
    );

    const enquireHref = "#t3-contact";

    // Hero banner images: cover photo + up to 2 extra photos (3 max)
    const heroImages = [data.bannerUrl, ...(data.heroGallery || []).map((g) => g.url)].filter(Boolean).slice(0, 3);
    const heroSlideCount = heroImages.length;
    const activeHeroSlide = heroSlideCount > 0 ? heroSlide % heroSlideCount : 0;
    const goToHeroSlide = (i) => setHeroSlide(i);
    const prevHeroSlide = () => setHeroSlide((i) => (i - 1 + heroSlideCount) % heroSlideCount);
    const nextHeroSlide = () => setHeroSlide((i) => (i + 1) % heroSlideCount);

    return (
        <div
            id="top"
            className={`${page.root} ${styles.publicSite} ${layout === "mobile" ? styles.previewFrameMobile : ""} ${layout === "tablet" ? styles.previewFrameTablet : ""}`}
            data-layout={layout}
        >

            {/* ── Main Rendered Webpage (Using Exact Builder Portal Styles) ── */}
            <div className={styles.pageContainer}>
                {/* Header (Universal) */}
                <header className={`${styles.webHeader} ${page.header}`}>
                    <div className={`${styles.webLogoGroup} ${page.brand}`}>
                        <button
                            type="button"
                            onClick={handleGoBack}
                            className={page.backBtn}
                            aria-label="Go back"
                            title="Go back"
                        >
                            <RiArrowLeftLine aria-hidden="true" />
                            <span className={page.backLabel}>Back</span>
                        </button>
                        <a href="#top" className={page.brandLink} aria-label={`${data.companyName || "Builder"} – back to top`}>
                            {data.logoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    onError={hideBrokenImg}
                                    onLoad={showLoadedImg}
                                    src={data.logoUrl}
                                    alt={data.companyName || "Builder logo"}
                                    className={styles.webLogoImg}
                                    style={{ width: "auto", height: "52px", maxWidth: "180px", objectFit: "contain", objectPosition: "center", flexShrink: 0 }}
                                />
                            ) : (
                                <span className={styles.webLogoInitials}>
                                    {data.companyName?.trim()?.charAt(0)?.toUpperCase() || "B"}
                                </span>
                            )}
                            <span className={page.brandText}>
                                <span className={page.brandName}>{data.companyName || "Builder"}</span>
                                <span className={page.verifiedPill}>
                                    <RiVerifiedBadgeFill aria-hidden="true" /> Verified Developer
                                </span>
                            </span>
                        </a>
                    </div>

                    <div className={`${styles.webHeaderActions} ${page.headerActions}`}>
                        <button type="button" onClick={handleShare} className={page.shareBtn} aria-label="Share this page" title="Share">
                            <RiShareForwardLine /> <span className={page.btnLabel}>Share</span>
                        </button>
                        {data.phone && (
                            <a href={`tel:${data.phone}`} className={`${styles.webCallBtn} ${page.hideOnMobile}`}>
                                <RiPhoneFill /> Call
                            </a>
                        )}
                        {data.whatsapp && (
                            <a
                                href={`https://wa.me/91${data.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.webWaBtn} ${page.hideOnMobile}`}
                            >
                                <RiWhatsappLine /> WhatsApp
                            </a>
                        )}
                    </div>
                </header>

                {/* ────────── BUILDER PROFILE PAGE ────────── */}
                <>
                        <section className={styles.corporateHero}>
                            <div className={styles.corporateHeroImageWrap}>
                                {heroImages.length > 0 ? (
                                    <>
                                        {heroImages.map((src, i) => (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img key={i} onError={hideBrokenImg} onLoad={showLoadedImg}
                                                src={src}
                                                alt={`${data.companyName || "Builder"} photo ${i + 1}`}
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
                                <h1 className={styles.corporateTitle}>{data.headline || data.companyName}</h1>
                                <p className={styles.corporateSubtitle}>
                                    {data.tagline || data.about || "Quality homes across Kerala, built with care and delivered on time."}
                                </p>
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

                        <CorporateTrustStats data={data} />
                        <CorporateQuickNav data={data} />
                        {renderTemplate3Projects()}
                        {renderTemplate3Units()}
                        {renderTemplate3Neighborhood()}
                        {renderTemplate3Specs()}
                        {renderTemplate3KeyFacts()}
                        {renderTemplate3Overview()}
                        {renderTemplate3Contact()}
                </>

                {/* Footer (Universal) */}
                {renderFooter()}
            </div>

            {/* Mobile sticky action bar */}
            <nav className={page.mobileCta} aria-label="Quick contact">
                {data.phone && (
                    <a href={`tel:${data.phone}`} className={page.ctaBtn}>
                        <RiPhoneFill /> Call
                    </a>
                )}
                {data.whatsapp && (
                    <a
                        href={`https://wa.me/91${data.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${page.ctaBtn} ${page.ctaWa}`}
                    >
                        <RiWhatsappLine /> WhatsApp
                    </a>
                )}
                <a href={enquireHref} className={`${page.ctaBtn} ${page.ctaPrimary}`}>
                    <RiMailLine /> Enquire
                </a>
            </nav>

            {/* Toast Notification */}
            {toastMessage && (
                <div className={page.toast} role="status" aria-live="polite">
                    <RiCheckboxCircleLine className={page.toastIcon} />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
}
