"use client";

import styles from "./nav.module.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { RiLogoutBoxRLine, RiExternalLinkLine } from "react-icons/ri";
import { buildProfileNav, isNavItemActive } from "../../lib/profileNav";
import { useProfileRole } from "../../lib/profileRole";
import { getEnquiries, getServerEnquiries, subscribeEnquiries } from "../../lib/builderEnquiries";

/* Split out of nav.jsx so it loads as its own chunk, only when needed.
   Shows the same links as the profile sidebar (one shared list), on every screen size. */
export default function NavAccountMenu({
    authUser,
    displayEmail,
    displayInitial,
    displayName,
    setAccountMenuOpen,
    setShowLogoutModal,
}) {
    const pathname = usePathname() || "";
    const router = useRouter();
    const enquiries = useSyncExternalStore(subscribeEnquiries, getEnquiries, getServerEnquiries);
    const unreadEnquiries = enquiries.filter((e) => !e.read).length;

    const {
        activeRole,
        setActiveRole,
        hasDualRoles,
        hasAgent,
        hasBuilder,
        builder,
        displayRoleLabel,
    } = useProfileRole(authUser, pathname);

    const sections = buildProfileNav({
        showSubscription: hasAgent || hasBuilder,
        builder,
        activeRole,
    });

    const close = () => setAccountMenuOpen(false);

    const handleRoleChange = (e) => {
        const nextRole = e.target.value;
        setActiveRole(nextRole);
        if (nextRole === "agent" && pathname.startsWith("/profile/enquiries")) {
            router.push("/profile");
        }
    };

    return (
        <>
            <div className={styles.menuDismissOverlay} onClick={close} />
            <div className={styles.accountDropdown} role="menu" aria-label="Account menu">
                <div className={styles.accountDropdownHeader}>
                    <span className={styles.accountAvatar}>{displayInitial}</span>
                    <div>
                        <div className={styles.accountDropdownName}>{displayName}</div>
                        {displayEmail && <div className={styles.accountDropdownEmail}>{displayEmail}</div>}
                        {hasDualRoles ? (
                            <select
                                className={styles.roleSelect}
                                value={activeRole}
                                onClick={(e) => e.stopPropagation()}
                                onChange={handleRoleChange}
                                aria-label="Switch active role"
                            >
                                <option value="agent">Agent</option>
                                <option value="builder">Builder</option>
                            </select>
                        ) : (
                            (hasAgent || hasBuilder || authUser?.role || authUser?.role_val) && (
                                <span className={styles.agentTag}>{displayRoleLabel}</span>
                            )
                        )}
                    </div>
                </div>

                <nav className={styles.accountDropdownList} aria-label="Profile sections">
                    {sections.map((section) => (
                        <div key={section.id} className={section.title ? styles.accountMenuSection : undefined}>
                            {section.title && (
                                <span className={styles.accountMenuSectionTitle}>
                                    {section.title}
                                    <span className={styles.accountMenuSectionBadge}>Verified</span>
                                </span>
                            )}
                            {section.items.map(({ id, label, Icon, href, highlight, newTab }) => {
                                const active = isNavItemActive(href, pathname);
                                return (
                                    <Link
                                        key={id}
                                        href={href}
                                        {...(newTab ? { target: "_blank", rel: "noopener noreferrer", title: `${label} (opens in a new tab)` } : {})}
                                        role="menuitem"
                                        aria-current={active ? "page" : undefined}
                                        className={`${styles.accountDropdownItem} ${highlight ? styles.accountDropdownItemHighlight : ""} ${active ? styles.accountDropdownItemActive : ""}`}
                                        onClick={close}
                                    >
                                        <Icon aria-hidden="true" /> {label}
                                        {newTab && <RiExternalLinkLine className={styles.menuExternal} aria-hidden="true" />}
                                        {id === "enquiries" && unreadEnquiries > 0 && (
                                            <span className={styles.menuCountBadge} aria-label={`${unreadEnquiries} unread`}>
                                                {unreadEnquiries > 99 ? "99+" : unreadEnquiries}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <button
                    type="button"
                    role="menuitem"
                    className={`${styles.accountDropdownItem} ${styles.accountDropdownLogout}`}
                    onClick={() => {
                        setShowLogoutModal(true);
                        close();
                    }}
                >
                    <RiLogoutBoxRLine aria-hidden="true" /> Logout
                </button>
            </div>
        </>
    );
}
