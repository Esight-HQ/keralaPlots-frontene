/* Storage for the shortlist a user is building up to compare side by side.

   Lightweight on purpose — just enough (id/title/image) for the floating
   bucket widget to render thumbnails and a count. The actual comparison
   table already knows how to resolve full property details from an id via
   compareCatalogue, the same way Favorites' "Compare Now" button works, so
   this store doesn't duplicate that data. Backed by localStorage so the
   shortlist survives a reload and stays in sync across tabs. */

const KEY = "kp_compare_list";
export const COMPARE_MAX = 3;

function readFromStorage() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeToStorage(list) {
    try {
        localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
        // storage unavailable — the shortlist simply won't survive the reload
    }
}

const SERVER_SNAPSHOT = { hydrated: false, list: [] };

let snapshot = null;
const listeners = new Set();

export function getServerSnapshot() {
    return SERVER_SNAPSHOT;
}

export function getSnapshot() {
    if (!snapshot) snapshot = { hydrated: true, list: readFromStorage() };
    return snapshot;
}

function onStorage(event) {
    if (event.key !== null && event.key !== KEY) return;
    snapshot = null;
    listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
}

function commit(list) {
    snapshot = { hydrated: true, list };
    writeToStorage(list);
    listeners.forEach((listener) => listener());
}

export function isInCompare(id) {
    return getSnapshot().list.some((p) => p.id === id);
}

/**
 * Adds `{ id, title, image }` to the shortlist. No-ops when the property is
 * already in it or the list is already at COMPARE_MAX — the caller decides
 * what to tell the user in either case.
 */
export function addToCompare(property) {
    const list = getSnapshot().list;
    if (list.some((p) => p.id === property.id)) return { added: false, reason: "duplicate" };
    if (list.length >= COMPARE_MAX) return { added: false, reason: "full" };
    commit([...list, property]);
    return { added: true };
}

export function removeFromCompare(id) {
    commit(getSnapshot().list.filter((p) => p.id !== id));
}

export function clearCompare() {
    commit([]);
}
