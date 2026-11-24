"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./offers.module.css";
import { offersApi, messagesApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getPropertyUrl } from "../../lib/seoHelper";
import {
    RiSearchLine,
    RiCheckLine,
    RiCloseLine,
    RiExchangeLine,
    RiPhoneLine,
    RiMailLine,
    RiWhatsappLine,
    RiMessage3Line,
    RiMapPinLine,
    RiPriceTag3Line,
    RiCheckboxCircleFill,
    RiRefreshLine,
    RiArrowRightSLine,
} from "react-icons/ri";
import { getPropertyCode } from "../../lib/propertyCode";

export default function PropertyOffersPage() {
    const router = useRouter();
    const { user: authUser } = useAuth();

    const [activeTab, setActiveTab] = useState("received"); // "received" | "sent"
    const [receivedOffers, setReceivedOffers] = useState([]);
    const [sentOffers, setSentOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "accepted" | "countered" | "rejected"
    const [toastMessage, setToastMessage] = useState("");

    // Counter offer modal state
    const [counterModalOffer, setCounterModalOffer] = useState(null);
    const [counterAmount, setCounterAmount] = useState("");
    const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 4000);
    };

    const fetchOffers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await offersApi.listUserOffers();
            if (res?.success && res.data) {
                setReceivedOffers(res.data.received || []);
                setSentOffers(res.data.sent || []);
            }
        } catch (e) {
            console.error("Failed to load offers", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers, authUser]);

    // Accept Offer
    const handleAccept = async (offerId) => {
        try {
            const res = await offersApi.updateStatus(offerId, { status: "accepted" });
            if (res?.success) {
                setReceivedOffers((prev) =>
                    prev.map((o) => (o.id === offerId ? { ...o, status: "accepted" } : o))
                );
                triggerToast("Offer accepted! The buyer has been notified.");
            }
        } catch (e) {
            triggerToast("Failed to accept offer.");
        }
    };

    // Reject Offer
    const handleReject = async (offerId) => {
        try {
            const res = await offersApi.updateStatus(offerId, { status: "rejected" });
            if (res?.success) {
                setReceivedOffers((prev) =>
                    prev.map((o) => (o.id === offerId ? { ...o, status: "rejected" } : o))
                );
                triggerToast("Offer declined.");
            }
        } catch (e) {
            triggerToast("Failed to decline offer.");
        }
    };

    // Open Counter Modal
    const handleOpenCounter = (offer) => {
        setCounterModalOffer(offer);
        setCounterAmount(String(offer.offer_amount || ""));
    };

    // Submit Counter
    const handleCounterSubmit = async (e) => {
        e.preventDefault();
        if (!counterModalOffer || !counterAmount.trim() || isSubmittingCounter) return;
        const amt = parseFloat(counterAmount.trim());
        if (isNaN(amt) || amt <= 0) {
            triggerToast("Please enter a valid counter amount.");
            return;
        }

        setIsSubmittingCounter(true);
        try {
            const res = await offersApi.updateStatus(counterModalOffer.id, {
                status: "countered",
                counter_amount: amt,
            });
            if (res?.success) {
                setReceivedOffers((prev) =>
                    prev.map((o) =>
                        o.id === counterModalOffer.id
                            ? {
                                  ...o,
                                  status: "countered",
                                  counter_amount: amt,
                                  counter_amount_formatted: "₹" + Number(amt).toLocaleString("en-IN"),
                              }
                            : o
                    )
                );
                setCounterModalOffer(null);
                setCounterAmount("");
                triggerToast(`Counter offer of ₹${Number(amt).toLocaleString("en-IN")} sent to buyer.`);
            }
        } catch (e) {
            triggerToast("Failed to send counter offer.");
        } finally {
            setIsSubmittingCounter(false);
        }
    };

    // Start chat with user
    const handleStartChat = async (otherUserId) => {
        try {
            await messagesApi.createConversation(otherUserId);
            router.push("/messages");
        } catch (e) {
            router.push("/messages");
        }
    };

    // Filter offers
    const currentList = activeTab === "received" ? receivedOffers : sentOffers;
    const filteredOffers = useMemo(() => {
        return currentList.filter((offer) => {
            // Status filter
            if (statusFilter !== "all" && offer.status !== statusFilter) {
                return false;
            }
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = (offer.property_title || "").toLowerCase().includes(q);
                const codeMatch = (offer.property_code || "").toLowerCase().includes(q);
                const nameMatch = (offer.user?.name || "").toLowerCase().includes(q);
                const locMatch = (offer.property_location || "").toLowerCase().includes(q);
                return titleMatch || codeMatch || nameMatch || locMatch;
            }
            return true;
        });
    }, [currentList, statusFilter, searchQuery]);

    const getStatusClass = (status) => {
        switch (status) {
            case "accepted":
                return styles.statusAccepted;
            case "rejected":
                return styles.statusRejected;
            case "countered":
                return styles.statusCountered;
            default:
                return styles.statusPending;
        }
    };

    return (
        <div className={styles.container}>
            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: "fixed",
                    top: "24px",
                    right: "24px",
                    background: "#0f172a",
                    color: "#ffffff",
                    padding: "12px 20px",
                    borderRadius: "10px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
                    zIndex: 99999,
                    fontSize: "14px",
                    fontWeight: 500,
                }}>
                    {toastMessage}
                </div>
            )}

            {/* Header Area */}
            <div className={styles.headerRow}>
                <div className={styles.titleArea}>
                    <h1>Property Offers</h1>
                    <p>Track bids made by prospective buyers on your listings, and view your own submitted offers.</p>
                </div>
                <button
                    type="button"
                    className={styles.filterPill}
                    onClick={fetchOffers}
                    title="Refresh Offers"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                    <RiRefreshLine /> Refresh
                </button>
            </div>

            {/* Tabs Row */}
            <div className={styles.tabsRow}>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === "received" ? styles.tabBtnActive : ""}`}
                    onClick={() => setActiveTab("received")}
                >
                    <span>Offers Received</span>
                    <span className={`${styles.tabBadge} ${activeTab === "received" ? styles.tabBadgeActive : ""}`}>
                        {receivedOffers.length}
                    </span>
                </button>

                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === "sent" ? styles.tabBtnActive : ""}`}
                    onClick={() => setActiveTab("sent")}
                >
                    <span>Offers Made</span>
                    <span className={`${styles.tabBadge} ${activeTab === "sent" ? styles.tabBadgeActive : ""}`}>
                        {sentOffers.length}
                    </span>
                </button>
            </div>

            {/* Search and Status Filters */}
            <div className={styles.filterBar}>
                <div className={styles.searchBox}>
                    <RiSearchLine style={{ color: "#94a3b8" }} />
                    <input
                        type="text"
                        placeholder="Search by property, code, or user..."
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.statusFilter}>
                    {["all", "pending", "accepted", "countered", "rejected"].map((st) => (
                        <button
                            key={st}
                            type="button"
                            className={`${styles.filterPill} ${statusFilter === st ? styles.filterPillActive : ""}`}
                            onClick={() => setStatusFilter(st)}
                            style={{ textTransform: "capitalize" }}
                        >
                            {st}
                        </button>
                    ))}
                </div>
            </div>

            {/* Offers List */}
            {isLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
                    <RiRefreshLine style={{ animation: "spin 1s linear infinite", fontSize: "24px" }} />
                    <p style={{ marginTop: "10px" }}>Loading property offers...</p>
                </div>
            ) : filteredOffers.length > 0 ? (
                <div className={styles.offersList}>
                    {filteredOffers.map((offer) => (
                        <div key={offer.id} className={styles.offerCard}>
                            {/* Top row: Property thumbnail + details + price + status */}
                            <div className={styles.offerTop}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img loading="lazy" decoding="async"
                                    src={offer.property_image}
                                    alt={offer.property_title}
                                    className={styles.propThumb}
                                />

                                <div className={styles.propDetails}>
                                    <span className={styles.propCode}>{offer.property_code || getPropertyCode({ property_id: offer.property_id })}</span>
                                    <Link href={getPropertyUrl(offer.property_id, offer.property_title)} className={styles.propTitle}>
                                        {offer.property_title}
                                    </Link>
                                    <div className={styles.propLocation}>
                                        <RiMapPinLine /> {offer.property_location}
                                    </div>

                                    <div className={styles.priceComparison}>
                                        <span className={styles.listedPrice}>
                                            Listed: <strong>{offer.property_price}</strong>
                                        </span>
                                        <span className={styles.offerAmount}>
                                            Offered: <strong>{offer.offer_amount_formatted}</strong>
                                        </span>
                                        {offer.counter_amount_formatted && (
                                            <span style={{ fontSize: "13px", color: "#6d28d9", background: "#f5f3ff", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
                                                Counter: {offer.counter_amount_formatted}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.statusArea}>
                                    <span className={`${styles.statusBadge} ${getStatusClass(offer.status)}`}>
                                        {offer.status}
                                    </span>
                                    <span className={styles.offerDate}>
                                        {offer.date} &bull; {offer.time}
                                    </span>
                                </div>
                            </div>

                            {/* Bottom row: Buyer / Seller Profile & Actions */}
                            <div className={styles.offerBottom}>
                                <div className={styles.userInfo}>
                                    {offer.user?.photo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img loading="lazy" decoding="async"
                                            src={offer.user.photo}
                                            alt={offer.user.name}
                                            className={styles.userAvatar}
                                            onError={(e) => {
                                                e.currentTarget.src = "/user-placeholder.jpg";
                                            }}
                                        />
                                    ) : (
                                        <div className={styles.userAvatar}>
                                            {(offer.user?.name || "U").charAt(0).toUpperCase()}
                                        </div>
                                    )}

                                    <div>
                                        <div className={styles.userName}>
                                            <span>{activeTab === "received" ? "Bidder:" : "Owner:"} <strong>{offer.user?.name || "User"}</strong></span>
                                            {offer.user?.verified && (
                                                <RiCheckboxCircleFill className={styles.verifiedBadge} title="Verified User" />
                                            )}
                                        </div>

                                        <div className={styles.userContactLinks}>
                                            {offer.user?.phone && (
                                                <>
                                                    <a href={`tel:${offer.user.phone}`} className={styles.contactLink}>
                                                        <RiPhoneLine /> {offer.user.phone}
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/91${offer.user.phone}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={styles.contactLink}
                                                        style={{ color: "#16a34a" }}
                                                    >
                                                        <RiWhatsappLine /> WhatsApp
                                                    </a>
                                                </>
                                            )}
                                            {offer.user?.email && (
                                                <a href={`mailto:${offer.user.email}`} className={styles.contactLink}>
                                                    <RiMailLine /> Email
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons for Received Offers */}
                                <div className={styles.actionsGroup}>
                                    {activeTab === "received" && offer.status === "pending" && (
                                        <>
                                            <button
                                                type="button"
                                                className={`${styles.btnAction} ${styles.btnAccept}`}
                                                onClick={() => handleAccept(offer.id)}
                                            >
                                                <RiCheckLine /> Accept
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.btnAction} ${styles.btnCounter}`}
                                                onClick={() => handleOpenCounter(offer)}
                                            >
                                                <RiExchangeLine /> Counter
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.btnAction} ${styles.btnReject}`}
                                                onClick={() => handleReject(offer.id)}
                                            >
                                                <RiCloseLine /> Decline
                                            </button>
                                        </>
                                    )}

                                    {offer.user?.id && (
                                        <button
                                            type="button"
                                            className={`${styles.btnAction} ${styles.btnChat}`}
                                            onClick={() => handleStartChat(offer.user.id)}
                                        >
                                            <RiMessage3Line /> Chat
                                        </button>
                                    )}

                                    <Link
                                        href={getPropertyUrl(offer.property_id, offer.property_title)}
                                        className={`${styles.btnAction} ${styles.btnChat}`}
                                        style={{ textDecoration: "none" }}
                                    >
                                        View Property <RiArrowRightSLine />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyBox}>
                    <RiPriceTag3Line style={{ fontSize: "42px", color: "#cbd5e1" }} />
                    <h3 className={styles.emptyTitle}>
                        {activeTab === "received" ? "No Offers Received Yet" : "No Offers Made Yet"}
                    </h3>
                    <p className={styles.emptyDesc}>
                        {activeTab === "received"
                            ? "When buyers place offers on your published properties, they will appear here."
                            : "Browse properties and submit your price offers to sellers directly."}
                    </p>
                </div>
            )}

            {/* Counter Offer Modal */}
            {counterModalOffer && (
                <div className={styles.modalOverlay} onClick={() => setCounterModalOffer(null)}>
                    <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Counter Offer</h3>
                        <p className={styles.modalDesc}>
                            The buyer offered <strong>{counterModalOffer.offer_amount_formatted}</strong> for{" "}
                            <strong>{counterModalOffer.property_title}</strong>. Enter your counter offer below:
                        </p>

                        <form onSubmit={handleCounterSubmit}>
                            <div className={styles.modalInputWrapper}>
                                <span style={{ fontWeight: 700, color: "#64748b" }}>₹</span>
                                <input
                                    type="number"
                                    placeholder="Enter counter amount"
                                    className={styles.modalInput}
                                    value={counterAmount}
                                    onChange={(e) => setCounterAmount(e.target.value)}
                                    required
                                    autoFocus
                                    disabled={isSubmittingCounter}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={`${styles.btnAction} ${styles.btnReject}`}
                                    onClick={() => setCounterModalOffer(null)}
                                    disabled={isSubmittingCounter}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`${styles.btnAction} ${styles.btnAccept}`}
                                    disabled={isSubmittingCounter}
                                >
                                    {isSubmittingCounter ? "Sending..." : "Send Counter Offer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
