"use client";

/*
 * Shared "Landing" template sections used by BOTH the Builder Portal live preview
 * (src/app/builder-portal/page.jsx) and the public builder page (src/app/builders/[id]/page.jsx),
 * so the two always render identically.
 *
 * Pass `isEditor` from the portal to show helpful empty states and "add in editor" hints.
 */

import { useId, useState, useEffect } from "react";
import base from "./builderPortal.module.css";
import s from "./landingSections.module.css";
import {
    RiHomeSmileLine,
    RiCalendarLine,
    RiRoadMapLine,
    RiMapPin2Line,
    RiPhoneFill,
    RiWhatsappLine,
    RiMailLine,
    RiShieldCheckLine,
    RiArrowRightLine,
    RiArrowRightUpLine,
    RiPlaneLine,
    RiTrainLine,
    RiSubwayLine,
    RiHospitalLine,
    RiGraduationCapLine,
    RiShoppingBag3Line,
    RiBusLine,
    RiLeafLine,
    RiSunLine,
    RiAncientPavilionLine,
    RiBankLine,
    RiHotelBedLine,
    RiDropLine,
    RiParkingBoxLine,
    RiCupLine,
    RiRuler2Line,
    RiWalkLine,
    RiCarLine,
    RiSendPlaneLine,
    RiLock2Line,
    RiCheckboxCircleFill,
    RiLayoutMasonryLine,
    RiCloseLine,
    RiFileList3Line,
    RiBuilding2Line,
    RiPercentLine,
    RiDownloadLine,
    RiQuestionLine,
    RiStackLine,
    RiArrowLeftSLine,
    RiArrowRightSLine,
    RiArrowDownSLine,
    RiCheckLine,
} from "react-icons/ri";
import { safeHref } from "../lib/safeHref";

/* ───────────── helpers ───────────── */

export const hideBrokenImg = (e) => { e.currentTarget.style.visibility = "hidden"; };
export const showLoadedImg = (e) => { e.currentTarget.style.visibility = ""; };

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Map free-text statuses to a colour tone
export const statusTone = (status = "") => {
    const v = String(status).toLowerCase();
    if (/sold/.test(v)) return "sold";
    if (/only|left|few|fast|limited|last/.test(v)) return "urgent";
    if (/ready|available|complete|handover|move/.test(v)) return "ready";
    if (/construction|nearing|progress|ongoing/.test(v)) return "progress";
    if (/upcoming|launch|pre-|soon|new/.test(v)) return "upcoming";
    return "neutral";
};

export const toneClass = (status) => s[`tone_${statusTone(status)}`] || "";

// "4 Beds • 4 Baths • Balcony" → [{label, Icon}]
const ROOM_ICONS = [
    [/bed|bhk|room/i, RiHotelBedLine],
    [/bath|toilet|wash/i, RiDropLine],
    [/balcon|sit-out|sitout|terrace/i, RiSunLine],
    [/park|car|garage/i, RiParkingBoxLine],
    [/kitchen|dining|pantry/i, RiCupLine],
];
export const parseRooms = (rooms) =>
    String(rooms || "")
        .split(/•|·|\||,/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((label) => {
            const match = ROOM_ICONS.find(([re]) => re.test(label));
            return { label, Icon: match ? match[1] : RiCheckboxCircleFill };
        });

// Landmark category → icon
const PLACE_ICONS = [
    [/airport|flight|air ?port/i, RiPlaneLine],
    [/metro/i, RiSubwayLine],
    [/rail|train/i, RiTrainLine],
    [/bus/i, RiBusLine],
    [/hospital|clinic|medical|health/i, RiHospitalLine],
    [/school|college|university|education|academy/i, RiGraduationCapLine],
    [/mall|shop|market|super/i, RiShoppingBag3Line],
    [/temple|church|mosque|worship|cultural|heritage/i, RiAncientPavilionLine],
    [/bank|atm/i, RiBankLine],
    [/park|garden|lake/i, RiLeafLine],
    [/beach|sea/i, RiSunLine],
    [/road|highway|junction|toll|bypass|nh/i, RiRoadMapLine],
];
export const placeIcon = (category, landmark) => {
    const hit =
        PLACE_ICONS.find(([re]) => re.test(String(category || ""))) ||
        PLACE_ICONS.find(([re]) => re.test(String(landmark || "")));
    const Icon = hit ? hit[1] : RiMapPin2Line;
    return <Icon aria-hidden="true" />;
};

// "1.0 Km (3 Mins drive)" → { main: "1.0 Km", sub: "3 Mins drive", mode }
export const parseDistance = (text) => {
    const raw = String(text || "").trim();
    const m = raw.match(/^([^()]+?)\s*\(([^)]+)\)\s*$/);
    const main = m ? m[1] : raw;
    const sub = m ? m[2] : "";
    const mode = /walk/i.test(raw) ? "walk" : /drive|car|ride/i.test(raw) ? "drive" : null;
    return { main, sub, mode };
};

export const mapsUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

// Bank "logo" monogram: HDFC Bank -> HDFC, State Bank of India -> SBI
const BANK_STOPWORDS = new Set(["of", "the", "and", "&", "ltd", "limited"]);
export const bankInitials = (name) => {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "?";
    if (/^[A-Z]{2,5}$/.test(words[0])) return words[0];
    return (
        words
            .filter((w) => !BANK_STOPWORDS.has(w.toLowerCase()))
            .map((w) => w.charAt(0).toUpperCase())
            .join("")
            .slice(0, 4) || words[0].charAt(0).toUpperCase()
    );
};

// Recognizable brand colors for commonly-listed Indian lenders; anything else
// cycles through a neutral accent palette so chips still read as distinct.
const BANK_BRAND_COLORS = {
    "state bank of india": "#2d5fa8",
    "hdfc bank": "#004c8f",
    "icici bank": "#f37021",
    "federal bank": "#154087",
    "canara bank": "#f2a900",
    "axis bank": "#8b1874",
    "bank of baroda": "#f36f21",
    "punjab national bank": "#8a1538",
    "south indian bank": "#00558c",
    "lic housing finance": "#003b7a",
    "union bank of india": "#d6342c",
    "kerala gramin bank": "#1a7a4c",
};
const BANK_FALLBACK_COLORS = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2"];
export const bankColor = (name, index = 0) => {
    const key = String(name || "").trim().toLowerCase();
    return BANK_BRAND_COLORS[key] || BANK_FALLBACK_COLORS[index % BANK_FALLBACK_COLORS.length];
};

const SectionHeading = ({ eyebrow, title, aside }) => (
    <div className={base.webSectionHeadingRow}>
        <div>
            <span className={base.webSectionEyebrow}>{eyebrow}</span>
            <h2 className={base.webSectionTitle}>{title}</h2>
        </div>
        {aside}
    </div>
);

const EmptyState = ({ Icon, title, desc }) => (
    <div className={base.emptyStateBox}>
        <Icon className={base.emptyStateIcon} />
        <p className={base.emptyStateTitle}>{title}</p>
        <p className={base.emptyStateDesc}>{desc}</p>
    </div>
);

/* ───────────── Featured Developments ───────────── */

const MAX_AMENITIES = 6;

const ProjectCard = ({ proj, onViewDetails }) => {
    const [showAll, setShowAll] = useState(false);
    const amenities = proj.amenities || [];
    const visible = showAll ? amenities : amenities.slice(0, MAX_AMENITIES);
    const hidden = amenities.length - visible.length;

    return (
        <article className={s.projectCard}>
            <div className={s.projectCover}>
                {proj.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={proj.image} alt={proj.title} loading="lazy" onError={hideBrokenImg} onLoad={showLoadedImg} />
                ) : (
                    <div className={s.mediaPlaceholder}><RiLayoutMasonryLine aria-hidden="true" /></div>
                )}
                <span className={`${s.statusPill} ${toneClass(proj.status || "Ongoing")}`}>
                    <span className={s.statusDot} aria-hidden="true" />
                    {proj.status || "Ongoing"}
                </span>
            </div>

            <div className={s.projectBody}>
                <div>
                    <h3 className={s.projectName}>{proj.title}</h3>
                    {proj.location && (
                        <p className={s.projectLoc}>
                            <RiMapPin2Line aria-hidden="true" /> {proj.location}
                        </p>
                    )}
                </div>

                {(proj.reraNumber || proj.possessionDate) && (
                    <div className={s.projectMetaRow}>
                        {proj.reraNumber && (
                            <span className={s.reraBadge}>
                                <RiShieldCheckLine aria-hidden="true" /> RERA: {proj.reraNumber}
                            </span>
                        )}
                        {proj.possessionDate && (
                            <span className={s.possessionBadge}>
                                <RiCalendarLine aria-hidden="true" /> Possession: {proj.possessionDate}
                            </span>
                        )}
                    </div>
                )}

                {proj.highlights && (
                    <p className={s.projectHighlights}>{proj.highlights}</p>
                )}

                {proj.price && (
                    <div className={s.priceBlock}>
                        <span className={s.priceLabel}>Price range</span>
                        <span className={s.priceValue}>{proj.price}</span>
                    </div>
                )}

                {amenities.length > 0 && (
                    <div className={s.amenities}>
                        <span className={s.miniLabel}>Amenities</span>
                        <ul className={s.amenityList}>
                            {visible.map((am, i) => (
                                <li key={`${am}-${i}`}>{am}</li>
                            ))}
                            {(hidden > 0 || showAll) && amenities.length > MAX_AMENITIES && (
                                <li>
                                    <button
                                        type="button"
                                        className={s.moreBtn}
                                        onClick={() => setShowAll((v) => !v)}
                                        aria-expanded={showAll}
                                    >
                                        {showAll ? "Show less" : `+${hidden} more`}
                                    </button>
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                <div className={s.projectCardFoot}>
                    <button type="button" onClick={onViewDetails} className={s.viewDetailsBtn}>
                        View Full Details
                    </button>
                    <a href="#contact" className={s.linkBtn}>
                        Enquire <RiArrowRightLine aria-hidden="true" />
                    </a>
                </div>
            </div>
        </article>
    );
};

/* ───────────── Project Detail Modal (shared by all 3 templates) ───────────── */

const QUICK_FACTS_CONFIG = [
    { key: "landArea", label: "Land area", Icon: RiRuler2Line },
    { key: "towers", label: "Towers & floors", Icon: RiBuilding2Line },
    { key: "totalUnits", label: "Total homes", Icon: RiStackLine },
    { key: "constructionProgress", label: "Work completed", Icon: RiPercentLine },
];

/* "40% Complete" -> 40 ; "Ready to Move" -> 100 ; otherwise null (no bar shown). */
const progressPercent = (text = "") => {
    const m = String(text).match(/(\d{1,3})\s*%/);
    if (m) return Math.min(100, parseInt(m[1], 10));
    return /ready/i.test(text) ? 100 : null;
};

const readyByText = (date = "") =>
    /ready|possession|handover/i.test(date) ? date : `Ready by ${date}`;

function buildProjectFaq(proj) {
    const faq = [];
    faq.push({
        q: "Is this project RERA registered?",
        a: proj.reraNumber
            ? `Yes. It is registered with the Kerala government (K-RERA). Registration number: ${proj.reraNumber}.`
            : "RERA details have not been added yet. Please ask the builder directly.",
    });
    faq.push({
        q: "When can I move in?",
        a: proj.possessionDate
            ? `The project is ${String(proj.status || "under construction").toLowerCase()}. Expected handover: ${proj.possessionDate}.`
            : `The project is currently "${proj.status || "Under Construction"}".`,
    });
    if (proj.price) {
        faq.push({ q: "What is the price?", a: `Homes here are priced ${proj.price}. The final price depends on the home type and floor you choose.` });
    }
    if (proj.configurations?.length > 0) {
        const types = proj.configurations.map((c) => c.type).filter(Boolean).join(", ");
        if (types) faq.push({ q: "Which home types are available?", a: `${types}.` });
    }
    faq.push({ q: "Can I get a home loan?", a: "Yes. Most leading banks give home loans for RERA-registered projects. The builder's team can help you with the paperwork." });
    faq.push({ q: "How do I book a site visit?", a: 'Tap "Book a Site Visit" below and leave your number. The builder\'s team will call you to fix a time.' });
    return faq;
}

export function ProjectDetailModal({ proj, neighborhood = [], mapQuery = "", contactHref = "#contact", onClose }) {
    const titleId = useId();
    const galleryImages = [
        ...(proj.image ? [{ id: "cover", url: proj.image, category: "Cover" }] : []),
        ...(proj.gallery || []).filter((g) => g.url && g.url !== proj.image),
    ];
    const [activeIndex, setActiveIndex] = useState(0);
    const imgCount = galleryImages.length;
    const activeImage = galleryImages[activeIndex] || galleryImages[0];
    const showImage = (i) => setActiveIndex(((i % imgCount) + imgCount) % imgCount);

    const amenities = proj.amenities || [];
    const quickFacts = QUICK_FACTS_CONFIG.filter(({ key }) => proj[key]);
    const configs = (proj.configurations || []).filter((c) => c.type || c.area || c.price);
    const faq = buildProjectFaq(proj);
    const status = proj.status || "Ongoing";

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
            if (imgCount > 1 && e.key === "ArrowRight") setActiveIndex((i) => (i + 1) % imgCount);
            if (imgCount > 1 && e.key === "ArrowLeft") setActiveIndex((i) => (i - 1 + imgCount) % imgCount);
        };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose, imgCount]);

    return (
        <div className={s.modalOverlay} onClick={onClose} role="presentation">
            <div
                className={s.modalPanel}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                {/* Close stays reachable while scrolling */}
                <div className={s.modalTopBar}>
                    <button type="button" onClick={onClose} className={s.modalCloseBtn} aria-label="Close project details" autoFocus>
                        <RiCloseLine />
                    </button>
                </div>

                {/* ── Photos ── */}
                <div className={s.modalGalleryMain}>
                    {activeImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img key={activeImage.url} src={activeImage.url} alt={`${proj.title} – ${activeImage.category || "photo"}`} onError={hideBrokenImg} onLoad={showLoadedImg} />
                    ) : (
                        <div className={s.mediaPlaceholder}><RiLayoutMasonryLine aria-hidden="true" /></div>
                    )}
                    <span className={`${s.statusPill} ${toneClass(status)}`}>
                        <span className={s.statusDot} aria-hidden="true" />
                        {status}
                    </span>
                    {imgCount > 1 && (
                        <>
                            <button type="button" className={`${s.galleryNav} ${s.galleryPrev}`} onClick={() => showImage(activeIndex - 1)} aria-label="Previous photo">
                                <RiArrowLeftSLine />
                            </button>
                            <button type="button" className={`${s.galleryNav} ${s.galleryNext}`} onClick={() => showImage(activeIndex + 1)} aria-label="Next photo">
                                <RiArrowRightSLine />
                            </button>
                            <span className={s.galleryCount} aria-live="polite">
                                {activeImage?.category && activeImage.category !== "Cover" ? `${activeImage.category} · ` : ""}
                                {activeIndex + 1} / {imgCount}
                            </span>
                        </>
                    )}
                </div>

                {imgCount > 1 && (
                    <div className={s.modalThumbStrip} role="tablist" aria-label="Project photos">
                        {galleryImages.map((img, i) => (
                            <button
                                type="button"
                                key={img.id ?? i}
                                role="tab"
                                aria-selected={i === activeIndex}
                                onClick={() => showImage(i)}
                                className={`${s.modalThumb} ${i === activeIndex ? s.modalThumbActive : ""}`}
                                title={img.category}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.url} alt="" />
                                {img.category && <span className={s.modalThumbLabel}>{img.category}</span>}
                            </button>
                        ))}
                    </div>
                )}

                <div className={s.modalBody}>
                    {/* ── Headline: name, place, price ── */}
                    <header className={s.modalHead}>
                        <div className={s.modalHeadMain}>
                            {proj.type && <span className={s.modalEyebrow}>{proj.type}</span>}
                            <h2 id={titleId} className={s.modalTitle}>{proj.title}</h2>
                            {proj.location && (
                                <p className={s.modalLoc}>
                                    <RiMapPin2Line aria-hidden="true" /> {proj.location}
                                </p>
                            )}
                        </div>
                        {proj.price && (
                            <div className={s.modalPriceCard}>
                                <span>Price</span>
                                <strong>{proj.price}</strong>
                                {configs.length > 0 && (
                                    <small>{configs.map((c) => c.type).filter(Boolean).join(" · ")}</small>
                                )}
                            </div>
                        )}
                    </header>

                    {(proj.reraNumber || proj.possessionDate) && (
                        <ul className={s.modalTrustRow}>
                            {proj.reraNumber && (
                                <li className={s.modalTrustRera}>
                                    <RiShieldCheckLine aria-hidden="true" />
                                    <span><small>Govt. registered (RERA)</small>{proj.reraNumber}</span>
                                </li>
                            )}
                            {proj.possessionDate && (
                                <li className={s.modalTrustDate}>
                                    <RiCalendarLine aria-hidden="true" />
                                    <span><small>Handover</small>{readyByText(proj.possessionDate)}</span>
                                </li>
                            )}
                        </ul>
                    )}

                    {/* ── Key numbers ── */}
                    {quickFacts.length > 0 && (
                        <dl className={s.modalFactsGrid}>
                            {quickFacts.map(({ key, label, Icon }) => {
                                const pct = key === "constructionProgress" ? progressPercent(proj[key]) : null;
                                return (
                                    <div key={key} className={s.modalFactItem}>
                                        <dt><Icon aria-hidden="true" /> {label}</dt>
                                        <dd>{proj[key]}</dd>
                                        {pct !== null && (
                                            <span className={s.modalProgress} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Construction progress">
                                                <span style={{ width: `${pct}%` }} />
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </dl>
                    )}

                    {proj.highlights && (
                        <section className={s.modalSection}>
                            <h3 className={s.modalSectionTitle}><RiFileList3Line aria-hidden="true" /> About this project</h3>
                            <p className={s.modalOverview}>{proj.highlights}</p>
                        </section>
                    )}

                    {configs.length > 0 && (
                        <section className={s.modalSection}>
                            <h3 className={s.modalSectionTitle}><RiHomeSmileLine aria-hidden="true" /> Home types &amp; prices</h3>
                            <div className={s.configTable} role="table" aria-label="Home types and prices">
                                <div className={s.configTableHead} role="row">
                                    <span role="columnheader">Home type</span>
                                    <span role="columnheader">Size</span>
                                    <span role="columnheader">Price</span>
                                </div>
                                {configs.map((cfg, i) => (
                                    <div key={cfg.id ?? i} className={s.configTableRow} role="row">
                                        <span role="cell" className={s.configTableType}>{cfg.type || "—"}</span>
                                        <span role="cell" className={s.configTableArea}>{cfg.area || "—"}</span>
                                        <span role="cell" className={s.configTablePrice}>{cfg.price || "On request"}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {amenities.length > 0 && (
                        <section className={s.modalSection}>
                            <h3 className={s.modalSectionTitle}><RiCheckboxCircleFill aria-hidden="true" /> Amenities <span className={s.modalCount}>{amenities.length}</span></h3>
                            <ul className={s.modalAmenityGrid}>
                                {amenities.map((am, i) => (
                                    <li key={`${am}-${i}`}><RiCheckLine aria-hidden="true" /> {am}</li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {neighborhood.length > 0 && (
                        <section className={s.modalSection}>
                            <h3 className={s.modalSectionTitle}><RiRoadMapLine aria-hidden="true" /> What&apos;s nearby</h3>
                            <PlacesPanel items={neighborhood} mapQuery={mapQuery} />
                        </section>
                    )}

                    <section className={s.modalSection}>
                        <h3 className={s.modalSectionTitle}><RiQuestionLine aria-hidden="true" /> Common questions</h3>
                        <div className={s.modalFaqList}>
                            {faq.map((item, i) => (
                                <details key={i} className={s.modalFaqItem}>
                                    <summary>
                                        <span>{item.q}</span>
                                        <RiArrowDownSLine className={s.modalFaqChevron} aria-hidden="true" />
                                    </summary>
                                    <p>{item.a}</p>
                                </details>
                            ))}
                        </div>
                    </section>
                </div>

                {/* ── Always-visible actions ── */}
                <div className={s.modalCtaBar}>
                    {proj.price && (
                        <div className={s.modalCtaPrice}>
                            <small>Price</small>
                            <strong>{proj.price}</strong>
                        </div>
                    )}
                    <div className={s.modalCtaBtns}>
                        {safeHref(proj.brochureUrl, { allowData: true }) && (
                            <a href={safeHref(proj.brochureUrl, { allowData: true })} download={proj.brochureName || "brochure"} className={s.modalBrochureBtn}>
                                <RiDownloadLine aria-hidden="true" /> Brochure
                            </a>
                        )}
                        <a href={contactHref} onClick={onClose} className={s.modalPrimaryBtn}>
                            <RiCalendarLine aria-hidden="true" /> Book a Site Visit
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ProjectsSection({ projects = [], neighborhood = [], mapQuery = "", isEditor = false }) {
    const [openProjectId, setOpenProjectId] = useState(null);
    const openProject = projects.find((p) => p.id === openProjectId) || null;
    const count = projects.length;
    return (
        <section id="projects" className={base.webSection}>
            <SectionHeading
                eyebrow="Signature Portfolio"
                title="Featured Developments"
                aside={count > 0 && <span className={base.webProjectsCountPill}>{plural(count, "Landmark Development", "Landmark Developments")}</span>}
            />
            {count > 0 ? (
                <div className={`${s.projectsGrid} ${count === 1 ? s.single : ""} ${count % 3 === 0 ? s.threeUp : ""}`}>
                    {projects.map((proj, i) => (
                        <ProjectCard key={proj.id ?? i} proj={proj} onViewDetails={() => setOpenProjectId(proj.id)} />
                    ))}
                </div>
            ) : (
                isEditor && (
                    <EmptyState
                        Icon={RiHomeSmileLine}
                        title="No Featured Projects Added Yet"
                        desc={'Click "+ Add New Project" in the "Projects" tab to showcase your signature developments, villas, and apartments.'}
                    />
                )
            )}
            {openProject && (
                <ProjectDetailModal
                    proj={openProject}
                    neighborhood={openProject.neighborhood && openProject.neighborhood.length > 0 ? openProject.neighborhood : neighborhood}
                    mapQuery={openProject.location || mapQuery}
                    onClose={() => setOpenProjectId(null)}
                />
            )}
        </section>
    );
}

/* ───────────── Floor Plans & Units ───────────── */

export function UnitsSection({ units = [], isEditor = false }) {
    const count = units.length;
    return (
        <section id="units" className={base.webSection} style={{ background: "#ffffff" }}>
            <SectionHeading
                eyebrow="Floor Plans & Pricing"
                title="Available Floor Plans & Units"
                aside={<span className={base.webMetaTag}>Direct Developer Pricing</span>}
            />
            {count > 0 ? (
                <div className={`${s.unitsGrid} ${count === 1 ? s.single : ""} ${count % 3 === 0 ? s.threeUp : ""}`}>
                    {units.map((unit, i) => {
                        const rooms = parseRooms(unit.rooms);
                        return (
                            <article key={unit.id ?? i} className={s.unitCard}>
                                <div className={`${s.unitMedia} ${unit.image ? "" : s.unitMediaEmpty}`}>
                                    {unit.image ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={unit.image} alt={unit.title} loading="lazy" onError={hideBrokenImg} onLoad={showLoadedImg} />
                                    ) : (
                                        <div className={s.mediaPlaceholder}><RiLayoutMasonryLine aria-hidden="true" /></div>
                                    )}
                                    <span className={`${s.statusPill} ${toneClass(unit.status || "Available")}`}>
                                        <span className={s.statusDot} aria-hidden="true" />
                                        {unit.status || "Available"}
                                    </span>
                                </div>

                                <div className={s.unitBody}>
                                    <h3 className={s.unitTitle}>{unit.title}</h3>

                                    {(rooms.length > 0 || unit.sqft) && (
                                        <ul className={s.unitSpecs}>
                                            {unit.sqft && (
                                                <li>
                                                    <RiRuler2Line aria-hidden="true" /> {unit.sqft}
                                                </li>
                                            )}
                                            {rooms.map(({ label, Icon }, j) => (
                                                <li key={j}>
                                                    <Icon aria-hidden="true" /> {label}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className={s.unitFooter}>
                                        {unit.price && (
                                            <div className={s.priceBlock}>
                                                <span className={s.priceLabel}>Price</span>
                                                <span className={s.unitPrice}>{unit.price}</span>
                                            </div>
                                        )}
                                        <a href="#contact" className={s.primaryBtn}>
                                            <RiCalendarLine aria-hidden="true" /> Book Site Visit
                                        </a>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                isEditor && (
                    <EmptyState
                        Icon={RiCalendarLine}
                        title="No Units or Floor Plans Listed Yet"
                        desc={'Add available configurations (1 BHK, 2 BHK, 3 BHK), square footage, and starting prices in the "Units" tab.'}
                    />
                )
            )}
        </section>
    );
}

/* ───────────── Neighborhood & Connectivity ───────────── */

/* Reusable list of nearby places (used by Landing + Detail templates) */
export function PlacesPanel({ items = [], mapQuery = "" }) {
    return (
    <div className={s.placesPanel}>
        <ul className={s.placesList}>
            {items.map((n, i) => {
                const d = parseDistance(n.distance);
                return (
                    <li key={n.id ?? i} className={s.placeRow}>
                        <span className={s.placeIcon}>{placeIcon(n.category, n.landmark)}</span>
                        <span className={s.placeText}>
                            <span className={s.placeName}>{n.landmark}</span>
                            {n.category && <span className={s.placeCat}>{n.category}</span>}
                        </span>
                        {n.distance && (
                            <span className={s.placeDist}>
                                <strong>{d.main}</strong>
                                {d.sub && (
                                    <small>
                                        {d.mode === "walk" ? <RiWalkLine aria-hidden="true" /> : d.mode === "drive" ? <RiCarLine aria-hidden="true" /> : null}
                                        {d.sub}
                                    </small>
                                )}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
        {mapQuery && (
            <a className={s.mapLink} href={mapsUrl(mapQuery)} target="_blank" rel="noopener noreferrer">
                <RiMapPin2Line aria-hidden="true" /> View location on Google Maps <RiArrowRightUpLine aria-hidden="true" />
            </a>
        )}
    </div>
    );
}


export function NeighborhoodSection({ items = [], mapQuery = "", isEditor = false }) {
    const count = items.length;
    return (
        <section id="location" className={base.webSection}>
            <SectionHeading
                eyebrow="Strategic Location"
                title="Neighborhood & Connectivity"
                aside={count > 0 && <span className={base.webProjectsCountPill}>{plural(count, "Key Proximity", "Key Proximities")}</span>}
            />
            {count > 0 ? (
                <PlacesPanel items={items} mapQuery={mapQuery} />
            ) : (
                isEditor && (
                    <EmptyState
                        Icon={RiRoadMapLine}
                        title="No Neighborhood Landmarks Added Yet"
                        desc={'Highlight proximity to transit hubs, railway stations, temples, hospitals, and airports in the "Location" tab.'}
                    />
                )
            )}
        </section>
    );
}

/* ───────────── Contact Developer ───────────── */

export function ContactSection({ data = {}, isEditor = false, contactSuccess = false, onSubmit }) {
    const uid = useId();
    const phoneDigits = String(data.phone || "").replace(/\D/g, "");
    const waDigits = String(data.whatsapp || "").replace(/\D/g, "");
    const address = data.fullAddress || data.headquarters || "";

    const channels = [
        {
            key: "phone",
            label: "Call the developer",
            value: data.phone ? `+91 ${data.phone}` : "",
            href: phoneDigits ? `tel:+91${phoneDigits}` : "",
            Icon: RiPhoneFill,
            tone: s.chPhone,
            hint: "Add phone number in editor",
        },
        {
            key: "whatsapp",
            label: "WhatsApp",
            value: data.whatsapp ? `+91 ${data.whatsapp}` : "",
            href: waDigits ? `https://wa.me/91${waDigits}` : "",
            Icon: RiWhatsappLine,
            tone: s.chWa,
            external: true,
            hint: "Add WhatsApp number in editor",
        },
        {
            key: "email",
            label: "Email",
            value: data.email || "",
            href: data.email ? `mailto:${data.email}` : "",
            Icon: RiMailLine,
            tone: s.chMail,
            hint: "Add email in editor",
        },
        {
            key: "address",
            label: "Office address",
            value: address,
            href: address ? mapsUrl(address) : "",
            Icon: RiMapPin2Line,
            tone: s.chMap,
            external: true,
            hint: "Add address in editor",
        },
    ].filter((c) => c.value || isEditor);

    return (
        <section id="contact" className={base.webSection} style={{ background: "#ffffff" }}>
            <SectionHeading
                eyebrow="Direct Developer Desk"
                title="Contact Developer & Schedule Visit"
                aside={
                    <span className={base.webReraPill}>
                        <RiShieldCheckLine /> Zero Brokerage Guaranteed
                    </span>
                }
            />

            <div className={s.contactLayout}>
                <div className={s.contactAside}>
                    <p className={s.contactIntro}>
                        Talk directly to {data.companyName || "the developer"} — no brokers, no middlemen. Pick whichever channel suits you.
                    </p>
                    <ul className={s.channelGrid}>
                        {channels.map((c) => {
                            const inner = (
                                <>
                                    <span className={`${s.channelIcon} ${c.tone}`}><c.Icon aria-hidden="true" /></span>
                                    <span className={s.channelText}>
                                        <span className={s.channelLabel}>{c.label}</span>
                                        <span className={c.value ? s.channelValue : s.channelHint}>{c.value || c.hint}</span>
                                    </span>
                                    {c.href && <RiArrowRightUpLine className={s.channelArrow} aria-hidden="true" />}
                                </>
                            );
                            return (
                                <li key={c.key}>
                                    {c.href ? (
                                        <a
                                            className={s.channelCard}
                                            href={c.href}
                                            {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                        >
                                            {inner}
                                        </a>
                                    ) : (
                                        <div className={`${s.channelCard} ${s.channelDisabled}`}>{inner}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <form onSubmit={onSubmit} className={s.formCard} aria-labelledby={`${uid}-title`}>
                    <div className={s.formHead}>
                        <span className={s.formHeadIcon} aria-hidden="true"><RiCalendarLine /></span>
                        <div>
                            <h3 id={`${uid}-title`} className={s.formTitle}>Schedule a Site Visit</h3>
                            <p className={s.formSub}>Share your details and the developer will call you back.</p>
                        </div>
                    </div>

                    {contactSuccess ? (
                        <div className={s.formSuccess} role="status">
                            <RiCheckboxCircleFill aria-hidden="true" />
                            <div>
                                <strong>Request received</strong>
                                <span>Thank you! A project advisor will contact you shortly.</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={s.fieldRow}>
                                <label className={s.field}>
                                    <span>Full name <em aria-hidden="true">*</em></span>
                                    <input type="text" name="name" autoComplete="name" placeholder="Your name" required />
                                </label>
                                <label className={s.field}>
                                    <span>Mobile number <em aria-hidden="true">*</em></span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        autoComplete="tel"
                                        inputMode="tel"
                                        placeholder="10-digit mobile"
                                        pattern="[0-9+\s\-]{10,15}"
                                        title="Enter a valid mobile number"
                                        required
                                    />
                                </label>
                            </div>
                            <label className={s.field}>
                                <span>Email <small>(optional)</small></span>
                                <input type="email" name="email" autoComplete="email" placeholder="you@example.com" />
                            </label>
                            <label className={s.field}>
                                <span>Requirement <small>(optional)</small></span>
                                <textarea name="message" rows={3} placeholder="E.g. 2 BHK, visit this weekend, budget…" />
                            </label>
                            <button type="submit" className={s.submitBtn}>
                                <RiSendPlaneLine aria-hidden="true" /> Send Enquiry to Developer
                            </button>
                            <p className={s.privacy}>
                                <RiLock2Line aria-hidden="true" /> Your details are shared only with {data.companyName || "this developer"}.
                            </p>
                        </>
                    )}
                </form>
            </div>
        </section>
    );
}
