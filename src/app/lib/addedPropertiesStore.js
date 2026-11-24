/* Storage and API sync for the properties the user has listed.
   Syncs with Laravel backend API /api/profile/added-properties and local store. */

import apiClient, { DEFAULT_PROPERTY_NO_IMAGE } from "./api";
import { landAreaUnitLabel } from "./areaUnits";

const KEY_PREFIX = "kp_added_properties";

/* Wizard property-type ids -> the label the table shows in its pill. */
const TYPE_LABEL = {
    house: "House",
    apartment: "Apartment",
    villa: "Villa",
    plot: "Plot",
    commercial: "Commercial",
    office: "Office",
    warehouse: "Warehouse",
    hotel: "Hotel",
    other: "Other",
};

export const FALLBACK_IMAGE = {
    House: DEFAULT_PROPERTY_NO_IMAGE,
    Villa: DEFAULT_PROPERTY_NO_IMAGE,
    Apartment: DEFAULT_PROPERTY_NO_IMAGE,
    Plot: DEFAULT_PROPERTY_NO_IMAGE,
    default: DEFAULT_PROPERTY_NO_IMAGE,
};

export function fallbackImageFor(type) {
    return DEFAULT_PROPERTY_NO_IMAGE;
}

export function formatPrice(amount, { perMonth = false } = {}) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return "Price on request";
    return `₹ ${value.toLocaleString("en-IN")}${perMonth ? " / Month" : ""}`;
}

function readFromStorage() {
    try {
        const raw = localStorage.getItem(storageKey());
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeToStorage(list) {
    try {
        localStorage.setItem(storageKey(), JSON.stringify(list));
    } catch {
        // storage unavailable
    }
}

function storageKey() {
    if (typeof window === "undefined") return KEY_PREFIX;
    try {
        const raw = localStorage.getItem("kp_auth_user");
        const user = raw ? JSON.parse(raw) : null;
        const id = user?.loginId || user?.id;
        return id ? `${KEY_PREFIX}_${id}` : KEY_PREFIX;
    } catch {
        return KEY_PREFIX;
    }
}

const SERVER_SNAPSHOT = { hydrated: false, list: [] };

let snapshot = null;
const listeners = new Set();

export function getServerSnapshot() {
    return SERVER_SNAPSHOT;
}

export function getSnapshot() {
    if (!snapshot) snapshot = { hydrated: false, list: readFromStorage() };
    return snapshot;
}

function onStorage(event) {
    if (event.key !== null && !event.key.startsWith(KEY_PREFIX) && event.key !== "kp_auth_user") return;
    snapshot = null;
    listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
    if (listeners.size === 0 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
        window.addEventListener("kp_auth_changed", onStorage);
    }
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("kp_auth_changed", onStorage);
        }
    };
}

export function commit(list) {
    snapshot = { hydrated: true, list };
    writeToStorage(list);
    listeners.forEach((listener) => listener());
}

/** Replace the list with `updater(currentList)`, persist it and notify readers. */
export function updateAddedProperties(updater) {
    commit(updater(getSnapshot().list));
}

/** Prepend a listing and persist. Returns the new list. */
export function addAddedProperty(property) {
    const list = [property, ...getSnapshot().list];
    commit(list);
    return list;
}

/**
 * Fetch real user properties from backend API and update store.
 */
export async function syncUserPropertiesFromApi() {
    try {
        const res = await apiClient.get("/profile/added-properties");
        if (res.data?.success && Array.isArray(res.data?.data)) {
            const apiProperties = res.data.data.map((p) => ({
                ...p,
                image: p.image || DEFAULT_PROPERTY_NO_IMAGE,
            }));
            commit(apiProperties);
            return apiProperties;
        }
    } catch (err) {
        console.warn("Could not sync user properties from API:", err.message);
    }

    return getSnapshot().list;
}

/**
 * API call to update property status.
 */
export async function apiUpdatePropertyStatus(id, status) {
    try {
        await apiClient.patch(`/property/${id}/status`, { status });
    } catch (err) {
        console.warn("Status update API error:", err.message);
    }
    updateAddedProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
}

/**
 * API call to delete property.
 */
export async function apiDeleteProperty(id) {
    try {
        await apiClient.delete(`/property/${id}`);
    } catch (err) {
        console.warn("Delete property API error:", err.message);
    }
    updateAddedProperties((prev) => prev.filter((p) => p.id !== id));
}

export function buildAddedPropertyFromForm(formData, createdId = null) {
    const id = createdId || Date.now();
    const code = `KP${id}`;

    const type = TYPE_LABEL[formData.propertyType] ?? "Other";
    const isPlot = formData.propertyType === "plot";
    const perMonth = formData.listingType === "rent" || formData.listingType === "lease";

    const { locality, district } = formData.location || {};
    const location = [locality, district, "Kerala"].filter(Boolean).join(", ");

    const priceNum = Number(formData.price?.amount) || 0;

    const area = isPlot
        ? `${formData.details?.plotArea || "0"} ${landAreaUnitLabel(formData.details?.landAreaUnit)}`
        : `${formData.details?.builtupArea || "0"} Sq.ft`;

    const cover = formData.media?.photos?.[formData.media?.coverIndex || 0] ?? formData.media?.photos?.[0];

    const now = new Date();

    return {
        id,
        code,
        title: formData.description?.title?.trim() || `${type} in ${locality || "Kerala"}`,
        location,
        type,
        price: formatPrice(priceNum, { perMonth }),
        priceNum,
        addedOn: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        addedTs: now.getTime(),
        views: 0,
        calls: 0,
        status: "Active",
        beds: isPlot || !formData.details?.bedrooms ? null : `${formData.details.bedrooms} Beds`,
        baths: isPlot || !formData.details?.bathrooms ? null : `${formData.details.bathrooms} Baths`,
        area,
        image: cover?.url ?? fallbackImageFor(type),
    };
}
