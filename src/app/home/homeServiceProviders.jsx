"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import styles from "./homeServiceProviders.module.css";
import { RiPhoneFill, RiMapPin2Line, RiPriceTag3Line } from "react-icons/ri";
import { serviceProviderApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// "1300" / "₹1300" / 1300 -> "₹1,300"; anything non-numeric is shown as-is.
const formatRate = (value) => {
    if (value === null || value === undefined || String(value).trim() === "") return "";
    const raw = String(value).trim();
    const digits = raw.replace(/[₹,\s]/g, "");
    if (/^\d+(\.\d+)?$/.test(digits)) {
        return `₹${Number(digits).toLocaleString("en-IN")}`;
    }
    // Price range stored as "min-max" (min may be 0 for "up to")
    const range = digits.match(/^(\d+(?:\.\d+)?)(?:-|–|—|to)(\d+(?:\.\d+)?)$/i);
    if (range) {
        const [lo, hi] = [Number(range[1]), Number(range[2])];
        const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;
        if (!lo) return `Up to ${fmt(hi)}`;
        return `${fmt(lo)} – ${fmt(hi)}`;
    }
    return raw;
};

export default function HomeServiceProviders() {
    const carouselRef = useRef(null);
    const { isAuthenticated, user } = useAuth();
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [services, setServices] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchServices = async () => {
            try {
                const res = await serviceProviderApi.getAll({ limit: 12 });
                if (isMounted && res?.data && Array.isArray(res.data)) {
                    const currentUserId = (isAuthenticated && user) ? (user.loginId || user.id) : null;
                    const currentUserName = (isAuthenticated && user) ? (user.username || user.userName || user.name || "").trim().toLowerCase() : "";

                    const filtered = res.data.filter((s) => {
                        if (currentUserId && s.user_id && Number(s.user_id) === Number(currentUserId)) {
                            return false;
                        }
                        if (currentUserName && (s.name || s.full_name || "").trim().toLowerCase() === currentUserName) {
                            return false;
                        }
                        return true;
                    });

                    const mapped = filtered.map((s) => ({
                        id: s.id,
                        user_id: s.user_id,
                        name: s.name || s.full_name || "Service Provider",
                        role: s.role || s.service_name || "Professional",
                        phone: s.phone || "",
                        rate: formatRate(s.rate || s.starting_price),
                        avatar: s.avatar || s.photo || "/logo_placeholder.png",
                        // Same field + fallback as the /services page
                        place: String(s.place || s.service_place || "").trim() || "Kerala",
                    }));
                    setServices(mapped);
                }
            } catch (err) {
                console.warn("Could not fetch home service providers from API:", err?.message || err);
            } finally {
                if (isMounted) setLoaded(true);
            }
        };
        fetchServices();

        const handleAuthChange = () => fetchServices();
        window.addEventListener("kp_auth_changed", handleAuthChange);

        return () => { 
            isMounted = false; 
            window.removeEventListener("kp_auth_changed", handleAuthChange);
        };
    }, [isAuthenticated, user]);

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
    }, [services]);

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

    // If loaded and no services exist in the database, don't show the section
    if (loaded && services.length === 0) {
        return null;
    }

    if (!loaded && services.length === 0) {
        return null;
    }

    return (
        <section className={styles.connectSection}>
            <div className={styles.container}>
                {/* Header Row */}
                <div className={styles.headerRow}>
                    <h2 className={styles.sectionTitle}>Connect with Service Providers</h2>
                    <Link href="/services" className={styles.viewAllBtn}>
                        View All Services
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>
                </div>

                {/* Content */}
                <div className={styles.carouselWrapper}>
                    {services.length > 1 && (
                        <button
                            onClick={scrollPrev}
                            className={`${styles.navBtn} ${styles.prevBtn} ${!canScrollLeft ? styles.disabled : ""}`}
                            disabled={!canScrollLeft}
                            aria-label="Previous service provider"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                    )}

                    <div ref={carouselRef} className={styles.gridRow}>
                        {services.map((service) => (
                            <article key={service.id} className={styles.serviceCard}>
                                <div className={styles.cardHead}>
                                    <img
                                        loading="lazy"
                                        decoding="async"
                                        src={service.avatar}
                                        alt={service.name}
                                        className={styles.serviceAvatar}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = "/logo_placeholder.png";
                                        }}
                                    />
                                    <div className={styles.cardHeadText}>
                                        <h3 className={styles.serviceName} title={service.name}>{service.name}</h3>
                                        <span className={styles.serviceRole} title={service.role}>{service.role}</span>
                                    </div>
                                </div>

                                <ul className={styles.metaList}>
                                    <li className={styles.metaItem}>
                                        <span className={styles.metaIcon} aria-hidden="true"><RiMapPin2Line /></span>
                                        <span className={styles.metaText}>
                                            <span className={styles.metaLabel}>Service area</span>
                                            <span className={styles.metaValue} title={service.place}>{service.place}</span>
                                        </span>
                                    </li>
                                    <li className={styles.metaItem}>
                                        <span className={styles.metaIcon} aria-hidden="true"><RiPriceTag3Line /></span>
                                        <span className={styles.metaText}>
                                            <span className={styles.metaLabel}>Starting rate</span>
                                            {service.rate ? (
                                                <span className={`${styles.metaValue} ${styles.metaPrice}`}>{service.rate}</span>
                                            ) : (
                                                <span className={`${styles.metaValue} ${styles.metaMuted}`}>Contact for rate</span>
                                            )}
                                        </span>
                                    </li>
                                </ul>

                                {service.phone ? (
                                    <a
                                        href={`tel:${service.phone.replace(/\s+/g, "")}`}
                                        className={styles.callBtn}
                                        aria-label={`Call ${service.name}`}
                                        suppressHydrationWarning
                                    >
                                        <RiPhoneFill />
                                        Call Now
                                    </a>
                                ) : (
                                    <span className={`${styles.callBtn} ${styles.callBtnDisabled}`} aria-disabled="true">
                                        <RiPhoneFill />
                                        Phone not available
                                    </span>
                                )}
                            </article>
                        ))}
                    </div>

                    {services.length > 1 && (
                        <button
                            onClick={scrollNext}
                            className={`${styles.navBtn} ${styles.nextBtn} ${!canScrollRight ? styles.disabled : ""}`}
                            disabled={!canScrollRight}
                            aria-label="Next service provider"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

