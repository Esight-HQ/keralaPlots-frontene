"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    RiSearchLine,
    RiArrowRightLine,
    RiCloseLine,
    RiLoader4Line,
    RiErrorWarningLine,
    RiHashtag,
    RiMapPinLine,
    RiHome4Line,
    RiBuilding2Line,
    RiCornerDownLeftLine,
} from "react-icons/ri";
import { propertyApi } from "../lib/api";
import { getPropertyUrl } from "../lib/seoHelper";
import styles from "./propertyIdSearch.module.css";

/* Accepts "KP822", "kp 822", "#822" or "822" and returns "822" (or "" if invalid). */
export function parsePropertyId(value) {
    const cleaned = String(value || "").trim().replace(/^#/, "").replace(/\s+/g, "");
    const match = cleaned.match(/^(?:kp)?-?(\d{1,10})$/i);
    return match ? String(Number(match[1])) : "";
}

/* Words people type -> the property-type filter they mean */
const TYPE_KEYWORDS = [
    { words: ["apartment", "flat", "bhk"], type: "Residential Apartment" },
    { words: ["villa"], type: "Residential Villa" },
    { words: ["house", "home"], type: "Residential House" },
    { words: ["plot", "land"], type: "Residential Land" },
    { words: ["shop"], type: "Commercial Shop" },
    { words: ["office"], type: "Commercial Office" },
    { words: ["commercial building", "building"], type: "Commercial Building" },
    { words: ["warehouse", "industrial"], type: "Industrial Building" },
    { words: ["farm", "agricultural", "rubber", "coconut"], type: "Agricultural Land" },
];

const MAX_PER_GROUP = 4;

/* Bold the part of a suggestion that matches what was typed */
function Highlight({ text, query }) {
    const q = query.trim();
    const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, i)}
            <mark className={styles.mark}>{text.slice(i, i + q.length)}</mark>
            {text.slice(i + q.length)}
        </>
    );
}

/*
 * Global search for the properties page — one box for everything:
 *   • Property ID  ("KP822", "822", "#822")  -> opens that listing
 *   • District     ("Ernakulam")              -> applies the district filter
 *   • Property type ("villa", "shop", "plot") -> applies the type filter
 *   • Locality / anything else                -> keyword search (title, location…)
 *   • Matching listings                       -> open directly from the dropdown
 */
export default function PropertyIdSearch({
    loadedProperties = [],
    searchTerm = "",
    onSearch,
    districts = [],
    typeOptions = [],
    onPickDistrict,
    onPickType,
    normalize,
}) {
    const router = useRouter();
    const listId = useId();
    const [value, setValue] = useState(searchTerm);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [status, setStatus] = useState("idle"); // idle | searching | error
    const [message, setMessage] = useState("");
    const [liveListings, setLiveListings] = useState([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const inputRef = useRef(null);
    const wrapRef = useRef(null);
    const aliveRef = useRef(true);

    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
        };
    }, []);

    // Keep the box in sync when the search is changed elsewhere (chip removed, "Clear all"…)
    useEffect(() => {
        setValue(searchTerm);
    }, [searchTerm]);

    // Close the dropdown when clicking outside
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [open]);

    const query = value.trim();
    const qLower = query.toLowerCase();
    const idMatch = parsePropertyId(query);

    // Live listing matches from the API (debounced), so results aren't limited to the current page
    useEffect(() => {
        if (!open || query.length < 2 || idMatch) {
            setLiveListings([]);
            setLiveLoading(false);
            return;
        }
        let cancelled = false;
        setLiveLoading(true);
        const t = setTimeout(async () => {
            try {
                const res = await propertyApi.list({ search: query, limit: MAX_PER_GROUP, page: 1 });
                if (cancelled) return;
                const items = (res?.data || []).map((p) => (normalize ? normalize(p) : p));
                setLiveListings(items);
            } catch {
                if (!cancelled) setLiveListings([]);
            } finally {
                if (!cancelled) setLiveLoading(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [query, idMatch, open, normalize]);

    /* Build the grouped suggestion list */
    const suggestions = useMemo(() => {
        if (!query) return [];
        const out = [];

        if (idMatch) {
            out.push({ kind: "id", key: `id-${idMatch}`, label: `Property ID KP${idMatch}`, sub: "Open this listing", id: idMatch });
        }

        const matchedDistricts = districts.filter((d) => d.toLowerCase().includes(qLower)).slice(0, MAX_PER_GROUP);
        matchedDistricts.forEach((d) =>
            out.push({ kind: "district", key: `d-${d}`, label: d, sub: "District", value: d })
        );

        const localities = [
            ...new Set(
                [...liveListings, ...loadedProperties]
                    .map((p) => String(p.location || "").split(",")[0].trim())
                    .filter((l) => l && l.toLowerCase().includes(qLower) && !matchedDistricts.includes(l))
            ),
        ].slice(0, MAX_PER_GROUP);
        localities.forEach((l) => out.push({ kind: "locality", key: `l-${l}`, label: l, sub: "Locality", value: l }));

        const typeHits = new Set(typeOptions.filter((t) => t.toLowerCase().includes(qLower)));
        TYPE_KEYWORDS.forEach(({ words, type }) => {
            if (words.some((w) => w.includes(qLower) || qLower.includes(w))) typeHits.add(type);
        });
        [...typeHits].slice(0, MAX_PER_GROUP).forEach((t) =>
            out.push({ kind: "type", key: `t-${t}`, label: t, sub: "Property type", value: t })
        );

        // Listings: live API results, topped up from what's already on screen
        const seen = new Set();
        const listings = [];
        [...liveListings, ...loadedProperties.filter((p) =>
            `${p.title} ${p.location} ${p.category || ""} ${p.code || ""}`.toLowerCase().includes(qLower)
        )].forEach((p) => {
            if (p?.id && !seen.has(p.id) && listings.length < MAX_PER_GROUP) {
                seen.add(p.id);
                listings.push(p);
            }
        });
        listings.forEach((p) =>
            out.push({
                kind: "listing",
                key: `p-${p.id}`,
                label: p.title,
                sub: [p.code, p.location, p.price].filter(Boolean).join(" · "),
                property: p,
            })
        );

        if (!idMatch) {
            out.push({ kind: "keyword", key: "kw", label: `Search “${query}”`, sub: "All properties matching this text", value: query });
        }
        return out;
    }, [query, qLower, idMatch, districts, typeOptions, loadedProperties, liveListings]);

    useEffect(() => {
        setActiveIndex(-1);
    }, [query]);

    const fail = (text) => {
        setStatus("error");
        setMessage(text);
        setOpen(false);
        inputRef.current?.focus();
    };

    const openById = async (id) => {
        const local = loadedProperties.find((p) => String(p?.id) === id);
        if (local) {
            router.push(getPropertyUrl(local));
            return;
        }
        setStatus("searching");
        setMessage("");
        setOpen(false);
        try {
            const res = await propertyApi.show(id);
            const property = res?.data;
            if (!aliveRef.current) return;
            if (res?.success === false || !property || !(property.id || property.propertyId)) {
                return fail(`No property found with ID KP${id}`);
            }
            router.push(getPropertyUrl({ ...property, id: property.id || property.propertyId || id }));
        } catch (err) {
            if (!aliveRef.current) return;
            const code = err?.response?.status;
            if (code === 404 || code === 422) fail(`No property found with ID KP${id}`);
            else fail("Couldn't search right now. Please check your connection and try again.");
        }
    };

    const choose = (item) => {
        setOpen(false);
        setStatus("idle");
        setMessage("");
        switch (item.kind) {
            case "id":
                openById(item.id);
                break;
            case "district":
                setValue("");
                onPickDistrict ? onPickDistrict(item.value) : onSearch?.(item.value);
                break;
            case "type":
                setValue("");
                onPickType ? onPickType(item.value) : onSearch?.(item.value);
                break;
            case "listing":
                router.push(getPropertyUrl(item.property));
                break;
            default:
                onSearch?.(item.value);
                inputRef.current?.blur();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (status === "searching") return;
        if (activeIndex >= 0 && suggestions[activeIndex]) return choose(suggestions[activeIndex]);
        if (!query) {
            // Empty submit clears an existing keyword search
            if (searchTerm) onSearch?.("");
            return;
        }
        if (idMatch) return openById(idMatch);
        // An exact district / type name applies that filter; anything else is a keyword search
        const district = districts.find((d) => d.toLowerCase() === qLower);
        if (district) return choose({ kind: "district", value: district });
        const type = typeOptions.find((t) => t.toLowerCase() === qLower);
        if (type) return choose({ kind: "type", value: type });
        choose({ kind: "keyword", value: query });
    };

    const handleKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === "Escape") {
            if (open) setOpen(false);
            else if (value) clear();
        }
    };

    const handleChange = (e) => {
        setValue(e.target.value);
        setOpen(true);
        if (status === "error") {
            setStatus("idle");
            setMessage("");
        }
    };

    const clear = () => {
        setValue("");
        setStatus("idle");
        setMessage("");
        setOpen(false);
        if (searchTerm) onSearch?.("");
        inputRef.current?.focus();
    };

    const isSearching = status === "searching";
    const hasError = status === "error";
    const showList = open && query.length > 0 && suggestions.length > 0;

    const iconFor = (kind) => {
        if (kind === "id") return <RiHashtag />;
        if (kind === "district" || kind === "locality") return <RiMapPinLine />;
        if (kind === "type") return <RiBuilding2Line />;
        if (kind === "listing") return <RiHome4Line />;
        return <RiSearchLine />;
    };

    // Group headings shown once, before the first item of each kind
    const groupTitle = { id: "Property ID", district: "Districts", locality: "Localities", type: "Property types", listing: "Listings" };

    return (
        <form ref={wrapRef} className={styles.wrapper} onSubmit={handleSubmit} role="search" noValidate>
            <div className={`${styles.field} ${hasError ? styles.fieldError : ""}`}>
                <RiSearchLine className={styles.leadIcon} aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    value={value}
                    onChange={handleChange}
                    onFocus={() => query && setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search ID, location, property type…"
                    aria-label="Search properties by ID, location or property type"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? "property-search-msg" : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    maxLength={80}
                    disabled={isSearching}
                />
                {liveLoading && open && <RiLoader4Line className={`${styles.spin} ${styles.liveSpin}`} aria-hidden="true" />}
                {value && !isSearching && (
                    <button type="button" className={styles.clearBtn} onClick={clear} aria-label="Clear search">
                        <RiCloseLine />
                    </button>
                )}
                <button
                    type="submit"
                    className={styles.goBtn}
                    disabled={isSearching}
                    aria-label={isSearching ? "Searching" : "Search"}
                >
                    {isSearching ? <RiLoader4Line className={styles.spin} /> : <RiArrowRightLine />}
                </button>
            </div>

            {showList && (
                <ul id={listId} className={styles.dropdown} role="listbox" aria-label="Search suggestions">
                    {suggestions.map((item, i) => {
                        const prev = suggestions[i - 1];
                        const title = groupTitle[item.kind];
                        const showTitle = title && (!prev || prev.kind !== item.kind);
                        return (
                            <li key={item.key} role="presentation">
                                {showTitle && <p className={styles.groupTitle}>{title}</p>}
                                <button
                                    type="button"
                                    id={`${listId}-${i}`}
                                    role="option"
                                    aria-selected={i === activeIndex}
                                    className={`${styles.option} ${i === activeIndex ? styles.optionActive : ""} ${item.kind === "keyword" ? styles.optionKeyword : ""}`}
                                    onMouseEnter={() => setActiveIndex(i)}
                                    onClick={() => choose(item)}
                                >
                                    <span className={styles.optionIcon}>{iconFor(item.kind)}</span>
                                    <span className={styles.optionText}>
                                        <span className={styles.optionLabel}>
                                            {item.kind === "keyword" || item.kind === "id" ? item.label : <Highlight text={item.label} query={query} />}
                                        </span>
                                        {item.sub && <span className={styles.optionSub}>{item.sub}</span>}
                                    </span>
                                    {i === activeIndex && <RiCornerDownLeftLine className={styles.enterHint} aria-hidden="true" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {hasError && (
                <p id="property-search-msg" className={styles.message} role="alert">
                    <RiErrorWarningLine aria-hidden="true" />
                    {message}
                </p>
            )}
        </form>
    );
}
