"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Nav from "../../componants/nav/nav";
import ProfileSidebar from "../../componants/profileSidebar/profileSidebar";
import profileStyles from "../../profile/profile.module.css";
import styles from "./subscription.module.css";
import {
    RiVipCrownLine,
    RiShieldCheckLine,
    RiCheckLine,
    RiAlertLine,
    RiBuildingLine,
    RiFilmLine,
    RiCalendarLine,
    RiFlashlightLine,
    RiHistoryLine,
    RiLoader4Line,
    RiPrinterLine,
    RiFileTextLine,
} from "react-icons/ri";
import { agentSubscriptionApi } from "../../lib/agentSubscriptionApi";
import AgentSubscriptionDashboardCard from "../../profile/AgentSubscriptionDashboardCard";
import { useAuth } from "../../context/AuthContext";
import dynamic from "next/dynamic";
const InvoiceModal = dynamic(() => import("../../componants/invoice/InvoiceModal"), { ssr: false });

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

export default function AgentSubscriptionPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
            router.replace(redirectUrl);
        }
    }, [isAuthenticated, authLoading, router, pathname]);

    const [loading, setLoading] = useState(true);
    const [subData, setSubData] = useState(null);
    const [isAgent, setIsAgent] = useState(false);
    const [plans, setPlans] = useState([]);
    const [topupPlans, setTopupPlans] = useState([]);
    const [history, setHistory] = useState([]);
    const [purchasingPlanId, setPurchasingPlanId] = useState(null);
    const [purchasingTopupId, setPurchasingTopupId] = useState(null);
    const [toast, setToast] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [curRes, plansRes, histRes, topupRes] = await Promise.all([
                agentSubscriptionApi.getCurrentSubscription(),
                agentSubscriptionApi.getPlans(),
                agentSubscriptionApi.getHistory(),
                agentSubscriptionApi.getTopupPlans(),
            ]);

            if (curRes?.success) {
                setIsAgent(!!curRes.is_agent);
                setSubData(curRes.data?.subscription || null);
            }
            if (plansRes?.success) {
                setPlans(plansRes.data || []);
            }
            if (histRes?.success) {
                setHistory(histRes.data || []);
            }
            if (topupRes?.success) {
                setTopupPlans(topupRes.data || []);
            }
        } catch (err) {
            console.error("[AgentSubscriptionPage] Error loading data:", err);
            setErrorMsg("Could not load subscription details. Please refresh the page.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        }
        const handleStorage = (e) => {
            if (e.key === "kp_subscriptions_updated_at" && isAuthenticated) {
                loadData();
            }
        };
        window.addEventListener("storage", handleStorage);
        let bcSubs = null;
        try {
            if (typeof BroadcastChannel !== "undefined") {
                bcSubs = new BroadcastChannel("kp_subscriptions_sync");
                bcSubs.onmessage = () => {
                    if (isAuthenticated) loadData();
                };
            }
        } catch {
            // ignore
        }
        return () => {
            window.removeEventListener("storage", handleStorage);
            if (bcSubs) bcSubs.close();
        };
    }, [isAuthenticated, loadData]);

    const openHistoryInvoice = (h) => {
        const isTopup = h.plan_type === "topup";
        const isBuilderRole =
            h.category === "builder_subscription" || h.category === "builder_topup";
        const payload = isTopup
            ? {
                  type: "topup",
                  invoice_no: h.invoice_no,
                  title: `${h.plan_title} (Top-Up Plan)`,
                  amount: h.price,
                  payment_id: h.razorpay_payment_id || h.payment_id || "Paid",
                  order_id: h.razorpay_order_id || "N/A",
                  date: h.started_at_formatted || "",
                  time: h.time_formatted || "",
                  customer: {
                      name: user?.name || user?.personal_details?.fullname || user?.username || "Member",
                      role: isBuilderRole ? "Builder" : "Agent",
                      phone: user?.phone || user?.personal_details?.phone_number,
                      email: user?.email,
                  },
                  details: {
                      plan_title: h.plan_title,
                      parent_plan_title: h.parent_plan_title,
                      expires_at: h.expires_at_formatted,
                      projects_added: h.project_limit || 0,
                      units_added: h.unit_limit || 0,
                      properties_added: h.property_limit || 0,
                      reels_added: h.reel_limit || 0,
                  },
              }
            : {
                  type: "subscription",
                  invoice_no: h.invoice_no,
                  title: `${h.plan_title} Plan`,
                  amount: h.price,
                  payment_id: h.razorpay_payment_id || h.payment_id || "Paid",
                  order_id: h.razorpay_order_id || "N/A",
                  date: h.started_at_formatted || "",
                  customer: {
                      name: user?.name || user?.personal_details?.fullname || user?.username || "Member",
                      role: isBuilderRole ? "Builder" : "Agent",
                      phone: user?.phone || user?.personal_details?.phone_number,
                      email: user?.email,
                  },
                  details: {
                      plan_title: h.plan_title,
                      duration: `${h.duration_value} ${h.duration_unit}`,
                      property_limit: h.property_unlimited ? "Unlimited" : h.property_limit,
                      reel_limit: h.reel_unlimited ? "Unlimited" : h.reel_limit,
                      started_at: h.started_at_formatted,
                      expires_at: h.expires_at_formatted,
                      days_pending: h.days_remaining,
                      reels_pending: h.reel_remaining,
                      properties_pending: h.property_remaining,
                      reels_used: h.reel_used,
                      properties_used: h.property_used,
                  },
              };
        setSelectedInvoice(payload);
        setShowInvoiceModal(true);
    };

    const handleSubscribe = async (plan) => {
        setPurchasingPlanId(plan.id);
        setErrorMsg("");

        try {
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error("Razorpay failed to load. Please check your internet connection.");
            }

            // 1. Create Order
            const orderRes = await agentSubscriptionApi.createOrder(plan.id);
            if (!orderRes?.success) {
                throw new Error(orderRes?.message || "Failed to initialize subscription order.");
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
                    color: "#10b981",
                },
                handler: async function (response) {
                    try {
                        const verifyRes = await agentSubscriptionApi.verifyPayment({
                            plan_id: plan.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (!verifyRes?.success) {
                            throw new Error(verifyRes?.message || "Verification failed.");
                        }

                        showToast(`Successfully subscribed to ${plan.plan_title}! 🎉`);
                        loadData();
                    } catch (vErr) {
                        setErrorMsg(vErr.message || "Failed to activate subscription.");
                    } finally {
                        setPurchasingPlanId(null);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setPurchasingPlanId(null);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (fRes) {
                setPurchasingPlanId(null);
                setErrorMsg(fRes.error?.description || "Payment failed.");
            });
            rzp.open();
        } catch (err) {
            setPurchasingPlanId(null);
            setErrorMsg(err.message || "Checkout failed.");
        }
    };

    const handleTopupSubscribe = async (plan) => {
        setPurchasingTopupId(plan.id);
        setErrorMsg("");

        try {
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error("Razorpay failed to load. Please check your internet connection.");
            }

            const orderRes = await agentSubscriptionApi.createTopupOrder(plan.id);
            if (!orderRes?.success) {
                throw new Error(orderRes?.message || "Failed to initialize top-up order.");
            }

            const orderData = orderRes.data;

            const options = {
                key: orderData.key,
                amount: orderData.amount_in_paise,
                currency: orderData.currency || "INR",
                name: "KeralaPlots",
                description: `${orderData.plan_title} Top-Up Booster`,
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
                    try {
                        const verifyRes = await agentSubscriptionApi.verifyTopupPayment({
                            plan_id: plan.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (!verifyRes?.success) {
                            throw new Error(verifyRes?.message || "Verification failed.");
                        }

                        showToast(`Top-up applied! +${plan.property_limit || 0} Properties & +${plan.reel_limit || 0} Reels added 🎉`);
                        loadData();
                    } catch (vErr) {
                        setErrorMsg(vErr.message || "Failed to activate top-up.");
                    } finally {
                        setPurchasingTopupId(null);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setPurchasingTopupId(null);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (fRes) {
                setPurchasingTopupId(null);
                setErrorMsg(fRes.error?.description || "Payment failed.");
            });
            rzp.open();
        } catch (err) {
            setPurchasingTopupId(null);
            setErrorMsg(err.message || "Checkout failed.");
        }
    };

    const hasActiveSub = !!(subData && subData.is_active);
    const isQuotaExceeded = hasActiveSub && (
        (!subData.property_unlimited && subData.property_remaining <= 0) ||
        (!subData.reel_unlimited && subData.reel_remaining <= 0)
    );

    if (authLoading) {
        return (
            <>
                <Nav />
                <div className={profileStyles.page}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "60vh",
                        flexDirection: "column",
                        gap: "16px"
                    }}>
                        <div
                            className={styles.spinner}
                            style={{
                                width: "36px",
                                height: "36px",
                                border: "3px solid #e2e8f0",
                                borderTopColor: "#1d4ed8",
                                borderRadius: "50%",
                            }}
                        />
                        <p style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
                            Verifying your session...
                        </p>
                    </div>
                </div>
            </>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            <Nav />

            <div className={profileStyles.page}>
                <div className={profileStyles.shell}>
                    <ProfileSidebar user={user} />

                    <main className={profileStyles.main}>
                        {/* Page Header matching profile */}
                        <div className={profileStyles.pageHead} style={{ marginBottom: "26px" }}>
                            <div>
                                <h1 className={profileStyles.pageTitle}>My Subscription</h1>
                                <p className={profileStyles.pageSub}>
                                    Choose and manage your Agent or Builder subscription plan, track pending quotas, publish properties, reels, projects &amp; floor units, and view purchase history.
                                </p>
                            </div>
                        </div>

                        {/* Unified Agent & Builder Subscription Hub */}
                        <AgentSubscriptionDashboardCard />

                        {loading ? (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "40vh",
                                flexDirection: "column",
                                gap: "14px",
                                background: "#ffffff",
                                borderRadius: "20px",
                                padding: "40px",
                                border: "1px solid #e2e8f0",
                                marginBottom: "30px"
                            }}>
                                <div
                                    className={styles.spinner}
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        border: "3px solid #e2e8f0",
                                        borderTopColor: "#10b981",
                                        borderRadius: "50%",
                                    }}
                                />
                                <p style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
                                    Loading your subscription details...
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Toast Notification */}
                                {toast && (
                                    <div
                                        style={{
                                            background: toast.type === "success" ? "#ecfdf5" : "#fef2f2",
                                            border: `1.5px solid ${toast.type === "success" ? "#10b981" : "#ef4444"}`,
                                            color: toast.type === "success" ? "#065f46" : "#991b1b",
                                            padding: "14px 20px",
                                            borderRadius: "12px",
                                            marginBottom: "24px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        <RiCheckLine size={20} />
                                        <span>{toast.msg}</span>
                                    </div>
                                )}

                                {/* Error Banner */}
                                {errorMsg && (
                                    <div className={styles.dangerBanner}>
                                        <RiAlertLine size={20} />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                {/* TOP-UP BOOSTER PLANS - Only shown when agent's active subscription limits are exceeded and not expired */}
                                {hasActiveSub && isQuotaExceeded && topupPlans.length > 0 && (
                                    <section style={{ marginBottom: "50px" }}>
                                        <div className={styles.sectionHeader}>
                                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f5f3ff", color: "#7c3aed", padding: "4px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: "800", marginBottom: "8px", textTransform: "uppercase" }}>
                                                <RiFlashlightLine /> Quota Booster Top-Ups
                                            </div>
                                            <h2 className={styles.sectionTitle}>
                                                Exceeded Your Quota? Top Up Instantly
                                            </h2>
                                            <p className={styles.sectionSubtitle}>
                                                Add extra property listings or video reels directly to your active subscription without buying a whole new plan.
                                            </p>
                                        </div>

                                        <div className={styles.plansGrid}>
                                            {topupPlans.map((tp) => {
                                                const isPurchasing = purchasingTopupId === tp.id;
                                                const isPurchased = tp.is_purchased;
                                                return (
                                                    <div key={tp.id} className={`${styles.planCard} ${styles.planCardTopup}`}>
                                                        <div
                                                            className={styles.topupRibbon}
                                                            style={isPurchased ? { background: "#059669" } : {}}
                                                        >
                                                            {isPurchased ? `✓ Purchased (${tp.purchased_count}x)` : "Instant Top-Up"}
                                                        </div>
                                                        <h3 className={styles.planCardTitle}>{tp.plan_title}</h3>
                                                        <span style={{ fontSize: "13px", color: "#7c3aed", fontWeight: "600" }}>
                                                            Valid until {subData.expires_at_formatted}
                                                        </span>

                                                        <div className={styles.planPriceWrap}>
                                                            <span className={styles.planPrice} style={{ color: "#6d28d9" }}>₹{tp.price}</span>
                                                            <span className={styles.planDuration}>/ one-time booster</span>
                                                        </div>

                                                        <ul className={styles.planFeatureList}>
                                                            {tp.property_limit > 0 && (
                                                                <li className={styles.planFeatureItem}>
                                                                    <RiCheckLine className={styles.featureCheckIcon} style={{ color: "#7c3aed" }} />
                                                                    <span><strong>+{tp.property_limit} Property Listings</strong> added to active plan</span>
                                                                </li>
                                                            )}
                                                            {tp.reel_limit > 0 && (
                                                                <li className={styles.planFeatureItem}>
                                                                    <RiFilmLine className={styles.featureCheckIcon} style={{ color: "#7c3aed" }} />
                                                                    <span><strong>+{tp.reel_limit} Video Reels Spotlight</strong> added to active plan</span>
                                                                </li>
                                                            )}
                                                            <li className={styles.planFeatureItem}>
                                                                <RiCheckLine className={styles.featureCheckIcon} style={{ color: "#7c3aed" }} />
                                                                <span>Maintains your validity until {subData.expires_at_formatted}</span>
                                                            </li>
                                                            <li className={styles.planFeatureItem}>
                                                                <RiCheckLine className={styles.featureCheckIcon} style={{ color: "#7c3aed" }} />
                                                                <span>Instant activation upon payment</span>
                                                            </li>
                                                        </ul>

                                                        <button
                                                            type="button"
                                                            className={styles.topupBtn}
                                                            onClick={() => handleTopupSubscribe(tp)}
                                                            disabled={isPurchasing}
                                                        >
                                                            {isPurchasing ? (
                                                                <>
                                                                    <RiLoader4Line size={18} className={styles.spinner} />
                                                                    <span>Processing Top-Up...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>{isPurchased ? `Top Up Again (₹${tp.price})` : `Top Up Now (₹${tp.price})`}</span>
                                                                    <RiFlashlightLine size={16} />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                                {/* SUBSCRIPTION PURCHASE HISTORY */}
                                {history.length > 0 && (
                                    <section className={styles.historyCard}>
                                        <h3 className={styles.historyTitle}>
                                            <RiHistoryLine style={{ verticalAlign: "-2px", marginRight: "8px" }} />
                                            Subscription Purchase History
                                        </h3>
                                        <div className={styles.tableWrap}>
                                            <table className={styles.historyTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Plan Name</th>
                                                        <th>Type</th>
                                                        <th>Price</th>
                                                        <th>Duration</th>
                                                        <th>Quotas Added / Limit</th>
                                                        <th>Purchased / Started</th>
                                                        <th>Expires</th>
                                                        <th>Status</th>
                                                        <th>Invoice</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {history.map((h) => {
                                                        const isTopup = h.plan_type === "topup";
                                                        const topupParts = [];
                                                        if (isTopup) {
                                                            if (h.project_limit > 0) topupParts.push(`+${h.project_limit} Projects`);
                                                            if (h.unit_limit > 0) topupParts.push(`+${h.unit_limit} Units`);
                                                            if (h.property_limit > 0) topupParts.push(`+${h.property_limit} Properties`);
                                                            if (h.reel_limit > 0) topupParts.push(`+${h.reel_limit} Reels`);
                                                        }
                                                        return (
                                                            <tr key={h.id}>
                                                                <td style={{ fontWeight: 700, color: "#0f172a" }}>
                                                                    {h.plan_title}
                                                                </td>
                                                                <td>
                                                                    {isTopup ? (
                                                                        <span className={styles.typeBadgeTopup}>
                                                                            <RiFlashlightLine size={12} /> Top-Up
                                                                        </span>
                                                                    ) : (
                                                                        <span className={styles.typeBadgeSub}>
                                                                            <RiVipCrownLine size={12} /> Subscription
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td style={{ fontWeight: 700 }}>₹{h.price}</td>
                                                                <td>
                                                                    {isTopup ? (
                                                                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Active Add-on</span>
                                                                    ) : (
                                                                        <span>{h.duration_value} {h.duration_unit}</span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {isTopup ? (
                                                                        topupParts.length > 0 ? (
                                                                            <span style={{ fontWeight: 700, color: "#7c3aed" }}>
                                                                                {topupParts.join(" · ")}
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{ color: "#94a3b8" }}>—</span>
                                                                        )
                                                                    ) : (
                                                                        <span>
                                                                            {h.property_unlimited ? "Unlimited" : `${h.property_used} / ${h.property_limit}`} Props &bull;{" "}
                                                                            {h.reel_unlimited ? "Unlimited" : `${h.reel_used} / ${h.reel_limit}`} Reels
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td>{h.started_at_formatted || "-"}</td>
                                                                <td>{h.expires_at_formatted || "-"}</td>
                                                                <td>
                                                                    <span
                                                                        className={`${styles.statusPill} ${h.is_active ? styles.statusActive : styles.statusExpired
                                                                            }`}
                                                                    >
                                                                        {isTopup ? (h.is_active ? "Applied" : "Expired") : h.status}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openHistoryInvoice(h)}
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "5px",
                                                                            padding: "6px 11px",
                                                                            borderRadius: "8px",
                                                                            border: "1px solid #cbd5e1",
                                                                            background: "#ffffff",
                                                                            color: "#0f172a",
                                                                            fontSize: "12px",
                                                                            fontWeight: 700,
                                                                            cursor: "pointer",
                                                                            whiteSpace: "nowrap",
                                                                        }}
                                                                    >
                                                                        <RiFileTextLine size={13} />
                                                                        <span>Invoice</span>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>

            {/* Official Tax Invoice & Receipt Modal */}
            <InvoiceModal
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
                invoiceData={selectedInvoice}
                currentUser={user}
            />
        </>
    );
}
