"use client";

import { useEffect } from "react";
import styles from "./deleteConfirmModal.module.css";
import { RiDeleteBinLine, RiAlertLine } from "react-icons/ri";

export default function DeleteConfirmModal({
    isOpen,
    title = "Delete Item?",
    itemName,
    description,
    confirmText = "Delete",
    onClose,
    onConfirm,
}) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose?.();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm?.();
        onClose?.();
    };

    return (
        <div
            className={styles.overlay}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
        >
            <div className={styles.modal}>
                <div className={styles.body}>
                    <div className={styles.iconWrap}>
                        <RiDeleteBinLine />
                    </div>

                    <h3 id="delete-confirm-title" className={styles.title}>
                        {title}
                    </h3>

                    {itemName && (
                        <div className={styles.itemChip} title={itemName}>
                            {itemName}
                        </div>
                    )}

                    <p className={styles.description}>
                        {description || "Are you sure you want to delete this item? This action will permanently remove it from your builder showcase."}
                    </p>

                    <div className={styles.warningBadge}>
                        <RiAlertLine /> This action cannot be undone
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.cancelBtn}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={styles.deleteBtn}
                    >
                        <RiDeleteBinLine /> {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
