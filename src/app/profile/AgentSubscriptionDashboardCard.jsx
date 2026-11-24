"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import styles from "./agentSubscriptionCard.module.css";
import { useAuth } from "../context/AuthContext";
import { agentSubscriptionApi, startSubscriptionCheckout } from "../lib/agentSubscriptionApi";
import {
    RiVipCrownLine,
    RiCalendarLine,
    RiFilmLine,
    RiBuildingLine,
    RiBuilding2Line,
    RiUserStarLine,
    RiLayoutMasonryLine,
    RiFileTextLine,
    RiArrowRightLine,
    RiCheckboxCircleFill,
    RiAlertLine,
    RiTimeLine,
    RiAddCircleLine,
    RiCheckLine,
    RiFlashlightLine,
    RiLockLine,
} from "react-icons/ri";

const InvoiceModal = dynamic(() => import("../componants/invoice/InvoiceModal"), { ssr: false });

const formatINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function computeYearlyTotal(plan) {
    const price = Number(plan.price || 0);
    const durVal = Math.max(1, Number(plan.duration_value || 1));
    const durUnit = String(plan.duration_unit || "months").toLowerCase();
    const pct = typeof plan.yearly_discount_percentage === "number" ? plan.yearly_discount_percentage : 20;
    const annualized =
        durUnit === "days"
            ? (price / durVal) * 365
            : durUnit === "years"
            ? price / durVal
            : (price / durVal) * 12;
    return Math.round(annualized * (1 - pct / 100));
}

function planSupportsYearly(plan) {
    const price = Number(plan.price || 0);
    const durVal = Math.max(1, Number(plan.duration_value || 1));
    const durUnit = String(plan.duration_unit || "months").toLowerCase();
    const pct = typeof plan.yearly_discount_percentage === "number" ? plan.yearly_discount_percentage : 20;
    const alreadyAnnual =
        (durUnit === "years" && durVal >= 1) ||
        (durUnit === "months" && durVal >= 12) ||
        (durUnit === "days" && durVal >= 365);
    return !alreadyAnnual && pct > 0 && price > 0;
}

export default function AgentSubscriptionDashboardCard() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(true);
    const [selectedRoleTab, setSelectedRoleTab] = useState("agent"); // "agent" | "builder"
    const [hasAutoSelectedTab, setHasAutoSelectedTab] = useState(false);
    const [showPlanChooser, setShowPlanChooser] = useState(false);

    const [entitlements, setEntitlements] = useState({
        agentRegistration: { has_applied: false, status: "none" },
        builderRegistration: { has_applied: false, status: "none" },
        activeAgentSubscription: null,
        activeBuilderSubscription: null,
    });

    const [allPlans, setAllPlans] = useState([]);
    const [allTopupPlans, setAllTopupPlans] = useState([]);
    const [planBillings, setPlanBillings] = useState({});
    const [purchasingPlanId, setPurchasingPlanId] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);

    const loadHubData = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        try {
            const [entRes, plansRes] = await Promise.all([
                agentSubscriptionApi.getUnifiedSubscriptions(),
                agentSubscriptionApi.getAllPublicPlans(),
            ]);

            if (entRes?.success && entRes?.data) {
                const agentReg = entRes.data.agent_registration || { has_applied: false, status: "none" };
                const builderReg = entRes.data.builder_registration || { has_applied: false, status: "none" };
                const activeAgent = entRes.data.active_agent_subscription || null;
                const activeBuilder = entRes.data.active_builder_subscription || null;

                setEntitlements({
                    agentRegistration: agentReg,
                    builderRegistration: builderReg,
                    activeAgentSubscription: activeAgent,
                    activeBuilderSubscription: activeBuilder,
                });

                if (!hasAutoSelectedTab) {
                    if (activeBuilder && !activeAgent) {
                        setSelectedRoleTab("builder");
                    } else if (builderReg.status !== "none" && agentReg.status === "none") {
                        setSelectedRoleTab("builder");
                    }
                    setHasAutoSelectedTab(true);
                }
            }

            if (plansRes?.success && Array.isArray(plansRes?.data)) {
                const basePlans = plansRes.data.filter(
                    (p) => p.plan_type !== "topup" && p.category !== "owner_listing"
                );
                const topups = plansRes.data.filter(
                    (p) => p.plan_type === "topup" && p.category !== "owner_listing"
                );
                setAllPlans(basePlans);
                setAllTopupPlans(topups);
                setPlanBillings((prev) => {
                    const next = { ...prev };
                    for (const p of basePlans) {
                        if (!next[p.id]) next[p.id] = "monthly";
                    }
                    return next;
                });
            }
        } catch (err) {
            console.error("[SubscriptionHub] Failed to load subscription hub:", err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, hasAutoSelectedTab]);

    useEffect(() => {
        loadHubData();

        const handleSync = () => loadHubData();
        const handleStorage = (e) => {
            if (e.key === "kp_plans_updated_at" || e.key === "kp_subscriptions_updated_at") {
                loadHubData();
            }
        };

        window.addEventListener("focus", handleSync);
        window.addEventListener("storage", handleStorage);

        let bcPlans = null;
        let bcSubs = null;
        try {
            if (typeof BroadcastChannel !== "undefined") {
                bcPlans = new BroadcastChannel("kp_plans_sync");
                bcPlans.onmessage = handleSync;
                bcSubs = new BroadcastChannel("kp_subscriptions_sync");
                bcSubs.onmessage = handleSync;
            }
        } catch {
            // ignore
        }

        return () => {
            window.removeEventListener("focus", handleSync);
            window.removeEventListener("storage", handleStorage);
            if (bcPlans) bcPlans.close();
            if (bcSubs) bcSubs.close();
        };
    }, [loadHubData]);

    const isBuilderTab = selectedRoleTab === "builder";
    const activeSub = isBuilderTab
        ? entitlements.activeBuilderSubscription
        : entitlements.activeAgentSubscription;
    const regInfo = isBuilderTab
        ? entitlements.builderRegistration
        : entitlements.agentRegistration;
    const regStatus = regInfo?.status || "none";

    const filteredPlans = useMemo(() => {
        return allPlans.filter((p) =>
            isBuilderTab
                ? p.category === "builder_subscription"
                : !p.category || p.category === "agent_subscription"
        );
    }, [allPlans, isBuilderTab]);

    const filteredTopupPlans = useMemo(() => {
        return allTopupPlans.filter((p) =>
            isBuilderTab
                ? p.category === "builder_subscription" || p.category === "builder_topup"
                : !p.category || p.category === "agent_subscription" || p.category === "agent_topup"
        );
    }, [allTopupPlans, isBuilderTab]);

    const handlePurchaseTopup = async (topup) => {
        setFeedback(null);
        const category = isBuilderTab ? "builder_subscription" : "agent_subscription";

        if (!activeSub?.is_active) {
            setFeedback({
                type: "error",
                text: `You need an active ${isBuilderTab ? "Builder" : "Agent"} subscription plan before purchasing a Top-Up.`,
            });
            return;
        }

        setPurchasingPlanId(`topup-${topup.id}`);
        await startSubscriptionCheckout({
            planId: topup.id,
            category,
            isTopup: true,
            planTitle: topup.plan_title,
            onSuccess: async () => {
                setPurchasingPlanId(null);
                await loadHubData();
                setFeedback({
                    type: "success",
                    text: `${topup.plan_title} applied! Your extra quotas are now active until ${activeSub.expires_at_formatted}.`,
                });
            },
            onError: (err) => {
                setPurchasingPlanId(null);
                setFeedback({
                    type: "error",
                    text: err?.message || "Top-Up payment could not be completed.",
                });
            },
            onDismiss: () => {
                setPurchasingPlanId(null);
            },
        });
    };

    const handlePurchasePlan = async (plan) => {
        setFeedback(null);
        if (activeSub?.is_active) {
            setFeedback({
                type: "error",
                text: `You already have an active ${isBuilderTab ? "Builder" : "Agent"} plan (${activeSub.plan_title}) valid until ${activeSub.expires_at_formatted}. Use a Top-Up plan to add extra quotas.`,
            });
            return;
        }
        const billing = planSupportsYearly(plan) ? planBillings[plan.id] || "monthly" : "monthly";
        const category = isBuilderTab ? "builder_subscription" : "agent_subscription";
        const slug = String(plan.code || `plan_${plan.id}`)
            .replace(/^(builder_|agent_)/, "")
            .replace(/_/g, "-");

        // Role & approval gate
        if (regStatus === "none") {
            router.push(
                isBuilderTab
                    ? `/register-builder?plan=${encodeURIComponent(slug)}&plan_id=${plan.id}&billing=${billing}`
                    : `/register-agent?plan=${encodeURIComponent(slug)}&plan_id=${plan.id}&billing=${billing}`
            );
            return;
        }

        if (regStatus === "pending") {
            setFeedback({
                type: "error",
                text: `Your ${isBuilderTab ? "Builder" : "Agent"} registration is pending admin approval. Please wait for approval to purchase this plan.`,
            });
            return;
        }

        if (regStatus === "rejected" || regStatus === "resubmission_requested") {
            router.push(isBuilderTab ? "/register-builder?recheck=true" : "/register-agent?edit=true");
            return;
        }

        setPurchasingPlanId(plan.id);
        await startSubscriptionCheckout({
            planId: plan.id,
            category,
            billingInterval: billing,
            planTitle: plan.plan_title,
            onSuccess: async () => {
                setPurchasingPlanId(null);
                setShowPlanChooser(false);
                await loadHubData();
                setFeedback({
                    type: "success",
                    text: `${plan.plan_title} purchased & activated! Your pending quotas are updated below.`,
                });
            },
            onError: (err) => {
                setPurchasingPlanId(null);
                if (err?.reason === "AGENT_NOT_REGISTERED") {
                    router.push(`/register-agent?plan=${encodeURIComponent(slug)}&plan_id=${plan.id}&billing=${billing}`);
                    return;
                }
                if (err?.reason === "BUILDER_NOT_REGISTERED") {
                    router.push(`/register-builder?plan=${encodeURIComponent(slug)}&plan_id=${plan.id}&billing=${billing}`);
                    return;
                }
                setFeedback({
                    type: "error",
                    text: err?.message || "Payment could not be completed.",
                });
            },
            onDismiss: () => {
                setPurchasingPlanId(null);
            },
        });
    };

    if (!isAuthenticated || loading) return null;

    // Build Quota Metrics & Quick Actions for Active Subscription
    const quotaCards = [];
    const quickActions = [];

    if (activeSub?.is_active) {
        quotaCards.push({
            id: "days",
            label: "Days Pending",
            tag: "Validity",
            Icon: RiCalendarLine,
            value: `${activeSub.days_remaining} Days`,
            subLeft: `Until ${activeSub.expires_at_formatted || "-"}`,
            subRight: "Active",
            percent: null,
            warn: activeSub.days_remaining <= 7,
        });

        const planCategoryParam = isBuilderTab ? "builder_subscription" : "agent_subscription";

        if (isBuilderTab) {
            const projUnlimited = Boolean(activeSub.project_unlimited);
            const projLimit = Number(activeSub.project_limit || 0);
            const projUsed = Number(activeSub.project_used || 0);
            const projRem = projUnlimited ? null : Math.max(0, projLimit - projUsed);
            const projOver = !projUnlimited && projUsed > projLimit ? projUsed - projLimit : 0;
            quotaCards.push({
                id: "projects",
                label: "Projects Pending",
                tag: "Builder",
                Icon: RiBuilding2Line,
                value: projUnlimited ? "Unlimited" : `${projRem} Pending`,
                subLeft: projUnlimited ? `${projUsed} Added` : `${projUsed} of ${projLimit} Used`,
                subRight: projUnlimited ? "No Limit" : projOver > 0 ? `${projOver} Over Limit` : `${projRem} Left`,
                percent: projUnlimited ? 100 : Math.min(100, Math.round((projUsed / (projLimit || 1)) * 100)),
                warn: !projUnlimited && projRem === 0,
            });

            if (projUnlimited || projLimit > 0) {
                const canAddProj = projUnlimited || projRem > 0;
                quickActions.push({
                    id: "add-project",
                    label: projOver > 0 ? "Manage Projects" : "+ Add Project",
                    count: projUnlimited ? "Unlimited" : projOver > 0 ? `${projOver} over limit` : `${projRem} pending`,
                    href: canAddProj || projOver > 0 ? "/builder-portal?section=projects" : "/pricing?for=builder",
                    exhausted: !canAddProj,
                });
            }

            const unitUnlimited = Boolean(activeSub.unit_unlimited);
            const unitLimit = Number(activeSub.unit_limit || 0);
            const unitUsed = Number(activeSub.unit_used || 0);
            const unitRem = unitUnlimited ? null : Math.max(0, unitLimit - unitUsed);
            const unitOver = !unitUnlimited && unitUsed > unitLimit ? unitUsed - unitLimit : 0;
            quotaCards.push({
                id: "units",
                label: "Floor Units Pending",
                tag: "Floor Plans",
                Icon: RiLayoutMasonryLine,
                value: unitUnlimited ? "Unlimited" : `${unitRem} Pending`,
                subLeft: unitUnlimited ? `${unitUsed} Added` : `${unitUsed} of ${unitLimit} Used`,
                subRight: unitUnlimited ? "No Limit" : unitOver > 0 ? `${unitOver} Over Limit` : `${unitRem} Left`,
                percent: unitUnlimited ? 100 : Math.min(100, Math.round((unitUsed / (unitLimit || 1)) * 100)),
                warn: !unitUnlimited && unitRem === 0,
            });

            if (unitUnlimited || unitLimit > 0) {
                const canAddUnit = unitUnlimited || unitRem > 0;
                quickActions.push({
                    id: "add-unit",
                    label: unitOver > 0 ? "Manage Floor Units" : "+ Add Floor Unit",
                    count: unitUnlimited ? "Unlimited" : unitOver > 0 ? `${unitOver} over limit` : `${unitRem} pending`,
                    href: canAddUnit || unitOver > 0 ? "/builder-portal?section=units" : "/pricing?for=builder",
                    exhausted: !canAddUnit,
                });
            }
        }

        // Properties Quota (Always shown on Agent Plan; shown on Builder Plan if included)
        const propUnlimited = Boolean(activeSub.property_unlimited);
        const propLimit = Number(activeSub.property_limit || 0);
        const propUsed = Number(activeSub.property_used || 0);
        const propRem = propUnlimited ? null : Math.max(0, propLimit - propUsed);

        if (!isBuilderTab || propUnlimited || propLimit > 0) {
            quotaCards.push({
                id: "properties",
                label: "Properties Pending",
                tag: "Listings",
                Icon: RiBuildingLine,
                value: propUnlimited ? "Unlimited" : `${propRem} Pending`,
                subLeft: propUnlimited ? `${propUsed} Published` : `${propUsed} of ${propLimit} Used`,
                subRight: propUnlimited ? "No Limit" : `${propRem} Left`,
                percent: propUnlimited ? 100 : Math.min(100, Math.round((propUsed / (propLimit || 1)) * 100)),
                warn: !propUnlimited && propRem === 0,
            });

            if (propUnlimited || propLimit > 0) {
                const canAddProp = propUnlimited || propRem > 0;
                quickActions.push({
                    id: "add-property",
                    label: "+ Add Property",
                    count: propUnlimited ? "Unlimited" : `${propRem} pending`,
                    href: canAddProp
                        ? `/post-property?plan_category=${planCategoryParam}`
                        : isBuilderTab
                        ? "/pricing?for=builder"
                        : "/pricing",
                    exhausted: !canAddProp,
                });
            }
        }

        // Reels Quota (Always shown on Agent Plan; shown on Builder Plan if included)
        const reelUnlimited = Boolean(activeSub.reel_unlimited);
        const reelLimit = Number(activeSub.reel_limit || 0);
        const reelUsed = Number(activeSub.reel_used || 0);
        const reelRem = reelUnlimited ? null : Math.max(0, reelLimit - reelUsed);

        if (!isBuilderTab || reelUnlimited || reelLimit > 0) {
            quotaCards.push({
                id: "reels",
                label: "Reels Pending",
                tag: "Spotlight",
                Icon: RiFilmLine,
                value: reelUnlimited ? "Unlimited" : `${reelRem} Pending`,
                subLeft: reelUnlimited ? `${reelUsed} Published` : `${reelUsed} of ${reelLimit} Used`,
                subRight: reelUnlimited ? "No Limit" : `${reelRem} Left`,
                percent: reelUnlimited ? 100 : Math.min(100, Math.round((reelUsed / (reelLimit || 1)) * 100)),
                warn: !reelUnlimited && reelRem === 0,
            });

            if (reelUnlimited || reelLimit > 0) {
                const canAddReel = reelUnlimited || reelRem > 0;
                quickActions.push({
                    id: "add-reel",
                    label: "+ Add Reel",
                    count: reelUnlimited ? "Unlimited" : `${reelRem} pending`,
                    href: canAddReel
                        ? `/post-reel?plan_category=${planCategoryParam}`
                        : isBuilderTab
                        ? "/pricing?for=builder"
                        : "/pricing",
                    exhausted: !canAddReel,
                });
            }
        }
    }

    const customerSnapshot = {
        name: user?.name || user?.personal_details?.fullname || user?.username || "Member",
        role: isBuilderTab ? "Builder" : "Agent",
        phone: user?.phone || user?.personal_details?.phone_number,
        email: user?.email,
    };

    const invoicePayload = activeSub
        ? {
              type: "subscription",
              invoice_no: activeSub.invoice_no || `KP-SUB-${String(activeSub.id || 1).padStart(5, "0")}`,
              title: `${activeSub.plan_title} Plan`,
              amount: activeSub.price,
              payment_id: activeSub.razorpay_payment_id || activeSub.payment_id || "Paid",
              order_id: activeSub.razorpay_order_id,
              date: activeSub.started_at_formatted || "Active",
              customer: customerSnapshot,
              details: {
                  plan_title: activeSub.plan_title,
                  duration: `${activeSub.duration_value} ${activeSub.duration_unit}`,
                  project_limit: isBuilderTab
                      ? activeSub.project_unlimited
                          ? "Unlimited"
                          : activeSub.project_limit
                      : undefined,
                  unit_limit: isBuilderTab
                      ? activeSub.unit_unlimited
                          ? "Unlimited"
                          : activeSub.unit_limit
                      : undefined,
                  property_limit: activeSub.property_unlimited ? "Unlimited" : activeSub.property_limit,
                  reel_limit: activeSub.reel_unlimited ? "Unlimited" : activeSub.reel_limit,
                  started_at: activeSub.started_at_formatted,
                  expires_at: activeSub.expires_at_formatted,
                  days_pending: activeSub.days_remaining,
                  reels_pending: activeSub.reel_remaining,
                  properties_pending: activeSub.property_remaining,
                  reels_used: activeSub.reel_used,
                  properties_used: activeSub.property_used,
              },
          }
        : null;

    const buildTopupInvoicePayload = (tp) => ({
        type: "topup",
        invoice_no: tp.invoice_no || `KP-TOP-${String(tp.id || 1).padStart(5, "0")}`,
        title: `${tp.plan_title || "Quota Top-Up"} (Top-Up Plan)`,
        amount: tp.price,
        payment_id: tp.razorpay_payment_id || tp.payment_id || "Paid",
        order_id: tp.razorpay_order_id || "N/A",
        date: tp.date || activeSub?.started_at_formatted || "",
        time: tp.time || "",
        customer: customerSnapshot,
        details: {
            plan_title: tp.plan_title,
            parent_plan_title: tp.parent_plan_title || activeSub?.plan_title,
            expires_at: tp.expires_at_formatted || activeSub?.expires_at_formatted,
            projects_added: tp.project_count || 0,
            units_added: tp.unit_count || 0,
            properties_added: tp.property_count || 0,
            reels_added: tp.reel_count || 0,
        },
    });

    return (
        <>
            <section className={styles.hubContainer} aria-label="Subscription Plans and Pending Quotas">
                {/* Top Switcher: Choose Agent Plan or Builder Plan */}
                <div className={styles.hubTopBar}>
                    <div className={styles.roleTabs} role="tablist" aria-label="Choose Plan Role">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={!isBuilderTab}
                            className={`${styles.roleTab} ${!isBuilderTab ? styles.roleTabActive : ""}`}
                            onClick={() => setSelectedRoleTab("agent")}
                        >
                            <RiUserStarLine size={16} />
                            <span>Agent Plan</span>
                            {entitlements.activeAgentSubscription?.is_active ? (
                                <span className={styles.tabDotActive} title="Active Agent Plan" />
                            ) : entitlements.agentRegistration?.status === "pending" ? (
                                <span className={styles.tabDotPending} title="Pending Approval" />
                            ) : null}
                        </button>

                        <button
                            type="button"
                            role="tab"
                            aria-selected={isBuilderTab}
                            className={`${styles.roleTab} ${isBuilderTab ? styles.roleTabActive : ""}`}
                            onClick={() => setSelectedRoleTab("builder")}
                        >
                            <RiBuilding2Line size={16} />
                            <span>Builder Plan</span>
                            {entitlements.activeBuilderSubscription?.is_active ? (
                                <span className={styles.tabDotActive} title="Active Builder Plan" />
                            ) : entitlements.builderRegistration?.status === "pending" ? (
                                <span className={styles.tabDotPending} title="Pending Approval" />
                            ) : null}
                        </button>
                    </div>

                    <div className={styles.topBarRight}>
                        {(activeSub?.is_active ? filteredTopupPlans.length > 0 : filteredPlans.length > 0) && (
                            <button
                                type="button"
                                className={styles.togglePlansBtn}
                                onClick={() => setShowPlanChooser((v) => !v)}
                            >
                                {activeSub?.is_active ? (
                                    <RiFlashlightLine size={15} />
                                ) : (
                                    <RiVipCrownLine size={15} />
                                )}
                                <span>
                                    {showPlanChooser
                                        ? activeSub?.is_active
                                            ? "Hide Top-Up Plans"
                                            : "Hide Plan Options"
                                        : activeSub?.is_active
                                        ? "Buy Top-Up Plan"
                                        : `Choose ${isBuilderTab ? "Builder" : "Agent"} Plan`}
                                </span>
                            </button>
                        )}
                        <Link
                            href={isBuilderTab ? "/pricing?for=builder" : "/pricing"}
                            className={styles.togglePlansBtn}
                        >
                            <span>Full Pricing Page</span>
                            <RiArrowRightLine size={14} />
                        </Link>
                    </div>
                </div>

                {feedback && (
                    <div
                        className={`${styles.feedbackBanner} ${
                            feedback.type === "error" ? styles.feedbackError : styles.feedbackSuccess
                        }`}
                    >
                        {feedback.type === "error" ? (
                            <RiAlertLine size={17} />
                        ) : (
                            <RiCheckboxCircleFill size={17} />
                        )}
                        <span>{feedback.text}</span>
                    </div>
                )}

                {/* Active Subscription State */}
                {activeSub?.is_active ? (
                    <div className={styles.activePlanBox}>
                        <div className={styles.widgetHeader}>
                            <div className={styles.headerLeft}>
                                <div className={styles.topPillRow}>
                                    <span className={styles.agentSubBadge}>
                                        <RiVipCrownLine size={13} />{" "}
                                        {isBuilderTab ? "Builder Subscription" : "Agent Subscription"}
                                    </span>
                                    <span className={styles.activeStatusPill}>
                                        <RiCheckboxCircleFill size={12} /> Plan Purchased &bull; Active
                                    </span>
                                </div>
                                <h2 className={styles.planTitle}>{activeSub.plan_title}</h2>
                                <div className={styles.planValidityMeta}>
                                    <span>
                                        Billing:{" "}
                                        <strong>
                                            {activeSub.billing_interval === "yearly"
                                                ? "Yearly"
                                                : `${activeSub.duration_value} ${activeSub.duration_unit}`}
                                        </strong>
                                    </span>
                                    <span>&bull;</span>
                                    <span>
                                        Started: <strong>{activeSub.started_at_formatted}</strong>
                                    </span>
                                    <span>&bull;</span>
                                    <span>
                                        Expires: <strong>{activeSub.expires_at_formatted}</strong>
                                    </span>
                                    <span>&bull;</span>
                                    <span
                                        style={{
                                            color: activeSub.days_remaining <= 7 ? "#dc2626" : "#059669",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {activeSub.days_remaining} Days Pending
                                    </span>
                                </div>
                            </div>

                            <div className={styles.headerActions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedInvoiceData(invoicePayload);
                                        setShowInvoiceModal(true);
                                    }}
                                    className={styles.invoiceBtn}
                                >
                                    <RiFileTextLine size={14} />
                                    <span>Plan Invoice</span>
                                </button>
                            </div>
                        </div>

                        {/* Pending Quotas Breakdown */}
                        <div className={styles.sectionSubLabel}>What Is Pending / Remaining On Your Plan</div>
                        <div className={styles.metricGrid}>
                            {quotaCards.map((card) => {
                                const Icon = card.Icon;
                                return (
                                    <div key={card.id} className={styles.metricCard}>
                                        <div className={styles.metricHead}>
                                            <span className={styles.metricLabel}>
                                                <Icon className={styles.metricIcon} /> {card.label}
                                            </span>
                                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                                                {card.tag}
                                            </span>
                                        </div>
                                        <div
                                            className={styles.metricValue}
                                            style={{ color: card.warn ? "#dc2626" : "#0f172a" }}
                                        >
                                            {card.value}
                                        </div>
                                        <div className={styles.metricSub}>
                                            <span>{card.subLeft}</span>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: card.warn ? "#dc2626" : "#059669",
                                                }}
                                            >
                                                {card.subRight}
                                            </span>
                                        </div>
                                        {card.percent !== null && (
                                            <div className={styles.miniProgressBar}>
                                                <div
                                                    className={styles.miniProgressFill}
                                                    style={{
                                                        width: `${card.percent}%`,
                                                        background: card.warn ? "#dc2626" : undefined,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Plan-Wise Add Actions (Property, Reel, Project, Floor Unit) */}
                        {quickActions.length > 0 && (
                            <div className={styles.quickActionsBar}>
                                <span className={styles.quickActionsLabel}>
                                    Add Using Your Plan Quotas:
                                </span>
                                <div className={styles.quickActionsRow}>
                                    {quickActions.map((act) => (
                                        <Link
                                            key={act.id}
                                            href={act.href}
                                            className={`${styles.quickActionBtn} ${
                                                act.exhausted ? styles.quickActionBtnExhausted : ""
                                            }`}
                                        >
                                            <RiAddCircleLine size={16} />
                                            <span>{act.label}</span>
                                            <span className={styles.quickCountTag}>{act.count}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Purchased Top-Up Plans & Individual Top-Up Invoices */}
                        {Array.isArray(activeSub.topups) && activeSub.topups.length > 0 && (
                            <div className={styles.topupInvoicesBox}>
                                <div className={styles.topupInvoicesHeader}>
                                    <span>
                                        <RiFlashlightLine
                                            size={13}
                                            style={{ verticalAlign: "-2px", marginRight: 4, color: "#4f46e5" }}
                                        />
                                        Purchased Top-Up Plans &amp; Invoices ({activeSub.topups.length})
                                    </span>
                                </div>
                                {activeSub.topups.map((tp) => {
                                    const quotaSummary = [];
                                    if (tp.project_count > 0)
                                        quotaSummary.push(
                                            `+${tp.project_count} Project${tp.project_count === 1 ? "" : "s"}`
                                        );
                                    if (tp.unit_count > 0)
                                        quotaSummary.push(
                                            `+${tp.unit_count} Unit${tp.unit_count === 1 ? "" : "s"}`
                                        );
                                    if (tp.property_count > 0)
                                        quotaSummary.push(
                                            `+${tp.property_count} Propert${tp.property_count === 1 ? "y" : "ies"}`
                                        );
                                    if (tp.reel_count > 0)
                                        quotaSummary.push(
                                            `+${tp.reel_count} Reel${tp.reel_count === 1 ? "" : "s"}`
                                        );

                                    return (
                                        <div key={tp.id} className={styles.topupInvoiceRow}>
                                            <div className={styles.topupInvoiceInfo}>
                                                <span className={styles.topupTag}>
                                                    <RiFlashlightLine size={11} /> Top-Up
                                                </span>
                                                <strong>{tp.plan_title}</strong>
                                                <span>&bull; {formatINR(tp.price)}</span>
                                                {tp.date && <span>&bull; {tp.date}</span>}
                                                {quotaSummary.length > 0 && (
                                                    <span className={styles.topupInvoiceQuotas}>
                                                        ({quotaSummary.join(", ")})
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.topupInvoiceBtn}
                                                onClick={() => {
                                                    setSelectedInvoiceData(buildTopupInvoicePayload(tp));
                                                    setShowInvoiceModal(true);
                                                }}
                                            >
                                                <RiFileTextLine size={13} />
                                                <span>Top-Up Invoice ({tp.invoice_no})</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* No Active Plan for Selected Role — Show Pending Registration / Not Registered / Ready to Purchase State */
                    <div
                        className={`${styles.stateBanner} ${
                            regStatus === "pending"
                                ? styles.stateBannerPending
                                : regStatus === "rejected" || regStatus === "resubmission_requested"
                                ? styles.stateBannerRejected
                                : styles.stateBannerNeutral
                        }`}
                    >
                        <div className={styles.stateTextWrap}>
                            {regStatus === "pending" ? (
                                <>
                                    <h3 className={styles.stateTitle}>
                                        <RiTimeLine size={19} color="#d97706" />
                                        <span>
                                            Pending: {isBuilderTab ? "Builder" : "Agent"} Registration Awaiting Approval
                                        </span>
                                    </h3>
                                    <p className={styles.stateDesc}>
                                        Your {isBuilderTab ? "Builder" : "Agent"} application has been submitted and is currently waiting for admin approval. As soon as your profile is approved, you can activate a {isBuilderTab ? "Builder" : "Agent"} plan here.
                                    </p>
                                </>
                            ) : regStatus === "rejected" || regStatus === "resubmission_requested" ? (
                                <>
                                    <h3 className={styles.stateTitle}>
                                        <RiAlertLine size={19} color="#dc2626" />
                                        <span>
                                            Pending Action: Update {isBuilderTab ? "Builder" : "Agent"} Registration
                                        </span>
                                    </h3>
                                    <p className={styles.stateDesc}>
                                        {regInfo?.rejection_reason ||
                                            `Your ${isBuilderTab ? "Builder" : "Agent"} registration requires updates before you can purchase a subscription plan.`}
                                    </p>
                                </>
                            ) : regStatus === "approved" ? (
                                <>
                                    <h3 className={styles.stateTitle}>
                                        <RiVipCrownLine size={19} color="#059669" />
                                        <span>
                                            Approved {isBuilderTab ? "Builder" : "Agent"} &bull; No Active Plan Selected
                                        </span>
                                    </h3>
                                    <p className={styles.stateDesc}>
                                        {isBuilderTab
                                            ? "Choose a Builder Subscription plan below to unlock active projects, floor plans/units, property listings, and video reel spotlights."
                                            : "Choose an Agent Subscription plan below to unlock property listing quotas and video reel spotlights."}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className={styles.stateTitle}>
                                        {isBuilderTab ? (
                                            <RiBuilding2Line size={19} color="#12296b" />
                                        ) : (
                                            <RiUserStarLine size={19} color="#12296b" />
                                        )}
                                        <span>
                                            Want {isBuilderTab ? "Builder" : "Agent"} Subscription Benefits?
                                        </span>
                                    </h3>
                                    <p className={styles.stateDesc}>
                                        {isBuilderTab
                                            ? "Register as a Builder first (and get admin approval) to purchase a Builder plan and add projects, floor units, properties, and reels."
                                            : "Register as an Agent first (and get admin approval) to purchase an Agent plan and publish properties and spotlight reels."}
                                    </p>
                                </>
                            )}
                        </div>

                        {regStatus === "none" ? (
                            <Link
                                href={isBuilderTab ? "/register-builder" : "/register-agent"}
                                className={styles.primaryActionBtn}
                            >
                                <span>Register as {isBuilderTab ? "Builder" : "Agent"}</span>
                                <RiArrowRightLine size={15} />
                            </Link>
                        ) : regStatus === "rejected" || regStatus === "resubmission_requested" ? (
                            <Link
                                href={isBuilderTab ? "/register-builder?recheck=true" : "/register-agent?edit=true"}
                                className={styles.primaryActionBtn}
                            >
                                <span>Update Registration</span>
                                <RiArrowRightLine size={15} />
                            </Link>
                        ) : regStatus === "approved" ? (
                            <button
                                type="button"
                                className={styles.primaryActionBtn}
                                onClick={() => setShowPlanChooser(true)}
                            >
                                <span>Choose {isBuilderTab ? "Builder" : "Agent"} Plan</span>
                                <RiArrowRightLine size={15} />
                            </button>
                        ) : null}
                    </div>
                )}

                {/* Active Plan -> Top-Up Chooser (Shown when active plan exists and user toggles Buy Top-Up Plan) */}
                {activeSub?.is_active && showPlanChooser && filteredTopupPlans.length > 0 && (
                    <div className={styles.plansChooserWrap}>
                        <div className={styles.plansChooserHead}>
                            <h3 className={styles.plansChooserTitle}>
                                <RiFlashlightLine
                                    size={16}
                                    style={{ verticalAlign: "-2px", marginRight: 6, color: "#4f46e5" }}
                                />
                                {isBuilderTab ? "Builder" : "Agent"} Top-Up Plans (Added to {activeSub.plan_title})
                            </h3>
                            <span style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 500 }}>
                                Valid until {activeSub.expires_at_formatted} &bull; Only one active base plan allowed
                            </span>
                        </div>

                        <div className={styles.plansGrid}>
                            {filteredTopupPlans.map((topup) => {
                                const price = Math.round(Number(topup.price || 0));
                                const projLimit = Number(topup.project_limit || 0);
                                const unitLimit = Number(topup.unit_limit || 0);
                                const propLimit = Number(topup.property_limit || 0);
                                const reelLimit = Number(topup.reel_limit || 0);
                                const appliedCount = Number(
                                    activeSub?.topup_counts_by_plan?.[topup.id] || 0
                                );
                                const busy = purchasingPlanId === `topup-${topup.id}`;

                                return (
                                    <div
                                        key={`topup-${topup.id}`}
                                        className={`${styles.planMiniCard} ${styles.planMiniCardTopup}`}
                                    >
                                        <div className={styles.planMiniTop}>
                                            <div className={styles.planMiniNameRow}>
                                                <h4 className={styles.planMiniName}>{topup.plan_title}</h4>
                                                <span className={styles.topupTag}>
                                                    <RiFlashlightLine size={12} />{" "}
                                                    {appliedCount > 0
                                                        ? `Applied (${appliedCount}x)`
                                                        : "Top-Up"}
                                                </span>
                                            </div>

                                            <p className={styles.planMiniPrice}>
                                                {formatINR(price)}
                                                <span className={styles.planMiniPer}>/ one-time top-up</span>
                                            </p>

                                            <ul className={styles.planMiniQuotas}>
                                                {isBuilderTab && projLimit > 0 && (
                                                    <li>
                                                        <RiCheckLine color="#4f46e5" />
                                                        <span>
                                                            +{projLimit} Active Project
                                                            {projLimit === 1 ? "" : "s"}
                                                        </span>
                                                    </li>
                                                )}
                                                {isBuilderTab && unitLimit > 0 && (
                                                    <li>
                                                        <RiCheckLine color="#4f46e5" />
                                                        <span>
                                                            +{unitLimit} Floor Plan
                                                            {unitLimit === 1 ? "" : "s"} / Unit
                                                            {unitLimit === 1 ? "" : "s"}
                                                        </span>
                                                    </li>
                                                )}
                                                {propLimit > 0 && (
                                                    <li>
                                                        <RiCheckLine color="#4f46e5" />
                                                        <span>
                                                            +{propLimit} Property Listing
                                                            {propLimit === 1 ? "" : "s"}
                                                        </span>
                                                    </li>
                                                )}
                                                {reelLimit > 0 && (
                                                    <li>
                                                        <RiCheckLine color="#4f46e5" />
                                                        <span>
                                                            +{reelLimit} Video Reel
                                                            {reelLimit === 1 ? "" : "s"}
                                                        </span>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => handlePurchaseTopup(topup)}
                                            className={`${styles.planMiniCta} ${styles.planMiniCtaTopup}`}
                                        >
                                            <RiFlashlightLine size={14} />
                                            <span>
                                                {busy
                                                    ? "Processing..."
                                                    : appliedCount > 0
                                                    ? `Top Up Again · ${formatINR(price)}`
                                                    : `Buy Top-Up · ${formatINR(price)}`}
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Inline Base Plan Chooser (Shown ONLY when user has NO active plan in this category) */}
                {!activeSub?.is_active &&
                    (showPlanChooser || regStatus === "approved") &&
                    filteredPlans.length > 0 && (
                        <div className={styles.plansChooserWrap}>
                            <div className={styles.plansChooserHead}>
                                <h3 className={styles.plansChooserTitle}>
                                    Select {isBuilderTab ? "Builder" : "Agent"} Subscription Plan
                                </h3>
                            </div>

                            <div className={styles.plansGrid}>
                                {filteredPlans.map((plan) => {
                                    const canYearly = planSupportsYearly(plan);
                                    const billing = canYearly ? planBillings[plan.id] || "monthly" : "monthly";
                                    const isYearly = canYearly && billing === "yearly";
                                    const discount =
                                        typeof plan.yearly_discount_percentage === "number"
                                            ? plan.yearly_discount_percentage
                                            : 20;
                                    const yrTotal = computeYearlyTotal(plan);
                                    const displayPrice = isYearly
                                        ? Math.round(yrTotal / 12)
                                        : Math.round(Number(plan.price || 0));

                                    const durVal = Math.max(1, Number(plan.duration_value || 1));
                                    const durUnit = String(plan.duration_unit || "months").toLowerCase();
                                    const baseLabel =
                                        durUnit === "months" && durVal === 1
                                            ? "Monthly"
                                            : `${durVal} ${durUnit.charAt(0).toUpperCase() + durUnit.slice(1)}`;
                                    const perText =
                                        isYearly || (durUnit === "months" && durVal === 1)
                                            ? "/ month"
                                            : `/ ${durVal} ${durUnit}`;

                                    const isCurrentPurchased =
                                        Boolean(activeSub?.is_active) &&
                                        Number(activeSub.plan_id) === Number(plan.id);
                                    const isExactInterval =
                                        isCurrentPurchased &&
                                        (String(activeSub.billing_interval || "").toLowerCase() === "yearly") ===
                                            isYearly;

                                    return (
                                        <div
                                            key={plan.id}
                                            className={`${styles.planMiniCard} ${
                                                isCurrentPurchased ? styles.planMiniCardPurchased : ""
                                            }`}
                                        >
                                            <div className={styles.planMiniTop}>
                                                <div className={styles.planMiniNameRow}>
                                                    <h4 className={styles.planMiniName}>{plan.plan_title}</h4>
                                                    {isCurrentPurchased && (
                                                        <span className={styles.purchasedTag}>
                                                            <RiCheckboxCircleFill size={12} /> Plan Purchased
                                                        </span>
                                                    )}
                                                </div>

                                                {canYearly && (
                                                    <div className={styles.miniBillingSwitch}>
                                                        <button
                                                            type="button"
                                                            className={`${styles.miniBillingBtn} ${
                                                                !isYearly ? styles.miniBillingBtnActive : ""
                                                            }`}
                                                            onClick={() =>
                                                                setPlanBillings((prev) => ({
                                                                    ...prev,
                                                                    [plan.id]: "monthly",
                                                                }))
                                                            }
                                                        >
                                                            {baseLabel}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`${styles.miniBillingBtn} ${
                                                                isYearly ? styles.miniBillingBtnActive : ""
                                                            }`}
                                                            onClick={() =>
                                                                setPlanBillings((prev) => ({
                                                                    ...prev,
                                                                    [plan.id]: "yearly",
                                                                }))
                                                            }
                                                        >
                                                            Yearly -{discount}%
                                                        </button>
                                                    </div>
                                                )}

                                                <p className={styles.planMiniPrice}>
                                                    {formatINR(displayPrice)}
                                                    <span className={styles.planMiniPer}>{perText}</span>
                                                </p>

                                                <ul className={styles.planMiniQuotas}>
                                                    {isBuilderTab && (
                                                        <>
                                                            <li>
                                                                <RiCheckLine color="#059669" />
                                                                <span>
                                                                    {plan.project_unlimited
                                                                        ? "Unlimited Active Projects"
                                                                        : `${plan.project_limit} Active Project${
                                                                              plan.project_limit === 1 ? "" : "s"
                                                                          }`}
                                                                </span>
                                                            </li>
                                                            <li>
                                                                <RiCheckLine color="#059669" />
                                                                <span>
                                                                    {plan.unit_unlimited
                                                                        ? "Unlimited Floor Plans / Units"
                                                                        : `${plan.unit_limit} Floor Plans / Units`}
                                                                </span>
                                                            </li>
                                                        </>
                                                    )}
                                                    {(plan.property_unlimited || plan.property_limit > 0) && (
                                                        <li>
                                                            <RiCheckLine color="#059669" />
                                                            <span>
                                                                {plan.property_unlimited
                                                                    ? "Unlimited Property Listings"
                                                                    : `${plan.property_limit} Property Listing${
                                                                          plan.property_limit === 1 ? "" : "s"
                                                                      }`}
                                                            </span>
                                                        </li>
                                                    )}
                                                    {(plan.reel_unlimited || plan.reel_limit > 0) && (
                                                        <li>
                                                            <RiCheckLine color="#059669" />
                                                            <span>
                                                                {plan.reel_unlimited
                                                                    ? "Unlimited Video Reels"
                                                                    : `${plan.reel_limit} Video Reel${
                                                                          plan.reel_limit === 1 ? "" : "s"
                                                                      }`}
                                                            </span>
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>

                                            {isExactInterval ? (
                                                <button
                                                    type="button"
                                                    disabled
                                                    className={`${styles.planMiniCta} ${styles.planMiniCtaPurchased}`}
                                                >
                                                    <RiCheckboxCircleFill size={14} /> Current Purchased Plan
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={purchasingPlanId === plan.id}
                                                    onClick={() => handlePurchasePlan(plan)}
                                                    className={`${styles.planMiniCta} ${
                                                        regStatus === "pending" ? styles.planMiniCtaPending : ""
                                                    }`}
                                                >
                                                    {purchasingPlanId === plan.id
                                                        ? "Processing..."
                                                        : regStatus === "pending"
                                                        ? "Waiting for Approval"
                                                        : regStatus === "none"
                                                        ? `Register & Choose`
                                                        : isCurrentPurchased && isYearly
                                                        ? "Upgrade to Yearly"
                                                        : `Purchase ${plan.plan_title}`}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
            </section>

            <InvoiceModal
                isOpen={showInvoiceModal}
                onClose={() => {
                    setShowInvoiceModal(false);
                    setSelectedInvoiceData(null);
                }}
                invoiceData={selectedInvoiceData || invoicePayload}
                currentUser={user}
            />
        </>
    );
}
