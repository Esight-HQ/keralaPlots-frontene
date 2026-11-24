"use client";

import { use, useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../../componants/nav/nav";
import Footer from "../../componants/footer/footer";
import styles from "./agentProfile.module.css";
import { useAuth } from "../../context/AuthContext";
import { agentApi, propertyApi, formatPropertyImgUrl, handlePropertyImageError, formatAddedDate } from "../../lib/api";
import { getPropertyUrl } from "../../lib/seoHelper";
import PropertyIdBadge, { PropertyBadgeRow } from "../../componants/propertyIdBadge/PropertyIdBadge";
import { getLoginRedirectUrl } from "../../lib/authRedirect";
import {
    RiStarFill,
    RiStarLine,
    RiMapPinLine,
    RiArrowRightLine,
    RiArrowRightSLine,
    RiPhoneFill,
    RiMailFill,
    RiWhatsappFill,
    RiLinkedinFill,
    RiGlobalLine,
    RiFacebookFill,
    RiInstagramLine,
    RiTimeLine,
    RiHome4Line,
    RiUserSmileLine,
    RiAwardLine,
    RiChat3Line,
    RiCheckboxCircleLine,
    RiTeamLine,
    RiShareForwardLine,
    RiWhatsappLine,
    RiFileCopyLine,
    RiLoader4Line,
    RiDeleteBinLine,
    RiShieldCheckLine,
    RiPlayCircleFill,
    RiEyeLine,
    RiVerifiedBadgeFill,
} from "react-icons/ri";
import { LuMail } from "react-icons/lu";
import { BsTelephone } from "react-icons/bs";

function NoPropertiesArt() {
    return (
        <svg
            className={styles.emptyArt}
            viewBox="0 0 520 300"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path d="M120 254c14-56 66-96 128-96s114 40 128 96Z" fill="#f1f3f9" />
            <g fill="#e8ebf5">
                <circle cx="150" cy="72" r="10" />
                <circle cx="164" cy="65" r="13" />
                <circle cx="178" cy="72" r="9" />
                <rect x="150" y="71" width="28" height="10" rx="5" />
                <circle cx="352" cy="52" r="11" />
                <circle cx="368" cy="44" r="15" />
                <circle cx="384" cy="52" r="10" />
                <rect x="352" y="51" width="32" height="11" rx="5.5" />
            </g>
            <path d="M104 200h74v54h-74Z" fill="#e9ecf6" stroke="#c3cadf" strokeWidth="3" strokeLinejoin="round" />
            <path d="M96 202 141 160l45 42Z" fill="#dfe4f1" stroke="#c3cadf" strokeWidth="3" strokeLinejoin="round" />
            <path d="M130 254v-28a11 11 0 0 1 22 0v28Z" fill="#ffffff" stroke="#c3cadf" strokeWidth="3" strokeLinejoin="round" />
            <path d="M292 236h14v20h-14Z" fill="#dfe4f1" stroke="#c3cadf" strokeWidth="3" strokeLinejoin="round" />
            <rect x="222" y="148" width="154" height="92" rx="14" fill="#ffffff" stroke="#c3cadf" strokeWidth="3" />
            <circle cx="299" cy="194" r="27" fill="none" stroke="#c3cadf" strokeWidth="5" />
            <path d="M280 175 318 213" stroke="#c3cadf" strokeWidth="5" strokeLinecap="round" />
            <path d="M404 254v-52" stroke="#c3cadf" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M404 214l-16-14M404 226l16-14" stroke="#c3cadf" strokeWidth="3" strokeLinecap="round" />
            <path d="M404 156c18 0 30 14 30 30s-12 28-30 28-30-12-30-28 12-30 30-30Z" fill="#e9ecf6" stroke="#c3cadf" strokeWidth="3" />
            <g fill="#e2e6f2">
                <circle cx="196" cy="244" r="13" />
                <circle cx="210" cy="238" r="16" />
                <rect x="196" y="244" width="28" height="11" rx="5.5" />
                <circle cx="352" cy="246" r="11" />
                <circle cx="364" cy="240" r="14" />
                <rect x="352" y="246" width="24" height="9" rx="4.5" />
                <circle cx="440" cy="246" r="10" />
                <circle cx="452" cy="241" r="13" />
                <rect x="440" y="246" width="22" height="9" rx="4.5" />
            </g>
            <path d="M78 255h364" stroke="#c9cfe4" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
    );
}

function NoReviewsArt() {
    return (
        <svg
            className={styles.noReviewsArt}
            viewBox="0 0 520 300"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path d="M120 254c14-56 66-96 128-96s114 40 128 96Z" fill="#f1f3f9" />
            <g fill="#e8ebf5">
                <circle cx="150" cy="72" r="10" />
                <circle cx="164" cy="65" r="13" />
                <circle cx="178" cy="72" r="9" />
                <rect x="150" y="71" width="28" height="10" rx="5" />
                <circle cx="352" cy="52" r="11" />
                <circle cx="368" cy="44" r="15" />
                <circle cx="384" cy="52" r="10" />
                <rect x="352" y="51" width="32" height="11" rx="5.5" />
            </g>
            <path d="M104 200h74v54h-74Z" fill="#e9ecf6" stroke="#c3cadf" strokeWidth="3" strokeLinejoin="round" />
            <path d="M96 202 141 160l45 42Z" fill="#dfe4f1" stroke="#c3cadf" strokeWidth="3" strokeLinejoin="round" />
            <path d="M130 254v-28a11 11 0 0 1 22 0v28Z" fill="#ffffff" stroke="#c3cadf" strokeWidth="3" strokeLinejoin="round" />
            <path
                d="M 220 95 h 90 a 16 16 0 0 1 16 16 v 64 a 16 16 0 0 1 -16 16 h -35 l -10 18 l -10 -18 h -35 a 16 16 0 0 1 -16 -16 v -64 a 16 16 0 0 1 16 -16 z"
                fill="#ffffff"
                stroke="#c3cadf"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            <path
                d="M 265 118 L 272 134 L 289 135 L 276 147 L 282 166 L 265 156 L 248 166 L 254 147 L 241 135 L 258 134 Z"
                fill="none"
                stroke="#c3cadf"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M404 254v-52" stroke="#c3cadf" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M404 214l-16-14M404 226l16-14" stroke="#c3cadf" strokeWidth="3" strokeLinecap="round" />
            <path d="M404 156c18 0 30 14 30 30s-12 28-30 28-30-12-30-28 12-30 30-30Z" fill="#e9ecf6" stroke="#c3cadf" strokeWidth="3" />
            <g fill="#e2e6f2">
                <circle cx="196" cy="244" r="13" />
                <circle cx="210" cy="238" r="16" />
                <rect x="196" y="244" width="28" height="11" rx="5.5" />
                <circle cx="352" cy="246" r="11" />
                <circle cx="364" cy="240" r="14" />
                <rect x="352" y="246" width="24" height="9" rx="4.5" />
                <circle cx="440" cy="246" r="10" />
                <circle cx="452" cy="241" r="13" />
                <rect x="440" y="246" width="22" height="9" rx="4.5" />
            </g>
            <path d="M78 255h364" stroke="#c9cfe4" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
    );
}

export default function AgentProfilePage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();

    // Agent data state
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);

    // Properties state
    const [properties, setProperties] = useState([]);
    const [propertiesLoading, setPropertiesLoading] = useState(true);

    // Reviews state
    const [reviewsList, setReviewsList] = useState([]);
    const [reviewsStats, setReviewsStats] = useState({
        average_rating: 5.0,
        total_reviews: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentages: { 5: "0%", 4: "0%", 3: "0%", 2: "0%", 1: "0%" }
    });
    const [userExistingReview, setUserExistingReview] = useState(null);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    // Form inputs for review
    const [hoveredRating, setHoveredRating] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [userComment, setUserComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // UI state
    const [activeTab, setActiveTab] = useState("sale");
    const [toastMessage, setToastMessage] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const shareButtonRef = useRef(null);
    const tabsRef = useRef(null);
    const [activeTabRect, setActiveTabRect] = useState({ left: 0, width: 0 });

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3500);
    };

    // Load agent details
    const fetchAgentDetails = useCallback(async () => {
        setLoading(true);
        try {
            const res = await agentApi.get(id);
            if (res?.data) {
                setAgent(res.data);
            }
        } catch (err) {
            console.error("Failed to load agent profile:", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Load agent properties
    const fetchAgentProperties = useCallback(async () => {
        setPropertiesLoading(true);
        try {
            const res = await agentApi.getProperties(id);
            if (res?.data) {
                setProperties(res.data);
                const savedIds = (res.data || [])
                    .filter((p) => p.is_saved || p.isSaved)
                    .map((p) => p.id || p.propertyId);
                if (savedIds.length > 0) {
                    setFavorites((prev) => [...new Set([...prev, ...savedIds])]);
                }
            }
        } catch (err) {
            console.error("Failed to load agent properties:", err);
        } finally {
            setPropertiesLoading(false);
        }
    }, [id]);

    // Load agent reviews
    const fetchAgentReviews = useCallback(async () => {
        setReviewsLoading(true);
        try {
            const res = await agentApi.getReviews(id);
            if (res?.data) {
                setReviewsList(res.data);
                if (res.stats) {
                    setReviewsStats({
                        average_rating: res.stats.average_rating || 5.0,
                        total_reviews: res.stats.total_reviews || 0,
                        breakdown: res.stats.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                        percentages: res.stats.percentages || { 5: "0%", 4: "0%", 3: "0%", 2: "0%", 1: "0%" }
                    });
                }
                if (res.user_review) {
                    setUserExistingReview(res.user_review);
                    setUserRating(res.user_review.rating);
                    setUserComment(res.user_review.comment);
                } else {
                    setUserExistingReview(null);
                }
            }
        } catch (err) {
            console.error("Failed to load reviews:", err);
        } finally {
            setReviewsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAgentDetails();
        fetchAgentProperties();
        fetchAgentReviews();
    }, [fetchAgentDetails, fetchAgentProperties, fetchAgentReviews]);

    // Sync logged-in user's favorites from API
    useEffect(() => {
        if (!isAuthenticated) {
            setFavorites([]);
            return;
        }
        let alive = true;
        propertyApi.favorites({ limit: 100 })
            .then((favRes) => {
                if (alive && favRes?.data) {
                    const allFavIds = (favRes.data || []).map((p) => p.id || p.propertyId);
                    setFavorites((prev) => [...new Set([...prev, ...allFavIds])]);
                }
            })
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, [isAuthenticated]);

    // Outside click for share menu
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (shareButtonRef.current && !shareButtonRef.current.contains(e.target)) {
                setShareMenuOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    // Tab indicator update
    useEffect(() => {
        const updateIndicator = () => {
            const activeBtn = tabsRef.current?.querySelector(`.${styles.tabBtnActive}`);
            if (activeBtn) {
                setActiveTabRect({
                    left: activeBtn.offsetLeft,
                    width: activeBtn.offsetWidth
                });

                tabsRef.current.scrollTo({
                    left: activeBtn.offsetLeft - tabsRef.current.offsetWidth / 2 + activeBtn.offsetWidth / 2,
                    behavior: "smooth"
                });
            }
        };

        const timeoutId = setTimeout(updateIndicator, 50);
        window.addEventListener("resize", updateIndicator);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener("resize", updateIndicator);
        };
    }, [activeTab]);

    // Review submission (create or update like Google Reviews)
    const handleReviewSubmit = async () => {
        if (!isAuthenticated) {
            triggerToast("Please log in to submit a review.");
            router.push(`/login?redirect=/agent/${id}`);
            return;
        }

        if (isOwnProfile) {
            triggerToast("You cannot write a review for your own agent profile.");
            return;
        }

        if (userRating === 0) {
            triggerToast("Please select a star rating.");
            return;
        }
        if (!userComment.trim()) {
            triggerToast("Please write your review comment.");
            return;
        }

        setSubmittingReview(true);
        try {
            const res = await agentApi.submitReview(id, {
                rating: userRating,
                comment: userComment.trim()
            });

            if (res.success) {
                triggerToast(res.message || "Thank you! Your review has been saved.");
                await fetchAgentReviews();
                await fetchAgentDetails();
            } else {
                triggerToast(res.message || "Failed to submit review.");
            }
        } catch (err) {
            triggerToast(err?.response?.data?.message || "Error submitting review. Please try again.");
        } finally {
            setSubmittingReview(false);
        }
    };

    // Modal state for delete review confirmation
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingReview, setDeletingReview] = useState(false);

    // Review delete confirmation
    const confirmDeleteReview = async () => {
        if (!userExistingReview) return;

        setDeletingReview(true);
        try {
            const res = await agentApi.deleteReview(id, userExistingReview.id);
            if (res.success) {
                triggerToast("Your review has been deleted.");
                setUserRating(0);
                setUserComment("");
                setUserExistingReview(null);
                setDeleteModalOpen(false);
                await fetchAgentReviews();
                await fetchAgentDetails();
            }
        } catch (err) {
            triggerToast("Failed to delete review. Please try again.");
        } finally {
            setDeletingReview(false);
        }
    };

    const toggleFavorite = async (e, propId) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            router.push(getLoginRedirectUrl());
            return;
        }

        const wasSaved = favorites.includes(propId);
        setFavorites((prev) =>
            wasSaved ? prev.filter((fid) => fid !== propId) : [...prev, propId]
        );

        try {
            const response = await propertyApi.toggleFavorite(propId);
            setFavorites((prev) => {
                const next = prev.filter((fid) => fid !== propId);
                const isNowSaved = typeof response?.saved === "boolean" ? response.saved : !wasSaved;
                return isNowSaved ? [...next, propId] : next;
            });
            triggerToast(wasSaved ? "Removed from saved properties" : "Saved to your favorites");
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
            setFavorites((prev) =>
                wasSaved ? [...new Set([...prev, propId])] : prev.filter((fid) => fid !== propId)
            );
            triggerToast("Failed to update saved properties");
        }
    };

    const handleShareWhatsApp = () => {
        const shareText = `Check out ${agent?.name}'s profile on KeralaPlots:\n${window.location.href}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
        setShareMenuOpen(false);
    };

    const handleCopyShareLink = () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => triggerToast("Profile link copied to clipboard!"))
            .catch(() => triggerToast("Failed to copy link."));
        setShareMenuOpen(false);
    };

    if (loading) {
        return (
            <>
                <Nav />
                <div className={styles.notFoundWrapper}>
                    <RiLoader4Line style={{ fontSize: "36px", color: "#114d81", animation: "spin 1s linear infinite" }} />
                    <p style={{ marginTop: "16px", fontWeight: 600, color: "#475569" }}>Loading agent profile...</p>
                </div>
                <Footer />
            </>
        );
    }

    if (!agent) {
        return (
            <>
                <Nav />
                <div className={styles.notFoundWrapper}>
                    <h1>Agent Not Found</h1>
                    <p>We couldn&apos;t find the agent profile you&apos;re looking for.</p>
                    <Link href="/agent" className={styles.notFoundBtn}>
                        <span>Back to Agents</span>
                        <RiArrowRightLine />
                    </Link>
                </div>
                <Footer />
            </>
        );
    }

    const firstName = agent?.name ? String(agent.name).split(" ")[0] : "Agent";
    const designation = String(agent?.designation || agent?.specialization || "Property Specialist");
    const officeLocation = String(agent?.office_location || agent?.office || agent?.place || agent?.location || "Kerala");
    const workingHours = String(agent?.working_hours || agent?.hours || "Mon - Sat: 9:00 AM - 7:00 PM");
    const phone = agent?.phone ? String(agent.phone) : (agent?.phn_no ? String(agent.phn_no) : (agent?.mobile ? String(agent.mobile) : ""));
    const email = agent?.email ? String(agent.email) : "";

    // Stats calculations
    const propertiesSoldStr = String(agent?.properties_sold || agent?.soldCount || "50+");
    const happyClientsStr = String(agent?.happy_clients || agent?.clientsCount || "40+");
    const experienceStr = String(agent?.experience_years ? `${agent.experience_years} Years` : (agent?.experience || "5+ Years"));

    // Overall dynamic rating & count
    const totalReviews = Number(reviewsStats?.total_reviews || 0);
    const displayRating = Number(reviewsStats?.average_rating || agent?.rating || 5.0);

    // Social profiles
    const socials = agent?.socials || {};
    const website = socials.website ? String(socials.website) : (agent?.website ? String(agent.website) : "");
    const facebook = socials.facebook ? String(socials.facebook) : (agent?.facebook ? String(agent.facebook) : "");
    const instagram = socials.instagram ? String(socials.instagram) : (agent?.instagram ? String(agent.instagram) : "");
    const linkedin = socials.linkedin ? String(socials.linkedin) : (agent?.linkedin ? String(agent.linkedin) : "");

    // Check if the currently logged-in user is the owner of this agent profile
    const isOwnProfile = Boolean(
        isAuthenticated && user && (
            (agent?.login_id && (Number(user.loginId) === Number(agent.login_id) || Number(user.id) === Number(agent.login_id))) ||
            (user.email && agent?.email && user.email.toLowerCase() === String(agent.email).toLowerCase())
        )
    );

    // Properties for Sale / Rent / Lease
    const forSaleProperties = properties.filter((p) => {
        const act = String(p.action || p.listing_type || p.propertyAction || "").toLowerCase();
        return act === "sale" || act === "sell" || act === "buy" || act === "for sale";
    });

    const forRentProperties = properties.filter((p) => {
        const act = String(p.action || p.listing_type || p.propertyAction || "").toLowerCase();
        return act === "rent" || act === "lease" || act === "for rent" || act === "for lease";
    });

    const visibleProperties = activeTab === "sale" ? forSaleProperties : activeTab === "rent" ? forRentProperties : [];

    return (
        <>
            <Nav />

            <div className={styles.profileContainer}>

                {/* ── Hero Section ── */}
                <div className={styles.heroSection}>
                    <div className={styles.container}>
                        <div className={styles.breadcrumb}>
                            <Link href="/">Home</Link>
                            <RiArrowRightSLine />
                            <Link href="/agent">Agents</Link>
                            <RiArrowRightSLine />
                            <span>{agent?.name}</span>
                        </div>
                    </div>
                    <div className={`${styles.container} ${styles.heroGrid}`}>
                        {/* ── Left: Photo card + social links ── */}
                        <aside className={styles.heroPhotoCol} aria-label={`${agent?.name || "Agent"} photo and links`}>
                            <div className={styles.heroPhotoCard}>
                                <img
                                    src={agent?.photo || agent?.avatar || "/logo_placeholder.png"}
                                    alt={agent?.name || "Agent"}
                                    className={styles.heroPhotoImg}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/logo_placeholder.png";
                                    }}
                                />
                                <span className={styles.heroPhotoBadge}>
                                    <RiVerifiedBadgeFill aria-hidden="true" />
                                    Verified Agent
                                </span>
                            </div>

                            {(phone || email || linkedin || website || facebook || instagram) && (
                                <div className={styles.heroSocialBlock}>
                                    {/* <span className={styles.heroSocialLabel}>Connect</span> */}
                                    <div className={styles.heroSocialRow}>
                                        {phone && (
                                            <a href={`tel:${String(phone).replace(/\s+/g, "")}`} className={`${styles.heroSocialBtn} ${styles.socialPhone}`} aria-label={`Call ${firstName}`} title="Call">
                                                <RiPhoneFill />
                                            </a>
                                        )}
                                        {email && (
                                            <a href={`mailto:${email}`} className={`${styles.heroSocialBtn} ${styles.socialMail}`} aria-label={`Email ${firstName}`} title="Email">
                                                <RiMailFill />
                                            </a>
                                        )}
                                        {linkedin && (
                                            <a href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`} className={`${styles.heroSocialBtn} ${styles.socialLinkedin}`} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile" title="LinkedIn">
                                                <RiLinkedinFill />
                                            </a>
                                        )}
                                        {facebook && (
                                            <a href={facebook.startsWith("http") ? facebook : `https://${facebook}`} className={`${styles.heroSocialBtn} ${styles.socialFacebook}`} target="_blank" rel="noopener noreferrer" aria-label="Facebook profile" title="Facebook">
                                                <RiFacebookFill />
                                            </a>
                                        )}
                                        {instagram && (
                                            <a href={instagram.startsWith("http") ? instagram : `https://${instagram}`} className={`${styles.heroSocialBtn} ${styles.socialInstagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram profile" title="Instagram">
                                                <RiInstagramLine />
                                            </a>
                                        )}
                                        {website && (
                                            <a href={website.startsWith("http") ? website : `https://${website}`} className={`${styles.heroSocialBtn} ${styles.socialWeb}`} target="_blank" rel="noopener noreferrer" aria-label="Personal website" title="Website">
                                                <RiGlobalLine />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </aside>

                        {/* ── Right: Identity, highlights, actions ── */}
                        <div className={styles.heroInfoCol}>
                            <div className={styles.heroChipsRow}>
                                <span className={styles.heroRatingBadge} title={`${displayRating.toFixed(1)} average from ${totalReviews} ${totalReviews === 1 ? "review" : "reviews"}`}>
                                    <RiStarFill aria-hidden="true" />
                                    <strong>{displayRating.toFixed(1)}</strong>
                                    <span className={styles.heroRatingCount}>
                                        {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
                                    </span>
                                </span>
                                <span className={styles.heroLocationChip}>
                                    <RiMapPinLine aria-hidden="true" />
                                    {officeLocation}
                                </span>
                            </div>

                            <h1 className={styles.heroName}>{agent?.name}</h1>
                            <p className={styles.heroSpec}>{designation}</p>

                            <p className={styles.heroDesc}>
                                {agent?.short_bio || agent?.about || agent?.intro || `With over ${experienceStr} in Kerala's real estate market, ${firstName} specializes in ${designation.toLowerCase()}. ${firstName} is dedicated to helping clients find properties that match their lifestyle and investment goals.`}
                            </p>

                            {/* Quick highlights */}
                            <ul className={styles.heroHighlights}>
                                <li className={styles.heroHighlight}>
                                    <span className={styles.heroHighlightIcon} aria-hidden="true"><RiAwardLine /></span>
                                    <span className={styles.heroHighlightText}>
                                        <strong>{experienceStr}</strong>
                                        <span>Experience</span>
                                    </span>
                                </li>
                                <li className={styles.heroHighlight}>
                                    <span className={styles.heroHighlightIcon} aria-hidden="true"><RiHome4Line /></span>
                                    <span className={styles.heroHighlightText}>
                                        <strong>{propertiesSoldStr}</strong>
                                        <span>Properties Sold</span>
                                    </span>
                                </li>
                                <li className={styles.heroHighlight}>
                                    <span className={styles.heroHighlightIcon} aria-hidden="true"><RiUserSmileLine /></span>
                                    <span className={styles.heroHighlightText}>
                                        <strong>{happyClientsStr}</strong>
                                        <span>Happy Clients</span>
                                    </span>
                                </li>
                            </ul>

                            <div className={styles.heroActionsRow}>
                                {phone ? (
                                    <a
                                        href={`tel:${String(phone).replace(/\s+/g, "")}`}
                                        className={styles.contactBtn}
                                    >
                                        <RiPhoneFill aria-hidden="true" />
                                        <span>Call {firstName}</span>
                                    </a>
                                ) : email ? (
                                    <a
                                        href={`mailto:${email}`}
                                        className={styles.contactBtn}
                                    >
                                        <RiMailFill aria-hidden="true" />
                                        <span>Email {firstName}</span>
                                    </a>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.contactBtn}
                                        onClick={() => triggerToast("Contact details not provided.")}
                                    >
                                        <span>Contact {firstName}</span>
                                        <RiArrowRightLine aria-hidden="true" />
                                    </button>
                                )}

                                {phone && (
                                    <a
                                        href={`https://wa.me/${String(phone).replace(/[^0-9]/g, "")}`}
                                        className={styles.whatsappCta}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Chat with ${firstName} on WhatsApp`}
                                    >
                                        <RiWhatsappFill aria-hidden="true" />
                                        <span>WhatsApp</span>
                                    </a>
                                )}

                                <div className={styles.shareWrapper} ref={shareButtonRef}>
                                    <button
                                        type="button"
                                        className={`${styles.shareBtn} ${shareMenuOpen ? styles.shareBtnActive : ""}`}
                                        onClick={() => setShareMenuOpen((prev) => !prev)}
                                        aria-label="Share profile"
                                        aria-haspopup="menu"
                                        aria-expanded={shareMenuOpen}
                                        title="Share profile"
                                    >
                                        <RiShareForwardLine />
                                    </button>

                                    {shareMenuOpen && (
                                        <div className={styles.shareTooltip} role="menu">
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className={styles.shareTooltipLink}
                                                onClick={handleShareWhatsApp}
                                            >
                                                <RiWhatsappLine className={styles.shareTooltipIcon} style={{ color: "#25D366" }} />
                                                <span>WhatsApp</span>
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className={styles.shareTooltipLink}
                                                onClick={handleCopyShareLink}
                                            >
                                                <RiFileCopyLine className={styles.shareTooltipIcon} />
                                                <span>Copy Link</span>
                                            </button>
                                            <div className={styles.shareTooltipArrow}></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.heroBg} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&auto=format&fit=crop&q=80')" }}></div>
                </div>

                <div className={styles.container}>
                    <div className={styles.detailsWrapper}>
                        {/* ── Contact info bar ── */}
                        <div className={styles.infoBar}>
                            <div className={styles.infoItem}>
                                <div className={styles.infoIconBox}><BsTelephone /></div>
                                <div className={styles.infoText}>
                                    <span className={styles.infoLabel}>Phone</span>
                                    <span className={styles.infoValue}>{phone || "Not Provided"}</span>
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <div className={styles.infoIconBox}><LuMail /></div>
                                <div className={styles.infoText}>
                                    <span className={styles.infoLabel}>Email</span>
                                    <span className={styles.infoValue}>{email || "Not Provided"}</span>
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <div className={styles.infoIconBox}><RiMapPinLine /></div>
                                <div className={styles.infoText}>
                                    <span className={styles.infoLabel}>Office</span>
                                    <span className={styles.infoValue}>{officeLocation}</span>
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <div className={styles.infoIconBox}><RiTimeLine /></div>
                                <div className={styles.infoText}>
                                    <span className={styles.infoLabel}>Working Hours</span>
                                    <span className={styles.infoValue}>{workingHours}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── About + Stats ── */}
                        <div className={styles.aboutSection}>
                            <div className={styles.aboutText}>
                                <h2 className={styles.aboutTitle}>About {firstName}</h2>
                                <p className={styles.aboutDesc}>
                                    {agent.short_bio || agent.about || agent.intro || `${agent.name} is a trusted real estate advisor specializing in ${designation.toLowerCase()} across ${officeLocation} and surrounding areas. Known for transparency, market knowledge, and a client-first approach, ${firstName} has helped hundreds of families find their dream properties.`}
                                </p>
                            </div>
                            {/* <div className={styles.statsGrid}>
                                <div className={styles.statItem}>
                                    <div className={styles.statIconBox}><RiHome4Line /></div>
                                    <span className={styles.statNumber}>{propertiesSoldStr}</span>
                                    <span className={styles.statLabel}>Properties Sold</span>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statIconBox}><RiUserSmileLine /></div>
                                    <span className={styles.statNumber}>{happyClientsStr}</span>
                                    <span className={styles.statLabel}>Happy Clients</span>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statIconBox}><RiAwardLine /></div>
                                    <span className={styles.statNumber}>{experienceStr}</span>
                                    <span className={styles.statLabel}>Years Experience</span>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statIconBox}><RiChat3Line /></div>
                                    <span className={styles.statNumber}>{totalReviews}</span>
                                    <span className={styles.statLabel}>Client Reviews</span>
                                </div>
                            </div> */}
                        </div>

                        {/* ── Navigation Tabs ── */}
                        <div className={styles.tabsRow} ref={tabsRef}>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === "sale" ? styles.tabBtnActive : ""}`}
                                onClick={() => setActiveTab("sale")}
                            >
                                Properties for Sale ({forSaleProperties.length})
                            </button>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === "rent" ? styles.tabBtnActive : ""}`}
                                onClick={() => setActiveTab("rent")}
                            >
                                Properties for Rent / Lease ({forRentProperties.length})
                            </button>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === "reels" ? styles.tabBtnActive : ""}`}
                                onClick={() => setActiveTab("reels")}
                            >
                                Posted Reels ({(agent?.reels || []).length})
                            </button>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === "reviews" ? styles.tabBtnActive : ""}`}
                                onClick={() => setActiveTab("reviews")}
                            >
                                Reviews ({totalReviews})
                            </button>
                            <div
                                className={styles.tabIndicator}
                                style={{
                                    left: `${activeTabRect.left}px`,
                                    width: `${activeTabRect.width}px`
                                }}
                            />
                        </div>

                        {/* ── Tab Contents ── */}
                        {activeTab === "reviews" ? (
                            reviewsList.length === 0 ? (
                                /* No reviews yet card */
                                <div className={styles.noReviewsCard}>
                                    <div className={styles.noReviewsLeft}>
                                        <NoReviewsArt />
                                        <h3 className={styles.noReviewsTitle}>No Reviews Yet</h3>
                                        <p className={styles.noReviewsSub}>
                                            {agent.name} hasn&rsquo;t received any reviews yet.
                                        </p>
                                        <p className={styles.noReviewsAction}>
                                            Be the first to share your experience!
                                        </p>
                                    </div>
                                    {isOwnProfile ? (
                                        <div style={{ padding: "40px 24px", textAlign: "center", background: "#f8fafc", borderRadius: "14px", border: "1.5px dashed #cbd5e1" }}>
                                            <RiShieldCheckLine style={{ fontSize: "38px", color: "#114d81", display: "block", margin: "0 auto 10px" }} />
                                            <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#001a72", margin: "0 0 6px" }}>Your Agent Profile</h4>
                                            <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
                                                You cannot submit a review for your own profile. Client reviews submitted by property seekers and buyers will appear here.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className={styles.noReviewsRight}>
                                            <h3 className={styles.writeReviewTitle}>Write a Review</h3>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Your Rating</label>
                                                <div className={styles.starRatingInput}>
                                                    {Array.from({ length: 5 }).map((_, i) => {
                                                        const starValue = i + 1;
                                                        const active = starValue <= (hoveredRating || userRating);
                                                        return (
                                                            <span
                                                                key={i}
                                                                onClick={() => setUserRating(starValue)}
                                                                onMouseEnter={() => setHoveredRating(starValue)}
                                                                onMouseLeave={() => setHoveredRating(0)}
                                                                className={styles.starInputSpan}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                {active ? (
                                                                    <RiStarFill className={styles.formStarActive} />
                                                                ) : (
                                                                    <RiStarLine className={styles.formStarInactive} />
                                                                )}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Your Review</label>
                                                <textarea
                                                    className={styles.reviewTextarea}
                                                    placeholder={`Share your experience with ${agent.name}...`}
                                                    value={userComment}
                                                    onChange={(e) => setUserComment(e.target.value)}
                                                    rows={4}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.submitReviewBtn}
                                                onClick={handleReviewSubmit}
                                                disabled={submittingReview}
                                            >
                                                {submittingReview ? "Submitting..." : (userExistingReview ? "Update Review" : "Submit Review")}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Reviews Dashboard with Breakdown and Form */
                                <div className={styles.reviewsContainer}>
                                    <div className={styles.reviewsDashboard}>
                                        {/* Summary Stats Box */}
                                        <div className={styles.summaryStatsBox}>
                                            <h3 className={styles.summaryTitle}>Client Reviews</h3>
                                            <div className={styles.ratingNumberBox}>
                                                <span className={styles.bigRating}>{displayRating.toFixed(1)}</span>
                                                <div className={styles.ratingStarsRow}>
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <RiStarFill key={i} className={i < Math.round(displayRating) ? styles.starFilled : styles.starEmpty} />
                                                    ))}
                                                </div>
                                                <span className={styles.reviewsTotalCount}>Out of {totalReviews} {totalReviews === 1 ? "review" : "reviews"}</span>
                                            </div>
                                        </div>

                                        {/* Breakdown Box */}
                                        <div className={styles.breakdownBox}>
                                            {[5, 4, 3, 2, 1].map((stars) => (
                                                <div key={stars} className={styles.breakdownRow}>
                                                    <span className={styles.starLabel}>{stars} <RiStarFill className={styles.breakdownStar} /></span>
                                                    <div className={styles.barContainer}>
                                                        <div
                                                            className={styles.barFill}
                                                            style={{ width: `${reviewsStats.percentages[stars] || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className={styles.breakdownCount}>{reviewsStats.breakdown[stars] || 0}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Write Review Form Card */}
                                        {isOwnProfile ? (
                                            <div className={styles.writeReviewCard} style={{ textAlign: "center", padding: "34px 20px" }}>
                                                <RiShieldCheckLine style={{ fontSize: "36px", color: "#114d81", display: "block", margin: "0 auto 10px" }} />
                                                <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#001a72", margin: "0 0 6px" }}>Your Agent Profile</h4>
                                                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
                                                    You cannot submit a review for your own profile. Client reviews submitted by other users will appear here.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className={styles.writeReviewCard}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                                    <h4 className={styles.writeReviewTitle} style={{ margin: 0 }}>
                                                        {userExistingReview ? "Update Your Review" : "Write a Review"}
                                                    </h4>
                                                    {userExistingReview && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteModalOpen(true)}
                                                            style={{ background: "none", border: "none", color: "#dc2626", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                                            title="Delete your review"
                                                        >
                                                            <RiDeleteBinLine /> Delete
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={styles.formGroup}>
                                                    <label className={styles.formLabel}>Your Rating</label>
                                                    <div className={styles.starRatingInput}>
                                                        {Array.from({ length: 5 }).map((_, i) => {
                                                            const starValue = i + 1;
                                                            const active = starValue <= (hoveredRating || userRating);
                                                            return (
                                                                <span
                                                                    key={i}
                                                                    onClick={() => setUserRating(starValue)}
                                                                    onMouseEnter={() => setHoveredRating(starValue)}
                                                                    onMouseLeave={() => setHoveredRating(0)}
                                                                    className={styles.starInputSpan}
                                                                    style={{ cursor: "pointer" }}
                                                                >
                                                                    {active ? (
                                                                        <RiStarFill className={styles.formStarActive} />
                                                                    ) : (
                                                                        <RiStarLine className={styles.formStarInactive} />
                                                                    )}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.formLabel}>Your Review</label>
                                                    <textarea
                                                        className={styles.reviewTextarea}
                                                        placeholder={`Share your experience with ${agent.name}...`}
                                                        value={userComment}
                                                        onChange={(e) => setUserComment(e.target.value)}
                                                        rows={3}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.submitReviewBtn}
                                                    onClick={handleReviewSubmit}
                                                    disabled={submittingReview}
                                                >
                                                    {submittingReview ? "Saving..." : (userExistingReview ? "Update Review" : "Submit Review")}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reviews List */}
                                    <div className={styles.reviewsList}>
                                        {reviewsList.map((review) => (
                                            <div key={review.id} className={styles.reviewCard}>
                                                <img
                                                    loading="lazy"
                                                    decoding="async"
                                                    src={review.avatar || "/logo_placeholder.png"}
                                                    alt={review.name}
                                                    className={styles.reviewAvatar}
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = "/logo_placeholder.png";
                                                    }}
                                                />
                                                <div className={styles.reviewBody}>
                                                    <div className={styles.reviewHeader}>
                                                        <span className={styles.reviewName}>{review.name}</span>
                                                        <span className={styles.reviewDate}>{review.date || "Recently"}</span>
                                                    </div>
                                                    <div className={styles.reviewStars}>
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <RiStarFill key={i} className={i < review.rating ? styles.starFilled : styles.starEmpty} />
                                                        ))}
                                                    </div>
                                                    <p className={styles.reviewComment}>{review.comment}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ) : activeTab === "reels" ? (
                            (agent?.reels || []).length === 0 ? (
                                <div className={styles.emptyProperties}>
                                    <RiPlayCircleFill style={{ fontSize: "52px", color: "#94a3b8", display: "block", margin: "0 auto 12px" }} />
                                    <h3 className={styles.emptyTitle}>No Reels Uploaded Yet</h3>
                                    <p className={styles.emptyDesc}>
                                        {agent.name} hasn&rsquo;t uploaded any property reels yet.
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                                    gap: "20px",
                                    marginTop: "16px"
                                }}>
                                    {(agent?.reels || []).map((reel) => (
                                        <Link
                                            key={reel.id || reel.reel_id}
                                            href={`/reels?reel=${reel.reel_id || reel.id}`}
                                            style={{
                                                position: "relative",
                                                borderRadius: "16px",
                                                overflow: "hidden",
                                                aspectRatio: "9/12",
                                                background: "#0f172a",
                                                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "flex-end",
                                                textDecoration: "none",
                                                color: "#fff",
                                                transition: "transform 0.2s ease, box-shadow 0.2s ease"
                                            }}
                                        >
                                            {reel.thumbnail_url ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img loading="lazy" decoding="async"
                                                    src={reel.thumbnail_url}
                                                    alt={reel.caption || reel.title}
                                                    style={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover"
                                                    }}
                                                />
                                            ) : (
                                                <video disableRemotePlayback
                                                    src={reel.video_url}
                                                    style={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover"
                                                    }}
                                                    muted
                                                    preload="metadata"
                                                />
                                            )}
                                            <div style={{
                                                position: "absolute",
                                                inset: 0,
                                                background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%)"
                                            }} />
                                            <div style={{
                                                position: "absolute",
                                                top: "12px",
                                                right: "12px",
                                                background: "rgba(0,0,0,0.6)",
                                                backdropFilter: "blur(6px)",
                                                borderRadius: "20px",
                                                padding: "4px 8px",
                                                fontSize: "11px",
                                                fontWeight: 600,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}>
                                                <RiEyeLine /> {reel.views_count || 0}
                                            </div>
                                            <div style={{
                                                position: "relative",
                                                zIndex: 2,
                                                padding: "16px 14px"
                                            }}>
                                                {reel.price && (
                                                    <span style={{
                                                        display: "inline-block",
                                                        background: "#2563eb",
                                                        color: "#fff",
                                                        fontSize: "11px",
                                                        fontWeight: 700,
                                                        padding: "3px 8px",
                                                        borderRadius: "6px",
                                                        marginBottom: "6px"
                                                    }}>
                                                        {reel.price}
                                                    </span>
                                                )}
                                                <p style={{
                                                    fontSize: "13px",
                                                    fontWeight: 600,
                                                    lineHeight: 1.4,
                                                    margin: "0 0 4px",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden"
                                                }}>
                                                    {reel.caption || reel.title || "Property Reel"}
                                                </p>
                                                {reel.location && (
                                                    <p style={{
                                                        fontSize: "11.5px",
                                                        color: "#cbd5e1",
                                                        margin: 0,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px"
                                                    }}>
                                                        <RiMapPinLine /> {reel.location}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )
                        ) : visibleProperties.length === 0 ? (
                            /* Empty state for Sale / Rent tabs */
                            <div className={styles.emptyProperties}>
                                <NoPropertiesArt />
                                <h3 className={styles.emptyTitle}>
                                    No Properties for {activeTab === "sale" ? "Sale" : "Rent"}
                                </h3>
                                <p className={styles.emptyDesc}>
                                    <span className={styles.emptyDescLine}>
                                        {agent.name} hasn&rsquo;t listed any properties for{" "}
                                        {activeTab === "sale" ? "sale" : "rent"} at the moment.
                                    </span>{" "}
                                    <span className={styles.emptyDescLine}>
                                        Please check back later or explore other agents.
                                    </span>
                                </p>
                                <Link href="/agent" className={styles.emptyBtn}>
                                    <RiTeamLine aria-hidden="true" />
                                    Explore Other Agents
                                </Link>
                            </div>
                        ) : (
                            /* Property Cards Grid */
                            <>
                                <div className={styles.propertyGrid}>
                                    {visibleProperties.map((property) => {
                                        const isFav = favorites.includes(property.id);
                                        const isOwn = Boolean(property.is_owner);
                                        const priceLabel = property.price_formatted || (property.price ? `₹${Number(property.price).toLocaleString("en-IN")}` : "Price on Request");
                                        const locationLabel = property.location_label
                                            || [property.locality, property.city, property.district].filter(Boolean).join(", ")
                                            || "Kerala";
                                        const propertyType = property.property_type || property.type || "Property";
                                        const beds = property.bedrooms ? `${property.bedrooms} Beds` : "";
                                        const baths = property.bathrooms ? `${property.bathrooms} Baths` : "";
                                        const area = (() => {
                                            const a = property.area || "";
                                            if (a && a !== "1 Sq Ft" && a !== "N/A") return a;
                                            const text = `${property.title || ""} ${property.description || ""}`;
                                            const mCent = text.match(/(\d+(?:\.\d+)?)\s*(?:cent|cents)\b/i);
                                            const mAcre = text.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres)\b/i);
                                            const mSqft = text.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:sq\s*ft|sqft|sq-ft)\b/i);
                                            if (mCent) return `${mCent[1]} Cent`;
                                            if (mAcre) return `${mAcre[1]} Acre`;
                                            if (mSqft) return `${mSqft[1]} Sq Ft`;
                                            return "";
                                        })();
                                        const facing = property.facing
                                            ? (String(property.facing).toLowerCase().includes("facing") ? property.facing : `${property.facing} Facing`)
                                            : propertyType;
                                        const ownership = property.ownership || "Freehold";
                                        const addedDateFormatted = formatAddedDate(property.added_date || property.addedDate || property.created_at || property.added_date_time);
                                        const act = String(property.action || property.listing_type || property.propertyAction || "").toLowerCase();
                                        const badge = (act === "lease" || act.includes("lease"))
                                            ? "For Lease"
                                            : (act === "rent" || act.includes("rent"))
                                                ? "For Rent"
                                                : "For Sale";

                                        return (
                                            <Link
                                                key={property.id}
                                                href={getPropertyUrl(property)}
                                                className={styles.propertyCard}
                                            >
                                                {/* Photo & Badge & Favorite Button */}
                                                <div className={styles.imageWrapper}>
                                                    <img
                                                        loading="lazy"
                                                        decoding="async"
                                                        src={formatPropertyImgUrl(property.image || property.cover_image)}
                                                        alt={property.title}
                                                        className={styles.cardImage}
                                                        onError={handlePropertyImageError}
                                                    />

                                                    {/* Status Badge */}
                                                    <span className={`${styles.badge} ${styles.forSaleBadge}`}>
                                                        {badge}
                                                    </span>

                                                    {/* Favorite Heart Toggle Button */}
                                                    <button
                                                        type="button"
                                                        className={styles.cardFavoriteBtn}
                                                        onClick={(e) => toggleFavorite(e, property.id)}
                                                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                                        aria-label={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                                        aria-pressed={isFav}
                                                    >
                                                        <svg
                                                            width="18"
                                                            height="18"
                                                            viewBox="0 0 24 24"
                                                            fill={isFav ? "#ef4444" : "none"}
                                                            stroke={isFav ? "#ef4444" : "#1e293b"}
                                                            strokeWidth="2.2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        >
                                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Details */}
                                                <div className={styles.cardContent}>
                                                    <PropertyBadgeRow>
                                                        <PropertyIdBadge property={property} />
                                                        {addedDateFormatted && (
                                                            <span className={styles.cardAddedDate} title={`Added on ${addedDateFormatted}`}>
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                                    <line x1="16" y1="2" x2="16" y2="6" />
                                                                    <line x1="8" y1="2" x2="8" y2="6" />
                                                                    <line x1="3" y1="10" x2="21" y2="10" />
                                                                </svg>
                                                                {addedDateFormatted}
                                                            </span>
                                                        )}
                                                    </PropertyBadgeRow>
                                                    <h3 className={styles.cardTitle} title={property.title}>{property.title}</h3>

                                                    {/* Location */}
                                                    <div className={styles.locationRow}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                            <circle cx="12" cy="10" r="3" />
                                                        </svg>
                                                        <span>{locationLabel}</span>
                                                    </div>

                                                    {/* Price & Own Property badge */}
                                                    <div className={styles.priceRow}>
                                                        <div className={styles.price}>{priceLabel}</div>
                                                        <div className={styles.priceRightGroup}>
                                                            {isOwn && (
                                                                <span className={styles.ownPropertyBadge}>
                                                                    Own Property
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Meta Specifications */}
                                                    <div className={styles.metaGrid}>
                                                        {beds ? (
                                                            <>
                                                                <div className={styles.metaItem}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M2 4v16M2 8h20v12M2 12h20M18 4v4" />
                                                                    </svg>
                                                                    <span>{beds}</span>
                                                                </div>
                                                                {baths && (
                                                                    <div className={styles.metaItem}>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1zM6 12V5a2 2 0 0 1 2-2h3v9" />
                                                                        </svg>
                                                                        <span>{baths}</span>
                                                                    </div>
                                                                )}
                                                                {area && (
                                                                    <div className={styles.metaItem}>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                        </svg>
                                                                        <span>{area}</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className={styles.metaItem}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                                                        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                                                                    </svg>
                                                                    <span>{property.cent || area || "Plot"}</span>
                                                                </div>
                                                                <div className={styles.metaItem}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <circle cx="12" cy="12" r="10" />
                                                                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                                                    </svg>
                                                                    <span>{facing}</span>
                                                                </div>
                                                                <div className={styles.metaItem}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                                    </svg>
                                                                    <span>{ownership}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Footer />

            {/* ── Custom Confirmation Popup Modal ── */}
            {deleteModalOpen && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => !deletingReview && setDeleteModalOpen(false)}
                >
                    <div
                        className={styles.modalCard}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalIconBox}>
                            <RiDeleteBinLine />
                        </div>
                        <h3 className={styles.modalTitle}>Delete Your Review?</h3>
                        <p className={styles.modalDesc}>
                            Are you sure you want to delete your review? This action cannot be undone and your rating will be permanently removed from {agent.name}&rsquo;s profile.
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.modalCancelBtn}
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={deletingReview}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.modalDeleteBtn}
                                onClick={confirmDeleteReview}
                                disabled={deletingReview}
                            >
                                {deletingReview ? "Deleting..." : "Delete Review"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toastMessage && (
                <div className={styles.toast}>
                    <RiCheckboxCircleLine className={styles.toastIcon} />
                    <span>{toastMessage}</span>
                </div>
            )}
        </>
    );
}
