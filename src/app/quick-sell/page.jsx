"use client";

import { jsonLdHtml } from "../lib/jsonLd";
import { useState } from "react";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./quickSell.module.css";
import { useAuth } from "../context/AuthContext";
import { quickSellApi } from "../lib/api";
import {
    RiRocketLine,
    RiUserFollowLine,
    RiShieldCheckLine,
    RiTimeLine,
    RiCameraLine,
    RiMapPinLine,
    RiHandHeartLine,
    RiCloseLine,
    RiCheckLine,
    RiTeamLine,
} from "react-icons/ri";

export default function QuickSellPage() {
    const {  user } = useAuth();

    // Modal state: "Send Your Property details with us" | "Share Location – We'll Handle the Rest" | "We Connect You with Verified Agents" | null
    const [activeModal, setActiveModal] = useState(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState("");

    // Form inputs states
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
    });

    const [formErrors, setFormErrors] = useState({});

    // Open modal and pre-fill user info if logged in
    const openModal = (requestType) => {
        const prefillName = user?.userName || user?.name || user?.full_name || "";
        const prefillPhone = user?.phone_number || user?.mobile || user?.phone || "";
        setFormData({
            name: prefillName,
            phone: prefillPhone,
        });
        setFormErrors({});
        setApiError("");
        setActiveModal(requestType);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "phone") {
            const numbersOnly = value.replace(/\D/g, "").slice(0, 10);
            setFormData((prev) => ({ ...prev, phone: numbersOnly }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validateForm = () => {
        const errors = {};
        const trimmedName = formData.name.trim();
        const rawPhone = formData.phone.trim().replace(/\D/g, "");

        if (!trimmedName) {
            errors.name = "Full name is required.";
        } else if (trimmedName.length < 2) {
            errors.name = "Full name must be at least 2 characters.";
        } else if (!/^[a-zA-Z\s\.\'-]+$/.test(trimmedName)) {
            errors.name = "Full name should only contain letters and spaces.";
        }

        if (!rawPhone) {
            errors.phone = "Phone number is required.";
        } else if (rawPhone.length !== 10) {
            errors.phone = "Phone number must be exactly 10 digits.";
        } else if (!/^[6-9]\d{9}$/.test(rawPhone)) {
            errors.phone = "Enter a valid 10-digit mobile number starting with 6-9.";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        setApiError("");

        try {
            const res = await quickSellApi.submit({
                name: formData.name.trim(),
                phone: formData.phone.trim().replace(/[^0-9]/g, ""),
                request_type: activeModal,
            });

            if (res.status || res.success) {
                setShowSuccessToast(true);
                setActiveModal(null);
                setFormData({ name: "", phone: "" });
                setFormErrors({});
                setTimeout(() => {
                    setShowSuccessToast(false);
                }, 4000);
            } else {
                setApiError(res.message || "Failed to submit request. Please try again.");
            }
        } catch (err) {
            console.error("Quick sell submission error:", err);
            setApiError(err.response?.data?.message || "An error occurred while submitting your request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const jsonLdSchema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": "https://keralaplots.com/quick-sell#webpage",
                "url": "https://keralaplots.com/quick-sell",
                "name": "Quick Sell Property in Kerala | Fast Real Estate Selling",
                "description": "Sell your plot, villa, or house in Kerala quickly. Get maximum exposure, expert agent assistance, and genuine buyers fast on KeralaPlots marketplace.",
                "breadcrumb": {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": "https://keralaplots.com"
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "Quick Sell",
                            "item": "https://keralaplots.com/quick-sell"
                        }
                    ]
                }
            },
            {
                "@type": "Service",
                "@id": "https://keralaplots.com/quick-sell#service",
                "name": "Quick Property Selling Assistance",
                "provider": {
                    "@type": "RealEstateAgent",
                    "name": "KeralaPlots",
                    "url": "https://keralaplots.com"
                },
                "areaServed": {
                    "@type": "State",
                    "name": "Kerala"
                },
                "description": "Comprehensive fast-track property selling service offering social media promotion, on-site media capture, and direct verified agent connections across Kerala.",
                "serviceType": "Real Estate Selling"
            }
        ]
    };

    return (
        <div className={styles.pageWrapper}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLdSchema) }}
            />
            <Nav />

            {/* Success Toast */}
            {showSuccessToast && (
                <div className={styles.toastSuccess}>
                    <div className={styles.toastIcon}><RiCheckLine /></div>
                    <div className={styles.toastContent}>
                        <span className={styles.toastTitle}>Inquiry Submitted!</span>
                        <span className={styles.toastDesc}>Our support team will get in touch with you shortly.</span>
                    </div>
                </div>
            )}

            <main className={styles.mainContent}>

                {/* Grid Options Container */}
                <section className={styles.optionsSection}>
                    <div className={styles.container}>
                        <h2 className={styles.heroTitle} style={{ color: 'black' }}>Choose How You Want to Sell</h2>

                        <div className={styles.optionsGrid}>
                            {/* Card 1 */}
                            <div className={styles.optionCard}>
                                <div className={styles.cardHeaderBox}>
                                    <div className={`${styles.cardIconCircle} ${styles.blueIcon}`}>
                                        <RiCameraLine />
                                    </div>
                                    <h3 className={styles.cardHeaderTitle}>Send Your Property details with us</h3>
                                </div>
                                <p className={styles.cardDesc}>
                                    Share your property details, photos and videos with us. We will create attractive posts and promote your property on social media for a specific time period to get you more visibility and genuine buyers.
                                </p>

                                {/* Graphics 1: Phone + Social */}
                                <div className={styles.cardGraphicsOne}>
                                    <img loading="lazy" decoding="async"
                                        src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/c2ffc276-5b4a-4208-c84a-298f4ad98b00/public"
                                        alt="Social media property promotion and marketing for fast property selling in Kerala"
                                        width="320"
                                        height="220"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openModal("Send Your Property details with us")}
                                    className={styles.cardBtn}
                                >
                                    Get Started
                                </button>
                            </div>

                            {/* Card 2 */}
                            <div className={styles.optionCard}>
                                <div className={styles.cardHeaderBox}>
                                    <div className={`${styles.cardIconCircle} ${styles.greenIcon}`}>
                                        <RiMapPinLine />
                                    </div>
                                    <h3 className={styles.cardHeaderTitle}>Share Location – We'll Handle the Rest</h3>
                                </div>
                                <p className={styles.cardDesc}>
                                    Share your property location with us. Our team will visit the place, capture high-quality images and videos, and promote it across social media to get you the best results.
                                </p>

                                {/* Graphics 2: Map & Car */}
                                <div className={styles.cardGraphicsOne}>
                                    <img loading="lazy" decoding="async"
                                        src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/37e7917c-3d3f-43d3-0119-ba0d3cb5f900/public"
                                        alt="On-site property location visit and professional photography service in Kerala"
                                        width="320"
                                        height="220"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openModal("Share Location – We'll Handle the Rest")}
                                    className={styles.cardBtn}
                                >
                                    Get Started
                                </button>
                            </div>

                            {/* Card 3 */}
                            <div className={styles.optionCard}>
                                <div className={styles.cardHeaderBox}>
                                    <div className={`${styles.cardIconCircle} ${styles.orangeIcon}`}>
                                        <RiHandHeartLine />
                                    </div>
                                    <h3 className={styles.cardHeaderTitle}>We Connect You with Verified Agents</h3>
                                </div>
                                <p className={styles.cardDesc}>
                                    We will share your property details directly with our network of verified and trusted agents who specialize in faster property deals. Get genuine inquiries and sell your property quickly.
                                </p>

                                {/* Graphics 3: Verified Agents */}
                                <div className={styles.cardGraphicsOne}>
                                    <img loading="lazy" decoding="async"
                                        src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/f0a4064b-ea63-470e-6d4f-b1b65bbadb00/public"
                                        alt="Connect with verified real estate agents in Kerala for quick property deals"
                                        width="320"
                                        height="220"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openModal("We Connect You with Verified Agents")}
                                    className={styles.cardBtn}
                                >
                                    Get Started
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bottom Ribbons row */}
                <section className={styles.ribbonSection}>
                    <div className={styles.container}>
                        <div className={styles.ribbonContainer}>
                            <div className={styles.ribbonCol}>
                                <span className={styles.ribbonIcon}><RiRocketLine /></span>
                                <div className={styles.ribbonText}>
                                    <h4 className={styles.ribbonLabel}>Maximum Exposure</h4>
                                    <p className={styles.ribbonDesc}>Reach thousands of potential buyers</p>
                                </div>
                            </div>
                            <div className={styles.ribbonCol}>
                                <span className={styles.ribbonIcon}><RiShieldCheckLine /></span>
                                <div className={styles.ribbonText}>
                                    <h4 className={styles.ribbonLabel}>Verified Process</h4>
                                    <p className={styles.ribbonDesc}>Safe, secure and transparent</p>
                                </div>
                            </div>
                            <div className={styles.ribbonCol}>
                                <span className={styles.ribbonIcon}><RiTimeLine /></span>
                                <div className={styles.ribbonText}>
                                    <h4 className={styles.ribbonLabel}>Save Time</h4>
                                    <p className={styles.ribbonDesc}>Quick process for faster selling</p>
                                </div>
                            </div>
                            <div className={styles.ribbonCol}>
                                <span className={styles.ribbonIcon}><RiTeamLine /></span>
                                <div className={styles.ribbonText}>
                                    <h4 className={styles.ribbonLabel}>Expert Support</h4>
                                    <p className={styles.ribbonDesc}>Our team is here to help you</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* Hero Section */}
                <section className={styles.heroSection}>

                    <div className={styles.heroRight}>
                        <img
                            src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/d738b0e6-ba12-4f53-918b-d4ab6966fb00/public"
                            alt="Quick sell residential and commercial property in Kerala - KeralaPlots"
                            className={styles.heroImage}
                            width="500"
                            height="400"
                        />
                    </div>
                    <div className={styles.container}>
                        <div className={styles.heroLeft}>
                            <span className={styles.heroBadge}>QUICK SELL</span>
                            <h1 className={styles.heroTitle}>Sell Your Property Faster Than Ever in Kerala</h1>
                            <p className={styles.heroSubtitle}>
                                Choose the best option that works for you. Our team will help you get maximum visibility and quick leads.
                            </p>

                            {/* Features row */}
                            <div className={styles.featuresRow}>
                                <div className={styles.featureItem}>
                                    <span className={styles.featureIcon}><RiRocketLine /></span>
                                    <div className={styles.featureInfo}>
                                        <span className={styles.featureLabel}>Faster</span>
                                        <span className={styles.featureDesc}>Exposure</span>
                                    </div>
                                </div>
                                <div className={styles.featureItem}>
                                    <span className={styles.featureIcon}><RiUserFollowLine /></span>
                                    <div className={styles.featureInfo}>
                                        <span className={styles.featureLabel}>Expert</span>
                                        <span className={styles.featureDesc}>Assistance</span>
                                    </div>
                                </div>
                                <div className={styles.featureItem}>
                                    <span className={styles.featureIcon}><RiShieldCheckLine /></span>
                                    <div className={styles.featureInfo}>
                                        <span className={styles.featureLabel}>Secure &amp;</span>
                                        <span className={styles.featureDesc}>Reliable</span>
                                    </div>
                                </div>
                                <div className={styles.featureItem}>
                                    <span className={styles.featureIcon}><RiTimeLine /></span>
                                    <div className={styles.featureInfo}>
                                        <span className={styles.featureLabel}>Save</span>
                                        <span className={styles.featureDesc}>Time</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Modals Form Render Section */}
            {activeModal && (
                <div className={styles.modalOverlay} onClick={() => !isSubmitting && setActiveModal(null)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        {/* Close btn */}
                        <button
                            type="button"
                            onClick={() => !isSubmitting && setActiveModal(null)}
                            className={styles.modalCloseBtn}
                            title="Close Form"
                        >
                            <RiCloseLine />
                        </button>

                        <h2 className={styles.modalTitle}>
                            Send a quick sell request
                        </h2>
                        
                        {/* Selected criteria badge */}
                        <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 12px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: "600",
                            marginBottom: "12px",
                            background: activeModal === "Send Your Property details with us"
                                ? "#eff6ff"
                                : activeModal === "Share Location – We'll Handle the Rest"
                                ? "#ecfdf5"
                                : "#fff7ed",
                            color: activeModal === "Send Your Property details with us"
                                ? "#1d4ed8"
                                : activeModal === "Share Location – We'll Handle the Rest"
                                ? "#047857"
                                : "#c2410c",
                            border: `1px solid ${
                                activeModal === "Send Your Property details with us"
                                    ? "#bfdbfe"
                                    : activeModal === "Share Location – We'll Handle the Rest"
                                    ? "#a7f3d0"
                                    : "#fed7aa"
                            }`
                        }}>
                            <span>●</span>
                            <span>{activeModal}</span>
                        </div>

                        <p className={styles.modalSubtitle}>
                            Please fill in the form details below to submit your quick sell request.
                        </p>

                        {apiError && (
                            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", color: "#dc2626", fontSize: "13px", marginBottom: "14px" }}>
                                {apiError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            {/* Full Name */}
                            <div className={styles.formGroup}>
                                <label className={styles.fieldLabel}>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your name"
                                    className={`${styles.formInput} ${formErrors.name ? styles.inputError : ""}`}
                                />
                                {formErrors.name && <span className={styles.errorSpan}>{formErrors.name}</span>}
                            </div>

                            {/* Phone */}
                            <div className={styles.formGroup}>
                                <label className={styles.fieldLabel}>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter 10-digit mobile number"
                                    maxLength={10}
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    className={`${styles.formInput} ${formErrors.phone ? styles.inputError : ""}`}
                                />
                                {formErrors.phone && <span className={styles.errorSpan}>{formErrors.phone}</span>}
                            </div>

                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                {isSubmitting ? "Submitting Request..." : "Submit Request"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
