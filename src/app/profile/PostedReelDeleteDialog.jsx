"use client";

import styles from "./postedReels.module.css";
import { RiCloseLine, RiDeleteBin6Line } from "react-icons/ri";

/* Split out of PostedReels.jsx so it loads as its own chunk, only when needed. */
export default function PostedReelDeleteDialog({
    confirmDelete,
    pendingDelete,
    setPendingDelete,
}) {
    return (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
            onClick={() => setPendingDelete(null)}
        >
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className={styles.dialogClose}
                    onClick={() => setPendingDelete(null)}
                    aria-label="Close"
                >
                    <RiCloseLine />
                </button>
        
                <span className={styles.deleteHalo} aria-hidden="true">
                    <span className={styles.deleteRing}>
                        <RiDeleteBin6Line />
                    </span>
                </span>
        
                <h2 className={styles.deleteTitle}>Delete Reel?</h2>
                <p className={styles.deleteDesc}>
                    <span className={styles.deleteDescLine}>
                        Are you sure you want to delete this reel?
                    </span>{" "}
                    <span className={styles.deleteDescLine}>
                        This action cannot be undone.
                    </span>
                </p>
        
                <div className={styles.deletePreview}>
                    <img
                        src={pendingDelete.thumbnail_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80"}
                        alt=""
                        className={styles.deletePreviewThumb}
                    />
                    <div className={styles.deletePreviewText}>
                        <p className={styles.deletePreviewTitle}>{pendingDelete.caption || "Reel"}</p>
                        <p className={styles.deletePreviewLocation}>{pendingDelete.location || "Kerala"}</p>
                    </div>
                </div>
        
                <div className={styles.dialogActions}>
                    <button
                        type="button"
                        className={styles.deleteCancel}
                        onClick={() => setPendingDelete(null)}
                    >
                        Cancel
                    </button>
                    <button type="button" className={styles.deleteConfirm} onClick={confirmDelete}>
                        Delete Reel
                    </button>
                </div>
            </div>
        </div>
    );
}
