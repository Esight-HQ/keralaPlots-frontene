"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useBuilderStatus } from "./builderStatus";
import {
    subscribe as subscribeAgentStatus,
    getSnapshot as getAgentSnapshot,
    getServerSnapshot as getAgentServerSnapshot,
    setAgentStatus,
} from "./agentStatusStore";
import { agentApi } from "./api";

const ACTIVE_ROLE_KEY = "kp_active_profile_role";
const ROLE_CHANGE_EVENT = "kp-active-role-change";

const isBrowser = () => typeof window !== "undefined";

function readSelectedRole() {
    if (!isBrowser()) return "";
    try {
        const val = localStorage.getItem(ACTIVE_ROLE_KEY);
        return val === "agent" || val === "builder" ? val : "";
    } catch {
        return "";
    }
}

export function setSelectedProfileRole(role) {
    if (!isBrowser()) return;
    if (role !== "agent" && role !== "builder") return;
    try {
        localStorage.setItem(ACTIVE_ROLE_KEY, role);
    } catch {
        /* ignore */
    }
    window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
}

function subscribeSelectedRole(cb) {
    if (!isBrowser()) return () => {};
    const onStorage = (e) => {
        if (!e.key || e.key === ACTIVE_ROLE_KEY) cb();
    };
    window.addEventListener(ROLE_CHANGE_EVENT, cb);
    window.addEventListener("storage", onStorage);
    return () => {
        window.removeEventListener(ROLE_CHANGE_EVENT, cb);
        window.removeEventListener("storage", onStorage);
    };
}

let agentServerCheckedForToken = null;
function ensureAgentStatusChecked() {
    if (!isBrowser()) return;
    let token = null;
    try {
        token = localStorage.getItem("kp_auth_token");
    } catch {
        /* ignore */
    }
    if (!token || agentServerCheckedForToken === token) return;
    agentServerCheckedForToken = token;
    agentApi
        .myStatus()
        .then((res) => {
            if (res && res.has_applied && res.status && res.status !== "none") {
                setAgentStatus(res.status, res.agent?.rejection_reason, true);
            }
        })
        .catch(() => {});
}

/**
 * Shared hook for resolving whether the user holds Agent, Builder, or BOTH roles,
 * and tracking the active role selected in the Profile / Account dropdown.
 */
export function useProfileRole(user, pathname = "") {
    const builder = useBuilderStatus(user);
    const agentSnap = useSyncExternalStore(
        subscribeAgentStatus,
        getAgentSnapshot,
        getAgentServerSnapshot
    );
    const storedChoice = useSyncExternalStore(
        subscribeSelectedRole,
        readSelectedRole,
        () => ""
    );

    useEffect(() => {
        if (user) {
            ensureAgentStatusChecked();
        }
    }, [user]);

    const rawUserRole = String(user?.role || user?.role_val || "").toLowerCase();
    const hasAgent =
        rawUserRole === "agent" ||
        Boolean(user?.is_agent_approved || user?.is_agent_verified) ||
        agentSnap?.status === "approved";
    const hasBuilder = Boolean(builder?.isApproved);
    const hasDualRoles = hasAgent && hasBuilder;

    let activeRole = "user";
    if (hasDualRoles) {
        if (storedChoice === "agent" || storedChoice === "builder") {
            activeRole = storedChoice;
        } else if (pathname?.startsWith("/profile/enquiries")) {
            activeRole = "builder";
        } else {
            activeRole = "agent";
        }
    } else if (hasBuilder) {
        activeRole = "builder";
    } else if (hasAgent) {
        activeRole = "agent";
    }

    const displayRoleLabel =
        activeRole === "builder"
            ? "Builder"
            : activeRole === "agent"
            ? "Agent"
            : "User";

    return {
        activeRole,
        setActiveRole: setSelectedProfileRole,
        hasDualRoles,
        hasAgent,
        hasBuilder,
        builder,
        displayRoleLabel,
    };
}
