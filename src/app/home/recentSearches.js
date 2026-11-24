/* Recent searches from the mobile search sheet — kept in this browser only. */
const KEY = "kp_recent_searches";
const MAX = 5;

export function readRecentSearches() {
    try {
        const list = JSON.parse(localStorage.getItem(KEY) || "[]");
        return Array.isArray(list) ? list.filter((s) => typeof s === "string").slice(0, MAX) : [];
    } catch {
        return [];
    }
}

export function saveRecentSearch(text) {
    const value = String(text || "").trim();
    if (!value || value === "Current Location") return;
    try {
        const next = [value, ...readRecentSearches().filter((s) => s.toLowerCase() !== value.toLowerCase())].slice(0, MAX);
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* storage unavailable (private mode etc.) — ignore */
    }
}

export function clearRecentSearches() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
}
