/* Account settings, persisted so a preference survives a reload.

   Deliberately holds no credentials: the password form validates and reports,
   but nothing about a password is ever written here. localStorage is readable
   by any script on the origin, which is the wrong place for a secret. */

const KEY = "kp_account_settings";

export const DEFAULT_SETTINGS = {
    /* how we may reach you */
    channels: {
        email: true,
        sms: false,
        whatsapp: true,
        push: true,
    },
    /* what we may reach you about */
    topics: {
        matches: true,
        enquiryReplies: true,
        priceDrops: false,
        newsletter: false,
    },
    /* what other people can see */
    privacy: {
        showPhone: true,
        showEmail: false,
        discoverable: true,
        allowAgentContact: true,
    },
    preferences: {
        language: "en",
        alertFrequency: "daily",
    },
    /* Set by "Deactivate account" — listings hidden, account recoverable. */
    deactivated: false,
};

/* Merged one level deep so a settings object stored by an older build gains
   any group added since, instead of losing the new keys to `undefined`. */
function withDefaults(stored) {
    if (!stored || typeof stored !== "object") return DEFAULT_SETTINGS;

    const merged = { ...DEFAULT_SETTINGS };
    for (const [group, fallback] of Object.entries(DEFAULT_SETTINGS)) {
        merged[group] =
            fallback && typeof fallback === "object"
                ? { ...fallback, ...(stored[group] ?? {}) }
                : stored[group] ?? fallback;
    }
    return merged;
}

function readFromStorage() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? withDefaults(JSON.parse(raw)) : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function writeToStorage(settings) {
    try {
        localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
        // storage unavailable — settings simply won't survive the reload
    }
}

/* ---------------------------------------------------------------------------
   useSyncExternalStore plumbing — the snapshot is cached rather than parsed
   afresh on every read, because it is compared by identity.
   --------------------------------------------------------------------------- */
let snapshot = null;
const listeners = new Set();

export function getServerSnapshot() {
    return DEFAULT_SETTINGS;
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

/** Flip one switch inside a group, e.g. `setToggle("channels", "sms", false)`. */
export function setToggle(group, key, value) {
    const current = getSnapshot();
    commit({ ...current, [group]: { ...current[group], [key]: value } });
}

/** Set a single-choice preference, e.g. the interface language. */
export function setPreference(key, value) {
    const current = getSnapshot();
    commit({ ...current, preferences: { ...current.preferences, [key]: value } });
}

export function setDeactivated(value) {
    commit({ ...getSnapshot(), deactivated: value });
}

export function resetSettings() {
    commit(DEFAULT_SETTINGS);
}

/* ---------------------------------------------------------------------------
   Password rules — exported so the form and its strength meter agree on what
   counts as acceptable.
   --------------------------------------------------------------------------- */
export const PASSWORD_MIN = 8;

export function passwordProblems(password) {
    const problems = [];
    if (password.length < PASSWORD_MIN) problems.push(`At least ${PASSWORD_MIN} characters`);
    if (!/[A-Z]/.test(password)) problems.push("An uppercase letter");
    if (!/[a-z]/.test(password)) problems.push("A lowercase letter");
    if (!/\d/.test(password)) problems.push("A number");
    return problems;
}

/** 0–4, for the strength bar. */
export function passwordScore(password) {
    if (!password) return 0;
    const met = 4 - passwordProblems(password).length;
    /* A long password earns the top band even without every character class. */
    return password.length >= 14 ? Math.min(4, met + 1) : met;
}
