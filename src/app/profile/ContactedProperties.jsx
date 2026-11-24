"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import styles from "./contactedProperties.module.css";
import emptyStyles from "./emptyState.module.css";
import EmptyState from "./EmptyState";
import { fallbackImageFor } from "../lib/addedPropertiesStore";
import { propertyApi, formatPropertyImgUrl, handlePropertyImgError, DEFAULT_PROPERTY_NO_IMAGE } from "../lib/api";
import { getPropertyUrl } from "../lib/seoHelper";
import {
    RiSearchLine,
    RiCloseLine,
    RiMapPin2Fill,
    RiHotelBedLine,
    RiCrop2Line,
    RiHome5Line,
    RiBuilding2Line,
    RiLandscapeLine,
    RiSendPlaneLine,
    RiInboxLine,
    RiUser3Line,
    RiAddLine,
} from "react-icons/ri";
import { getPropertyCode } from "../lib/propertyCode";

/* The two halves of the list, and the copy each one needs. Keyed by the
   `direction` stored on every enquiry. */
const DIRECTIONS = [
    {
        id: "sent",
        label: "Sent",
        Icon: RiSendPlaneLine,
        total: (n) => `Total ${n} Contacted ${n === 1 ? "Property" : "Properties"}`,
        emptyTitle: "No Content Yet",
        emptyLines: [
            "You haven’t contacted any properties yet.",
            "Start exploring and your enquiries will show up here.",
        ],
    },
    {
        id: "received",
        label: "Received",
        Icon: RiInboxLine,
        total: (n) => `Total ${n} Received ${n === 1 ? "Enquiry" : "Enquiries"}`,
        emptyTitle: "No Enquiries Yet",
        emptyLines: [
            "No one has enquired about your listings yet.",
            "Enquiries on the properties you post will show up here.",
        ],
    },
];

/* Bathtub glyph — remixicon has no bath icon, so it is drawn inline */
function BathIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3Z" />
            <path d="M7 12V6.5A2.5 2.5 0 0 1 9.5 4c1.2 0 2.1.8 2.4 1.9" />
            <path d="M5 19l-1 2M19 19l1 2" />
        </svg>
    );
}

/* Double chevron beside a sortable header. Both arms are drawn every time and
   the active one is tinted, so the header shows the direction it is sorted in
   rather than only that it can be sorted. */
function SortIcon({ direction }) {
    return (
        <svg className={styles.sortIcon} viewBox="0 0 12 16" width="12" height="16" aria-hidden="true">
            <path
                d="M6 1.5 9.2 5.6H2.8L6 1.5Z"
                fill={direction === "asc" ? "#1554d1" : "currentColor"}
                opacity={direction === "desc" ? 0.45 : 1}
            />
            <path
                d="M6 14.5 2.8 10.4h6.4L6 14.5Z"
                fill={direction === "desc" ? "#1554d1" : "currentColor"}
                opacity={direction === "asc" ? 0.45 : 1}
            />
        </svg>
    );
}

/* Columns the table can be ordered by. `type` compares strings, the other two
   compare numbers, so each column says how to read its value. */
const SORTABLE = {
    price: { label: "Price", value: (p) => p.priceNum },
    type: { label: "Property Type", value: (p) => p.type },
    contacted: { label: "Contacted On", value: (p) => p.contactedTs },
};

const TYPE_PILL_CLASS = {
    Villa: styles.typeVilla,
    Apartment: styles.typeApartment,
    Plot: styles.typePlot,
    House: styles.typeHouse,
};

/* Icon standing in for the property type in the spec strip. */
const TYPE_ICON = {
    Villa: RiHome5Line,
    House: RiHome5Line,
    Apartment: RiBuilding2Line,
    Plot: RiLandscapeLine,
};

/**
 * "Contacted Properties" panel of the profile page — the listings this user has
 * enquired about, newest enquiry first.
 */
export default function ContactedProperties() {
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [direction, setDirection] = useState("sent");

    /* Most recently contacted first until the user picks a column. */
    const [sort, setSort] = useState({ key: "contacted", direction: "desc" });

    useEffect(() => {
        let alive = true;

        const loadContacted = async () => {
            setIsLoading(true);
            try {
                const response = await propertyApi.contacted();
                if (alive) {
                    setProperties(Array.isArray(response.data) ? response.data : []);
                }
            } catch {
                if (alive) setProperties([]);
            } finally {
                if (alive) setIsLoading(false);
            }
        };

        loadContacted();

        return () => {
            alive = false;
        };
    }, []);

    /* Clicking a column sorts it descending first — for price and date the
       interesting end is the top — then flips on a second click. */
    const applySort = (key) => {
        setSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "desc" ? "asc" : "desc" }
                : { key, direction: "desc" }
        );
    };

    /* `label` overrides the column's default wording — the date column reads
       "Enquired On" once you are looking at enquiries people sent you. */
    const sortHeader = (key, label = SORTABLE[key].label) => (
        <button
            type="button"
            className={styles.sortBtn}
            onClick={() => applySort(key)}
            aria-label={`Sort by ${label}`}
        >
            {label}
            <SortIcon direction={sort.key === key ? sort.direction : null} />
        </button>
    );

    /* Counts sit on the toggle itself, so they ignore the search box — a tab
       reading "Received 0" while there are four of them would be a lie. */
    const countFor = (id) => properties.filter((p) => p.direction === id).length;

    const active = DIRECTIONS.find((d) => d.id === direction) ?? DIRECTIONS[0];

    const inDirection = useMemo(
        () => properties.filter((p) => p.direction === direction),
        [properties, direction]
    );

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        const filtered = inDirection.filter(
            (p) =>
                !needle ||
                p.title.toLowerCase().includes(needle) ||
                getPropertyCode(p).toLowerCase().includes(needle) ||
                p.location.toLowerCase().includes(needle) ||
                p.type.toLowerCase().includes(needle) ||
                (p.enquirer ?? "").toLowerCase().includes(needle)
        );

        const read = SORTABLE[sort.key].value;
        return [...filtered].sort((a, b) => {
            const left = read(a);
            const right = read(b);
            /* Property Type is text, so it collates rather than subtracts. */
            const order =
                typeof left === "string" ? left.localeCompare(right) : left - right;
            return sort.direction === "asc" ? order : -order;
        });
    }, [inDirection, query, sort]);

    return (
        <section className={styles.page}>
            <div className={styles.container}>
                {/* ============================ SECTION HEADER ============================ */}
                <header>
                    <h1 className={styles.pageTitle}>Contacted Properties</h1>
                    <p className={styles.pageSub}>Properties you&apos;ve contacted through Keralaplots.</p>
                </header>

                {/* ============================ TOOLBAR ============================
                    Direction toggle on the left — always visible, it's how you
                    switch sides even when this one is empty. Total + search sit
                    stacked on the right, and are dropped when this side has
                    nothing to count or search. */}
                <div className={styles.toolbar}>
                    <div className={styles.toggle} role="tablist" aria-label="Enquiry direction">
                        {DIRECTIONS.map(({ id, label, Icon }) => {
                            const selected = direction === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    className={`${styles.toggleBtn} ${selected ? styles.toggleBtnActive : ""}`}
                                    onClick={() => { setDirection(id); setQuery(""); }}
                                >
                                    <Icon aria-hidden="true" />
                                    {label}
                                    <span className={styles.toggleCount}>{countFor(id)}</span>
                                </button>
                            );
                        })}
                    </div>

                    {isLoading ? (
                        <span className={styles.total}>Loading enquiries…</span>
                    ) : inDirection.length > 0 && (
                        <div className={styles.searchCol}>
                            <span className={styles.total}>{active.total(visible.length)}</span>

                            <div className={styles.searchWrap}>
                                <RiSearchLine className={styles.searchIcon} />
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder={
                                        direction === "received"
                                            ? "Search by property name, ID, location, enquirer..."
                                            : "Search by property name, ID, location..."
                                    }
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    aria-label={`Search enquiries you ${direction}`}
                                />
                                {query && (
                                    <button
                                        type="button"
                                        className={styles.searchClear}
                                        onClick={() => setQuery("")}
                                        aria-label="Clear search"
                                    >
                                        <RiCloseLine />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ============================ TABLE HEADER ============================
                    Column headings with no columns under them read as a broken
                    table, so they go with the rows. */}
                {visible.length > 0 && (
                    <div className={styles.tableHead}>
                        <span className={`${styles.headCell} ${styles.headCellFirst}`}>Property Details</span>
                        <span className={styles.headCell}>{sortHeader("price")}</span>
                        <span className={styles.headCell}>{sortHeader("type")}</span>
                        <span className={styles.headCell}>
                            {sortHeader("contacted", direction === "received" ? "Enquired On" : "Contacted On")}
                        </span>
                    </div>
                )}

                {/* ============================ ROWS ============================ */}
                {visible.length === 0 ? (
                    inDirection.length === 0 ? (
                        <EmptyState
                            title={active.emptyTitle}
                            lines={active.emptyLines}
                            className={styles.emptyPlacement}
                        >
                            {/* Nothing received means nothing listed to receive on,
                                so that side sends you to post rather than browse. */}
                            <Link
                                href={direction === "received" ? "/post-property" : "/properties"}
                                className={emptyStyles.btn}
                            >
                                {direction === "received" ? (
                                    <RiAddLine aria-hidden="true" />
                                ) : (
                                    <RiHome5Line aria-hidden="true" />
                                )}
                                {direction === "received" ? "Post a Property" : "Explore Properties"}
                            </Link>
                        </EmptyState>
                    ) : (
                        <EmptyState
                            title="No Matches Found"
                            lines={[
                                `No ${direction === "received" ? "received enquiries" : "contacted properties"} match your search.`,
                                "Try a different name, ID or location.",
                            ]}
                            className={styles.emptyPlacement}
                        >
                            <button
                                type="button"
                                className={emptyStyles.btn}
                                onClick={() => setQuery("")}
                            >
                                Clear Search
                            </button>
                        </EmptyState>
                    )
                ) : (
                    <div className={styles.rowList}>
                        {visible.map((p) => {
                            const TypeIcon = TYPE_ICON[p.type] ?? RiHome5Line;

                            return (
                                <article key={p.id} className={styles.row}>
                                    {/* ---- property details ---- */}
                                    <div className={styles.details}>
                                        <Link
                                            href={getPropertyUrl(p.propertyId, p.title)}
                                            className={styles.thumbWrap}
                                            aria-label={`Open ${p.title}`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img loading="lazy" decoding="async"
                                                src={p.image ? formatPropertyImgUrl(p.image) : DEFAULT_PROPERTY_NO_IMAGE}
                                                alt={p.title}
                                                className={styles.thumb}
                                                onError={handlePropertyImgError}
                                            />
                                            <span className={styles.idBadge}>ID: {getPropertyCode(p)}</span>
                                        </Link>

                                        <div className={styles.detailsText}>
                                            <h2 className={styles.titleRow}>
                                                <Link href={getPropertyUrl(p.propertyId, p.title)} className={styles.title}>
                                                    {p.title}
                                                </Link>
                                            </h2>

                                            <p className={styles.location}>
                                                <RiMapPin2Fill className={styles.pinIcon} />
                                                {p.location}
                                            </p>

                                            {/* Who sent it — without this the received
                                                rows would be indistinguishable from the
                                                ones the user sent. */}
                                            {p.enquirer && (
                                                <p className={styles.enquirer}>
                                                    <RiUser3Line className={styles.enquirerIcon} />
                                                    Enquiry from <strong>{p.enquirer}</strong>
                                                </p>
                                            )}

                                            <ul className={styles.specs}>
                                                {p.beds && (
                                                    <li className={styles.spec}>
                                                        <RiHotelBedLine className={styles.specIcon} />
                                                        {p.beds}
                                                    </li>
                                                )}
                                                {p.baths && (
                                                    <li className={styles.spec}>
                                                        <BathIcon className={styles.specIcon} />
                                                        {p.baths}
                                                    </li>
                                                )}
                                                <li className={styles.spec}>
                                                    {p.type === "Plot" ? (
                                                        <RiLandscapeLine className={styles.specIcon} />
                                                    ) : (
                                                        <RiCrop2Line className={styles.specIcon} />
                                                    )}
                                                    {p.area}
                                                </li>
                                                {p.type !== "Plot" && (
                                                    <li className={styles.spec}>
                                                        <TypeIcon className={styles.specIcon} />
                                                        {p.type}
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* ---- table cells (stacked labels appear on narrow panels) ---- */}
                                    <div className={styles.stack}>
                                        <div className={styles.stackCell}>
                                            <span className={styles.stackLabel}>Price</span>
                                            <span className={styles.price}>{p.price}</span>
                                        </div>

                                        <div className={styles.stackCell}>
                                            <span className={styles.stackLabel}>Property Type</span>
                                            <span className={styles.typeCell}>
                                                <span className={`${styles.typePill} ${TYPE_PILL_CLASS[p.type] ?? styles.typeDefault}`}>
                                                    {p.type}
                                                </span>
                                            </span>
                                        </div>

                                        <div className={styles.stackCell}>
                                            <span className={styles.stackLabel}>
                                                {direction === "received" ? "Enquired On" : "Contacted On"}
                                            </span>
                                            <span className={styles.contactedOn}>{p.contactedOn}</span>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
