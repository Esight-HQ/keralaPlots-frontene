"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../componants/nav/nav";
import styles from "./registerAgent.module.css";
import Footer from "../componants/footer/footer";
import {
    EXPERIENCE_OPTIONS,
    DESIGNATION_OPTIONS,
    WORKING_HOURS_OPTIONS,
    COUNT_OPTIONS,
    YEARS_OPTIONS,
    BIO_MAX,
} from "../profile/profileData";
import { saveProfile } from "../lib/profileStore";
import { setAgentStatus } from "../lib/agentStatusStore";
import { useAuth } from "../context/AuthContext";
import { agentApi } from "../lib/api";
import dynamic from "next/dynamic";
import {
    RiArrowLeftLine,
    RiUserLine,
    RiMapPin2Line,
    RiPhoneLine,
    RiStarLine,
    RiLinksLine,
    RiCameraLine,
    RiCropLine,
    RiDeleteBinLine,
    RiTimeLine,
    RiMailLine,
    RiGlobalLine,
    RiFacebookFill,
    RiInstagramLine,
    RiLinkedinFill,
    RiArrowDownSLine,
    RiErrorWarningLine,
    RiCloseLine,
    RiNotification3Line,
} from "react-icons/ri";

// Crop dialog only opens after a photo is picked — load it as its own chunk.
const ProfileCropModal = dynamic(() => import("../profile/ProfileCropModal"), { ssr: false });

/* ─── Submitted artwork ─── */
function SubmittedArt() {
    return (
        <svg className={styles.successArt} viewBox="0 0 320 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M92 44c30-30 92-30 122-4s30 78 6 106-80 40-114 16S62 74 92 44Z" fill="#e8f7ee" />
            <g fill="#a5dfbd">
                <path d="M0-7c1 3.9 2.1 5 6 6-3.9 1-5 2.1-6 6-1-3.9-2.1-5-6-6 3.9-1 5-2.1 6-6Z" transform="translate(104 56)" />
                <path d="M0-7c1 3.9 2.1 5 6 6-3.9 1-5 2.1-6 6-1-3.9-2.1-5-6-6 3.9-1 5-2.1 6-6Z" transform="translate(216 52) scale(0.8)" />
                <path d="M0-7c1 3.9 2.1 5 6 6-3.9 1-5 2.1-6 6-1-3.9-2.1-5-6-6 3.9-1 5-2.1 6-6Z" transform="translate(98 122) scale(0.75)" />
                <path d="M0-7c1 3.9 2.1 5 6 6-3.9 1-5 2.1-6 6-1-3.9-2.1-5-6-6 3.9-1 5-2.1 6-6Z" transform="translate(226 128) scale(0.7)" />
            </g>
            <path d="M116 52a7 7 0 0 1 7-7h56l30 30v92a7 7 0 0 1-7 7h-79a7 7 0 0 1-7-7Z" fill="#f7f9fe" stroke="#d9e1f4" strokeWidth="2.5" />
            <path d="M179 45l30 30h-23a7 7 0 0 1-7-7Z" fill="#e3e9f8" />
            <g fill="#dde4f4">
                <rect x="132" y="84" width="42" height="7" rx="3.5" />
                <rect x="132" y="100" width="58" height="7" rx="3.5" />
                <rect x="132" y="116" width="30" height="7" rx="3.5" />
            </g>
            <circle cx="163" cy="140" r="34" fill="#22a45d" />
            <path d="M148 140.5l10.5 10.5L179 130" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M206 178c22 4 38-4 44-20s2-30-8-34" fill="none" stroke="#a5dfbd" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="4 8" />
            <path d="M276 76 224 106l26 4Z" fill="#8fd4ab" />
            <path d="M276 76 250 110l-4 20Z" fill="#3fa96b" />
            <path d="M250 110l-4 20-11-13Z" fill="#63bd8a" />
        </svg>
    );
}

/* ─── Field types ─── */
const REQUIRED = [
    { key: "photo", label: "Profile Photo" },
    { key: "name", label: "Full Name" },
    { key: "experience", label: "Years of Experience" },
    { key: "title", label: "Designation / Role" },
    { key: "intro", label: "Short Bio" },
    { key: "office", label: "Office Location" },
    { key: "hours", label: "Working Hours" },
    { key: "phone", label: "Phone Number" },
    { key: "email", label: "Email Address" },
    { key: "soldCount", label: "Properties Sold" },
    { key: "clientsCount", label: "Happy Clients" },
    { key: "yearsCount", label: "Years of Experience" },
];

const EMPTY = {
    photo: "", name: "", experience: "", title: "", intro: "",
    office: "", hours: "", phone: "", email: "",
    soldCount: "", clientsCount: "", yearsCount: "",
    website: "", facebook: "", instagram: "", linkedin: "",
};

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

const SOCIALS = [
    { key: "website", label: "Website", Icon: RiGlobalLine, placeholder: "https://yourwebsite.com" },
    { key: "facebook", label: "Facebook", Icon: RiFacebookFill, placeholder: "https://facebook.com/yourprofile" },
    { key: "instagram", label: "Instagram", Icon: RiInstagramLine, placeholder: "https://instagram.com/yourprofile" },
    { key: "linkedin", label: "LinkedIn", Icon: RiLinkedinFill, placeholder: "https://linkedin.com/in/yourprofile" },
];

/* ─── Sub-components ─── */
function Field({ label, required, className = "", children, hint }) {
    return (
        <label className={`${styles.field} ${className}`}>
            <span className={styles.label}>
                {label}
                {required && <em className={styles.req} aria-hidden="true">*</em>}
            </span>
            {children}
            {hint}
        </label>
    );
}

function SelectField({ value, onChange, options, placeholder, invalid, Icon }) {
    return (
        <span className={`${styles.selectWrap} ${Icon ? styles.hasIcon : ""}`}>
            {Icon && <Icon className={styles.fieldIcon} aria-hidden="true" />}
            <select
                className={`${styles.select} ${invalid ? styles.inputInvalid : ""}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <RiArrowDownSLine className={styles.selectChevron} aria-hidden="true" />
        </span>
    );
}

function SectionHead({ Icon, title, desc }) {
    return (
        <div className={styles.sectionHead}>
            <span className={styles.sectionIcon}><Icon aria-hidden="true" /></span>
            <div>
                <h2 className={styles.sectionTitle}>{title}</h2>
                <p className={styles.sectionDesc}>{desc}</p>
            </div>
        </div>
    );
}

/* ─── Main Page ─── */
export default function RegisterAgentPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading, user } = useAuth();

    const [draft, setDraft] = useState(EMPTY);
    const [showErrors, setShowErrors] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [apiError, setApiError] = useState("");
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [rawFileName, setRawFileName] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const photoInputRef = useRef(null);

    /* Auth gate */
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login?redirect=/register-agent");
        }
    }, [authLoading, isAuthenticated, router]);

    /* Pre-fill from existing application */
    useEffect(() => {
        if (!isAuthenticated) return;
        const load = async () => {
            try {
                const res = await agentApi.myStatus();
                if (res?.has_applied && res?.agent) {
                    const a = res.agent;
                    setDraft({
                        photo: a.photo || "",
                        name: a.name || user?.name || "",
                        experience: a.experience || "",
                        title: a.designation || "",
                        intro: a.short_bio || a.about || "",
                        office: a.office_location || a.place || "",
                        hours: a.working_hours || "",
                        phone: a.phone || user?.mobile || "",
                        email: a.email || user?.email || "",
                        soldCount: a.properties_sold || "",
                        clientsCount: a.happy_clients || "",
                        yearsCount: a.experience_years ? `${a.experience_years}+` : "",
                        website: a.website || "",
                        facebook: a.facebook || "",
                        instagram: a.instagram || "",
                        linkedin: a.linkedin || "",
                    });
                } else if (user) {
                    setDraft((prev) => ({
                        ...prev,
                        name: prev.name || user.name || "",
                        phone: prev.phone || user.mobile || "",
                        email: prev.email || user.email || "",
                    }));
                }
            } catch (err) {
                console.error("Failed to load agent status:", err);
            }
        };
        load();
    }, [isAuthenticated, user]);

    const finish = () => router.push("/agent");

    useEffect(() => {
        if (!submitted) return;
        const onKey = (e) => { if (e.key === "Escape") finish(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [submitted]);

    const setField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
        setApiError("");
    };

    const missing = REQUIRED.filter(({ key }) => String(draft[key] ?? "").trim().length === 0);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
    const phoneOk = /^[6-9]\d{9}$/.test(draft.phone.replace(/[\s-]/g, "").replace(/^\+?91/, ""));
    const badLinks = SOCIALS.filter(({ key }) => {
        const v = draft[key].trim();
        return v.length > 0 && !/^https?:\/\/.+\..+/.test(v);
    });

    const isInvalid = (key) => showErrors && String(draft[key] ?? "").trim().length === 0;

    /* Photo pick and crop handlers */
    const processPhotoFile = (file) => {
        if (!file) return;
        if (!PHOTO_TYPES.includes(file.type)) {
            setPhotoError("Choose a JPG, PNG or WEBP image.");
            return;
        }
        if (file.size > PHOTO_MAX_BYTES) {
            setPhotoError("That image is over 10MB. Pick a smaller one.");
            return;
        }
        setRawFileName(file.name || "profile-photo.jpg");
        const reader = new FileReader();
        reader.onload = () => {
            setPhotoError("");
            setImageToCrop(String(reader.result));
            setCropModalOpen(true);
        };
        reader.onerror = () => {
            setPhotoError("That image couldn't be read. Try another.");
        };
        reader.readAsDataURL(file);
    };

    const pickPhoto = (event) => {
        const file = event.target.files?.[0];
        if (event.target) event.target.value = "";
        processPhotoFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        processPhotoFile(file);
    };

    const handleCropApply = ({ file, dataUrl }) => {
        setSelectedFile(file);
        setField("photo", dataUrl);
        setCropModalOpen(false);
        setImageToCrop(null);
        setPhotoError("");
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const handleCropClose = () => {
        setCropModalOpen(false);
        setImageToCrop(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const handleOpenCropCurrent = () => {
        if (!draft.photo) return;
        setImageToCrop(draft.photo);
        setRawFileName("profile-photo.jpg");
        setCropModalOpen(true);
    };

    const handleRemovePhoto = (e) => {
        e?.stopPropagation();
        setField("photo", "");
        setSelectedFile(null);
        setImageToCrop(null);
        setPhotoError("");
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const errorMessage = () => {
        if (missing.length > 0) return `Please fill in: ${[...new Set(missing.map((m) => m.label))].join(", ")}.`;
        if (!phoneOk) return "Enter a valid 10-digit Indian mobile number.";
        if (!emailOk) return "Please enter a valid email address.";
        if (badLinks.length > 0) return `These links need http:// or https://: ${badLinks.map((l) => l.label).join(", ")}.`;
        return "";
    };

    const submit = async (event) => {
        event.preventDefault();
        if (submitted || submitting) return;

        if (missing.length > 0 || !phoneOk || !emailOk || badLinks.length > 0) {
            setShowErrors(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        setSubmitting(true);
        setApiError("");

        try {
            const payload = {
                name: draft.name.trim(),
                experience: draft.experience.trim(),
                title: draft.title.trim(),
                intro: draft.intro.trim(),
                office: draft.office.trim(),
                hours: draft.hours.trim(),
                phone: draft.phone.trim(),
                email: draft.email.trim(),
                soldCount: draft.soldCount.trim(),
                clientsCount: draft.clientsCount.trim(),
                yearsCount: draft.yearsCount.trim(),
                photo: draft.photo,
                website: draft.website.trim(),
                facebook: draft.facebook.trim(),
                instagram: draft.instagram.trim(),
                linkedin: draft.linkedin.trim(),
            };

            const res = await agentApi.register(payload);

            if (res.success) {
                saveProfile({
                    name: draft.name.trim(),
                    title: draft.title.trim(),
                    intro: draft.intro.trim(),
                    about: draft.intro.trim(),
                    photo: draft.photo,
                    location: draft.office.trim(),
                    soldCount: draft.soldCount,
                    clientsCount: draft.clientsCount,
                    yearsCount: draft.yearsCount,
                    phone: draft.phone.trim(),
                    email: draft.email.trim(),
                    office: draft.office.trim(),
                    hours: draft.hours,
                    socials: { website: draft.website.trim(), facebook: draft.facebook.trim(), instagram: draft.instagram.trim(), linkedin: draft.linkedin.trim() },
                });
                setAgentStatus("pending");
                setSubmitted(true);
            } else {
                setApiError(res.message || "Failed to submit application.");
            }
        } catch (err) {
            setApiError(err?.response?.data?.message || err?.message || "An error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const summary = showErrors ? errorMessage() : apiError;

    return (
        <>
            <Nav />
            <div className={styles.page}>
                <div className={styles.wrap}>

                    {/* Header */}
                    <header className={styles.head}>
                        <Link href="/agent" className={styles.backLink}>
                            <RiArrowLeftLine aria-hidden="true" />
                            <span>Back to Agents</span>
                        </Link>
                        <h1 className={styles.title}>Register as Agent</h1>
                        <p className={styles.sub}>
                            Fill in your personal and professional details to create your verified agent profile.
                        </p>
                    </header>

                    <form onSubmit={submit} noValidate>
                        {/* Error summary */}
                        {summary && (
                            <div className={styles.errorSummary} role="alert">
                                <RiErrorWarningLine aria-hidden="true" />
                                <span>{summary}</span>
                            </div>
                        )}

                        {/* ── BASIC INFO ── */}
                        <section className={styles.section}>
                            <SectionHead Icon={RiUserLine} title="Basic Information" desc="Add your basic profile details." />

                            <div className={styles.basicGrid}>
                                {/* Photo column */}
                                <div className={styles.photoCol}>
                                    <label className={styles.label}>
                                        Profile Photo <em className={styles.req} aria-hidden="true">*</em>
                                    </label>
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className={styles.fileInput}
                                        onChange={pickPhoto}
                                    />
                                    <div
                                        className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ""} ${isInvalid("photo") ? styles.dropzoneInvalid : ""}`}
                                        onClick={() => {
                                            if (!draft.photo) {
                                                photoInputRef.current?.click();
                                            }
                                        }}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                if (!draft.photo) {
                                                    photoInputRef.current?.click();
                                                }
                                            }
                                        }}
                                    >
                                        {draft.photo ? (
                                            <div className={styles.photoPreviewWrap}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={draft.photo} alt="Preview" className={styles.photoPreview} />
                                                <div className={styles.photoActionsOverlay}>
                                                    <button
                                                        type="button"
                                                        className={styles.photoActionBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenCropCurrent();
                                                        }}
                                                        title="Crop or adjust position"
                                                    >
                                                        <RiCropLine aria-hidden="true" />
                                                        <span>Crop / Adjust</span>
                                                    </button>
                                                    <span className={styles.photoActionDivider} aria-hidden="true" />
                                                    <button
                                                        type="button"
                                                        className={styles.photoActionBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            photoInputRef.current?.click();
                                                        }}
                                                        title="Change photo"
                                                    >
                                                        <RiCameraLine aria-hidden="true" />
                                                        <span>Change</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <span className={styles.dropzoneIcon}><RiCameraLine aria-hidden="true" /></span>
                                                <span className={styles.dropzoneTitle}>Upload Photo</span>
                                                <span className={styles.dropzoneHint}>JPG, PNG or WEBP · Max 10 MB</span>
                                            </>
                                        )}
                                    </div>
                                    {draft.photo && (
                                        <div className={styles.photoColFooter}>
                                            <button
                                                type="button"
                                                className={styles.photoRemove}
                                                onClick={handleRemovePhoto}
                                            >
                                                <RiDeleteBinLine aria-hidden="true" /> Remove Photo
                                            </button>
                                            {/* <button
                                                type="button"
                                                className={styles.reCropLink}
                                                onClick={handleOpenCropCurrent}
                                            >
                                                <RiCropLine aria-hidden="true" /> Recrop
                                            </button> */}
                                        </div>
                                    )}
                                    {photoError && <p className={styles.fieldError}>{photoError}</p>}
                                </div>

                                {/* Fields column */}
                                <div className={styles.basicFields}>
                                    <div className={styles.grid2}>
                                        <Field label="Full Name" required>
                                            <input
                                                type="text"
                                                className={`${styles.input} ${isInvalid("name") ? styles.inputInvalid : ""}`}
                                                value={draft.name}
                                                onChange={(e) => setField("name", e.target.value)}
                                                placeholder="e.g., Wise Varsha"
                                            />
                                        </Field>
                                        <Field label="Years of Experience" required>
                                            <SelectField
                                                value={draft.experience}
                                                onChange={(v) => setField("experience", v)}
                                                options={EXPERIENCE_OPTIONS}
                                                placeholder="e.g., 8+ Years Experience"
                                                invalid={isInvalid("experience")}
                                            />
                                        </Field>
                                    </div>

                                    <Field label="Designation / Role" required>
                                        <SelectField
                                            value={draft.title}
                                            onChange={(v) => setField("title", v)}
                                            options={DESIGNATION_OPTIONS}
                                            placeholder="e.g., Villa & Luxury Property Specialist"
                                            invalid={isInvalid("title")}
                                        />
                                    </Field>

                                    <Field
                                        label="Short Bio"
                                        required
                                        hint={<span className={styles.counter}>{draft.intro.length}/{BIO_MAX}</span>}
                                    >
                                        <textarea
                                            className={`${styles.textarea} ${isInvalid("intro") ? styles.inputInvalid : ""}`}
                                            value={draft.intro}
                                            maxLength={BIO_MAX}
                                            rows={4}
                                            onChange={(e) => setField("intro", e.target.value)}
                                            placeholder="Write a short description about yourself and your expertise..."
                                        />
                                    </Field>
                                </div>
                            </div>
                        </section>

                        {/* ── LOCATION & OFFICE ── */}
                        <section className={styles.section}>
                            <SectionHead Icon={RiMapPin2Line} title="Location &amp; Office Details" desc="Add your location and office information." />
                            <div className={styles.grid2}>
                                <Field label="Office Location" required>
                                    <span className={styles.inputWrap}>
                                        <RiMapPin2Line className={styles.fieldIcon} aria-hidden="true" />
                                        <input
                                            type="text"
                                            className={`${styles.input} ${styles.inputWithIcon} ${isInvalid("office") ? styles.inputInvalid : ""}`}
                                            value={draft.office}
                                            onChange={(e) => setField("office", e.target.value)}
                                            placeholder="e.g., Kochi, Kerala"
                                        />
                                    </span>
                                </Field>
                                <Field label="Working Hours" required>
                                    <SelectField
                                        value={draft.hours}
                                        onChange={(v) => setField("hours", v)}
                                        options={WORKING_HOURS_OPTIONS}
                                        placeholder="e.g., Mon - Sat: 9:00 AM - 7:00 PM"
                                        invalid={isInvalid("hours")}
                                        Icon={RiTimeLine}
                                    />
                                </Field>
                            </div>
                        </section>

                        {/* ── CONTACT ── */}
                        <section className={styles.section}>
                            <SectionHead Icon={RiPhoneLine} title="Contact Information" desc="Add your contact and email details." />
                            <div className={styles.grid2}>
                                <Field label="Phone Number" required>
                                    <span className={styles.inputWrap}>
                                        <RiPhoneLine className={styles.fieldIcon} aria-hidden="true" />
                                        <input
                                            type="tel"
                                            className={`${styles.input} ${styles.inputWithIcon} ${showErrors && !phoneOk ? styles.inputInvalid : ""}`}
                                            value={draft.phone}
                                            onChange={(e) => setField("phone", e.target.value)}
                                            placeholder="e.g., +91 9847 654 321"
                                        />
                                    </span>
                                </Field>
                                <Field label="Email Address" required>
                                    <span className={styles.inputWrap}>
                                        <RiMailLine className={styles.fieldIcon} aria-hidden="true" />
                                        <input
                                            type="email"
                                            className={`${styles.input} ${styles.inputWithIcon} ${showErrors && !emailOk ? styles.inputInvalid : ""}`}
                                            value={draft.email}
                                            onChange={(e) => setField("email", e.target.value)}
                                            placeholder="e.g., wise.varsha@keralaplots.com"
                                        />
                                    </span>
                                </Field>
                            </div>
                        </section>

                        {/* ── HIGHLIGHTS ── */}
                        <section className={styles.section}>
                            <SectionHead Icon={RiStarLine} title="Professional Highlights" desc="Add key highlights about your professional achievements." />
                            <div className={styles.grid3}>
                                <Field label="Properties Sold" required>
                                    <SelectField value={draft.soldCount} onChange={(v) => setField("soldCount", v)} options={COUNT_OPTIONS} placeholder="e.g., 120+" invalid={isInvalid("soldCount")} />
                                </Field>
                                <Field label="Happy Clients" required>
                                    <SelectField value={draft.clientsCount} onChange={(v) => setField("clientsCount", v)} options={COUNT_OPTIONS} placeholder="e.g., 95+" invalid={isInvalid("clientsCount")} />
                                </Field>
                                <Field label="Years of Experience" required>
                                    <SelectField value={draft.yearsCount} onChange={(v) => setField("yearsCount", v)} options={YEARS_OPTIONS} placeholder="e.g., 8+" invalid={isInvalid("yearsCount")} />
                                </Field>
                            </div>
                        </section>

                        {/* ── SOCIAL ── */}
                        <section className={styles.section}>
                            <SectionHead Icon={RiLinksLine} title="Social Media (Optional)" desc="Add your social media profiles to help clients know more about you." />
                            <div className={styles.grid3}>
                                {SOCIALS.map(({ key, label, Icon, placeholder }) => (
                                    <Field key={key} label={label}>
                                        <span className={styles.inputWrap}>
                                            <Icon className={styles.fieldIcon} aria-hidden="true" />
                                            <input
                                                type="url"
                                                className={`${styles.input} ${styles.inputWithIcon} ${showErrors && badLinks.some((l) => l.key === key) ? styles.inputInvalid : ""}`}
                                                value={draft[key]}
                                                onChange={(e) => setField(key, e.target.value)}
                                                placeholder={placeholder}
                                            />
                                        </span>
                                    </Field>
                                ))}
                            </div>
                        </section>

                        {/* ── ACTIONS ── */}
                        <div className={styles.actions}>
                            <button type="button" className={styles.cancelBtn} onClick={() => router.push("/agent")}>Cancel</button>
                            <button type="submit" className={styles.submitBtn} disabled={submitting}>
                                {submitting ? "Submitting…" : "Submit & Create Profile"}
                            </button>
                        </div>

                        <p className={styles.legal}>
                            By submitting, you agree to our <Link href="/terms-condition">Terms &amp; Conditions</Link> and{" "}
                            <Link href="/privacy-policy">Privacy Policy</Link>.
                        </p>
                    </form>
                </div>
            </div>

            {/* ── SUBMITTED OVERLAY ── */}
            {submitted && (
                <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="registration-submitted" onClick={finish}>
                    <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={styles.dialogClose} onClick={finish} aria-label="Close">
                            <RiCloseLine />
                        </button>
                        <SubmittedArt />
                        <h2 id="registration-submitted" className={styles.successTitle}>Registration Submitted!</h2>
                        <span className={styles.successRule} aria-hidden="true" />
                        <p className={styles.successBody}>
                            Thank you for applying to join our agent network. Your application is now pending admin approval.
                            You will receive a notification once reviewed and approved.
                        </p>
                        <div className={styles.successNote}>
                            <span className={styles.successNoteIcon}><RiNotification3Line aria-hidden="true" /></span>
                            <span>Your profile will be listed in the agent directory once approved by the administrator.</span>
                        </div>
                        <button type="button" className={styles.successBtn} onClick={finish} autoFocus>
                            View Agent Directory
                        </button>
                    </div>
                </div>
            )}

            {/* ── PROFILE CROP MODAL ── */}
            <ProfileCropModal
                isOpen={cropModalOpen}
                imageSrc={imageToCrop}
                originalFileName={rawFileName}
                onClose={handleCropClose}
                onApply={handleCropApply}
            />

            <Footer />
        </>
    );
}
