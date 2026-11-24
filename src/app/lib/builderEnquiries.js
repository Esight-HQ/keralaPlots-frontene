/*
 * Builder webpage enquiries — the leads submitted through the contact / site-visit
 * forms on the public builder page (/builders/[slug]).
 *
 * Syncs live enquiries from the backend API (GET /api/builder/enquiries,
 * PATCH /api/builder/enquiries/:id, DELETE /api/builder/enquiries/:id) while
 * caching in localStorage and merging any legacy local-only ("enq_...") entries.
 */

import { builderApi } from "./api";

export const ENQUIRIES_KEY = "kp_builder_enquiries";
const CHANGE_EVENT = "kp-builder-enquiries-change";
const MAX_STORED = 500;

export const ENQUIRY_STATUSES = [
    { id: "new", label: "New" },
    { id: "contacted", label: "Contacted" },
    { id: "site_visit", label: "Site visit" },
    { id: "closed", label: "Closed" },
];

const isBrowser = () => typeof window !== "undefined";
const EMPTY = [];

let cache = null; // parsed list, kept in sync with backend + localStorage
let cacheRaw = null;
let inFlightFetch = null;
let lastFetchedAt = 0;

const isBackendRecord = (id) => typeof id === "number" || /^\d+$/.test(String(id || ""));

function normalizeItem(item = {}) {
    return {
        id: item.id,
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        status: item.status || item.enquiry_status || "new",
        read: Boolean(item.read ?? item.is_read ?? false),
        note: item.note ?? "",
        builderId: item.builderId || item.builder_id || "",
        builderName: item.builderName || item.builder_name || "",
        template: item.template || "",
        source: item.source || "Website Enquiry Form",
        name: item.name || item.customer_name || "",
        phone: item.phone || item.mobile_number || "",
        email: item.email || "",
        message: item.message || item.requirements || "",
        visitTime: item.visitTime || item.visit_time || "",
        pageUrl: item.pageUrl || item.page_url || "",
    };
}

function readAll() {
    if (!isBrowser()) return EMPTY;
    let raw = null;
    try {
        raw = localStorage.getItem(ENQUIRIES_KEY);
    } catch {
        return cache || EMPTY;
    }
    if (raw === cacheRaw && cache) return cache;
    let list = [];
    try {
        const parsed = JSON.parse(raw || "[]");
        list = Array.isArray(parsed) ? parsed.map(normalizeItem) : [];
    } catch {
        list = [];
    }
    cacheRaw = raw;
    cache = list;
    return list;
}

function writeAll(list) {
    if (!isBrowser()) return;
    const normalized = list.slice(0, MAX_STORED).map(normalizeItem);
    const serialized = JSON.stringify(normalized);
    cache = normalized;
    cacheRaw = serialized;
    try {
        localStorage.setItem(ENQUIRIES_KEY, serialized);
    } catch {
        /* storage full or blocked — in-memory cache still works */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Fetch live enquiries from /api/builder/enquiries and sync local cache. */
export async function refreshEnquiries({ force = false } = {}) {
    if (!isBrowser()) return EMPTY;
    let token = null;
    try {
        token = localStorage.getItem("kp_auth_token");
    } catch {
        return readAll();
    }
    if (!token) return readAll();

    const now = Date.now();
    if (!force && inFlightFetch) return inFlightFetch;
    if (!force && now - lastFetchedAt < 2500) return readAll();

    inFlightFetch = builderApi
        .getEnquiries()
        .then((res) => {
            lastFetchedAt = Date.now();
            const remote = Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res?.enquiries)
                ? res.enquiries
                : null;
            if (!remote) return readAll();

            const normalizedRemote = remote.map(normalizeItem);
            const remoteIds = new Set(normalizedRemote.map((e) => String(e.id)));
            // Preserve any unsynced local-only ("enq_...") items if present
            const localOnly = readAll().filter(
                (e) => !isBackendRecord(e.id) && !remoteIds.has(String(e.id))
            );
            const merged = [...normalizedRemote, ...localOnly];
            writeAll(merged);
            return merged;
        })
        .catch(() => {
            // Non-builder or unauthorized: keep current local cache quietly
            return readAll();
        })
        .finally(() => {
            inFlightFetch = null;
        });

    return inFlightFetch;
}

const clean = (v, max = 2000) => String(v ?? "").trim().slice(0, max);

/** Save a new enquiry locally (fallback when no slug/backend is used). */
export function addEnquiry(input = {}) {
    const record = normalizeItem({
        id: `enq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        status: "new",
        read: false,
        note: "",
        builderId: clean(input.builderId, 200),
        builderName: clean(input.builderName, 200),
        template: clean(input.template, 40),
        source: clean(input.source, 80),
        name: clean(input.name, 120),
        phone: clean(input.phone, 30),
        email: clean(input.email, 160),
        message: clean(input.message),
        visitTime: clean(input.visitTime, 160),
        pageUrl: clean(input.pageUrl, 500),
    });
    writeAll([record, ...readAll()]);
    return record;
}

/** All enquiries, newest first. */
export function getEnquiries() {
    return readAll();
}

export function updateEnquiry(id, patch = {}) {
    writeAll(
        readAll().map((e) =>
            String(e.id) === String(id) ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
        )
    );
    if (isBackendRecord(id)) {
        builderApi.updateEnquiry(id, patch).catch(() => {
            refreshEnquiries({ force: true });
        });
    }
}

export function deleteEnquiry(id) {
    writeAll(readAll().filter((e) => String(e.id) !== String(id)));
    if (isBackendRecord(id)) {
        builderApi.deleteEnquiry(id).catch(() => {
            refreshEnquiries({ force: true });
        });
    }
}

export function markAllRead() {
    const unreadBackendIds = readAll()
        .filter((e) => !e.read && isBackendRecord(e.id))
        .map((e) => e.id);
    writeAll(readAll().map((e) => (e.read ? e : { ...e, read: true })));
    for (const id of unreadBackendIds) {
        builderApi.updateEnquiry(id, { read: true }).catch(() => {});
    }
}

/** Subscribe to changes (this tab + other tabs + live backend sync). */
export function subscribeEnquiries(callback) {
    if (!isBrowser()) return () => {};
    const onStorage = (e) => {
        if (!e.key || e.key === ENQUIRIES_KEY) callback();
    };
    const onFocus = () => {
        refreshEnquiries({ force: true });
    };
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);

    // Trigger initial background sync from backend
    refreshEnquiries();

    return () => {
        window.removeEventListener(CHANGE_EVENT, callback);
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("focus", onFocus);
    };
}

/** For useSyncExternalStore on the server. */
export const getServerEnquiries = () => EMPTY;

/** CSV text for the given enquiries (Excel-friendly, UTF-8 BOM added by caller). */
export function enquiriesToCsv(list) {
    const cols = [
        ["Date", (e) => new Date(e.createdAt).toLocaleString("en-IN")],
        ["Name", (e) => e.name],
        ["Phone", (e) => e.phone],
        ["Email", (e) => e.email],
        ["Message", (e) => e.message],
        ["Preferred visit", (e) => e.visitTime],
        ["Status", (e) => ENQUIRY_STATUSES.find((s) => s.id === e.status)?.label || e.status],
        ["Builder page", (e) => e.builderName],
        ["Form", (e) => e.source],
        ["Note", (e) => e.note],
    ];
    const esc = (v) => {
        const s = String(v ?? "");
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cols.map(([h]) => h).join(","), ...list.map((e) => cols.map(([, f]) => esc(f(e))).join(","))].join("\r\n");
}
