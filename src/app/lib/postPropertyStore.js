const DRAFT_KEY = "kp_post_property_draft";

export function loadDraft() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveDraft(formData, step, propertyId = null) {
    if (typeof window === "undefined") return;
    try {
        const existing = loadDraft();
        const activePropId = propertyId || existing?.propertyId || null;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, step, propertyId: activePropId, savedAt: Date.now() }));
    } catch {
        // storage unavailable — draft simply won't persist across reloads
    }
}

export function clearDraft() {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(DRAFT_KEY);
    } catch {
        // ignore
    }
}
