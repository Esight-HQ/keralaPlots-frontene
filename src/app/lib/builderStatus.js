/*
 * Builder registration status — "none" | "pending" | "approved" | "rejected".
 *
 * Sources, strongest first:
 *  1. The logged-in user record (if the backend adds builder_status / builder.status /
 *     role "builder" etc.)
 *  2. The service-provider application (GET /service-providers/my-status) when it is a
 *     builder application (provider_type "builder" or a builder-type service name)
 *  3. What this browser knows (saved when the user registers, or when they open a
 *     ?verification=approved / rejected link from the admin email)
 *
 * Everything that needs the status (profile sidebar, account menu, dashboard banner)
 * reads it through useBuilderStatus(), so wiring a real admin-approval API later
 * only means changing this file.
 */

import { useEffect, useSyncExternalStore } from "react";
import { builderApi, serviceProviderApi, BUILDER_ROLE_PATTERN } from "./api";

export const BUILDER_STATUS_KEY = "kp_builder_status";
const PENDING_KEY = "kp_builder_verification_pending"; // written by /register-builder
const PORTAL_KEY = "kp_builder_custom_webpage_data"; // written by /builder-portal
const CHANGE_EVENT = "kp-builder-status-change";

const isBrowser = () => typeof window !== "undefined";

export const normalizeBuilderStatus = (value) => {
    const v = String(value ?? "").toLowerCase().trim();
    if (!v) return "none";
    if (/approv|verified|success|complete|active|live/.test(v)) return "approved";
    if (/reject|fail|declin|denied/.test(v)) return "rejected";
    if (/pend|review|submit|process/.test(v)) return "pending";
    return "none";
};

const readJson = (key) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const toSlug = (text) =>
    String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

/** Status from the auth user object, if the backend provides one. */
export function statusFromUser(user) {
    if (!user) return "none";
    const direct =
        user.builder_status ??
        user.builderStatus ??
        user.builder?.status ??
        user.builder?.status_label ??
        user.builder_verification_status;
    if (direct) return normalizeBuilderStatus(direct);
    if (user.is_builder_verified === true || user.is_builder_approved === true) return "approved";
    if (String(user.role_val || "").toLowerCase() === "builder") return "approved";
    return "none";
}

/** Persist a status in this browser (and notify every open menu). */
export function setBuilderStatus(status, extra = {}) {
    if (!isBrowser()) return;
    const next = normalizeBuilderStatus(status);
    try {
        const prev = readJson(BUILDER_STATUS_KEY) || {};
        localStorage.setItem(
            BUILDER_STATUS_KEY,
            JSON.stringify({ ...prev, ...extra, status: next, updatedAt: Date.now() })
        );
    } catch {
        /* storage blocked */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/* Snapshot = small string so useSyncExternalStore can compare cheaply. */
function readSnapshot() {
    if (!isBrowser()) return "none|";
    const stored = readJson(BUILDER_STATUS_KEY);
    const pending = readJson(PENDING_KEY);
    let status = normalizeBuilderStatus(stored?.status);
    if (status === "none" && pending) status = normalizeBuilderStatus(pending.status || "success");

    const portal = readJson(PORTAL_KEY);
    const slug = portal?.companyName ? toSlug(portal.companyName) : "";
    return `${status}|${slug}`;
}

function subscribe(callback) {
    if (!isBrowser()) return () => { };
    const onStorage = (e) => {
        if (!e.key || [BUILDER_STATUS_KEY, PENDING_KEY, PORTAL_KEY].includes(e.key)) callback();
    };
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener("storage", onStorage);
    return () => {
        window.removeEventListener(CHANGE_EVENT, callback);
        window.removeEventListener("storage", onStorage);
    };
}

/* Ask the backend at most once per page load. */
let serverCheck = null;
function checkServerOnce() {
    if (!isBrowser() || serverCheck) return serverCheck;
    let token = null;
    try {
        token = localStorage.getItem("kp_auth_token");
    } catch {
        /* ignore */
    }
    if (!token) return null;
    serverCheck = builderApi
        .status()
        .then((bRes) => {
            const reg = bRes?.registration || bRes?.builder || bRes?.data;
            const rawStatus =
                bRes?.approval_status ||
                bRes?.status ||
                reg?.approval_status ||
                reg?.status;
            const normalized = normalizeBuilderStatus(rawStatus);
            if (normalized !== "none") {
                setBuilderStatus(normalized, {
                    companyName: reg?.company_name || bRes?.company_name || "",
                });
                return;
            }
            return serviceProviderApi.myStatus().then((res) => {
                const sp = res?.service_provider;
                if (!res?.has_applied || !sp) return;
                const isBuilder =
                    String(sp.provider_type || "").toLowerCase() === "builder" ||
                    BUILDER_ROLE_PATTERN.test(`${sp.role || ""} ${sp.service_name || ""}`);
                if (!isBuilder) return;
                const spStatus = normalizeBuilderStatus(res.status_label || sp.status);
                if (spStatus !== "none") setBuilderStatus(spStatus, { companyName: sp.full_name || "" });
            });
        })
        .catch(() => {
            /* offline / not available — keep what we know */
        });
    return serverCheck;
}

/**
 * React hook: { status, isApproved, isPending, isRejected, webpageHref }
 * Pass the auth user so a backend-provided status wins.
 */
export function useBuilderStatus(user) {
    const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => "none|");

    useEffect(() => {
        checkServerOnce();
    }, []);

    const [localStatus, slug] = snapshot.split("|");
    const fromUser = statusFromUser(user);
    const status = fromUser !== "none" ? fromUser : localStatus;

    return {
        status,
        isApproved: status === "approved",
        isPending: status === "pending",
        isRejected: status === "rejected",
        // The public page only exists once the builder has saved it in the portal
        webpageHref: slug ? `/builders/${slug}` : "",
    };
}
