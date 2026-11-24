"use client";

import styles from "./postedReels.module.css";
import { RiCloseLine } from "react-icons/ri";

/* Split out of PostedReels.jsx so it loads as its own chunk, only when needed. */
export default function PostedReelEditModal({
    editCaption,
    editLocation,
    editPrice,
    editStatus,
    handleEditSubmit,
    isSavingEdit,
    setEditCaption,
    setEditLocation,
    setEditPrice,
    setEditStatus,
    setEditingReel,
}) {
    return (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            onClick={() => !isSavingEdit && setEditingReel(null)}
        >
            <div
                className={styles.dialog}
                style={{ maxWidth: "480px", textAlign: "left" }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className={styles.dialogClose}
                    disabled={isSavingEdit}
                    onClick={() => setEditingReel(null)}
                    aria-label="Close"
                >
                    <RiCloseLine />
                </button>
        
                <h2 className={styles.deleteTitle} style={{ textAlign: "left", marginBottom: "16px" }}>
                    Edit Reel Details
                </h2>
        
                <form onSubmit={handleEditSubmit}>
                    <div style={{ marginBottom: "14px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                            Caption
                        </label>
                        <textarea
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                border: "1.5px solid #e2e8f0",
                                borderRadius: "10px",
                                fontSize: "14px",
                                color: "#0f172a",
                                boxSizing: "border-box",
                                resize: "vertical",
                            }}
                            rows={3}
                            placeholder="Enter caption..."
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            required
                        />
                    </div>
        
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                                Price
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    border: "1.5px solid #e2e8f0",
                                    borderRadius: "10px",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                                placeholder="e.g. ₹95 Lakhs"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                                Location
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    border: "1.5px solid #e2e8f0",
                                    borderRadius: "10px",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                                placeholder="e.g. Marine Drive, Kochi"
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                            />
                        </div>
                    </div>
        
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                            Status
                        </label>
                        <select
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                border: "1.5px solid #e2e8f0",
                                borderRadius: "10px",
                                fontSize: "14px",
                                boxSizing: "border-box",
                                background: "#fff",
                            }}
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                        >
                            <option value="Active">Active (Visible in Feed)</option>
                            <option value="Inactive">Inactive (Hidden)</option>
                        </select>
                    </div>
        
                    <div className={styles.dialogActions}>
                        <button
                            type="button"
                            className={styles.deleteCancel}
                            disabled={isSavingEdit}
                            onClick={() => setEditingReel(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: "10px 20px",
                                background: "#2563eb",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "10px",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: isSavingEdit ? "not-allowed" : "pointer",
                            }}
                            disabled={isSavingEdit}
                        >
                            {isSavingEdit ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
