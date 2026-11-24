"use client";

import styles from "./addedProperties.module.css";
import { RiCloseLine, RiDeleteBin6Line } from "react-icons/ri";
import { fallbackImageFor } from "../lib/addedPropertiesStore";
import { formatPropertyImgUrl, handlePropertyImgError, DEFAULT_PROPERTY_NO_IMAGE } from "../lib/api";

/* Split out of AddedProperties.jsx so it loads as its own chunk, only when needed. */
export default function AddedPropertyDeleteDialog({
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
            <div
                className={`${styles.dialog} ${styles.deleteDialog}`}
                onClick={(e) => e.stopPropagation()}
            >
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
        
                <h2 className={styles.deleteTitle}>Delete Property?</h2>
                {/* Two spans rather than a <br>: they stack as blocks at the
                    dialog's full width and reflow inline when it narrows,
                    keeping the sentence space either way. */}
                <p className={styles.deleteDesc}>
                    <span className={styles.deleteDescLine}>
                        Are you sure you want to delete this property?
                    </span>{" "}
                    <span className={styles.deleteDescLine}>
                        This action cannot be undone.
                    </span>
                </p>
        
                {/* Which listing is going: the row is gone from behind the
                    overlay, so the dialog restates it rather than naming it. */}
                <div className={styles.deletePreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={pendingDelete.image ? formatPropertyImgUrl(pendingDelete.image) : DEFAULT_PROPERTY_NO_IMAGE}
                        alt=""
                        className={styles.deletePreviewThumb}
                        onError={handlePropertyImgError}
                    />
                    <div className={styles.deletePreviewText}>
                        <p className={styles.deletePreviewTitle}>{pendingDelete.title}</p>
                        <p className={styles.deletePreviewLocation}>{pendingDelete.location}</p>
                        <p className={styles.deletePreviewPrice}>{pendingDelete.price}</p>
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
                        Delete Property
                    </button>
                </div>
            </div>
        </div>
    );
}
