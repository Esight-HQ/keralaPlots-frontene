"use client";

import styles from "./nav.module.css";
import Link from "next/link";
import { RiCloseLine, RiLoginBoxLine, RiArrowRightSLine } from "react-icons/ri";

/* Split out of nav.jsx so it loads as its own chunk, only when needed. */
export default function NavMobileMenu({
    authUser,
    isNavItemActive,
    navItems,
    pathname,
    setMobileMenuOpen,
}) {
    return (
        <>
            <div
                className={styles.mobileDrawerOverlay}
                onClick={() => setMobileMenuOpen(false)}
            />
            <aside
                className={styles.mobileDrawer}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
            >
                <div className={styles.mobileDrawerHeader}>
                    <Link
                        href="/"
                        className={styles.mobileDrawerLogo}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public"
                            alt="KeralaPlots Logo"
                            width={120}
                            height={50}
                            className={styles.logoImage}
                        />
                    </Link>
                    <button
                        type="button"
                        className={styles.mobileDrawerClose}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close navigation menu"
                    >
                        <RiCloseLine />
                    </button>
                </div>
        
                <div className={styles.mobileDrawerSectionLabel}>Menu</div>
                <ul className={styles.mobileDrawerNav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isNavItemActive(item.href);
                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    className={`${styles.accountDropdownItem} ${styles.mobileDrawerLink} ${active ? styles.mobileDrawerLinkActive : ""}`}
                                    aria-current={active ? "page" : undefined}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Icon /> {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
        
                {!authUser && (
                    <div className={styles.mobileDrawerFooter}>
                        <Link
                        href={pathname && !pathname.startsWith("/login") && !pathname.startsWith("/auth") ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login"}
                        className={styles.mobileDrawerSignIn}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <RiLoginBoxLine /> Sign In
                        <RiArrowRightSLine className={styles.mobileDrawerSignInArrow} />
                    </Link>
                    </div>
                )}
            </aside>
        </>
    );
}
