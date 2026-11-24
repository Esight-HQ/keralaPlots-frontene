/* Where an agent's registration stands with the Keralaplots team, plus whether
   the user has dismissed the banner announcing it.

   Dismissal is stored as the status it was dismissed *for*, not a boolean: a
   pending banner you waved away should not hide the approval that follows it. */

const KEY = "kp_agent_status";

export const AGENT_STATUSES = ["none", "pending", "approved", "rejected"];

const DEFAULT_STATE = {
    has_applied: false,
    status: "none",
    reason: "",
    dismissedFor: null,
};

function withDefaults(stored) {
    if (!stored || typeof stored !== "object") return DEFAULT_STATE;
    return {
        ...DEFAULT_STATE,
        ...stored,
        status: AGENT_STATUSES.includes(stored.status) ? stored.status : DEFAULT_STATE.status,
    };
}

function readFromStorage() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? withDefaults(JSON.parse(raw)) : DEFAULT_STATE;
    } catch {
        return DEFAULT_STATE;
    }
}

function writeToStorage(state) {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        // storage unavailable — the dismissal simply won't survive the reload
    }
}

/* ---------------------------------------------------------------------------
   useSyncExternalStore plumbing — the snapshot is cached rather than parsed
   afresh on every read, because it is compared by identity.
   --------------------------------------------------------------------------- */
let snapshot = null;
const listeners = new Set();

export function getServerSnapshot() {
    return DEFAULT_STATE;
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

function commit(next) {
    snapshot = next;
    writeToStorage(next);
    listeners.forEach((listener) => listener());
}

/** Hide the banner for the status it is currently showing. */
export function dismissAgentStatus() {
    const current = getSnapshot();
    commit({ ...current, dismissedFor: current.status });
}

/**
 * Move the registration to a new status — what a review decision would call.
 * Clears the dismissal so the new outcome is actually seen.
 */
export function setAgentStatus(status, reason, has_applied = true) {
    if (!AGENT_STATUSES.includes(status)) return;
    const current = getSnapshot();
    commit({
        ...current,
        has_applied: status === "none" ? false : Boolean(has_applied),
        status,
        reason: reason ?? current.reason,
        dismissedFor: status === current.status ? current.dismissedFor : null,
    });
}
