"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { RiArrowDownSLine, RiSearchLine, RiCloseLine, RiCheckLine, RiAddLine } from "react-icons/ri";
import styles from "./BuilderSearchableSelect.module.css";

/**
 * Deduplicate string array with case-insensitive trimming.
 */
export function deduplicateOptions(items) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    const result = [];
    for (const raw of items) {
        if (!raw || typeof raw !== "string") continue;
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            result.push(trimmed);
        }
    }
    return result;
}

/**
 * Merge multiple option arrays into a single deduplicated array.
 */
export function mergeUniqueOptions(...arrays) {
    const flattened = [];
    for (const arr of arrays) {
        if (Array.isArray(arr)) {
            flattened.push(...arr);
        } else if (typeof arr === "string" && arr.trim()) {
            flattened.push(arr.trim());
        }
    }
    return deduplicateOptions(flattened);
}

/**
 * Searchable Combobox with Create-New capability and automatic deduplication.
 */
export default function BuilderSearchableSelect({
    value = "",
    onChange,
    options = [],
    placeholder = "Select...",
    searchPlaceholder = "Search or type new...",
    onAddNew,
    compact = false,
    className = "",
    disabled = false,
    invalid = false,
    id,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightIndex, setHighlightIndex] = useState(0);

    const wrapperRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const listboxId = useId();

    // Deduplicate incoming options
    const cleanOptions = useMemo(() => deduplicateOptions(options), [options]);

    // Search query normalized
    const cleanSearch = search.trim();
    const searchLower = cleanSearch.toLowerCase();

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!cleanSearch) return cleanOptions;
        const starts = [];
        const contains = [];
        for (const opt of cleanOptions) {
            const optLower = opt.toLowerCase();
            if (optLower.startsWith(searchLower)) {
                starts.push(opt);
            } else if (optLower.includes(searchLower)) {
                contains.push(opt);
            }
        }
        return [...starts, ...contains];
    }, [cleanOptions, cleanSearch, searchLower]);

    // Check if the typed search is a completely new entry not matching existing options
    const exactMatch = useMemo(() => {
        if (!cleanSearch) return null;
        return cleanOptions.find((o) => o.toLowerCase() === searchLower) || null;
    }, [cleanOptions, cleanSearch, searchLower]);

    const showAddNew = Boolean(cleanSearch && !exactMatch);

    // Total rows for keyboard navigation: 0 index is the "Add New" button (if visible)
    // followed by filteredOptions
    const totalRows = (showAddNew ? 1 : 0) + filteredOptions.length;

    // Reset highlight when search changes or dropdown opens
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHighlightIndex(0);
    }, [search, isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
        }
    }, [isOpen]);

    // Click outside handler
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Keep highlighted row in view
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const target = listRef.current.querySelector(`[data-index="${highlightIndex}"]`);
        if (target) {
            target.scrollIntoView({ block: "nearest" });
        }
    }, [highlightIndex, isOpen]);

    const handleSelect = (val) => {
        onChange?.(val);
        setIsOpen(false);
        setSearch("");
    };

    const handleAddNew = (val) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        onAddNew?.(trimmed);
        onChange?.(trimmed);
        setIsOpen(false);
        setSearch("");
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange?.("");
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) => (totalRows > 0 ? (prev + 1) % totalRows : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) => (totalRows > 0 ? (prev - 1 + totalRows) % totalRows : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (showAddNew && highlightIndex === 0) {
                handleAddNew(cleanSearch);
            } else {
                const optIndex = showAddNew ? highlightIndex - 1 : highlightIndex;
                const selected = filteredOptions[optIndex];
                if (selected) {
                    handleSelect(selected);
                } else if (showAddNew) {
                    handleAddNew(cleanSearch);
                }
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
            setSearch("");
        }
    };

    return (
        <div ref={wrapperRef} className={`${styles.wrapper} ${className}`} id={id}>
            {/* Trigger Button */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                aria-invalid={invalid || undefined}
                aria-controls={listboxId}
                aria-haspopup="listbox"
                tabIndex={disabled ? -1 : 0}
                className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""} ${compact ? styles.triggerCompact : ""}`}
                style={invalid ? { borderColor: "#ef4444", backgroundColor: "#fffafb" } : undefined}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
            >
                {value ? (
                    <span className={styles.valueText}>{value}</span>
                ) : (
                    <span className={styles.placeholderText}>{placeholder}</span>
                )}

                <div className={styles.triggerIcons}>
                    {value && !disabled && (
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={handleClear}
                            title="Clear"
                            aria-label="Clear selection"
                        >
                            <RiCloseLine />
                        </button>
                    )}
                    <RiArrowDownSLine className={`${styles.caret} ${isOpen ? styles.caretOpen : ""}`} />
                </div>
            </div>

            {/* Floating Dropdown */}
            {isOpen && (
                <div className={styles.menu} onKeyDown={handleKeyDown}>
                    {/* Search Header */}
                    <div className={styles.searchHeader}>
                        <RiSearchLine className={styles.searchIcon} aria-hidden="true" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className={styles.searchInput}
                            aria-label="Search or enter new option"
                        />
                        {search && (
                            <button
                                type="button"
                                className={styles.clearSearchBtn}
                                onClick={() => setSearch("")}
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <RiCloseLine />
                            </button>
                        )}
                    </div>

                    {/* Create New Option Button */}
                    {showAddNew && (
                        <button
                            type="button"
                            data-index={0}
                            className={`${styles.addNewBtn} ${highlightIndex === 0 ? styles.addNewBtnActive : ""}`}
                            onClick={() => handleAddNew(cleanSearch)}
                            onMouseEnter={() => setHighlightIndex(0)}
                        >
                            <RiAddLine className={styles.addNewIcon} aria-hidden="true" />
                            <span className={styles.addNewText}>
                                Add &ldquo;{cleanSearch}&rdquo;
                            </span>
                            <span className={styles.addNewTag}>Create New</span>
                        </button>
                    )}

                    {/* Options List */}
                    <ul ref={listRef} id={listboxId} role="listbox" className={styles.list}>
                        {filteredOptions.length === 0 && !showAddNew ? (
                            <li className={styles.emptyState}>No matching options found</li>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const rowIndex = showAddNew ? idx + 1 : idx;
                                const isSelected = opt.toLowerCase() === (value || "").toLowerCase();
                                const isHighlighted = rowIndex === highlightIndex;

                                return (
                                    <li
                                        key={opt}
                                        id={`${listboxId}-${idx}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        data-index={rowIndex}
                                        className={`${styles.item} ${isSelected ? styles.itemSelected : ""} ${
                                            isHighlighted ? styles.itemActive : ""
                                        }`}
                                        onClick={() => handleSelect(opt)}
                                        onMouseEnter={() => setHighlightIndex(rowIndex)}
                                    >
                                        <span className={styles.itemText}>{opt}</span>
                                        {isSelected && <RiCheckLine className={styles.checkIcon} aria-hidden="true" />}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
