"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiCloseLine, RiCheckLine, RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import styles from "./sectionModal.module.css";

/**
 * Popup editor for one Builder Portal section.
 *
 * - Left rail lists every section with its completion, so builders can jump between
 *   sections without closing the popup.
 * - Footer has Previous / Next to step through the sections in order.
 * - Changes are applied (and auto-saved) as the user types, so "Done" simply closes it.
 */
export default function SectionModal({
    open,
    icon,
    title,
    subtitle,
    badge,
    onClose,
    onDone,
    onBeforeNavigate,
    children,
    sections = [],
    activeKey,
    onNavigate,
}) {
    const [portalTarget, setPortalTarget] = useState(null);
    const dialogRef = useRef(null);
    const scrollRef = useRef(null);
    const titleId = useId();

    // Render inside the portal page (not <body>) so the page's CSS variables still apply.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPortalTarget(document.querySelector("[data-section-modal-root]") || document.body);
    }, []);

    // Lock page scroll and move focus into the popup while it is open.
    useEffect(() => {
        if (!open) return undefined;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialogRef.current?.focus({ preventScroll: true });
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [open]);

    if (!open || !portalTarget) return null;

    const index = sections.findIndex((s) => s.key === activeKey);
    const current = sections[index];
    const prev = index > 0 ? sections[index - 1] : null;
    const next = index >= 0 && index < sections.length - 1 ? sections[index + 1] : null;
    const percent = current?.percent ?? 0;
    const doneCount = sections.filter((s) => s.isComplete).length;

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
        }
    };

    const scrollFirstErrorIntoView = () => {
        requestAnimationFrame(() => {
            const errEl = scrollRef.current?.querySelector('[data-field-error="true"]');
            if (errEl) {
                errEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    };

    const go = (key) => {
        if (!key || !onNavigate) return;
        if (key !== activeKey && typeof onBeforeNavigate === "function") {
            const allowed = onBeforeNavigate(activeKey, key);
            if (allowed === false) {
                scrollFirstErrorIntoView();
                return;
            }
        }
        onNavigate(key);
        scrollRef.current?.scrollTo({ top: 0 });
    };

    const handleDoneClick = () => {
        if (typeof onDone === "function") {
            const allowed = onDone(activeKey);
            if (allowed === false) {
                scrollFirstErrorIntoView();
                return;
            }
        }
        onClose();
    };

    return createPortal(
        <div
            className={styles.backdrop}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        {icon && <div className={styles.iconBox} aria-hidden="true">{icon}</div>}
                        <div className={styles.headerText}>
                            {sections.length > 0 && index >= 0 && (
                                <span className={styles.stepLabel}>
                                    Step {index + 1} of {sections.length}
                                </span>
                            )}
                            <h2 id={titleId} className={styles.title}>{title}</h2>
                            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        {badge}
                        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close" title="Close (Esc)">
                            <RiCloseLine aria-hidden="true" />
                        </button>
                    </div>
                    <div
                        className={styles.progressTrack}
                        role="progressbar"
                        aria-label="Section completion"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                    >
                        <span
                            className={`${styles.progressFill} ${percent === 100 ? styles.progressFillDone : ""}`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </header>

                <div className={styles.main}>
                    {sections.length > 0 && (
                        <nav className={styles.rail} aria-label="Page sections">
                            <p className={styles.railHeading}>
                                Page sections
                                <span className={styles.railCount}>{doneCount}/{sections.length} done</span>
                            </p>
                            <ol className={styles.railList}>
                                {sections.map((s, i) => {
                                    const isActive = s.key === activeKey;
                                    const Icon = s.icon;
                                    return (
                                        <li key={s.key}>
                                            <button
                                                type="button"
                                                className={`${styles.railItem} ${isActive ? styles.railItemActive : ""}`}
                                                aria-current={isActive ? "step" : undefined}
                                                onClick={() => go(s.key)}
                                            >
                                                <span
                                                    className={`${styles.railDot} ${s.isComplete ? styles.railDotDone : s.percent > 0 ? styles.railDotPartial : ""}`}
                                                    aria-hidden="true"
                                                >
                                                    {s.isComplete ? <RiCheckLine /> : Icon ? <Icon /> : i + 1}
                                                </span>
                                                <span className={styles.railText}>
                                                    <span className={styles.railTitle}>{s.title}</span>
                                                    <span className={styles.railMeta}>
                                                        {s.isComplete ? "Completed" : s.percent > 0 ? `${s.percent}% filled` : "Not started"}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        </nav>
                    )}

                    <div ref={scrollRef} className={styles.body}>
                        <div className={styles.content}>{children}</div>
                    </div>
                </div>

                <footer className={styles.footer}>
                    <div className={styles.footerLeft}>
                        {prev ? (
                            <button type="button" className={styles.ghostBtn} onClick={() => go(prev.key)}>
                                <RiArrowLeftSLine aria-hidden="true" />
                                <span className={styles.btnLabelLong}>{prev.title}</span>
                                <span className={styles.btnLabelShort}>Back</span>
                            </button>
                        ) : (
                            <span className={styles.savedNote}>
                                <span className={styles.savedDot} aria-hidden="true" />
                                Changes save automatically
                            </span>
                        )}
                    </div>
                    <div className={styles.footerRight}>
                        {prev && (
                            <span className={styles.savedNote}>
                                <span className={styles.savedDot} aria-hidden="true" />
                                Auto-saved
                            </span>
                        )}
                        {next ? (
                            <>
                                <button type="button" className={styles.secondaryBtn} onClick={handleDoneClick}>
                                    Done
                                </button>
                                <button type="button" className={styles.primaryBtn} onClick={() => go(next.key)}>
                                    <span className={styles.btnLabelLong}>Next: {next.title}</span>
                                    <span className={styles.btnLabelShort}>Next</span>
                                    <RiArrowRightSLine aria-hidden="true" />
                                </button>
                            </>
                        ) : (
                            <button type="button" className={styles.primaryBtn} onClick={handleDoneClick}>
                                <RiCheckLine aria-hidden="true" /> Finish
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>,
        portalTarget
    );
}
