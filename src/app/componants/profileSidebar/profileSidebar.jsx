"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getEnquiries, getServerEnquiries, subscribeEnquiries } from "../../lib/builderEnquiries";
import styles from "./profileSidebar.module.css";
import { RiExternalLinkLine } from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import { PROFILE_NAV_ITEMS, buildProfileNav, isNavItemActive } from "../../lib/profileNav";
import { useProfileRole } from "../../lib/profileRole";

const USER_PLACEHOLDER = "/user-placeholder.jpg";
const OLD_STOCK_AVATAR = "images.unsplash.com/photo-1573496359142-b8d87734a5a2";

function realAvatar(value) {
    if (!value) return USER_PLACEHOLDER;
    const str = String(value);
    if (str.includes(OLD_STOCK_AVATAR) || str.includes("ff7c6dab-0418-4d39-7586-932e36dae300")) {
        return USER_PLACEHOLDER;
    }
    return value;
}

// Kept for existing imports; the list itself lives in lib/profileNav.js
export { PROFILE_NAV_ITEMS };

export default function ProfileSidebar({ user: initialUser, items = PROFILE_NAV_ITEMS, onLogout }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user: authUser, completion } = useAuth();
    const enquiries = useSyncExternalStore(subscribeEnquiries, getEnquiries, getServerEnquiries);
    const unreadEnquiries = enquiries.filter((e) => !e.read).length;

    const activeUser = authUser || initialUser || {
        name: "User",
        role: "User",
        email: "",
        avatar: USER_PLACEHOLDER,
    };

    const displayName = activeUser.name || activeUser.personal_details?.fullname || activeUser.username || "User";
    const displayEmail = activeUser.email || activeUser.personal_details?.email || (activeUser.phone ? `+91 ${activeUser.phone}` : "");
    const displayAvatar = realAvatar(activeUser.avatar || activeUser.personal_details?.Image);

    const completionPercent = completion?.percentage ?? 75;
    const isLogo = !displayAvatar || displayAvatar === USER_PLACEHOLDER || String(displayAvatar).includes("user-placeholder");

    const {
        activeRole,
        setActiveRole,
        hasDualRoles,
        hasAgent,
        hasBuilder,
        builder,
        displayRoleLabel,
    } = useProfileRole(activeUser, pathname || "");

    const handleRoleChange = (e) => {
        const nextRole = e.target.value;
        setActiveRole(nextRole);
        if (nextRole === "agent" && pathname?.startsWith("/profile/enquiries")) {
            router.push("/profile");
        }
    };

    const navSections = buildProfileNav({
        items,
        showSubscription:
            hasAgent ||
            hasBuilder ||
            Boolean(pathname?.startsWith("/agent/subscription")),
        builder,
        activeRole,
    });

    return (
        <aside className={styles.sidebar}>
            <div className={styles.identity}>
                {displayAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={displayAvatar}
                        alt={displayName}
                        className={`${styles.avatar} ${isLogo ? styles.avatarLogo : ""}`}
                        onError={(e) => {
                            e.currentTarget.src = USER_PLACEHOLDER;
                            e.currentTarget.classList.add(styles.avatarLogo);
                        }}
                    />
                ) : (
                    <div className={styles.avatarInitial}>
                        {(displayName || "U").charAt(0).toUpperCase()}
                    </div>
                )}
                <div className={styles.identityText}>
                    <h2 className={styles.userName}>{displayName}</h2>
                    {hasDualRoles ? (
                        <select
                            className={styles.roleSelect}
                            value={activeRole}
                            onChange={handleRoleChange}
                            aria-label="Switch active role"
                        >
                            <option value="agent">Agent</option>
                            <option value="builder">Builder</option>
                        </select>
                    ) : (
                        <p className={styles.userRole}>
                            <span className={styles.roleDot} aria-hidden="true" />
                            {displayRoleLabel}
                        </p>
                    )}
                    {displayEmail && <p className={styles.userEmail}>{displayEmail}</p>}
                </div>
            </div>

            {/* Profile Completion Widget */}
            <div className={styles.completionCard}>
                <div className={styles.completionHeader}>
                    <span className={styles.completionTitle}>Profile Completion</span>
                    <span className={styles.completionPercent}>{completionPercent}% Complete</span>
                </div>
                <div className={styles.progressBarBg}>
                    <div
                        className={styles.progressBarFill}
                        style={{ width: `${Math.min(100, Math.max(5, completionPercent))}%` }}
                    />
                </div>
                <div className={styles.completionFooter}>
                    <span>{completion?.completed_count ?? 10} of {completion?.total_count ?? 13} details added</span>
                    <Link href="/profile/personal-details/edit" className={styles.completionLink}>
                        Edit
                    </Link>
                </div>
            </div>

            <nav className={styles.sideNav} aria-label="Profile sections">
                {navSections.map((section) => (
                    <div key={section.id} className={section.title ? styles.navSection : styles.navGroup}>
                        {section.title && (
                            <span className={styles.navSectionTitle}>
                                {section.title}
                                <span className={styles.navSectionBadge}>Verified</span>
                            </span>
                        )}
                        {section.items.map(({ id, label, Icon, href, highlight, newTab }) => {
                            const active = isNavItemActive(href, pathname || "");
                            return (
                                <Link
                                    key={id}
                                    href={href}
                                    {...(newTab ? { target: "_blank", rel: "noopener noreferrer", title: `${label} (opens in a new tab)` } : {})}
                                    className={`${styles.navItem} ${highlight ? styles.navItemHighlight : ""} ${active ? styles.navItemActive : ""}`}
                                    aria-current={active ? "page" : undefined}
                                >
                                    <Icon aria-hidden="true" />
                                    <span>{label}</span>
                                    {newTab && <RiExternalLinkLine className={styles.navExternal} aria-hidden="true" />}
                                    {id === "enquiries" && unreadEnquiries > 0 && (
                                        <span className={styles.navBadge} aria-label={`${unreadEnquiries} unread`}>
                                            {unreadEnquiries > 99 ? "99+" : unreadEnquiries}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </aside>
    );
}
