"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import styles from "./accountSettings.module.css";
import {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    setDeactivated,
} from "../lib/accountSettingsStore";
import { profileApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
    RiAlarmWarningLine,
    RiErrorWarningLine,
    RiPauseCircleLine,
    RiPlayCircleLine,
    RiDeleteBin6Line,
} from "react-icons/ri";

/**
 * "Account Settings" panel of the profile page.
 * Keeps only the Danger Zone (Deactivate / Delete account)
 * with robust backend workflow integration.
 */
export default function AccountSettings() {
    const router = useRouter();
    const { logout, user } = useAuth();
    const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const [isDeactivated, setIsDeactivated] = useState(
        settings.deactivated || (user?.accountstatus === 0 || user?.Accountstatus === 0)
    );
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState("");
    const [confirming, setConfirming] = useState(null); // "delete" | null

    /* Toasts clear themselves; each new one restarts the clock. */
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(""), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    /* Escape backs out of a confirmation. */
    useEffect(() => {
        if (!confirming) return;
        const onKey = (event) => {
            if (event.key === "Escape") setConfirming(null);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [confirming]);

    const handleToggleDeactivate = async () => {
        setActionLoading(true);
        try {
            if (isDeactivated) {
                const res = await profileApi.reactivate();
                setIsDeactivated(false);
                setDeactivated(false);
                setToast(res?.message || "Account reactivated. Your listings are visible again.");
            } else {
                const res = await profileApi.deactivate();
                setIsDeactivated(true);
                setDeactivated(true);
                setToast(res?.message || "Account deactivated. Your listings are now hidden.");
            }
        } catch (err) {
            console.error("Failed to toggle account deactivation:", err);
            setToast(err?.response?.data?.message || "Failed to update account status.");
        } finally {
            setActionLoading(false);
        }
    };

    const confirmAction = async () => {
        if (confirming === "delete") {
            setActionLoading(true);
            try {
                const res = await profileApi.deleteAccount();
                setToast(res?.message || "Account deleted. Admin recovery required to restore.");
                
                setTimeout(() => {
                    if (logout) {
                        logout();
                    } else {
                        localStorage.removeItem("kp_auth_token");
                        localStorage.removeItem("kp_auth_user");
                        window.dispatchEvent(new Event("kp_auth_changed"));
                    }
                    router.push("/login");
                }, 1000);
            } catch (err) {
                console.error("Failed to delete account:", err);
                setToast(err?.response?.data?.message || "Failed to delete account.");
                setActionLoading(false);
                setConfirming(null);
            }
        }
    };

    return (
        <>
            <section className={styles.page}>
                <header className={styles.head}>
                    <h1 className={styles.pageTitle}>Account Settings</h1>
                    <p className={styles.pageSub}>
                        Manage account deactivation and deletion.
                    </p>
                </header>

                {isDeactivated && (
                    <div className={styles.notice} role="status">
                        <RiErrorWarningLine className={styles.noticeIcon} />
                        <span>
                            <strong>Your account is deactivated.</strong> Your listings are hidden
                            from search and you won’t receive enquiries until you reactivate.
                        </span>
                        <button
                            type="button"
                            className={styles.noticeBtn}
                            disabled={actionLoading}
                            onClick={handleToggleDeactivate}
                        >
                            <RiPlayCircleLine />
                            Reactivate
                        </button>
                    </div>
                )}

                {/* ============================ DANGER ZONE ============================ */}
                <section className={`${styles.card} ${styles.dangerCard}`}>
                    <div className={styles.cardHead}>
                        <span className={`${styles.cardIcon} ${styles.dangerIcon}`}>
                            <RiAlarmWarningLine aria-hidden="true" />
                        </span>
                        <div>
                            <h2 className={styles.cardTitle}>Danger Zone</h2>
                            <p className={styles.cardDesc}>
                                Deactivating is reversible by you. Once deleted, only an admin can recover your account.
                            </p>
                        </div>
                    </div>

                    <div className={styles.dangerRow}>
                        <span className={styles.switchText}>
                            <span className={styles.switchLabel}>
                                {isDeactivated ? "Reactivate account" : "Deactivate account"}
                            </span>
                            <span className={styles.switchHint}>
                                {isDeactivated
                                    ? "Put your listings back in search and start receiving enquiries again."
                                    : "Hide your listings and stop enquiries. You can turn this back on any time."}
                            </span>
                        </span>
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            disabled={actionLoading}
                            onClick={handleToggleDeactivate}
                        >
                            {isDeactivated ? <RiPlayCircleLine /> : <RiPauseCircleLine />}
                            {isDeactivated ? "Reactivate" : "Deactivate"}
                        </button>
                    </div>

                    <div className={styles.dangerRow}>
                        <span className={styles.switchText}>
                            <span className={styles.switchLabel}>Delete account</span>
                            <span className={styles.switchHint}>
                                Removes your profile, hides all your listings, and locks your account. Only an administrator can restore it.
                            </span>
                        </span>
                        <button
                            type="button"
                            className={styles.dangerBtn}
                            disabled={actionLoading}
                            onClick={() => setConfirming("delete")}
                        >
                            <RiDeleteBin6Line />
                            Delete Account
                        </button>
                    </div>
                </section>
            </section>

            {/* ============================ CONFIRMATIONS ============================ */}
            {confirming && (
                <div
                    className={styles.overlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Confirm delete account"
                    onClick={() => setConfirming(null)}
                >
                    <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                        <span className={`${styles.dialogIcon} ${styles.dialogIconDanger}`}>
                            <RiDeleteBin6Line />
                        </span>

                        <h2 className={styles.dialogTitle}>
                            Delete your account?
                        </h2>
                        <p className={styles.dialogDesc}>
                            Your property listings will be immediately hidden from search. Once deleted, only an administrator can recover or restore your account.
                        </p>

                        <div className={styles.dialogActions}>
                            <button
                                type="button"
                                className={styles.dialogCancel}
                                disabled={actionLoading}
                                onClick={() => setConfirming(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.dialogDanger}
                                disabled={actionLoading}
                                onClick={confirmAction}
                            >
                                {actionLoading ? "Deleting..." : "Delete Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={styles.toast} role="status">
                    {toast}
                </div>
            )}
        </>
    );
}
