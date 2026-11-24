"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./pricing.module.css";
import { resolveApiBaseUrl } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { agentSubscriptionApi, startSubscriptionCheckout } from "../lib/agentSubscriptionApi";
import {
    RiCheckLine,
    RiSubtractLine,
    RiStarFill,
    RiArrowDownSLine,
    RiUserStarLine,
    RiBuilding2Line,
    RiCheckboxCircleFill,
    RiTimeLine,
    RiArrowRightLine,
    RiAlertLine,
    RiFlashlightLine,
    RiLockLine,
} from "react-icons/ri";

const formatINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const yearlyDiscountOf = (plan) =>
    typeof plan.yearlyDiscount === "number" && !isNaN(plan.yearlyDiscount) ? plan.yearlyDiscount : 20;

const annualizedBaseOf = (plan) => {
    const durVal = Math.max(1, Number(plan.durationValue || 1));
    const durUnit = String(plan.durationUnit || "months").toLowerCase();
    if (durUnit === "days") return (plan.monthly / durVal) * 365;
    if (durUnit === "years") return plan.monthly / durVal;
    return (plan.monthly / durVal) * 12;
};

const yearlyPrice = (plan) => {
    const pct = yearlyDiscountOf(plan);
    return Math.round(annualizedBaseOf(plan) * (1 - pct / 100));
};

const remember = (key, value) => {
    try {
        sessionStorage.setItem(key, value);
    } catch {
        // storage unavailable
    }
};
const rememberAgentPlan = (plan, billing) =>
    remember("kp_selected_agent_plan", JSON.stringify({ plan: plan.slug, plan_id: plan.dbId, billing }));
const rememberBuilderPlan = (plan, billing) =>
    remember("kp_selected_builder_plan", JSON.stringify({ plan: plan.slug, plan_id: plan.dbId, billing }));

/* --------------------------------------------------------------------------
   HTML & Description Parser (100% Admin-Driven — Zero Static Defaults)
   -------------------------------------------------------------------------- */
function decodeHtmlEntities(str) {
    if (!str) return "";
    return str
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&bull;/gi, "•")
        .replace(/\s+/g, " ")
        .trim();
}

function stripTagsAndDecode(html) {
    if (!html) return "";
    return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "));
}

function extractSequentialLines(htmlFragment) {
    if (!htmlFragment) return [];
    const withLineBreaks = htmlFragment
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?(?:p|div|h[1-6]|blockquote|section|article|tr)[^>]*>/gi, "\n");

    return withLineBreaks
        .split(/\r?\n/)
        .map((part) => stripTagsAndDecode(part))
        .filter(Boolean);
}

function parsePlanDescription(rawDesc) {
    if (!rawDesc || typeof rawDesc !== "string") {
        return { tagline: "", features: [] };
    }

    const trimmed = rawDesc.trim();
    const textOnly = stripTagsAndDecode(trimmed);
    if (!textOnly) {
        return { tagline: "", features: [] };
    }

    const hasHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);

    if (hasHtml) {
        const liMatches = [...trimmed.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
        if (liMatches.length > 0) {
            const listFeatures = liMatches.map((m) => stripTagsAndDecode(m[1])).filter(Boolean);

            const firstListIdx = trimmed.search(/<(?:ul|ol)\b/i);
            const beforeListHtml = firstListIdx > 0 ? trimmed.slice(0, firstListIdx) : "";
            const afterListsHtml = (firstListIdx >= 0 ? trimmed.slice(firstListIdx) : trimmed).replace(
                /<(ul|ol)[^>]*>[\s\S]*?<\/(ul|ol)>/gi,
                "\n"
            );

            const beforeLines = extractSequentialLines(
                beforeListHtml.replace(/<h[1-6][^>]*>\s*(?:plan\s+)?benefits\s*:?\s*<\/h[1-6]>/gi, "")
            );
            const afterLines = extractSequentialLines(afterListsHtml);

            let tagline = "";
            let extraBeforeFeatures = [];
            if (beforeLines.length === 1) {
                tagline = beforeLines[0];
            } else if (beforeLines.length > 1) {
                tagline = beforeLines[0];
                extraBeforeFeatures = beforeLines.slice(1);
            }

            return {
                tagline,
                features: [...extraBeforeFeatures, ...listFeatures, ...afterLines],
            };
        }

        const allLines = extractSequentialLines(trimmed);
        const bulletPrefixed = allLines.some((l) => /^[-•*]\s+/.test(l));
        if (bulletPrefixed) {
            const bulletLines = [];
            const nonBulletLines = [];
            for (const line of allLines) {
                if (/^[-•*]\s+/.test(line)) {
                    bulletLines.push(line.replace(/^[-•*]\s+/, "").trim());
                } else {
                    nonBulletLines.push(line);
                }
            }
            return {
                tagline: nonBulletLines[0] || "",
                features: [...nonBulletLines.slice(1), ...bulletLines],
            };
        }

        return {
            tagline: "",
            features: allLines,
        };
    }

    const rawLines = trimmed
        .split(/\r?\n/)
        .map((l) => decodeHtmlEntities(l))
        .filter(Boolean);

    const hasBullets = rawLines.some((l) => /^[-•*]\s+/.test(l));
    if (hasBullets) {
        const bulletLines = [];
        const nonBulletLines = [];
        for (const line of rawLines) {
            if (/^[-•*]\s+/.test(line)) {
                bulletLines.push(line.replace(/^[-•*]\s+/, "").trim());
            } else {
                nonBulletLines.push(line);
            }
        }
        return {
            tagline: nonBulletLines[0] || "",
            features: [...nonBulletLines.slice(1), ...bulletLines],
        };
    }

    return {
        tagline: "",
        features: rawLines,
    };
}

function deriveShortName(title, prefixToRemove) {
    if (!title) return "Plan";
    const cleaned = title.replace(new RegExp(`^${prefixToRemove}\\s+`, "i"), "").trim();
    return cleaned || title;
}

function transformSubscriptionPlans(rawPlans, category) {
    const isBuilder = category === "builder_subscription";
    const recommendedIdx = rawPlans.findIndex((p) => /growth|professional|popular|featured/i.test(`${p.code} ${p.plan_title}`));

    return rawPlans.map((p, idx) => {
        const parsed = parsePlanDescription(p.plan_description);
        const shortName = deriveShortName(p.plan_title, isBuilder ? "Builder" : "Agent");
        const prefixRegex = isBuilder ? /^builder_/ : /^agent_/;
        const slug = String(p.code || `plan_${p.id}`).replace(prefixRegex, "").replace(/_/g, "-");
        const price = Math.round(Number(p.price || 0));
        const durationValue = Math.max(1, Number(p.duration_value || 1));
        const durationUnit = String(p.duration_unit || "months").toLowerCase();
        const discount =
            typeof p.yearly_discount_percentage === "number" && !isNaN(p.yearly_discount_percentage)
                ? p.yearly_discount_percentage
                : 20;

        const isSingleMonth = durationUnit === "months" && durationValue === 1;
        const isAlreadyAnnualOrMore =
            (durationUnit === "years" && durationValue >= 1) ||
            (durationUnit === "months" && durationValue >= 12) ||
            (durationUnit === "days" && durationValue >= 365);

        // Enable Yearly toggle for both 1-month plans AND multi-month plans (e.g. 3 months free plan)
        const supportsYearly = !isAlreadyAnnualOrMore && discount > 0 && price > 0;

        const baseBillingLabel = isSingleMonth
            ? "Monthly"
            : durationUnit === "months"
            ? `${durationValue} Months`
            : durationUnit === "days"
            ? `${durationValue} Days`
            : "Standard";

        const perLabel = isSingleMonth
            ? "/ month"
            : durationValue === 1
            ? `/ ${durationUnit.replace(/s$/, "")}`
            : `/ ${durationValue} ${durationUnit}`;

        const pill = isBuilder
            ? p.project_unlimited
                ? "Unlimited"
                : `${p.project_limit} project${Number(p.project_limit) === 1 ? "" : "s"}`
            : p.property_unlimited
            ? "Unlimited listings"
            : `${p.property_limit} listing${Number(p.property_limit) === 1 ? "" : "s"}`;

        const isRecommended =
            recommendedIdx >= 0
                ? idx === recommendedIdx
                : rawPlans.length >= 3
                ? idx === 1
                : rawPlans.length === 2
                ? idx === 1
                : false;

        return {
            id: `${isBuilder ? "builder" : "agent"}-${p.id}`,
            dbId: p.id,
            category,
            slug,
            name: p.plan_title,
            shortName,
            monthly: price,
            durationValue,
            durationUnit,
            durationDisplay: p.duration_display || `${durationValue} ${durationUnit}`,
            baseBillingLabel,
            perLabel,
            supportsYearly,
            yearlyDiscount: discount,
            pill,
            tagline: parsed.tagline,
            features: parsed.features,
            recommended: isRecommended,
            badge: isRecommended ? "Most Popular" : null,
            cta: `Choose ${shortName}`,
            projectQuota: p.project_unlimited ? "Unlimited" : Number(p.project_limit || 0),
            unitQuota: p.unit_unlimited ? "Unlimited" : Number(p.unit_limit || 0),
            propertyQuota: p.property_unlimited ? "Unlimited" : Number(p.property_limit || 0),
            reelQuota: p.reel_unlimited ? "Unlimited" : Number(p.reel_limit || 0),
        };
    });
}

function transformTopupPlans(rawPlans, category) {
    const isBuilder = category === "builder_subscription";
    return rawPlans.map((p) => {
        const parsed = parsePlanDescription(p.plan_description);
        const price = Math.round(Number(p.price || 0));
        const projLimit = Number(p.project_limit || 0);
        const unitLimit = Number(p.unit_limit || 0);
        const propLimit = Number(p.property_limit || 0);
        const reelLimit = Number(p.reel_limit || 0);

        const quotaBullets = [];
        if (isBuilder && projLimit > 0) {
            quotaBullets.push(`+${projLimit} Active Project${projLimit === 1 ? "" : "s"} added to active plan`);
        }
        if (isBuilder && unitLimit > 0) {
            quotaBullets.push(`+${unitLimit} Floor Plan${unitLimit === 1 ? "" : "s"} / Unit${unitLimit === 1 ? "" : "s"} added to active plan`);
        }
        if (propLimit > 0) {
            quotaBullets.push(`+${propLimit} Property Listing${propLimit === 1 ? "" : "s"} added to active plan`);
        }
        if (reelLimit > 0) {
            quotaBullets.push(`+${reelLimit} Video Reel${reelLimit === 1 ? "" : "s"} Spotlight added to active plan`);
        }

        const descFeatures = (parsed.features || []).filter(
            (f) => !isRedundantQuotaFeature(f)
        );

        const summaryParts = [];
        if (isBuilder && projLimit > 0) summaryParts.push(`+${projLimit} project${projLimit === 1 ? "" : "s"}`);
        if (isBuilder && unitLimit > 0) summaryParts.push(`+${unitLimit} unit${unitLimit === 1 ? "" : "s"}`);
        if (propLimit > 0) summaryParts.push(`+${propLimit} listing${propLimit === 1 ? "" : "s"}`);
        if (reelLimit > 0) summaryParts.push(`+${reelLimit} reel${reelLimit === 1 ? "" : "s"}`);

        return {
            id: `topup-${isBuilder ? "builder" : "agent"}-${p.id}`,
            dbId: p.id,
            category,
            isTopup: true,
            name: p.plan_title,
            price,
            pill: summaryParts[0] || "Quota Booster",
            tagline: parsed.tagline,
            features: [...quotaBullets, ...descFeatures],
            projectAdded: projLimit,
            unitAdded: unitLimit,
            propertyAdded: propLimit,
            reelAdded: reelLimit,
        };
    });
}

/* --------------------------------------------------------------------------
   Dynamic Comparison Matrix Builder
   -------------------------------------------------------------------------- */
function isRedundantQuotaFeature(featureText) {
    return (
        /^everything in\s+/i.test(featureText) ||
        /^(?:\d+|unlimited)\s+(?:active\s+)?(?:property listing|project|listing credit)/i.test(featureText) ||
        /^(?:up to\s+\d+|\d+|unlimited)\s+floor plan/i.test(featureText) ||
        /^(?:\d+|unlimited)\s+video reel/i.test(featureText)
    );
}

function buildDynamicComparisonRows(plans, audience) {
    if (!Array.isArray(plans) || plans.length === 0) return [];

    const rows = [];

    if (audience === "builder") {
        rows.push({
            feature: "Price",
            values: plans.map((p) => `${formatINR(p.monthly)} ${p.perLabel}`),
        });
        rows.push({
            feature: "Active Projects",
            values: plans.map((p) => (p.projectQuota === 0 ? false : p.projectQuota)),
        });
        rows.push({
            feature: "Floor Plans / Units",
            values: plans.map((p) => (p.unitQuota === 0 ? false : p.unitQuota)),
        });
        if (plans.some((p) => p.propertyQuota === "Unlimited" || Number(p.propertyQuota) > 0)) {
            rows.push({
                feature: "Property Listings",
                values: plans.map((p) => (p.propertyQuota === 0 ? false : p.propertyQuota)),
            });
        }
        if (plans.some((p) => p.reelQuota === "Unlimited" || Number(p.reelQuota) > 0)) {
            rows.push({
                feature: "Video Reels Spotlight",
                values: plans.map((p) => (p.reelQuota === 0 ? false : p.reelQuota)),
            });
        }
    } else {
        rows.push({
            feature: "Price",
            values: plans.map((p) => `${formatINR(p.monthly)} ${p.perLabel}`),
        });
        rows.push({
            feature: "Plan Duration",
            values: plans.map((p) => p.durationDisplay),
        });
        rows.push({
            feature: "Property Listings",
            values: plans.map((p) => (p.propertyQuota === 0 ? false : p.propertyQuota)),
        });
        rows.push({
            feature: "Video Reels Spotlight",
            values: plans.map((p) => (p.reelQuota === 0 ? false : p.reelQuota)),
        });
    }

    const effectiveFeatureSets = plans.map(() => new Set());
    const orderedUniqueBenefits = [];
    const seenNormalized = new Map();

    plans.forEach((plan, idx) => {
        const inheritsPrev = (plan.features || []).some((f) => /^everything in\s+/i.test(f));
        if (inheritsPrev && idx > 0) {
            for (const inheritedKey of effectiveFeatureSets[idx - 1]) {
                effectiveFeatureSets[idx].add(inheritedKey);
            }
        }

        for (const rawFeat of plan.features || []) {
            if (isRedundantQuotaFeature(rawFeat)) continue;
            const norm = rawFeat.toLowerCase().trim();
            if (!norm) continue;
            if (!seenNormalized.has(norm)) {
                seenNormalized.set(norm, rawFeat);
                orderedUniqueBenefits.push(norm);
            }
            effectiveFeatureSets[idx].add(norm);
        }
    });

    for (const normKey of orderedUniqueBenefits) {
        const displayLabel = seenNormalized.get(normKey);
        rows.push({
            feature: displayLabel,
            values: plans.map((_, idx) => effectiveFeatureSets[idx].has(normKey)),
        });
    }

    return rows;
}

/* --------------------------------------------------------------------------
   Small building blocks
   -------------------------------------------------------------------------- */
function Tick({ on, label }) {
    return on ? (
        <span className={styles.yes} aria-label={`${label}: included`}>
            <RiCheckLine aria-hidden="true" />
        </span>
    ) : (
        <span className={styles.no} aria-label={`${label}: not included`}>
            <RiSubtractLine aria-hidden="true" />
        </span>
    );
}

function CellValue({ value, label }) {
    if (typeof value === "boolean") return <Tick on={value} label={label} />;
    return <span className={styles.cellText}>{value}</span>;
}

function FeatureList({ features, label }) {
    if (!Array.isArray(features) || features.length === 0) return null;
    return (
        <ul className={styles.featureList} aria-label={label}>
            {features.map((f, i) => (
                <li
                    key={`${f}-${i}`}
                    className={i === 0 && /^everything\b/i.test(f) ? styles.featureInherit : ""}
                >
                    <span className={styles.featureIcon} aria-hidden="true">
                        <RiCheckLine />
                    </span>
                    <span>{f}</span>
                </li>
            ))}
        </ul>
    );
}

function BillingToggle({ value, onChange, baseLabel = "Monthly", saveLabel, size = "sm", label }) {
    return (
        <div
            className={`${styles.billingToggle} ${size === "lg" ? styles.billingToggleLg : ""}`}
            role="radiogroup"
            aria-label={label}
        >
            {["monthly", "yearly"].map((opt) => (
                <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={value === opt}
                    className={`${styles.billingOption} ${value === opt ? styles.billingOptionActive : ""}`}
                    onClick={() => onChange(opt)}
                >
                    {opt === "monthly" ? baseLabel : "Yearly"}
                    {opt === "yearly" && saveLabel && (
                        <span className={styles.saveTag}>{saveLabel}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

/* --------------------------------------------------------------------------
   Subscription Card
   -------------------------------------------------------------------------- */
function SubscriptionCard({
    plan,
    billing,
    onBillingChange,
    onSelectPlan,
    activeSubscription,
    roleStatus,
    isPurchasing,
}) {
    const canToggleYearly = Boolean(plan.supportsYearly);
    const isYearly = canToggleYearly && billing === "yearly";
    const discount = yearlyDiscountOf(plan);
    const yearTotal = yearlyPrice(plan);
    const undiscountedMonthly = Math.round(annualizedBaseOf(plan) / 12);
    const displayAmount = isYearly ? Math.round(yearTotal / 12) : plan.monthly;
    const effectiveBilling = isYearly ? "yearly" : "monthly";

    const hasAnyActiveSub = Boolean(activeSubscription?.is_active);
    const isPurchasedPlan =
        hasAnyActiveSub &&
        (Number(activeSubscription.plan_id) === Number(plan.dbId) ||
            String(activeSubscription.plan_title || "").toLowerCase() === String(plan.name || "").toLowerCase());
    const isLockedByActivePlan = hasAnyActiveSub && !isPurchasedPlan;

    const activeIsYearly = String(activeSubscription?.billing_interval || "").toLowerCase() === "yearly";
    const isPendingApproval = roleStatus === "pending";

    let ctaLabel = plan.cta;
    if (isPurchasing) {
        ctaLabel = "Initializing Payment...";
    } else if (isPurchasedPlan) {
        ctaLabel = "Plan Purchased · Go to Dashboard";
    } else if (isLockedByActivePlan) {
        ctaLabel = "Active Plan Running";
    } else if (isPendingApproval) {
        ctaLabel = "Waiting for Approval";
    }

    return (
        <article
            className={`${styles.card} ${
                isPurchasedPlan
                    ? styles.cardPurchased
                    : plan.recommended
                    ? styles.cardRecommended
                    : ""
            }`}
            aria-labelledby={`plan-${plan.id}`}
        >
            {isPurchasedPlan ? (
                <span className={styles.purchasedBadge}>
                    <RiCheckboxCircleFill aria-hidden="true" /> Plan Purchased
                </span>
            ) : (
                plan.badge && (
                    <span className={styles.recommendedBadge}>
                        <RiStarFill aria-hidden="true" /> {plan.badge}
                    </span>
                )
            )}

            <header className={`${styles.cardHead} ${!plan.tagline ? styles.cardHeadCompact : ""}`}>
                <div className={styles.nameRow}>
                    <h2 id={`plan-${plan.id}`} className={styles.cardName}>
                        {plan.name}
                    </h2>
                    <span className={styles.durationPill}>{plan.pill}</span>
                </div>
                {plan.tagline && <p className={styles.cardTagline}>{plan.tagline}</p>}
            </header>

            {canToggleYearly && (
                <BillingToggle
                    value={effectiveBilling}
                    onChange={onBillingChange}
                    baseLabel={plan.baseBillingLabel}
                    saveLabel={`-${discount}%`}
                    label={`${plan.name} billing period`}
                />
            )}

            <div className={styles.priceBlock} aria-live="polite">
                <p className={styles.price}>
                    <span className={styles.currency}>₹</span>
                    {displayAmount.toLocaleString("en-IN")}
                    <span className={styles.per}>{isYearly ? "/ month" : plan.perLabel}</span>
                    {isYearly && (
                        <s className={styles.oldPrice} aria-label={`was ${formatINR(undiscountedMonthly)} per month`}>
                            {formatINR(undiscountedMonthly)}
                        </s>
                    )}
                </p>
                <p className={styles.priceNote}>
                    {isYearly ? (
                        <>
                            Billed yearly {formatINR(yearTotal)} ·{" "}
                            <span className={styles.saveText}>Save {discount}%</span>
                        </>
                    ) : plan.durationUnit === "months" && plan.durationValue === 1 ? (
                        "Billed monthly"
                    ) : (
                        `Valid for ${plan.durationDisplay}`
                    )}
                </p>
            </div>

            {isPurchasedPlan && (
                <div className={styles.purchasedMetaBar}>
                    <span>
                        Active ({activeIsYearly ? "Yearly" : plan.durationDisplay})
                    </span>
                    <span>
                        {activeSubscription.days_remaining} Days Pending
                    </span>
                </div>
            )}

            {isPurchasedPlan ? (
                <Link href="/profile" className={`${styles.cta} ${styles.ctaPurchased}`}>
                    <RiCheckboxCircleFill aria-hidden="true" /> {ctaLabel}
                </Link>
            ) : isLockedByActivePlan ? (
                <button
                    type="button"
                    disabled
                    className={`${styles.cta} ${styles.ctaBtn} ${styles.ctaLocked}`}
                    title={`Your ${activeSubscription?.plan_title || "current"} plan is active until ${activeSubscription?.expires_at_formatted || "expiry"}. Use Top-Up plans below to add extra quotas.`}
                >
                    <RiLockLine aria-hidden="true" />
                    <span>{ctaLabel}</span>
                </button>
            ) : (
                <button
                    type="button"
                    disabled={isPurchasing}
                    onClick={() => onSelectPlan(plan, effectiveBilling)}
                    className={`${styles.cta} ${styles.ctaBtn} ${
                        isPendingApproval ? styles.ctaPending : ""
                    }`}
                >
                    {isPendingApproval && <RiTimeLine aria-hidden="true" />}
                    <span>{ctaLabel}</span>
                </button>
            )}

            <FeatureList features={plan.features} label={`${plan.name} includes`} />
        </article>
    );
}

/* --------------------------------------------------------------------------
   Top-Up Quota Booster Card (Shown when an Agent/Builder plan is active)
   -------------------------------------------------------------------------- */
function TopupCard({ topup, activeSubscription, isPurchasing, onSelectTopup }) {
    const purchasedCount = Number(activeSubscription?.topup_counts_by_plan?.[topup.dbId] || 0);

    return (
        <article className={`${styles.card} ${styles.cardTopup}`} aria-labelledby={`topup-${topup.id}`}>
            <span className={`${styles.topupBadge} ${purchasedCount > 0 ? styles.topupBadgeApplied : ""}`}>
                {purchasedCount > 0 ? (
                    <>
                        <RiCheckboxCircleFill aria-hidden="true" /> Top-Up Applied ({purchasedCount}x)
                    </>
                ) : (
                    <>
                        <RiFlashlightLine aria-hidden="true" /> Instant Quota Top-Up
                    </>
                )}
            </span>

            <header className={`${styles.cardHead} ${!topup.tagline ? styles.cardHeadCompact : ""}`}>
                <div className={styles.nameRow}>
                    <h3 id={`topup-${topup.id}`} className={styles.cardName}>
                        {topup.name}
                    </h3>
                    <span className={styles.durationPill}>{topup.pill}</span>
                </div>
                {topup.tagline && <p className={styles.cardTagline}>{topup.tagline}</p>}
            </header>

            <div className={styles.priceBlock}>
                <p className={styles.price}>
                    <span className={styles.currency}>₹</span>
                    {topup.price.toLocaleString("en-IN")}
                    <span className={styles.per}>/ one-time top-up</span>
                </p>
                <p className={styles.priceNote}>
                    Added to <strong>{activeSubscription?.plan_title}</strong> &bull; Valid until{" "}
                    <strong>{activeSubscription?.expires_at_formatted}</strong>
                </p>
            </div>

            <button
                type="button"
                disabled={isPurchasing}
                onClick={() => onSelectTopup(topup)}
                className={`${styles.cta} ${styles.ctaBtn} ${styles.ctaTopup}`}
            >
                <RiFlashlightLine aria-hidden="true" />
                <span>
                    {isPurchasing
                        ? "Initializing Top-Up..."
                        : purchasedCount > 0
                        ? `Top Up Again · ${formatINR(topup.price)}`
                        : `Buy Top-Up · ${formatINR(topup.price)}`}
                </span>
            </button>

            <FeatureList features={topup.features} label={`${topup.name} adds`} />
        </article>
    );
}

/* --------------------------------------------------------------------------
   Comparison — table on desktop, accordion on mobile
   -------------------------------------------------------------------------- */
function Comparison({ title, columns, rows }) {
    const recommendedIndex = columns.findIndex((c) => c.recommended);
    const [openIndex, setOpenIndex] = useState(recommendedIndex >= 0 ? recommendedIndex : 0);

    if (!columns || columns.length < 2 || !rows || rows.length === 0) {
        return null;
    }

    return (
        <section className={styles.compareSection} aria-labelledby="compare-title">
            <div className={styles.container}>
                <h2 id="compare-title" className={styles.compareTitle}>
                    {title}
                </h2>

                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col" className={styles.featureCol}>
                                    Feature
                                </th>
                                {columns.map((c) => (
                                    <th key={c.id} scope="col" className={c.recommended ? styles.colRecommended : ""}>
                                        {c.isPurchased ? (
                                            <span className={styles.thBadge} style={{ borderColor: "#10b981", color: "#047857", background: "#ecfdf5" }}>
                                                <RiCheckboxCircleFill aria-hidden="true" /> Plan Purchased
                                            </span>
                                        ) : (
                                            c.recommended && (
                                                <span className={styles.thBadge}>
                                                    <RiStarFill aria-hidden="true" /> {c.badge}
                                                </span>
                                            )
                                        )}
                                        <span className={styles.thName}>{c.name}</span>
                                        <span className={styles.thPrice}>{c.sub}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.feature}>
                                    <th scope="row" className={styles.featureCol}>
                                        {row.feature}
                                    </th>
                                    {row.values.map((v, i) => (
                                        <td key={columns[i].id} className={columns[i].recommended ? styles.colRecommended : ""}>
                                            <CellValue value={v} label={`${columns[i].name} – ${row.feature}`} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className={styles.featureCol} />
                                {columns.map((c) => (
                                    <td key={c.id} className={c.recommended ? styles.colRecommended : ""}>
                                        {c.isPurchased ? (
                                            <Link href="/profile" className={`${styles.tableCta} ${styles.ctaPurchased}`}>
                                                Plan Purchased
                                            </Link>
                                        ) : c.isLockedByActivePlan ? (
                                            <button
                                                type="button"
                                                disabled
                                                className={`${styles.tableCta} ${styles.ctaBtn} ${styles.ctaLocked}`}
                                            >
                                                Active Plan Running
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className={`${styles.tableCta} ${styles.ctaBtn}`}
                                                onClick={c.onChoose}
                                            >
                                                Choose
                                            </button>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className={styles.accordion}>
                    {columns.map((c, i) => {
                        const open = openIndex === i;
                        const panelId = `compare-panel-${c.id}`;
                        return (
                            <div
                                key={c.id}
                                className={`${styles.accItem} ${open ? styles.accItemOpen : ""} ${c.recommended ? styles.accItemRecommended : ""}`}
                            >
                                <button
                                    type="button"
                                    className={styles.accHeader}
                                    aria-expanded={open}
                                    aria-controls={panelId}
                                    onClick={() => setOpenIndex(open ? -1 : i)}
                                >
                                    <span className={styles.accTitle}>
                                        <span className={styles.accName}>
                                            {c.name}
                                            {c.isPurchased ? (
                                                <span className={styles.accBadge} style={{ borderColor: "#10b981", color: "#047857", background: "#ecfdf5" }}>
                                                    <RiCheckboxCircleFill aria-hidden="true" /> Plan Purchased
                                                </span>
                                            ) : (
                                                c.recommended && (
                                                    <span className={styles.accBadge}>
                                                        <RiStarFill aria-hidden="true" /> {c.badge}
                                                    </span>
                                                )
                                            )}
                                        </span>
                                        <span className={styles.accMeta}>{c.meta}</span>
                                    </span>
                                    <RiArrowDownSLine className={styles.accChevron} aria-hidden="true" />
                                </button>
                                <div id={panelId} className={styles.accPanel} hidden={!open}>
                                    <ul className={styles.accList}>
                                        {rows.map((row) => {
                                            const v = row.values[i];
                                            const off = v === false;
                                            return (
                                                <li key={row.feature} className={off ? styles.accOff : ""}>
                                                    {typeof v === "boolean" ? (
                                                        <>
                                                            <Tick on={v} label={row.feature} />
                                                            <span>{row.feature}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className={styles.accLabel}>{row.feature}</span>
                                                            <span className={styles.accValue}>{v}</span>
                                                        </>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {c.isPurchased ? (
                                        <Link href="/profile" className={`${styles.cta} ${styles.ctaPurchased}`}>
                                            Plan Purchased · Go to Dashboard
                                        </Link>
                                    ) : c.isLockedByActivePlan ? (
                                        <button
                                            type="button"
                                            disabled
                                            className={`${styles.cta} ${styles.ctaBtn} ${styles.ctaLocked}`}
                                        >
                                            <RiLockLine aria-hidden="true" /> Active Plan Running
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={`${styles.cta} ${styles.ctaBtn}`}
                                            onClick={c.onChoose}
                                        >
                                            {c.ctaLabel}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/* --------------------------------------------------------------------------
   Page (Agent & Builder Subscriptions Only)
   -------------------------------------------------------------------------- */
const COPY = {
    agent: {
        title: "Grow Your Property Business With KeralaPlots",
        subtitle: "List more properties, reach more buyers and manage your listings from one professional dashboard.",
        compare: "Compare Agent Plans",
    },
    builder: {
        title: "Showcase Your Projects With a Verified Builder Page",
        subtitle: "Get your own builder webpage, list your projects and floor plans, and receive site-visit enquiries directly — zero brokerage.",
        compare: "Compare Builder Plans",
    },
};

const AUDIENCES = [
    { id: "agent", label: "Agent", Icon: RiUserStarLine },
    { id: "builder", label: "Builder", Icon: RiBuilding2Line },
];

const AUDIENCE_EVENT = "kp:pricing-audience";
const subscribeAudience = (cb) => {
    window.addEventListener("popstate", cb);
    window.addEventListener(AUDIENCE_EVENT, cb);
    return () => {
        window.removeEventListener("popstate", cb);
        window.removeEventListener(AUDIENCE_EVENT, cb);
    };
};
const getAudience = () => {
    const v = new URLSearchParams(window.location.search).get("for");
    return v === "builder" ? "builder" : "agent";
};
const getServerAudience = () => "agent";

function gridClassForCount(count) {
    if (count === 1) return styles.cardsGridOne;
    if (count === 2) return styles.cardsGridTwo;
    if (count === 3) return styles.cardsGridThree;
    return "";
}

function PricingContent() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const audience = useSyncExternalStore(subscribeAudience, getAudience, getServerAudience);

    const setAudience = useCallback((next) => {
        const url = new URL(window.location.href);
        if (next === "builder") url.searchParams.set("for", "builder");
        else url.searchParams.delete("for");
        window.history.replaceState(window.history.state, "", url);
        window.dispatchEvent(new Event(AUDIENCE_EVENT));
    }, []);

    const [loading, setLoading] = useState(true);
    const [builderPlans, setBuilderPlans] = useState([]);
    const [agentPlans, setAgentPlans] = useState([]);
    const [builderTopupPlans, setBuilderTopupPlans] = useState([]);
    const [agentTopupPlans, setAgentTopupPlans] = useState([]);
    const [cardBilling, setCardBilling] = useState({});

    // Authenticated user's role statuses & active subscriptions
    const [entitlementState, setEntitlementState] = useState({
        loaded: false,
        agentRegistration: { has_applied: false, status: "none" },
        builderRegistration: { has_applied: false, status: "none" },
        activeAgentSubscription: null,
        activeBuilderSubscription: null,
    });

    const [purchasingPlanId, setPurchasingPlanId] = useState(null);
    const [bannerNotice, setBannerNotice] = useState(null);
    const [gateModal, setGateModal] = useState(null);

    const fetchUserEntitlements = useCallback(async () => {
        if (!isAuthenticated) {
            setEntitlementState({
                loaded: true,
                agentRegistration: { has_applied: false, status: "none" },
                builderRegistration: { has_applied: false, status: "none" },
                activeAgentSubscription: null,
                activeBuilderSubscription: null,
            });
            return null;
        }

        const res = await agentSubscriptionApi.getUnifiedSubscriptions();
        if (res?.success && res?.data) {
            const nextState = {
                loaded: true,
                agentRegistration: res.data.agent_registration || { has_applied: false, status: "none" },
                builderRegistration: res.data.builder_registration || { has_applied: false, status: "none" },
                activeAgentSubscription: res.data.active_agent_subscription || null,
                activeBuilderSubscription: res.data.active_builder_subscription || null,
            };
            setEntitlementState(nextState);
            return nextState;
        }
        return null;
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            fetchUserEntitlements();
        }
    }, [authLoading, fetchUserEntitlements]);

    useEffect(() => {
        let isMounted = true;

        const fetchLivePlans = async () => {
            try {
                const apiBase = resolveApiBaseUrl();
                const res = await fetch(`${apiBase}/plans?_t=${Date.now()}`, {
                    cache: "no-store",
                    headers: { Accept: "application/json" },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!isMounted) return;

                if (json?.success && Array.isArray(json?.data)) {
                    const basePlans = json.data.filter(
                        (lp) => lp.plan_type !== "topup" && lp.category !== "owner_listing"
                    );
                    const topupPlans = json.data.filter(
                        (lp) => lp.plan_type === "topup" && lp.category !== "owner_listing"
                    );

                    const rawBuilders = basePlans.filter((lp) => lp.category === "builder_subscription");
                    const rawAgents = basePlans.filter(
                        (lp) => !lp.category || lp.category === "agent_subscription"
                    );

                    const rawBuilderTopups = topupPlans.filter(
                        (lp) => lp.category === "builder_subscription" || lp.category === "builder_topup"
                    );
                    const rawAgentTopups = topupPlans.filter(
                        (lp) => !lp.category || lp.category === "agent_subscription" || lp.category === "agent_topup"
                    );

                    const mappedBuilders = transformSubscriptionPlans(rawBuilders, "builder_subscription");
                    const mappedAgents = transformSubscriptionPlans(rawAgents, "agent_subscription");
                    const mappedBuilderTopups = transformTopupPlans(rawBuilderTopups, "builder_subscription");
                    const mappedAgentTopups = transformTopupPlans(rawAgentTopups, "agent_subscription");

                    setBuilderPlans(mappedBuilders);
                    setAgentPlans(mappedAgents);
                    setBuilderTopupPlans(mappedBuilderTopups);
                    setAgentTopupPlans(mappedAgentTopups);

                    setCardBilling((prev) => {
                        const next = { ...prev };
                        for (const p of [...mappedBuilders, ...mappedAgents]) {
                            if (!next[p.id]) next[p.id] = "monthly";
                        }
                        return next;
                    });
                }
            } catch (err) {
                console.error("Failed to fetch live pricing plans:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchLivePlans();

        const handleRefresh = () => {
            fetchLivePlans();
            if (isAuthenticated) fetchUserEntitlements();
        };
        const handleVisibility = () => {
            if (document.visibilityState === "visible") handleRefresh();
        };
        const handleStorage = (e) => {
            if (e.key === "kp_plans_updated_at" || e.key === "kp_subscriptions_updated_at") {
                handleRefresh();
            }
        };

        window.addEventListener("focus", handleRefresh);
        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("storage", handleStorage);

        let bcPlans = null;
        let bcSubs = null;
        try {
            if (typeof BroadcastChannel !== "undefined") {
                bcPlans = new BroadcastChannel("kp_plans_sync");
                bcPlans.onmessage = () => fetchLivePlans();
                bcSubs = new BroadcastChannel("kp_subscriptions_sync");
                bcSubs.onmessage = () => fetchUserEntitlements();
            }
        } catch {
            // BroadcastChannel unavailable
        }

        return () => {
            isMounted = false;
            window.removeEventListener("focus", handleRefresh);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("storage", handleStorage);
            if (bcPlans) bcPlans.close();
            if (bcSubs) bcSubs.close();
        };
    }, [isAuthenticated, fetchUserEntitlements]);

    // Smart Purchase Gate Handler (Login -> Registration -> Approval -> Razorpay Checkout)
    const handleSelectPlan = useCallback(
        async (plan, billing) => {
            setBannerNotice(null);
            const isBuilderPlan = plan.category === "builder_subscription";
            if (isBuilderPlan) rememberBuilderPlan(plan, billing);
            else rememberAgentPlan(plan, billing);

            // 1. Not logged in -> Redirect to Login first
            if (!isAuthenticated) {
                const returnPath = isBuilderPlan ? "/pricing?for=builder" : "/pricing";
                router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
                return;
            }

            // Refresh latest registration/approval status before deciding
            let latest = entitlementState;
            if (!latest.loaded) {
                const fetched = await fetchUserEntitlements();
                if (fetched) latest = fetched;
            }

            // Enforce single active base plan per category
            const runningSub = isBuilderPlan
                ? latest.activeBuilderSubscription
                : latest.activeAgentSubscription;
            if (runningSub?.is_active) {
                setBannerNotice({
                    type: "error",
                    text: `You already have an active ${isBuilderPlan ? "Builder" : "Agent"} plan (${runningSub.plan_title}) valid until ${runningSub.expires_at_formatted}. Please use a Top-Up plan below to add extra quotas.`,
                });
                const topupEl = document.getElementById("topup-plans");
                if (topupEl) topupEl.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
            }

            // 2. Agent Plan Role & Approval Check
            if (!isBuilderPlan) {
                const agentStatus = latest.agentRegistration?.status || "none";
                if (agentStatus === "none") {
                    router.push(
                        `/register-agent?plan=${encodeURIComponent(plan.slug)}&plan_id=${plan.dbId}&billing=${billing}`
                    );
                    return;
                }
                if (agentStatus === "pending") {
                    setGateModal({
                        title: "Agent Approval Pending",
                        text: "Your Agent registration has been submitted and is currently awaiting admin approval. Once approved, you can purchase and activate this plan immediately.",
                        primaryHref: "/profile",
                        primaryLabel: "Go to Dashboard",
                    });
                    return;
                }
                if (agentStatus === "rejected") {
                    setGateModal({
                        title: "Agent Registration Needs Update",
                        text:
                            latest.agentRegistration?.rejection_reason ||
                            "Your Agent registration was not approved. Please review and update your Agent profile before purchasing a plan.",
                        primaryHref: "/register-agent?edit=true",
                        primaryLabel: "Update Agent Profile",
                    });
                    return;
                }
            }

            // 3. Builder Plan Role & Approval Check
            if (isBuilderPlan) {
                const builderStatus = latest.builderRegistration?.status || "none";
                if (builderStatus === "none") {
                    router.push(
                        `/register-builder?plan=${encodeURIComponent(plan.slug)}&plan_id=${plan.dbId}&billing=${billing}`
                    );
                    return;
                }
                if (builderStatus === "pending") {
                    setGateModal({
                        title: "Builder Approval Pending",
                        text: "Your Builder registration has been submitted and is currently awaiting admin approval. Once approved, you can purchase and activate this plan immediately.",
                        primaryHref: "/profile",
                        primaryLabel: "Go to Dashboard",
                    });
                    return;
                }
                if (builderStatus === "rejected" || builderStatus === "resubmission_requested") {
                    setGateModal({
                        title: "Builder Registration Needs Update",
                        text:
                            latest.builderRegistration?.rejection_reason ||
                            "Your Builder registration requires updates before purchasing a Builder plan.",
                        primaryHref: "/register-builder?recheck=true",
                        primaryLabel: "Update Builder Registration",
                    });
                    return;
                }
            }

            // 4. Approved Role -> Launch Razorpay Checkout
            setPurchasingPlanId(plan.id);
            await startSubscriptionCheckout({
                planId: plan.dbId,
                category: plan.category,
                billingInterval: billing,
                planTitle: plan.name,
                onSuccess: async () => {
                    setPurchasingPlanId(null);
                    await fetchUserEntitlements();
                    setBannerNotice({
                        type: "success",
                        text: `${plan.name} activated successfully! You can now add listings and track quotas from your Dashboard.`,
                    });
                },
                onError: (err) => {
                    setPurchasingPlanId(null);
                    if (err?.reason === "AGENT_NOT_REGISTERED") {
                        router.push(`/register-agent?plan=${encodeURIComponent(plan.slug)}&plan_id=${plan.dbId}&billing=${billing}`);
                        return;
                    }
                    if (err?.reason === "BUILDER_NOT_REGISTERED") {
                        router.push(`/register-builder?plan=${encodeURIComponent(plan.slug)}&plan_id=${plan.dbId}&billing=${billing}`);
                        return;
                    }
                    if (err?.reason === "AGENT_PENDING_APPROVAL" || err?.reason === "BUILDER_PENDING_APPROVAL") {
                        setGateModal({
                            title: "Approval Pending",
                            text: err.message,
                            primaryHref: "/profile",
                            primaryLabel: "Go to Dashboard",
                        });
                        return;
                    }
                    setBannerNotice({
                        type: "error",
                        text: err?.message || "Payment could not be completed.",
                    });
                },
                onDismiss: () => {
                    setPurchasingPlanId(null);
                },
            });
        },
        [isAuthenticated, entitlementState, fetchUserEntitlements, router]
    );

    // Top-Up Purchase Handler (Requires an active Agent or Builder subscription)
    const handleSelectTopup = useCallback(
        async (topup) => {
            setBannerNotice(null);
            const isBuilderTopup = topup.category === "builder_subscription";

            if (!isAuthenticated) {
                const returnPath = isBuilderTopup ? "/pricing?for=builder" : "/pricing";
                router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
                return;
            }

            let latest = entitlementState;
            if (!latest.loaded) {
                const fetched = await fetchUserEntitlements();
                if (fetched) latest = fetched;
            }

            const runningSub = isBuilderTopup
                ? latest.activeBuilderSubscription
                : latest.activeAgentSubscription;
            if (!runningSub?.is_active) {
                setBannerNotice({
                    type: "error",
                    text: `You need an active ${isBuilderTopup ? "Builder" : "Agent"} subscription plan before purchasing a Top-Up.`,
                });
                return;
            }

            setPurchasingPlanId(topup.id);
            await startSubscriptionCheckout({
                planId: topup.dbId,
                category: topup.category,
                isTopup: true,
                planTitle: topup.name,
                onSuccess: async () => {
                    setPurchasingPlanId(null);
                    await fetchUserEntitlements();
                    setBannerNotice({
                        type: "success",
                        text: `${topup.name} applied to ${runningSub.plan_title}! Your extra quotas are now active until ${runningSub.expires_at_formatted}.`,
                    });
                },
                onError: (err) => {
                    setPurchasingPlanId(null);
                    setBannerNotice({
                        type: "error",
                        text: err?.message || "Top-Up payment could not be completed.",
                    });
                },
                onDismiss: () => {
                    setPurchasingPlanId(null);
                },
            });
        },
        [isAuthenticated, entitlementState, fetchUserEntitlements, router]
    );

    const copy = COPY[audience];
    const currentItems = audience === "builder" ? builderPlans : agentPlans;
    const currentTopups = audience === "builder" ? builderTopupPlans : agentTopupPlans;
    const activeSubForAudience =
        audience === "builder"
            ? entitlementState.activeBuilderSubscription
            : entitlementState.activeAgentSubscription;
    const roleStatusForAudience =
        audience === "builder"
            ? entitlementState.builderRegistration?.status || "none"
            : entitlementState.agentRegistration?.status || "none";

    const builderColumns = useMemo(
        () =>
            builderPlans.map((p) => {
                const b = cardBilling[p.id] || "monthly";
                const hasActive = Boolean(entitlementState.activeBuilderSubscription?.is_active);
                const isPurchased =
                    hasActive &&
                    Number(entitlementState.activeBuilderSubscription.plan_id) === Number(p.dbId);
                return {
                    id: p.id,
                    name: p.shortName,
                    sub: (
                        <>
                            <strong>{formatINR(p.monthly)}</strong> {p.perLabel}
                        </>
                    ),
                    recommended: !!p.recommended,
                    isPurchased,
                    isLockedByActivePlan: hasActive && !isPurchased,
                    badge: p.badge || "Recommended",
                    onChoose: () => handleSelectPlan(p, b),
                    ctaLabel: p.cta,
                    meta: `${formatINR(p.monthly)} ${p.perLabel} · ${p.pill}`,
                };
            }),
        [builderPlans, cardBilling, entitlementState.activeBuilderSubscription, handleSelectPlan]
    );

    const agentColumns = useMemo(
        () =>
            agentPlans.map((p) => {
                const b = cardBilling[p.id] || "monthly";
                const hasActive = Boolean(entitlementState.activeAgentSubscription?.is_active);
                const isPurchased =
                    hasActive &&
                    Number(entitlementState.activeAgentSubscription.plan_id) === Number(p.dbId);
                return {
                    id: p.id,
                    name: p.shortName,
                    sub: (
                        <>
                            <strong>{formatINR(p.monthly)}</strong> {p.perLabel}
                        </>
                    ),
                    recommended: !!p.recommended,
                    isPurchased,
                    isLockedByActivePlan: hasActive && !isPurchased,
                    badge: p.badge || "Recommended",
                    onChoose: () => handleSelectPlan(p, b),
                    ctaLabel: p.cta,
                    meta: `${formatINR(p.monthly)} ${p.perLabel} · ${p.pill}`,
                };
            }),
        [agentPlans, cardBilling, entitlementState.activeAgentSubscription, handleSelectPlan]
    );

    const builderComparisonRows = useMemo(
        () => buildDynamicComparisonRows(builderPlans, "builder"),
        [builderPlans]
    );
    const agentComparisonRows = useMemo(
        () => buildDynamicComparisonRows(agentPlans, "agent"),
        [agentPlans]
    );

    return (
        <div className={styles.pageWrapper}>
            <Nav />

            <main className={styles.main}>
                <section className={styles.hero}>
                    <div className={styles.container}>
                        <div className={styles.audienceToggle} role="tablist" aria-label="Pricing for">
                            {AUDIENCES.map(({ id, label, Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    id={`tab-${id}`}
                                    aria-selected={audience === id}
                                    aria-controls="pricing-panel"
                                    className={`${styles.audienceOption} ${audience === id ? styles.audienceOptionActive : ""}`}
                                    onClick={() => setAudience(id)}
                                >
                                    <Icon aria-hidden="true" /> {label}
                                </button>
                            ))}
                            <span
                                className={styles.audienceThumb}
                                style={{ transform: `translateX(${AUDIENCES.findIndex((a) => a.id === audience) * 100}%)` }}
                                aria-hidden="true"
                            />
                        </div>

                        <h1 className={styles.title}>{copy.title}</h1>
                        <p className={styles.subtitle}>{copy.subtitle}</p>
                    </div>
                </section>

                {/* Contextual Registration / Active Plan / Payment Feedback Banner */}
                <div className={styles.container}>
                    {bannerNotice && (
                        <div className={styles.statusAlertWrap}>
                            <div
                                className={`${styles.statusAlert} ${
                                    bannerNotice.type === "error"
                                        ? styles.statusAlertError
                                        : styles.statusAlertSuccess
                                }`}
                            >
                                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                                    {bannerNotice.type === "error" ? (
                                        <RiAlertLine size={18} />
                                    ) : (
                                        <RiCheckboxCircleFill size={18} />
                                    )}
                                    {bannerNotice.text}
                                </span>
                                {bannerNotice.type === "success" && (
                                    <Link href="/profile" className={styles.statusAlertAction}>
                                        Open Dashboard <RiArrowRightLine size={15} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {isAuthenticated && roleStatusForAudience === "pending" && (
                        <div className={styles.statusAlertWrap}>
                            <div className={`${styles.statusAlert} ${styles.statusAlertPending}`}>
                                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                                    <RiTimeLine size={18} />
                                    Your {audience === "builder" ? "Builder" : "Agent"} registration is awaiting admin approval. Plan purchase will unlock automatically once approved.
                                </span>
                                <Link href="/profile" className={styles.statusAlertAction}>
                                    Check Status <RiArrowRightLine size={15} />
                                </Link>
                            </div>
                        </div>
                    )}

                    {isAuthenticated && activeSubForAudience?.is_active && !bannerNotice && (
                        <div className={styles.statusAlertWrap}>
                            <div className={`${styles.statusAlert} ${styles.statusAlertSuccess}`}>
                                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                                    <RiCheckboxCircleFill size={18} />
                                    Active {audience === "builder" ? "Builder" : "Agent"} Plan:{" "}
                                    <strong>{activeSubForAudience.plan_title}</strong> ({activeSubForAudience.days_remaining} days pending · Valid until {activeSubForAudience.expires_at_formatted})
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    {currentTopups.length > 0 && (
                                        <a href="#topup-plans" className={styles.statusAlertAction}>
                                            <RiFlashlightLine size={15} /> Buy Top-Up
                                        </a>
                                    )}
                                    <Link href="/profile" className={styles.statusAlertAction}>
                                        Manage on Dashboard <RiArrowRightLine size={15} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div
                    id="pricing-panel"
                    role="tabpanel"
                    aria-labelledby={`tab-${audience}`}
                    key={audience}
                    className={styles.panel}
                >
                    <section
                        className={styles.cardsSection}
                        aria-label={audience === "builder" ? "Builder plans" : "Agent plans"}
                    >
                        {loading ? (
                            <div className={`${styles.container} ${styles.cardsGrid} ${styles.cardsGridThree}`}>
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className={styles.skeletonCard} aria-hidden="true">
                                        <div className={styles.skeletonLine} style={{ width: "65%", height: 28 }} />
                                        <div className={styles.skeletonLine} style={{ width: "90%" }} />
                                        <div className={styles.skeletonLine} style={{ width: "45%", height: 42, marginTop: 16 }} />
                                        <div className={styles.skeletonLine} style={{ width: "100%", height: 44, marginTop: 12 }} />
                                        <div className={styles.skeletonLine} style={{ width: "80%", marginTop: 20 }} />
                                        <div className={styles.skeletonLine} style={{ width: "75%" }} />
                                        <div className={styles.skeletonLine} style={{ width: "85%" }} />
                                        <div className={styles.skeletonLine} style={{ width: "70%" }} />
                                    </div>
                                ))}
                            </div>
                        ) : currentItems.length === 0 ? (
                            <div className={styles.container}>
                                <div className={styles.emptyState}>
                                    No active plans are currently available in this category.
                                </div>
                            </div>
                        ) : (
                            <div
                                className={`${styles.container} ${styles.cardsGrid} ${gridClassForCount(
                                    currentItems.length
                                )}`}
                            >
                                {currentItems.map((plan) => (
                                    <SubscriptionCard
                                        key={plan.id}
                                        plan={plan}
                                        billing={cardBilling[plan.id] || "monthly"}
                                        activeSubscription={activeSubForAudience}
                                        roleStatus={roleStatusForAudience}
                                        isPurchasing={purchasingPlanId === plan.id}
                                        onSelectPlan={handleSelectPlan}
                                        onBillingChange={(v) =>
                                            setCardBilling((prev) => ({ ...prev, [plan.id]: v }))
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {!loading && isAuthenticated && activeSubForAudience?.is_active && currentTopups.length > 0 && (
                        <section
                            id="topup-plans"
                            className={styles.topupSection}
                            aria-labelledby="topup-plans-title"
                        >
                            <div className={styles.container}>
                                <div className={styles.topupHeader}>
                                    <span className={styles.topupEyebrow}>
                                        <RiFlashlightLine aria-hidden="true" />{" "}
                                        {audience === "builder" ? "Builder Quota Top-Ups" : "Agent Quota Top-Ups"}
                                    </span>
                                    <h2 id="topup-plans-title" className={styles.topupTitle}>
                                        Need More Quotas on Your Active{" "}
                                        {audience === "builder" ? "Builder" : "Agent"} Plan?
                                    </h2>
                                    <p className={styles.topupSubtitle}>
                                        Only one {audience === "builder" ? "Builder" : "Agent"} base plan can run at a
                                        time. Top up extra{" "}
                                        {audience === "builder"
                                            ? "projects, floor units, property listings, or video reels"
                                            : "property listings or video reels"}{" "}
                                        instantly — valid until{" "}
                                        <strong>{activeSubForAudience.expires_at_formatted}</strong>.
                                    </p>
                                </div>

                                <div
                                    className={`${styles.cardsGrid} ${gridClassForCount(currentTopups.length)}`}
                                >
                                    {currentTopups.map((topup) => (
                                        <TopupCard
                                            key={topup.id}
                                            topup={topup}
                                            activeSubscription={activeSubForAudience}
                                            isPurchasing={purchasingPlanId === topup.id}
                                            onSelectTopup={handleSelectTopup}
                                        />
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {!loading &&
                        (audience === "builder" ? (
                            <Comparison title={copy.compare} columns={builderColumns} rows={builderComparisonRows} />
                        ) : (
                            <Comparison title={copy.compare} columns={agentColumns} rows={agentComparisonRows} />
                        ))}
                </div>
            </main>

            {/* Approval / Registration Gate Modal */}
            {gateModal && (
                <div
                    className={styles.gateModalBackdrop}
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setGateModal(null)}
                >
                    <div className={styles.gateModalCard} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.gateModalIcon}>
                            <RiTimeLine aria-hidden="true" />
                        </div>
                        <h3 className={styles.gateModalTitle}>{gateModal.title}</h3>
                        <p className={styles.gateModalText}>{gateModal.text}</p>
                        <div className={styles.gateModalActions}>
                            <button
                                type="button"
                                className={styles.gateModalSecondary}
                                onClick={() => setGateModal(null)}
                            >
                                Close
                            </button>
                            {gateModal.primaryHref && (
                                <Link
                                    href={gateModal.primaryHref}
                                    className={styles.gateModalPrimary}
                                    onClick={() => setGateModal(null)}
                                >
                                    {gateModal.primaryLabel} <RiArrowRightLine size={15} />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

export default function PricingPage() {
    return <PricingContent />;
}
