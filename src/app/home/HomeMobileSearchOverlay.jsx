"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./homeBanner.module.css";
import { readRecentSearches, clearRecentSearches } from "./recentSearches";

/* Split out of homeBanner.jsx so it loads as its own chunk, only when needed. */

const PinIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
const HomeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 7l9-4 9 4v14H3V7z" />
        <path d="M9 21v-6h6v6" />
    </svg>
);
const ClockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </svg>
);
const SearchIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
    </svg>
);
const ArrowUpLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 17L7 7M7 15V7h8" />
    </svg>
);

/* Bold the part of a suggestion that matches what was typed */
function Highlight({ text, query }) {
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (!query || i === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, i)}
            <mark className={styles.msMark}>{text.slice(i, i + query.length)}</mark>
            {text.slice(i + query.length)}
        </span>
    );
}

export default function HomeMobileSearchOverlay({
    activeTab,
    exampleIndex,
    exampleSearches,
    filteredSuggestions,
    handleMobileLocationSubmit,
    handleMobileVoiceSearch,
    handleUseCurrentLocation,
    isLocating,
    isMobileListening,
    mobileLocationInput,
    mobileTabs,
    popularLocalities = [],
    cityOptions = [],
    propertySearchSuggestions,
    runMobileSearch,
    setActiveTab,
    setHasUserSelectedTab,
    setMobileLocationInput,
    setMobileSearchOpen,
    trimmedMobileQuery,
}) {
    const inputRef = useRef(null);
    const [recent, setRecent] = useState([]);

    useEffect(() => {
        setRecent(readRecentSearches());
        // Focus after the slide-in so mobile keyboards open reliably
        const t = setTimeout(() => inputRef.current?.focus(), 60);
        return () => clearTimeout(t);
    }, []);

    const close = () => setMobileSearchOpen(false);

    const clearInput = () => {
        setMobileLocationInput("");
        inputRef.current?.focus();
    };

    const fillInput = (text) => {
        setMobileLocationInput(text);
        inputRef.current?.focus();
    };

    const placeLabels = filteredSuggestions.filter((s) => !propertySearchSuggestions.includes(s)).slice(0, 6);
    const typeLabels = filteredSuggestions.filter((s) => propertySearchSuggestions.includes(s)).slice(0, 5);
    const purposeWord = (activeTab || "Buy").toLowerCase() === "buy" ? "for sale" : `for ${(activeTab || "").toLowerCase()}`;

    const Chip = ({ label, icon }) => (
        <button type="button" className={styles.msChip} onClick={() => runMobileSearch(label)}>
            {icon}
            {label}
        </button>
    );

    return (
        <div className={styles.mobileSearchOverlay} role="dialog" aria-modal="true" aria-label="Search properties">
            {/* ---------- Header: back + input, then Buy/Rent/Lease ---------- */}
            <div className={styles.msHeader}>
                <form className={styles.msSearchRow} onSubmit={handleMobileLocationSubmit} role="search">
                    <button type="button" className={styles.msBackBtn} onClick={close} aria-label="Close search">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <div className={styles.msInputWrap}>
                        <span className={styles.msInputIcon}><SearchIcon /></span>
                        <input
                            ref={inputRef}
                            type="search"
                            inputMode="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className={styles.mobileSearchInput}
                            placeholder={`Try "${exampleSearches[exampleIndex]}"`}
                            value={mobileLocationInput}
                            onChange={(e) => setMobileLocationInput(e.target.value)}
                            aria-label="Search locality, city or property type"
                        />
                        {mobileLocationInput ? (
                            <button type="button" className={styles.msClearBtn} onClick={clearInput} aria-label="Clear search">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className={`${styles.mobileIconBtn} ${styles.msLocateBtn}`}
                            onClick={handleUseCurrentLocation}
                            disabled={isLocating}
                            title={isLocating ? "Finding your location…" : `Properties ${purposeWord} near you`}
                            aria-label={isLocating ? "Finding your location" : "Use my current location"}
                        >
                            {isLocating ? (
                                <span className={styles.mobileIconSpinner} />
                            ) : (
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <circle cx="12" cy="12" r="8" />
                                    <line x1="12" y1="1" x2="12" y2="4" />
                                    <line x1="12" y1="20" x2="12" y2="23" />
                                    <line x1="1" y1="12" x2="4" y2="12" />
                                    <line x1="20" y1="12" x2="23" y2="12" />
                                </svg>
                            )}
                        </button>
                        <span className={styles.mobileIconDivider} />
                        <button
                            type="button"
                            className={`${styles.mobileIconBtn} ${isMobileListening ? styles.mobileIconBtnListening : ""}`}
                            onClick={handleMobileVoiceSearch}
                            title={isMobileListening ? "Listening..." : "Voice search"}
                            aria-label="Voice search"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </button>
                    </div>
                </form>

                <div className={styles.msTabs} role="tablist" aria-label="Looking to">
                    {mobileTabs.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.value}
                            className={`${styles.msTab} ${activeTab === tab.value ? styles.msTabActive : ""}`}
                            onClick={() => {
                                setActiveTab(tab.value);
                                setHasUserSelectedTab(true);
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ---------- Body ---------- */}
            <div className={styles.msBody}>
                {isMobileListening && (
                    <div className={styles.msListening} role="status">
                        <span className={styles.msListeningDot} />
                        Listening… say a locality or property type
                    </div>
                )}

                {trimmedMobileQuery ? (
                    /* ----- Typing: live suggestions ----- */
                    <div className={styles.msResults}>
                        <button
                            type="button"
                            className={`${styles.mobileSuggestionItem} ${styles.msSearchFor}`}
                            onClick={() => runMobileSearch(trimmedMobileQuery)}
                        >
                            <span className={styles.msRowIcon}><SearchIcon size={16} /></span>
                            <span className={styles.msRowText}>
                                Search &ldquo;<strong>{trimmedMobileQuery}</strong>&rdquo; {purposeWord}
                            </span>
                        </button>

                        {placeLabels.length > 0 && (
                            <>
                                <p className={styles.msGroupTitle}>Localities &amp; cities</p>
                                {placeLabels.map((item) => (
                                    <div key={item} className={styles.msRow}>
                                        <button type="button" className={styles.mobileSuggestionItem} onClick={() => runMobileSearch(item)}>
                                            <span className={styles.msRowIcon}><PinIcon /></span>
                                            <span className={styles.msRowText}><Highlight text={item} query={trimmedMobileQuery} /></span>
                                        </button>
                                        <button type="button" className={styles.msFillBtn} onClick={() => fillInput(item)} aria-label={`Use ${item} in search box`}>
                                            <ArrowUpLeft />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}

                        {typeLabels.length > 0 && (
                            <>
                                <p className={styles.msGroupTitle}>Property types</p>
                                {typeLabels.map((item) => (
                                    <div key={item} className={styles.msRow}>
                                        <button type="button" className={styles.mobileSuggestionItem} onClick={() => runMobileSearch(item)}>
                                            <span className={styles.msRowIcon}><HomeIcon /></span>
                                            <span className={styles.msRowText}><Highlight text={item} query={trimmedMobileQuery} /></span>
                                        </button>
                                        <button type="button" className={styles.msFillBtn} onClick={() => fillInput(`${item} in `)} aria-label={`Start a search for ${item}`}>
                                            <ArrowUpLeft />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}

                        {placeLabels.length === 0 && typeLabels.length === 0 && (
                            <p className={styles.mobileNoSuggestions}>
                                No suggestions — tap the search above or press Enter to search anyway.
                            </p>
                        )}
                    </div>
                ) : (
                    /* ----- Empty: recent + quick picks ----- */
                    <>
                        {recent.length > 0 && (
                            <section className={styles.msSection}>
                                <div className={styles.msSectionHead}>
                                    <p className={styles.msGroupTitle}>Recent searches</p>
                                    <button
                                        type="button"
                                        className={styles.msLinkBtn}
                                        onClick={() => {
                                            clearRecentSearches();
                                            setRecent([]);
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div>
                                {recent.map((item) => (
                                    <button key={item} type="button" className={styles.mobileSuggestionItem} onClick={() => runMobileSearch(item)}>
                                        <span className={styles.msRowIcon}><ClockIcon /></span>
                                        <span className={styles.msRowText}>{item}</span>
                                    </button>
                                ))}
                            </section>
                        )}

                        <section className={styles.msSection}>
                            <p className={styles.msGroupTitle}>Popular localities</p>
                            <div className={styles.msChips}>
                                {popularLocalities.slice(0, 8).map((l) => (
                                    <Chip key={l} label={l} icon={<PinIcon />} />
                                ))}
                            </div>
                        </section>

                        <section className={styles.msSection}>
                            <p className={styles.msGroupTitle}>Property types</p>
                            <div className={styles.msChips}>
                                {propertySearchSuggestions.slice(0, 8).map((t) => (
                                    <Chip key={t} label={t} icon={<HomeIcon />} />
                                ))}
                            </div>
                        </section>

                        {cityOptions.length > 0 && (
                            <section className={styles.msSection}>
                                <p className={styles.msGroupTitle}>Cities in Kerala</p>
                                <div className={styles.msChips}>
                                    {cityOptions.slice(0, 10).map((c) => (
                                        <Chip key={c} label={c} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
