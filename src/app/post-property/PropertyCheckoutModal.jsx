"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./propertyCheckout.module.css";
import { RiCloseLine, RiLockLine, RiLoader4Line } from "react-icons/ri";
import { propertyPaymentApi } from "../lib/propertyWizardApi";

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

export default function PropertyCheckoutModal({
    isOpen,
    onClose,
    propertyId,
    includeReel = false,
    user,
    onSuccess,
    showToast,
}) {
    const [loadingOrder, setLoadingOrder] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);
    const [isPaying, setIsPaying] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState("");

    // Fetch or prepare order info as soon as checkout modal opens
    useEffect(() => {
        if (!isOpen || !propertyId) return;

        let isMounted = true;
        setLoadingOrder(true);
        setOrderInfo(null);
        setError("");

        // Preload Razorpay checkout script
        loadRazorpayScript();

        propertyPaymentApi
            .createOrder(propertyId, { includeReel })
            .then((res) => {
                if (!isMounted) return;
                setLoadingOrder(false);
                if (res?.already_paid) {
                    showToast("This property is already paid and published.");
                    onSuccess(res.data);
                } else if (res?.success && res.data) {
                    setOrderInfo(res.data);
                } else {
                    setError(res?.message || "Failed to initialize order.");
                }
            })
            .catch((err) => {
                if (!isMounted) return;
                setLoadingOrder(false);
                console.error("Order creation error:", err);
                setError(err.response?.data?.message || err.message || "Failed to connect to payment server.");
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, propertyId, includeReel]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && !isPaying && !isVerifying) onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isPaying, isVerifying, onClose]);

    if (!isOpen) return null;

    const handleProceedToPay = async () => {
        setError("");
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            setError("Razorpay SDK failed to load. Are you online?");
            showToast("Failed to load Razorpay SDK. Please check your internet connection.");
            return;
        }

        let activeOrder = orderInfo;
        if (!activeOrder) {
            setIsPaying(true);
            try {
                const res = await propertyPaymentApi.createOrder(propertyId, { includeReel });
                if (res?.already_paid) {
                    showToast("Property is already paid.");
                    onSuccess(res.data);
                    return;
                }
                if (res?.success && res.data) {
                    activeOrder = res.data;
                    setOrderInfo(res.data);
                } else {
                    throw new Error(res?.message || "Could not generate order.");
                }
            } catch (err) {
                setIsPaying(false);
                setError(err.response?.data?.message || err.message || "Failed to create order.");
                return;
            }
        }

        setIsPaying(true);

        const options = {
            key: activeOrder.key || "rzp_live_S0BwHgz1FGjzhX",
            amount: activeOrder.amount_in_paise,
            currency: activeOrder.currency || "INR",
            name: "KeralaPlots.com",
            description: `${activeOrder.service || (includeReel ? "Property Listing + AI Reel Creation" : "Standard Property Listing")}: ${activeOrder.property_title || "Property Listing"}`,
            image: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public",
            order_id: activeOrder.order_id,
            handler: async function (response) {
                setIsVerifying(true);
                try {
                    const verifyRes = await propertyPaymentApi.verifyPayment({
                        property_id: propertyId,
                        include_reel: Boolean(includeReel),
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    });

                    if (verifyRes?.success) {
                        showToast("Payment verified! Your property is now published. 🎉");
                        onSuccess(verifyRes.data);
                    } else {
                        throw new Error(verifyRes?.message || "Payment verification failed.");
                    }
                } catch (err) {
                    console.error("Verification error:", err);
                    setError(err.response?.data?.message || err.message || "Payment signature verification failed.");
                    showToast("Payment verification failed. Please contact support.");
                } finally {
                    setIsVerifying(false);
                    setIsPaying(false);
                }
            },
            prefill: {
                name: activeOrder.user_name || user?.username || user?.name || "",
                email: activeOrder.user_email || user?.email || "",
                contact: activeOrder.user_contact || user?.mobile || "",
            },
            theme: {
                color: "#2b4932",
            },
            modal: {
                ondismiss: function () {
                    setIsPaying(false);
                },
            },
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (failResponse) {
                console.error("Payment failed:", failResponse.error);
                setError(failResponse.error.description || "Payment failed. Please try again.");
                setIsPaying(false);
            });
            rzp.open();
        } catch (err) {
            console.error("Razorpay open error:", err);
            setError("Could not open Razorpay checkout.");
            setIsPaying(false);
        }
    };

    const displayAmount = orderInfo?.amount || (includeReel ? 500 : 300);
    const displayService =
        orderInfo?.service ||
        (includeReel ? "Property Listing + AI Reel Creation" : "Standard Property Listing");
    const displayUser = orderInfo?.user_name || user?.username || user?.name || "Member";

    return createPortal(
        <div className={styles.modalOverlay} onClick={(!isPaying && !isVerifying) ? onClose : undefined} role="dialog" aria-modal="true">
            <div className={styles.checkoutCard} onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button
                    type="button"
                    className={styles.checkoutCardCloseBtn}
                    onClick={onClose}
                    disabled={isPaying || isVerifying}
                    aria-label="Close"
                >
                    <RiCloseLine size={20} />
                </button>

                {/* Left Panel: Olive/Forest Green with branding & fee summary */}
                <div className={styles.checkoutLeft}>
                    <div className={styles.brandLogoArea}>
                        <h2 className={styles.brandLogoTitle}>keralaplots.com</h2>
                        <span className={styles.brandLogoTagline}>malayali's realestate partner</span>
                    </div>

                    <div className={styles.feeDetailsArea}>
                        <p className={styles.feeHeaderLabel}>Property Listing Fee</p>
                        <div className={styles.feeAmount}>₹{displayAmount}</div>

                        <div className={styles.feeMetaList}>
                            <div className={styles.feeMetaItem}>
                                <span className={styles.feeMetaLabel}>Service:</span>
                                <span className={styles.feeMetaValue}>{displayService}</span>
                            </div>
                            <div className={styles.feeMetaItem}>
                                <span className={styles.feeMetaLabel}>Validity:</span>
                                <span className={styles.feeMetaValue}>Lifetime</span>
                            </div>
                            <div className={styles.feeMetaItem}>
                                <span className={styles.feeMetaLabel}>User:</span>
                                <span className={styles.feeMetaValue}>{displayUser}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Clean White Checkout Form */}
                <div className={styles.checkoutRight}>
                    <h3 className={styles.checkoutTitle}>Secure Checkout</h3>
                    <p className={styles.checkoutSubtitle}>
                        You are one step away from listing your property on Kerala's most trusted real estate partner.
                    </p>

                    <button
                        type="button"
                        className={styles.proceedPayBtn}
                        onClick={handleProceedToPay}
                        disabled={loadingOrder || isPaying || isVerifying}
                    >
                        {isVerifying ? (
                            <>
                                <RiLoader4Line className={styles.spinner} size={18} />
                                Verifying Payment…
                            </>
                        ) : isPaying ? (
                            <>
                                <RiLoader4Line className={styles.spinner} size={18} />
                                Processing…
                            </>
                        ) : loadingOrder ? (
                            <>
                                <RiLoader4Line className={styles.spinner} size={18} />
                                Initializing…
                            </>
                        ) : (
                            `Proceed to Pay ₹${displayAmount}`
                        )}
                    </button>

                    {error && <div className={styles.paymentErrorMsg}>{error}</div>}

                    <div className={styles.securityNote}>
                        <RiLockLine size={14} />
                        <span>SSL Secure & Encrypted Payment via Razorpay</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
