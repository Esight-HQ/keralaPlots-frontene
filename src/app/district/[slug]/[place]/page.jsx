import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "../../../componants/nav/nav";
import Footer from "../../../componants/footer/footer";
import {
    KERALA_DISTRICTS,
    getDistrictBySlug,
    getPlaceBySlug,
    placeHref,
} from "../../../lib/keralaDistricts";
import { getPlaceSeoData } from "../../../lib/districtSeoContent";
import { DEFAULT_OG_IMAGE, SITE_URL } from "../../../lib/seoHelper";
import { DistrictListingCount, DistrictListings, DistrictViewAllLink, DistrictFaqAccordion } from "../DistrictLive";
import { districtScript as scriptFont } from "../districtFont";
import styles from "../district.module.css";
import { jsonLdHtml } from "../../../lib/jsonLd";

/* Town / area page inside a district, e.g. /district/ernakulam/kakkanad.
   Features full SEO content, 10 FAQs, and real estate keywords for the locality. */

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
    return KERALA_DISTRICTS.flatMap((d) => d.places.map((p) => ({ slug: d.slug, place: p.slug })));
}

const resolve = async (params) => {
    const { slug, place: placeSlug } = await params;
    const d = getDistrictBySlug(slug);
    const place = getPlaceBySlug(d, placeSlug);
    return { d, place };
};

export async function generateMetadata({ params }) {
    const { d, place } = await resolve(params);
    if (!d || !place) return { title: "Area not found | KeralaPlots", robots: { index: false, follow: false } };

    const seo = getPlaceSeoData(d, place);
    const title = `${place.name} Properties | KeralaPlots`;
    const description = seo.metaDescription;
    const canonical = `${SITE_URL}${placeHref(d, place)}`;

    return {
        metadataBase: new URL(SITE_URL),
        title,
        description,
        keywords: Array.from(new Set([
            ...seo.placeKeywords,
            ...seo.popularKeralaSearches.slice(0, 15),
            `property in ${place.name}`,
            `land for sale in ${place.name}`,
            `houses for sale in ${place.name}`,
            `plots in ${place.name}`,
            `${place.name} ${d.name} real estate`,
        ])),
        alternates: { canonical },
        openGraph: {
            type: "website",
            title,
            description,
            url: canonical,
            siteName: "KeralaPlots",
            locale: "en_IN",
            images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `Properties in ${place.name}` }],
        },
        twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
    };
}

export default async function PlacePage({ params }) {
    const { d, place } = await resolve(params);
    if (!d || !place) notFound();

    const seo = getPlaceSeoData(d, place);
    const nearby = d.places.filter((p) => p.slug !== place.slug);
    const faqs = seo.faqs;
    const canonical = `${SITE_URL}${placeHref(d, place)}`;

    const schema = [
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Properties", item: `${SITE_URL}/properties` },
                { "@type": "ListItem", position: 3, name: d.name, item: `${SITE_URL}/district/${d.slug}` },
                { "@type": "ListItem", position: 4, name: place.name, item: canonical },
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
                            <Link href={`/district/${d.slug}`}>{d.name}</Link>
                            <Chevron />
                            <span aria-current="page">{place.name}</span>
                        </nav>

                        <div className={styles.heroGrid}>
                            <div className={styles.heroText}>
                                <span className={styles.eyebrow}>
                                    <span className={styles.eyebrowCode}>
                                        <PinIcon />
                                        {d.short}
                                    </span>
                                    {d.name} district
                                </span>
                                <h1 className={styles.heroTitle}>
                                    <span className={styles.heroTitleLead}>Properties in</span>
                                    <span className={styles.heroTitleAccent}>{place.name}</span>
                                </h1>
                                <p className={styles.heroTagline}>{seo.heroTagline}</p>
                                <p className={styles.heroIntro}>{seo.heroIntro}</p>

                                <div className={styles.heroActions}>
                                    <DistrictViewAllLink district={d} place={place.name} className={styles.primaryBtn} />
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
                                    <img src={d.image} alt={`${place.name}, ${d.name}`} className={styles.heroImage} />
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
                                                <DistrictListingCount district={d} place={place.name} />
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
                                    <PinIcon />
                                </span>
                                <div className={styles.factText}>
                                    <dt>District</dt>
                                    <dd>
                                        <Link href={`/district/${d.slug}`} className={styles.factLink}>{d.name}</Link>
                                    </dd>
                                </div>
                                <span className={styles.factDecor} aria-hidden="true">
                                    <PinIcon />
                                </span>
                            </div>
                            <div className={`${styles.factItem} ${styles.factGreen}`}>
                                <span className={styles.factIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="m12 2 2.9 6.26L22 9.27l-5.2 4.93L18.18 21 12 17.27 5.82 21l1.38-6.8L2 9.27l7.1-1.01L12 2Z" /></svg>
                                </span>
                                <div className={styles.factText}>
                                    <dt>Known for</dt>
                                    <dd>{place.note}</dd>
                                </div>
                                <span className={styles.factDecor} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.26L22 9.27l-5.2 4.93L18.18 21 12 17.27 5.82 21l1.38-6.8L2 9.27l7.1-1.01L12 2Z" /></svg>
                                </span>
                            </div>
                            <div className={`${styles.factItem} ${styles.factBlue}`}>
                                <span className={styles.factIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M21 19h2v2H1v-2h2V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15h4v-8h-2V9h3a1 1 0 0 1 1 1v9ZM7 11v2h4v-2H7Zm0-4v2h4V7H7Z" /></svg>
                                </span>
                                <div className={styles.factText}>
                                    <dt>District HQ</dt>
                                    <dd>{d.hq}</dd>
                                </div>
                                <span className={styles.factDecor} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19h2v2H1v-2h2V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15h4v-8h-2V9h3a1 1 0 0 1 1 1v9ZM7 11v2h4v-2H7Zm0-4v2h4V7H7Z" /></svg>
                                </span>
                            </div>
                            <div className={`${styles.factItem} ${styles.factOrange}`}>
                                <span className={styles.factIcon} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M18.364 17.364 12 23.728l-6.364-6.364a9 9 0 1 1 12.728 0ZM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
                                </span>
                                <div className={styles.factText}>
                                    <dt>Nearby areas</dt>
                                    <dd>{nearby.length} in {d.name}</dd>
                                </div>
                                <span className={styles.factDecor} aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.364 17.364 12 23.728l-6.364-6.364a9 9 0 1 1 12.728 0ZM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
                                </span>
                            </div>
                        </dl>
                    </div>
                </section>

                {/* ---------- Listings (live) ---------- */}
                <section id="listings" className={styles.section}>
                    <div className={styles.container}>
                        <DistrictListings district={d} place={place.name} />
                    </div>
                </section>

                {/* ---------- Nearby areas ---------- */}
                <section id="places" className={`${styles.section} ${styles.sectionTinted}`}>
                    <div className={styles.container}>
                        <div className={styles.sectionHead}>
                            <div>
                                <h2 className={styles.sectionTitle}>Nearby areas in {d.name}</h2>
                                <p className={styles.sectionSubtitle}>Compare {place.name} with other popular areas in the district.</p>
                            </div>
                            <Link href={`/district/${d.slug}`} className={styles.secondaryBtn}>
                                All of {d.name}
                            </Link>
                        </div>
                        <ul className={styles.placeGrid}>
                            {nearby.map((p) => (
                                <li key={p.slug}>
                                    <Link href={placeHref(d, p)} className={styles.placeCard}>
                                        <span className={styles.placeIcon} aria-hidden="true">
                                            <PinIcon />
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
                            <p className={styles.aboutText}>
                                <Link href={`/district/${d.slug}`} className={styles.inlineLink}>
                                    Read the full {d.name} district real estate guide →
                                </Link>
                            </p>
                        </div>
                        <div className={styles.highlightCard}>
                            <h3 className={styles.highlightTitle}>Living in {d.name} district</h3>
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
                                Common questions about buying, selling and renting property in {place.name}, {d.name}.
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
                                <h2 className={styles.sectionTitle}>Popular real estate searches in {place.name}</h2>
                                <p className={styles.sectionSubtitle}>
                                    Explore trending searches, top property categories, and high-intent buyer queries in {place.name} and across Kerala.
                                </p>
                            </div>
                        </div>

                        <div className={styles.keywordsBlock}>
                            <h3 className={styles.keywordsSubhead}>Searches in {place.name}</h3>
                            <div className={styles.keywordChips}>
                                {seo.placeKeywords.map((kw, i) => (
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

                        {nearby.length > 0 && (
                            <div className={styles.keywordsBlock} style={{ marginTop: "32px" }}>
                                <h3 className={styles.keywordsSubhead}>Nearby Area Searches in {d.name}</h3>
                                <div className={styles.keywordChips}>
                                    {nearby.map((p, i) => (
                                        <Link
                                            key={`${p.slug}-${i}`}
                                            href={placeHref(d, p)}
                                            className={styles.keywordChip}
                                        >
                                            <span className={styles.keywordSearchIcon} aria-hidden="true">
                                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <path d="m21 21-4.3-4.3" />
                                                </svg>
                                            </span>
                                            <span>Properties in {p.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

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

                {/* ---------- CTA ---------- */}
                <section className={styles.section}>
                    <div className={styles.container}>
                        <div className={styles.ctaBanner} style={{ marginTop: 0 }}>
                            <div>
                                <h2 className={styles.ctaTitle}>Own property in {place.name}?</h2>
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
