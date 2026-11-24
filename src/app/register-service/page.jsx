"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./registerService.module.css";
import { useAuth } from "../context/AuthContext";
import { serviceProviderApi } from "../lib/api";
import dynamic from "next/dynamic";
import {
    RiUser3Line,
    RiArrowDownSLine,
    RiBriefcaseLine,
    RiUploadCloud2Line,
    RiShieldCheckLine,
    RiTeamLine,
    RiCompass3Line,
    RiMailLine,
    RiCheckLine,
    RiCloseLine,
    RiCameraLine,
    RiCropLine,
    RiDeleteBinLine,
    RiNotification3Line,
    RiAlertLine,
    RiTimeLine,
    RiEyeLine,
    RiFilePdfLine,
} from "react-icons/ri";

// Crop dialog only opens after a photo is picked — load it as its own chunk.
const ProfileCropModal = dynamic(() => import("../profile/ProfileCropModal"), { ssr: false });

function SubmittedArt() {
    return (
        <svg
            className={styles.successArt}
            viewBox="0 0 320 230"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* soft blob behind everything */}
            <path
                d="M92 44c30-30 92-30 122-4s30 78 6 106-80 40-114 16S62 74 92 44Z"
                fill="#e8f7ee"
            />

            {/* sparkles */}
            <g fill="#a5dfbd">
                <path
                    d="M0-7c1 3.9 2.1 5 6 6-3.9 1-5 2.1-6 6-1-3.9-2.1-5-6-6 3.9-1 5-2.1 6-6Z"
                    transform="translate(104 56)"
                />
                <path
                    d="M0-7c1 3.9 2.1 5 6 6-3.9 1-5 2.1-6 6-1-3.9-2.1-5-6-6 3.9-1 5-2.1 6-6Z"
                    transform="translate(216 52) scale(0.8)"
                />
                <path
                    d="M0-7c1 3.9 2.1 5 6 6-3.9 1-5 2.1-6 6-1-3.9-2.1-5-6-6 3.9-1 5-2.1 6-6Z"
                    transform="translate(98 122) scale(0.75)"
                />
                <path
                    d="M0-7c1 3.9 2.1 5 6 6-3.9 1-5 2.1-6 6-1-3.9-2.1-5-6-6 3.9-1 5-2.1 6-6Z"
                    transform="translate(226 128) scale(0.7)"
                />
            </g>

            {/* the document, with its corner turned */}
            <path
                d="M116 52a7 7 0 0 1 7-7h56l30 30v92a7 7 0 0 1-7 7h-79a7 7 0 0 1-7-7Z"
                fill="#f7f9fe"
                stroke="#d9e1f4"
                strokeWidth="2.5"
            />
            <path d="M179 45l30 30h-23a7 7 0 0 1-7-7Z" fill="#e3e9f8" />

            {/* ruled lines */}
            <g fill="#dde4f4">
                <rect x="132" y="84" width="42" height="7" rx="3.5" />
                <rect x="132" y="100" width="58" height="7" rx="3.5" />
                <rect x="132" y="116" width="30" height="7" rx="3.5" />
            </g>

            {/* approved */}
            <circle cx="163" cy="140" r="34" fill="#22a45d" />
            <path
                d="M148 140.5l10.5 10.5L179 130"
                fill="none"
                stroke="#ffffff"
                strokeWidth="7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* the plane, and the trail it left */}
            <path
                d="M206 178c22 4 38-4 44-20s2-30-8-34"
                fill="none"
                stroke="#a5dfbd"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray="4 8"
            />
            <path d="M276 76 224 106l26 4Z" fill="#8fd4ab" />
            <path d="M276 76 250 110l-4 20Z" fill="#3fa96b" />
            <path d="M250 110l-4 20-11-13Z" fill="#63bd8a" />
        </svg>
    );
}

const KERALA_DISTRICTS = [
    "Kochi, Ernakulam",
    "Trivandrum",
    "Thrissur",
    "Kozhikode",
    "Kottayam",
    "Alappuzha",
    "Palakkad",
    "Kannur",
    "Kollam",
    "Pathanamthitta",
    "Idukki",
    "Malappuram",
    "Wayanad",
    "Kasaragod",
    "All Kerala"
];

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

const DEFAULT_SERVICE_SUGGESTIONS = [
    "JCB Operator",
    "Electrician",
    "Painter",
    "Stamp Vendor",
    "Akshaya Centers",
    "Developer",
    "Architect",
    "Civil Engineer",
    "Interior Designer",
    "Plumber",
    "Carpenter",
    "Surveyor",
    "Legal Advisor",
];

// ── Price range helpers ──
// Stored in `starting_price` as "50000" (from) or "50000-150000" (range) so
// older single-price records and the listing pages keep working.
const MAX_PRICE_DIGITS = 9; // up to ₹99,99,99,999
const onlyDigits = (v) => String(v || "").replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_PRICE_DIGITS);
const formatINR = (digits) => (digits ? Number(digits).toLocaleString("en-IN") : "");
const parsePriceRange = (value) => {
    const parts = String(value ?? "")
        .split(/\s*(?:-|–|—|to)\s*/i)
        .map((part) => onlyDigits(part))
        .filter(Boolean);
    return [parts[0] || "", parts[1] || ""];
};
const PRICE_PRESETS = [
    { label: "Under ₹5K", min: "", max: "5000" },
    { label: "₹5K – ₹25K", min: "5000", max: "25000" },
    { label: "₹25K – ₹1L", min: "25000", max: "100000" },
    { label: "₹1L+", min: "100000", max: "" },
];

export default function RegisterServiceProviderPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading, user } = useAuth();

    const fileInputRef = useRef(null);
    const photoInputRef = useRef(null);

    const finish = () => router.push("/services");

    // Form state
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [serviceName, setServiceName] = useState("");
    const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
    const [serviceSearchQuery, setServiceSearchQuery] = useState("");
    const [serviceOptions, setServiceOptions] = useState(DEFAULT_SERVICE_SUGGESTIONS);
    const serviceDropdownRef = useRef(null);

    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [servicePlace, setServicePlace] = useState("");
    const [selectedFileMeta, setSelectedFileMeta] = useState(null);
    const [proofBase64, setProofBase64] = useState("");
    const [existingProof, setExistingProof] = useState("");

    const [photo, setPhoto] = useState("");
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [rawPhotoFileName, setRawPhotoFileName] = useState("profile-photo.jpg");
    const [isPhotoDragOver, setIsPhotoDragOver] = useState(false);
    const [photoError, setPhotoError] = useState("");

    // Application status if already submitted
    const [existingStatus, setExistingStatus] = useState(null);

    // Validation & Success States
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [apiError, setApiError] = useState("");

    // Redirect guest users to login
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login?redirect=/register-service");
        }
    }, [authLoading, isAuthenticated, router]);

    // Close service dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target)) {
                setServiceDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load available service categories from tbl_service
    useEffect(() => {
        const loadServices = async () => {
            try {
                const res = await serviceProviderApi.getServiceNames();
                if (res?.data) {
                    const serverServices = res.data.map((s) => s.service_name || s.name).filter(Boolean);
                    setServiceOptions((prev) => {
                        const set = new Set([...serverServices, ...prev, ...DEFAULT_SERVICE_SUGGESTIONS]);
                        return Array.from(set);
                    });
                }
            } catch (err) {
                console.error("Failed to load service categories:", err);
            }
        };

        loadServices();
    }, []);

    // Preload existing details
    useEffect(() => {
        if (!isAuthenticated) return;

        const loadStatus = async () => {
            try {
                const res = await serviceProviderApi.myStatus();
                if (res?.has_applied && res?.service_provider) {
                    const sp = res.service_provider;
                    setExistingStatus(res.status_label);
                    setFullName(sp.full_name || "");
                    setPhone(sp.phone || "");
                    setServiceName(sp.service_name || sp.role || "");
                    {
                        const [lo, hi] = parsePriceRange(sp.starting_price);
                        setMinPrice(lo);
                        setMaxPrice(hi);
                    }
                    setServicePlace(sp.service_place || "");
                    setPhoto(sp.photo || "");
                    setExistingProof(sp.proof || "");
                } else if (user) {
                    if (user.name) setFullName(user.name);
                    if (user.mobile) setPhone(user.mobile);
                }
            } catch (err) {
                console.error("Failed to load service provider status:", err);
            }
        };

        loadStatus();
    }, [isAuthenticated, user]);

    // File change handler for profile photo with cropping
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

        setRawPhotoFileName(file.name || "profile-photo.jpg");
        const reader = new FileReader();
        reader.onload = () => {
            setPhotoError("");
            setImageToCrop(String(reader.result));
            setCropModalOpen(true);
        };
        reader.onerror = () => setPhotoError("That image couldn’t be read. Try another.");
        reader.readAsDataURL(file);
    };

    const pickPhoto = (event) => {
        const file = event.target.files?.[0];
        if (event.target) event.target.value = "";
        processPhotoFile(file);
    };

    const handlePhotoDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPhotoDragOver(true);
    };

    const handlePhotoDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPhotoDragOver(false);
    };

    const handlePhotoDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPhotoDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        processPhotoFile(file);
    };

    const handleCropApply = ({ file, dataUrl }) => {
        setSelectedPhotoFile(file);
        setPhoto(dataUrl);
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
        if (!photo) return;
        setImageToCrop(photo);
        setRawPhotoFileName("profile-photo.jpg");
        setCropModalOpen(true);
    };

    const handleRemovePhoto = (e) => {
        e?.stopPropagation();
        setPhoto("");
        setSelectedPhotoFile(null);
        setImageToCrop(null);
        setPhotoError("");
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    // Trigger local file selection click
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // File change handler for Proof
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                setErrors((prev) => ({ ...prev, document: "File size exceeds 5MB limit." }));
                setSelectedFileMeta(null);
                setProofBase64("");
                return;
            }

            const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
            setSelectedFileMeta({
                name: file.name,
                size: file.size,
                sizeFormatted: `${sizeInMb} MB`
            });

            const reader = new FileReader();
            reader.onload = () => {
                setProofBase64(String(reader.result));
                setErrors((prev) => {
                    const next = { ...prev };
                    delete next.document;
                    return next;
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Filtered service options based on search query
    const filteredServices = useMemo(() => {
        if (!serviceSearchQuery.trim()) return serviceOptions;
        const q = serviceSearchQuery.toLowerCase();
        return serviceOptions.filter((s) => s.toLowerCase().includes(q));
    }, [serviceOptions, serviceSearchQuery]);

    const isExactServiceMatch = useMemo(() => {
        if (!serviceSearchQuery.trim()) return true;
        const q = serviceSearchQuery.trim().toLowerCase();
        return serviceOptions.some((s) => s.toLowerCase() === q);
    }, [serviceOptions, serviceSearchQuery]);

    // Form submit validation and post handler
    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!photo) {
            setPhotoError("Profile photo is required.");
            newErrors.photo = "Profile photo is required.";
        } else {
            setPhotoError("");
        }

        if (!fullName.trim()) newErrors.fullName = "Full name or company name is required.";
        if (!phone.trim()) {
            newErrors.phone = "Phone number is required.";
        } else if (!/^\d{10}$/.test(phone.trim().replace(/[^0-9]/g, ""))) {
            newErrors.phone = "Please enter a valid 10-digit phone number.";
        }
        if (!serviceName.trim()) newErrors.serviceName = "Service name/role is required.";
        if (minPrice && Number(minPrice) <= 0) {
            newErrors.priceRange = "Minimum price must be greater than ₹0.";
        } else if (maxPrice && Number(maxPrice) <= 0) {
            newErrors.priceRange = "Maximum price must be greater than ₹0.";
        } else if (minPrice && maxPrice && Number(maxPrice) < Number(minPrice)) {
            newErrors.priceRange = "Maximum price must be higher than the minimum price.";
        }
        if (!servicePlace) newErrors.servicePlace = "Please select your service district.";
        if (!selectedFileMeta && !existingProof) newErrors.document = "Proof of document upload is required.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setApiError("");
        setIsSubmitting(true);

        // "min-max", "min" (from) or "0-max" (up to) — empty when not provided
        const priceRangeValue =
            minPrice && maxPrice
                ? minPrice === maxPrice ? minPrice : `${minPrice}-${maxPrice}`
                : minPrice || (maxPrice ? `0-${maxPrice}` : "");

        try {
            const payload = {
                full_name: fullName.trim(),
                phone: phone.trim(),
                service_name: serviceName.trim(),
                starting_price: priceRangeValue,
                min_price: minPrice ? Number(minPrice) : null,
                max_price: maxPrice ? Number(maxPrice) : null,
                service_place: servicePlace,
                photo: photo,
                proof: proofBase64 || existingProof || null,
            };

            const res = await serviceProviderApi.register(payload);
            if (res.status || res.success) {
                setShowSuccessToast(true);
            } else {
                setApiError(res.message || "Failed to submit application. Please try again.");
            }
        } catch (err) {
            console.error("Registration error:", err);
            setApiError(err?.response?.data?.message || "An error occurred during submission.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <Nav />

            {/* Success Popup Dialog */}
            {showSuccessToast && (
                <div
                    className={styles.overlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="registration-submitted"
                    onClick={finish}
                >
                    <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className={styles.dialogClose}
                            onClick={finish}
                            aria-label="Close"
                        >
                            <RiCloseLine />
                        </button>

                        <SubmittedArt />

                        <h2 id="registration-submitted" className={styles.successTitle}>
                            Registration Submitted!
                        </h2>
                        <span className={styles.successRule} aria-hidden="true" />

                        <p className={styles.successBody}>
                            Thank you for registering with us. Your registration is now pending for
                            admin approval. We will notify you via email once your account is
                            approved and ready to use.
                        </p>

                        <div className={styles.successNote}>
                            <span className={styles.successNoteIcon}>
                                <RiNotification3Line aria-hidden="true" />
                            </span>
                            <span>
                                You will receive an email notification once your account is approved.
                            </span>
                        </div>

                        <button type="button" className={styles.successBtn} onClick={finish} autoFocus>
                            Got it!
                        </button>
                    </div>
                </div>
            )}

            {/* Hero Header Section */}
            <section className={styles.heroSection}>

                {/* Breadcrumb section */}
                <div className={styles.breadcrumbArea}>
                    <div className={styles.container}>
                        <div className={styles.breadcrumbs}>
                            <Link href="/">Home</Link>
                            <span className={styles.separator}>&gt;</span>
                            <Link href="/services">Services</Link>
                            <span className={styles.separator}>&gt;</span>
                            <span className={styles.current}>Register as Service Provider</span>
                        </div>
                    </div>
                </div>

                <div className={styles.container}>
                    <div className={styles.heroContentGrid}>
                        <div className={styles.heroLeft}>
                            <h1 className={styles.heroTitle}>
                                Register as a <br />
                                Service Provider
                            </h1>
                            <p className={styles.heroSub}>
                                Join KeralaPlots and connect with thousands of property buyers, sellers, builders, and homeowners across Kerala.
                            </p>
                        </div>
                        <div className={styles.heroRight}>
                            <img
                                src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/f0a56ee8-ebe4-483b-2e68-c61a512ff100/public"
                                alt="Professional Service Provider"
                                className={styles.heroPhoto}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Two Column Form & Benefits Content */}
            <section className={styles.formMainSection}>
                <div className={styles.container}>
                    <div className={styles.contentLayoutGrid}>
                        {/* Left Registration Form */}
                        <div className={styles.formCard}>
                            <h2 className={styles.formTitle}>
                                {existingStatus ? "Edit Service Provider Profile" : "Service Provider Registration"}
                            </h2>
                            <p className={styles.formDesc}>
                                {existingStatus ? "Update your service provider information below." : "Please fill in the details below to create your service provider profile."}
                            </p>

                            {existingStatus === "pending" && (
                                <div style={{ padding: "14px 18px", borderRadius: "10px", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", marginBottom: "20px", display: "flex", alignItems: "center", gap: 12, fontSize: "14px" }}>
                                    <RiTimeLine style={{ fontSize: "20px", flexShrink: 0, color: "#d97706" }} />
                                    <span>Your application is currently <strong>Pending Admin Review</strong>. Updating details below will re-submit your profile for verification.</span>
                                </div>
                            )}
                            {existingStatus === "approved" && (
                                <div style={{ padding: "14px 18px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", marginBottom: "20px", display: "flex", alignItems: "center", gap: 12, fontSize: "14px" }}>
                                    <RiShieldCheckLine style={{ fontSize: "20px", flexShrink: 0, color: "#16a34a" }} />
                                    <span>You are an <strong>Active Service Provider</strong>. You can update your service details below.</span>
                                </div>
                            )}
                            {existingStatus === "rejected" && (
                                <div style={{ padding: "14px 18px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", marginBottom: "20px", display: "flex", alignItems: "center", gap: 12, fontSize: "14px" }}>
                                    <RiAlertLine style={{ fontSize: "20px", flexShrink: 0, color: "#dc2626" }} />
                                    <span>Your previous application was not approved. Update your details and resubmit for verification.</span>
                                </div>
                            )}
                            {apiError && (
                                <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", marginBottom: "20px", fontSize: "13.5px" }}>
                                    {apiError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className={styles.registrationForm}>
                                {/* Field: Profile Photo */}
                                <div className={styles.photoCol}>
                                    <span className={styles.fieldLabel}>
                                        Profile Photo <span className={styles.required}>*</span>
                                    </span>

                                    <div
                                        className={`${styles.dropzone} ${photoError ? styles.dropzoneInvalid : ""} ${isPhotoDragOver ? styles.dropzoneActive : ""}`}
                                        onClick={() => {
                                            if (!photo) {
                                                photoInputRef.current?.click();
                                            }
                                        }}
                                        onDragOver={handlePhotoDragOver}
                                        onDragLeave={handlePhotoDragLeave}
                                        onDrop={handlePhotoDrop}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                if (!photo) {
                                                    photoInputRef.current?.click();
                                                }
                                            }
                                        }}
                                    >
                                        {photo ? (
                                            <div className={styles.photoPreviewWrap}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={photo} alt="Your profile" className={styles.photoPreview} />
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
                                                        <span>Crop</span>
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
                                                <span className={styles.dropzoneIcon}>
                                                    <RiCameraLine aria-hidden="true" />
                                                </span>
                                                <span className={styles.dropzoneTitle}>Upload Photo</span>
                                                <span className={styles.dropzoneHint}>
                                                    JPG, PNG or WEBP.
                                                    <br />
                                                    Max size 10MB.
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {photo && (
                                        <div className={styles.photoColFooter}>
                                            <button
                                                type="button"
                                                className={styles.photoRemove}
                                                onClick={handleRemovePhoto}
                                            >
                                                <RiDeleteBinLine aria-hidden="true" />
                                                Remove
                                            </button>
                                            {/* <button
                                                type="button"
                                                className={styles.reCropLink}
                                                onClick={handleOpenCropCurrent}
                                            >
                                                <RiCropLine aria-hidden="true" />
                                                Recrop
                                            </button> */}
                                        </div>
                                    )}

                                    {photoError && <p className={styles.errorText}>{photoError}</p>}

                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className={styles.hiddenFileInput}
                                        onChange={pickPhoto}
                                        tabIndex={-1}
                                        aria-label="Upload profile photo"
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.fieldLabel}>
                                        Full Name or Company Name <span className={styles.required}>*</span>
                                    </label>
                                    <div className={`${styles.inputContainer} ${errors.fullName ? styles.inputErrorBorder : ""}`}>
                                        <RiUser3Line className={styles.inputIcon} />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => {
                                                setFullName(e.target.value);
                                                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: null }));
                                            }}
                                            placeholder="Enter your full name or company name"
                                            className={styles.textInput}
                                        />
                                    </div>
                                    {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                                </div>

                                {/* Field: Phone Number */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.fieldLabel}>
                                        Phone Number <span className={styles.required}>*</span>
                                    </label>
                                    <div className={styles.phoneInputRow}>
                                        <div className={styles.countryCodeSelector}>
                                            <select
                                                value={countryCode}
                                                onChange={(e) => setCountryCode(e.target.value)}
                                                className={styles.codeSelect}
                                            >
                                                <option value="+91">+91</option>
                                                <option value="+971">+971</option>
                                                <option value="+1">+1</option>
                                                <option value="+44">+44</option>
                                            </select>
                                            <RiArrowDownSLine className={styles.selectChevron} />
                                        </div>
                                        <div className={`${styles.phoneTextContainer} ${errors.phone ? styles.inputErrorBorder : ""}`}>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => {
                                                    setPhone(e.target.value.replace(/\D/g, ""));
                                                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                                                }}
                                                placeholder="Enter phone number"
                                                className={styles.phoneTextInput}
                                            />
                                        </div>
                                    </div>
                                    {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                                </div>

                                {/* Field: Service Name (Searchable Dropdown with Create Option) */}
                                <div className={styles.inputGroup} ref={serviceDropdownRef}>
                                    <label className={styles.fieldLabel}>
                                        Service Name <span className={styles.required}>*</span>
                                    </label>
                                    <div className={styles.searchableDropdownWrapper}>
                                        <div
                                            className={`${styles.searchableTrigger} ${serviceDropdownOpen ? styles.searchableTriggerActive : ""} ${errors.serviceName ? styles.inputErrorBorder : ""}`}
                                            onClick={() => setServiceDropdownOpen(true)}
                                        >
                                            <RiBriefcaseLine className={styles.searchableIcon} />
                                            <input
                                                type="text"
                                                value={serviceDropdownOpen ? serviceSearchQuery : serviceName}
                                                onChange={(e) => {
                                                    setServiceSearchQuery(e.target.value);
                                                    if (!serviceDropdownOpen) setServiceDropdownOpen(true);
                                                }}
                                                onFocus={() => {
                                                    setServiceSearchQuery(serviceName || "");
                                                    setServiceDropdownOpen(true);
                                                }}
                                                placeholder="Search or type service name..."
                                                className={styles.searchableInput}
                                            />
                                            <RiArrowDownSLine
                                                className={styles.searchableChevron}
                                                style={{
                                                    transform: serviceDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                }}
                                            />
                                        </div>

                                        {serviceDropdownOpen && (
                                            <div className={styles.searchablePopover}>
                                                {filteredServices.length > 0 ? (
                                                    filteredServices.map((svc) => (
                                                        <div
                                                            key={svc}
                                                            className={`${styles.searchableOption} ${serviceName === svc ? styles.searchableOptionActive : ""}`}
                                                            onClick={() => {
                                                                setServiceName(svc);
                                                                setServiceSearchQuery(svc);
                                                                setServiceDropdownOpen(false);
                                                                if (errors.serviceName) setErrors((prev) => ({ ...prev, serviceName: null }));
                                                            }}
                                                        >
                                                            <span>{svc}</span>
                                                            {serviceName === svc && <RiCheckLine />}
                                                        </div>
                                                    ))
                                                ) : null}

                                                {/* If search query does not match any existing service, offer to add it */}
                                                {serviceSearchQuery.trim() && !isExactServiceMatch && (
                                                    <div
                                                        className={styles.searchableOptionCreate}
                                                        onClick={() => {
                                                            const newName = serviceSearchQuery.trim();
                                                            setServiceName(newName);
                                                            if (!serviceOptions.includes(newName)) {
                                                                setServiceOptions((prev) => [newName, ...prev]);
                                                            }
                                                            setServiceDropdownOpen(false);
                                                            if (errors.serviceName) setErrors((prev) => ({ ...prev, serviceName: null }));
                                                        }}
                                                    >
                                                        <span>+ Add &ldquo;{serviceSearchQuery.trim()}&rdquo; as new service</span>
                                                    </div>
                                                )}

                                                {filteredServices.length === 0 && !serviceSearchQuery.trim() && (
                                                    <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "13.5px" }}>
                                                        Type to search or add a new service
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className={styles.helpText}>Select an existing service from the list or type to create a new one.</span>
                                    {errors.serviceName && <span className={styles.errorText}>{errors.serviceName}</span>}
                                </div>

                                {/* Price Range (optional) */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.fieldLabel} id="price-range-label">
                                        Price Range <span className={styles.optionalTag}>(optional)</span>
                                    </label>
                                    <div
                                        className={`${styles.priceRange} ${errors.priceRange ? styles.priceRangeError : ""}`}
                                        role="group"
                                        aria-labelledby="price-range-label"
                                    >
                                        <div className={styles.priceField}>
                                            <span className={styles.priceFieldLabel}>Min</span>
                                            <div className={styles.priceInputWrap}>
                                                <span className={styles.currencySymbol}>₹</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    aria-label="Minimum price"
                                                    value={formatINR(minPrice)}
                                                    onChange={(e) => {
                                                        setMinPrice(onlyDigits(e.target.value));
                                                        if (errors.priceRange) setErrors((prev) => ({ ...prev, priceRange: null }));
                                                    }}
                                                    placeholder="From"
                                                    className={styles.currencyInput}
                                                />
                                            </div>
                                        </div>
                                        <span className={styles.priceDivider} aria-hidden="true">to</span>
                                        <div className={styles.priceField}>
                                            <span className={styles.priceFieldLabel}>Max</span>
                                            <div className={styles.priceInputWrap}>
                                                <span className={styles.currencySymbol}>₹</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    aria-label="Maximum price"
                                                    value={formatINR(maxPrice)}
                                                    onChange={(e) => {
                                                        setMaxPrice(onlyDigits(e.target.value));
                                                        if (errors.priceRange) setErrors((prev) => ({ ...prev, priceRange: null }));
                                                    }}
                                                    placeholder="Up to"
                                                    className={styles.currencyInput}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.pricePresets} aria-label="Quick price ranges">
                                        {PRICE_PRESETS.map((preset) => {
                                            const active = preset.min === minPrice && preset.max === maxPrice;
                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    aria-pressed={active}
                                                    className={`${styles.pricePreset} ${active ? styles.pricePresetActive : ""}`}
                                                    onClick={() => {
                                                        setMinPrice(active ? "" : preset.min);
                                                        setMaxPrice(active ? "" : preset.max);
                                                        if (errors.priceRange) setErrors((prev) => ({ ...prev, priceRange: null }));
                                                    }}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {errors.priceRange ? (
                                        <span className={styles.errorText}>{errors.priceRange}</span>
                                    ) : (
                                        <span className={styles.helpText}>
                                            {minPrice && maxPrice
                                                ? `Customers will see: ₹${formatINR(minPrice)} – ₹${formatINR(maxPrice)}`
                                                : minPrice
                                                    ? `Customers will see: From ₹${formatINR(minPrice)}`
                                                    : maxPrice
                                                        ? `Customers will see: Up to ₹${formatINR(maxPrice)}`
                                                        : "Enter a minimum, a maximum, or both — leave empty if your pricing varies."}
                                        </span>
                                    )}
                                </div>

                                {/* Service Place */}
                                    <div className={styles.inputGroup}>
                                        <label className={styles.fieldLabel}>
                                            Service Place <span className={styles.required}>*</span>
                                        </label>
                                        <div className={`${styles.selectContainer} ${errors.servicePlace ? styles.inputErrorBorder : ""}`}>
                                            <select
                                                value={servicePlace}
                                                onChange={(e) => {
                                                    setServicePlace(e.target.value);
                                                    if (errors.servicePlace) setErrors((prev) => ({ ...prev, servicePlace: null }));
                                                }}
                                                className={styles.customSelect}
                                            >
                                                <option value="">Select service place</option>
                                                {KERALA_DISTRICTS.map((place) => (
                                                    <option key={place} value={place}>{place}</option>
                                                ))}
                                            </select>
                                            <RiArrowDownSLine className={styles.selectArrow} />
                                        </div>
                                        {errors.servicePlace && <span className={styles.errorText}>{errors.servicePlace}</span>}
                                    </div>


                                {/* Field: Proof (Upload Document) */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.fieldLabel}>
                                        Proof (Upload Document) <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        className={styles.hiddenFileInput}
                                    />

                                    <div className={`${styles.uploadBox} ${errors.document ? styles.uploadBoxError : ""}`}>
                                        <div className={styles.uploadInfoRow}>
                                            <div className={styles.uploadIconBox} onClick={handleUploadClick}>
                                                {selectedFileMeta || existingProof ? (
                                                    (proofBase64 || existingProof)?.includes("pdf") ? (
                                                        <RiFilePdfLine style={{ color: "#dc2626" }} />
                                                    ) : (
                                                        <RiShieldCheckLine style={{ color: "#16a34a" }} />
                                                    )
                                                ) : (
                                                    <RiUploadCloud2Line />
                                                )}
                                            </div>
                                            <div className={styles.uploadDetails} onClick={handleUploadClick}>
                                                <span className={styles.uploadTitle}>
                                                    {selectedFileMeta
                                                        ? selectedFileMeta.name
                                                        : (existingProof ? "Verified Proof Document Attached" : "Upload Document")}
                                                </span>
                                                <span className={styles.uploadLimit}>
                                                    {selectedFileMeta
                                                        ? selectedFileMeta.sizeFormatted
                                                        : (existingProof ? "Click 'View Document' to inspect attached file" : "JPG, PNG, PDF (Max size 5MB)")}
                                                </span>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                {(existingProof || proofBase64) && (
                                                    <a
                                                        href={proofBase64 || existingProof}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                            padding: "6px 12px",
                                                            borderRadius: "8px",
                                                            backgroundColor: "#eff6ff",
                                                            color: "#1d4ed8",
                                                            border: "1px solid #bfdbfe",
                                                            fontSize: "12.5px",
                                                            fontWeight: "600",
                                                            textDecoration: "none",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="View Attached Proof Document"
                                                    >
                                                        <RiEyeLine /> View Document
                                                    </a>
                                                )}

                                                {selectedFileMeta || existingProof ? (
                                                    <button
                                                        type="button"
                                                        className={styles.clearFileBtn}
                                                        onClick={() => {
                                                            setSelectedFileMeta(null);
                                                            setProofBase64("");
                                                            setExistingProof("");
                                                        }}
                                                        title="Remove attached file"
                                                    >
                                                        <RiCloseLine />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={styles.chooseFileBtn}
                                                        onClick={handleUploadClick}
                                                    >
                                                        Choose File
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {errors.document && <span className={styles.errorText}>{errors.document}</span>}
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Submitting Registration..." : "Submit"}
                                </button>
                            </form>
                        </div>

                        {/* Right Benefits Card */}
                        <div className={styles.benefitsCard}>
                            <h3 className={styles.benefitsTitle}>Why Join KeralaPlots?</h3>

                            <div className={styles.benefitsList}>
                                {/* Benefit 1 */}
                                <div className={styles.benefitItem}>
                                    <div className={styles.benefitIconBox}>
                                        <RiTeamLine />
                                    </div>
                                    <div className={styles.benefitContent}>
                                        <h4 className={styles.benefitHeading}>Reach More Customers</h4>
                                        <p className={styles.benefitDesc}>Get discovered by thousands of property buyers and homeowners across Kerala.</p>
                                    </div>
                                </div>

                                {/* Benefit 2 */}
                                <div className={styles.benefitItem}>
                                    <div className={styles.benefitIconBox}>
                                        <RiCompass3Line />
                                    </div>
                                    <div className={styles.benefitContent}>
                                        <h4 className={styles.benefitHeading}>Get Genuine Leads</h4>
                                        <p className={styles.benefitDesc}>Receive quality enquiries from serious buyers and property seekers.</p>
                                    </div>
                                </div>

                                {/* Benefit 3 */}
                                <div className={styles.benefitItem}>
                                    <div className={styles.benefitIconBox}>
                                        <RiShieldCheckLine />
                                    </div>
                                    <div className={styles.benefitContent}>
                                        <h4 className={styles.benefitHeading}>Build Your Reputation</h4>
                                        <p className={styles.benefitDesc}>Create a trusted profile and build your brand in the real estate community.</p>
                                    </div>
                                </div>

                                {/* Benefit 4 */}
                                <div className={styles.benefitItem}>
                                    <div className={styles.benefitIconBox}>
                                        <RiMailLine />
                                    </div>
                                    <div className={styles.benefitContent}>
                                        <h4 className={styles.benefitHeading}>Grow Your Business</h4>
                                        <p className={styles.benefitDesc}>Expand your network and grow your service business with ease.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Disclaimer Banner */}
                    <div className={styles.disclaimerBanner}>
                        <div className={styles.disclaimerIcon}>
                            <RiShieldCheckLine />
                        </div>
                        <p className={styles.disclaimerText}>
                            KeralaPlots is only a platform connecting users with independent service providers. Submission of this form does not guarantee approval or customer enquiries.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── PROFILE CROP MODAL ── */}
            <ProfileCropModal
                isOpen={cropModalOpen}
                imageSrc={imageToCrop}
                originalFileName={rawPhotoFileName}
                onClose={handleCropClose}
                onApply={handleCropApply}
            />

            <Footer />
        </div>
    );
}
