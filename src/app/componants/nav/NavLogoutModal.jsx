"use client";

import styles from "./nav.module.css";
import { RiCloseLine, RiLogoutBoxRLine } from "react-icons/ri";

/* Split out of nav.jsx so it loads as its own chunk, only when needed. */
export default function NavLogoutModal({
    handleLogout,
    setShowLogoutModal,
}) {
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>
                <button
                    type="button"
                    className={styles.modalCloseBtn}
                    onClick={() => setShowLogoutModal(false)}
                    title="Close modal"
                >
                    <RiCloseLine />
                </button>
        
                <div className={styles.modalIconCircle}>
                    <RiLogoutBoxRLine className={styles.modalRedIcon} />
                </div>
        
                <h2 className={styles.modalTitle}>Log Out</h2>
                <p className={styles.modalDesc}>
                    Are you sure you want to log out of your account?<br />
                    You will need to log in again to access your dashboard.
                </p>
        
                <div className={styles.modalButtonsRow}>
                    <button
                        type="button"
                        className={styles.modalCancelBtn}
                        onClick={() => setShowLogoutModal(false)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.modalConfirmBtn}
                        onClick={() => {
                            handleLogout();
                            setShowLogoutModal(false);
                        }}
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}
