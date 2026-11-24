"use client";

import { useEffect } from "react";
import styles from "./propertyDetail.module.css";
import {
    RiSparkling2Fill,
    RiCloseLine,
    RiCheckboxCircleLine,
    RiMapPin2Line,
    RiLightbulbFlashLine,
} from "react-icons/ri";

/* Split out of PropertyDetailClient.jsx so it loads as its own chunk, only when needed. */
export default function PropertySummaryModal({
    aiSummary,
    closeSummary,
    summaryCloseRef,
}) {
    // Focus the close button on open (also covers the very first open, when
    // this chunk may still have been downloading as the parent's effect ran).
    useEffect(() => {
        summaryCloseRef.current?.focus();
    }, [summaryCloseRef]);

    return (
        <div
            className={styles.reportOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="aiSummaryTitle"
            onClick={closeSummary}
        >
            <div className={styles.summaryCard} onClick={(e) => e.stopPropagation()}>
                <div className={styles.summaryHead}>
                    <div className={styles.summaryHeadText}>
                        <span className={styles.summaryBadge}>
                            <RiSparkling2Fill aria-hidden="true" /> AI Summary
                        </span>
                        <h2 className={styles.summaryTitle} id="aiSummaryTitle">
                            {aiSummary.headline}
                        </h2>
                    </div>
                    <button
                        type="button"
                        ref={summaryCloseRef}
                        className={styles.reportClose}
                        onClick={closeSummary}
                        aria-label="Close summary"
                    >
                        <RiCloseLine />
                    </button>
                </div>
        
                {aiSummary.overview && <p className={styles.summaryOverview}>{aiSummary.overview}</p>}
        
                {aiSummary.facts.length > 0 && (
                    <section className={styles.summarySection}>
                        <h3 className={styles.summaryHeading}>Key facts</h3>
                        <dl className={styles.summaryFacts}>
                            {aiSummary.facts.map(({ label, value }) => (
                                <div key={label} className={styles.summaryFact}>
                                    <dt>{label}</dt>
                                    <dd>{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}
        
                {aiSummary.highlights.length > 0 && (
                    <section className={styles.summarySection}>
                        <h3 className={styles.summaryHeading}>Highlights</h3>
                        <ul className={styles.summaryList}>
                            {aiSummary.highlights.map((item) => (
                                <li key={item}>
                                    <RiCheckboxCircleLine aria-hidden="true" className={styles.summaryIconGood} />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
        
                {aiSummary.nearby.length > 0 && (
                    <section className={styles.summarySection}>
                        <h3 className={styles.summaryHeading}>Nearby</h3>
                        <ul className={styles.summaryList}>
                            {aiSummary.nearby.map(({ name, distance }) => (
                                <li key={name}>
                                    <RiMapPin2Line aria-hidden="true" className={styles.summaryIconPlace} />
                                    <span>{name}</span>
                                    {distance && <span className={styles.summaryDistance}>{distance}</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
        
                {aiSummary.checks.length > 0 && (
                    <section className={`${styles.summarySection} ${styles.summaryChecks}`}>
                        <h3 className={styles.summaryHeading}>
                            <RiLightbulbFlashLine aria-hidden="true" /> Worth confirming
                        </h3>
                        <ul className={styles.summaryList}>
                            {aiSummary.checks.map((item) => (
                                <li key={item}>
                                    <span className={styles.summaryDot} aria-hidden="true" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
        
        
            </div>
        </div>
    );
}
