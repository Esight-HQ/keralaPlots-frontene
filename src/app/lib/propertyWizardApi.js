import apiClient from "./api";

const safePost = async (url, data, config) => {
    try {
        const res = await apiClient.post(url, data, config);
        return res.data;
    } catch (err) {
        console.warn(`[propertyWizardApi] POST ${url} notice:`, err.response?.data?.message || err.message);
        return { success: false, message: err.response?.data?.message || err.message };
    }
};

const safeGet = async (url) => {
    try {
        const res = await apiClient.get(url);
        return res.data;
    } catch (err) {
        console.warn(`[propertyWizardApi] GET ${url} notice:`, err.response?.data?.message || err.message);
        return { success: false, message: err.response?.data?.message || err.message };
    }
};

export const propertyWizardApi = {
    // 1. Create or retrieve active draft
    createDraft: async () => {
        return safePost("/property/create-draft");
    },

    // 2. Fetch full draft state by ID
    getDraft: async (id) => {
        return safeGet(`/property/${id}/draft`);
    },

    // 3. Step saves
    saveStep1: async (id, data) => {
        return safePost(`/property/${id}/step/1`, {
            listingType: data.listingType,
        });
    },

    saveStep2: async (id, data) => {
        return safePost(`/property/${id}/step/2`, {
            propertyType: data.propertyType,
        });
    },

    saveStep3: async (id, data) => {
        return safePost(`/property/${id}/step/3`, data.location || {});
    },

    saveStep4: async (id, data) => {
        const nearby = data.details?.nearbyPlaces || data.description?.nearbyPlaces || [];
        const features = data.details?.features || data.description?.features || [];
        let amenities = Array.isArray(data.details?.amenities) ? [...data.details.amenities] : [];

        // Handle hasLift
        if (data.details?.hasLift) {
            if (!amenities.includes("lift")) amenities.push("lift");
        } else {
            amenities = amenities.filter((a) => a !== "lift");
        }

        // Handle waterConnection
        if (data.details?.waterConnection) {
            if (!amenities.includes("water_connection")) amenities.push("water_connection");
        } else {
            amenities = amenities.filter((a) => a !== "water_connection" && a !== "water" && a !== "kwa");
        }

        // Handle electricity
        if (data.details?.electricity) {
            if (!amenities.includes("electricity")) amenities.push("electricity");
        } else {
            amenities = amenities.filter((a) => a !== "electricity" && a !== "electricity_connection");
        }

        const payload = {
            ...(data.details || {}),
            plotArea: data.details?.plotArea || data.details?.landArea || "",
            landArea: data.details?.landArea || data.details?.plotArea || "",
            roadWidth: data.details?.roadWidth || "",
            surveyNumber: data.details?.surveyNumber || "",
            boundaryWall: Boolean(data.details?.boundaryWall),
            cornerPlot: Boolean(data.details?.cornerPlot),
            waterConnection: Boolean(data.details?.waterConnection),
            electricity: Boolean(data.details?.electricity),
            facing: data.details?.facing,
            ownership: data.details?.ownership,
            amenities,
            features,
            nearbyPlaces: nearby,
        };
        return safePost(`/property/${id}/step/4`, payload);
    },

    saveStep5: async (id, data) => {
        return safePost(`/property/${id}/step/5`, data.price || {});
    },

    saveStep6: async (id, data, opts = {}) => {
        const formData = new FormData();

        // Separate photos into new files vs already-saved server images
        const newPhotos = [];
        const existingPhotoIds = [];
        if (data.media?.photos && data.media.photos.length > 0) {
            data.media.photos.forEach((photo) => {
                if (photo.file instanceof File || photo.file instanceof Blob) {
                    newPhotos.push(photo);
                } else if (photo.url && String(photo.url).startsWith("data:")) {
                    newPhotos.push(photo);
                } else if (photo.id && !isNaN(Number(photo.id))) {
                    existingPhotoIds.push(Number(photo.id));
                }
            });
        }

        const newFloorPlans = [];
        const existingFloorPlanIds = [];
        if (data.media?.floorPlans && data.media.floorPlans.length > 0) {
            data.media.floorPlans.forEach((plan) => {
                if (plan.file instanceof File || plan.file instanceof Blob) {
                    newFloorPlans.push(plan);
                } else if (plan.url && String(plan.url).startsWith("data:")) {
                    newFloorPlans.push(plan);
                } else if (plan.id && !isNaN(Number(plan.id))) {
                    existingFloorPlanIds.push(Number(plan.id));
                }
            });
        }

        const hasNewUploads = newPhotos.length > 0 || newFloorPlans.length > 0;

        // Only send sync_media (which can DELETE server images not in the list)
        // when there are new files to upload. During a pure auto-save with no new
        // files, we skip sync so existing server images are never accidentally deleted.
        if (hasNewUploads) {
            formData.append("sync_media", "1");

            // Tell the server which existing images to KEEP
            existingPhotoIds.forEach((id) => formData.append("existing_image_ids[]", id));
            existingFloorPlanIds.forEach((id) => formData.append("existing_floor_plan_ids[]", id));

            // Append the actual new file uploads
            newPhotos.forEach((photo) => {
                if (photo.file instanceof File || photo.file instanceof Blob) {
                    formData.append("photos[]", photo.file, photo.name || "photo.jpg");
                } else {
                    formData.append("photos[]", photo.url);
                }
            });
            newFloorPlans.forEach((plan) => {
                if (plan.file instanceof File || plan.file instanceof Blob) {
                    formData.append("floor_plans[]", plan.file, plan.name || "floor.jpg");
                } else {
                    formData.append("floor_plans[]", plan.url);
                }
            });
        }
        // If no new uploads, don't touch server images at all (safe auto-save)

        if (data.media?.coverIndex !== undefined) {
            formData.append("coverIndex", data.media.coverIndex);
        }
        if (data.media?.videoUrl) {
            formData.append("videoUrl", data.media.videoUrl);
        }
        if (data.media?.tourUrl) {
            formData.append("tourUrl", data.media.tourUrl);
        }
        if (data.media?.voiceNote instanceof File || data.media?.voiceNote instanceof Blob) {
            formData.append("voiceNote", data.media.voiceNote, "voicenote.wav");
        } else if (data.media?.voiceNote?.blob instanceof Blob) {
            formData.append("voiceNote", data.media.voiceNote.blob, "voicenote.wav");
        }

        return safePost(`/property/${id}/step/6`, formData);
    },

    saveStep7: async (id, data) => {
        const nearby = data.description?.nearbyPlaces || data.details?.nearbyPlaces || [];
        const features = data.description?.features || data.details?.features || [];
        return safePost(`/property/${id}/step/7`, {
            title: data.description?.title,
            description: data.description?.description,
            features,
            nearbyPlaces: nearby,
        });
    },

    saveStep8: async (id, data) => {
        return safePost(`/property/${id}/step/8`, {
            ownerName: data.contact?.ownerName,
            phone: data.contact?.phone,
            whatsapp: data.contact?.whatsapp,
            email: data.contact?.email,
            showContact: data.contact?.showContact,
            address: data.location?.address || data.location?.locality,
        });
    },

    // Save generic step (1-8)
    saveStep: async (step, id, formData) => {
        switch (step) {
            case 1: return propertyWizardApi.saveStep1(id, formData);
            case 2: return propertyWizardApi.saveStep2(id, formData);
            case 3: return propertyWizardApi.saveStep3(id, formData);
            case 4: return propertyWizardApi.saveStep4(id, formData);
            case 5: return propertyWizardApi.saveStep5(id, formData);
            case 6: return propertyWizardApi.saveStep6(id, formData);
            case 7: return propertyWizardApi.saveStep7(id, formData);
            case 8: return propertyWizardApi.saveStep8(id, formData);
            default: return { success: true };
        }
    },

    // Final publish
    publish: async (id, planCategory = null) => {
        const body = planCategory ? { plan_category: planCategory } : {};
        const response = await apiClient.post(`/property/${id}/publish`, body);
        return response.data;
    },

    // Malayalam AI Property Reel & Video Gallery APIs
    getReelOptions: async () => {
        return safeGet("/property/reel/options");
    },

    draftReelScript: async (id, payload = {}) => {
        const endpoint = id ? `/property/${id}/reel/draft-script` : "/property/reel/draft-script";
        return safePost(endpoint, payload);
    },

    generateReel: async (id, payload = {}) => {
        return safePost(`/property/${id}/reel/generate`, payload);
    },

    getReelStatus: async (id, jobId) => {
        return safeGet(`/property/${id}/reel/status/${jobId}`);
    },

    uploadPropertyVideo: async (id, file, title = "Property Video") => {
        const fd = new FormData();
        fd.append("video", file, file.name || "property_video.mp4");
        if (title) fd.append("title", title);
        return safePost(`/property/${id}/reel/upload`, fd);
    },

    deletePropertyVideo: async (id, videoId) => {
        try {
            const res = await apiClient.delete(`/property/${id}/reel/${videoId}`);
            return res.data;
        } catch (err) {
            return { success: false, message: err.response?.data?.message || err.message };
        }
    },
};

export const propertyPaymentApi = {
    getConfig: async () => {
        const res = await apiClient.get("/property-payment/config");
        return res.data;
    },
    getReelEntitlement: async (propertyId = 0, planCategory = null) => {
        const params = {};
        if (propertyId) params.property_id = propertyId;
        if (planCategory) params.plan_category = planCategory;
        const res = await apiClient.get("/property-payment/reel-entitlement", { params });
        return res.data;
    },
    createOrder: async (propertyId, { includeReel = false } = {}) => {
        const res = await apiClient.post("/property-payment/create-order", {
            property_id: propertyId,
            include_reel: Boolean(includeReel),
        });
        return res.data;
    },
    verifyPayment: async (data) => {
        const res = await apiClient.post("/property-payment/verify-payment", data);
        return res.data;
    },
    getStatus: async (propertyId, planCategory = null) => {
        const params = planCategory ? { plan_category: planCategory } : undefined;
        const res = await apiClient.get(`/property-payment/status/${propertyId}`, { params });
        return res.data;
    },
};

export default propertyWizardApi;
