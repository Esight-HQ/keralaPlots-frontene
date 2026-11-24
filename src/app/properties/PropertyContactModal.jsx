"use client";

import {
    RiCloseLine,
    RiShieldCheckLine,
    RiPhoneLine,
    RiWhatsappLine,
    RiVerifiedBadgeFill
} from "react-icons/ri";
import styles from "./propertyDetail.module.css";
import { dashboardApi } from "../lib/api";


/* Split out of PropertyDetailClient.jsx so it loads as its own chunk, only when needed. */
export default function PropertyContactModal({
    agentMsg,
    handleContactSubmit,
    isSendingMessage,
    propOwner,
    propertyData,
    rawId,
    setAgentMsg,
    setShowContactModal,
}) {
    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px"
        }} onClick={() => setShowContactModal(false)}>
            <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "480px",
                padding: "20px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                position: "relative",
                color: "#1e293b",
                fontFamily: "system-ui, -apple-system, sans-serif"
            }} onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    style={{
                        position: "absolute",
                        top: "20px",
                        right: "20px",
                        background: "none",
                        border: "none",
                        fontSize: "24px",
                        color: "#94a3b8",
                        cursor: "pointer"
                    }}
                >
                    <RiCloseLine />
                </button>

                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px 0" }}>
                    Contact {propOwner.role === "Agent" ? "Agent" : "Owner"}
                </h3>

                {/* Owner Profile & Phone Box */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "14px",
                    marginBottom: "20px",
                    border: "1px solid #e2e8f0"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <img
                            src={propOwner.photo || "/logo_placeholder.png"}
                            alt={propOwner.name || "Property owner"}
                            style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }}
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/logo_placeholder.png";
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{propOwner.name || "Property Owner"}</span>
                                <div className={styles.verifiedBadge} style={{ display: "inline-flex" }}>
                                    <RiVerifiedBadgeFill />
                                    {/* <span>Verified</span> */}
                                </div>
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>{propOwner.role || "Property Owner"}</div>
                        </div>
                    </div>

                    {/* Phone number display with Call & WhatsApp shortcuts */}
                    {propOwner.phone && (
                        <>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", width: '100%' }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 12px",
                                    background: "#ffffff",
                                    borderRadius: "10px",
                                    border: "1px solid #e2e8f0",
                                    width: '100%'
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <RiPhoneLine style={{ color: "#2563eb", fontSize: "16px" }} />
                                        <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
                                            +91 {propOwner.phone}
                                        </span>
                                    </div>
                                    <a
                                        href={`tel:${propOwner.phone}`}
                                        onClick={() => {
                                            const propId = propertyData?.propertyId || propertyData?.id || rawId;
                                            dashboardApi.recordCall(propId, "phone").catch(() => { });
                                        }}
                                        style={{
                                            padding: "6px 10px",
                                            borderRadius: "6px",
                                            background: "#eff6ff",
                                            color: "#2563eb",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            textDecoration: "none",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}
                                    >
                                        Call
                                    </a>
                                </div>

                                <a
                                    href={`https://wa.me/91${propOwner.phone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        const propId = propertyData?.propertyId || propertyData?.id || rawId;
                                        dashboardApi.recordCall(propId, "whatsapp").catch(() => { });
                                    }}
                                    style={{
                                        // padding: "6px 10px",
                                        // borderRadius: "6px",
                                        // background: "#ecfdf5",
                                        color: "#16a34a",
                                        fontSize: "18px",
                                        fontWeight: "600",
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}
                                >
                                    <RiWhatsappLine />
                                </a>
                            </div>
                        </>
                    )}
                </div>

                <form onSubmit={handleContactSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Your Message</label>
                        <textarea
                            required
                            rows={4}
                            style={{
                                padding: "12px 14px",
                                borderRadius: "10px",
                                border: "1.5px solid #cbd5e1",
                                fontSize: "13.5px",
                                lineHeight: "1.5",
                                fontFamily: "inherit",
                                resize: "vertical",
                                outline: "none",
                                color: "#0f172a"
                            }}
                            placeholder="Write your message here..."
                            value={agentMsg}
                            onChange={(e) => setAgentMsg(e.target.value)}
                            disabled={isSendingMessage}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.ctaBtnPrimary}
                        style={{ margin: "10px 0 0 0" }}
                        disabled={isSendingMessage}
                    >
                        {isSendingMessage ? "Sending Message..." : "Send Message"}
                    </button>
                </form>
            </div>
        </div>
    );
}
