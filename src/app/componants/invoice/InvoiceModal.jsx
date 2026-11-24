"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./InvoiceModal.module.css";
import {
    RiCloseLine,
    RiShieldCheckLine,
    RiCheckboxCircleFill,
    RiCalendarLine,
    RiFilmLine,
    RiBuildingLine,
    RiTimeLine,
} from "react-icons/ri";

const KERALAPLOTS_LOGO = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public";

export default function InvoiceModal({
    isOpen,
    onClose,
    invoiceData,
    currentUser,
}) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !invoiceData) return null;

    // Extract invoice fields with safe fallbacks
    const invoiceNo = invoiceData.invoice_no || `KP-INV-${String(invoiceData.id || 1).padStart(5, "0")}`;
    const invoiceDate = invoiceData.date || invoiceData.created_at_formatted || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const invoiceTime = invoiceData.time || "";

    const customer = invoiceData.customer || {};
    const customerName = customer.name || currentUser?.name || currentUser?.username || "Valued Customer";
    const customerRole = customer.role || (currentUser?.role_val === "agent" || currentUser?.role === "agent" ? "Agent" : "User");
    const customerPhone = customer.phone || currentUser?.phone || currentUser?.phone_number || "";
    const customerEmail = customer.email || currentUser?.email || "";

    const isTopup = invoiceData.type === "topup" || invoiceData.plan_type === "topup";
    const isSubscription =
        !isTopup &&
        (invoiceData.type === "subscription" ||
            (!invoiceData.type && (invoiceData.plan_title || invoiceData.plan_title_snapshot)));
    const isReel = invoiceData.type === "reel";

    const title =
        invoiceData.title ||
        (isTopup
            ? `${invoiceData.plan_title || "Quota Top-Up"} (Top-Up Plan)`
            : isSubscription
            ? `${invoiceData.plan_title || "Subscription"} Plan`
            : isReel
            ? "Reel Spotlight Promotion"
            : "Property Listing Publication");
    const amount = Number(invoiceData.amount || invoiceData.price || invoiceData.amount_val || 0).toFixed(2);
    const paymentId = invoiceData.payment_id || invoiceData.razorpay_payment_id || "N/A";
    const orderId = invoiceData.order_id || invoiceData.razorpay_order_id || "N/A";

    const details = invoiceData.details || {};
    const daysPending = details.days_pending ?? invoiceData.days_remaining ?? null;
    const reelsPending = details.reels_pending ?? invoiceData.reel_remaining ?? null;
    const propertyPending = details.properties_pending ?? invoiceData.property_remaining ?? null;
    const expiresAt = details.expires_at || invoiceData.expires_at_formatted || null;

    const topupAddedParts = [];
    if (Number(details.projects_added || invoiceData.project_count || invoiceData.project_limit || 0) > 0) {
        const n = Number(details.projects_added || invoiceData.project_count || invoiceData.project_limit);
        topupAddedParts.push(`+${n} Active Project${n === 1 ? "" : "s"}`);
    }
    if (Number(details.units_added || invoiceData.unit_count || invoiceData.unit_limit || 0) > 0) {
        const n = Number(details.units_added || invoiceData.unit_count || invoiceData.unit_limit);
        topupAddedParts.push(`+${n} Floor Unit${n === 1 ? "" : "s"}`);
    }
    if (Number(details.properties_added || invoiceData.property_count || invoiceData.property_limit || 0) > 0) {
        const n = Number(details.properties_added || invoiceData.property_count || invoiceData.property_limit);
        topupAddedParts.push(`+${n} Property Listing${n === 1 ? "" : "s"}`);
    }
    if (Number(details.reels_added || invoiceData.reel_count || invoiceData.reel_limit || 0) > 0) {
        const n = Number(details.reels_added || invoiceData.reel_count || invoiceData.reel_limit);
        topupAddedParts.push(`+${n} Video Reel${n === 1 ? "" : "s"}`);
    }

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.invoiceCard} onClick={(e) => e.stopPropagation()}>
                {/* Modal Top Bar (visible on screen only) */}
                <div className={styles.modalTopBar}>
                    <div className={styles.modalTopTitle}>
                        <RiShieldCheckLine size={18} color="#059669" />
                        <span>Official Tax Invoice &bull; {invoiceNo}</span>
                    </div>
                    <div className={styles.topActions}>
                        <button
                            type="button"
                            className={styles.closeBtn}
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <RiCloseLine size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Invoice Sheet */}
                <div className={styles.invoiceSheetWrapper}>
                    <div className={styles.invoiceSheet} id="keralaplotsPrintableInvoice">
                        {/* Header */}
                        <div className={styles.headerRow}>
                            <div className={styles.brandWrap}>
                                <img
                                    src={KERALAPLOTS_LOGO}
                                    alt="KeralaPlots Logo"
                                    className={styles.logoImage}
                                />
                                <span className={styles.brandTagline}>malayali&apos;s realestate partner</span>
                                <div className={styles.companyInfo}>
                                    KeralaPlots.com<br />
                                    +91 9496187119<br />
                                    info@keralaplots.com<br />
                                    Angamaly,Kerala 683572
                                </div>
                            </div>

                            <div className={styles.invoiceMetaWrap}>
                                <span className={styles.invoiceBadge}>Official Tax Receipt</span>
                                <h2 className={styles.invoiceTitle}>TAX INVOICE</h2>
                                <span className={styles.invoiceNumber}>Invoice #: {invoiceNo}</span>
                                <span className={styles.invoiceDate}>
                                    Date: {invoiceDate} {invoiceTime ? `at ${invoiceTime}` : ""}
                                </span>
                            </div>
                        </div>

                        {/* Customer & Payment Meta Grid */}
                        <div className={styles.metaGrid}>
                            <div>
                                <div className={styles.metaColTitle}>Billed To</div>
                                <div className={styles.customerName}>
                                    <span>{customerName}</span>
                                    {(customerRole.toLowerCase() === "agent" ||
                                        customerRole.toLowerCase() === "builder") && (
                                        <span className={styles.agentBadge}>
                                            <RiShieldCheckLine size={12} /> Verified {customerRole}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.customerDetails}>
                                    {customerPhone && <div>Phone: +91 {customerPhone}</div>}
                                    {customerEmail && <div>Email: {customerEmail}</div>}
                                    <div>Platform: KeralaPlots Partner Portal</div>
                                </div>
                            </div>

                            <div>
                                <div className={styles.metaColTitle}>Payment Information</div>
                                <div className={styles.paymentDetailsList}>
                                    <div className={styles.paymentDetailRow}>
                                        <span className={styles.paymentDetailLabel}>Payment Status:</span>
                                        <span className={styles.statusPaidBadge}>
                                            <RiCheckboxCircleFill size={13} /> PAID
                                        </span>
                                    </div>
                                    <div className={styles.paymentDetailRow}>
                                        <span className={styles.paymentDetailLabel}>Method:</span>
                                        <span className={styles.paymentDetailValue}>Razorpay Online (UPI/Cards/Netbanking)</span>
                                    </div>
                                    <div className={styles.paymentDetailRow}>
                                        <span className={styles.paymentDetailLabel}>Payment ID:</span>
                                        <span className={styles.paymentDetailValue}>{paymentId}</span>
                                    </div>
                                    <div className={styles.paymentDetailRow}>
                                        <span className={styles.paymentDetailLabel}>Order ID:</span>
                                        <span className={styles.paymentDetailValue}>{orderId}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Active Quota Highlights (Pending Days, Pending Reels, Pending Properties) */}
                        {isSubscription && (daysPending !== null || reelsPending !== null || propertyPending !== null) && (
                            <div className={styles.quotaHighlightBox}>
                                <div className={styles.quotaHighlightHeader}>
                                    <div className={styles.quotaHighlightTitle}>
                                        <RiShieldCheckLine size={16} color="#059669" />
                                        <span>Subscription Entitlement &amp; Pending Balance</span>
                                    </div>
                                    {expiresAt && (
                                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                                            Valid until: <strong>{expiresAt}</strong>
                                        </span>
                                    )}
                                </div>

                                <div className={styles.quotaCardsRow}>
                                    <div className={styles.quotaMiniCard}>
                                        <span className={styles.quotaMiniLabel}>
                                            <RiCalendarLine size={14} color="#059669" /> Days Pending
                                        </span>
                                        <span className={styles.quotaMiniValue}>
                                            {daysPending !== null ? `${daysPending} Days` : "Active"}
                                        </span>
                                        <span className={styles.quotaMiniSub}>Remaining validity</span>
                                    </div>

                                    <div className={styles.quotaMiniCard}>
                                        <span className={styles.quotaMiniLabel}>
                                            <RiFilmLine size={14} color="#059669" /> Reels Pending
                                        </span>
                                        <span className={styles.quotaMiniValue}>
                                            {details.reel_limit === "Unlimited" || invoiceData.reel_unlimited
                                                ? "Unlimited"
                                                : `${reelsPending ?? 0} Reels`}
                                        </span>
                                        <span className={styles.quotaMiniSub}>
                                            {details.reels_used !== undefined ? `${details.reels_used} used` : "Video Spotlight quota"}
                                        </span>
                                    </div>

                                    <div className={styles.quotaMiniCard}>
                                        <span className={styles.quotaMiniLabel}>
                                            <RiBuildingLine size={14} color="#059669" /> Property Pending
                                        </span>
                                        <span className={styles.quotaMiniValue}>
                                            {details.property_limit === "Unlimited" || invoiceData.property_unlimited
                                                ? "Unlimited"
                                                : `${propertyPending ?? 0} Properties`}
                                        </span>
                                        <span className={styles.quotaMiniSub}>
                                            {details.properties_used !== undefined ? `${details.properties_used} used` : "Listing publication quota"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Itemized Table */}
                        <div className={styles.tableWrap}>
                            <table className={styles.invoiceTable}>
                                <thead>
                                    <tr>
                                        <th style={{ width: "8%" }}>#</th>
                                        <th style={{ width: "52%" }}>Description &amp; Services</th>
                                        <th style={{ width: "15%" }}>Qty</th>
                                        <th style={{ width: "25%" }}>Amount (INR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>01</td>
                                        <td>
                                            <div className={styles.itemTitle}>{title}</div>
                                            <div className={styles.itemDesc}>
                                                {isTopup ? (
                                                    <>
                                                        {details.parent_plan_title || invoiceData.parent_plan_title ? (
                                                            <>
                                                                Applied to Active Plan:{" "}
                                                                <strong>
                                                                    {details.parent_plan_title || invoiceData.parent_plan_title}
                                                                </strong>
                                                                {expiresAt ? ` (Valid until ${expiresAt})` : ""}
                                                                <br />
                                                            </>
                                                        ) : expiresAt && expiresAt !== "-" ? (
                                                            <>
                                                                Valid until: <strong>{expiresAt}</strong>
                                                                <br />
                                                            </>
                                                        ) : null}
                                                        Added Quotas:{" "}
                                                        {topupAddedParts.length > 0
                                                            ? topupAddedParts.join(" • ")
                                                            : "Instant Quota Booster Add-on"}
                                                    </>
                                                ) : isSubscription ? (
                                                    <>
                                                        Duration: {details.duration || invoiceData.duration_display || "Active Period"}<br />
                                                        Includes:{" "}
                                                        {details.project_limit !== undefined && details.project_limit !== null
                                                            ? `${details.project_limit} Active Projects • ${details.unit_limit ?? 0} Floor Units • `
                                                            : ""}
                                                        {details.property_limit ?? invoiceData.property_limit ?? "All"} Property Listings &bull;{" "}
                                                        {details.reel_limit ?? invoiceData.reel_limit ?? "All"} Video Reels Spotlight &bull; Direct Buyer Inquiries
                                                    </>
                                                ) : isReel ? (
                                                    <>
                                                        Reel Spotlight Fee &bull; Lifetime Feed Promotion &bull; Direct WhatsApp Buyer Inquiries
                                                    </>
                                                ) : (
                                                    <>
                                                        Property Verification &bull; Public Search Listing &bull; High Intent Buyer Leads
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td>1</td>
                                        <td>₹{amount}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className={styles.totalSection}>
                            <table className={styles.totalTable}>
                                <tbody>
                                    <tr>
                                        <td>Subtotal:</td>
                                        <td>₹{amount}</td>
                                    </tr>
                                    <tr>
                                        <td>Taxes (GST 18% Inclusive):</td>
                                        <td>₹0.00</td>
                                    </tr>
                                    <tr className={styles.grandTotalRow}>
                                        <td>Total Paid:</td>
                                        <td>₹{amount}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer & Authorized Signatory */}
                        <div className={styles.invoiceFooter}>
                            <div className={styles.footerNotes}>
                                <strong>Terms &amp; Notice:</strong><br />
                                &bull; This is an electronically generated tax invoice and payment confirmation. No physical signature is required.<br />
                                &bull; All fees paid are in accordance with KeralaPlots.com Agent &amp; Customer Terms of Service.<br />
                                &bull; For billing queries, write to info@keralaplots.com or WhatsApp support.
                            </div>

                            <div className={styles.sealArea}>
                                <div className={styles.sealStamp}>
                                    <RiCheckboxCircleFill size={16} />
                                    <span>PAID</span>
                                    <span>VERIFIED</span>
                                </div>
                                <span className={styles.sealLabel}>KeralaPlots Billing</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
