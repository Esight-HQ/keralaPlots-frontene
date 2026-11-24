"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import styles from "./enquiries.module.css";
import EmptyState from "./EmptyState";
import { useAuth } from "../context/AuthContext";
import { useBuilderStatus } from "../lib/builderStatus";
import {
    ENQUIRY_STATUSES,
    getEnquiries,
    getServerEnquiries,
    subscribeEnquiries,
    refreshEnquiries,
    updateEnquiry,
    deleteEnquiry,
    markAllRead,
    enquiriesToCsv,
} from "../lib/builderEnquiries";
import {
    RiSearchLine,
    RiCloseLine,
    RiPhoneFill,
    RiWhatsappLine,
    RiMailLine,
    RiCalendarLine,
    RiDownload2Line,
    RiCheckDoubleLine,
    RiDeleteBinLine,
    RiExternalLinkLine,
    RiFileCopyLine,
    RiTimeLine,
    RiBuilding2Line,
    RiChat3Line,
    RiArrowRightSLine,
    RiInboxLine,
} from "react-icons/ri";
import { safeHref } from "../lib/safeHref";

const STATUS_TONE = { new: styles.toneNew, contacted: styles.toneContacted, site_visit: styles.toneVisit, closed: styles.toneClosed };
const statusLabel = (id) => ENQUIRY_STATUSES.find((s) => s.id === id)?.label || "New";

const digitsOnly = (v) => String(v || "").replace(/\D/g, "");
// Indian numbers: keep last 10 digits for tel / wa.me links
const phoneLink = (v) => {
    const d = digitsOnly(v);
    return d.length >= 10 ? d.slice(-10) : d;
};

const initials = (name) =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("") || "?";

const rtf = typeof Intl !== "undefined" && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;
function relativeTime(iso) {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (!rtf || Number.isNaN(diff)) return "";
    if (abs < 60) return "just now";
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
const fullDate = (iso) =>
    new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function StatusPill({ status }) {
    return (
        <span className={`${styles.statusPill} ${STATUS_TONE[status] || styles.toneNew}`}>
            <span className={styles.statusDot} aria-hidden="true" />
            {statusLabel(status)}
        </span>
    );
}

/* ───────────── Detail drawer ───────────── */
function EnquiryDrawer({ enquiry, onClose }) {
    const [note, setNote] = useState(enquiry.note || "");
    const [noteSaved, setNoteSaved] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [copied, setCopied] = useState(false);
    const closeRef = useRef(null);
    const phone = phoneLink(enquiry.phone);

    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const saveNote = () => {
        updateEnquiry(enquiry.id, { note: note.trim() });
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 1800);
    };

    const copyPhone = async () => {
        try {
            await navigator.clipboard.writeText(enquiry.phone);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked */
        }
    };

    return (
        <div className={styles.drawerOverlay} onClick={onClose}>
            <aside
                className={styles.drawer}
                role="dialog"
                aria-modal="true"
                aria-labelledby="enq-drawer-title"
                onClick={(e) => e.stopPropagation()}
            >
                <header className={styles.drawerHead}>
                    <span className={styles.avatarLg} aria-hidden="true">{initials(enquiry.name)}</span>
                    <div className={styles.drawerHeadText}>
                        <h2 id="enq-drawer-title">{enquiry.name || "Unnamed visitor"}</h2>
                        <span className={styles.drawerMeta}>
                            <RiTimeLine aria-hidden="true" /> {fullDate(enquiry.createdAt)}
                        </span>
                    </div>
                    <button ref={closeRef} type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close details">
                        <RiCloseLine />
                    </button>
                </header>

                <div className={styles.drawerBody}>
                    <div className={styles.quickActions}>
                        {phone && (
                            <a href={`tel:+91${phone}`} className={`${styles.qaBtn} ${styles.qaCall}`}>
                                <RiPhoneFill aria-hidden="true" /> Call
                            </a>
                        )}
                        {phone && (
                            <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer" className={`${styles.qaBtn} ${styles.qaWa}`}>
                                <RiWhatsappLine aria-hidden="true" /> WhatsApp
                            </a>
                        )}
                        {enquiry.email && (
                            <a href={`mailto:${enquiry.email}`} className={`${styles.qaBtn} ${styles.qaMail}`}>
                                <RiMailLine aria-hidden="true" /> Email
                            </a>
                        )}
                    </div>

                    <section className={styles.block}>
                        <label className={styles.blockLabel} htmlFor="enq-status">Status</label>
                        <div className={styles.statusSeg} role="radiogroup" aria-label="Enquiry status" id="enq-status">
                            {ENQUIRY_STATUSES.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={enquiry.status === s.id}
                                    className={`${styles.segBtn} ${enquiry.status === s.id ? styles.segBtnActive : ""}`}
                                    onClick={() => updateEnquiry(enquiry.id, { status: s.id })}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className={styles.block}>
                        <span className={styles.blockLabel}>Contact details</span>
                        <dl className={styles.detailList}>
                            <div>
                                <dt><RiPhoneFill aria-hidden="true" /> Phone</dt>
                                <dd>
                                    {enquiry.phone || "—"}
                                    {enquiry.phone && (
                                        <button type="button" className={styles.copyBtn} onClick={copyPhone}>
                                            <RiFileCopyLine aria-hidden="true" /> {copied ? "Copied" : "Copy"}
                                        </button>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt><RiMailLine aria-hidden="true" /> Email</dt>
                                <dd>{enquiry.email || "—"}</dd>
                            </div>
                            {enquiry.visitTime && (
                                <div>
                                    <dt><RiCalendarLine aria-hidden="true" /> Preferred visit</dt>
                                    <dd>{enquiry.visitTime}</dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    <section className={styles.block}>
                        <span className={styles.blockLabel}>Message</span>
                        <p className={styles.messageFull}>{enquiry.message || "No message was added."}</p>
                    </section>

                    <section className={styles.block}>
                        <span className={styles.blockLabel}>Source</span>
                        <dl className={styles.detailList}>
                            <div>
                                <dt><RiBuilding2Line aria-hidden="true" /> Builder page</dt>
                                <dd>{enquiry.builderName || "—"}</dd>
                            </div>
                            <div>
                                <dt><RiChat3Line aria-hidden="true" /> Form</dt>
                                <dd>{enquiry.source || "—"}</dd>
                            </div>
                        </dl>
                        {safeHref(enquiry.pageUrl) && (
                            <a href={safeHref(enquiry.pageUrl)} target="_blank" rel="noopener noreferrer" className={styles.textLink}>
                                Open builder page <RiExternalLinkLine aria-hidden="true" />
                            </a>
                        )}
                    </section>

                    <section className={styles.block}>
                        <label className={styles.blockLabel} htmlFor="enq-note">Private note</label>
                        <textarea
                            id="enq-note"
                            className={styles.noteInput}
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="E.g. Called on Monday, visiting Saturday 11am…"
                        />
                        <div className={styles.noteRow}>
                            <span className={styles.noteSaved} role="status">{noteSaved ? "Note saved" : ""}</span>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                onClick={saveNote}
                                disabled={note.trim() === (enquiry.note || "")}
                            >
                                Save note
                            </button>
                        </div>
                    </section>
                </div>

                <footer className={styles.drawerFoot}>
                    {confirmDelete ? (
                        <div className={styles.confirmRow}>
                            <span>Delete this enquiry permanently?</span>
                            <button type="button" className={styles.ghostBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
                            <button
                                type="button"
                                className={styles.dangerBtn}
                                onClick={() => {
                                    deleteEnquiry(enquiry.id);
                                    onClose();
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    ) : (
                        <button type="button" className={styles.deleteLink} onClick={() => setConfirmDelete(true)}>
                            <RiDeleteBinLine aria-hidden="true" /> Delete enquiry
                        </button>
                    )}
                </footer>
            </aside>
        </div>
    );
}

/* ───────────── Page ───────────── */
export default function Enquiries() {
    const { user } = useAuth();
    const builder = useBuilderStatus(user);
    if (!builder.isApproved) return <BuilderOnlyNotice status={builder.status} />;
    return <EnquiriesList />;
}

/* Shown when a non-builder (or a builder still under review) opens /profile/enquiries */
function BuilderOnlyNotice({ status }) {
    const copy =
        status === "pending"
            ? {
                title: "Available After Approval",
                lines: ["Your builder registration is under review.", "Enquiries from your builder webpage will appear here once it is approved."],
                cta: { href: "/profile", label: "Back to Dashboard" },
            }
            : status === "rejected"
                ? {
                    title: "Builder Verification Needed",
                    lines: ["Your builder registration was not approved.", "Update your details and resubmit to unlock the Builder Portal and Enquiries."],
                    cta: { href: "/register-builder?recheck=true", label: "Recheck Registration" },
                }
                : {
                    title: "For Verified Builders",
                    lines: ["Enquiries are leads from a builder’s webpage.", "Register as a builder to create your page and receive enquiries."],
                    cta: { href: "/register-builder", label: "Register as Builder" },
                };
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Enquiries</h1>
                </div>
            </header>
            <EmptyState title={copy.title} lines={copy.lines}>
                <Link href={copy.cta.href} className={styles.primaryBtn}>{copy.cta.label}</Link>
            </EmptyState>
        </div>
    );
}

function EnquiriesList() {
    const enquiries = useSyncExternalStore(subscribeEnquiries, getEnquiries, getServerEnquiries);
    const [status, setStatus] = useState("all");
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("newest");
    const [builder, setBuilder] = useState("all");
    const [openId, setOpenId] = useState(null);

    useEffect(() => {
        refreshEnquiries({ force: true });
    }, []);

    const counts = useMemo(() => {
        const c = { all: enquiries.length, unread: 0 };
        ENQUIRY_STATUSES.forEach((s) => (c[s.id] = 0));
        enquiries.forEach((e) => {
            c[e.status] = (c[e.status] || 0) + 1;
            if (!e.read) c.unread += 1;
        });
        return c;
    }, [enquiries]);

    const builders = useMemo(
        () => [...new Set(enquiries.map((e) => e.builderName).filter(Boolean))].sort(),
        [enquiries]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const qDigits = digitsOnly(q);
        const list = enquiries.filter((e) => {
            if (status !== "all" && e.status !== status) return false;
            if (builder !== "all" && e.builderName !== builder) return false;
            if (!q) return true;
            return (
                [e.name, e.email, e.message, e.builderName, e.visitTime, e.note].some((v) => String(v || "").toLowerCase().includes(q)) ||
                (qDigits.length >= 3 && digitsOnly(e.phone).includes(qDigits))
            );
        });
        return list.sort((a, b) =>
            sort === "oldest"
                ? String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
                : String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        );
    }, [enquiries, status, builder, query, sort]);

    const open = openId !== null ? enquiries.find((e) => String(e.id) === String(openId)) || null : null;

    const openEnquiry = (e) => {
        if (!e.read) updateEnquiry(e.id, { read: true });
        setOpenId(e.id);
    };

    const exportCsv = () => {
        const csv = "﻿" + enquiriesToCsv(filtered);
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `builder-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const filtersActive = status !== "all" || builder !== "all" || query.trim();

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Enquiries</h1>
                    <p className={styles.sub}>
                        Leads submitted through the contact and site-visit forms on your builder webpage.
                    </p>
                </div>
                {enquiries.length > 0 && (
                    <div className={styles.headerActions}>
                        <button type="button" className={styles.ghostBtn} onClick={markAllRead} disabled={!counts.unread}>
                            <RiCheckDoubleLine aria-hidden="true" /> Mark all read
                        </button>
                        <button type="button" className={styles.primaryBtn} onClick={exportCsv} disabled={!filtered.length}>
                            <RiDownload2Line aria-hidden="true" /> Export CSV
                        </button>
                    </div>
                )}
            </header>

            {enquiries.length === 0 ? (
                <EmptyState
                    title="No Enquiries Yet"
                    lines={[
                        "When visitors fill in the enquiry or site-visit form on your builder webpage,",
                        "their details will show up here.",
                    ]}
                >
                    <Link href="/builder-portal" className={styles.primaryBtn}>Open Builder Portal</Link>
                </EmptyState>
            ) : (
                <>
                    <div className={styles.statTabs} role="tablist" aria-label="Filter by status">
                        {[{ id: "all", label: "All" }, ...ENQUIRY_STATUSES].map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                role="tab"
                                aria-selected={status === s.id}
                                className={`${styles.statTab} ${status === s.id ? styles.statTabActive : ""}`}
                                onClick={() => setStatus(s.id)}
                            >
                                <span className={styles.statNum}>{counts[s.id] || 0}</span>
                                <span className={styles.statLabel}>
                                    {s.label}
                                    {s.id === "all" && counts.unread > 0 && (
                                        <span className={styles.unreadBadge}>{counts.unread} unread</span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.toolbar}>
                        <label className={styles.search}>
                            <RiSearchLine aria-hidden="true" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search name, phone, email or message"
                                aria-label="Search enquiries"
                            />
                            {query && (
                                <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                                    <RiCloseLine />
                                </button>
                            )}
                        </label>
                        {builders.length > 1 && (
                            <select className={styles.select} value={builder} onChange={(e) => setBuilder(e.target.value)} aria-label="Filter by builder page">
                                <option value="all">All builder pages</option>
                                {builders.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                        )}
                        <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort enquiries">
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                        </select>
                    </div>

                    <p className={styles.resultCount} role="status">
                        Showing {filtered.length} of {enquiries.length} {enquiries.length === 1 ? "enquiry" : "enquiries"}
                    </p>

                    {filtered.length === 0 ? (
                        <div className={styles.noResults}>
                            <RiInboxLine aria-hidden="true" />
                            <p>No enquiries match your filters.</p>
                            {filtersActive && (
                                <button
                                    type="button"
                                    className={styles.ghostBtn}
                                    onClick={() => {
                                        setStatus("all");
                                        setBuilder("all");
                                        setQuery("");
                                    }}
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <ul className={styles.list}>
                            {filtered.map((e) => {
                                const phone = phoneLink(e.phone);
                                return (
                                    <li key={e.id} className={`${styles.card} ${e.read ? "" : styles.cardUnread}`}>
                                        <button type="button" className={styles.cardMain} onClick={() => openEnquiry(e)}>
                                            <span className={styles.avatar} aria-hidden="true">{initials(e.name)}</span>
                                            <span className={styles.cardBody}>
                                                <span className={styles.cardTop}>
                                                    <span className={styles.name}>
                                                        {!e.read && <span className={styles.unreadDot} aria-label="Unread" />}
                                                        {e.name || "Unnamed visitor"}
                                                    </span>
                                                    <StatusPill status={e.status} />
                                                </span>
                                                <span className={styles.contactLine}>
                                                    {e.phone && <span>{e.phone}</span>}
                                                    {e.email && <span>{e.email}</span>}
                                                </span>
                                                {(e.message || e.visitTime) && (
                                                    <span className={styles.preview}>
                                                        {e.message || `Preferred visit: ${e.visitTime}`}
                                                    </span>
                                                )}
                                                <span className={styles.metaLine}>
                                                    <span><RiTimeLine aria-hidden="true" /> {relativeTime(e.createdAt)}</span>
                                                    {e.builderName && <span><RiBuilding2Line aria-hidden="true" /> {e.builderName}</span>}
                                                    {e.source && <span className={styles.metaHideSm}>{e.source}</span>}
                                                </span>
                                            </span>
                                            <RiArrowRightSLine className={styles.chevron} aria-hidden="true" />
                                        </button>
                                        {phone && (
                                            <div className={styles.cardActions}>
                                                <a href={`tel:+91${phone}`} className={styles.actionBtn} aria-label={`Call ${e.name}`}>
                                                    <RiPhoneFill aria-hidden="true" /> <span>Call</span>
                                                </a>
                                                <a
                                                    href={`https://wa.me/91${phone}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`${styles.actionBtn} ${styles.actionWa}`}
                                                    aria-label={`WhatsApp ${e.name}`}
                                                >
                                                    <RiWhatsappLine aria-hidden="true" /> <span>WhatsApp</span>
                                                </a>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}

            {open && <EnquiryDrawer key={open.id} enquiry={open} onClose={() => setOpenId(null)} />}
        </div>
    );
}
