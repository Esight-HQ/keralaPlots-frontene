"use client";

import Link from "next/link";
import { useMemo } from "react";
import { KERALA_DISTRICTS, districtForKey, placeHref } from "../lib/keralaDistricts";
import styles from "./propertyAreaGuide.module.css";

/* "About the area" card on the property detail page: works out the listing's
   district (and town, when it is one of our area pages) from its address and
   links to the district / area guide pages. */

const clean = (v) => String(v || "").toLowerCase().replace(/[^a-z]/g, "");
const placeKey = (name) => clean(name.replace(/\s+(Town|City)$/i, ""));
const formatNumber = (n) => Number(n).toLocaleString("en-IN");

function findArea(property) {
    const loc = property?.location || {};
    const parts = [loc.district, loc.city, loc.locality, loc.town, loc.address, loc.fullAddress, property?.district, property?.city]
        .filter(Boolean)
        .flatMap((v) => String(v).split(/[,/|-]/))
        .map((v) => v.trim())
        .filter(Boolean);

    // District: explicit district field first, then any address part ("Kochi" -> Ernakulam).
    let district = districtForKey(loc.district) || districtForKey(property?.district) || null;
    if (!district) {
        for (const part of parts) {
            district = districtForKey(part);
            if (district) break;
        }
    }
    if (!district) {
        const blob = clean(`${parts.join(" ")} ${property?.title || ""}`);
        district = KERALA_DISTRICTS.find((d) => blob.includes(clean(d.name))) || null;
    }
    if (!district) return { district: null, place: null };

    // Town: an address part that matches one of the district's area pages.
    const partKeys = parts.map(clean);
    let place = district.places.find((p) => partKeys.includes(placeKey(p.name)));
    if (!place) {
        const blob = clean(`${parts.join(" ")} ${property?.title || ""}`);
        place = district.places.find((p) => placeKey(p.name).length > 4 && blob.includes(placeKey(p.name)));
    }
    return { district, place: place || null };
}

const PinIcon = () => (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
        <path d="M18.364 17.364 12 23.728l-6.364-6.364a9 9 0 1 1 12.728 0ZM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
);

const Arrow = () => (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

export default function PropertyAreaGuide({ property, idPrefix = "area-guide" }) {
    const { district, place } = useMemo(() => findArea(property), [property]);
    if (!district) return null;

    const districtHref = `/district/${district.slug}`;
    const otherPlaces = district.places.filter((p) => p.slug !== place?.slug).slice(0, 6);
    const titleId = `${idPrefix}-title`;

    return (
        <section className={styles.card} aria-labelledby={titleId}>
            <div className={styles.head}>
                <span className={styles.eyebrow}>
                    <PinIcon />
                    About the area
                </span>
                <span className={styles.code}>{district.short}</span>
            </div>

            <div className={styles.body}>
                <Link href={districtHref} className={styles.media} aria-label={`${district.name} district guide`}>
                    <img src={district.image} alt="" loading="lazy" decoding="async" className={styles.image} />
                    <span className={styles.mediaLabel}>{district.name}</span>
                </Link>

                <div className={styles.text}>
                    <h2 id={titleId} className={styles.title}>
                        {place ? (
                            <>
                                {place.name}, <span className={styles.titleMuted}>{district.name}</span>
                            </>
                        ) : (
                            <>
                                {district.name} <span className={styles.titleMuted}>district, Kerala</span>
                            </>
                        )}
                    </h2>
                    <p className={styles.tagline}>{place ? `Known for: ${place.note}` : district.tagline}</p>
                    <p className={styles.summary}>{district.about[0]}</p>
                </div>
            </div>

            <dl className={styles.facts}>
                <div className={styles.fact}>
                    <dt>Headquarters</dt>
                    <dd>{district.hq}</dd>
                </div>
                <div className={styles.fact}>
                    <dt>Area</dt>
                    <dd>{formatNumber(district.areaKm2)} km²</dd>
                </div>
                <div className={styles.fact}>
                    <dt>Population</dt>
                    <dd>{formatNumber(district.population)}</dd>
                </div>
            </dl>

            {otherPlaces.length > 0 && (
                <div className={styles.places}>
                    <span className={styles.placesLabel}>{place ? `Other areas in ${district.name}` : `Popular areas in ${district.name}`}</span>
                    <div className={styles.chips}>
                        {otherPlaces.map((p) => (
                            <Link key={p.slug} href={placeHref(district, p)} className={styles.chip}>
                                {p.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.actions}>
                {place && (
                    <Link href={placeHref(district, place)} className={styles.primaryBtn}>
                        Explore {place.name}
                        <span className={styles.btnArrow}>
                            <Arrow />
                        </span>
                    </Link>
                )}
                <Link href={districtHref} className={place ? styles.secondaryBtn : styles.primaryBtn}>
                    {place ? `${district.name} district guide` : `Explore ${district.name}`}
                    <span className={styles.btnArrow}>
                        <Arrow />
                    </span>
                </Link>
            </div>
        </section>
    );
}
