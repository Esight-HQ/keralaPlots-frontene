"use client";

import { useEffect, useSyncExternalStore } from "react";
import styles from "./agentStatusBanner.module.css";
import {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    dismissAgentStatus,
    setAgentStatus,
} from "../lib/agentStatusStore";
import { useAuth } from "../context/AuthContext";
import { agentApi } from "../lib/api";
import { RiTimeLine, RiCloseCircleLine, RiCloseLine } from "react-icons/ri";

/* One entry per registration outcome: its tint, its icon and its wording. */
const STATUS_COPY = {
    approved: {
        tone: styles.approved,
        icon: <span className={styles.emoji} aria-hidden="true">🎉</span>,
        title: "Admin approved your agent registration.",
        body: "You can now access all agent features and start managing your properties.",
    },
    pending: {
        tone: styles.pending,
        icon: <RiTimeLine className={styles.icon} aria-hidden="true" />,
        title: "Your agent registration is pending.",
        body: "Our team is reviewing your details. You’ll get notified once it’s approved.",
    },
    rejected: {
        tone: styles.rejected,
        icon: <RiCloseCircleLine className={styles.icon} aria-hidden="true" />,
        title: "Your agent registration has been rejected.",
        body: "We’re unable to approve your registration at this time. Please review the reason below.",
    },
};

/**
 * Registration status notice, shown under the dashboard heading.
 *
 * Only shown if the user actually applied as an agent and has an active status.
 * Renders nothing for regular users or once dismissed.
 */
export default function AgentStatusBanner() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { status, reason, dismissedFor, has_applied } = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    useEffect(() => {
        if (authLoading || !isAuthenticated) return;

        let alive = true;
        agentApi.myStatus()
            .then((res) => {
                if (!alive) return;
                if (res && res.has_applied && res.status && res.status !== "none") {
                    setAgentStatus(res.status, res.agent?.rejection_reason, true);
                } else {
                    setAgentStatus("none", null, false);
                }
            })
            .catch(() => {
                if (alive) setAgentStatus("none", null, false);
            });

        return () => {
            alive = false;
        };
    }, [isAuthenticated, authLoading]);

    const copy = STATUS_COPY[status];
    if (!copy || status === "none" || !has_applied || dismissedFor === status) return null;

    return (
        <div className={`${styles.banner} ${copy.tone}`} role="status">
            <span className={styles.iconWrap}>{copy.icon}</span>

            <div className={styles.text}>
                <p className={styles.title}>{copy.title}</p>
                <p className={styles.body}>{copy.body}</p>

                {/* The rejected copy promises a reason, so it has to be here. */}
                {status === "rejected" && reason && (
                    <p className={styles.reason}>
                        <span className={styles.reasonLabel}>Reason</span>
                        {reason}
                    </p>
                )}
            </div>

            <button
                type="button"
                className={styles.dismiss}
                onClick={dismissAgentStatus}
                aria-label="Dismiss registration notice"
            >
                <RiCloseLine />
            </button>
        </div>
    );
}
