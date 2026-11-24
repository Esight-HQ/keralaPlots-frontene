const LOCAL_API_BASE_URL = "http://127.0.0.1:8002/api";
const ALT_LOCAL_API_BASE_URL = "http://127.0.0.1:8002/api";
const STAGING_API_BASE_URL = "https://api.keralaplots.com/api";
const TEST_API_BASE_URL = "https://apitest.keralaplots.com/api";

const isLocalHostname = () => {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
};

export const resolveApiBaseUrl = () => {
    if (typeof window !== "undefined") {
        if (isLocalHostname()) {
            return LOCAL_API_BASE_URL;
        }
        if (window.location.hostname === "test.keralaplots.com") {
            return STAGING_API_BASE_URL;
        }
        if (window.location.hostname === "keralaplots.com" || window.location.hostname === "www.keralaplots.com") {
            return TEST_API_BASE_URL;
        }
    }

    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    return process.env.NODE_ENV === "development" ? LOCAL_API_BASE_URL : TEST_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrl();

export const resolveBackendOrigin = () => {
    const apiBase = resolveApiBaseUrl();
    return apiBase.replace(/\/api\/?$/, "");
};

/**
 * Resolve any property video / reel / audio / poster URL cleanly against local (127.0.0.1:8000) or live backend.
 * Routes local property MP4/WEBM/MOV files through `/api/property/reel/stream/{filename}` so HTTP 206 byte-range
 * seeking works reliably even on `php artisan serve`.
 */
export function formatPropertyMediaUrl(raw) {
    if (!raw) return "";
    const url = typeof raw === "string" ? raw.trim() : (raw.url || raw.video_url || raw.thumbnail_url || "");
    if (!url) return "";
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;

    const origin = resolveBackendOrigin();
    const isLocalOrigin = isLocalHostname() || origin.includes("127.0.0.1") || origin.includes("localhost");

    const toLocalStreamUrl = (pathname) => {
        if (!isLocalOrigin || !pathname) return null;
        const m = pathname.match(/^\/uploads\/properties\/videos\/([^/]+\.(?:mp4|webm|mov|m4v))$/i);
        return m ? `${origin}/api/property/reel/stream/${m[1]}` : null;
    };

    if (/^https?:\/\//i.test(url)) {
        try {
            const parsed = new URL(url);
            if (isLocalOrigin && parsed.pathname.includes("/uploads/properties/videos/")) {
                return toLocalStreamUrl(parsed.pathname) || `${origin}${parsed.pathname}`;
            }
        } catch (_) { }
        return url;
    }

    const normalizedPath = `/${url.replace(/^\/+/, "")}`;
    return toLocalStreamUrl(normalizedPath) || `${origin}${normalizedPath}`;
}

/* axios (~18 KB gzipped) is loaded on first use instead of being bundled
   into every page's startup JS. `apiClient` keeps the same get/post/put/
   patch/delete API (all of them already return promises), so callers don't
   change. */
let clientPromise = null;

const createClient = async () => {
    const { default: axios } = await import("axios");
    const client = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });

    // Request interceptor to attach Bearer token, login id and handle FormData correctly
    client.interceptors.request.use(
        (config) => {
            config.baseURL = resolveApiBaseUrl();
            if (config.data instanceof FormData) {
                delete config.headers["Content-Type"];
            }
            if (typeof window !== "undefined") {
                const token = localStorage.getItem("kp_auth_token");
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                const userStr = localStorage.getItem("kp_auth_user") || sessionStorage.getItem("kp_auth_user");
                if (userStr) {
                    try {
                        const u = JSON.parse(userStr);
                        const uid = u?.loginId || u?.id || u?.login_id;
                        if (uid) {
                            config.headers["X-Login-Id"] = uid;
                        }
                        const uphone = u?.phone || u?.phone_number || u?.mobile_number || u?.personal_details?.mobile;
                        if (uphone) {
                            config.headers["X-User-Phone"] = String(uphone);
                        }
                        const uemail = u?.email || u?.personal_details?.email;
                        if (uemail) {
                            config.headers["X-User-Email"] = String(uemail);
                        }
                    } catch (e) { }
                }
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor for error handling & local-to-remote fallback
    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const config = error?.config;

            // If local backend (8000) is unreachable, only retry between local backends, never switch to live
            if (!error.response && config && typeof window !== "undefined" && isLocalHostname()) {
                const tried = config._fallbackTried || [];
                const currentBase = config.baseURL || resolveApiBaseUrl();
                const candidates = [LOCAL_API_BASE_URL, ALT_LOCAL_API_BASE_URL].filter(
                    (url) => url !== currentBase && !tried.includes(url)
                );

                if (candidates.length > 0) {
                    const nextBase = candidates[0];
                    config._fallbackTried = [...tried, currentBase];
                    config.baseURL = nextBase;
                    return client.request(config);
                }
            }

            if (error.response?.status === 401 && typeof window !== "undefined") {
                const hadAuthState = Boolean(
                    localStorage.getItem("kp_auth_token") ||
                    localStorage.getItem("kp_auth_user") ||
                    sessionStorage.getItem("kp_auth_user")
                );

                if (!hadAuthState) {
                    return Promise.reject(error);
                }

                // Token expired or invalid
                localStorage.removeItem("kp_auth_token");
                localStorage.removeItem("kp_auth_user");
                clearApiCache();
                window.dispatchEvent(new Event("kp_auth_changed"));
            }
            return Promise.reject(error);
        }
    );

    return client;
};

const getClient = () => {
    if (!clientPromise) {
        clientPromise = createClient().catch((error) => {
            clientPromise = null; // allow a retry if the chunk failed to load
            throw error;
        });
    }
    return clientPromise;
};

const apiClient = {
    get: (...args) => getClient().then((client) => client.get(...args)),
    post: (...args) => getClient().then((client) => client.post(...args)),
    put: (...args) => getClient().then((client) => client.put(...args)),
    patch: (...args) => getClient().then((client) => client.patch(...args)),
    delete: (...args) => getClient().then((client) => client.delete(...args)),
    request: (...args) => getClient().then((client) => client.request(...args)),
};

const CACHE_PREFIX = "kp_api_cache:";
const DEFAULT_CACHE_TTL = 2 * 60 * 1000;

const stableParams = (params = {}) => {
    const entries = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
};

const currentCacheScope = () => {
    if (typeof window === "undefined") return "server";

    const userStr = localStorage.getItem("kp_auth_user") || sessionStorage.getItem("kp_auth_user");
    if (!userStr) return "guest";

    try {
        const user = JSON.parse(userStr);
        return user?.loginId || user?.id || user?.login_id || "guest";
    } catch {
        return "guest";
    }
};

const makeCacheKey = (url, params = {}) => `${resolveApiBaseUrl()}:${currentCacheScope()}:${url}?${stableParams(params)}`;

const readCache = (key) => {
    if (typeof window === "undefined") return null;

    const memory = window.__kpApiCache?.get(key);
    if (memory) return memory;

    try {
        const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const writeCache = (key, value) => {
    if (typeof window === "undefined") return;

    // Do not cache empty data arrays permanently
    if (Array.isArray(value?.data) && value.data.length === 0) return;

    const record = { value, timestamp: Date.now() };
    window.__kpApiCache = window.__kpApiCache || new Map();
    window.__kpApiCache.set(key, record);

    try {
        sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(record));
    } catch {
        // Session storage can fail in private mode or when full; memory cache still helps.
    }
};

export const clearApiCache = (prefix = "") => {
    if (typeof window === "undefined") return;

    const matchesPrefix = (key) => !prefix || key.startsWith(prefix) || key.includes(`:${prefix}`);
    window.__kpApiCache?.forEach((_, key) => {
        if (matchesPrefix(key)) {
            window.__kpApiCache.delete(key);
        }
    });

    try {
        Object.keys(sessionStorage)
            .filter((key) => key.startsWith(CACHE_PREFIX) && matchesPrefix(key.slice(CACHE_PREFIX.length)))
            .forEach((key) => sessionStorage.removeItem(key));
    } catch { }
};

export const cachedGet = async (url, { params = {}, ttl = DEFAULT_CACHE_TTL, force = false } = {}) => {
    const key = makeCacheKey(url, params);
    const cached = !force ? readCache(key) : null;

    if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.value;
    }

    try {
        const response = await apiClient.get(url, { params });
        writeCache(key, response.data);
        return response.data;
    } catch (error) {
        if (cached?.value !== undefined) {
            return cached.value;
        }
        throw error;
    }
};

export const authApi = {
    // Mobile OTP
    sendOtp: async (phone, type = "login") => {
        const response = await apiClient.post("/auth/send-otp", { phone, type });
        return response.data;
    },

    verifyOtp: async (phone, otp, type = "login", name = "") => {
        const response = await apiClient.post("/auth/verify-otp", { phone, otp, type, name });
        return response.data;
    },

    // Google OAuth
    googleLogin: async (data) => {
        const response = await apiClient.post("/auth/google-login", data);
        return response.data;
    },

    googleRegister: async (data) => {
        const response = await apiClient.post("/auth/google-register", data);
        return response.data;
    },

    logout: async () => {
        try {
            const response = await apiClient.post("/auth/logout");
            clearApiCache();
            return response.data;
        } catch {
            clearApiCache();
            return { success: true };
        }
    },
};

export const profileApi = {
    getProfile: async () => {
        return cachedGet("/profile", { ttl: 5 * 60 * 1000 });
    },

    updateProfile: async (data) => {
        // If data is FormData, send with multipart headers
        const isFormData = data instanceof FormData;
        const response = await apiClient.post("/profile/update", data, {
            headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
        });
        clearApiCache("/profile");
        return response.data;
    },

    getCompletion: async () => {
        return cachedGet("/profile/completion", { ttl: 5 * 60 * 1000 });
    },

    deactivate: async () => {
        const response = await apiClient.post("/profile/deactivate");
        return response.data;
    },

    reactivate: async () => {
        const response = await apiClient.post("/profile/reactivate");
        return response.data;
    },

    deleteAccount: async () => {
        const response = await apiClient.post("/profile/delete");
        return response.data;
    },
};

export const propertyApi = {
    list: async (params = {}) => {
        const response = await apiClient.get("/properties", { params });
        return response.data;
    },

    map: async (params = {}) => {
        return cachedGet("/properties/map", { params });
    },

    show: async (id) => {
        const cleanId = String(id || "").replace(/^kp/i, "").trim() || id;
        return cachedGet(`/properties/${cleanId}`, { ttl: 5 * 60 * 1000 });
    },

    toggleFavorite: async (id) => {
        const response = await apiClient.post(`/properties/${id}/favorite`);
        clearApiCache("/favorites");
        clearApiCache("/properties");
        return response.data;
    },

    favorites: async (params = {}) => {
        return cachedGet("/favorites", { params });
    },

    recordView: async (id) => {
        const response = await apiClient.post(`/properties/${id}/view`);
        return response.data;
    },

    contact: async (id, message) => {
        const response = await apiClient.post(`/properties/${id}/contact`, { message });
        clearApiCache("/profile/contacted-properties");
        clearApiCache("/profile/dashboard");
        return response.data;
    },

    contacted: async () => {
        return cachedGet("/profile/contacted-properties");
    },
};

export const messagesApi = {
    conversations: async (params = {}) => {
        const response = await apiClient.get("/conversations", { params });
        return response.data;
    },

    createConversation: async (recipientId) => {
        const response = await apiClient.post("/conversations", { recipient_id: recipientId });
        return response.data;
    },

    messages: async (conversationId, params = {}) => {
        const response = await apiClient.get(`/conversations/${conversationId}/messages`, { params });
        return response.data;
    },

    send: async (payload, config = {}) => {
        const isFormData = payload instanceof FormData;
        const response = await apiClient.post("/messages", payload, {
            ...config,
            headers: { ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}), ...(config.headers || {}) },
        });
        return response.data;
    },

    markRead: async (messageId, conversationId = null) => {
        if (!messageId) return null;
        const cleanMsgId = String(messageId).replace(/^(api|msg)-/, "").trim();
        const cleanConvoId = conversationId ? String(conversationId).replace(/^(convo|api)-/, "").trim() : null;
        const numMsgId = !Number.isNaN(Number(cleanMsgId)) ? Number(cleanMsgId) : cleanMsgId;
        const numConvoId = cleanConvoId && !Number.isNaN(Number(cleanConvoId)) ? Number(cleanConvoId) : cleanConvoId;

        const attempts = [
            () => apiClient.post(`/messages/${cleanMsgId}/read`),
            () => apiClient.put(`/messages/${cleanMsgId}/read`),
            () => apiClient.post(`/messages/${cleanMsgId}/seen`),
            () => apiClient.post("/messages/read", { message_id: numMsgId, id: numMsgId, conversation_id: numConvoId }),
            () => apiClient.post("/messages/mark-read", { message_id: numMsgId, conversation_id: numConvoId }),
            () => apiClient.post("/messages/mark-as-read", { message_id: numMsgId, message_ids: [numMsgId], conversation_id: numConvoId }),
            ...(cleanConvoId ? [
                () => apiClient.post(`/conversations/${cleanConvoId}/messages/${cleanMsgId}/read`),
                () => apiClient.put(`/conversations/${cleanConvoId}/messages/${cleanMsgId}/read`),
                () => apiClient.post(`/conversations/${cleanConvoId}/messages/${cleanMsgId}/seen`),
            ] : []),
        ];

        for (const attempt of attempts) {
            try {
                const res = await attempt();
                return res?.data ?? res;
            } catch {
                // Try next candidate endpoint
            }
        }
        return null;
    },

    markConversationRead: async (conversationId) => {
        if (!conversationId) return null;
        const cleanConvoId = String(conversationId).replace(/^(convo|api)-/, "").trim();
        const numConvoId = !Number.isNaN(Number(cleanConvoId)) ? Number(cleanConvoId) : cleanConvoId;

        const attempts = [
            () => apiClient.post(`/conversations/${cleanConvoId}/read`),
            () => apiClient.put(`/conversations/${cleanConvoId}/read`),
            () => apiClient.patch(`/conversations/${cleanConvoId}/read`),
            () => apiClient.post(`/conversations/${cleanConvoId}/seen`),
            () => apiClient.post(`/conversations/${cleanConvoId}/mark-read`),
            () => apiClient.post(`/conversations/${cleanConvoId}/mark-as-read`),
            () => apiClient.post("/conversations/read", { conversation_id: numConvoId, id: numConvoId }),
            () => apiClient.post("/conversations/mark-read", { conversation_id: numConvoId, id: numConvoId }),
            () => apiClient.post("/conversations/seen", { conversation_id: numConvoId }),
            () => apiClient.post("/conversations/mark-as-read", { conversation_id: numConvoId }),
        ];

        for (const attempt of attempts) {
            try {
                const res = await attempt();
                return res?.data ?? res;
            } catch {
                // Try next candidate endpoint
            }
        }
        return null;
    },

    deleteMessage: async (messageId) => {
        const response = await apiClient.delete(`/messages/${messageId}`);
        return response.data;
    },

    // "Delete for me": hides the message only for the current user. Best effort —
    // the messages page also remembers hidden messages locally.
    deleteMessageForMe: async (messageId) => {
        const response = await apiClient.post(`/messages/${messageId}/delete-for-me`);
        return response.data;
    },

    shareReel: async ({ reel_id, recipient_id, message_text }) => {
        const response = await apiClient.post("/messages/share-reel", {
            reel_id,
            recipient_id,
            message_text,
        });
        return response.data;
    },

    shareProperty: async ({ property_id, recipient_id, message_text }) => {
        const response = await apiClient.post("/messages/share-property", {
            property_id,
            recipient_id,
            message_text,
        });
        return response.data;
    },

    toggleBlock: async (conversationId) => {
        const response = await apiClient.post(`/conversations/${conversationId}/toggle-block`);
        return response.data;
    },

    unreadCount: async () => {
        const response = await apiClient.get("/conversations/unread-count");
        return response.data;
    },
};

export const notificationsApi = {
    list: async (params = {}) => {
        const response = await apiClient.get("/notifications", { params });
        return response.data;
    },
    unreadCount: async () => {
        const response = await apiClient.get("/notifications/unread-count");
        return response.data;
    },
    markRead: async (id) => {
        const response = await apiClient.post(`/notifications/${id}/read`);
        return response.data;
    },
    markAllRead: async () => {
        const response = await apiClient.post("/notifications/read-all");
        return response.data;
    },
    delete: async (id) => {
        const response = await apiClient.delete(`/notifications/${id}`);
        return response.data;
    },
};

export const offersApi = {
    getMyOffer: async (propertyId) => {
        const response = await apiClient.get(`/properties/${propertyId}/my-offer`);
        return response.data;
    },
    submitOffer: async (propertyId, data) => {
        const response = await apiClient.post(`/properties/${propertyId}/offer`, data);
        return response.data;
    },
    listUserOffers: async () => {
        const response = await apiClient.get("/profile/offers");
        return response.data;
    },
    updateStatus: async (offerId, data) => {
        const response = await apiClient.post(`/profile/offers/${offerId}/status`, data);
        return response.data;
    },
};

export const dashboardApi = {
    get: async (params = {}) => {
        return cachedGet("/profile/dashboard", { params });
    },
    recordCall: async (propertyId, callType = "phone") => {
        const response = await apiClient.post(`/properties/${propertyId}/call`, { call_type: callType });
        clearApiCache("/profile/contacted-properties");
        clearApiCache("/profile/dashboard");
        return response.data;
    },
};

export const agentApi = {
    list: async (params = {}) => {
        const response = await apiClient.get("/agents", { params });
        return response.data;
    },
    get: async (id) => {
        const response = await apiClient.get(`/agents/${id}`);
        return response.data;
    },
    myStatus: async () => {
        const response = await apiClient.get("/agents/my-status");
        return response.data;
    },
    checkPhone: async (params = {}) => {
        const response = await apiClient.get("/agents/check-phone", { params });
        return response.data;
    },
    register: async (data) => {
        const response = await apiClient.post("/agents/register", data);
        return response.data;
    },
    updateProfile: async (data) => {
        const response = await apiClient.post("/agents/my-profile", data);
        return response.data;
    },
    getReviews: async (id) => {
        const response = await apiClient.get(`/agents/${id}/reviews`);
        return response.data;
    },
    submitReview: async (id, { rating, comment }) => {
        const response = await apiClient.post(`/agents/${id}/reviews`, { rating, comment });
        return response.data;
    },
    deleteReview: async (agentId, reviewId) => {
        const response = await apiClient.delete(`/agents/${agentId}/reviews/${reviewId}`);
        return response.data;
    },
    getProperties: async (id, params = {}) => {
        const response = await apiClient.get(`/agents/${id}/properties`, { params });
        return response.data;
    },
};

export const serviceProviderApi = {
    getAll: async (params = {}) => {
        const response = await apiClient.get("/service-providers", { params });
        return response.data;
    },
    checkDuplicate: async (params = {}) => {
        const response = await apiClient.get("/service-providers/check-duplicate", { params });
        return response.data;
    },
    myStatus: async () => {
        const response = await apiClient.get("/service-providers/my-status");
        return response.data;
    },
    myServices: async () => {
        const response = await apiClient.get("/service-providers/my-services");
        return response.data;
    },
    getMyService: async (id) => {
        const response = await apiClient.get(`/service-providers/my-services/${id}`);
        return response.data;
    },
    register: async (data) => {
        const response = await apiClient.post("/service-providers/register", data);
        clearApiCache("/service-providers");
        return response.data;
    },
    updateMyService: async (id, data) => {
        const response = await apiClient.post(`/service-providers/my-services/${id}`, data);
        clearApiCache("/service-providers");
        return response.data;
    },
    deleteMyService: async (id) => {
        const response = await apiClient.delete(`/service-providers/my-services/${id}`);
        clearApiCache("/service-providers");
        return response.data;
    },
    getServiceNames: async () => {
        const response = await apiClient.get("/service-names");
        return response.data;
    },
};

/* Builders directory. */
export const BUILDER_ROLE_PATTERN = /build|construct|contractor|developer|promoter/i;

export const builderApi = {
    list: async ({ force = false, district, search } = {}) => {
        try {
            const params = {};
            if (district && district !== "all") params.district = district;
            if (search) params.search = search;
            const res = await cachedGet("/public/builders", { params, force });
            if (res?.success && Array.isArray(res.data)) {
                return res.data;
            }
            if (Array.isArray(res)) {
                return res;
            }
        } catch {
            // Fall through to service-providers or empty list
        }

        try {
            const res = await cachedGet("/service-providers", { force });
            const all = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            return all.filter((s) => BUILDER_ROLE_PATTERN.test(`${s?.role || ""} ${s?.service_name || ""}`));
        } catch (err) {
            console.warn("Builders API unreachable, using local builders fallback:", err?.message || err);
            return [];
        }
    },
    status: async () => {
        const response = await apiClient.get("/builder/status");
        return response.data;
    },
    register: async (payload) => {
        let data = payload;
        let config = {};
        if (payload instanceof FormData) {
            config = { headers: { "Content-Type": "multipart/form-data" } };
        }
        const response = await apiClient.post("/builder/register", data, config);
        return response.data;
    },
    getWebsite: async () => {
        const response = await apiClient.get("/builder/website");
        return response.data;
    },
    checkSlug: async ({ slug, title }) => {
        const response = await apiClient.post("/builder/website/slug-check", { slug, title });
        return response.data;
    },
    saveWebsite: async (data) => {
        const response = await apiClient.post("/builder/website/save", { data });
        return response.data;
    },
    publishWebsite: async (data) => {
        const response = await apiClient.post("/builder/website/publish", { data });
        return response.data;
    },
    unpublishWebsite: async () => {
        const response = await apiClient.post("/builder/website/unpublish");
        return response.data;
    },
    uploadMedia: async (payload) => {
        let data = payload;
        let config = {};
        if (payload instanceof FormData) {
            config = { headers: { "Content-Type": "multipart/form-data" } };
        }
        const response = await apiClient.post("/builder/upload-media", data, config);
        return response.data;
    },
    getEnquiries: async () => {
        const response = await apiClient.get("/builder/enquiries");
        return response.data;
    },
    updateEnquiry: async (id, data) => {
        const response = await apiClient.patch(`/builder/enquiries/${id}`, data);
        return response.data;
    },
    deleteEnquiry: async (id) => {
        const response = await apiClient.delete(`/builder/enquiries/${id}`);
        return response.data;
    },
    getPublicWebsite: async (slug) => {
        const response = await apiClient.get(`/public/builders/${encodeURIComponent(slug)}`);
        return response.data;
    },
    submitPublicEnquiry: async (slug, data) => {
        const response = await apiClient.post(`/public/builders/${encodeURIComponent(slug)}/enquiry`, data);
        return response.data;
    },
};

export const quickSellApi = {
    submit: async (data) => {
        const response = await apiClient.post("/quick-sell", data);
        return response.data;
    },
};

export const blogApi = {
    getAll: async (params = {}) => {
        const response = await apiClient.get("/blogs", { params });
        return response.data;
    },
    getById: async (id) => {
        const response = await apiClient.get(`/blogs/${id}`);
        return response.data;
    },
};

export const testimonialApi = {
    getAll: async () => {
        const response = await apiClient.get("/testimonials");
        return response.data;
    },
};

export const propertyPaymentApi = {
    createOrder: async (propertyId) => {
        const response = await apiClient.post("/property-payment/create-order", { property_id: propertyId });
        return response.data;
    },
    verifyPayment: async (data) => {
        const response = await apiClient.post("/property-payment/verify-payment", data);
        return response.data;
    },
    getStatus: async (propertyId) => {
        const response = await apiClient.get(`/property-payment/status/${propertyId}`);
        return response.data;
    },
};

export const DEFAULT_PROPERTY_NO_IMAGE = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3d764f0-33ee-4ecf-82c7-3c87c7612200/public";

/**
 * Robust URL formatter for property images supporting:
 * 1. Cloudflare Images (https://imagedelivery.net/...)
 * 2. Legacy postProperty images (KeralaPlots-Image-*.webp -> https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImageLow/...)
 * 3. Legacy upload images (/uploads/properties/images/... -> https://keralaplots.com/uploads/properties/images/...)
 * 4. Resilient fallbacks
 */
export function formatPropertyImgUrl(raw) {
    if (!raw) {
        return DEFAULT_PROPERTY_NO_IMAGE;
    }

    let url = typeof raw === "string" ? raw.trim() : (raw.url || raw.image_url || raw.file_path || "");
    if (!url) {
        return DEFAULT_PROPERTY_NO_IMAGE;
    }

    // If the logo was mistakenly provided as a property placeholder, redirect to property placeholder
    if (url.includes("ff7c6dab-0418-4d39-7586-932e36dae300") || url.includes("logo_placeholder")) {
        return DEFAULT_PROPERTY_NO_IMAGE;
    }

    // Cloudflare images
    if (url.startsWith("https://imagedelivery.net/")) {
        return url;
    }

    // If it contains KeralaPlots-Image-
    if (url.includes("KeralaPlots-Image-")) {
        const parts = url.split("/");
        const filename = parts[parts.length - 1];
        return `https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImageLow/${filename}`;
    }

    // Preserve blob/data URLs and local dev server uploads directly
    if (url.startsWith("blob:") || url.startsWith("data:")) {
        return url;
    }

    // If it's already a full URL pointing somewhere else (e.g. local backend, Unsplash, other CDN, etc.)
    if (/^https?:\/\//i.test(url)) {
        if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(url)) {
            return url;
        }
        if (url.includes("uploads/properties/images/")) {
            const parts = url.split("/");
            const filename = parts[parts.length - 1];
            return `https://keralaplots.com/uploads/properties/images/${filename}`;
        }
        return url;
    }

    // If it is a relative path or filename
    const cleanPath = url.replace(/^\/+/, "");
    if (cleanPath === "nophoto.webp" || cleanPath === "nophoto.png") {
        return DEFAULT_PROPERTY_NO_IMAGE;
    }

    if (cleanPath.startsWith("uploads/properties/images/")) {
        const parts = cleanPath.split("/");
        const filename = parts[parts.length - 1];
        return `https://keralaplots.com/uploads/properties/images/${filename}`;
    }

    if (cleanPath.startsWith("uploads/")) {
        return `https://keralaplots.com/${cleanPath}`;
    }

    const filename = cleanPath.split("/").pop();
    if (filename.includes("KeralaPlots-Image-")) {
        return `https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImageLow/${filename}`;
    }

    return `https://keralaplots.com/uploads/properties/images/${filename}`;
}

/**
 * 404 and broken image error fallback handler for property <img> elements.
 * Progressively attempts alternative live image paths before falling back to /nophoto.webp.
 */
export function handlePropertyImageError(e) {
    const img = e.currentTarget;
    if (!img) return;
    const currentSrc = img.getAttribute("src") || "";
    const step = parseInt(img.dataset.fallbackStep || "0", 10);

    const parts = currentSrc.split("/");
    const filename = parts[parts.length - 1] || "";

    if (step === 0 && filename.includes("KeralaPlots-Image-")) {
        img.dataset.fallbackStep = "1";
        if (currentSrc.includes("PropertyImageLow")) {
            img.src = `https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImage/${filename}`;
            return;
        } else {
            img.src = `https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImageLow/${filename}`;
            return;
        }
    }

    if (step <= 1 && filename && !filename.includes("nophoto.webp")) {
        img.dataset.fallbackStep = "2";
        img.src = `https://keralaplots.com/uploads/properties/images/${filename}`;
        return;
    }

    // Final fallback
    img.dataset.fallbackStep = "99";
    img.src = DEFAULT_PROPERTY_NO_IMAGE;
}

/**
 * Robust date formatting for property added / listed dates.
 * Converts formats like '09-09-2026', '2026-09-09', ISO strings into '09 Sep 2026'.
 */
export function formatAddedDate(rawDate) {
    if (!rawDate) return "";
    const str = String(rawDate).trim();
    if (!str) return "";

    // Match DD-MM-YYYY or DD/MM/YYYY or DD-MM-YYYY HH:mm:ss
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }

    return str;
}

export const preferencesApi = {
    get: async (loginId) => {
        const headers = loginId ? { "X-Login-Id": String(loginId) } : {};
        const res = await apiClient.get("/preferences", { headers });
        return res.data;
    },
    save: async (data, loginId) => {
        const headers = loginId ? { "X-Login-Id": String(loginId) } : {};
        const res = await apiClient.post("/preferences", data, { headers });
        return res.data;
    },
    clear: async (loginId) => {
        const headers = loginId ? { "X-Login-Id": String(loginId) } : {};
        const res = await apiClient.delete("/preferences", { headers });
        return res.data;
    },
    getMatches: async (loginId, limit = 20, prefsData = null) => {
        const headers = loginId ? { "X-Login-Id": String(loginId) } : {};
        const url = `/preferences/matches?limit=${limit}${loginId ? `&login_id=${encodeURIComponent(loginId)}` : ""}`;
        if (prefsData) {
            const res = await apiClient.post(url, prefsData, { headers });
            return res.data;
        }
        const res = await apiClient.get(url, { headers });
        return res.data;
    },
};

export const userApi = {
    getUser: async (id) => {
        const res = await apiClient.get(`/users/${id}`);
        return res.data;
    },
};

export function handlePropertyImgError(e) {
    const currentSrc = e?.currentTarget?.src || "";
    const filename = currentSrc.split("/").pop() || "";
    if (filename.includes("KeralaPlots-") || filename.endsWith(".webp")) {
        if (!currentSrc.includes("PropertyImageLow")) {
            e.currentTarget.src = `https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImageLow/${filename}`;
            return;
        }
    } else if (filename && !currentSrc.includes("/uploads/properties/images/") && !currentSrc.includes("imagedelivery.net")) {
        e.currentTarget.src = `https://keralaplots.com/uploads/properties/images/${filename}`;
        return;
    }
    e.currentTarget.src = DEFAULT_PROPERTY_NO_IMAGE;
}

export default apiClient;

