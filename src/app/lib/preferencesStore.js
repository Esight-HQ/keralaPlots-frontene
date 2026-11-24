/*
 * Property preferences a user gives in the post-login popup.
 *
 * Stored per user in localStorage so switching accounts on one browser never
 * mixes answers. The "prompt pending" flag lives in sessionStorage: it is set
 * by a successful login/sign-up and consumed once the popup is answered.
 */

import { KERALA_LOCALITIES } from "../post-property/postPropertyData";
import { preferencesApi } from "./api";

export const BUDGET_OPTIONS = [
    { id: "under25", label: "Under ₹25 Lakh", hint: "Plots & starter homes" },
    { id: "25to50", label: "₹25 – 50 Lakh", hint: "Apartments & small houses" },
    { id: "50to100", label: "₹50 Lakh – 1 Cr", hint: "Family homes" },
    { id: "100to200", label: "₹1 – 2 Crore", hint: "Villas & premium homes" },
    { id: "above200", label: "Above ₹2 Crore", hint: "Luxury & commercial" },
];

export const LOCATION_OPTIONS = [
    "Ernakulam", "Thiruvananthapuram", "Thrissur", "Kozhikode", "Kottayam", "Kollam", "Palakkad",
    "Alappuzha", "Malappuram", "Kannur", "Idukki", "Wayanad", "Pathanamthitta", "Kasaragod",
];

// `id` is what the Properties page understands in ?type=
export const PROPERTY_TYPE_OPTIONS = [
    { id: "house", label: "House" },
    { id: "villa", label: "Villa" },
    { id: "apartment", label: "Apartment" },
    { id: "plot", label: "Plot / Land" },
    { id: "commercial", label: "Commercial" },
    { id: "other", label: "Other" },
];

export const AMENITY_OPTIONS = [
    "Car Parking", "Power Backup", "Lift", "24/7 Security", "Swimming Pool", "Gym",
    "Garden", "Club House", "Kids Play Area", "Water Supply",
];

const PENDING_KEY = "kp_prefs_pending";
const prefsKey = (userId) => `kp_prefs_${userId}`;
const statusKey = (userId) => `kp_prefs_status_${userId}`;

// `locations` are districts; `localities` are { name, district } picked from search.
export const EMPTY_PREFERENCES = { budget: [], locations: [], localities: [], propertyTypes: [], amenities: [] };

/** Everything the location search can match: districts + their localities. */
export const LOCATION_INDEX = [
    ...LOCATION_OPTIONS.map((district) => ({ kind: "district", name: district, district })),
    ...Object.entries(KERALA_LOCALITIES).flatMap(([district, names]) =>
        names.map((name) => ({ kind: "locality", name, district }))
    ),
];

const normalise = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Ranked matches: name starts with query > a word starts with it > contains it. */
export function searchLocations(query, limit = 8) {
    const q = normalise(query);
    if (!q) return [];
    const scored = [];
    for (const item of LOCATION_INDEX) {
        const name = normalise(item.name);
        const words = item.name.toLowerCase().split(/[\s/-]+/).map(normalise);
        let score = -1;
        if (name.startsWith(q)) score = 0;
        else if (words.some((w) => w.startsWith(q))) score = 1;
        else if (name.includes(q)) score = 2;
        else if (normalise(item.district).startsWith(q)) score = 3; // localities inside a matching district
        if (score >= 0) scored.push({ item, score: score + (item.kind === "district" ? 0 : 0.5) });
    }
    return scored
        .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
        .slice(0, limit)
        .map((s) => s.item);
}

/** Districts to filter by: chosen districts plus the districts of chosen localities. */
export function preferenceDistricts(prefs) {
    return [...new Set([...(prefs.locations || []), ...(prefs.localities || []).map((l) => l.district)])];
}

export function getUserIdFrom(user) {
    const id = user?.loginId || user?.id || user?.login_id;
    return id ? String(id) : "";
}

const safe = (fn, fallback) => {
    try {
        return fn();
    } catch {
        return fallback;
    }
};

/** Called right after a successful login / sign-up. */
export function markPreferencePromptPending(user) {
    const userId = getUserIdFrom(user);
    if (!userId) return;
    safe(() => {
        // Already answered or skipped on this browser — don't ask again.
        if (localStorage.getItem(statusKey(userId))) return;
        sessionStorage.setItem(PENDING_KEY, userId);
    });
}

export function isPreferencePromptPending(user) {
    const userId = getUserIdFrom(user);
    if (!userId) return false;
    return safe(
        () => sessionStorage.getItem(PENDING_KEY) === userId && !localStorage.getItem(statusKey(userId)),
        false
    );
}

export function getPreferences(user) {
    const userId = getUserIdFrom(user);
    if (!userId) return { ...EMPTY_PREFERENCES };
    return safe(() => {
        const raw = JSON.parse(localStorage.getItem(prefsKey(userId)) || "null");
        return raw ? { ...EMPTY_PREFERENCES, ...raw } : { ...EMPTY_PREFERENCES };
    }, { ...EMPTY_PREFERENCES });
}

/** Fired whenever a user's saved preferences change (save / clear). */
export const PREFERENCES_CHANGED_EVENT = "kp_prefs_changed";
const notifyChanged = () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT));
};

export function savePreferences(user, prefs) {
    const userId = getUserIdFrom(user);
    if (!userId) return;
    const toSave = { ...prefs, savedAt: new Date().toISOString() };
    safe(() => {
        localStorage.setItem(prefsKey(userId), JSON.stringify(toSave));
        localStorage.setItem(statusKey(userId), "submitted");
        sessionStorage.removeItem(PENDING_KEY);
    });
    notifyChanged();

    // Persist to backend database tables asynchronously
    preferencesApi.save({
        budget: prefs.budget || [],
        locations: prefs.locations || [],
        localities: prefs.localities || [],
        property_types: prefs.propertyTypes || [],
        amenities: prefs.amenities || [],
        notifications_enabled: true,
    }, userId).catch((err) => {
        console.warn("Failed to sync preferences to backend:", err?.message);
    });
}

/** Removes saved preferences. They won't be asked again automatically. */
export function clearPreferences(user) {
    const userId = getUserIdFrom(user);
    if (!userId) return;
    safe(() => {
        localStorage.removeItem(prefsKey(userId));
        localStorage.setItem(statusKey(userId), "skipped");
    });
    notifyChanged();

    // Clear on backend database
    preferencesApi.clear(userId).catch((err) => {
        console.warn("Failed to clear preferences on backend:", err?.message);
    });
}

/** Sync preferences from backend into localStorage if available */
export async function syncPreferencesFromBackend(user) {
    const userId = getUserIdFrom(user);
    if (!userId) return null;
    try {
        const res = await preferencesApi.get(userId);
        if (res?.status && res?.has_preferences && res?.data) {
            const backendData = res.data;
            const mapped = {
                budget: backendData.budget || [],
                locations: backendData.locations || [],
                localities: backendData.localities || [],
                propertyTypes: backendData.property_types || [],
                amenities: backendData.amenities || [],
                savedAt: backendData.updated_at || new Date().toISOString(),
            };
            localStorage.setItem(prefsKey(userId), JSON.stringify(mapped));
            localStorage.setItem(statusKey(userId), "submitted");
            notifyChanged();
            return mapped;
        }
    } catch (err) {
        console.warn("Error fetching user preferences from backend:", err?.message);
    }
    return null;
}


/* ---- For useSyncExternalStore: raw JSON string (stable between renders) ---- */
export function subscribePreferences(callback) {
    window.addEventListener(PREFERENCES_CHANGED_EVENT, callback);
    window.addEventListener("storage", callback); // other tabs
    return () => {
        window.removeEventListener(PREFERENCES_CHANGED_EVENT, callback);
        window.removeEventListener("storage", callback);
    };
}

export function readPreferencesRaw(userId) {
    let effectiveId = userId;
    if (!effectiveId && typeof window !== "undefined") {
        try {
            const stored = localStorage.getItem("kp_auth_user");
            if (stored) {
                const u = JSON.parse(stored);
                effectiveId = getUserIdFrom(u);
            }
        } catch {}
    }
    if (effectiveId) {
        const val = safe(() => localStorage.getItem(prefsKey(effectiveId)), null);
        if (val) return val;
    }
    // Fallback: search for any existing preference record in localStorage
    if (typeof window !== "undefined") {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith("kp_prefs_") && !key.startsWith("kp_prefs_status_")) {
                    const val = localStorage.getItem(key);
                    if (val) return val;
                }
            }
        } catch {}
    }
    return null;
}

export function parsePreferences(raw) {
    if (!raw) return null;
    const parsed = safe(() => JSON.parse(raw), null);
    return parsed ? { ...EMPTY_PREFERENCES, ...parsed } : null;
}

export function hasAnyPreference(prefs) {
    if (!prefs) return false;
    return ["budget", "locations", "localities", "propertyTypes", "amenities"].some((k) => prefs[k]?.length);
}

export const budgetLabel = (id) => BUDGET_OPTIONS.find((b) => b.id === id)?.label || id;
export const propertyTypeLabel = (id) => PROPERTY_TYPE_OPTIONS.find((t) => t.id === id)?.label || id;

export function skipPreferences(user) {
    const userId = getUserIdFrom(user);
    if (!userId) return;
    safe(() => {
        localStorage.setItem(statusKey(userId), "skipped");
        sessionStorage.removeItem(PENDING_KEY);
    });
}

/** Builds the /properties URL that shows listings matching the preferences. */
export function preferencesToPropertiesUrl(prefs) {
    const params = new URLSearchParams();
    const districts = preferenceDistricts(prefs);
    if (districts.length) params.set("location", districts.join(","));
    if (prefs.propertyTypes?.length) params.set("type", prefs.propertyTypes.join(","));
    if (prefs.budget?.length) params.set("budget", prefs.budget.join(","));
    if (prefs.amenities?.length) params.set("amenities", prefs.amenities.join(","));
    const qs = params.toString();
    return qs ? `/properties?${qs}` : "/properties";
}

/**
 * Lets any page reopen the popup.
 * mode "edit": pre-filled, saves in place (no redirect), Cancel doesn't mark "skipped".
 * step: 0 budget · 1 location · 2 property type · 3 amenities
 */
export const OPEN_PREFERENCES_EVENT = "kp_open_preferences";
export function openPreferencesPopup({ mode = "edit", step = 0 } = {}) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT, { detail: { mode, step } }));
    }
}
