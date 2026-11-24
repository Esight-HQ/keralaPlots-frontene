"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./searchableSelect.module.css";
import { RiArrowDownSLine, RiSearchLine, RiCloseLine, RiCheckLine } from "react-icons/ri";

/**
 * Accessible type-to-filter combobox.
 *
 * - `options`      array of strings to choose from
 * - `allowCustom`  keep whatever the user typed even if it isn't in `options`
 *                  (used for localities, where no list can be exhaustive)
 */
export default function SearchableSelect({
    id,
    label,
    value,
    options,
    onChange,
    placeholder = "Select",
    searchPlaceholder = "Type to search…",
    required = false,
    disabled = false,
    allowCustom = false,
    emptyText = "No matches found",
    helperText,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);

    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const listboxId = useId();

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        // Prefer names that start with the query, then any that contain it —
        // typing "kak" should surface Kakkanad before Chirakkakam.
        const starts = [];
        const contains = [];
        for (const opt of options) {
            const lower = opt.toLowerCase();
            if (lower.startsWith(q)) starts.push(opt);
            else if (lower.includes(q)) contains.push(opt);
        }
        return [...starts, ...contains];
    }, [options, query]);

    const trimmedQuery = query.trim();
    const showCustomRow =
        allowCustom &&
        trimmedQuery.length > 0 &&
        !options.some((o) => o.toLowerCase() === trimmedQuery.toLowerCase());

    // Rows the keyboard can land on: the custom entry (if offered) sits last.
    const rows = showCustomRow ? [...filtered, { custom: true, label: trimmedQuery }] : filtered;

    useEffect(() => {
        setHighlight(0);
    }, [query, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) close();
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Keep the highlighted row visible while arrowing through a long list.
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const el = listRef.current.querySelector(`[data-index="${highlight}"]`);
        if (el) el.scrollIntoView({ block: "nearest" });
    }, [highlight, isOpen]);

    const open = () => {
        if (disabled) return;
        setIsOpen(true);
        setQuery("");
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const close = () => {
        setIsOpen(false);
        setQuery("");
    };

    const commit = (val) => {
        onChange(val);
        close();
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (rows.length ? (h + 1) % rows.length : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (rows.length ? (h - 1 + rows.length) % rows.length : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const row = rows[highlight];
            if (!row) return;
            commit(typeof row === "string" ? row : row.label);
        } else if (e.key === "Escape") {
            e.preventDefault();
            close();
        } else if (e.key === "Tab") {
            close();
        }
    };

    return (
        <div className={styles.field} id={id} ref={wrapperRef}>
            {label && (
                <label className={styles.label}>
                    {label} {required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div className={`${styles.control} ${isOpen ? styles.controlOpen : ""} ${disabled ? styles.controlDisabled : ""}`}>
                {isOpen ? (
                    <>
                        <RiSearchLine className={styles.leadingIcon} />
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.input}
                            placeholder={searchPlaceholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            role="combobox"
                            aria-expanded="true"
                            aria-controls={listboxId}
                            aria-autocomplete="list"
                            aria-activedescendant={rows.length ? `${listboxId}-${highlight}` : undefined}
                        />
                    </>
                ) : (
                    <button
                        type="button"
                        className={styles.trigger}
                        onClick={open}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        role="combobox"
                        aria-expanded="false"
                        aria-controls={listboxId}
                    >
                        <span className={value ? styles.triggerValue : styles.triggerPlaceholder}>
                            {value || placeholder}
                        </span>
                    </button>
                )}

                {value && !disabled && !isOpen && (
                    <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange("");
                        }}
                        aria-label={`Clear ${label || "selection"}`}
                    >
                        <RiCloseLine />
                    </button>
                )}

                <RiArrowDownSLine className={`${styles.caret} ${isOpen ? styles.caretOpen : ""}`} />
            </div>

            {isOpen && (
                <ul className={styles.menu} id={listboxId} role="listbox" ref={listRef}>
                    {rows.length === 0 && <li className={styles.emptyRow}>{emptyText}</li>}

                    {rows.map((row, index) => {
                        const isCustom = typeof row !== "string";
                        const text = isCustom ? row.label : row;
                        const isSelected = !isCustom && value === text;
                        return (
                            <li
                                key={isCustom ? `__custom__${text}` : text}
                                id={`${listboxId}-${index}`}
                                data-index={index}
                                role="option"
                                aria-selected={isSelected}
                                className={`${styles.option} ${index === highlight ? styles.optionActive : ""} ${
                                    isSelected ? styles.optionSelected : ""
                                }`}
                                onMouseEnter={() => setHighlight(index)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => commit(text)}
                            >
                                <span className={styles.optionLabel}>
                                    {isCustom ? (
                                        <>
                                            Use <strong>&ldquo;{text}&rdquo;</strong>
                                        </>
                                    ) : (
                                        text
                                    )}
                                </span>
                                {isSelected && <RiCheckLine className={styles.optionCheck} />}
                            </li>
                        );
                    })}
                </ul>
            )}

            {helperText && !isOpen && <span className={styles.helper}>{helperText}</span>}
        </div>
    );
}
