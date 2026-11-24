import apiClient, { cachedGet, clearApiCache } from "./api";

/**
 * Real Estate Social Reels API Client
 */
export const reelsApi = {
    /**
     * Fetch vertical reel feed with pagination
     */
    getFeed: async (page = 1, perPage = 10, force = true) => {
        return cachedGet("/reels", {
            params: { page, per_page: perPage },
            force,
            ttl: 10 * 1000,
        });
    },


    /**
     * Fetch single reel by ID
     */
    getReel: async (id) => {
        return cachedGet(`/reels/${id}`, { ttl: 5 * 60 * 1000 });
    },

    /**
     * Get authenticated user's saved reels
     */
    saved: async (params = {}) => {
        return cachedGet("/reels/saved", { params });
    },

    /**
     * Upload a new reel video with metadata and progress tracking
     */
    createReel: async (formData, onProgress) => {
        const response = await apiClient.post("/reels/create", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            },
        });
        clearApiCache("/reels");
        clearApiCache("/profile/reels");
        return response.data;
    },

    /**
     * Toggle like/unlike
     */
    toggleLike: async (id) => {
        const response = await apiClient.post(`/reels/${id}/like`);
        clearApiCache("/reels");
        return response.data;
    },

    /**
     * Toggle bookmark/save
     */
    toggleSave: async (id) => {
        const response = await apiClient.post(`/reels/${id}/save`);
        clearApiCache("/reels");
        return response.data;
    },

    /**
     * Record a unique user view
     */
    recordView: async (id, duration = 3, deviceId = null) => {
        const response = await apiClient.post(`/reels/${id}/view`, {
            duration,
            device_id: deviceId,
        });
        return response.data;
    },

    /**
     * Track a share event
     */
    recordShare: async (id, shareType = "copy_link") => {
        const response = await apiClient.post(`/reels/${id}/share`, {
            share_type: shareType,
        });
        return response.data;
    },

    /**
     * Report an inappropriate reel
     */
    reportReel: async (id, reason, description = "") => {
        const response = await apiClient.post(`/reels/${id}/report`, {
            reason,
            description,
        });
        return response.data;
    },

    /**
     * Get authenticated user's posted reels
     */
    getMyReels: async () => {
        return cachedGet("/profile/reels");
    },

    /**
     * Toggle reel active/inactive status
     */
    toggleStatus: async (id) => {
        const response = await apiClient.patch(`/reels/${id}/status`);
        clearApiCache("/reels");
        clearApiCache("/profile/reels");
        return response.data;
    },

    /**
     * Update an existing reel
     */
    updateReel: async (id, data) => {
        const isFormData = data instanceof FormData;
        const response = await apiClient.post(`/reels/${id}/update`, data, {
            headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
        });
        clearApiCache("/reels");
        clearApiCache("/profile/reels");
        return response.data;
    },

    /**
     * Delete a reel
     */
    deleteReel: async (id) => {
        const response = await apiClient.delete(`/reels/${id}`);
        clearApiCache("/reels");
        clearApiCache("/profile/reels");
        return response.data;
    },
};

/**
 * Reel Razorpay Payment API Client
 */
export const reelPaymentApi = {
    /**
     * Get dynamic payment config (fee amount from .env)
     */
    getConfig: async () => {
        const res = await apiClient.get("/reel-payment/config");
        return res.data;
    },

    /**
     * Create Razorpay order for reel
     */
    createOrder: async (reelId) => {
        const res = await apiClient.post("/reel-payment/create-order", { reel_id: reelId });
        return res.data;
    },

    /**
     * Verify Razorpay payment signature and activate reel
     */
    verifyPayment: async (payload) => {
        const res = await apiClient.post("/reel-payment/verify-payment", payload);
        clearApiCache("/reels");
        clearApiCache("/profile/reels");
        return res.data;
    },

    /**
     * Get payment status of reel
     */
    getStatus: async (reelId) => {
        const res = await apiClient.get(`/reel-payment/status/${reelId}`);
        return res.data;
    },
};

export default reelsApi;

