"use client";

import { useState, useRef } from "react";
import styles from "./editPersonalDetails.module.css";
import {
    DESIGNATION_OPTIONS,
    COUNT_OPTIONS,
    YEARS_OPTIONS,
    BIO_MAX,
} from "./profileData";
import {
    RiArrowLeftLine,
    RiCheckLine,
    RiUserLine,
    RiMapPin2Line,
    RiPhoneLine,
    RiStarLine,
    RiLinksLine,
    RiPencilLine,
    RiMailLine,
    RiGlobalLine,
    RiFacebookFill,
    RiInstagramLine,
    RiLinkedinFill,
    RiArrowDownSLine,
    RiErrorWarningLine,
    RiLoader4Line,
    RiCalendarLine,
    RiCommunityLine,
} from "react-icons/ri";
import dynamic from "next/dynamic";

// Crop dialog only opens after a photo is picked — load it as its own chunk.
const ProfileCropModal = dynamic(() => import("./ProfileCropModal"), { ssr: false });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const DISTRICT_OPTIONS = [
    "Alappuzha",
    "Ernakulam",
    "Idukki",
    "Kannur",
    "Kasaragod",
    "Kollam",
    "Kottayam",
    "Kozhikode",
    "Malappuram",
    "Palakkad",
    "Pathanamthitta",
    "Thiruvananthapuram",
    "Thrissur",
    "Wayanad",
];

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

function Field({ label, required, children, hint }) {
    return (
        <label className={styles.field}>
            <span className={styles.label}>
                {label}
                {required && <em className={styles.req} aria-hidden="true">*</em>}
            </span>
            {children}
            {hint}
        </label>
    );
}

function Select({ value, onChange, options, invalid, placeholder = "Select…" }) {
    return (
        <span className={styles.selectWrap}>
            <select
                className={`${styles.select} ${invalid ? styles.inputInvalid : ""}`}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
            <RiArrowDownSLine className={styles.selectChevron} aria-hidden="true" />
        </span>
    );
}

function SectionHead({ Icon, title, desc, children }) {
    return (
        <div className={styles.sectionSide}>
            <div className={styles.sectionSideCol1}>
                <span className={styles.sectionIcon}>
                    <Icon aria-hidden="true" />
                </span>
            </div>
            <div className={styles.sectionSideCol2}>
                <h2 className={styles.sectionTitle}>{title}</h2>
                <p className={styles.sectionDesc}>{desc}</p>
                {children}
            </div>
        </div>
    );
}

export default function EditPersonalDetails({ profile, onBack, onSave, saving = false }) {
    const details = profile?.personal_details || profile || {};
    const socials = details?.socials || {
        website: details?.website || "",
        facebook: details?.facebook || "",
        instagram: details?.instagram || "",
        linkedin: details?.linkedin || "",
    };

    const initialName = profile?.name || details?.fullname || "User";
    const initialPhoto = realAvatar(profile?.avatar || details?.Image || details?.photo);

    const [draft, setDraft] = useState(() => ({
        fullname: initialName,
        photo: initialPhoto,
        gender: details?.gender || "",
        dob: details?.dob || "",
        bio: details?.bio || details?.intro || details?.about || "",
        occupation: details?.occupation || details?.title || "Real Estate Consultant",
        experience: details?.experience || details?.yearsExperienceLabel || `${profile?.yearsCount || details?.years_experience || 8} Years Experience`,
        address: details?.address || "",
        district: details?.district || "Ernakulam",
        city: details?.city || details?.town || "Kochi",
        pincode: details?.pincode || "",
        phone: details?.mobile || profile?.phone || "",
        email: details?.email || profile?.email || "",
        soldCount: profile?.soldCount || details?.properties_sold || details?.soldCount || "50+",
        clientsCount: profile?.clientsCount || details?.happy_clients || details?.clientsCount || "100+",
        yearsCount: profile?.yearsCount || details?.years_experience || details?.yearsCount || "8+",
        socials: {
            website: socials.website || "",
            facebook: socials.facebook || "",
            instagram: socials.instagram || "",
            linkedin: socials.linkedin || "",
        },
    }));

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(initialPhoto);
    const [showErrors, setShowErrors] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [rawFileName, setRawFileName] = useState("");
    const photoInputRef = useRef(null);

    const setField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
        setErrorMessage("");
    };

    const setSocialField = (key, value) => {
        setDraft((prev) => ({
            ...prev,
            socials: { ...prev.socials, [key]: value },
        }));
    };

    const pickPhoto = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Size check: allow up to 10MB since crop will compress/resize
        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage("Profile photo must be less than 10MB.");
            setShowErrors(true);
            if (photoInputRef.current) photoInputRef.current.value = "";
            return;
        }

        // Type check
        if (!file.type.startsWith("image/")) {
            setErrorMessage("Please select a valid image file (JPG, PNG, WebP).");
            setShowErrors(true);
            if (photoInputRef.current) photoInputRef.current.value = "";
            return;
        }

        setRawFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(String(reader.result));
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropApply = ({ file, dataUrl }) => {
        setSelectedFile(file);
        setPreviewUrl(dataUrl);
        setField("photo", dataUrl);
        setCropModalOpen(false);
        setImageToCrop(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const handleCropClose = () => {
        setCropModalOpen(false);
        setImageToCrop(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const submit = async (event) => {
        event.preventDefault();
        setErrorMessage("");

        // Validation
        const nameValid = draft.fullname.trim().length >= 3;
        const emailValid = !draft.email || EMAIL_REGEX.test(draft.email.trim());
        const phoneClean = draft.phone.replace(/\D/g, "");
        const phoneValid = !phoneClean || phoneClean.length === 10;

        if (!nameValid) {
            setErrorMessage("Full Name must be at least 3 characters long.");
            setShowErrors(true);
            return;
        }

        if (draft.email && !emailValid) {
            setErrorMessage("Please enter a valid email address.");
            setShowErrors(true);
            return;
        }

        if (draft.phone && !phoneValid) {
            setErrorMessage("Please enter a valid 10-digit mobile number.");
            setShowErrors(true);
            return;
        }

        // Prepare payload (supports multipart FormData for file upload)
        let payload;
        if (selectedFile) {
            payload = new FormData();
            payload.append("photo", selectedFile);
            payload.append("fullname", draft.fullname.trim());
            payload.append("gender", draft.gender || "");
            payload.append("dob", draft.dob || "");
            payload.append("bio", draft.bio || "");
            payload.append("occupation", draft.occupation || "");
            payload.append("experience", draft.experience || "");
            payload.append("address", draft.address || "");
            payload.append("district", draft.district || "");
            payload.append("city", draft.city || "");
            payload.append("pincode", draft.pincode || "");
            payload.append("mobile", draft.phone ? draft.phone.replace(/\D/g, "") : "");
            payload.append("email", draft.email ? draft.email.trim() : "");
            payload.append("properties_sold", draft.soldCount || "");
            payload.append("happy_clients", draft.clientsCount || "");
            payload.append("years_experience", draft.yearsCount || "");
            payload.append("soldCount", draft.soldCount || "");
            payload.append("clientsCount", draft.clientsCount || "");
            payload.append("yearsCount", draft.yearsCount || "");
            payload.append("website", draft.socials.website || "");
            payload.append("facebook", draft.socials.facebook || "");
            payload.append("instagram", draft.socials.instagram || "");
            payload.append("linkedin", draft.socials.linkedin || "");
        } else {
            payload = {
                fullname: draft.fullname.trim(),
                photo: draft.photo,
                gender: draft.gender,
                dob: draft.dob,
                bio: draft.bio,
                occupation: draft.occupation,
                experience: draft.experience,
                address: draft.address,
                district: draft.district,
                city: draft.city,
                pincode: draft.pincode,
                mobile: draft.phone ? draft.phone.replace(/\D/g, "") : "",
                email: draft.email ? draft.email.trim() : "",
                website: draft.socials.website,
                facebook: draft.socials.facebook,
                instagram: draft.socials.instagram,
                linkedin: draft.socials.linkedin,
                properties_sold: draft.soldCount,
                happy_clients: draft.clientsCount,
                years_experience: draft.yearsCount,
                soldCount: draft.soldCount,
                clientsCount: draft.clientsCount,
                yearsCount: draft.yearsCount,
            };
        }

        onSave(payload, draft);
    };

    return (
        <form className={styles.wrap} onSubmit={submit} noValidate>
            {/* ==================== HEADER ==================== */}
            <header className={styles.head}>
                <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Back to personal details">
                    <RiArrowLeftLine />
                </button>

                <div className={styles.headText}>
                    <h1 className={styles.title}>Edit Personal Details</h1>
                    <p className={styles.sub}>Update your profile information. Changes will be saved and reflected across your dashboard.</p>
                </div>

                <button type="submit" className={styles.saveBtn} disabled={saving}>
                    {saving ? (
                        <>
                            <RiLoader4Line className={styles.spinner} />
                            Saving…
                        </>
                    ) : (
                        <>
                            <RiCheckLine aria-hidden="true" />
                            Save Changes
                        </>
                    )}
                </button>
            </header>

            {showErrors && errorMessage && (
                <p className={styles.errorSummary} role="alert">
                    <RiErrorWarningLine aria-hidden="true" />
                    <span>{errorMessage}</span>
                </p>
            )}

            {/* ==================== BASIC INFORMATION ==================== */}
            <section className={styles.section}>
                <SectionHead Icon={RiUserLine} title="Basic Information" desc="Add your basic profile details and avatar.">
                    <div className={styles.photoWrap}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt={draft.fullname}
                            className={`${styles.photo} ${(!previewUrl || previewUrl === USER_PLACEHOLDER || String(previewUrl).includes("user-placeholder")) ? styles.photoLogo : ""}`}
                            onError={(e) => {
                                e.currentTarget.src = USER_PLACEHOLDER;
                                e.currentTarget.classList.add(styles.photoLogo);
                            }}
                        />
                        <button
                            type="button"
                            className={styles.photoBtn}
                            onClick={() => photoInputRef.current?.click()}
                            aria-label="Change profile photo"
                            title="Upload new photo"
                        >
                            <RiPencilLine aria-hidden="true" />
                        </button>
                        {/* {previewUrl && previewUrl !== USER_PLACEHOLDER && !String(previewUrl).includes("user-placeholder") && (
                            <button
                                type="button"
                                className={styles.cropBtn}
                                onClick={() => {
                                    setImageToCrop(previewUrl);
                                    setRawFileName("profile-photo.jpg");
                                    setCropModalOpen(true);
                                }}
                                aria-label="Crop or adjust current photo"
                                title="Crop or adjust photo"
                            >
                                <RiCropLine aria-hidden="true" />
                            </button>
                        )} */}
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            className={styles.fileInput}
                            onChange={pickPhoto}
                            tabIndex={-1}
                        />
                    </div>
                </SectionHead>

                <div className={styles.sectionBody}>
                    <div className={styles.grid2}>
                        <Field label="Full Name" required>
                            <input
                                className={`${styles.input} ${showErrors && draft.fullname.trim().length < 3 ? styles.inputInvalid : ""}`}
                                value={draft.fullname}
                                onChange={(e) => setField("fullname", e.target.value)}
                                placeholder="Your full name"
                            />
                        </Field>

                        <Field label="Gender">
                            <Select
                                value={draft.gender}
                                onChange={(value) => setField("gender", value)}
                                options={GENDER_OPTIONS}
                                placeholder="Select Gender"
                            />
                        </Field>
                    </div>

                    <div className={styles.grid2}>
                        <Field label="Date of Birth">
                            <span className={styles.inputIconWrap}>
                                <RiCalendarLine className={styles.inputIcon} aria-hidden="true" />
                                <input
                                    className={`${styles.input} ${styles.inputWithIcon}`}
                                    type="date"
                                    value={draft.dob}
                                    onChange={(e) => setField("dob", e.target.value)}
                                />
                            </span>
                        </Field>

                        <Field label="Designation / Role">
                            <Select
                                value={draft.occupation}
                                onChange={(value) => setField("occupation", value)}
                                options={DESIGNATION_OPTIONS}
                            />
                        </Field>
                    </div>

                    <Field
                        label="Short Bio"
                        hint={
                            <span className={styles.counter}>
                                {(draft.bio || "").length}/{BIO_MAX}
                            </span>
                        }
                    >
                        <textarea
                            className={styles.textarea}
                            value={draft.bio}
                            maxLength={BIO_MAX}
                            onChange={(e) => setField("bio", e.target.value.slice(0, BIO_MAX))}
                            rows={4}
                            placeholder="Tell clients about your experience, focus areas, and real estate background"
                        />
                    </Field>
                </div>
            </section>

            {/* ==================== LOCATION ==================== */}
            <section className={styles.section}>
                <SectionHead
                    Icon={RiMapPin2Line}
                    title="Location Details"
                    desc="Add your address and district information."
                />

                <div className={styles.sectionBody}>
                    <div className={styles.grid2}>
                        <Field label="District">
                            <Select
                                value={draft.district}
                                onChange={(value) => setField("district", value)}
                                options={DISTRICT_OPTIONS}
                                placeholder="Select District"
                            />
                        </Field>

                        <Field label="City / Town">
                            <span className={styles.inputIconWrap}>
                                <RiMapPin2Line className={styles.inputIcon} aria-hidden="true" />
                                <input
                                    className={`${styles.input} ${styles.inputWithIcon}`}
                                    value={draft.city}
                                    onChange={(e) => setField("city", e.target.value)}
                                    placeholder="City (e.g. Kochi, Aluva)"
                                />
                            </span>
                        </Field>
                    </div>

                    <div className={styles.grid2}>
                        <Field label="Full Address">
                            <span className={styles.inputIconWrap}>
                                <RiCommunityLine className={styles.inputIcon} aria-hidden="true" />
                                <input
                                    className={`${styles.input} ${styles.inputWithIcon}`}
                                    value={draft.address}
                                    onChange={(e) => setField("address", e.target.value)}
                                    placeholder="House/Office, Street"
                                />
                            </span>
                        </Field>

                        <Field label="Pincode">
                            <input
                                className={styles.input}
                                value={draft.pincode}
                                maxLength={6}
                                onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="682001"
                            />
                        </Field>
                    </div>
                </div>
            </section>

            {/* ==================== CONTACT ==================== */}
            <section className={styles.section}>
                <SectionHead
                    Icon={RiPhoneLine}
                    title="Contact Information"
                    desc="Add your phone number and email address."
                />

                <div className={styles.sectionBody}>
                    <div className={styles.grid2}>
                        <Field label="Phone Number">
                            <span className={styles.inputIconWrap}>
                                <RiPhoneLine className={styles.inputIcon} aria-hidden="true" />
                                <input
                                    className={`${styles.input} ${styles.inputWithIcon}`}
                                    value={draft.phone}
                                    onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    placeholder="98XXXXXXXX"
                                />
                            </span>
                        </Field>

                        <Field label="Email Address">
                            <span className={styles.inputIconWrap}>
                                <RiMailLine className={styles.inputIcon} aria-hidden="true" />
                                <input
                                    className={`${styles.input} ${styles.inputWithIcon}`}
                                    type="email"
                                    value={draft.email}
                                    onChange={(e) => setField("email", e.target.value)}
                                    placeholder="you@example.com"
                                />
                            </span>
                        </Field>
                    </div>
                </div>
            </section>

            {/* ==================== PROFESSIONAL HIGHLIGHTS ==================== */}
            <section className={styles.section}>
                <SectionHead
                    Icon={RiStarLine}
                    title="Professional Highlights"
                    desc="Add key highlights about your experience and track record."
                />

                <div className={styles.sectionBody}>
                    <div className={styles.grid3}>
                        <Field label="Properties Sold">
                            <Select
                                value={draft.soldCount}
                                onChange={(value) => setField("soldCount", value)}
                                options={COUNT_OPTIONS}
                            />
                        </Field>

                        <Field label="Happy Clients">
                            <Select
                                value={draft.clientsCount}
                                onChange={(value) => setField("clientsCount", value)}
                                options={COUNT_OPTIONS}
                            />
                        </Field>

                        <Field label="Years of Experience">
                            <Select
                                value={draft.yearsCount}
                                onChange={(value) => {
                                    setField("yearsCount", value);
                                    setField("experience", `${value} Years Experience`);
                                }}
                                options={YEARS_OPTIONS}
                            />
                        </Field>
                    </div>
                </div>
            </section>

            {/* ==================== SOCIAL ==================== */}
            <section className={styles.section}>
                <SectionHead
                    Icon={RiLinksLine}
                    title="Social Media Links"
                    desc="Add your website and social profiles."
                />

                <div className={styles.sectionBody}>
                    <div className={styles.grid3}>
                        {[
                            { key: "website", label: "Website", Icon: RiGlobalLine, placeholder: "https://yourwebsite.com" },
                            { key: "facebook", label: "Facebook", Icon: RiFacebookFill, placeholder: "https://facebook.com/yourprofile" },
                            { key: "instagram", label: "Instagram", Icon: RiInstagramLine, placeholder: "https://instagram.com/yourprofile" },
                        ].map(({ key, label, Icon, placeholder }) => (
                            <Field key={key} label={label}>
                                <span className={styles.inputIconWrap}>
                                    <Icon className={styles.inputIcon} aria-hidden="true" />
                                    <input
                                        className={`${styles.input} ${styles.inputWithIcon}`}
                                        value={draft.socials[key]}
                                        onChange={(e) => setSocialField(key, e.target.value)}
                                        placeholder={placeholder}
                                    />
                                </span>
                            </Field>
                        ))}
                    </div>

                    <div className={styles.grid2}>
                        <Field label="LinkedIn">
                            <span className={styles.inputIconWrap}>
                                <RiLinkedinFill className={styles.inputIcon} aria-hidden="true" />
                                <input
                                    className={`${styles.input} ${styles.inputWithIcon}`}
                                    value={draft.socials.linkedin}
                                    onChange={(e) => setSocialField("linkedin", e.target.value)}
                                    placeholder="https://linkedin.com/in/yourprofile"
                                />
                            </span>
                        </Field>
                    </div>
                </div>
            </section>

            <div className={styles.footBar}>
                <button type="button" className={styles.cancelBtn} onClick={onBack}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                    {saving ? "Saving Changes…" : "Save Changes"}
                </button>
            </div>

            <ProfileCropModal
                key={imageToCrop || "crop-modal"}
                isOpen={cropModalOpen}
                imageSrc={imageToCrop}
                originalFileName={rawFileName}
                onClose={handleCropClose}
                onApply={handleCropApply}
            />
        </form>
    );
}
