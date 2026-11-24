"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./nav.module.css";
import { useAuth } from "../../context/AuthContext";
import { PiBuildingApartment } from "react-icons/pi";
import {
    RiHome5Line,
    RiNotification3Line,
    RiNotification3Fill,
    RiPriceTag3Line,
    RiBuilding2Line,
    RiFlashlightLine,
    RiTeamLine,
    RiServiceLine,
    RiInformationLine,
    RiMapPinUserLine,
} from "react-icons/ri";
import {
    LuHeart,
    LuHouse,
    LuMessageSquareMore,
    LuPlus,
    LuSquarePlay,
} from "react-icons/lu";
import { notificationsApi, messagesApi } from "../../lib/api";
import dynamic from "next/dynamic";
import { preloadWhenIdle } from "../../lib/preloadWhenIdle";

/* The account menu, mobile menu and logout dialog only appear after a
   click, so they load as separate chunks (fetched in the background once
   the page is idle). */
const loadNavAccountMenu = () => import("./NavAccountMenu");
const loadNavMobileMenu = () => import("./NavMobileMenu");
const loadNavLogoutModal = () => import("./NavLogoutModal");
const NavAccountMenu = dynamic(loadNavAccountMenu, { ssr: false });
const NavMobileMenu = dynamic(loadNavMobileMenu, { ssr: false });
const NavLogoutModal = dynamic(loadNavLogoutModal, { ssr: false });

export default function Nav() {
    useEffect(() => preloadWhenIdle([loadNavAccountMenu, loadNavMobileMenu, loadNavLogoutModal]), []);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isBottomNavCompact, setIsBottomNavCompact] = useState(false);
    const [postMenuOpen, setPostMenuOpen] = useState(false);
    // Scroll state: background white vs transparent, show vs hide on scroll direction
    const [isScrolled, setIsScrolled] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const lastScrollY = useRef(0);
    const postMenuRef = useRef(null);

    // Dynamic Auth user state from AuthContext
    const { user: authUser, logout } = useAuth();
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const accountMenuRef = useRef(null);

    const hasAuth = Boolean(authUser);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("kp_unread_messages_count");
            if (stored !== null) {
                const parsed = parseInt(stored, 10);
                if (!isNaN(parsed) && parsed >= 0) setUnreadMessages(parsed);
            }
        } catch { }
    }, []);

    const fetchBadgeCounts = async () => {
        const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("kp_auth_token"));
        if (!authUser && !hasToken) {
            setUnreadNotifications(0);
            setUnreadMessages(0);
            try {
                localStorage.setItem("kp_unread_messages_count", "0");
            } catch { }
            return;
        }
        try {
            const [notifRes, msgRes] = await Promise.allSettled([
                notificationsApi.unreadCount(),
                messagesApi.unreadCount(),
            ]);
            if (notifRes.status === "fulfilled" && notifRes.value?.success) {
                setUnreadNotifications(notifRes.value.unread_count || 0);
            }
            if (msgRes.status === "fulfilled") {
                const val = msgRes.value;
                const count = typeof val?.unread_count === "number"
                    ? val.unread_count
                    : (typeof val?.data?.unread_count === "number"
                        ? val.data.unread_count
                        : (typeof val?.count === "number" ? val.count : null));
                if (count !== null) {
                    setUnreadMessages(count);
                    try {
                        localStorage.setItem("kp_unread_messages_count", String(count));
                    } catch { }
                }
            }
        } catch (e) { }
    };

    // Listen for custom read/unread update events dispatched when messages are opened
    useEffect(() => {
        const handleUnreadUpdate = (e) => {
            const count = typeof e?.detail?.count === "number" ? e.detail.count : null;
            setTimeout(() => {
                if (count !== null) {
                    setUnreadMessages(count);
                    try {
                        localStorage.setItem("kp_unread_messages_count", String(count));
                    } catch { }
                } else {
                    fetchBadgeCounts();
                }
            }, 0);
        };
        const handleStorage = (e) => {
            if (e.key === "kp_unread_messages_count") {
                const count = parseInt(e.newValue || "0", 10);
                setUnreadMessages(isNaN(count) ? 0 : Math.max(0, count));
            }
        };
        window.addEventListener("kp_unread_messages_updated", handleUnreadUpdate);
        window.addEventListener("storage", handleStorage);
        return () => {
            window.removeEventListener("kp_unread_messages_updated", handleUnreadUpdate);
            window.removeEventListener("storage", handleStorage);
        };
    }, []);

    useEffect(() => {
        fetchBadgeCounts();
        const interval = setInterval(fetchBadgeCounts, 10000); // 10s polling for real-time alerts
        const onFocus = () => fetchBadgeCounts();
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", onFocus);
        };
    }, [authUser]);

    const handleLogout = async () => {
        await logout();
        setAccountMenuOpen(false);
    };

    // Click outside handler for Post Property tooltip menu & account dropdown
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (postMenuRef.current && !postMenuRef.current.contains(e.target)) {
                setPostMenuOpen(false);
            }
            if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
                setAccountMenuOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    const pathname = usePathname();
    const isProperties = pathname?.startsWith("/properties");
    const isReels = pathname?.startsWith("/reels");
    const isMessages = pathname?.startsWith("/messages");
    const isSaved = pathname?.startsWith("/favorites");

    const isNavItemActive = (href) =>
        href === "/" ? pathname === "/" : pathname?.startsWith(href);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // 1. Add white background when scrolled past banner area (50px), remove background when at banner top
            if (currentScrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }

            // 2. Hide navbar and compact bottom nav when scrolling down, show when scrolling up
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setIsHidden(true); // Hide header on scroll down
                setIsBottomNavCompact(true); // Compact bottom nav on scroll down
            } else {
                setIsHidden(false); // Show header on scroll up or at top
                setIsBottomNavCompact(false); // Expand bottom nav on scroll up or at top
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navItems = [
        { label: "Home", href: "/", icon: RiHome5Line },
        { label: "Properties", href: "/properties", icon: RiBuilding2Line },
        { label: "Quick Sell", href: "/quick-sell", icon: RiFlashlightLine },
        { label: "Agents", href: "/agent", icon: RiTeamLine },
        { label: "Builders", href: "/builders", icon: RiMapPinUserLine },
        { label: "Services", href: "/services", icon: RiServiceLine },
        // Hidden from nav (keep code intact, easily re-enabled by setting hidden: false)
        { label: "Pricing", href: "/pricing", icon: RiPriceTag3Line, },
        // { label: "About Us", href: "/about-us", icon: RiInformationLine },
    ].filter((item) => !item.hidden);

    // Close the mobile drawer on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    // Lock page scroll + close on Escape while the mobile drawer is open
    useEffect(() => {
        if (!mobileMenuOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => {
            if (e.key === "Escape") setMobileMenuOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [mobileMenuOpen]);

    const handlePropertiesNavClick = () => {
        try {
            sessionStorage.removeItem("kp_search_params");
        } catch (e) {}
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("kp:reset-properties-filters"));
        }
    };

    const displayName = authUser?.name || authUser?.personal_details?.fullname || authUser?.username || "User";
    const displayEmail = authUser?.email || authUser?.personal_details?.email || (authUser?.phone ? `+91 ${authUser.phone}` : "");
    const displayInitial = (displayName || "U").charAt(0).toUpperCase();

    return (
        <>
            <header
                className={`${styles.navHeader} ${isScrolled ? styles.navScrolled : ""} ${isHidden ? styles.navHidden : ""}`}
            >
                <div className={styles.navContainer}>
                    <div className={styles.navCol1}>
                        {/* Responsive Hamburger Menu */}
                        <button
                            type="button"
                            className={styles.mobileHamburgerBtn}
                            onClick={() => {
                                setAccountMenuOpen(false);
                                setMobileMenuOpen((open) => !open);
                            }}
                            aria-label="Open navigation menu"
                            aria-expanded={mobileMenuOpen}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Brand Logo */}
                        <Link href="/" className={styles.logoWrapper}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public"
                                alt="KeralaPlots Logo"
                                width={120}
                                height={50}
                                className={styles.logoImage}
                            />
                        </Link>
                    </div>
                    {/* Right Action Buttons & Icons */}
                    <div className={styles.navActions}>
                        {/* Navigation Links */}
                        <nav className={styles.navigation}>
                            <ul className={styles.navLinks}>
                                {navItems.map((item) => (
                                    <li key={item.label} className={styles.navItem}>
                                        <Link
                                            href={item.href}
                                            onClick={item.href === "/properties" ? handlePropertiesNavClick : undefined}
                                            className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ""}`}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        {/* Notification Bell Icon Button */}
                        <Link
                            href="/notifications"
                            className={styles.notificationBtn}
                            title="Notifications"
                        >
                            {unreadNotifications > 0 ? <RiNotification3Fill className={styles.bellActive} /> : <RiNotification3Line />}
                            {unreadNotifications > 0 && <span className={styles.notificationBadge} />}
                        </Link>

                        {/* Sign In/Sign Up Button, or Account Menu when logged in */}
                        {authUser ? (
                            <div className={styles.accountMenuWrapper} ref={accountMenuRef}>
                                <button
                                    type="button"
                                    className={styles.accountBtn}
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        setAccountMenuOpen(!accountMenuOpen);
                                    }}
                                >
                                    <span className={styles.accountAvatar}>
                                        {displayInitial}
                                    </span>
                                    <span className={styles.accountName}>{displayName.split(" ")[0]}</span>
                                </button>

                                {accountMenuOpen && (
                                    <NavAccountMenu
                                        authUser={authUser}
                                        displayEmail={displayEmail}
                                        displayInitial={displayInitial}
                                        displayName={displayName}
                                        setAccountMenuOpen={setAccountMenuOpen}
                                        setShowLogoutModal={setShowLogoutModal}
                                    />
                                )}
                            </div>
                        ) : (
                            <Link
                                href={pathname && !pathname.startsWith("/login") && !pathname.startsWith("/auth") ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login"}
                                className={styles.signInBtn}
                            >
                                Sign In
                            </Link>
                        )}

                        {/* Mobile Hamburger Toggle Button */}
                        <button
                            type="button"
                            className={styles.mobileMenuBtn}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle Navigation Drawer"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Drawer (styled to match the account side menu) */}
            {mobileMenuOpen && (
                <NavMobileMenu
                    authUser={authUser}
                    isNavItemActive={isNavItemActive}
                    navItems={navItems}
                    pathname={pathname}
                    setMobileMenuOpen={setMobileMenuOpen}
                />
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && <NavLogoutModal handleLogout={handleLogout} setShowLogoutModal={setShowLogoutModal} />}
            {/* Floating Bottom Navigation Bar (Visible always except on messages page, redirects to login if unauthenticated for protected actions) */}
            {!isMessages && (
                <nav className={`${styles.bottomNav} ${isBottomNavCompact ? styles.bottomNavCompact : ""}`} aria-label="Bottom Navigation">
                    <div className={styles.gradientBlur}>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                    <div className={styles.bottomNavContainer}>
                        <Link
                            href="/properties"
                            onClick={handlePropertiesNavClick}
                            className={`${styles.navItem} ${isProperties ? styles.navItemActive : ""}`}
                        >
                            <PiBuildingApartment className={styles.navIcon} />
                            <span className={styles.navText}>Properties</span>
                        </Link>

                        <Link
                            href="/reels"
                            className={`${styles.navItem} ${isReels ? styles.navItemActive : ""}`}
                        >
                            <LuSquarePlay className={styles.navIcon} />
                            <span className={styles.navText}>Reels</span>
                        </Link>

                        <div className={styles.navItemSpecial} ref={postMenuRef}>
                            {postMenuOpen && (
                                <div className={styles.postMenu} role="menu">
                                    <Link
                                        href={authUser ? "/post-property" : "/login?redirect=/post-property"}
                                        className={styles.postMenuItem}
                                        role="menuitem"
                                        onClick={() => setPostMenuOpen(false)}
                                    >
                                        <LuHouse className={styles.postMenuIcon} />
                                        <span>Post Property</span>
                                    </Link>
                                    <Link
                                        href={authUser ? "/post-reel" : "/login?redirect=/post-reel"}
                                        className={styles.postMenuItem}
                                        role="menuitem"
                                        onClick={() => setPostMenuOpen(false)}
                                    >
                                        <LuSquarePlay className={styles.postMenuIcon} />
                                        <span>Post Reel</span>
                                    </Link>
                                </div>
                            )}

                            <button
                                type="button"
                                className={styles.postMenuButton}
                                onClick={() => setPostMenuOpen((open) => !open)}
                                aria-expanded={postMenuOpen}
                                aria-haspopup="menu"
                                aria-label="Open post menu"
                            >
                                <div className={styles.specialIconCircle}>
                                    <LuPlus className={styles.specialIcon} />
                                </div>
                                <span className={styles.navTextSpecial}>Post</span>
                            </button>
                        </div>

                        <Link
                            href={authUser ? "/messages" : "/login?redirect=/messages"}
                            className={`${styles.navItem} ${isMessages ? styles.navItemActive : ""}`}
                        >
                            <span className={styles.navIcon}>
                                <LuMessageSquareMore style={{ width: '100%', height: '100%' }} />
                                {hasAuth && unreadMessages > 0 && (
                                    <span className={styles.navMessageDot}>
                                        {unreadMessages > 99 ? "99+" : unreadMessages}
                                    </span>
                                )}
                            </span>
                            <span className={styles.navText}>Message</span>
                        </Link>

                        <Link
                            href={authUser ? "/favorites" : "/login?redirect=/favorites"}
                            className={`${styles.navItem} ${isSaved ? styles.navItemActive : ""}`}
                        >
                            <LuHeart className={styles.navIcon} />
                            <span className={styles.navText}>Saved</span>
                        </Link>
                    </div>
                </nav>
            )}
        </>
    );
}
