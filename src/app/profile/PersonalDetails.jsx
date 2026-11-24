"use client";

import styles from "./personalDetails.module.css";
import { statsFor, experienceLabel, soldLabel } from "./profileData";
import {
    RiPencilLine,
    RiStarLine,
    RiGlobalLine,
    RiFacebookFill,
    RiInstagramLine,
    RiLinkedinFill,
    RiMapPin2Line,
    RiBriefcaseLine,
    RiBuildingLine,
    RiPhoneLine,
    RiMailLine,
    RiHome5Line,
    RiUserLine,
    RiAwardLine,
    RiChat3Line,
    RiCheckLine,
    RiCommunityLine,
} from "react-icons/ri";

const SOCIALS = [
    { key: "website", Icon: RiGlobalLine, label: "Website" },
    { key: "facebook", Icon: RiFacebookFill, label: "Facebook" },
    { key: "instagram", Icon: RiInstagramLine, label: "Instagram" },
    { key: "linkedin", Icon: RiLinkedinFill, label: "LinkedIn" },
];

const STAT_ICONS = {
    sold: RiHome5Line,
    clients: RiUserLine,
    years: RiAwardLine,
    reviews: RiChat3Line,
};

const USER_PLACEHOLDER = "/user-placeholder.jpg";
const OLD_STOCK_AVATAR = "images.unsplash.com/photo-1573496359142-b8d87734a5a2";

export default function PersonalDetails({ profile, savedNote, onEdit, onViewReviews }) {
    const rawName = profile?.name || profile?.fullname || "User";
    const firstName = rawName.trim().split(" ")[0] || rawName;

    const details = profile?.personal_details || profile || {};
    const socials = details.socials || {
        website: details.website || "",
        facebook: details.facebook || "",
        instagram: details.instagram || "",
        linkedin: details.linkedin || "",
    };

    const candidatePhoto = profile?.avatar || details?.Image || details?.photo;
    const photoUrl = candidatePhoto && !String(candidatePhoto).includes(OLD_STOCK_AVATAR) && !String(candidatePhoto).includes("ff7c6dab-0418-4d39-7586-932e36dae300")
        ? candidatePhoto
        : USER_PLACEHOLDER;
    const isLogo = !photoUrl || photoUrl === USER_PLACEHOLDER || String(photoUrl).includes("user-placeholder");

    const rawRole = String(profile?.role || details?.occupation || details?.title || "").toLowerCase();
    const title = rawRole === "agent" ? "Agent" : (rawRole === "builder" || !details?.occupation ? "User" : (details?.occupation || "User"));
    const bio = details.bio || details.intro || details.about || "Passionate real estate enthusiast based in Kerala.";
    const location = [details.city || details.town, details.district, details.state || "Kerala"].filter(Boolean).join(", ") || details.office || "Kerala, India";
    const phone = details.mobile || profile.phone || "+91 98765 43210";
    const email = details.email || profile.email || "user@keralaplots.com";
    const address = details.address || "Kochi, Kerala";

    const contactFields = [
        { key: "phone", Icon: RiPhoneLine, label: "Phone", value: phone },
        { key: "email", Icon: RiMailLine, label: "Email", value: email },
        { key: "location", Icon: RiMapPin2Line, label: "City / District", value: location },
        { key: "address", Icon: RiCommunityLine, label: "Address", value: address },
    ];

    return (
        <div className={styles.wrap}>
            <header className={styles.head}>
                <div>
                    <h1 className={styles.title}>Personal Details</h1>
                    <p className={styles.sub}>Manage your profile information that will be visible to clients and agents.</p>
                </div>

                <button type="button" className={styles.editBtn} onClick={onEdit}>
                    <RiPencilLine aria-hidden="true" />
                    Edit Profile
                </button>
            </header>

            {savedNote && (
                <p className={styles.savedNote} role="status">
                    <RiCheckLine aria-hidden="true" />
                    {savedNote}
                </p>
            )}

            {/* ==================== PROFILE CARD ==================== */}
            <section className={styles.card}>
                <div className={styles.identityCol}>
                    <div className={styles.photoWrap}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photoUrl}
                            alt={rawName}
                            className={`${styles.photo} ${isLogo ? styles.photoLogo : ""}`}
                            onError={(e) => {
                                e.currentTarget.src = USER_PLACEHOLDER;
                                e.currentTarget.classList.add(styles.photoLogo);
                            }}
                        />
                    </div>

                    <div className={styles.socialRow}>
                        {SOCIALS.map(({ key, Icon, label }) => {
                            const url = socials[key];
                            if (!url) return null;
                            return (
                                <a
                                    key={key}
                                    href={url.startsWith("http") ? url : `https://${url}`}
                                    className={styles.socialBtn}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`${rawName} on ${label}`}
                                    title={label}
                                >
                                    <Icon aria-hidden="true" />
                                </a>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.identityBody}>
                    <div className={styles.nameRow}>
                        <h2 className={styles.name}>{rawName}</h2>

                        {onViewReviews && (
                            <button type="button" className={styles.reviewsBtn} onClick={onViewReviews}>
                                <RiStarLine aria-hidden="true" />
                                View Reviews
                            </button>
                        )}
                    </div>

                    <p className={styles.role}>{title}</p>
                    <p className={styles.intro}>{bio}</p>

                    <ul className={styles.metaRow}>
                        <li><RiMapPin2Line aria-hidden="true" />{location}</li>
                        <li><RiBriefcaseLine aria-hidden="true" />{details.experience || experienceLabel(profile)}</li>
                        <li><RiBuildingLine aria-hidden="true" />{soldLabel(profile)}</li>
                    </ul>
                </div>
            </section>

            {/* ==================== CONTACT STRIP ==================== */}
            <section className={`${styles.card} ${styles.contactCard}`}>
                {contactFields.map(({ key, Icon, label, value }) => (
                    <div key={key} className={styles.contactItem}>
                        <span className={styles.contactIcon}>
                            <Icon aria-hidden="true" />
                        </span>
                        <div className={styles.contactBody}>
                            <span className={styles.contactLabel}>{label}</span>
                            <span className={styles.contactValue}>{value}</span>
                        </div>
                    </div>
                ))}
            </section>

            {/* ==================== ABOUT ==================== */}
            <section className={styles.card}>
                <h3 className={styles.blockTitle}>About {firstName}</h3>
                <p className={styles.aboutText}>{details.about || bio}</p>

                <ul className={styles.statRow}>
                    {statsFor(profile).map(({ id, value, label }) => {
                        const Icon = STAT_ICONS[id];
                        return (
                            <li key={id} className={styles.statItem}>
                                <span className={styles.statIcon}>
                                    <Icon aria-hidden="true" />
                                </span>
                                <span>
                                    <span className={styles.statValue}>{value}</span>
                                    <span className={styles.statLabel}>{label}</span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
}
