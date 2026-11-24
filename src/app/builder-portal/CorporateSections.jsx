"use client";

/*
 * Shared "Corporate" (template 3) sections used by BOTH the Builder Portal live preview
 * and the public builder page, so the two always render identically.
 * Pass `isEditor` from the portal to show empty states / "add in editor" hints.
 */

import { useId, useState } from "react";
import base from "./builderPortal.module.css";
import l from "./landingSections.module.css";
import c from "./corporateSections.module.css";
import { splitSpecDetails, specPhoto } from "./specHelpers";
import {
    PlacesPanel,
    ProjectDetailModal,
    parseRooms,
    toneClass,
    plural,
    mapsUrl,
    hideBrokenImg,
    showLoadedImg,
    bankInitials,
    bankColor,
} from "./LandingSections";
import {
    RiBuilding2Line,
    RiRoadMapLine,
    RiHomeSmileLine,
    RiCalendarLine,
    RiFileList3Line,
    RiMapPin2Line,
    RiShieldCheckLine,
    RiBankLine,
    RiPhoneFill,
    RiWhatsappLine,
    RiMailLine,
    RiArrowRightLine,
    RiArrowRightUpLine,
    RiArrowDownSLine,
    RiCheckLine,
    RiCheckboxCircleFill,
    RiSendPlaneLine,
    RiLock2Line,
    RiRuler2Line,
    RiLayoutMasonryLine,
    RiDoubleQuotesL,
    RiBuilding4Line,
    RiBriefcase4Line,
    RiInformationLine,
    RiImageLine,
} from "react-icons/ri";

export const CORPORATE_CONTACT_ANCHOR = "t3-contact";

/* ───────────── shared bits ───────────── */

const Header = ({ title, desc, badge, emerald = false }) => (
    <div className={base.t3SectionHeader}>
        <div className={`${base.t3SectionHeadingGroup} ${c.headingGroup}`}>
            <h2 className={base.t3SectionTitle}>{title}</h2>
            <span className={base.t3TitleAccent} aria-hidden="true" />
            {desc && <p className={c.sectionDesc}>{desc}</p>}
        </div>
        {badge && <span className={`${emerald ? base.t3SectionBadgeEmerald : base.t3SectionBadge} ${c.badge}`}>{badge}</span>}
    </div>
);

/* "+91" is added only when the stored number doesn't already carry a country code. */
const displayPhone = (raw = "") => {
    const v = String(raw).trim();
    return v.startsWith("+") ? v : `+91 ${v}`;
};
const dialDigits = (raw = "") => {
    const d = String(raw).replace(/\D/g, "");
    return d.length > 10 && d.startsWith("91") ? d : `91${d}`;
};

const Empty = ({ Icon, title, desc }) => (
    <div className={base.emptyStateBox} style={{ margin: 0 }}>
        {Icon && <Icon className={base.emptyStateIcon} />}
        <p className={base.emptyStateTitle}>{title}</p>
        <p className={base.emptyStateDesc}>{desc}</p>
    </div>
);

const sectionCls = `${base.t3Section} ${c.section}`;

/* ───────────── Trust numbers (right under the hero) ───────────── */

const CURRENT_YEAR = new Date().getFullYear();

/* "25+ Projects" -> "25+" ; "2.4M+ Sq. Ft." -> "2.4M+" ; anything without a number is shown whole. */
const leadNumber = (v = "") => {
    const first = String(v).trim().split(/\s+/)[0] || "";
    return /\d/.test(first) ? first : String(v).trim();
};

export function CorporateTrustStats({ data = {} }) {
    const stats = data.stats || {};
    const year = parseInt(data.establishedYear, 10);
    const years = year && year <= CURRENT_YEAR ? CURRENT_YEAR - year : null;

    const items = [
        years > 0 && { value: `${years}+`, label: "Years of experience" },
        stats.completedProjects && { value: leadNumber(stats.completedProjects), label: "Projects completed" },
        stats.happyFamilies && { value: leadNumber(stats.happyFamilies), label: "Happy families" },
        stats.ongoingProjects && { value: leadNumber(stats.ongoingProjects), label: "Ongoing projects" },
        stats.deliveredSqFt && { value: leadNumber(stats.deliveredSqFt), label: "Sq. ft. built" },
    ].filter(Boolean);

    if (!items.length) return null;

    return (
        <section className={c.trust} aria-label="Builder track record">
            <ul className={c.trustList}>
                {items.map(({ value, label }) => (
                    <li key={label} className={c.trustItem}>
                        <strong>{value}</strong>
                        <span>{label}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/* Jump links so visitors can go straight to what they came for. */
export function CorporateQuickNav({ data = {}, isEditor = false }) {
    const has = (arr) => isEditor || (arr && arr.length > 0);
    const kf = data.keyFacts || {};
    const links = [
        has(data.projects) && { href: "#t3-projects", label: "Projects", Icon: RiHomeSmileLine },
        has(data.properties) && { href: "#t3-units", label: "Floor Plans & Prices", Icon: RiLayoutMasonryLine },
        has(data.specifications) && { href: "#t3-specs", label: "Building Quality", Icon: RiFileList3Line },
        (isEditor || data.about) && { href: "#t3-overview", label: "About Us", Icon: RiInformationLine },
        { href: `#${CORPORATE_CONTACT_ANCHOR}`, label: "Contact", Icon: RiPhoneFill },
    ].filter(Boolean);

    return (
        <nav className={c.quickNav} aria-label="Jump to section">
            <span className={c.quickNavLabel}>Jump to:</span>
            <ul className={c.quickNavList}>
                {links.map(({ href, label, Icon }) => (
                    <li key={href}>
                        <a href={href} className={c.quickNavLink}>
                            <Icon aria-hidden="true" /> {label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

/* ───────────── Key facts ───────────── */

const FACTS = [
    { key: "landArea", label: "Land area", Icon: RiRoadMapLine },
    { key: "towers", label: "Towers & floors", Icon: RiBuilding2Line },
    { key: "totalUnits", label: "Total homes", Icon: RiHomeSmileLine },
    { key: "possession", label: "Ready by", Icon: RiCalendarLine },
];

export function CorporateKeyFacts({ keyFacts = {}, reraNumber = "", isEditor = false }) {
    // Hidden per request: "hide the Project at a Glance from website"
    return null;
}

/* ───────────── Overview / executive statement ───────────── */

export function CorporateOverview({ data = {}, isEditor = false }) {
    const [expanded, setExpanded] = useState(false);
    const textId = useId();
    const about = data.about || "";
    const isLong = about.length > 520;

    const profile = [
        data.companyName && { Icon: RiBuilding4Line, label: "Company", value: data.companyName },
        data.headquarters && { Icon: RiMapPin2Line, label: "Based in", value: data.headquarters },
        data.builderType && { Icon: RiBriefcase4Line, label: "What we build", value: data.builderType },
        data.establishedYear && { Icon: RiCalendarLine, label: "In business since", value: data.establishedYear },
        data.reraNumber && { Icon: RiShieldCheckLine, label: "Govt. registration (K-RERA)", value: data.reraNumber, green: true },
    ].filter(Boolean);

    if (!about && !profile.length && !isEditor) return null;

    return (
        <section id="t3-overview" className={sectionCls}>
            <Header
                title={data.companyName ? `About ${data.companyName}` : "About the Builder"}
                desc="Who we are and how we work."
                badge={data.establishedYear ? `Since ${data.establishedYear}` : null}
            />

            <div className={`${c.overview} ${profile.length ? "" : c.overviewSolo}`}>
                {about ? (
                    <figure className={c.statement}>
                        <RiDoubleQuotesL className={c.quoteMark} aria-hidden="true" />
                        <blockquote id={textId} className={`${c.statementText} ${isLong && !expanded ? c.clamped : ""}`}>
                            {about}
                        </blockquote>
                        <figcaption className={c.statementFoot}>
                            {data.companyName && <span>— {data.companyName}</span>}
                            {isLong && (
                                <button
                                    type="button"
                                    className={c.readMore}
                                    aria-expanded={expanded}
                                    aria-controls={textId}
                                    onClick={() => setExpanded((v) => !v)}
                                >
                                    {expanded ? "Show less" : "Read more"}
                                    <RiArrowDownSLine aria-hidden="true" className={expanded ? c.flip : ""} />
                                </button>
                            )}
                        </figcaption>
                    </figure>
                ) : (
                    isEditor && (
                        <Empty
                            title="No Company Description Added Yet"
                            desc={'Write a short introduction about your company in the "Details & Key Facts" section.'}
                        />
                    )
                )}

                {profile.length > 0 && (
                    <aside className={c.profile} aria-label="Company profile">
                        <span className={c.profileTitle}><RiInformationLine aria-hidden="true" /> Company details</span>
                        <dl>
                            {profile.map(({ Icon, label, value, green }) => (
                                <div key={label} className={c.profileRow}>
                                    <dt><Icon aria-hidden="true" /> {label}</dt>
                                    <dd className={green ? c.green : ""}>{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </aside>
                )}
            </div>
        </section>
    );
}

/* ───────────── Specifications ───────────── */

export function CorporateSpecs({ specifications = [], isEditor = false }) {
    if (!specifications.length && !isEditor) return null;
    return (
        <section id="t3-specs" className={sectionCls}>
            <Header
                title="Building Quality & Materials"
                desc="What goes into every home: structure, flooring, fittings and more."
            />
            {specifications.length > 0 ? (
                <ol className={c.specList}>
                    {specifications.map((spec, i) => {
                        const points = splitSpecDetails(spec.details);
                        return (
                            <li key={spec.id ?? i} className={c.spec}>
                                <span className={c.specImage}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={spec.image || specPhoto(spec.category)} alt={spec.category} loading="lazy" onError={hideBrokenImg} onLoad={showLoadedImg} />
                                </span>
                                <div className={c.specBody}>
                                    <h3 className={c.specTitle}>{spec.category}</h3>
                                    {points.length > 1 ? (
                                        <ul className={c.specPoints}>
                                            {points.map((p, j) => (
                                                <li key={j}><RiCheckLine aria-hidden="true" /> {p}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className={c.specText}>{spec.details}</p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <Empty
                    Icon={RiFileList3Line}
                    title="No Building Specifications Added Yet"
                    desc={'List structure, flooring, fittings and electrical details in the "Building Specifications" section.'}
                />
            )}
        </section>
    );
}

/* ───────────── Featured developments ───────────── */

export function CorporateProjects({ projects = [], neighborhood = [], mapQuery = "", isEditor = false }) {
    const [openProjectId, setOpenProjectId] = useState(null);
    const openProject = projects.find((p) => p.id === openProjectId) || null;
    if (!projects.length && !isEditor) return null;
    const count = projects.length;
    return (
        <section id="t3-projects" className={sectionCls}>
            <Header
                title="Our Projects"
                desc="Tap “View Details” to see photos, prices and amenities of each project."
                badge={count ? plural(count, "Project", "Projects") : null}
            />
            {count > 0 ? (
                <div className={`${c.projGrid} ${count === 1 ? c.single : ""} ${count % 3 === 0 ? c.threeUp : ""}`}>
                    {projects.map((proj, i) => {
                        const cover = proj.image || proj.gallery?.[0]?.url || "";
                        const photoCount = (proj.image ? 1 : 0) + (proj.gallery || []).filter((g) => g.url && g.url !== proj.image).length;
                        const amen = proj.amenities || [];
                        const types = (proj.configurations || []).map((c) => c.type).filter(Boolean);
                        const open = () => setOpenProjectId(proj.id);
                        const ready = proj.possessionDate
                            ? (/ready|possession|handover/i.test(proj.possessionDate) ? proj.possessionDate : `Ready by ${proj.possessionDate}`)
                            : "";
                        return (
                        <article key={proj.id ?? i} className={c.proj}>
                            <button type="button" className={c.projMedia} onClick={open} aria-label={`View photos and details of ${proj.title}`}>
                                {cover ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={cover} alt="" loading="lazy" onError={hideBrokenImg} onLoad={showLoadedImg} />
                                ) : (
                                    <span className={l.mediaPlaceholder}><RiLayoutMasonryLine aria-hidden="true" /></span>
                                )}
                                {proj.status && (
                                    <span className={`${l.statusPill} ${toneClass(proj.status)}`}>
                                        <span className={l.statusDot} aria-hidden="true" />
                                        {proj.status}
                                    </span>
                                )}
                                {photoCount > 1 && (
                                    <span className={c.projPhotos}><RiImageLine aria-hidden="true" /> {photoCount} photos</span>
                                )}
                            </button>

                            <div className={c.projBody}>
                                <div className={c.projHead}>
                                    {proj.type && <span className={c.projType}>{proj.type}</span>}
                                    <h3 className={c.projTitle}>
                                        <button type="button" onClick={open} className={c.projTitleBtn}>{proj.title}</button>
                                    </h3>
                                    {proj.location && (
                                        <p className={c.projLoc}><RiMapPin2Line aria-hidden="true" /> {proj.location}</p>
                                    )}
                                </div>

                                {(ready || proj.reraNumber || types.length > 0) && (
                                    <ul className={c.projFacts}>
                                        {types.length > 0 && (
                                            <li><RiHomeSmileLine aria-hidden="true" /> <span>{types.join(" · ")}</span></li>
                                        )}
                                        {ready && (
                                            <li><RiCalendarLine aria-hidden="true" /> <span>{ready}</span></li>
                                        )}
                                        {proj.reraNumber && (
                                            <li className={c.projRera} title={`K-RERA: ${proj.reraNumber}`}>
                                                <RiShieldCheckLine aria-hidden="true" />
                                                <span>RERA registered <small>{proj.reraNumber}</small></span>
                                            </li>
                                        )}
                                    </ul>
                                )}

                                {proj.highlights && <p className={c.projDesc}>{proj.highlights}</p>}

                                {amen.length > 0 && (
                                    <ul className={c.projAmen} aria-label="Top amenities">
                                        {amen.slice(0, 3).map((a, j) => <li key={j}><RiCheckLine aria-hidden="true" /> {a}</li>)}
                                        {amen.length > 3 && (
                                            <li className={c.more}>
                                                <button type="button" onClick={open}>+{amen.length - 3} more</button>
                                            </li>
                                        )}
                                    </ul>
                                )}

                                {proj.neighborhood && proj.neighborhood.length > 0 && (
                                    <div className={c.projNearbyBox}>
                                        <span className={c.projNearbyHeader}>
                                            <RiRoadMapLine aria-hidden="true" /> Neighborhood &amp; Distances
                                        </span>
                                        <ul className={c.projNearbyList}>
                                            {proj.neighborhood.slice(0, 3).map((n, ni) => (
                                                <li key={n.id || ni} className={c.projNearbyPill}>
                                                    <span className={c.projNearbyName}>{n.landmark}</span>
                                                    {n.distance && <span className={c.projNearbyDist}>{n.distance}</span>}
                                                </li>
                                            ))}
                                            {proj.neighborhood.length > 3 && (
                                                <li>
                                                    <button type="button" onClick={open} className={c.projNearbyMore}>
                                                        +{proj.neighborhood.length - 3} more
                                                    </button>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                <div className={c.projFoot}>
                                    <div className={c.projPriceRow}>
                                        <span className={c.projPriceLabel}>Price</span>
                                        <span className={c.projPrice}>{proj.price || "Price on request"}</span>
                                    </div>
                                    <div className={c.projFootActions}>
                                        <button type="button" onClick={open} className={c.projBtnGhost}>
                                            View Details
                                        </button>
                                        <a href={`#${CORPORATE_CONTACT_ANCHOR}`} className={c.projBtnPrimary}>
                                            Enquire <RiArrowRightLine aria-hidden="true" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </article>
                        );
                    })}
                </div>
            ) : (
                <Empty
                    Icon={RiHomeSmileLine}
                    title="No Projects Added Yet"
                    desc={'Add your projects in the "Featured Projects" section.'}
                />
            )}
            {openProject && (
                <ProjectDetailModal
                    proj={openProject}
                    neighborhood={openProject.neighborhood && openProject.neighborhood.length > 0 ? openProject.neighborhood : neighborhood}
                    mapQuery={openProject.location || mapQuery}
                    contactHref={`#${CORPORATE_CONTACT_ANCHOR}`}
                    onClose={() => setOpenProjectId(null)}
                />
            )}
        </section>
    );
}

/* ───────────── Inventory (units) ───────────── */

export function CorporateUnits({ units = [], isEditor = false }) {
    if (!units.length && !isEditor) return null;
    return (
        <section id="t3-units" className={sectionCls}>
            <Header
                title="Floor Plans & Prices"
                desc="Home types you can book now, with size, rooms and price. No brokerage."
                badge={units.length ? plural(units.length, "Home type", "Home types") : null}
            />
            {units.length > 0 ? (
                <div className={c.inventory} role="table" aria-label="Available units">
                    <div className={c.invHead} role="row">
                        <span role="columnheader">Home type</span>
                        <span role="columnheader">Size</span>
                        <span role="columnheader">Rooms</span>
                        <span role="columnheader">Price</span>
                        <span role="columnheader"><span className={c.srOnly}>Action</span></span>
                    </div>
                    {units.map((u, i) => {
                        const rooms = parseRooms(u.rooms);
                        return (
                            <div key={u.id ?? i} className={c.invRow} role="row">
                                <div className={c.invUnit} role="cell">
                                    <span className={c.invThumb}>
                                        {u.image ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={u.image} alt="" loading="lazy" onError={hideBrokenImg} onLoad={showLoadedImg} />
                                        ) : (
                                            <RiLayoutMasonryLine aria-hidden="true" />
                                        )}
                                    </span>
                                    <span className={c.invUnitText}>
                                        <strong>{u.title}</strong>
                                        <span className={`${c.invStatus} ${toneClass(u.status || "Available")}`}>
                                            <span className={l.statusDot} aria-hidden="true" />
                                            {u.status || "Available"}
                                        </span>
                                    </span>
                                </div>
                                <div className={c.invCell} role="cell" data-label="Size">
                                    {u.sqft ? <><RiRuler2Line aria-hidden="true" /> {u.sqft}</> : "—"}
                                </div>
                                <div className={c.invCell} role="cell" data-label="Rooms">
                                    {rooms.length ? rooms.map((r) => r.label).join(" · ") : "—"}
                                </div>
                                <div className={`${c.invCell} ${c.invPrice}`} role="cell" data-label="Price">
                                    {u.price || "On request"}
                                </div>
                                <div className={c.invAction} role="cell">
                                    <a href={`#${CORPORATE_CONTACT_ANCHOR}`} className={c.darkBtn}>
                                        Get floor plan
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <Empty
                    Icon={RiCalendarLine}
                    title="No Units or Floor Plans Added Yet"
                    desc={'Add home types with size and price in the "Available Units & Floor Plans" section.'}
                />
            )}
        </section>
    );
}

/* ───────────── Neighborhood ───────────── */

export function CorporateNeighborhood({ items = [], mapQuery = "", isEditor = false }) {
    // Neighborhood & Distances are now managed and displayed directly under each project
    return null;
}

/* ───────────── Contact ───────────── */

export function CorporateContact({ data = {}, isEditor = false, contactSuccess = false, onSubmit }) {
    const uid = useId();
    const phoneDigits = String(data.phone || "").replace(/\D/g, "");
    const waDigits = String(data.whatsapp || "").replace(/\D/g, "");
    const address = data.fullAddress || data.headquarters || "";

    const channels = [
        phoneDigits && { key: "p", Icon: RiPhoneFill, label: "Call us", value: displayPhone(data.phone), href: `tel:+${dialDigits(data.phone)}` },
        waDigits && { key: "w", Icon: RiWhatsappLine, label: "Chat on WhatsApp", value: displayPhone(data.whatsapp), href: `https://wa.me/${dialDigits(data.whatsapp)}`, ext: true },
        data.email && { key: "e", Icon: RiMailLine, label: "Email us", value: data.email, href: `mailto:${data.email}` },
        address && { key: "a", Icon: RiMapPin2Line, label: "Visit our office", value: address, href: mapsUrl(address), ext: true },
    ].filter(Boolean);

    return (
        <section id={CORPORATE_CONTACT_ANCHOR} className={sectionCls}>
            <div className={c.contact}>
                <div className={c.contactInfo}>
                    <h2 className={c.contactTitle}>Talk to {data.companyName || "the builder"}</h2>
                    <p className={c.contactDesc}>
                        Have a question about price, floor plans or loans? Call, WhatsApp or send your details and our
                        team will call you back. You deal directly with the builder, no brokers.
                    </p>

                    {channels.length > 0 ? (
                        <ul className={c.channels}>
                            {channels.map(({ key, Icon, label, value, href, ext }) => (
                                <li key={key}>
                                    <a
                                        href={href}
                                        className={c.channel}
                                        {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                    >
                                        <span className={c.channelIcon}><Icon aria-hidden="true" /></span>
                                        <span className={c.channelText}>
                                            <small>{label}</small>
                                            <span>{value}</span>
                                        </span>
                                        <RiArrowRightUpLine className={c.channelArrow} aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        isEditor && (
                            <p className={c.contactHint}>
                                Add phone, WhatsApp, email and address in the Contact editor tab.
                            </p>
                        )
                    )}

                    <ul className={c.assurances}>
                        <li><RiCheckboxCircleFill aria-hidden="true" /> No brokerage</li>
                        {data.reraNumber && <li><RiCheckboxCircleFill aria-hidden="true" /> K-RERA registered</li>}
                        <li><RiCheckboxCircleFill aria-hidden="true" /> Verified developer</li>
                    </ul>
                </div>

                <form onSubmit={onSubmit} className={c.form} aria-labelledby={`${uid}-t`}>
                    <h3 id={`${uid}-t`} className={c.formTitle}>
                        <RiCalendarLine aria-hidden="true" /> Book a free site visit
                    </h3>
                    <p className={c.formSub}>Fill in 2 details. We will call you to fix a time that suits you.</p>
                    {contactSuccess ? (
                        <div className={c.success} role="status">
                            <RiCheckboxCircleFill aria-hidden="true" />
                            <span><strong>Thank you!</strong> We have your details and will call you soon.</span>
                        </div>
                    ) : (
                        <>
                            <div className={c.fieldRow}>
                                <label className={c.field}>
                                    <span>Your name <em aria-hidden="true">*</em></span>
                                    <input type="text" name="name" autoComplete="name" placeholder="Your name" required />
                                </label>
                                <label className={c.field}>
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
                            <div className={c.fieldRow}>
                                <label className={c.field}>
                                    <span>Preferred Visit Time <small>(optional)</small></span>
                                    <input type="text" name="visit" placeholder="e.g. Saturday afternoon / 11:00 AM" />
                                </label>
                            </div>
                            <label className={c.field}>
                                <span>Message <small>(optional)</small></span>
                                <textarea name="message" rows={2} placeholder="E.g. Looking for a 3 BHK, budget ₹1 Cr" />
                            </label>
                            <button type="submit" className={c.submit}>
                                <RiSendPlaneLine aria-hidden="true" /> Request a Call Back
                            </button>
                            <p className={c.privacy}>
                                <RiLock2Line aria-hidden="true" /> Shared only with {data.companyName || "this developer"}.
                            </p>
                        </>
                    )}
                </form>
            </div>
        </section>
    );
}
