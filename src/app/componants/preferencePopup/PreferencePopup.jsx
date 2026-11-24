"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    RiCloseLine,
    RiCheckLine,
    RiArrowLeftLine,
    RiArrowRightLine,
    RiSearchLine,
    RiMapPinLine,
    RiMapPin2Fill,
    RiHome4Line,
    RiHomeHeartLine,
    RiBuilding2Line,
    RiLandscapeLine,
    RiStore2Line,
    RiApps2Line,
    RiParkingBoxLine,
    RiFlashlightLine,
    RiArrowUpDownLine,
    RiShieldCheckLine,
    RiUmbrellaLine,
    RiRunLine,
    RiPlantLine,
    RiCommunityLine,
    RiBearSmileLine,
    RiWaterFlashLine,
} from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import {
    AMENITY_OPTIONS,
    BUDGET_OPTIONS,
    EMPTY_PREFERENCES,
    LOCATION_OPTIONS,
    OPEN_PREFERENCES_EVENT,
    PROPERTY_TYPE_OPTIONS,
    getPreferences,
    getUserIdFrom,
    isPreferencePromptPending,
    preferencesToPropertiesUrl,
    clearPreferences,
    savePreferences,
    searchLocations,
    skipPreferences,
} from "../../lib/preferencesStore";
import styles from "./preferencePopup.module.css";

/* Pages where a popup would interrupt a task in progress. The prompt stays
   pending and appears on the next page the user visits instead. */
const BLOCKED_PATHS = ["/login", "/auth", "/post-property", "/post-reel", "/quick-sell", "/register-agent", "/adminPanel"];
const SHOW_DELAY_MS = 900;

const TYPE_ICONS = {
    house: RiHome4Line,
    villa: RiHomeHeartLine,
    apartment: RiBuilding2Line,
    plot: RiLandscapeLine,
    commercial: RiStore2Line,
    other: RiApps2Line,
};

const AMENITY_ICONS = {
    "Car Parking": RiParkingBoxLine,
    "Power Backup": RiFlashlightLine,
    Lift: RiArrowUpDownLine,
    "24/7 Security": RiShieldCheckLine,
    "Swimming Pool": RiUmbrellaLine,
    Gym: RiRunLine,
    Garden: RiPlantLine,
    "Club House": RiCommunityLine,
    "Kids Play Area": RiBearSmileLine,
    "Water Supply": RiWaterFlashLine,
};

const STEPS = [
    { key: "budget", short: "Budget", title: "What's your budget?", sub: "Pick one or more ranges." },
    { key: "location", short: "Location", title: "Where are you looking?", sub: "Search a locality or pick districts." },
    { key: "propertyTypes", short: "Type", title: "What kind of property?", sub: "Choose all that interest you." },
    { key: "amenities", short: "Amenities", title: "Any must-have amenities?", sub: "Optional — helps us rank better matches." },
];

const toggleIn = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/* ------------------------------------------------------------------ */
/* Location step: searchable combobox + district quick picks           */
/* ------------------------------------------------------------------ */
function LocationStep({ prefs, setPrefs }) {
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const listId = useId();
    const inputRef = useRef(null);
    const results = searchLocations(query);

    const isPicked = (item) =>
        item.kind === "district"
            ? prefs.locations.includes(item.name)
            : prefs.localities.some((l) => l.name === item.name && l.district === item.district);

    const pick = (item) => {
        setPrefs((prev) =>
            item.kind === "district"
                ? { ...prev, locations: toggleIn(prev.locations, item.name) }
                : {
                    ...prev,
                    localities: isPicked(item)
                        ? prev.localities.filter((l) => !(l.name === item.name && l.district === item.district))
                        : [...prev.localities, { name: item.name, district: item.district }],
                }
        );
        setQuery("");
        setActiveIndex(0);
        inputRef.current?.focus();
    };

    const removeLocality = (loc) =>
        setPrefs((prev) => ({
            ...prev,
            localities: prev.localities.filter((l) => !(l.name === loc.name && l.district === loc.district)),
        }));

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown" && results.length) {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % results.length);
        } else if (e.key === "ArrowUp" && results.length) {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
            // Enter picks the highlighted match instead of submitting the form.
            e.preventDefault();
            if (results[activeIndex]) pick(results[activeIndex]);
        } else if (e.key === "Escape" && query) {
            // First Esc clears the search; it must not close the whole popup.
            e.preventDefault();
            e.stopPropagation();
            setQuery("");
        }
    };

    const showList = query.trim().length > 0;
    const selectedTags = [
        ...prefs.localities.map((l) => ({ key: `l:${l.district}:${l.name}`, label: l.name, sub: l.district, onRemove: () => removeLocality(l) })),
        ...prefs.locations.map((d) => ({ key: `d:${d}`, label: d, sub: "District", onRemove: () => setPrefs((p) => ({ ...p, locations: p.locations.filter((x) => x !== d) })) })),
    ];

    return (
        <div className={styles.locationStep}>
            <div className={styles.searchWrap}>
                <RiSearchLine className={styles.searchIcon} aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search locality or district, e.g. Kakkanad"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIndex(0);
                    }}
                    onKeyDown={onKeyDown}
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={showList && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                    aria-label="Search locality or district"
                    autoComplete="off"
                    enterKeyHint="done"
                />
                {query && (
                    <button type="button" className={styles.searchClear} onClick={() => setQuery("")} aria-label="Clear search">
                        <RiCloseLine />
                    </button>
                )}

                {showList && (
                    <ul className={styles.results} id={listId} role="listbox">
                        {results.length === 0 && <li className={styles.noResults}>No places match “{query.trim()}”.</li>}
                        {results.map((item, i) => {
                            const picked = isPicked(item);
                            return (
                                <li
                                    key={`${item.kind}:${item.district}:${item.name}`}
                                    id={`${listId}-${i}`}
                                    role="option"
                                    aria-selected={i === activeIndex}
                                    className={`${styles.result} ${i === activeIndex ? styles.resultActive : ""}`}
                                    onMouseEnter={() => setActiveIndex(i)}
                                    // mousedown keeps focus in the input
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        pick(item);
                                    }}
                                >
                                    <RiMapPinLine className={styles.resultIcon} aria-hidden="true" />
                                    <span className={styles.resultText}>
                                        <span className={styles.resultName}>{item.name}</span>
                                        <span className={styles.resultSub}>
                                            {item.kind === "district" ? "District" : `${item.district} district`}
                                        </span>
                                    </span>
                                    {picked && <RiCheckLine className={styles.resultTick} aria-label="Selected" />}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {selectedTags.length > 0 && (
                <div className={styles.tags} aria-label="Selected locations">
                    {selectedTags.map((t) => (
                        <span key={t.key} className={styles.tag}>
                            <RiMapPin2Fill aria-hidden="true" />
                            {t.label}
                            <span className={styles.tagSub}>{t.sub}</span>
                            <button type="button" onClick={t.onRemove} aria-label={`Remove ${t.label}`}>
                                <RiCloseLine />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <p className={styles.subLabel}>Districts</p>
            <div className={styles.chips}>
                {LOCATION_OPTIONS.map((d) => {
                    const active = prefs.locations.includes(d);
                    return (
                        <button
                            key={d}
                            type="button"
                            className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                            aria-pressed={active}
                            onClick={() => setPrefs((p) => ({ ...p, locations: toggleIn(p.locations, d) }))}
                        >
                            {active && <RiCheckLine aria-hidden="true" />}
                            {d}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Popup                                                               */
/* ------------------------------------------------------------------ */
export default function PreferencePopup() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname() || "";
    // The user id the popup is open for — so it never shows one account's
    // popup to another after a logout/login on the same tab.
    const [openFor, setOpenFor] = useState("");
    const open = Boolean(openFor) && openFor === getUserIdFrom(user);
    const [prefs, setPrefs] = useState(EMPTY_PREFERENCES);
    const [step, setStep] = useState(0);
    // "onboarding" after login (Submit → matching properties) or "edit" from
    // the profile page (saves in place, Cancel leaves everything as it was).
    const [mode, setMode] = useState("onboarding");
    const isEdit = mode === "edit";
    const dialogRef = useRef(null);
    const bodyRef = useRef(null);

    const onBlockedPage = BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    const openWith = useCallback((u, { mode: nextMode = "onboarding", step: startStep = 0 } = {}) => {
        setPrefs(getPreferences(u)); // pre-fill if they answered before
        setMode(nextMode);
        setStep(Math.min(Math.max(Number(startStep) || 0, 0), STEPS.length - 1));
        setOpenFor(getUserIdFrom(u));
    }, []);

    // Show once after login / sign-up, on the first suitable page.
    useEffect(() => {
        if (!user || open || onBlockedPage) return;
        if (!isPreferencePromptPending(user)) return;
        const timer = setTimeout(() => openWith(user), SHOW_DELAY_MS);
        return () => clearTimeout(timer);
    }, [user, pathname, open, onBlockedPage, openWith]);

    // Allow other parts of the app to reopen it (e.g. "Edit preferences").
    useEffect(() => {
        const handler = (e) => {
            if (user) openWith(user, e.detail || { mode: "edit" });
        };
        window.addEventListener(OPEN_PREFERENCES_EVENT, handler);
        return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, handler);
    }, [user, openWith]);

    const handleSkip = useCallback(() => {
        // Editing: just close. Onboarding: remember they skipped so we don't nag.
        if (!isEdit) skipPreferences(user);
        setOpenFor("");
    }, [user, isEdit]);

    // Esc = skip, lock page scroll, keep Tab inside the dialog.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.defaultPrevented) return;
            if (e.key === "Escape") {
                handleSkip();
                return;
            }
            if (e.key !== "Tab" || !dialogRef.current) return;
            const focusables = dialogRef.current.querySelectorAll("button:not(:disabled), input");
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialogRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, handleSkip]);

    // New step starts at the top.
    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }, [step]);

    const countFor = (key) =>
        key === "location" ? prefs.locations.length + prefs.localities.length : prefs[key].length;
    const totalSelected = STEPS.reduce((n, s) => n + countFor(s.key), 0);
    const isLast = step === STEPS.length - 1;
    const current = STEPS[step];

    const finish = () => {
        if (isEdit) {
            // Deselecting everything while editing means "clear my preferences".
            if (totalSelected) savePreferences(user, prefs);
            else clearPreferences(user);
            setOpenFor("");
            return;
        }
        if (!totalSelected) return;
        savePreferences(user, prefs);
        setOpenFor("");
        router.push(preferencesToPropertiesUrl(prefs));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Every mode walks the steps; only the last step saves / submits.
        if (isLast) finish();
        else setStep((s) => s + 1);
    };

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={handleSkip}>
            <form
                ref={dialogRef}
                className={styles.card}
                role="dialog"
                aria-modal="true"
                aria-labelledby="prefStepTitle"
                aria-describedby="prefStepSub"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <div className={styles.head}>
                    <div className={styles.headTop}>
                        <span className={styles.kicker}>
                            {isEdit
                                ? "Edit your preferences"
                                : <>{user?.name ? `Hi ${String(user.name).split(" ")[0]} · ` : ""}Let&apos;s personalise your search</>}
                        </span>
                        <button type="button" className={styles.close} onClick={handleSkip} aria-label="Close and skip">
                            <RiCloseLine />
                        </button>
                    </div>

                    {/* Editing: labelled tabs. Onboarding: progress bar (segments are shortcuts). */}
                    {isEdit ? (
                        <div className={styles.tabs} role="tablist" aria-label="Preference sections">
                            {STEPS.map((s, i) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={i === step}
                                    className={`${styles.tab} ${i === step ? styles.tabActive : ""}`}
                                    onClick={() => setStep(i)}
                                >
                                    {s.short}
                                    {countFor(s.key) > 0 && <span className={styles.tabCount}>{countFor(s.key)}</span>}
                                </button>
                            ))}
                        </div>
                    ) : (
                    <div className={styles.progress} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
                        {STEPS.map((s, i) => (
                            <button
                                key={s.key}
                                type="button"
                                className={`${styles.progressSeg} ${i <= step ? styles.progressDone : ""}`}
                                onClick={() => setStep(i)}
                                aria-label={`Go to step ${i + 1}: ${s.title}`}
                                aria-current={i === step ? "step" : undefined}
                            />
                        ))}
                    </div>
                    )}
                    {!isEdit && (
                        <span className={styles.stepCount}>
                            Step {step + 1} of {STEPS.length}
                        </span>
                    )}
                    <h2 id="prefStepTitle" className={styles.title}>
                        {current.title}
                    </h2>
                    <p id="prefStepSub" className={styles.lede}>
                        {current.sub}
                    </p>
                </div>

                <div className={styles.body} ref={bodyRef}>
                    <div key={current.key} className={styles.stepPane}>
                        {current.key === "budget" && (
                            <div className={styles.optionList}>
                                {BUDGET_OPTIONS.map((b) => {
                                    const active = prefs.budget.includes(b.id);
                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            className={`${styles.optionRow} ${active ? styles.optionActive : ""}`}
                                            aria-pressed={active}
                                            onClick={() => setPrefs((p) => ({ ...p, budget: toggleIn(p.budget, b.id) }))}
                                        >
                                            <span className={styles.check} aria-hidden="true">
                                                {active && <RiCheckLine />}
                                            </span>
                                            <span className={styles.optionText}>
                                                <span className={styles.optionLabel}>{b.label}</span>
                                                <span className={styles.optionHint}>{b.hint}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {current.key === "location" && <LocationStep prefs={prefs} setPrefs={setPrefs} />}

                        {current.key === "propertyTypes" && (
                            <div className={styles.tileGrid}>
                                {PROPERTY_TYPE_OPTIONS.map((t) => {
                                    const Icon = TYPE_ICONS[t.id] || RiApps2Line;
                                    const active = prefs.propertyTypes.includes(t.id);
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            className={`${styles.tile} ${active ? styles.tileActive : ""}`}
                                            aria-pressed={active}
                                            onClick={() => setPrefs((p) => ({ ...p, propertyTypes: toggleIn(p.propertyTypes, t.id) }))}
                                        >
                                            {active && (
                                                <span className={styles.tileTick} aria-hidden="true">
                                                    <RiCheckLine />
                                                </span>
                                            )}
                                            <Icon className={styles.tileIcon} aria-hidden="true" />
                                            <span className={styles.tileLabel}>{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {current.key === "amenities" && (
                            <div className={styles.amenityGrid}>
                                {AMENITY_OPTIONS.map((a) => {
                                    const Icon = AMENITY_ICONS[a] || RiCheckLine;
                                    const active = prefs.amenities.includes(a);
                                    return (
                                        <button
                                            key={a}
                                            type="button"
                                            className={`${styles.amenity} ${active ? styles.amenityActive : ""}`}
                                            aria-pressed={active}
                                            onClick={() => setPrefs((p) => ({ ...p, amenities: toggleIn(p.amenities, a) }))}
                                        >
                                            <Icon aria-hidden="true" className={styles.amenityIcon} />
                                            <span>{a}</span>
                                            {active && <RiCheckLine aria-hidden="true" className={styles.amenityTick} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button type="button" className={styles.skipBtn} onClick={handleSkip}>
                        {isEdit ? "Cancel" : "Skip for now"}
                    </button>
                    <div className={styles.actions}>
                        {step > 0 && (
                            <button
                                type="button"
                                className={`${styles.backBtn} ${isEdit ? styles.editStepBtn : ""}`}
                                onClick={() => setStep((s) => s - 1)}
                            >
                                <RiArrowLeftLine aria-hidden="true" /> Back
                            </button>
                        )}
                        <button
                            type="submit"
                            className={styles.nextBtn}
                            disabled={isLast && !totalSelected && !isEdit}
                            title={isLast && !totalSelected && !isEdit ? "Pick at least one preference, or skip" : undefined}
                        >
                            {!isLast ? "Next" : isEdit ? "Save" : "Show properties"}
                            {!isLast && <RiArrowRightLine aria-hidden="true" />}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
