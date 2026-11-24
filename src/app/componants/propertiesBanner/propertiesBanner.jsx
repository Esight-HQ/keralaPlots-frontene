import styles from "./propertiesBanner.module.css";

/* Fallback heading font defined in globals.css (loaded via Google Fonts import or serif fallback) */
const headingFallback = {
    variable: "font-banner-fallback",
    className: "font-banner-fallback",
};

export default function PropertiesBanner({
    eyebrow = "Properties in Kerala",
    title = "Find Your Perfect Property in Kerala",
    subtitle = "Discover verified properties across Kerala – from cozy apartments to scenic plots, all in one place.",
    image = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/f45dc2ca-f2e8-436d-a3d9-e1a6d7badf00/public",
    headingLevel = "h2",
}) {
    const Heading = headingLevel;
    return (
        <section className={`${styles.banner} ${headingFallback.variable}`} aria-label={eyebrow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className={styles.bgImage} fetchPriority="high" decoding="async" />
            <div className={styles.overlay} aria-hidden="true" />

            <div className={styles.content}>
                <span className={styles.eyebrow}>{eyebrow}</span>
                <Heading className={styles.title}>{title}</Heading>
                <p className={styles.subtitle}>{subtitle}</p>
            </div>
        </section>
    );
}
