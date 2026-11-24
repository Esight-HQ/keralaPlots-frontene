"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./builderStatusBanner.module.css";
import { useAuth } from "../context/AuthContext";
import { useBuilderStatus, setBuilderStatus } from "../lib/builderStatus";

const DISMISS_KEY = "kp_builder_banner_dismissed";
import {
    RiTimeLine,
    RiCheckboxCircleLine,
    RiCloseCircleLine,
    RiShieldCheckLine,
    RiCloseLine,
    RiArrowRightLine,
    RiRefreshLine,
    RiErrorWarningLine,
} from "react-icons/ri";

export default function BuilderStatusBanner() {
    const [pendingVerification, setPendingVerification] = useState(null);
    const [showAlert, setShowAlert] = useState(true);
    const [dismissedFor, setDismissedFor] = useState(null);
    const { user } = useAuth();
    const builder = useBuilderStatus(user);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const vParam = params.get("verification");
            const isReg = params.get("registered") === "true";
            const stored = localStorage.getItem("kp_builder_verification_pending");
            const data = stored ? JSON.parse(stored) : null;

            if (vParam) {
                let status = "pending";
                if (vParam === "success" || vParam === "completed" || vParam === "approved") {
                    status = "success";
                } else if (vParam === "failed" || vParam === "rejected") {
                    status = "failed";
                }
                // Admin approval / rejection link → remember it so the builder menu appears
                if (status !== "pending") setBuilderStatus(status === "success" ? "approved" : "rejected", { companyName: data?.companyName || "" });
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPendingVerification({
                    companyName: data?.companyName || "",
                    reraNumber: data?.reraNumber || "",
                    submittedAt: data?.submittedAt || Date.now(),
                    status,
                });
            } else if (data) {
                setPendingVerification(data);
            } else if (isReg) {
                setPendingVerification({ companyName: "", submittedAt: Date.now(), status: "pending" });
            }
            setDismissedFor(localStorage.getItem(DISMISS_KEY));
        } catch { }
    }, []);

    const dismissAlert = () => {
        setShowAlert(false);
        try {
            localStorage.removeItem("kp_builder_verification_pending");
            localStorage.setItem(DISMISS_KEY, builder.status);
        } catch { }
    };

    // A decision from the admin (server / approval link) overrides the "pending" copy
    const decided = builder.isApproved || builder.isRejected;
    const banner =
        pendingVerification ||
        (decided && dismissedFor !== builder.status ? { companyName: "", status: builder.status } : null);

    if (!banner || !showAlert) return null;

    const status = decided ? builder.status : banner.status || "pending";
    const isSuccess = status === "success" || status === "completed" || status === "approved";
    const isFailed = status === "failed" || status === "rejected";
    const isPending = !isSuccess && !isFailed;

    return (
        <div
            className={`${styles.verificationAlert} ${isSuccess
                ? styles.verificationAlertSuccess
                : isFailed
                    ? styles.verificationAlertFailed
                    : ""
                }`}
            role="status"
            aria-live="polite"
            aria-labelledby="dashboard-builder-status-title"
        >
            <div className={styles.alertMain}>
                <div
                    className={`${styles.alertIconWrap} ${isSuccess
                        ? styles.alertIconSuccess
                        : isFailed
                            ? styles.alertIconFailed
                            : ""
                        }`}
                    aria-hidden="true"
                >
                    {isSuccess && <RiCheckboxCircleLine />}
                    {isFailed && <RiCloseCircleLine />}
                    {isPending && <RiTimeLine />}
                </div>

                <div className={styles.alertBody}>
                    <div className={styles.alertHeaderRow}>
                        {isPending && (
                            <span className={styles.alertBadge}>
                                <span className={styles.pulseDot} aria-hidden="true" />
                                Verification in progress
                            </span>
                        )}
                        {isSuccess && (
                            <span className={`${styles.alertBadge} ${styles.alertBadgeSuccess}`}>
                                <RiCheckboxCircleLine aria-hidden="true" />
                                Verification completed
                            </span>
                        )}
                        {isFailed && (
                            <span className={`${styles.alertBadge} ${styles.alertBadgeFailed}`}>
                                <RiErrorWarningLine aria-hidden="true" />
                                Verification failed
                            </span>
                        )}

                        {banner.companyName && (
                            <span className={styles.alertCompanyName} title={banner.companyName}>
                                {banner.companyName}
                            </span>
                        )}
                    </div>

                    <h3 id="dashboard-builder-status-title" className={styles.alertTitle}>
                        {isSuccess && "Builder verification approved!"}
                        {isFailed && "Verification incomplete or failed"}
                        {isPending && "Your builder registration is under review"}
                    </h3>

                    <p className={styles.alertText}>
                        {isSuccess && (
                            <>
                                Congratulations! Your company details and K-RERA credentials have been verified. You can now build and publish your official company profile.
                            </>
                        )}
                        {isFailed && (
                            <>
                                We could not verify your K-RERA number or registration documents. Please review your submitted details and submit again.
                            </>
                        )}
                        {isPending && (
                            <>
                                Application and K-RERA documents received. Verification typically completes within <strong>24–48 hours</strong>.
                            </>
                        )}
                    </p>
                </div>
            </div>

            <div className={styles.alertRight}>
                {isPending && (
                    <div className={styles.miniStepper} aria-label="Verification progress">
                        <div className={`${styles.miniStep} ${styles.miniStepDone}`} title="Application Submitted">
                            <span className={styles.miniStepDot}><RiCheckboxCircleLine aria-hidden="true" /></span>
                            <span className={styles.miniStepLabel}>Submitted</span>
                        </div>
                        <span className={styles.miniStepLine} aria-hidden="true" />
                        <div className={`${styles.miniStep} ${styles.miniStepActive}`} title="Under Review">
                            <span className={styles.miniStepDot}><RiTimeLine aria-hidden="true" /></span>
                            <span className={styles.miniStepLabel}>Review</span>
                        </div>
                        <span className={styles.miniStepLine} aria-hidden="true" />
                        <div className={`${styles.miniStep} ${styles.miniStepUpcoming}`} title="Profile Live">
                            <span className={styles.miniStepDot}><RiShieldCheckLine aria-hidden="true" /></span>
                            <span className={styles.miniStepLabel}>Live</span>
                        </div>
                    </div>
                )}

                {isSuccess && (
                    <Link
                        href="/builder-portal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.alertActionBtn} ${styles.alertBtnSuccess}`}
                    >
                        Build Your Page <RiArrowRightLine aria-hidden="true" />
                    </Link>
                )}

                {isFailed && (
                    <Link
                        href="/register-builder?recheck=true"
                        className={`${styles.alertActionBtn} ${styles.alertBtnFailed}`}
                    >
                        <RiRefreshLine aria-hidden="true" /> Recheck your registration
                    </Link>
                )}

                <button
                    type="button"
                    className={styles.alertCloseBtn}
                    onClick={dismissAlert}
                    aria-label="Dismiss verification alert"
                    title="Dismiss"
                >
                    <RiCloseLine aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
