"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./reelPayment.module.css";
import {
    RiCloseLine,
    RiSparklingFill,
    RiCheckLine,
    RiAlertLine,
    RiLockLine,
    RiArrowRightLine,
    RiFilmLine,
    RiWhatsappLine,
    RiSpeedUpLine,
    RiShieldCheckLine,
    RiVipCrownLine,
    RiCalendarLine,
    RiLoader4Line,
    RiFlashlightLine,
} from "react-icons/ri";
import { reelPaymentApi } from "../lib/reelsApi";
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

export default function ReelInfoModal({
    isOpen,
    onClose,
    onPayNow,
    reelId,
    onPublishSuccess,
    user,
    skipExitWarning = false,
}) {
    const router = useRouter();
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [feeAmount, setFeeAmount] = useState(100);

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

    const fetchModalData = useCallback(async () => {
        if (!isOpen) return;
        setLoadingData(true);
        setErrorMessage("");

        try {
            // 1. Get payment configuration
            const configRes = await reelPaymentApi.getConfig().catch(() => null);
            if (configRes?.data?.reel_fee) {
                setFeeAmount(configRes.data.reel_fee);
            }

            // 2. Check reel status if reelId is provided
            let reelStatus = null;
            if (reelId) {
                reelStatus = await reelPaymentApi.getStatus(reelId).catch(() => null);
            }

            // Auto-publish immediately if admin granted free reel access or reel is already paid
            const userFreeOverride =
                Boolean(reelStatus?.data?.is_free) ||
                user?.pay_for_reels === 0 ||
                user?.pay_for_reels === false;
            if (reelId && (userFreeOverride || reelStatus?.data?.already_paid)) {
                await reelPaymentApi.createOrder(reelId).catch(() => null);
                if (onPublishSuccess) onPublishSuccess(reelStatus?.data);
                if (onClose) onClose();
                return;
            }

            // 3. Check current subscription, base plans & top-up plans (filtered specifically for reels)
            const preferredCategory =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("plan_category")
                    : null;
            const [subRes, plansRes, topupRes] = await Promise.all([
                agentSubscriptionApi.getCurrentSubscription(preferredCategory, "reel").catch(() => null),
                agentSubscriptionApi.getPlans().catch(() => null),
                agentSubscriptionApi.getTopupPlans("reel").catch(() => null),
            ]);

            const agentFlag = Boolean(
                reelStatus?.data?.is_agent ||
                subRes?.is_agent ||
                user?.role === "agent" ||
                user?.role_val === "agent" ||
                user?.role === "Agent" ||
                user?.role_val === "Agent"
            );
            setIsAgent(agentFlag);

            const activeSubscription = subRes?.data?.subscription || null;
            setCurrentSub(activeSubscription);

            const availablePlans = plansRes?.data || [];
            setPlans(availablePlans);

            if (availablePlans.length > 0) {
                const defaultPlan = availablePlans.find((p) => p.price >= 500) || availablePlans[0];
                setSelectedPlanId(defaultPlan.id);
            }

            // Only show top-up plans that actually provide reel spotlights!
            const availableTopups = (topupRes?.data || []).filter(
                (p) => p.reel_limit > 0 || p.reel_unlimited
            );
            setTopupPlans(availableTopups);
            if (availableTopups.length > 0) {
                setSelectedTopupId(availableTopups[0].id);
            }

            if (!agentFlag) {
                setActiveTab("normal");
            } else if (activeSubscription && activeSubscription.is_active) {
                setActiveTab("subscription");
            }
        } catch (err) {
            console.warn("[ReelInfoModal] Error loading data:", err);
        } finally {
            setLoadingData(false);
        }
    }, [isOpen, reelId, user]);

    useEffect(() => {
        if (!isOpen) {
            setShowExitWarning(false);
            setErrorMessage("");
            return;
        }

        fetchModalData();

        const handleKeyDown = (e) => {
            if (e.key === "Escape" && !actionLoading) {
                setShowExitWarning(false);
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose, actionLoading, fetchModalData]);

    if (!isOpen) return null;

    const handleConfirmExit = () => {
        if (actionLoading) return;
        setShowExitWarning(false);
        onClose();
    };

    const handleAttemptClose = () => {
        if (actionLoading) return;
        if (skipExitWarning || showExitWarning) {
            handleConfirmExit();
        } else {
            setShowExitWarning(true);
        }
    };

    // Calculate subscription states
    const hasActiveSub = !!(currentSub && currentSub.is_active && !currentSub.is_expired);
    const hasReelQuota = hasActiveSub && (currentSub.reel_unlimited || currentSub.reel_remaining > 0);
    const quotaReached = hasActiveSub && !currentSub.reel_unlimited && currentSub.reel_remaining <= 0;
    const isTopupMode = quotaReached && topupPlans.length > 0;
    const isExpiringSoon = hasActiveSub && currentSub.is_expiring_soon;

    const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
    const selectedTopupPlan = topupPlans.find((p) => p.id === selectedTopupId) || topupPlans[0];

    // Direct publish using active subscription
    const handlePublishWithActiveSubscription = async () => {
        if (!reelId) return;
        setActionLoading(true);
        setLoadingMessage("Publishing reel using subscription quota...");
        setErrorMessage("");

        try {
            const preferredCategory =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("plan_category")
                    : currentSub?.category || null;
            const res = await agentSubscriptionApi.publishWithSubscription(
                "reel",
                reelId,
                preferredCategory
            );
            if (res?.success) {
                if (onPublishSuccess) {
                    onPublishSuccess(res.data);
                }
                if (onClose) {
                    onClose();
                }
                router.push("/profile/posted-reels");
            } else {
                setErrorMessage(res?.message || "Failed to publish reel with subscription.");
            }
        } catch (err) {
            setErrorMessage(err.message || "An error occurred while publishing.");
        } finally {
            setActionLoading(false);
            setLoadingMessage("");
        }
    };

    // Purchase subscription and then publish reel
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

            const orderRes = await agentSubscriptionApi.createOrder(selectedPlan.id);
            if (!orderRes?.success) {
                // If the agent already has an active subscription, publish using their existing quota and redirect!
                if (orderRes?.status === 409 || orderRes?.message?.includes("already have an active Agent Subscription")) {
                    setLoadingMessage("Active subscription detected! Publishing reel with your quota...");
                    await fetchModalData();
                    if (reelId) {
                        const pubRes = await agentSubscriptionApi.publishWithSubscription("reel", reelId);
                        if (pubRes?.success) {
                            if (onPublishSuccess) onPublishSuccess(pubRes.data);
                            if (onClose) onClose();
                            router.push("/profile/posted-reels");
                            return;
                        }
                    }
                }
                throw new Error(orderRes?.message || "Failed to create subscription order.");
            }

            const orderData = orderRes.data;

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
                        const verifyRes = await agentSubscriptionApi.verifyPayment({
                            plan_id: selectedPlan.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (!verifyRes?.success) {
                            throw new Error(verifyRes?.message || "Payment verification failed.");
                        }

                        if (reelId) {
                            setLoadingMessage("Subscription active! Publishing your reel...");
                            try {
                                const pubRes = await agentSubscriptionApi.publishWithSubscription("reel", reelId);
                                if (pubRes?.success) {
                                    if (onPublishSuccess) onPublishSuccess(pubRes.data);
                                    if (onClose) onClose();
                                    router.push("/profile/posted-reels");
                                    return;
                                }
                            } catch (e) {
                                console.warn("Auto publish reel notice:", e);
                            }
                        }

                        if (onPublishSuccess) onPublishSuccess();
                        if (onClose) onClose();
                        router.push("/profile/posted-reels");
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

    // Purchase top-up and then publish reel
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
                            throw new Error(verifyRes?.message || "Payment verification failed.");
                        }

                        if (reelId) {
                            setLoadingMessage("Top-up active! Publishing your reel...");
                            const pubRes = await agentSubscriptionApi.publishWithSubscription("reel", reelId);
                            if (pubRes?.success) {
                                if (onPublishSuccess) onPublishSuccess(pubRes.data);
                                if (onClose) onClose();
                                router.push("/profile/posted-reels");
                                return;
                            } else {
                                throw new Error(pubRes?.message || "Could not publish reel under subscription.");
                            }
                        }

                        if (onPublishSuccess) onPublishSuccess();
                        if (onClose) onClose();
                        router.push("/profile/posted-reels");
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
                            <RiSparklingFill /> KeralaPlots Spotlight
                        </span>
                        <h3 className={styles.infoModalTitle}>
                            {hasReelQuota ? "Confirm & Publish Reel" : "Publish & Spotlight Your Reel"}
                        </h3>
                    </div>
                    <button
                        type="button"
                        className={styles.infoModalCloseBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmExit();
                        }}
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
                        <h4 className={styles.warningTitle}>Payment Required to Publish Reel</h4>
                        <p className={styles.warningDesc}>
                            Your reel is safely stored as a <strong>draft</strong>. Complete the one-time fee or use your Agent Subscription to launch your reel into KeralaPlots' public feed and start getting buyer inquiries.
                        </p>
                        <div className={styles.warningActions}>
                            <button
                                type="button"
                                className={styles.warningPrimaryBtn}
                                onClick={() => {
                                    setShowExitWarning(false);
                                    if (hasReelQuota) {
                                        handlePublishWithActiveSubscription();
                                    } else if (isAgent && activeTab === "subscription") {
                                        handleSubscribeAndPublish();
                                    } else {
                                        onPayNow();
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
                            {errorMessage && (
                                <div className={styles.dangerBox}>
                                    <RiAlertLine size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {actionLoading && (
                                <div className={styles.warningBox} style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}>
                                    <RiLoader4Line size={20} className={styles.spinner} style={{ flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600 }}>{loadingMessage || "Processing..."}</span>
                                </div>
                            )}

                            {/* SCENARIO 1: Agent with Active Subscription and Available Reel Quota */}
                            {isAgent && hasReelQuota && (
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
                                                    width: currentSub.reel_unlimited
                                                        ? "100%"
                                                        : `${Math.min(100, Math.round((currentSub.reel_used / (currentSub.reel_limit || 1)) * 100))}%`,
                                                }}
                                            />
                                        </div>

                                        <div className={styles.quotaMetaText}>
                                            <span>
                                                {currentSub.reel_unlimited
                                                    ? `${currentSub.reel_used} reels published`
                                                    : `${currentSub.reel_used} / ${currentSub.reel_limit} used`}
                                            </span>
                                            <span style={{ fontWeight: 700 }}>
                                                {currentSub.reel_unlimited ? "Unlimited Remaining" : `${currentSub.reel_remaining} Reels Remaining`}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: "12px", fontSize: "12px", color: "#047857", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <RiCalendarLine size={14} />
                                            <span>Expires on: <strong>{currentSub.expires_at_formatted}</strong> ({currentSub.days_remaining} days left)</span>
                                        </div>
                                    </div>

                                    {isExpiringSoon && (
                                        <div className={styles.warningBox}>
                                            <RiAlertLine size={16} style={{ flexShrink: 0 }} />
                                            <span>Your subscription expires in {currentSub.days_remaining} days. Renew anytime to maintain uninterrupted publishing.</span>
                                        </div>
                                    )}

                                    {!currentSub.reel_unlimited && currentSub.reel_remaining <= 5 && (
                                        <div className={styles.warningBox}>
                                            <RiAlertLine size={16} style={{ flexShrink: 0 }} />
                                            <span>Only {currentSub.reel_remaining} reels remaining under your current subscription plan.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SCENARIO 2: No Subscription OR Limit Reached OR Non-Agent */}
                            {(!hasReelQuota || quotaReached) && (
                                <div>
                                    {quotaReached && (
                                        <div className={styles.dangerBox}>
                                            <RiAlertLine size={18} style={{ flexShrink: 0 }} />
                                            <div>
                                                <strong>Reel limit reached ({currentSub.reel_used}/{currentSub.reel_limit}).</strong>
                                                <div style={{ fontSize: "11.5px", marginTop: "2px" }}>
                                                    {isTopupMode ? (
                                                        <span>
                                                            Your subscription is active until <strong>{currentSub.expires_at_formatted}</strong>. Avail a top-up plan below to instantly add video reels and publish!
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            Your subscription limit has been reached. Purchase a new subscription plan or continue with a normal single reel promotion.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab switcher for Agents */}
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
                                                <RiFilmLine size={16} />
                                                <span>Normal Reel (₹{feeAmount})</span>
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
                                                            <span className={styles.planSelectorDuration}>+{p.reel_limit} Reels</span>
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
                                                            <RiFilmLine className={styles.checkIcon} style={{ color: "#7c3aed" }} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>+{selectedTopupPlan.reel_limit} Video Reels Spotlight</span>
                                                            <span className={styles.featureDesc}>Instantly credited to your currently active subscription.</span>
                                                        </div>
                                                    </li>
                                                    {selectedTopupPlan.property_limit > 0 && (
                                                        <li className={styles.featureItem}>
                                                            <div className={styles.featureCheckWrap}>
                                                                <RiCheckLine className={styles.checkIcon} style={{ color: "#7c3aed" }} />
                                                            </div>
                                                            <div className={styles.featureContent}>
                                                                <span className={styles.featureTitle}>+{selectedTopupPlan.property_limit} Property Listings Included</span>
                                                                <span className={styles.featureDesc}>Extra property publishing quota added.</span>
                                                            </div>
                                                        </li>
                                                    )}
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiSpeedUpLine className={styles.checkIcon} style={{ color: "#7c3aed" }} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>Instant Reel Publishing</span>
                                                            <span className={styles.featureDesc}>Immediately publishes this video reel upon top-up.</span>
                                                        </div>
                                                    </li>
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiWhatsappLine className={styles.checkIcon} style={{ color: "#7c3aed" }} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>Direct Buyer Leads</span>
                                                            <span className={styles.featureDesc}>Direct buyer WhatsApp inquiries from reel views.</span>
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 1: AGENT BASE SUBSCRIPTION (When no active plan or plan is expired) */}
                                    {isAgent && activeTab === "subscription" && !isTopupMode && selectedPlan && (
                                        <div>
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

                                            <div className={styles.planCardPaid} style={{ borderColor: "#10b981" }}>
                                                <div className={styles.planCardHeader}>
                                                    <div className={styles.planTitleWrap}>
                                                        <span className={styles.planHighlightBadge} style={{ background: "#10b981", color: "#fff" }}>
                                                            AGENT SUBSCRIPTION
                                                        </span>
                                                        <h4 className={styles.planName}>{selectedPlan.plan_title}</h4>
                                                        <span className={styles.planHeadlineSub}>
                                                            Valid for {selectedPlan.duration_display} &bull; Properties &amp; Reels
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
                                                            <RiFilmLine className={styles.checkIcon} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>
                                                                {selectedPlan.reel_unlimited
                                                                    ? "Unlimited Video Reels Spotlight"
                                                                    : `${selectedPlan.reel_limit} Video Reels Spotlight Included`}
                                                            </span>
                                                            <span className={styles.featureDesc}>Instant video stream placement in buyer feed.</span>
                                                        </div>
                                                    </li>
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
                                                            <span className={styles.featureDesc}>Full verified property publishing included.</span>
                                                        </div>
                                                    </li>
                                                    <li className={styles.featureItem}>
                                                        <div className={styles.featureCheckWrap}>
                                                            <RiSpeedUpLine className={styles.checkIcon} />
                                                        </div>
                                                        <div className={styles.featureContent}>
                                                            <span className={styles.featureTitle}>Direct Buyer Leads</span>
                                                            <span className={styles.featureDesc}>Direct buyer WhatsApp inquiries from reel views.</span>
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: NORMAL REEL SPOTLIGHT */}
                                    {(!isAgent || activeTab === "normal") && (
                                        <div className={styles.planCardPaid}>
                                            <div className={styles.planCardHeader}>
                                                <div className={styles.planTitleWrap}>
                                                    <span className={styles.planHighlightBadge}>FEATURED SPOTLIGHT</span>
                                                    <h4 className={styles.planName}>Spotlight Video Promotion</h4>
                                                    <span className={styles.planHeadlineSub}>Boost views &amp; reach 10,000+ active property seekers</span>
                                                </div>
                                                <div className={styles.planPriceWrap}>
                                                    <span className={styles.planPrice}>₹{feeAmount}</span>
                                                    <span className={styles.planPriceSub}>One-time fee</span>
                                                </div>
                                            </div>

                                            <ul className={styles.planFeaturesList}>
                                                <li className={styles.featureItem}>
                                                    <div className={styles.featureCheckWrap}>
                                                        <RiSpeedUpLine className={styles.checkIcon} />
                                                    </div>
                                                    <div className={styles.featureContent}>
                                                        <span className={styles.featureTitle}>Priority Placement in Reels Feed</span>
                                                        <span className={styles.featureDesc}>Shown to high-intent property buyers across Kerala.</span>
                                                    </div>
                                                </li>
                                                <li className={styles.featureItem}>
                                                    <div className={styles.featureCheckWrap}>
                                                        <RiWhatsappLine className={styles.checkIcon} />
                                                    </div>
                                                    <div className={styles.featureContent}>
                                                        <span className={styles.featureTitle}>Direct WhatsApp &amp; Call Inquiries</span>
                                                        <span className={styles.featureDesc}>Buyers can contact you instantly while watching your video.</span>
                                                    </div>
                                                </li>
                                                <li className={styles.featureItem}>
                                                    <div className={styles.featureCheckWrap}>
                                                        <RiShieldCheckLine className={styles.checkIcon} />
                                                    </div>
                                                    <div className={styles.featureContent}>
                                                        <span className={styles.featureTitle}>Verified Spotlight Badge</span>
                                                        <span className={styles.featureDesc}>Enhance trust and profile credibility with verified reel status.</span>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className={styles.infoModalFooter}>
                            {isAgent && hasReelQuota ? (
                                <button
                                    type="button"
                                    className={styles.payNowBtn}
                                    style={{ background: "#059669" }}
                                    onClick={handlePublishWithActiveSubscription}
                                    disabled={actionLoading}
                                >
                                    <span>Publish Reel Using Subscription</span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            ) : isAgent && isTopupMode && activeTab === "subscription" && selectedTopupPlan ? (
                                <button
                                    type="button"
                                    className={styles.payNowBtn}
                                    style={{ background: "#7c3aed" }}
                                    onClick={handleTopupAndPublish}
                                    disabled={actionLoading || loadingData}
                                >
                                    <span>Top Up (₹{selectedTopupPlan.price}) &amp; Publish Reel</span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            ) : isAgent && activeTab === "subscription" && selectedPlan ? (
                                <button
                                    type="button"
                                    className={styles.payNowBtn}
                                    style={{ background: "#059669" }}
                                    onClick={handleSubscribeAndPublish}
                                    disabled={actionLoading || loadingData}
                                >
                                    <span>Subscribe (₹{selectedPlan.price}) &amp; Publish Reel</span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.payNowBtn}
                                    onClick={onPayNow}
                                    disabled={actionLoading}
                                >
                                    <span>Pay ₹{feeAmount} &amp; Publish Reel</span>
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
