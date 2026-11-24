"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./propertyCheckout.module.css";
import {
    RiCloseLine,
    RiShieldCheckLine,
    RiCheckLine,
    RiAlertLine,
    RiLockLine,
    RiArrowRightLine,
    RiVipCrownLine,
    RiFlashlightLine,
    RiCalendarLine,
    RiFileTextLine,
    RiFilmLine,
    RiLoader4Line,
} from "react-icons/ri";
import { propertyPaymentApi } from "../lib/propertyWizardApi";
import { agentSubscriptionApi } from "../lib/agentSubscriptionApi";

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (typeof window !== "undefined" && window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function ListingInfoModal({
    isOpen,
    onClose,
    onPayNow,
    onSaveDraftAndExit,
    propertyId,
    onPublishSuccess,
}) {
    const router = useRouter();
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [feeAmount, setFeeAmount] = useState(300);
    const [bundleFeeAmount, setBundleFeeAmount] = useState(500);
    const [selectedOneTimeTier, setSelectedOneTimeTier] = useState("standard"); // "standard" | "with_reel"

    // Agent Subscription State
    const [isAgent, setIsAgent] = useState(false);
    const [currentSub, setCurrentSub] = useState(null);
    const [plans, setPlans] = useState([]);
    const [topupPlans, setTopupPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [selectedTopupId, setSelectedTopupId] = useState(null);
    const [activeTab, setActiveTab] = useState("subscription"); // 'subscription' | 'normal'
    const [loadingData, setLoadingData] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleConfirmExit = () => {
        setShowExitWarning(false);
        if (onSaveDraftAndExit) {
            onSaveDraftAndExit();
        } else if (onClose) {
            onClose();
        }
    };

    const fetchModalData = useCallback(async () => {
        if (!isOpen) return;
        setLoadingData(true);
        setErrorMessage("");

        try {
            // 1. Get payment configuration
            const configRes = await propertyPaymentApi.getConfig().catch(() => null);
            if (configRes?.data?.listing_fee) {
                setFeeAmount(configRes.data.listing_fee);
            }
            if (configRes?.data?.listing_with_reel_fee) {
                setBundleFeeAmount(configRes.data.listing_with_reel_fee);
            }

            // 2. Check property status if propertyId is provided
            let propStatus = null;
            if (propertyId) {
                propStatus = await propertyPaymentApi.getStatus(propertyId).catch(() => null);
            }

            // 3. Check current subscription, base plans & top-up plans (filtered specifically for properties)
            const preferredCategory =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("plan_category")
                    : null;
            const [subRes, plansRes, topupRes] = await Promise.all([
                agentSubscriptionApi.getCurrentSubscription(preferredCategory, "property").catch(() => null),
                agentSubscriptionApi.getPlans().catch(() => null),
                agentSubscriptionApi.getTopupPlans("property").catch(() => null),
            ]);

            const agentFlag = !!(propStatus?.data?.is_agent || subRes?.is_agent);
            setIsAgent(agentFlag);

            const activeSubscription = subRes?.data?.subscription || null;
            setCurrentSub(activeSubscription);

            const availablePlans = plansRes?.data || [];
            setPlans(availablePlans);

            if (availablePlans.length > 0) {
                // Select featured or second plan by default (e.g. Professional Agent Plan)
                const defaultPlan = availablePlans.find((p) => p.price >= 500) || availablePlans[0];
                setSelectedPlanId(defaultPlan.id);
            }

            // Only show top-up plans that actually provide property listings!
            const availableTopups = (topupRes?.data || []).filter(
                (p) => p.property_limit > 0 || p.property_unlimited
            );
            setTopupPlans(availableTopups);
            if (availableTopups.length > 0) {
                setSelectedTopupId(availableTopups[0].id);
            }

            // If not an agent, default tab to normal payment
            if (!agentFlag) {
                setActiveTab("normal");
            } else if (activeSubscription && activeSubscription.is_active) {
                setActiveTab("subscription");
            }
        } catch (err) {
            console.warn("[ListingInfoModal] Error loading data:", err);
        } finally {
            setLoadingData(false);
        }
    }, [isOpen, propertyId]);

    useEffect(() => {
        if (!isOpen) {
            setShowExitWarning(false);
            setErrorMessage("");
            return;
        }

        fetchModalData();

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                if (showExitWarning) {
                    handleConfirmExit();
                } else {
                    setShowExitWarning(true);
                }
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, showExitWarning, fetchModalData]);

    if (!isOpen) return null;

    const handleAttemptClose = () => {
        setShowExitWarning(true);
    };

    // Calculate subscription states
    const hasActiveSub = !!(currentSub && currentSub.is_active && !currentSub.is_expired);
    const hasPropertyQuota = hasActiveSub && (currentSub.property_unlimited || currentSub.property_remaining > 0);
    const quotaReached = hasActiveSub && !currentSub.property_unlimited && currentSub.property_remaining <= 0;
    const isTopupMode = quotaReached && topupPlans.length > 0;
    const isExpiringSoon = hasActiveSub && currentSub.is_expiring_soon;

    const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
    const selectedTopupPlan = topupPlans.find((p) => p.id === selectedTopupId) || topupPlans[0];

    // Direct publish using active subscription
    const handlePublishWithActiveSubscription = async () => {
        if (!propertyId) return;
        setActionLoading(true);
        setLoadingMessage("Publishing property using subscription quota...");
        setErrorMessage("");

        try {
            const preferredCategory =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("plan_category")
                    : currentSub?.category || null;
            const res = await agentSubscriptionApi.publishWithSubscription(
                "property",
                propertyId,
                preferredCategory
            );
            if (res?.success) {
                if (onPublishSuccess) {
                    onPublishSuccess(res.data);
                }
                if (onClose) {
                    onClose();
                }
                router.push("/profile/added-properties");
            } else {
                setErrorMessage(res?.message || "Failed to publish property with subscription.");
            }
        } catch (err) {
            setErrorMessage(err.message || "An error occurred while publishing.");
        } finally {
            setActionLoading(false);
            setLoadingMessage("");
        }
    };

    // Purchase subscription and then publish property
    const handleSubscribeAndPublish = async () => {
        if (!selectedPlan) return;
        setActionLoading(true);
        setLoadingMessage("Creating secure payment order...");
        setErrorMessage("");

        try {
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
            }

            // 1. Create order
            const orderRes = await agentSubscriptionApi.createOrder(selectedPlan.id);
            if (!orderRes?.success) {
                // If the agent already has an active subscription, publish using their existing quota and redirect!
                if (orderRes?.status === 409 || orderRes?.message?.includes("already have an active Agent Subscription")) {
                    setLoadingMessage("Active subscription detected! Publishing property with your quota...");
                    await fetchModalData();
                    if (propertyId) {
                        const pubRes = await agentSubscriptionApi.publishWithSubscription("property", propertyId);
                        if (pubRes?.success) {
                            if (onPublishSuccess) onPublishSuccess(pubRes.data);
                            if (onClose) onClose();
                            router.push("/profile/added-properties");
                            return;
                        }
                    }
                }
                throw new Error(orderRes?.message || "Failed to create subscription order.");
            }

            const orderData = orderRes.data;

            // 2. Open Razorpay Checkout
            const options = {
                key: orderData.key,
                amount: orderData.amount_in_paise,
                currency: orderData.currency || "INR",
                name: "KeralaPlots",
                description: `${orderData.plan_title} Subscription`,
                image: "/favicon.ico",
                order_id: orderData.order_id,
                prefill: {
                    name: orderData.user_name || "",
                    email: orderData.user_email || "",
                    contact: orderData.user_contact || "",
                },
                theme: {
                    color: "#059669",
                },
                handler: async function (response) {
                    setActionLoading(true);
                    setLoadingMessage("Verifying payment and activating subscription...");

                    try {
                        // 3. Verify payment on backend
                        const verifyRes = await agentSubscriptionApi.verifyPayment({
                            plan_id: selectedPlan.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (!verifyRes?.success) {
                            throw new Error(verifyRes?.message || "Payment verification failed.");
                        }

                        // 4. Immediately publish property if propertyId provided
                        if (propertyId) {
                            setLoadingMessage("Subscription active! Publishing your property...");
                            try {
                                const pubRes = await agentSubscriptionApi.publishWithSubscription("property", propertyId);
                                if (pubRes?.success) {
                                    if (onPublishSuccess) onPublishSuccess(pubRes.data);
                                    if (onClose) onClose();
                                    router.push("/profile/added-properties");
                                    return;
                                }
                            } catch (e) {
                                console.warn("Auto publish notice:", e);
                            }
                        }

                        // Success callback, close modal and redirect to added properties
                        if (onPublishSuccess) onPublishSuccess();
                        if (onClose) onClose();
                        router.push("/profile/added-properties");
                    } catch (verifyErr) {
                        setErrorMessage(verifyErr.message || "Failed to verify subscription payment.");
                    } finally {
                        setActionLoading(false);
                        setLoadingMessage("");
                    }
                },
                modal: {
                    ondismiss: function () {
                        setActionLoading(false);
                        setLoadingMessage("");
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (failRes) {
                setActionLoading(false);
                setLoadingMessage("");
                setErrorMessage(failRes.error?.description || "Payment failed. Please try again.");
            });
            rzp.open();
        } catch (err) {
            setActionLoading(false);
            setLoadingMessage("");
            setErrorMessage(err.message || "Failed to initialize subscription checkout.");
        }
    };

    // Purchase top-up and then publish property
    const handleTopupAndPublish = async () => {
        if (!selectedTopupPlan) return;
        setActionLoading(true);
        setLoadingMessage("Creating secure top-up order...");
        setErrorMessage("");

        try {
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
            }

            const orderRes = await agentSubscriptionApi.createTopupOrder(selectedTopupPlan.id);
            if (!orderRes?.success) {
                throw new Error(orderRes?.message || "Failed to create top-up order.");
            }

            const orderData = orderRes.data;

            const options = {
                key: orderData.key,
                amount: orderData.amount_in_paise,
                currency: orderData.currency || "INR",
                name: "KeralaPlots",
                description: `${orderData.plan_title} Top-Up`,
                image: "/favicon.ico",
                order_id: orderData.order_id,
                prefill: {
                    name: orderData.user_name || "",
                    email: orderData.user_email || "",
                    contact: orderData.user_contact || "",
                },
                theme: {
                    color: "#7c3aed",
                },
                handler: async function (response) {
                    setActionLoading(true);
                    setLoadingMessage("Verifying top-up payment and crediting quota...");

                    try {
                        const verifyRes = await agentSubscriptionApi.verifyTopupPayment({
                            plan_id: selectedTopupPlan.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (!verifyRes?.success) {
                            throw new Error(verifyRes?.message || "Top-up verification failed.");
                        }

                        if (propertyId) {
                            setLoadingMessage("Top-up active! Publishing your property...");
                            const pubRes = await agentSubscriptionApi.publishWithSubscription("property", propertyId);
                            if (pubRes?.success) {
                                if (onPublishSuccess) onPublishSuccess(pubRes.data);
                                if (onClose) onClose();
                                router.push("/profile/added-properties");
                                return;
                            } else {
                                throw new Error(pubRes?.message || "Could not publish property under subscription.");
                            }
                        }

                        if (onPublishSuccess) onPublishSuccess();
                        if (onClose) onClose();
                        router.push("/profile/added-properties");
                    } catch (verifyErr) {
                        setErrorMessage(verifyErr.message || "Failed to verify top-up payment.");
                    } finally {
                        setActionLoading(false);
                        setLoadingMessage("");
                    }
                },
                modal: {
                    ondismiss: function () {
                        setActionLoading(false);
                        setLoadingMessage("");
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (failRes) {
                setActionLoading(false);
                setLoadingMessage("");
                setErrorMessage(failRes.error?.description || "Payment failed. Please try again.");
            });
            rzp.open();
        } catch (err) {
            setActionLoading(false);
            setLoadingMessage("");
            setErrorMessage(err.message || "Failed to initialize top-up checkout.");
        }
    };

    return createPortal(
        <div className={styles.modalOverlay} onClick={handleAttemptClose} role="dialog" aria-modal="true">
            <div className={styles.infoModalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: isAgent ? "580px" : "520px" }}>
                {/* Header */}
                <div className={styles.infoModalHeader}>
                    <div className={styles.infoModalHeaderTitleWrap}>
                        <span className={styles.infoModalBadge}>
                            <RiShieldCheckLine /> KeralaPlots Verified
                        </span>
                        <h3 className={styles.infoModalTitle}>
                            {hasPropertyQuota ? "Confirm & Publish Property" : "Publish Your Property"}
                        </h3>
                    </div>
                    <button
                        type="button"
                        className={styles.infoModalCloseBtn}
                        onClick={handleAttemptClose}
                        aria-label="Close"
                        title="Close"
                        disabled={actionLoading}
                    >
                        <RiCloseLine size={24} />
                    </button>
                </div>

                {/* Exit Warning Dialog */}
                {showExitWarning ? (
                    <div className={styles.warningContainer}>
                        <div className={styles.warningIconWrap}>
                            <RiAlertLine />
                        </div>
                        <h4 className={styles.warningTitle}>Payment Required to List Property</h4>
                        <p className={styles.warningDesc}>
                            Your property is saved as a <strong>draft</strong>. Only after completing payment or using an active Agent Subscription will your listing be verified and visible to buyers on KeralaPlots.
                        </p>
                        <div className={styles.warningActions}>
                            <button
                                type="button"
                                className={styles.warningPrimaryBtn}
                                onClick={() => {
                                    setShowExitWarning(false);
                                    if (hasPropertyQuota) {
                                        handlePublishWithActiveSubscription();
                                    } else if (isAgent && activeTab === "subscription") {
                                        handleSubscribeAndPublish();
                                    } else {
                                        onPayNow(selectedOneTimeTier === "with_reel");
                                    }
                                }}
                            >
                                <RiLockLine /> Continue Publishing
                            </button>
                            <button
                                type="button"
                                className={styles.warningSecondaryBtn}
                                onClick={handleConfirmExit}
                            >
                                Save as Draft &amp; Exit
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={styles.infoModalBody}>
                            {/* Error Alert */}
                            {errorMessage && (
                                <div className={styles.dangerBox}>
                                    <RiAlertLine size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Loading Overlay */}
                            {actionLoading && (
                                <div className={styles.warningBox} style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}>
                                    <RiLoader4Line size={20} className={styles.spinner} style={{ flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600 }}>{loadingMessage || "Processing..."}</span>
                                </div>
                            )}

                            {/* SCENARIO 1: Agent with Active Subscription and Available Quota */}
                            {isAgent && hasPropertyQuota && (
                                <div>
                                    <div className={styles.activeSubCard}>
                                        <div className={styles.activeSubCardHeader}>
                                            <div>
                                                <h4 className={styles.activeSubCardTitle}>{currentSub.plan_title}</h4>
                                                <span style={{ fontSize: "12px", color: "#065f46" }}>Active Agent Subscription</span>
                                            </div>
                                            <span className={styles.activeSubCardBadge}>Active</span>
                                        </div>

                                        <div className={styles.quotaBarTrack}>
                                            <div
                                                className={styles.quotaBarFill}
                                                style={{
                                                    width: currentSub.property_unlimited
                                                        ? "100%"
                                                        : `${Math.min(100, Math.round((currentSub.property_used / (currentSub.property_limit || 1)) * 100))}%`,
                                                }}
                                            />
                                        </div>

                                        <div className={styles.quotaMetaText}>
                                            <span>
                                                {currentSub.property_unlimited
                                                    ? `${currentSub.property_used} properties published`
                                                    : `${currentSub.property_used} / ${currentSub.property_limit} used`}
                                            </span>
                                            <span style={{ fontWeight: 700 }}>
                                                {currentSub.property_unlimited ? "Unlimited Remaining" : `${currentSub.property_remaining} Remaining`}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: "12px", fontSize: "12px", color: "#047857", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <RiCalendarLine size={14} />
                                            <span>Expires on: <strong>{currentSub.expires_at_formatted}</strong> ({currentSub.days_remaining} days left)</span>
                                        </div>
                                        <div style={{ marginTop: "6px", fontSize: "12px", color: "#065f46", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                                            <RiFilmLine size={14} />
                                            <span>Includes Malayalam AI Reel Creation (0 Reel Quota used)</span>
                                        </div>
                                    </div>

                                    {/* Warnings */}
                                    {isExpiringSoon && (
                                        <div className={styles.warningBox}>
                                            <RiAlertLine size={16} style={{ flexShrink: 0 }} />
                                            <span>Your subscription expires in {currentSub.days_remaining} days. Renew anytime to maintain uninterrupted publishing.</span>
                                        </div>
                                    )}

                                    {!currentSub.property_unlimited && currentSub.property_remaining <= 5 && (
                                        <div className={styles.warningBox}>
                                            <RiAlertLine size={16} style={{ flexShrink: 0 }} />
                                            <span>Only {currentSub.property_remaining} property listings remaining under your current plan.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SCENARIO 2: Agent with No Active Subscription OR Limit Reached OR Non-Agent */}
                            {(!hasPropertyQuota || quotaReached) && (
                                <div>
                                    {/* Notification if quota was reached */}
                                    {quotaReached && (
                                        <div className={styles.dangerBox}>
                                            <RiAlertLine size={18} style={{ flexShrink: 0 }} />
                                            <div>
                                                <strong>Property limit reached ({currentSub.property_limit}/{currentSub.property_limit}).</strong>
                                                <div style={{ fontSize: "11.5px", marginTop: "2px" }}>
                                                    {isTopupMode
                                                        ? "Your subscription is active! Top up property listings to continue publishing instantly."
                                                        : "Purchase a new subscription plan or continue with a normal single property payment."}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mode Selector for Agents: Agent Subscription vs Normal Listing */}
                                    {isAgent && (
                                        <div className={styles.subTabsRow}>
                                            <button
                                                type="button"
                                                className={`${styles.subTabBtn} ${activeTab === "subscription" ? styles.subTabBtnActive : ""}`}
                                                onClick={() => setActiveTab("subscription")}
                                            >
                                                {isTopupMode ? (
                                                    <RiFlashlightLine size={16} color={activeTab === "subscription" ? "#7c3aed" : "#64748b"} />
                                                ) : (
                                                    <RiVipCrownLine size={16} color={activeTab === "subscription" ? "#059669" : "#64748b"} />
                                                )}
                                                <span>{isTopupMode ? "Top-Up Plan" : "Agent Subscription"}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.subTabBtn} ${activeTab === "normal" ? styles.subTabBtnActive : ""}`}
                                                onClick={() => setActiveTab("normal")}
                                            >
                                                <RiFileTextLine size={16} />
                                                <span>One-Time Listing (₹{feeAmount} / ₹{bundleFeeAmount})</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* TAB 1: AGENT TOP-UP BOOSTER (When active subscription quota is exceeded) */}
                                    {isAgent && activeTab === "subscription" && isTopupMode && selectedTopupPlan && (
                                        <div>
                                            {topupPlans.length > 1 && (
                                                <div className={styles.planSelectorRow}>
                                                    {topupPlans.map((p) => (
                                                        <div
                                                            key={p.id}
                                                            className={`${styles.planSelectorItem} ${p.id === selectedTopupId ? styles.planSelectorItemActive : ""}`}
                                                            onClick={() => setSelectedTopupId(p.id)}
                                                        >
                                                            <span className={styles.planSelectorTitle}>{p.plan_title}</span>
                                                            <span className={styles.planSelectorPrice}>₹{p.price}</span>
                                                            <span className={styles.planSelectorDuration}>+{p.property_limit} Properties</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className={styles.planCardPaid} style={{ borderColor: "#8b5cf6" }}>
                                                <div className={styles.planCardHeader}>
                                                    <div className={styles.planTitleWrap}>
                                                        <span className={styles.planHighlightBadge} style={{ background: "#8b5cf6", color: "#fff" }}>
                                                            TOP-UP BOOSTER
                                                        </span>
                                                        <h4 className={styles.planName}>{selectedTopupPlan.plan_title}</h4>
                                                        <span className={styles.planHeadlineSub}>
                                                            Valid with your active plan until {currentSub.expires_at_formatted}
                                                        </span>
                                                    </div>
                                                    <div className={styles.planPriceWrap}>
                                                        <span className={styles.planPrice} style={{ color: "#6d28d9" }}>₹{selectedTopupPlan.price}</span>
                                                        <span className={styles.planPriceSub}>One-time top-up</span>
                                                    </div>
                                                </div>

                                                <ul className={styles.planFeaturesList}>
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiCheckLine className={styles.checkIcon} style={{ color: "#7c3aed" }} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>+{selectedTopupPlan.property_limit} Property Listings</span>
                                                            <span className={styles.featureDesc}>Instantly credited to your currently active subscription.</span>
                                                        </div>
                                                    </li>
                                                    {selectedTopupPlan.reel_limit > 0 && (
                                                        <li className={styles.featureItem}>
                                                            <div className={styles.featureCheckWrap}>
                                                                <RiFilmLine className={styles.checkIcon} style={{ color: "#7c3aed" }} />
                                                            </div>
                                                            <div className={styles.featureContent}>
                                                                <span className={styles.featureTitle}>+{selectedTopupPlan.reel_limit} Video Reels Spotlight Included</span>
                                                                <span className={styles.featureDesc}>Extra reels quota for video promotions.</span>
                                                            </div>
                                                        </li>
                                                    )}
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiFlashlightLine className={styles.checkIcon} style={{ color: "#7c3aed" }} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>Instant Property Activation</span>
                                                            <span className={styles.featureDesc}>Immediately publishes this property live upon top-up.</span>
                                                        </div>
                                                    </li>
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiShieldCheckLine className={styles.checkIcon} style={{ color: "#7c3aed" }} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>Verified Agent Listing</span>
                                                            <span className={styles.featureDesc}>Direct buyer inquiries and WhatsApp leads.</span>
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 1: AGENT BASE SUBSCRIPTION (When no active plan or plan is expired) */}
                                    {isAgent && activeTab === "subscription" && !isTopupMode && selectedPlan && (
                                        <div>
                                            {/* Plan Picker Tabs */}
                                            {plans.length > 1 && (
                                                <div className={styles.planSelectorRow}>
                                                    {plans.map((p) => (
                                                        <div
                                                            key={p.id}
                                                            className={`${styles.planSelectorItem} ${p.id === selectedPlanId ? styles.planSelectorItemActive : ""}`}
                                                            onClick={() => setSelectedPlanId(p.id)}
                                                        >
                                                            <span className={styles.planSelectorTitle}>{p.plan_title}</span>
                                                            <span className={styles.planSelectorPrice}>₹{p.price}</span>
                                                            <span className={styles.planSelectorDuration}>{p.duration_display}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Selected Plan Details Card */}
                                            <div className={styles.planCardPaid} style={{ borderColor: "#10b981" }}>
                                                <div className={styles.planCardHeader}>
                                                    <div className={styles.planTitleWrap}>
                                                        <span className={styles.planHighlightBadge} style={{ background: "#10b981", color: "#fff" }}>
                                                            AGENT SUBSCRIPTION
                                                        </span>
                                                        <h4 className={styles.planName}>{selectedPlan.plan_title}</h4>
                                                        <span className={styles.planHeadlineSub}>
                                                            Valid for {selectedPlan.duration_display} &bull; Save per listing
                                                        </span>
                                                    </div>
                                                    <div className={styles.planPriceWrap}>
                                                        <span className={styles.planPrice} style={{ color: "#065f46" }}>₹{selectedPlan.price}</span>
                                                        <span className={styles.planPriceSub}>Total fee</span>
                                                    </div>
                                                </div>

                                                <ul className={styles.planFeaturesList}>
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiCheckLine className={styles.checkIcon} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>
                                                                 {selectedPlan.property_unlimited
                                                                    ? "Unlimited Property Listings"
                                                                    : `${selectedPlan.property_limit} Property Listings Included`}
                                                            </span>
                                                            <span className={styles.featureDesc}>Post properties with instant live activation.</span>
                                                        </div>
                                                    </li>
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiFilmLine className={styles.checkIcon} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>
                                                                {selectedPlan.reel_unlimited
                                                                    ? "Unlimited Video Reels Spotlight"
                                                                    : `${selectedPlan.reel_limit} Video Reels Spotlight Included`}
                                                            </span>
                                                            <span className={styles.featureDesc}>Promote video reels directly in the social feed.</span>
                                                        </div>
                                                    </li>
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiFlashlightLine className={styles.checkIcon} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>Priority Buyer Reach</span>
                                                            <span className={styles.featureDesc}>Direct buyer WhatsApp inquiries and verified badge.</span>
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: ONE-TIME PROPERTY LISTING — CHOOSE ₹300 STANDARD OR ₹500 PROPERTY + REEL CREATION */}
                                    {(!isAgent || activeTab === "normal") && (
                                        <div>
                                            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569", marginBottom: "10px" }}>
                                                Choose your listing option:
                                            </div>
                                            <div className={styles.planSelectorRow} style={{ marginBottom: "14px" }}>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    className={`${styles.planSelectorItem} ${selectedOneTimeTier === "standard" ? styles.planSelectorItemActive : ""}`}
                                                    onClick={() => setSelectedOneTimeTier("standard")}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") setSelectedOneTimeTier("standard");
                                                    }}
                                                >
                                                    <span className={styles.planSelectorTitle}>Standard Property Listing</span>
                                                    <span className={styles.planSelectorPrice}>₹{feeAmount}</span>
                                                    <span className={styles.planSelectorDuration}>Listing Only</span>
                                                </div>

                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    className={`${styles.planSelectorItem} ${selectedOneTimeTier === "with_reel" ? styles.planSelectorItemActive : ""}`}
                                                    onClick={() => setSelectedOneTimeTier("with_reel")}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") setSelectedOneTimeTier("with_reel");
                                                    }}
                                                    style={
                                                        selectedOneTimeTier === "with_reel"
                                                            ? { borderColor: "#4f46e5", background: "#f5f3ff" }
                                                            : undefined
                                                    }
                                                >
                                                    <span className={styles.planSelectorTitle}>Listing + Reel Creation</span>
                                                    <span className={styles.planSelectorPrice} style={{ color: "#4f46e5" }}>
                                                        ₹{bundleFeeAmount}
                                                    </span>
                                                    <span className={styles.planSelectorDuration} style={{ color: "#4f46e5", fontWeight: 700 }}>
                                                        + Malayalam AI Reel
                                                    </span>
                                                </div>
                                            </div>

                                            {selectedOneTimeTier === "with_reel" ? (
                                                <div
                                                    className={styles.planCardPaid}
                                                    style={{ borderColor: "#6366f1", background: "linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)" }}
                                                >
                                                    <div className={styles.planCardHeader}>
                                                        <div className={styles.planTitleWrap}>
                                                            <span
                                                                className={styles.planHighlightBadge}
                                                                style={{ background: "#4f46e5", color: "#ffffff" }}
                                                            >
                                                                LISTING + AI REEL STUDIO
                                                            </span>
                                                            <h4 className={styles.planName}>Property Listing + Reel Creation</h4>
                                                            <span className={styles.planHeadlineSub}>
                                                                Publish Property &amp; Unlock Malayalam Speaking AI Video Studio
                                                            </span>
                                                        </div>
                                                        <div className={styles.planPriceWrap}>
                                                            <span className={styles.planPrice} style={{ color: "#4f46e5" }}>
                                                                ₹{bundleFeeAmount}
                                                            </span>
                                                            <span className={styles.planPriceSub}>One-time fee</span>
                                                        </div>
                                                    </div>
                                                    <ul className={styles.planFeaturesList}>
                                                        <li className={styles.featureItem}>
                                                            <div className={styles.featureCheckWrap}>
                                                                <RiFilmLine className={styles.checkIcon} style={{ color: "#4f46e5" }} />
                                                            </div>
                                                            <div className={styles.featureContent}>
                                                                <span className={styles.featureTitle}>Malayalam AI Reel Studio Unlocked</span>
                                                                <span className={styles.featureDesc}>
                                                                    Generate a 9:16 HD Malayalam narrated property video with subtitles directly from your uploaded photos &amp; description.
                                                                </span>
                                                            </div>
                                                        </li>
                                                        <li className={styles.featureItem}>
                                                            <div className={styles.featureCheckWrap}>
                                                                <RiCheckLine className={styles.checkIcon} style={{ color: "#4f46e5" }} />
                                                            </div>
                                                            <div className={styles.featureContent}>
                                                                <span className={styles.featureTitle}>Active Until Sold + Verified Badge</span>
                                                                <span className={styles.featureDesc}>
                                                                    Your property &amp; video gallery stay active until marked as sold.
                                                                </span>
                                                            </div>
                                                        </li>
                                                        <li className={styles.featureItem}>
                                                            <div className={styles.featureCheckWrap}>
                                                                <RiCheckLine className={styles.checkIcon} style={{ color: "#4f46e5" }} />
                                                            </div>
                                                            <div className={styles.featureContent}>
                                                                <span className={styles.featureTitle}>Direct Buyer Enquiries</span>
                                                                <span className={styles.featureDesc}>
                                                                    Receive unlimited calls and WhatsApp messages directly from buyers.
                                                                </span>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                </div>
                                            ) : (
                                                <div className={styles.planCardPaid}>
                                                    <div className={styles.planCardHeader}>
                                                        <div className={styles.planTitleWrap}>
                                                            <span className={styles.planHighlightBadge}>ONE-TIME LISTING</span>
                                                            <h4 className={styles.planName}>Standard Property Listing</h4>
                                                            <span className={styles.planHeadlineSub}>
                                                                List Once. Stay Active Until Sold. (Without Reel Creation)
                                                            </span>
                                                        </div>
                                                        <div className={styles.planPriceWrap}>
                                                            <span className={styles.planPrice}>₹{feeAmount}</span>
                                                            <span className={styles.planPriceSub}>One-time fee</span>
                                                        </div>
                                                    </div>
                                                    <ul className={styles.planFeaturesList}>
                                                        <li className={styles.featureItem}>
                                                            <div className={styles.featureCheckWrap}>
                                                                <RiCheckLine className={styles.checkIcon} />
                                                            </div>
                                                            <div className={styles.featureContent}>
                                                                <span className={styles.featureTitle}>Active Until Sold</span>
                                                                <span className={styles.featureDesc}>Your property stays listed until marked as sold.</span>
                                                            </div>
                                                        </li>
                                                        <li className={styles.featureItem}>
                                                            <div className={styles.featureCheckWrap}>
                                                                <RiCheckLine className={styles.checkIcon} />
                                                            </div>
                                                            <div className={styles.featureContent}>
                                                                <span className={styles.featureTitle}>Verified Listing Badge</span>
                                                                <span className={styles.featureDesc}>Build trust and stand out to serious buyers.</span>
                                                            </div>
                                                        </li>
                                                        <li className={styles.featureItem}>
                                                            <div className={styles.featureCheckWrap}>
                                                                <RiCheckLine className={styles.checkIcon} />
                                                            </div>
                                                            <div className={styles.featureContent}>
                                                                <span className={styles.featureTitle}>Direct Buyer Enquiries</span>
                                                                <span className={styles.featureDesc}>Receive unlimited calls and WhatsApp messages directly.</span>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Action Buttons */}
                        <div className={styles.infoModalFooter}>
                            {/* Case A: Active subscription + quota available */}
                            {isAgent && hasPropertyQuota ? (
                                <button
                                    type="button"
                                    className={styles.payNowBtn}
                                    style={{ background: "#059669" }}
                                    onClick={handlePublishWithActiveSubscription}
                                    disabled={actionLoading}
                                >
                                    <span>Publish Property Using Subscription</span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            ) : isAgent && isTopupMode && activeTab === "subscription" && selectedTopupPlan ? (
                                /* Case B1: Agent purchasing top-up booster */
                                <button
                                    type="button"
                                    className={styles.payNowBtn}
                                    style={{ background: "#7c3aed" }}
                                    onClick={handleTopupAndPublish}
                                    disabled={actionLoading || loadingData}
                                >
                                    <span>Top Up (₹{selectedTopupPlan.price}) &amp; Publish Property</span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            ) : isAgent && activeTab === "subscription" && selectedPlan ? (
                                /* Case B2: Agent purchasing base subscription */
                                <button
                                    type="button"
                                    className={styles.payNowBtn}
                                    style={{ background: "#059669" }}
                                    onClick={handleSubscribeAndPublish}
                                    disabled={actionLoading || loadingData}
                                >
                                    <span>Subscribe (₹{selectedPlan.price}) &amp; Publish Property</span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            ) : (
                                /* Case C: One-Time ₹300 Standard or ₹500 Listing + Reel Creation */
                                <button
                                    type="button"
                                    className={styles.payNowBtn}
                                    style={selectedOneTimeTier === "with_reel" ? { background: "#4f46e5" } : undefined}
                                    onClick={() => onPayNow(selectedOneTimeTier === "with_reel")}
                                    disabled={actionLoading}
                                >
                                    <span>
                                        {selectedOneTimeTier === "with_reel"
                                            ? `Pay ₹${bundleFeeAmount} & Publish + Unlock Reel`
                                            : `Pay ₹${feeAmount} & Publish Property`}
                                    </span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            )}

                            <button
                                type="button"
                                className={styles.warningSecondaryBtn}
                                style={{ width: "100%", marginTop: "6px" }}
                                onClick={handleConfirmExit}
                                disabled={actionLoading}
                            >
                                Save as Draft &amp; Exit
                            </button>

                            <div className={styles.securityNote}>
                                <RiLockLine size={14} />
                                <span>Secured with Razorpay &bull; Instant Activation</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
