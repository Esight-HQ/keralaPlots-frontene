"use client";

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./addedProperties.module.css";
import emptyStyles from "./emptyState.module.css";
import EmptyState from "./EmptyState";
import { PROPERTY_TYPES, STATUSES } from "./addedPropertiesData";
import {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    updateAddedProperties,
    syncUserPropertiesFromApi,
    apiUpdatePropertyStatus,
    apiDeleteProperty,
    fallbackImageFor,
    formatPrice,
} from "../lib/addedPropertiesStore";
import { getPropertyUrl } from "../lib/seoHelper";
import { formatPropertyImgUrl, handlePropertyImgError, DEFAULT_PROPERTY_NO_IMAGE, profileApi } from "../lib/api";
import {
    RiSearchLine,
    RiCloseLine,
    RiFilter3Line,
    RiMapPin2Fill,
    RiHotelBedLine,
    RiCrop2Line,
    RiHome5Line,
    RiBuilding2Line,
    RiLandscapeLine,
    RiEyeLine,
    RiPhoneLine,
    RiMore2Fill,
    RiEditLine,
    RiCheckboxCircleLine,
    RiPlayCircleLine,
    RiPauseCircleLine,
    RiShareForwardLine,
    RiDeleteBinLine,
    RiAddLine,
} from "react-icons/ri";
import dynamic from "next/dynamic";
import { preloadWhenIdle } from "../lib/preloadWhenIdle";
import { getPropertyCode } from "../lib/propertyCode";

/* Edit / delete dialogs only appear after a click, so they load as separate
   chunks (fetched in the background once the page is idle). */
const loadAddedPropertyEditModal = () => import("./AddedPropertyEditModal");
const loadAddedPropertyDeleteDialog = () => import("./AddedPropertyDeleteDialog");
const AddedPropertyEditModal = dynamic(loadAddedPropertyEditModal, { ssr: false });
const AddedPropertyDeleteDialog = dynamic(loadAddedPropertyDeleteDialog, { ssr: false });

/* Blank row placeholders shown for the one frame before localStorage is read.
   Rendering the seed list instead would flash rows a user has already deleted. */
const SKELETON_ROWS = [0, 1, 2];

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

/* Columns the table can be ordered by, and the value each one reads. */
const SORTABLE = {
    price: { label: "Price", value: (p) => p.priceNum },
    added: { label: "Added On", value: (p) => p.addedTs },
    views: { label: "Views", value: (p) => p.views },
    calls: { label: "Calls", value: (p) => p.calls },
};

const TYPE_PILL_CLASS = {
    Villa: styles.typeVilla,
    Apartment: styles.typeApartment,
    Plot: styles.typePlot,
    House: styles.typeHouse,
};

const STATUS_PILL_CLASS = {
    Active: styles.statusActive,
    Inactive: styles.statusInactive,
    Blocked: styles.statusBlocked,
    Sold: styles.statusSold,
    Draft: styles.statusDraft,
    Incomplete: styles.statusIncomplete,
};

/* Icon standing in for the property type in the spec strip. */
const TYPE_ICON = {
    Villa: RiHome5Line,
    House: RiHome5Line,
    Apartment: RiBuilding2Line,
    Plot: RiLandscapeLine,
};

/**
 * "Added Properties" panel of the profile page — the listings this user has
 * posted, with the row actions that manage them. Sits alongside Personal
 * Details rather than owning a route of its own.
 */
export default function AddedProperties() {
    useEffect(() => preloadWhenIdle([loadAddedPropertyEditModal, loadAddedPropertyDeleteDialog]), []);

    const router = useRouter();

    /* The listings live in the store, not in this component — /post-property
       writes to the same place the moment a property is published. */
    const { hydrated, list: properties } = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    const [query, setQuery] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [typeFilters, setTypeFilters] = useState([]);
    const [statusFilters, setStatusFilters] = useState([]);
    const [statusTab, setStatusTab] = useState("all");

    /* Newest first until the user picks a column. */
    const [sort, setSort] = useState({ key: "added", direction: "desc" });

    const [openMenu, setOpenMenu] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [editing, setEditing] = useState(null);
    const [toast, setToast] = useState("");
    const [isFreeUser, setIsFreeUser] = useState(false);

    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem("kp_auth_user") || "null");
            if (u && (u.pay_for_property === 0 || u.pay_for_property === false)) {
                setIsFreeUser(true);
            } else {
                setIsFreeUser(false);
            }
        } catch {}

        profileApi.getProfile()
            .then((res) => {
                if (res?.data?.user) {
                    const payProp = res.data.user.pay_for_property;
                    if (payProp !== undefined) {
                        setIsFreeUser(payProp === 0);
                        try {
                            const u = JSON.parse(localStorage.getItem("kp_auth_user") || "null");
                            if (u) {
                                u.pay_for_property = payProp;
                                localStorage.setItem("kp_auth_user", JSON.stringify(u));
                            }
                        } catch {}
                    }
                }
            })
            .catch(() => {});
    }, []);

    const listRef = useRef(null);

    const statusCounts = useMemo(() => {
        const counts = { all: properties.length, active: 0, draft: 0, incomplete: 0 };
        properties.forEach((p) => {
            const st = (p.status || "").toLowerCase();
            if (st === "active") counts.active++;
            else if (st === "draft") counts.draft++;
            else if (st === "incomplete") counts.incomplete++;
        });
        return counts;
    }, [properties]);

    /* Close the row menu on an outside click or Escape — a menu left hanging
       over another row is worse than no menu. */
    useEffect(() => {
        if (openMenu === null) return;

        const onPointerDown = (event) => {
            if (!event.target.closest(`.${styles.actionsCell}`)) setOpenMenu(null);
        };
        const onKey = (event) => {
            if (event.key === "Escape") setOpenMenu(null);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [openMenu]);

    /* Escape also backs out of either dialog. */
    useEffect(() => {
        if (!pendingDelete && !editing) return;
        const onKey = (event) => {
            if (event.key !== "Escape") return;
            setPendingDelete(null);
            setEditing(null);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [pendingDelete, editing]);

    /* Toasts clear themselves; each new one restarts the clock. */
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(""), 2600);
        return () => clearTimeout(timer);
    }, [toast]);

    const toggleFrom = (list, value) =>
        list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

    const activeFilterCount = typeFilters.length + statusFilters.length;

    const clearFilters = () => {
        setTypeFilters([]);
        setStatusFilters([]);
        setStatusTab("all");
    };

    /* Clicking a column sorts it descending first — for views, calls and price
       the interesting end is the top — then flips on a second click. */
    const applySort = (key) => {
        setSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "desc" ? "asc" : "desc" }
                : { key, direction: "desc" }
        );
    };

    /* A sortable column header: its label, plus the arrow pair showing whether
       the table is currently ordered by it and which way. */
    const sortHeader = (key) => (
        <button
            type="button"
            className={styles.sortBtn}
            onClick={() => applySort(key)}
            aria-label={`Sort by ${SORTABLE[key].label}`}
        >
            {SORTABLE[key].label}
            <SortIcon direction={sort.key === key ? sort.direction : null} />
        </button>
    );

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        const filtered = properties.filter((p) => {
            const matchesQuery =
                !needle ||
                p.title.toLowerCase().includes(needle) ||
                getPropertyCode(p).toLowerCase().includes(needle) ||
                p.location.toLowerCase().includes(needle) ||
                p.type.toLowerCase().includes(needle);

            const matchesType = typeFilters.length === 0 || typeFilters.includes(p.type);
            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(p.status);
            const matchesTab = statusTab === "all" || p.status?.toLowerCase() === statusTab.toLowerCase();

            return matchesQuery && matchesType && matchesStatus && matchesTab;
        });

        const read = SORTABLE[sort.key].value;
        return filtered.sort((a, b) =>
            sort.direction === "asc" ? read(a) - read(b) : read(b) - read(a)
        );
    }, [properties, query, typeFilters, statusFilters, statusTab, sort]);

    // Sync listings from backend on mount
    useEffect(() => {
        syncUserPropertiesFromApi();
    }, []);

    // ---- row actions --------------------------------------------------------
    const setStatus = (id, status) => {
        apiUpdatePropertyStatus(id, status);
        setOpenMenu(null);
        setToast(`Listing marked as ${status.toLowerCase()}.`);
    };

    const copyLink = async (property) => {
        setOpenMenu(null);
        const url = `${window.location.origin}${getPropertyUrl(property)}`;
        try {
            await navigator.clipboard.writeText(url);
            setToast("Listing link copied to clipboard.");
        } catch {
            /* Clipboard is blocked outside a secure context — say so rather than
               silently doing nothing. */
            setToast("Couldn't copy the link. Copy it from the listing page.");
        }
    };

    /* Navigates directly to the Post Property wizard with the edit ID loaded,
       fetching the added property details to edit. */
    const startEdit = (property) => {
        setOpenMenu(null);
        router.push(`/post-property?edit=${property.id}`);
    };

    const editValid =
        editing &&
        editing.title.trim().length > 0 &&
        editing.location.trim().length > 0 &&
        Number(editing.priceNum) > 0;

    const saveEdit = (event) => {
        event.preventDefault();
        if (!editValid) return;

        const priceNum = Number(editing.priceNum);
        updateAddedProperties((prev) =>
            prev.map((p) =>
                p.id === editing.id
                    ? {
                        ...p,
                        title: editing.title.trim(),
                        location: editing.location.trim(),
                        type: editing.type,
                        status: editing.status,
                        priceNum,
                        price: formatPrice(priceNum, { perMonth: editing.perMonth }),
                    }
                    : p
            )
        );
        setEditing(null);
        setToast("Listing details updated.");
    };

    const confirmDelete = () => {
        if (!pendingDelete) return;
        apiDeleteProperty(pendingDelete.id);
        setToast(`"${pendingDelete.title}" was removed from your listings.`);
        setPendingDelete(null);
    };

    return (
        <>
            <section className={styles.page}>
                <div className={styles.container}>
                    {/* ============================ SECTION HEADER ============================ */}
                    <header>
                        <h1 className={styles.pageTitle}>My Added Properties</h1>
                        <p className={styles.pageSub}>Properties you&apos;ve listed on Keralaplots.</p>
                    </header>

                    {/* ============================ STATUS FILTER TABS ============================ */}
                    {(!hydrated || properties.length > 0) && (
                        <div className={styles.filterTabsBar} role="tablist" aria-label="Filter properties by status">
                            {[
                                { id: "all", label: "All Properties", count: statusCounts.all },
                                { id: "active", label: "Active", count: statusCounts.active },
                                { id: "draft", label: "Draft", count: statusCounts.draft },
                                { id: "incomplete", label: "Incomplete", count: statusCounts.incomplete },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={statusTab === tab.id}
                                    className={`${styles.filterTabItem} ${statusTab === tab.id ? styles.filterTabItemActive : ""}`}
                                    onClick={() => setStatusTab(tab.id)}
                                >
                                    {tab.label}
                                    <span className={styles.filterTabBadge}>{tab.count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ============================ TOOLBAR ============================
                        Dropped on a genuinely empty account — there is nothing to
                        count, search or filter, and the empty state carries the panel. */}
                    {(!hydrated || properties.length > 0) && (
                    <div className={styles.toolbar}>
                        <span className={styles.total}>
                            {hydrated
                                ? `Total ${visible.length} ${visible.length === 1 ? "Property" : "Properties"}`
                                : "Loading your listings…"}
                        </span>

                        <div className={styles.toolbarActions}>
                            <div className={styles.searchWrap}>
                                <RiSearchLine className={styles.searchIcon} />
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search by property name, ID, location..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    aria-label="Search your listed properties"
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

                            <button
                                type="button"
                                className={`${styles.filterBtn} ${filterOpen || activeFilterCount ? styles.filterBtnActive : ""}`}
                                onClick={() => setFilterOpen((open) => !open)}
                                aria-expanded={filterOpen}
                            >
                                <RiFilter3Line className={styles.filterIcon} />
                                Filter
                                {activeFilterCount > 0 && (
                                    <span className={styles.filterCount}>{activeFilterCount}</span>
                                )}
                            </button>
                        </div>
                    </div>
                    )}

                    {/* ============================ FILTER PANEL ============================ */}
                    {filterOpen && (
                        <section className={styles.filterPanel} aria-label="Filter listings">
                            <div>
                                <p className={styles.filterGroupLabel}>Property Type</p>
                                <div className={styles.chipRow}>
                                    {PROPERTY_TYPES.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`${styles.chip} ${typeFilters.includes(type) ? styles.chipActive : ""}`}
                                            onClick={() => setTypeFilters((prev) => toggleFrom(prev, type))}
                                            aria-pressed={typeFilters.includes(type)}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className={styles.filterGroupLabel}>Status</p>
                                <div className={styles.chipRow}>
                                    {STATUSES.map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            className={`${styles.chip} ${statusFilters.includes(status) ? styles.chipActive : ""}`}
                                            onClick={() => setStatusFilters((prev) => toggleFrom(prev, status))}
                                            aria-pressed={statusFilters.includes(status)}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {activeFilterCount > 0 && (
                                <button type="button" className={styles.clearFilters} onClick={clearFilters}>
                                    Clear all filters
                                </button>
                            )}
                        </section>
                    )}

                    {/* ============================ TABLE HEADER ============================
                        Column headings with no columns under them read as a broken
                        table, so they go with the rows. */}
                    {(!hydrated || visible.length > 0) && (
                    <div className={styles.tableHead}>
                        <span className={`${styles.headCell} ${styles.headCellFirst}`}>Property Details</span>
                        <span className={styles.headCell}>{sortHeader("price")}</span>
                        <span className={styles.headCell}>Property Type</span>
                        <span className={styles.headCell}>{sortHeader("added")}</span>
                        <span className={styles.headCell}>{sortHeader("views")}</span>
                        <span className={styles.headCell}>{sortHeader("calls")}</span>
                        <span className={styles.headCell}>Status</span>
                        <span className={styles.headCell}>Actions</span>
                    </div>
                    )}

                    {/* ============================ ROWS ============================ */}
                    {!hydrated ? (
                        <div className={styles.rowList} aria-hidden="true">
                            {SKELETON_ROWS.map((i) => (
                                <div key={i} className={styles.skeletonRow}>
                                    <span className={styles.skeletonThumb} />
                                    <span className={styles.skeletonLines}>
                                        <span className={styles.skeletonLine} />
                                        <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : visible.length === 0 ? (
                        properties.length === 0 ? (
                            <EmptyState
                                title="No Content Yet"
                                className={styles.emptyPlacement}
                                lines={[
                                    "You haven’t added or viewed any properties yet.",
                                    "Start exploring and manage your property activities here.",
                                ]}
                            >
                                <Link href="/properties" className={emptyStyles.btn}>
                                    <RiHome5Line aria-hidden="true" />
                                    Explore Properties
                                </Link>
                                {/* This panel's own action — the design's CTA sends you
                                    browsing, but listing is what fills this list. */}
                                <Link href="/post-property" className={emptyStyles.btnGhost}>
                                    <RiAddLine aria-hidden="true" />
                                    Post a Property
                                </Link>
                            </EmptyState>
                        ) : (
                            <EmptyState
                                title="No Matches Found"
                                className={styles.emptyPlacement}
                                lines={[
                                    "No properties match your search or filters.",
                                    "Try a different name, ID or location.",
                                ]}
                            >
                                <button
                                    type="button"
                                    className={emptyStyles.btn}
                                    onClick={() => { setQuery(""); clearFilters(); }}
                                >
                                    Reset Search &amp; Filters
                                </button>
                            </EmptyState>
                        )
                    ) : (
                        <div className={styles.rowList} ref={listRef}>
                            {visible.map((p, index) => {
                                const TypeIcon = TYPE_ICON[p.type] ?? RiHome5Line;
                                const menuOpen = openMenu === p.id;
                                /* The last two rows open their menu upwards so it
                                   stays on screen at the bottom of the list. */
                                const menuUp = visible.length > 2 && index >= visible.length - 2;

                                return (
                                    <article key={p.id ? `prop-${p.id}-${index}` : `prop-${index}`} className={styles.row}>
                                        {/* ---- property details ---- */}
                                        <div className={styles.details}>
                                            <Link
                                                href={getPropertyUrl(p)}
                                                className={styles.thumbWrap}
                                                aria-label={`Open ${p.title}`}
                                            >
                                                {/* A freshly published listing carries an object URL for its
                                                    cover photo, which stops resolving after a reload. */}
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
                                                    <Link href={getPropertyUrl(p)} className={styles.title}>
                                                        {p.title}
                                                    </Link>
                                                </h2>

                                                <p className={styles.location}>
                                                    <RiMapPin2Fill className={styles.pinIcon} />
                                                    {p.location}
                                                </p>

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

                                        {/* ---- table cells (stacked labels appear below 1280px) ---- */}
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
                                                <span className={styles.stackLabel}>Added On</span>
                                                <span className={styles.addedOn}>{p.addedOn}</span>
                                            </div>

                                            <div className={`${styles.stackCell} ${styles.stackCellViews}`}>
                                                <span className={styles.stackLabel}>Views</span>
                                                <span className={styles.metric}>
                                                    <span className={styles.metricValue}>
                                                        <RiEyeLine className={styles.metricIcon} />
                                                        {p.views.toLocaleString("en-IN")}
                                                    </span>
                                                    <span className={styles.metricLabel}>Views</span>
                                                </span>
                                            </div>

                                            <div className={styles.stackCell}>
                                                <span className={styles.stackLabel}>Calls</span>
                                                <span className={styles.metric}>
                                                    <span className={styles.metricValue}>
                                                        <RiPhoneLine className={styles.metricIcon} />
                                                        {p.calls.toLocaleString("en-IN")}
                                                    </span>
                                                    <span className={styles.metricLabel}>Calls</span>
                                                </span>
                                            </div>

                                            <div className={`${styles.stackCell} ${styles.stackCellStatus}`}>
                                                <span className={styles.stackLabel}>Status</span>
                                                <span className={styles.statusCell}>
                                                    <span className={`${styles.statusPill} ${STATUS_PILL_CLASS[p.status] ?? ""}`}>
                                                        {p.status}
                                                    </span>
                                                    {p.status === "Draft" && (
                                                        <button
                                                            type="button"
                                                            className={styles.quickPayBtn}
                                                            onClick={() => router.push(`/post-property?edit=${p.id}${isFreeUser ? "" : "&pay=true"}`)}
                                                            title={isFreeUser ? "Review and publish property" : "Complete details and make payment"}
                                                        >
                                                            {isFreeUser ? "Publish" : "Pay & Publish"}
                                                        </button>
                                                    )}
                                                    {p.status === "Incomplete" && (
                                                        <button
                                                            type="button"
                                                            className={styles.quickEditBtn}
                                                            onClick={() => router.push(`/post-property?edit=${p.id}`)}
                                                            title="Complete your property details"
                                                        >
                                                            Continue Edit
                                                        </button>
                                                    )}
                                                </span>
                                            </div>

                                            <div className={`${styles.stackCell} ${styles.stackCellActions}`}>
                                                <span className={styles.stackLabel}>Actions</span>
                                                <span className={styles.actionsCell}>
                                                    <button
                                                         type="button"
                                                         className={`${styles.actionsBtn} ${menuOpen ? styles.actionsBtnOpen : ""}`}
                                                         onClick={() => setOpenMenu(menuOpen ? null : p.id)}
                                                         aria-haspopup="menu"
                                                         aria-expanded={menuOpen}
                                                         aria-label={`Actions for ${p.title}`}
                                                     >
                                                         <RiMore2Fill />
                                                     </button>

                                                     {menuOpen && (
                                                         <div
                                                             className={`${styles.menu} ${menuUp ? styles.menuUp : ""}`}
                                                             role="menu"
                                                         >
                                                             <button
                                                                 type="button"
                                                                 role="menuitem"
                                                                 className={styles.menuItem}
                                                                 onClick={() => router.push(getPropertyUrl(p))}
                                                             >
                                                                 <RiEyeLine />
                                                                 View Listing
                                                             </button>

                                                             {p.status === "Draft" && (
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className={styles.menuItem}
                                                                    onClick={() => router.push(`/post-property?edit=${p.id}${isFreeUser ? "" : "&pay=true"}`)}
                                                                >
                                                                    <RiCheckboxCircleLine />
                                                                    {isFreeUser ? "Complete & Publish" : "Complete & Pay"}
                                                                </button>
                                                             )}

                                                             {p.status === "Incomplete" && (
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className={styles.menuItem}
                                                                    onClick={() => router.push(`/post-property?edit=${p.id}`)}
                                                                >
                                                                    <RiEditLine />
                                                                    Continue Editing
                                                                </button>
                                                             )}

                                                             <button
                                                                 type="button"
                                                                 role="menuitem"
                                                                 className={styles.menuItem}
                                                                 onClick={() => startEdit(p)}
                                                             >
                                                                 <RiEditLine />
                                                                 Edit Details
                                                             </button>

                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                className={styles.menuItem}
                                                                onClick={() => copyLink(p)}
                                                            >
                                                                <RiShareForwardLine />
                                                                Copy Link
                                                            </button>

                                                            <span className={styles.menuDivider} />

                                                            {p.status === "Active" ? (
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className={styles.menuItem}
                                                                    onClick={() => setStatus(p.id, "Inactive")}
                                                                >
                                                                    <RiPauseCircleLine />
                                                                    Deactivate
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className={styles.menuItem}
                                                                    onClick={() => setStatus(p.id, "Active")}
                                                                >
                                                                    <RiPlayCircleLine />
                                                                    Set Active
                                                                </button>
                                                            )}

                                                            {p.status !== "Sold" && (
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className={styles.menuItem}
                                                                    onClick={() => setStatus(p.id, "Sold")}
                                                                >
                                                                    <RiCheckboxCircleLine />
                                                                    Mark as Sold
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                                                onClick={() => { setOpenMenu(null); setPendingDelete(p); }}
                                                            >
                                                                <RiDeleteBinLine />
                                                                Delete Listing
                                                            </button>
                                                        </div>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* ============================ EDIT DIALOG ============================ */}
            {editing && (
                <AddedPropertyEditModal
                    editValid={editValid}
                    editing={editing}
                    saveEdit={saveEdit}
                    setEditing={setEditing}
                />
            )}

            {/* ============================ DELETE CONFIRMATION ============================ */}
            {pendingDelete && <AddedPropertyDeleteDialog confirmDelete={confirmDelete} pendingDelete={pendingDelete} setPendingDelete={setPendingDelete} />}

            {toast && (
                <div className={styles.toast} role="status">
                    {toast}
                </div>
            )}
        </>
    );
}
