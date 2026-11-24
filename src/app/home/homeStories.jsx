"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./homeStories.module.css";
import Link from "next/link";
import reelsApi from "../lib/reelsApi";

function getStreamPoster(src) {
    if (!src) return null;
    const match = src.match(/(?:videodelivery\.net|cloudflarestream\.com)\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    return `https://customer-hrtlsfl7dijstj5i.cloudflarestream.com/${match[1]}/thumbnails/thumbnail.jpg?time=1s&height=1200`;
}

export default function HomeStories() {
    const router = useRouter();
    const trackRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);

    const checkScroll = () => {
        if (trackRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
            setCanScrollLeft(scrollLeft > 10);
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchLatestReels = async () => {
            try {
                const res = await reelsApi.getFeed(1, 10);
                if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
                    setReels(res.data);
                } else if (isMounted) {
                    setReels([]);
                }
            } catch (err) {
                console.error("Failed to load reels for home stories:", err);
                if (isMounted) {
                    setReels([]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchLatestReels();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const track = trackRef.current;
        if (track) {
            track.scrollLeft = 0;
            checkScroll();
            track.addEventListener("scroll", checkScroll, { passive: true });
            window.addEventListener("resize", checkScroll);
            return () => {
                track.removeEventListener("scroll", checkScroll);
                window.removeEventListener("resize", checkScroll);
            };
        }
    }, [reels]);

    const scrollLeft = () => {
        if (trackRef.current) {
            trackRef.current.scrollBy({ left: -240, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (trackRef.current) {
            trackRef.current.scrollBy({ left: 240, behavior: "smooth" });
        }
    };

    // If still loading or no reels exist in database, do not render the section
    if (loading || reels.length === 0) {
        return null;
    }

    return (
        <section className={styles.storiesSection}>
            <div className={styles.container}>
                {/* Left Info Column */}
                <div className={styles.leftBlock}>
                    <h2 className={styles.sectionTitle}>
                        Real Stories.<br />
                        Real Experiences.
                    </h2>

                    <p className={styles.sectionSubtitle}>
                        Hear from our clients who found their dream homes with us.
                    </p>

                    <Link href={"/reels"} className={styles.viewAllBtn}>
                        View All Reels
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>
                </div>

                {/* Right Cards Carousel Track */}
                <div className={styles.carouselWrapper}>
                    {/* Left Scroll Button */}
                    {canScrollLeft && (
                        <button
                            type="button"
                            className={`${styles.arrowBtn} ${styles.arrowBtnLeft}`}
                            onClick={scrollLeft}
                            aria-label="Scroll stories left"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                    )}

                    <div className={styles.cardsTrack} ref={trackRef}>
                        {reels.map((story) => {
                            const id = story.id || story.reel_id;
                            const name = story.creator?.name || story.name || "KeralaPlots User";
                            const location = story.location || "Kerala";
                            const avatar = story.creator?.avatar || story.avatar || "/logo_placeholder.png";
                            const bgImage = story.thumbnail_url || getStreamPoster(story.video_url) || "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public";

                            return (
                                <div
                                    key={id}
                                    className={styles.storyCard}
                                    style={{ backgroundImage: `url("${bgImage}")` }}
                                    onClick={() => router.push(`/reels?reel=${id}`)}
                                >
                                    <div className={styles.cardOverlay}>
                                        <div className={styles.avatarContainer}>
                                            <img
                                                loading="lazy"
                                                decoding="async"
                                                src={avatar}
                                                alt={name}
                                                className={styles.avatarImage}
                                                onError={(e) => {
                                                    e.currentTarget.src = "/logo_placeholder.png";
                                                }}
                                            />
                                        </div>

                                        <div className={styles.cardContent}>
                                            <h3 className={styles.clientName}>{name}</h3>
                                            <div className={styles.locationRow}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                <span className={styles.locationName}>{location}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Scroll Button */}
                    {canScrollRight && (
                        <button
                            type="button"
                            className={`${styles.arrowBtn} ${styles.arrowBtnRight}`}
                            onClick={scrollRight}
                            aria-label="Scroll stories right"
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
