/* Storage for the reels the signed-in user has posted.

   The profile page's "Posted Reels" panel is the only reader, but /post-reel
   writes to it the moment a reel is published — so the two live here rather
   than the page owning its own array. Backed by localStorage, following the
   same useSyncExternalStore shape as addedPropertiesStore.js. */

import { initialPostedReels } from "../profile/postedReelsData";

const KEY = "kp_posted_reels";

/* Freshly published reels carry an object URL for their poster, which stops
   resolving after a reload — this is what the thumbnail falls back to. */
export const FALLBACK_POSTER =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80";

function readFromStorage() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return initialPostedReels;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : initialPostedReels;
    } catch {
        return initialPostedReels;
    }
}

function writeToStorage(list) {
    try {
        localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
        // storage unavailable — the list simply won't survive the reload
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

/** Replace the list with `updater(currentList)`, persist it and notify readers. */
export function updatePostedReels(updater) {
    commit(updater(getSnapshot().list));
}

/** Prepend a reel and persist. Returns the new list. */
export function addPostedReel(reel) {
    const list = [reel, ...getSnapshot().list];
    commit(list);
    return list;
}

function nextId(existing) {
    return existing.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
}

/**
 * Turn a completed /post-reel submission into a row the panel can render.
 * `poster` is a data URL when the source is a video (captured client-side
 * from the first frame) or the media itself when the source is an image —
 * both survive a reload since they're inlined, unlike the raw object URL.
 */
export function buildPostedReelFromForm({ caption, location, price, mediaType, mediaUrl, poster }) {
    const id = nextId(getSnapshot().list);
    const now = new Date();

    return {
        id,
        caption: caption.trim(),
        location: location.trim(),
        price: price.trim() ? `₹${price.trim()}` : null,
        mediaType,
        mediaUrl,
        poster: poster || FALLBACK_POSTER,
        postedOn: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        postedTs: now.getTime(),
        views: 0,
        likes: 0,
        shares: 0,
        saves: 0,
        status: "Active",
    };
}
