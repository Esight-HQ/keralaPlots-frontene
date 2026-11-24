const STORAGE_KEY = "kp_messages_v3";
const LEGACY_STORAGE_KEYS = ["kp_messages", "kp_messages_v2"];
const PENDING_SHARE_KEY = "kp_pending_property_share";
export const MESSAGES_UPDATED_EVENT = "kp-messages-updated";

export function loadConversations(seedData = []) {
    if (typeof window === "undefined") return seedData;
    try {
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
        return seedData;
    } catch {
        return seedData;
    }
}

export function saveConversations(conversations) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        window.dispatchEvent(new Event(MESSAGES_UPDATED_EVENT));
    } catch {
        // storage unavailable — state stays in-memory for this session
    }
}

export function getUnreadCount(seedData) {
    if (typeof window === "undefined") return 0;
    try {
        const conversations = loadConversations(seedData || []);
        return conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
    } catch {
        return 0;
    }
}

// Hands a property off from a property page to the Messages page: stashed in
// sessionStorage so it survives the client-side navigation, then consumed
// (read + cleared) once by the Messages page on mount.
export function queuePropertyShare(payload) {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.setItem(PENDING_SHARE_KEY, JSON.stringify(payload));
    } catch {
        // storage unavailable — the share silently won't attach
    }
}

export function consumePendingPropertyShare() {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(PENDING_SHARE_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(PENDING_SHARE_KEY);
        return JSON.parse(raw);
    } catch {
        return null;
    }
}
