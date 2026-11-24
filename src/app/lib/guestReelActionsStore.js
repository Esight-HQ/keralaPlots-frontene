import reelsApi from "./reelsApi";

/* Likes and saves made on reels before signing in.
   They live in localStorage (per browser) so the heart / bookmark stay
   filled across reloads, and are pushed to the API once the user logs in.
   The like/save endpoints are toggles, so each sync checks the returned
   state and toggles back if the server already had that reel liked/saved. */

const STORAGE_KEY = "kp_guest_reel_actions";
export const GUEST_REEL_ACTIONS_SYNCED_EVENT = "kp_guest_reel_actions_synced";

const emptyState = () => ({ likes: [], saves: [] });

const readState = () => {
    if (typeof window === "undefined") return emptyState();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyState();
        const parsed = JSON.parse(raw);
        return {
            likes: Array.isArray(parsed?.likes) ? parsed.likes.map(String) : [],
            saves: Array.isArray(parsed?.saves) ? parsed.saves.map(String) : [],
        };
    } catch {
        return emptyState();
    }
};

const writeState = (state) => {
    if (typeof window === "undefined") return;
    try {
        if (!state.likes.length && !state.saves.length) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    } catch {
        // storage blocked (private mode); the UI state still works for this visit
    }
};

const listKey = (type) => (type === "save" ? "saves" : "likes");

export const getGuestReelActions = () => {
    const state = readState();
    return { likes: new Set(state.likes), saves: new Set(state.saves) };
};

export const isGuestReelActive = (type, reelId) =>
    readState()[listKey(type)].includes(String(reelId));

/** Flip a guest like/save. Returns the new state (true = liked/saved). */
export const toggleGuestReelAction = (type, reelId) => {
    const state = readState();
    const key = listKey(type);
    const id = String(reelId);
    const isActive = state[key].includes(id);
    state[key] = isActive ? state[key].filter((item) => item !== id) : [...state[key], id];
    writeState(state);
    return !isActive;
};

export const hasPendingGuestReelActions = () => {
    const state = readState();
    return state.likes.length > 0 || state.saves.length > 0;
};

const syncOne = async (type, reelId) => {
    const call = type === "save" ? reelsApi.toggleSave : reelsApi.toggleLike;
    const field = type === "save" ? "is_saved" : "is_liked";

    const first = await call(reelId);
    // Server already had it liked/saved, so the toggle removed it: toggle back.
    if (first?.data && first.data[field] === false) {
        await call(reelId);
    }
};

let syncPromise = null;

/** Push guest likes/saves to the API. Safe to call repeatedly. */
export const syncGuestReelActions = () => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (!localStorage.getItem("kp_auth_token")) return Promise.resolve(false);
    if (!hasPendingGuestReelActions()) return Promise.resolve(false);
    if (syncPromise) return syncPromise;

    syncPromise = (async () => {
        const state = readState();
        const remaining = { likes: [], saves: [] };

        for (const [type, key] of [["like", "likes"], ["save", "saves"]]) {
            for (const id of state[key]) {
                try {
                    await syncOne(type, id);
                } catch (error) {
                    const status = error?.response?.status;
                    // Keep it for a later retry on network/server errors;
                    // drop it if the reel no longer exists or the request is invalid.
                    if (!status || status >= 500 || status === 401 || status === 429) {
                        remaining[key].push(id);
                    }
                }
            }
        }

        // Keep anything the user toggled while the sync was running.
        const latest = readState();
        writeState({
            likes: [...new Set([...remaining.likes, ...latest.likes.filter((id) => !state.likes.includes(id))])],
            saves: [...new Set([...remaining.saves, ...latest.saves.filter((id) => !state.saves.includes(id))])],
        });

        window.dispatchEvent(new Event(GUEST_REEL_ACTIONS_SYNCED_EVENT));
        return true;
    })().finally(() => {
        syncPromise = null;
    });

    return syncPromise;
};
