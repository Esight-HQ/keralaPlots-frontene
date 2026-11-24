"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import styles from "./homeAgents.module.css";
import { agentApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { RiVerifiedBadgeFill } from "react-icons/ri";
const KERALAPLOTS_LOGO = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/5f71e73c-7d7e-40d2-135f-543d8f87e900/public";

export default function HomeAgents() {
    const carouselRef = useRef(null);
    const { isAuthenticated, user } = useAuth();
    const currentUserId = user?.loginId || user?.id || null;
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        let isMounted = true;
        const fetchAgents = async () => {
            setIsLoading(true);
            setLoadError("");
            try {
                const res = await agentApi.list({ limit: 12 });
                if (isMounted && res?.data && Array.isArray(res.data)) {
                    let rawList = res.data;
                    const myLoginId = (isAuthenticated && currentUserId)
                        ? Number(currentUserId)
                        : null;

                    // When logged in as an agent, exclude own profile from the list (same as agent page)
                    if (myLoginId) {
                        rawList = rawList.filter((a) => Number(a.login_id) !== myLoginId);
                    }

                    const mapped = rawList.map((a) => {
                        let exp = a.experience || (a.experience_years ? `${a.experience_years}+ Years` : "5+ Years");
                        let cleanedExp = String(exp).replace(/\s*experience/gi, '').trim();
                        if (!cleanedExp.toLowerCase().includes("year")) {
                            cleanedExp = `${cleanedExp} Years`;
                        }
                        return {
                            id: a.id,
                            login_id: a.login_id,
                            name: a.name || a.agent_name || "Real Estate Agent",
                            title: a.designation || a.specialization || "Property Advisor",
                            phone: a.phone || a.phn_no || "",
                            location: a.place || a.location || a.city || "Kerala, India",
                            experience: cleanedExp || "5+ Years",
                            activeListings: a.active_listings || a.properties_count || a.properties_sold || "10+",
                            rating: a.rating ? Number(a.rating).toFixed(1) : "5.0",
                            reviews: a.reviews_count || a.reviews || "1",
                            avatar: a.avatar || a.photo || KERALAPLOTS_LOGO,
                        };
                    });
                    setAgents(mapped);
                }
            } catch (err) {
                console.warn("Could not fetch home agents from API:", err.message);
                if (isMounted) {
                    setAgents([]);
                    setLoadError("Unable to load trusted agents right now.");
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchAgents();

        const handleAuthChange = () => fetchAgents();
        window.addEventListener("kp_auth_changed", handleAuthChange);

        return () => {
            isMounted = false;
            window.removeEventListener("kp_auth_changed", handleAuthChange);
        };
    }, [isAuthenticated, currentUserId]);

    const checkScroll = () => {
        if (carouselRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
        }
    };

    useEffect(() => {
        const el = carouselRef.current;
        if (el) {
            el.addEventListener("scroll", checkScroll, { passive: true });
            checkScroll();
            window.addEventListener("resize", checkScroll);
        }
        return () => {
            if (el) {
                el.removeEventListener("scroll", checkScroll);
            }
            window.removeEventListener("resize", checkScroll);
        };
    }, [agents]);

    const scrollNext = () => {
        if (carouselRef.current) {
            const { clientWidth } = carouselRef.current;
            carouselRef.current.scrollBy({ left: clientWidth, behavior: "smooth" });
        }
    };

    const scrollPrev = () => {
        if (carouselRef.current) {
            const { clientWidth } = carouselRef.current;
            carouselRef.current.scrollBy({ left: -clientWidth, behavior: "smooth" });
        }
    };

    return (
        <section className={styles.agentsSection}>
            <div className={styles.container}>
                {/* Header Row */}
                <div className={styles.headerRow}>
                    <h2 className={styles.sectionTitle}>Our Trusted Agents</h2>
                    <Link href="/agent" className={styles.viewAllBtn}>
                        View All Agents
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>
                </div>

                {/* Carousel wrapper with side navigation controls */}
                <div className={styles.carouselWrapper}>
                    <button
                        onClick={scrollPrev}
                        className={`${styles.navBtn} ${styles.prevBtn} ${!canScrollLeft ? styles.disabled : ""}`}
                        disabled={!canScrollLeft}
                        aria-label="Previous Agent"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    {/* 4 Agent Cards Grid (Carousel) */}
                    <div ref={carouselRef} className={styles.gridRow}>
                        {isLoading ? (
                            [1, 2, 3, 4].map((item) => (
                                <div key={item} className={`${styles.agentCard} ${styles.skeletonCard}`}>
                                    <div className={styles.cardBanner} />
                                    <div className={styles.cardBody}>
                                        <span className={styles.skeletonAvatar} />
                                        <span className={styles.skeletonLineWide} />
                                        <span className={styles.skeletonLine} />
                                        <div className={styles.skeletonStats} />
                                    </div>
                                </div>
                            ))
                        ) : loadError ? (
                            <div className={styles.emptyState}>{loadError}</div>
                        ) : agents.length === 0 ? (
                            <div className={styles.emptyState}>No trusted agents available yet.</div>
                        ) : agents.map((agent) => (
                            <article key={agent.id} className={styles.agentCard}>
                                {/* Card Top Banner with Gradient, Pattern & Rating */}
                                <div className={styles.cardBanner}>
                                    <span className={styles.bannerPattern} aria-hidden="true" />
                                    <span className={styles.ratingPill} title={`${agent.rating} rating from ${agent.reviews} reviews`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" aria-hidden="true">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                        <strong>{agent.rating}</strong>
                                        <span className={styles.reviewCount}>({agent.reviews})</span>
                                    </span>
                                </div>

                                <div className={styles.cardBody}>
                                    {/* Avatar Overlapping Banner with Verified Tick */}
                                    <div className={styles.avatarWrapper}>
                                        <div className={styles.avatarRing}>
                                            <img
                                                loading="lazy"
                                                decoding="async"
                                                src={agent.avatar}
                                                alt={agent.name}
                                                className={styles.avatar}
                                                onError={(event) => {
                                                    event.currentTarget.src = KERALAPLOTS_LOGO;
                                                }}
                                            />
                                        </div>
                                        <span className={styles.verifiedTick} title="Verified Agent" aria-label="Verified Agent">
                                            <RiVerifiedBadgeFill />
                                        </span>
                                    </div>

                                    {/* Agent Main Info */}
                                    <div className={styles.agentDetails}>
                                        <h3 className={styles.agentName} title={agent.name}>
                                            <Link href={`/agent/${agent.id}`} className={styles.cardLink}>
                                                {agent.name}
                                            </Link>
                                        </h3>
                                        <span className={styles.agentTitle}>{agent.title}</span>
                                        <span className={styles.locationMeta} title={agent.location}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            <span>{agent.location}</span>
                                        </span>
                                    </div>

                                    {/* Stats Grid: Experience & Active Listings */}
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCardItem}>
                                            <span className={styles.statIcon} aria-hidden="true">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="8" r="6" />
                                                    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                                                </svg>
                                            </span>
                                            <div className={styles.statText}>
                                                <span className={styles.statVal}>{agent.experience}</span>
                                                <span className={styles.statLbl}>Experience</span>
                                            </div>
                                        </div>
                                        <span className={styles.statDivider} aria-hidden="true" />
                                        <div className={styles.statCardItem}>
                                            <span className={styles.statIcon} aria-hidden="true">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                    <polyline points="9 22 9 12 15 12 15 22" />
                                                </svg>
                                            </span>
                                            <div className={styles.statText}>
                                                <span className={styles.statVal}>{agent.activeListings}</span>
                                                <span className={styles.statLbl}>Properties</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons: View Profile & WhatsApp */}
                                    <div className={styles.actionRow}>
                                        <Link href={`/agent/${agent.id}`} className={styles.callBtn} aria-label={`View profile of ${agent.name}`}>
                                            View Profile
                                            <svg className={styles.btnArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M5 12h14M13 6l6 6-6 6" />
                                            </svg>
                                        </Link>
                                        {agent.phone && (
                                            <a
                                                href={`https://wa.me/${String(agent.phone).replace(/\D/g, "")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.whatsappBtn}
                                                title="Chat on WhatsApp"
                                                aria-label={`Chat with ${agent.name} on WhatsApp`}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <button
                        onClick={scrollNext}
                        className={`${styles.navBtn} ${styles.nextBtn} ${!canScrollRight ? styles.disabled : ""}`}
                        disabled={!canScrollRight}
                        aria-label="Next Agent"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>
            </div>
        </section>
    );
}
