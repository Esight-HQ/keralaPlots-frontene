"use client";

import styles from "./postedReels.module.css";
import { RiCloseLine, RiUploadCloud2Line } from "react-icons/ri";

/* Split out of PostedReels.jsx so it loads as its own chunk, only when needed. */
export default function PostedReelUploadModal({
    handleUploadSubmit,
    handleVideoFileChange,
    isUploading,
    setShowUploadModal,
    setUploadCaption,
    setUploadLocation,
    setUploadPrice,
    uploadCaption,
    uploadLocation,
    uploadPrice,
    uploadProgress,
    uploadVideoFile,
    uploadVideoPreview,
}) {
    return (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            onClick={() => !isUploading && setShowUploadModal(false)}
        >
            <div
                className={styles.dialog}
                style={{ maxWidth: "480px", textAlign: "left" }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className={styles.dialogClose}
                    disabled={isUploading}
                    onClick={() => setShowUploadModal(false)}
                    aria-label="Close"
                >
                    <RiCloseLine />
                </button>
        
                <h2 className={styles.deleteTitle} style={{ textAlign: "left", marginBottom: "16px" }}>
                    Post a Property Reel
                </h2>
        
                <form onSubmit={handleUploadSubmit}>
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                            Video File (MP4, MOV, WEBM max 100MB)
                        </label>
                        <div
                            style={{
                                border: "2px dashed #cbd5e1",
                                borderRadius: "12px",
                                padding: "24px 16px",
                                textAlign: "center",
                                cursor: "pointer",
                                background: "#f8fafc",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                            }}
                            onClick={() => document.getElementById("profileReelVideoInput")?.click()}
                        >
                            <input
                                id="profileReelVideoInput"
                                type="file"
                                accept="video/mp4,video/quicktime,video/webm"
                                style={{ display: "none" }}
                                onChange={handleVideoFileChange}
                            />
                            {uploadVideoPreview ? (
                                <video disableRemotePlayback
                                    src={uploadVideoPreview}
                                    style={{ maxHeight: "160px", borderRadius: "8px" }}
                                    controls
                                />
                            ) : (
                                <>
                                    <RiUploadCloud2Line style={{ fontSize: "36px", color: "#2563eb" }} />
                                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                                        Select or Drop Video
                                    </span>
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                                        Vertical format recommended
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
        
                    <div style={{ marginBottom: "14px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                            Caption & Hashtags
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
                            rows={2}
                            placeholder="e.g. Modern 3 BHK Apartment in Marine Drive, Kochi #KochiHomes"
                            value={uploadCaption}
                            onChange={(e) => setUploadCaption(e.target.value)}
                            required
                        />
                    </div>
        
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                                Price <span style={{ fontWeight: 400, color: "#64748b", fontSize: "12px" }}>(Optional)</span>
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
                                value={uploadPrice}
                                onChange={(e) => setUploadPrice(e.target.value)}
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
                                value={uploadLocation}
                                onChange={(e) => setUploadLocation(e.target.value)}
                            />
                        </div>
                    </div>
        
                    {isUploading && (
                        <div style={{ marginBottom: "16px" }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#2563eb",
                                marginBottom: "4px",
                            }}>
                                <span>Uploading video...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
                                <div style={{
                                    width: `${uploadProgress}%`,
                                    height: "100%",
                                    background: "#2563eb",
                                    transition: "width 0.2s ease",
                                }} />
                            </div>
                        </div>
                    )}
        
                    <div className={styles.dialogActions}>
                        <button
                            type="button"
                            className={styles.deleteCancel}
                            disabled={isUploading}
                            onClick={() => setShowUploadModal(false)}
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
                                cursor: isUploading ? "not-allowed" : "pointer",
                            }}
                            disabled={isUploading || !uploadVideoFile}
                        >
                            {isUploading ? "Publishing..." : "Publish Reel"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
