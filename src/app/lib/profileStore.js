/* The agent profile record.

   Personal Details, its reviews and its edit form are three separate routes
   now, so the record cannot live in any one of them — each would mount with
   its own copy and a save on one would be invisible to the others. It lives
   here instead, and persists, so an edit survives both navigation and reload. */

import { agentProfile } from "../profile/profileData";

const KEY = "kp_agent_profile";

function readFromStorage() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return agentProfile;
        const parsed = JSON.parse(raw);
        /* Merged over the seed so a record saved by an older build still gains
           any field added since. */
        return parsed && typeof parsed === "object" ? { ...agentProfile, ...parsed } : agentProfile;
    } catch {
        return agentProfile;
    }
}

function writeToStorage(profile) {
    try {
        localStorage.setItem(KEY, JSON.stringify(profile));
    } catch {
        // storage unavailable — the edit simply won't survive the reload
    }
}

/* ---------------------------------------------------------------------------
   useSyncExternalStore plumbing — the snapshot is cached rather than parsed
   afresh on every read, because it is compared by identity.
   --------------------------------------------------------------------------- */
let snapshot = null;
const listeners = new Set();

export function getServerSnapshot() {
    return agentProfile;
}

export function getSnapshot() {
    if (!snapshot) snapshot = readFromStorage();
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

export function saveProfile(next) {
    snapshot = next;
    writeToStorage(next);
    listeners.forEach((listener) => listener());
}

export function resetProfile() {
    saveProfile(agentProfile);
}
