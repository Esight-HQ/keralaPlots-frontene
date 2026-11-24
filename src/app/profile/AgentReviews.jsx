"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import styles from "./agentReviews.module.css";
import { agentApi } from "../lib/api";
import {
    REVIEW_SORTS,
    reviewDate,
    experienceLabel,
    soldLabel,
} from "./profileData";
import {
    RiArrowLeftLine,
    RiPencilLine,
    RiStarFill,
    RiMapPin2Line,
    RiBriefcaseLine,
    RiBuildingLine,
    RiArrowDownSLine,
    RiMore2Fill,
    RiFlag2Line,
    RiCheckLine,
    RiChat3Line,
} from "react-icons/ri";

const PAGE_SIZE = 8;

/* Avatar tint picked from the name so a given reviewer always gets the same
   colour, rather than shifting when the list is filtered or re-sorted. */
const AVATAR_TONES = ["toneBlue", "toneGreen", "toneAmber", "tonePurple", "tonePink"];

function toneFor(name) {
    let hash = 0;
    const str = name || "User";
    for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function initialsOf(name) {
    if (!name) return "U";
    return name
        .replace(/\./g, "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "U";
}

function Stars({ rating }) {
    const num = Math.round(Number(rating) || 0);
    return (
        <span className={styles.stars} aria-label={`${rating} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
                <RiStarFill
                    key={i}
                    className={i < num ? styles.starOn : styles.starOff}
                    aria-hidden="true"
                />
            ))}
        </span>
    );
}

export default function AgentReviews({ profile = {}, onBack, onEditProfile }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("latest");
    const [visible, setVisible] = useState(PAGE_SIZE);
    const [openMenu, setOpenMenu] = useState(null);
    const [reportedIds, setReportedIds] = useState([]);
    const [avatarError, setAvatarError] = useState(false);
    const listRef = useRef(null);

    const profileId = profile?.loginId || profile?.id || profile?.login_id;

    useEffect(() => {
        let isMounted = true;
        if (!profileId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        agentApi.getReviews(profileId)
            .then((res) => {
                if (!isMounted) return;
                const rawList = res?.data?.reviews || res?.data || (Array.isArray(res) ? res : []);
                const mapped = rawList.map((r) => ({
                    id: r.id || r.review_id,
                    name: r.user?.fullname || r.user?.name || r.user_name || r.name || "Client",
                    place: r.user?.district || r.user?.city || r.place || "Kerala, India",
                    rating: Number(r.rating) || 5,
                    text: r.comment || r.text || "",
                    date: r.created_at ? new Date(r.created_at).getTime() : (r.date || Date.now()),
                }));
                setReviews(mapped);
            })
            .catch((err) => {
                console.warn("Could not load dynamic reviews:", err?.message);
                if (isMounted) setReviews([]);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [profileId]);

    const counts = useMemo(() => {
        const byRating = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((review) => {
            const r = Math.min(5, Math.max(1, Math.round(review.rating)));
            byRating[r] = (byRating[r] ?? 0) + 1;
        });
        return byRating;
    }, [reviews]);

    const total = reviews.length;
    const average = useMemo(() => {
        if (total === 0) return 0;
        return reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / total;
    }, [reviews, total]);

    const dynamicBreakdown = useMemo(() => {
        return [5, 4, 3, 2, 1].map((stars) => ({
            stars,
            count: counts[stars] || 0,
        }));
    }, [counts]);

    const shown = useMemo(() => {
        const picked =
            filter === "all"
                ? reviews
                : reviews.filter((review) => Math.round(review.rating) === Number(filter));

        const ordered = [...picked].sort((a, b) => {
            if (sort === "oldest") return a.date - b.date;
            if (sort === "highest") return b.rating - a.rating || b.date - a.date;
            if (sort === "lowest") return a.rating - b.rating || b.date - a.date;
            return b.date - a.date; // latest first
        });

        return ordered;
    }, [reviews, filter, sort]);

    const displayName = profile?.name || profile?.fullname || profile?.userName || "User";
    const displayRole = profile?.title || profile?.designation || (profile?.role === "agent" ? "Certified Agent" : "Property Owner");
    const displayLocation = profile?.location || profile?.district || profile?.place || "Kerala, India";
    const displayPhoto = profile?.photo || profile?.avatar || profile?.Image;

    /* Changing the filter or sort resets the page window, so you are never left
       looking at "load more" for a list that is now shorter than what is shown. */
    const changeFilter = (value) => {
        setFilter(value);
        setVisible(PAGE_SIZE);
        setOpenMenu(null);
    };

    const changeSort = (value) => {
        setSort(value);
        setVisible(PAGE_SIZE);
        setOpenMenu(null);
    };

    /* An open kebab menu closes on any outside press or on Escape. */
    useEffect(() => {
        if (!openMenu) return;

        const onPointerDown = (event) => {
            if (!event.target.closest(`[data-menu="${openMenu}"]`)) setOpenMenu(null);
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

    const reportReview = (id) => {
        setReportedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        setOpenMenu(null);
    };

    const filterPills = [
        { id: "all", label: `All Reviews (${total})` },
        ...dynamicBreakdown.map(({ stars }) => ({
            id: String(stars),
            label: `${stars} Star (${counts[stars] ?? 0})`,
        })),
    ];

    const maxCount = Math.max(1, ...dynamicBreakdown.map((row) => row.count));

    return (
        <div className={styles.wrap}>
            {/* ==================== HEADER ==================== */}
            <header className={styles.head}>
                <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Back to personal details">
                    <RiArrowLeftLine />
                </button>

                <div className={styles.headText}>
                    <h1 className={styles.title}>Reviews</h1>
                    <p className={styles.sub}>See what clients have to say about {displayName}.</p>
                </div>

                <button type="button" className={styles.editBtn} onClick={onEditProfile}>
                    <RiPencilLine aria-hidden="true" />
                    Edit Profile
                </button>
            </header>

            {/* ==================== SUMMARY ==================== */}
            <section className={styles.summary}>
                <div className={styles.agentCol}>
                    {displayPhoto && !avatarError ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={displayPhoto}
                            alt={displayName}
                            className={styles.agentPhoto}
                            onError={() => setAvatarError(true)}
                        />
                    ) : (
                        <div
                            className={`${styles.agentPhoto} ${styles[toneFor(displayName)]}`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "24px",
                                fontWeight: 700,
                                color: "#ffffff",
                                background: "#2563eb",
                            }}
                        >
                            {initialsOf(displayName)}
                        </div>
                    )}
                    <div>
                        <h2 className={styles.agentName}>{displayName}</h2>
                        <p className={styles.agentRole}>{displayRole}</p>
                        <ul className={styles.agentMeta}>
                            <li><RiMapPin2Line aria-hidden="true" />{displayLocation}</li>
                            <li><RiBriefcaseLine aria-hidden="true" />{profile?.experience_years ? `${profile.experience_years} Years Experience` : experienceLabel(profile)}</li>
                            <li><RiBuildingLine aria-hidden="true" />{profile?.properties_sold ? `${profile.properties_sold} Sold` : soldLabel(profile)}</li>
                        </ul>
                    </div>
                </div>

                <div className={styles.scoreCol}>
                    <p className={styles.scoreValue}>
                        {average > 0 ? average.toFixed(1) : "0.0"}
                        <RiStarFill aria-hidden="true" />
                    </p>
                    <Stars rating={Math.round(average)} />
                    <p className={styles.scoreCount}>({total} {total === 1 ? "Review" : "Reviews"})</p>
                </div>

                <div className={styles.breakdownCol}>
                    {dynamicBreakdown.map(({ stars, count }) => (
                        <div key={stars} className={styles.breakdownRow}>
                            <span className={styles.breakdownLabel}>{stars} Star</span>
                            <span className={styles.breakdownTrack}>
                                <span
                                    className={styles.breakdownFill}
                                    style={{ width: `${total > 0 ? Math.max(2, (count / maxCount) * 100) : 0}%` }}
                                />
                            </span>
                            <span className={styles.breakdownCount}>{count}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ==================== FILTER + SORT ==================== */}
            <div className={styles.toolbar}>
                <div className={styles.pills} role="group" aria-label="Filter reviews by rating">
                    {filterPills.map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            className={`${styles.pill} ${filter === id ? styles.pillActive : ""}`}
                            onClick={() => changeFilter(id)}
                            aria-pressed={filter === id}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className={styles.sortWrap}>
                    <select
                        className={styles.sortSelect}
                        value={sort}
                        onChange={(e) => changeSort(e.target.value)}
                        aria-label="Sort reviews"
                    >
                        {REVIEW_SORTS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                    </select>
                    <RiArrowDownSLine className={styles.sortChevron} aria-hidden="true" />
                </div>
            </div>

            {/* ==================== LIST ==================== */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    Loading reviews...
                </div>
            ) : total === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px", background: "#f8fafc", borderRadius: "16px", border: "1.5px dashed #e2e8f0", margin: "20px 0" }}>
                    <RiChat3Line style={{ fontSize: "42px", color: "#94a3b8", display: "inline-block", marginBottom: "12px" }} />
                    <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>No Reviews Yet</h3>
                    <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "460px", margin: "0 auto", lineHeight: 1.6 }}>
                        When clients leave feedback on your properties and profile, their verified reviews will appear here.
                    </p>
                </div>
            ) : shown.length === 0 ? (
                <p className={styles.empty}>No reviews with that rating yet.</p>
            ) : (
                <ul className={styles.list} ref={listRef}>
                    {shown.slice(0, visible).map((review) => (
                        <li key={review.id} className={styles.reviewCard}>
                            <span className={`${styles.avatar} ${styles[toneFor(review.name)]}`} aria-hidden="true">
                                {initialsOf(review.name)}
                            </span>

                            <div className={styles.reviewBody}>
                                <h3 className={styles.reviewName}>{review.name}</h3>
                                <p className={styles.reviewPlace}>{review.place}</p>

                                <div className={styles.ratingRow}>
                                    <Stars rating={review.rating} />
                                    <span className={styles.ratingValue}>{review.rating.toFixed(1)}</span>
                                </div>

                                <p className={styles.reviewText}>{review.text}</p>

                                {reportedIds.includes(review.id) && (
                                    <p className={styles.reportedNote}>
                                        <RiCheckLine aria-hidden="true" />
                                        Reported. Our team will take a look.
                                    </p>
                                )}
                            </div>

                            <div className={styles.reviewSide} data-menu={review.id}>
                                <span className={styles.reviewDate}>{reviewDate(review.date)}</span>

                                <button
                                    type="button"
                                    className={styles.kebab}
                                    onClick={() => setOpenMenu((open) => (open === review.id ? null : review.id))}
                                    aria-label={`More options for ${review.name}'s review`}
                                    aria-expanded={openMenu === review.id}
                                    aria-haspopup="menu"
                                >
                                    <RiMore2Fill />
                                </button>

                                {openMenu === review.id && (
                                    <div className={styles.menu} role="menu">
                                        <button
                                            type="button"
                                            className={styles.menuItem}
                                            role="menuitem"
                                            onClick={() => reportReview(review.id)}
                                            disabled={reportedIds.includes(review.id)}
                                        >
                                            <RiFlag2Line aria-hidden="true" />
                                            {reportedIds.includes(review.id) ? "Already reported" : "Report Review"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {visible < shown.length && (
                <div className={styles.loadMoreWrap}>
                    <button
                        type="button"
                        className={styles.loadMore}
                        onClick={() => setVisible((count) => count + PAGE_SIZE)}
                    >
                        Load more reviews
                    </button>
                    <span className={styles.loadCount}>
                        Showing {Math.min(visible, shown.length)} of {shown.length}
                    </span>
                </div>
            )}
        </div>
    );
}
