"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./notifications.module.css";
import { notificationsApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
    RiCheckLine,
    RiHome4Line,
    RiFileTextLine,
    RiArrowRightSLine,
    RiCloseLine,
    RiRefreshLine,
    RiPriceTag3Line,
    RiSparkling2Line,
    RiBuildingLine,
    RiVipCrownLine,
} from "react-icons/ri";
import { LuMessageSquareMore } from "react-icons/lu";

function NoNotificationsArt() {
    return (
        <svg
            width="320"
            height="220"
            viewBox="0 0 320 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.noResultsArt}
            aria-hidden="true"
        >
            <ellipse cx="160" cy="190" rx="90" ry="8" fill="#eff6ff" />
            <g opacity="0.6" fill="#e2e8f0">
                <circle cx="90" cy="80" r="15" />
                <circle cx="110" cy="70" r="22" />
                <circle cx="132" cy="80" r="14" />
                <rect x="90" y="76" width="42" height="18" rx="9" />
            </g>
            <g fill="#94a3b8">
                <path d="M70,40 L72,45 L77,47 L72,49 L70,54 L68,49 L63,47 L68,45 Z" />
                <path d="M250,110 L251.5,114 L255.5,115.5 L251.5,117 L250,121 L248.5,117 L244.5,115.5 L248.5,114 Z" opacity="0.7" />
            </g>
            <g transform="translate(110, 40)">
                <path
                    d="M50 20 C25 20, 20 50, 20 80 L80 80 C80 50, 75 20, 50 20 Z"
                    fill="#cbd5e1"
                    stroke="#475569"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                />
                <circle
                    cx="50"
                    cy="88"
                    r="9"
                    fill="#3b82f6"
                    stroke="#475569"
                    strokeWidth="3"
                />
                <path
                    d="M45 20 A5 5 0 0 1 55 20"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="3.5"
                />
                <rect
                    x="15"
                    y="76"
                    width="70"
                    height="7"
                    rx="3.5"
                    fill="#94a3b8"
                    stroke="#475569"
                    strokeWidth="3"
                />
                <text x="75" y="25" fill="#3b82f6" fontSize="16" fontWeight="bold" fontFamily="monospace">Z</text>
                <text x="88" y="12" fill="#2563eb" fontSize="22" fontWeight="bold" fontFamily="monospace">Z</text>
            </g>
        </svg>
    );
}

export default function NotificationsPage() {
    const router = useRouter();
    const { user: authUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all"); // "all" | "unread" | "offers" | "matches"

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await notificationsApi.list();
            if (res?.success) {
                setNotifications(res.data || []);
            }
        } catch (e) {
            console.error("Failed to load notifications", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications, authUser]);

    // Handle clicking a notification
    const handleNotificationClick = async (notif) => {
        if (notif.unread) {
            try {
                await notificationsApi.markRead(notif.id);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
                );
            } catch (e) { }
        }

        if (notif.link) {
            router.push(notif.link);
        }
    };

    // Delete a single notification
    const deleteNotification = async (id) => {
        try {
            await notificationsApi.delete(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch (e) {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }
    };

    // Mark all unread notifications as read
    const markAllAsRead = async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, unread: false }))
            );
        } catch (e) { }
    };

    // Filter list based on selected tab
    const filteredNotifications = notifications.filter((notif) => {
        if (activeTab === "unread") return notif.unread;
        if (activeTab === "offers") return notif.type === "offer";
        if (activeTab === "matches") return notif.type === "match";
        return true;
    });

    const unreadCount = notifications.filter((n) => n.unread).length;
    const allCount = notifications.length;
    const offersCount = notifications.filter((n) => n.type === "offer").length;
    const matchesCount = notifications.filter((n) => n.type === "match").length;

    // Helper to render custom styled icon based on notification type
    const renderNotificationIcon = (type) => {
        switch (type) {
            case "subscription":
            case "agent_subscription":
            case "agent_subscription_activated":
            case "agent_subscription_expiring":
            case "agent_subscription_expired":
                return (
                    <div className={`${styles.iconContainer} ${styles.iconOffer}`}>
                        <RiVipCrownLine />
                    </div>
                );
            case "property_published":
            case "property":
                return (
                    <div className={`${styles.iconContainer} ${styles.iconApproval}`}>
                        <RiHome4Line />
                    </div>
                );
            case "approval":
                return (
                    <div className={`${styles.iconContainer} ${styles.iconApproval}`}>
                        <RiCheckLine />
                    </div>
                );
            case "welcome":
                return (
                    <div className={`${styles.iconContainer} ${styles.iconWelcome}`}>
                        <RiHome4Line />
                    </div>
                );
            case "offer":
                return (
                    <div className={`${styles.iconContainer} ${styles.iconOffer}`}>
                        <RiPriceTag3Line />
                    </div>
                );
            case "match":
                return (
                    <div className={`${styles.iconContainer} ${styles.iconMatch}`}>
                        <RiBuildingLine />
                    </div>
                );
            case "message":
                return (
                    <div className={`${styles.iconContainer} ${styles.iconMessage}`}>
                        <LuMessageSquareMore />
                    </div>
                );
            case "review":
                return (
                    <div className={`${styles.iconContainer} ${styles.iconReview}`}>
                        <RiFileTextLine />
                    </div>
                );
            default:
                return (
                    <div className={`${styles.iconContainer} ${styles.iconGeneral}`}>
                        <RiSparkling2Line />
                    </div>
                );
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <Nav />

            <div className={styles.mainContent}>
                <div className={styles.container}>
                    {/* Centered Notifications Card */}
                    <div className={styles.notificationsCard}>
                        {/* Header Row */}
                        <div className={styles.cardHeader}>
                            <div>
                                <h1 className={styles.cardTitle}>Notifications</h1>
                                <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
                                    Stay updated with property matches, offers, and messages in real time.
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <button
                                    type="button"
                                    className={styles.markReadBtn}
                                    onClick={fetchNotifications}
                                    title="Refresh"
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                >
                                    <RiRefreshLine /> Refresh
                                </button>
                                <button
                                    type="button"
                                    className={styles.markReadBtn}
                                    onClick={markAllAsRead}
                                    disabled={unreadCount === 0}
                                >
                                    Mark all as read
                                </button>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className={styles.tabsContainer}>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === "all" ? styles.tabBtnActive : ""}`}
                                onClick={() => setActiveTab("all")}
                            >
                                <span>All</span>
                                <span className={`${styles.badge} ${activeTab === "all" ? styles.badgeActive : ""}`}>
                                    {allCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === "unread" ? styles.tabBtnActive : ""}`}
                                onClick={() => setActiveTab("unread")}
                            >
                                <span>Unread</span>
                                <span className={`${styles.badge} ${styles.badgeUnread} ${activeTab === "unread" ? styles.badgeActive : ""}`}>
                                    {unreadCount}
                                </span>
                            </button>

                            {offersCount > 0 && (
                                <button
                                    type="button"
                                    className={`${styles.tabBtn} ${activeTab === "offers" ? styles.tabBtnActive : ""}`}
                                    onClick={() => setActiveTab("offers")}
                                >
                                    <span>Offers</span>
                                    <span className={`${styles.badge} ${activeTab === "offers" ? styles.badgeActive : ""}`}>
                                        {offersCount}
                                    </span>
                                </button>
                            )}

                            {matchesCount > 0 && (
                                <button
                                    type="button"
                                    className={`${styles.tabBtn} ${activeTab === "matches" ? styles.tabBtnActive : ""}`}
                                    onClick={() => setActiveTab("matches")}
                                >
                                    <span>Matches</span>
                                    <span className={`${styles.badge} ${activeTab === "matches" ? styles.badgeActive : ""}`}>
                                        {matchesCount}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* List items block */}
                        <div className={styles.notificationsList}>
                            {isLoading ? (
                                <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b" }}>
                                    <RiRefreshLine style={{ animation: "spin 1s linear infinite", fontSize: "24px" }} />
                                    <p style={{ marginTop: "8px" }}>Loading notifications...</p>
                                </div>
                            ) : filteredNotifications.length > 0 ? (
                                filteredNotifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`${styles.notificationItem} ${notif.unread ? styles.itemUnread : ""}`}
                                        onClick={() => handleNotificationClick(notif)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <div className={styles.leftCol}>
                                            {renderNotificationIcon(notif.type)}
                                            <div className={styles.textContent}>
                                                <h3 className={styles.itemTitle}>{notif.title}</h3>
                                                <p className={styles.itemDesc}>{notif.desc}</p>
                                                {notif.link && (
                                                    <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "2px", marginTop: "2px" }}>
                                                        View details <RiArrowRightSLine />
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.rightCol}>
                                            <span className={styles.dateTime}>
                                                {notif.date} &bull; {notif.time}
                                            </span>
                                            {notif.unread && (
                                                <span className={styles.unreadDot} aria-hidden="true" />
                                            )}
                                            <button
                                                type="button"
                                                className={styles.deleteBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notif.id);
                                                }}
                                                title="Delete notification"
                                            >
                                                <RiCloseLine />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noResultsArea}>
                                    <NoNotificationsArt className={styles.noResultsArt} />
                                    <h3 className={styles.noResultsTitle}>No notifications yet</h3>
                                    <p className={styles.noResultsDesc}>
                                        {activeTab === "unread"
                                            ? "You're all caught up! There are no unread notifications."
                                            : "We'll notify you when you receive offers, messages, or matching properties."}
                                    </p>
                                    <Link href="/properties" className={styles.resetNotifBtn}>
                                        Explore Properties
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
