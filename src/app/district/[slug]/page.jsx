import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "../../componants/nav/nav";
import Footer from "../../componants/footer/footer";
import {
    KERALA_DISTRICTS,
    getDistrictBySlug,
    getDistrictFaqs,
    placeHref,
} from "../../lib/keralaDistricts";
import { getDistrictSeoData } from "../../lib/districtSeoContent";
import { DEFAULT_OG_IMAGE, SITE_URL } from "../../lib/seoHelper";
import { DistrictListingCount, DistrictListings, DistrictViewAllLink, DistrictFaqAccordion } from "./DistrictLive";
import { districtScript as scriptFont } from "./districtFont";
import styles from "./district.module.css";
import { jsonLdHtml } from "../../lib/jsonLd";

const PinIcon = () => (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
        <path d="M18.364 17.364 12 23.728l-6.364-6.364a9 9 0 1 1 12.728 0ZM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
);

const Chevron = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export function generateStaticParams() {
    return KERALA_DISTRICTS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const d = getDistrictBySlug(slug);
    if (!d) return { title: "District not found | KeralaPlots", robots: { index: false, follow: false } };

    const seo = getDistrictSeoData(d);
    const title = `${d.name} Properties for Sale | KeralaPlots`;
    const description = seo.metaDescription;
    const canonical = `${SITE_URL}/district/${d.slug}`;

    return {
        metadataBase: new URL(SITE_URL),
        title,
        description,
        keywords: Array.from(new Set([
            ...seo.districtKeywords,
            ...seo.popularKeralaSearches.slice(0, 15),
            `property in ${d.name}`,
            `land for sale in ${d.name}`,
            `houses for sale in ${d.name}`,
            `plots in ${d.name}`,
            `${d.name} real estate`,
        ])),
        alternates: { canonical },
        openGraph: {
            type: "website",
            title,
            description,
            url: canonical,
            siteName: "KeralaPlots",
            locale: "en_IN",
            images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `Properties in ${d.name}` }],
        },
        twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
    };
}

const formatNumber = (n) => Number(n).toLocaleString("en-IN");

export default async function DistrictPage({ params }) {
    const { slug } = await params;
    const d = getDistrictBySlug(slug);
    if (!d) notFound();

    const seo = getDistrictSeoData(d);
    const faqs = seo.faqs;
    const others = KERALA_DISTRICTS.filter((x) => x.slug !== d.slug);
    const canonical = `${SITE_URL}/district/${d.slug}`;

    const schema = [
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Properties", item: `${SITE_URL}/properties` },
                { "@type": "ListItem", position: 3, name: d.name, item: canonical },
            ],
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q.replace(/^\d+\.\s*/, ""),
                acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
        },
    ];

    return (
        <div className={styles.page}>
            <Nav />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(schema) }} />

            <main>
                {/* ---------- Banner ---------- */}
                <section className={styles.hero}>
                    <div className={`${styles.container} ${styles.heroInner}`}>
                        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                            <Link href="/">Home</Link>
                            <Chevron />
                            <Link href="/properties">Properties</Link>
                            <Chevron />
                            <span aria-current="page">{d.name}</span>
                        </nav>

                        <div className={styles.heroGrid}>
                            <div className={styles.heroText}>
                                <span className={styles.eyebrow}>
                                    <span className={styles.eyebrowCode}>
                                        <PinIcon />
                                        {d.short}
                                    </span>
                                    District of Kerala
                                </span>
                                <h1 className={styles.heroTitle}>
                                    <span className={styles.heroTitleLead}>Properties in</span>
                                    <span className={styles.heroTitleAccent}>{d.name}</span>
                                </h1>
                                <p className={styles.heroTagline}>{seo.heroTagline}</p>
                                <p className={styles.heroIntro}>{seo.heroIntro}</p>

                                <div className={styles.heroActions}>
                                    <DistrictViewAllLink district={d} className={styles.primaryBtn} />
                                    <Link href="/post-property" className={styles.secondaryBtn}>
                                        <span className={styles.btnIcon} aria-hidden="true">
                                            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M21 20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.49a1 1 0 0 1 .39-.79l8-6.22a1 1 0 0 1 1.23 0l8 6.22a1 1 0 0 1 .38.79V20Z" /></svg>
                                        </span>
                                        Post your property
                                    </Link>
                                </div>
                            </div>

                            <div className={styles.heroMedia}>
                                <span className={styles.heroMediaBack} aria-hidden="true" />
                                <div className={styles.heroFrame}>
                                    <img src={d.image} alt={`${d.name}, Kerala`} className={styles.heroImage} />
                                    <span className={styles.heroBadge}>
                                        <PinIcon />
                                        {d.short}
                                    </span>
                                    <span className={`${styles.heroCaption} ${scriptFont.className}`}>
                                        {d.caption}
                                    </span>
                                    <a href="#listings" className={styles.heroFloatCard}>
                                        <span className={styles.heroFloatIcon} aria-hidden="true">
                                            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 8c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 13c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 18c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0" /></svg>
                                        </span>
                                        <span className={styles.heroFloatText}>
                                            <span className={styles.heroFloatLabel}>Live listings</span>
                                            <span className={styles.heroFloatValue}>
                                                <DistrictListingCount district={d} />
                                            </span>
                                        </span>
                                        <span className={styles.heroFloatArrow} aria-hidden="true">→</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <dl className={styles.factGrid}>
                            <div className={`${styles.factItem} ${styles.factPurple}`}>
                                <span className={styles.factIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M18.364 17.364 12 23.728l-6.364-6.364a9 9 0 1 1 12.728 0ZM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
                                </span>
                                <div className={styles.factText}>
                                    <dt>Headquarters</dt>
                                    <dd>{d.hq}</dd>
                                </div>
                                <span className={styles.factDecor} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.364 17.364 12 23.728l-6.364-6.364a9 9 0 1 1 12.728 0ZM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
                                </span>
                            </div>
                            <div className={`${styles.factItem} ${styles.factGreen}`}>
                                <span className={styles.factIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
                                </span>
                                <div className={styles.factText}>
                                    <dt>Area</dt>
                                    <dd>{formatNumber(d.areaKm2)} km²</dd>
                                </div>
                                <span className={styles.factDecor} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
                                </span>
                            </div>
                            <div className={`${styles.factItem} ${styles.factBlue}`}>
                                <span className={styles.factIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6.5 1.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 13c-3.3 0-6 1.8-6 4v3h12v-3c0-2.2-2.7-4-6-4Zm-7.4.9C2.5 14.2 1 15.4 1 17v3h3.5v-3c0-1.2.4-2.2 1.1-3.1h-1Zm14.8 0h-1c.7.9 1.1 1.9 1.1 3.1v3H23v-3c0-1.6-1.5-2.8-3.6-3.1Z" /></svg>
                                </span>
                                <div className={styles.factText}>
                                    <dt>Population</dt>
                                    <dd>
                                        {formatNumber(d.population)}
                                        <small> (2011)</small>
                                    </dd>
                                </div>
                                <span className={styles.factDecor} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6.5 1.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 13c-3.3 0-6 1.8-6 4v3h12v-3c0-2.2-2.7-4-6-4Z" /></svg>
                                </span>
                            </div>
                            <div className={`${styles.factItem} ${styles.factOrange}`}>
                                <span className={styles.factIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M21 19h2v2H1v-2h2V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15h4v-8h-2V9h3a1 1 0 0 1 1 1v9ZM7 11v2h4v-2H7Zm0-4v2h4V7H7Z" /></svg>
                                </span>
                                <div className={styles.factText}>
                                    <dt>Popular areas</dt>
                                    <dd>{d.places.length}+ towns</dd>
                                </div>
                                <span className={styles.factDecor} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19h2v2H1v-2h2V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15h4v-8h-2V9h3a1 1 0 0 1 1 1v9ZM7 11v2h4v-2H7Zm0-4v2h4V7H7Z" /></svg>
                                </span>
                            </div>
                        </dl>
                    </div>
                </section>

                {/* ---------- Listings (live) ---------- */}
                <section id="listings" className={styles.section}>
                    <div className={styles.container}>
                        <DistrictListings district={d} />
                    </div>
                </section>

                {/* ---------- Places inside the district ---------- */}
                <section id="places" className={`${styles.section} ${styles.sectionTinted}`}>
                    <div className={styles.container}>
                        <div className={styles.sectionHead}>
                            <div>
                                <h2 className={styles.sectionTitle}>Popular places in {d.name}</h2>
                                <p className={styles.sectionSubtitle}>Pick an area to see its listings, local details and FAQs.</p>
                            </div>
                        </div>
                        <ul className={styles.placeGrid}>
                            {d.places.map((p) => (
                                <li key={p.name}>
                                    <Link href={placeHref(d, p)} className={styles.placeCard}>
                                        <span className={styles.placeIcon} aria-hidden="true">
                                            <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
                                                <path d="M18.364 17.364 12 23.728l-6.364-6.364a9 9 0 1 1 12.728 0ZM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                                            </svg>
                                        </span>
                                        <span className={styles.placeText}>
                                            <span className={styles.placeName}>{p.name}</span>
                                            <span className={styles.placeNote}>{p.note}</span>
                                        </span>
                                        <span className={styles.placeArrow} aria-hidden="true">→</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* ---------- About ---------- */}
                <section id="about" className={styles.section}>
                    <div className={`${styles.container} ${styles.aboutGrid}`}>
                        <div>
                            <h2 className={styles.sectionTitle}>{seo.aboutTitle}</h2>
                            {seo.aboutParagraphs.map((para, pIdx) => (
                                <p key={pIdx} className={styles.aboutText}>
                                    {para}
                                </p>
                            ))}
                            <p className={styles.sourceNote}>Area and population: Census of India 2011.</p>
                        </div>
                        <div className={styles.highlightCard}>
                            <h3 className={styles.highlightTitle}>Why buy in {d.name}</h3>
                            <ul className={styles.highlightList}>
                                {d.highlights.map((h) => (
                                    <li key={h}>
                                        <span className={styles.checkIcon} aria-hidden="true">✓</span>
                                        {h}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ---------- FAQs ---------- */}
                <section id="faqs" className={`${styles.section} ${styles.sectionTinted}`}>
                    <div className={`${styles.container} ${styles.faqWrap}`}>
                        <div className={styles.faqIntro}>
                            <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
                            <p className={styles.sectionSubtitle}>
                                Common questions about buying, selling and renting property in {d.name}.
                            </p>
                        </div>
                        <DistrictFaqAccordion faqs={faqs} />
                    </div>
                </section>

                {/* ---------- Popular Searches & Real Estate Keywords ---------- */}
                <section id="searches" className={styles.section}>
                    <div className={styles.container}>
                        <div className={styles.sectionHead}>
                            <div>
                                <h2 className={styles.sectionTitle}>Popular real estate searches in {d.name}</h2>
                                <p className={styles.sectionSubtitle}>
                                    Explore trending searches, top property categories, and high-intent buyer queries in {d.name} and across Kerala.
                                </p>
                            </div>
                        </div>

                        <div className={styles.keywordsBlock}>
                            <h3 className={styles.keywordsSubhead}>Searches in {d.name}</h3>
                            <div className={styles.keywordChips}>
                                {seo.districtKeywords.map((kw, i) => (
                                    <Link
                                        key={`${kw}-${i}`}
                                        href={`/properties?search=${encodeURIComponent(kw)}`}
                                        className={styles.keywordChip}
                                    >
                                        <span className={styles.keywordSearchIcon} aria-hidden="true">
                                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                <circle cx="11" cy="11" r="8" />
                                                <path d="m21 21-4.3-4.3" />
                                            </svg>
                                        </span>
                                        <span>{kw}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className={styles.keywordsBlock} style={{ marginTop: "32px" }}>
                            <h3 className={styles.keywordsSubhead}>Trending Property Searches in Kerala</h3>
                            <div className={styles.keywordChips}>
                                {seo.popularKeralaSearches.map((kw, i) => (
                                    <Link
                                        key={`${kw}-${i}`}
                                        href={`/properties?search=${encodeURIComponent(kw)}`}
                                        className={styles.keywordChip}
                                    >
                                        <span className={styles.keywordSearchIcon} aria-hidden="true">
                                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                <circle cx="11" cy="11" r="8" />
                                                <path d="m21 21-4.3-4.3" />
                                            </svg>
                                        </span>
                                        <span>{kw}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- Other districts ---------- */}
                <section className={styles.section}>
                    <div className={styles.container}>
                        <div className={styles.sectionHead}>
                            <h2 className={styles.sectionTitle}>Explore other districts</h2>
                        </div>
                        <ul className={styles.otherGrid}>
                            {others.map((o) => (
                                <li key={o.slug}>
                                    <Link href={`/district/${o.slug}`} className={styles.otherCard}>
                                        <img src={o.image} alt="" loading="lazy" className={styles.otherImage} />
                                        <span className={styles.otherName}>{o.label}</span>
                                        <span className={styles.otherCode}>{o.short}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className={styles.ctaBanner}>
                            <div>
                                <h2 className={styles.ctaTitle}>Own property in {d.name}?</h2>
                                <p className={styles.ctaText}>List it on KeralaPlots and reach buyers and tenants across Kerala and abroad.</p>
                            </div>
                            <Link href="/post-property" className={styles.ctaBtn}>
                                Post your property
                            </Link>
                        </div>

                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
