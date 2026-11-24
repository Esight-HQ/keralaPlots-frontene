"use client";

import styles from "./propertyDetail.module.css";
import { RiErrorWarningLine, RiCloseLine, RiShieldCheckLine } from "react-icons/ri";

/* Split out of PropertyDetailClient.jsx so it loads as its own chunk, only when needed. */
export default function PropertyReportModal({
    REPORT_DETAILS_MAX,
    REPORT_REASONS,
    closeReportModal,
    reportDetails,
    reportReason,
    setReportDetails,
    setReportReason,
    submitReport,
}) {
    return (
        <div
            className={styles.reportOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reportModalTitle"
            onClick={closeReportModal}
        >
            {/* Clicks inside the card must not reach the backdrop handler. */}
            <div className={styles.reportCard} onClick={(e) => e.stopPropagation()}>
                <div className={styles.reportHead}>
                    <h2 className={styles.reportTitle} id="reportModalTitle">
                        <RiErrorWarningLine aria-hidden="true" />
                        Report This Property
                    </h2>
                    <button
                        type="button"
                        className={styles.reportClose}
                        onClick={closeReportModal}
                        aria-label="Close report form"
                    >
                        <RiCloseLine />
                    </button>
                </div>
        
                <p className={styles.reportLede}>
                    Help us keep Keralaplots safe and trustworthy.
                    <br />
                    Please let us know the issue with this property listing.
                </p>
        
                <fieldset className={styles.reportFieldset}>
                    <legend className={styles.reportLegend}>Why are you reporting this property?</legend>
        
                    <div className={styles.reportReasonList}>
                        {REPORT_REASONS.map(({ id, Icon, label }) => (
                            <label
                                key={id}
                                className={`${styles.reportReasonOption} ${reportReason === id ? styles.reportReasonOptionActive : ""}`}
                            >
                                <input
                                    type="radio"
                                    name="reportReason"
                                    value={id}
                                    checked={reportReason === id}
                                    onChange={() => setReportReason(id)}
                                    className={styles.reportReasonRadioInput}
                                />
                                <span className={styles.reportReasonRadio} aria-hidden="true" />
                                <span className={styles.reportReasonIcon} aria-hidden="true">
                                    <Icon />
                                </span>
                                <span className={styles.reportReasonLabel}>{label}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
        
                {/* The other five reasons say all there is to say. Only "Other" needs
                    a free-text box, so it is the only one that shows it. */}
                {reportReason === "other" && (
                    <>
                        <label className={styles.reportDetailsLabel} htmlFor="reportDetails">
                            Additional Details (Optional)
                        </label>
                        {/* Length is clamped in state as well as by maxLength: the attribute
                            only constrains typing, so state alone could run past the limit. */}
                        <div className={styles.reportTextareaWrap}>
                            <textarea
                                id="reportDetails"
                                className={styles.reportTextarea}
                                placeholder="Please provide more details about the issue..."
                                value={reportDetails}
                                maxLength={REPORT_DETAILS_MAX}
                                onChange={(e) => setReportDetails(e.target.value.slice(0, REPORT_DETAILS_MAX))}
                            />
                            <span className={styles.reportCounter}>
                                {reportDetails.length}/{REPORT_DETAILS_MAX}
                            </span>
                        </div>
                    </>
                )}
        
                <div className={styles.reportActions}>
                    <button type="button" className={styles.reportCancel} onClick={closeReportModal}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.reportSubmit}
                        onClick={submitReport}
                        disabled={!reportReason}
                    >
                        Submit Report
                    </button>
                </div>
        
                <p className={styles.reportFootnote}>
                    <RiShieldCheckLine aria-hidden="true" />
                    <span>
                        All reports are reviewed by our team.
                        <br />
                        Thank you for helping us maintain a safe experience for everyone.
                    </span>
                </p>
            </div>
        </div>
    );
}
