"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "../componants/nav/nav";
import styles from "./postProperty.module.css";
import { STEPS, initialFormData, RESIDENTIAL_TYPES } from "./postPropertyData";
import { landAreaUnitLabel } from "../lib/areaUnits";
import { useAuth } from "../context/AuthContext";
import { loadDraft, saveDraft, clearDraft } from "../lib/postPropertyStore";
import { addAddedProperty, buildAddedPropertyFromForm } from "../lib/addedPropertiesStore";
import { propertyWizardApi, propertyPaymentApi } from "../lib/propertyWizardApi";
import dynamic from "next/dynamic";
import { preloadWhenIdle } from "../lib/preloadWhenIdle";
import Step1ListingType from "./steps/Step1ListingType";
import Step2PropertyType from "./steps/Step2PropertyType";
import {
    RiCheckLine,
    RiSaveLine,
    RiCheckboxCircleFill,
    RiLoader4Line,
    RiArrowLeftLine,
    RiArrowRightLine,
    RiRocketLine,
    RiCloseLine,
    RiMapPinLine,
    RiAddCircleLine,
} from "react-icons/ri";

/* Steps 3–7 and the payment modals are loaded as separate chunks: the wizard
   opens on step 1, so they're kept out of the first download and fetched in
   the background right after the page is ready (see preloadWhenIdle). */
const loadStep3 = () => import("./steps/Step3Location");
const loadStep4 = () => import("./steps/Step4Details");
const loadStep5 = () => import("./steps/Step5Price");
const loadStep6 = () => import("./steps/Step6Media");
const loadStep7 = () => import("./steps/Step7Description");
const loadListingInfoModal = () => import("./ListingInfoModal");
const loadCheckoutModal = () => import("./PropertyCheckoutModal");

const Step3Location = dynamic(loadStep3);
const Step4Details = dynamic(loadStep4);
const Step5Price = dynamic(loadStep5);
const Step6Media = dynamic(loadStep6);
const Step7Description = dynamic(loadStep7);
const ListingInfoModal = dynamic(loadListingInfoModal, { ssr: false });
const PropertyCheckoutModal = dynamic(loadCheckoutModal, { ssr: false });

// Maps each step to the DOM id of its first unmet required field (matching
// the `id="field-*"` markers placed on the corresponding step inputs), so an
// attempted Next/Publish click can scroll straight to what's missing instead
// of just sitting disabled.
function getFirstInvalidFieldId(step, formData) {
    switch (step) {
        case 1:
            return formData.listingType ? null : "field-listingType";
        case 2:
            return formData.propertyType ? null : "field-propertyType";
        case 3:
            if (!formData.location?.district) return "field-district";
            if (!formData.location?.locality?.trim()) return "field-locality";
            return null;
        case 4: {
            const { propertyType, details = {} } = formData;
            if (propertyType === "plot") {
                return details.plotArea ? null : "field-plotArea";
            }
            if (RESIDENTIAL_TYPES.includes(propertyType)) {
                if (!details.builtupArea) return "field-builtupArea";
                if (!details.bedrooms) return "field-bedrooms";
                if (!details.bathrooms) return "field-bathrooms";
                return null;
            }
            if (!details.commercialSubType) return "field-commercialSubType";
            if (!details.builtupArea) return "field-builtupArea";
            return null;
        }
        case 5:
            return formData.price?.amount ? null : "field-price";
        case 6:
            return formData.media?.photos?.length > 0 ? null : "field-photos";
        case 7:
            if (!formData.description?.title?.trim()) return "field-title";
            if (!(formData.description?.description?.trim()?.length >= 10)) return "field-description";
            return null;
        default:
            return null;
    }
}

function isStepValid(step, formData) {
    switch (step) {
        case 1:
            return !!formData.listingType;
        case 2:
            return !!formData.propertyType;
        case 3:
            return !!formData.location?.district && !!formData.location?.locality?.trim();
        case 4: {
            const { propertyType, details = {} } = formData;
            if (propertyType === "plot") return !!details.plotArea;
            if (RESIDENTIAL_TYPES.includes(propertyType)) return !!details.builtupArea && !!details.bedrooms && !!details.bathrooms;
            return !!details.commercialSubType && !!details.builtupArea;
        }
        case 5:
            return !!formData.price?.amount;
        case 6:
            return formData.media?.photos?.length > 0;
        case 7:
            return formData.description?.title?.trim()?.length > 0 && formData.description?.description?.trim()?.length >= 10;
        default:
            return false;
    }
}

const formatPriceForSuccess = (amountStr) => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return "Price on Request";
    if (amount >= 10000000) {
        const cr = amount / 10000000;
        return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Crore${cr > 1 ? "s" : ""}`;
    }
    if (amount >= 100000) {
        const lakhs = amount / 100000;
        return `₹${lakhs.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Lakh${lakhs > 1 ? "s" : ""}`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
};

const getReadablePropertyType = (typeId) => {
    switch (typeId) {
        case "house": return "Independent House";
        case "apartment": return "Apartment Flat";
        case "villa": return "Independent Villa";
        case "plot": return "Residential Land / Plot";
        case "commercial": return "Commercial Property";
        case "office": return "Office Space";
        case "warehouse": return "Industrial Warehouse";
        case "hotel": return "Hotel / Resort";
        default: return "Property Listing";
    }
};

const formatRelativeTime = (ts) => {
    if (!ts) return "moments ago";
    const minutes = Math.round((Date.now() - ts) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
};

// A saved draft may predate fields added to the form since
const mergeDraftFormData = (saved) => ({
    ...initialFormData,
    ...saved,
    location: { ...initialFormData.location, ...(saved?.location || {}) },
    details: { ...initialFormData.details, ...(saved?.details || {}) },
    price: { ...initialFormData.price, ...(saved?.price || {}) },
    media: { ...initialFormData.media, ...(saved?.media || {}) },
    description: { ...initialFormData.description, ...(saved?.description || {}) },
    contact: { ...initialFormData.contact, ...(saved?.contact || {}) },
});

const isDraftIncomplete = (draft) => {
    if (!draft?.formData) return false;
    const merged = mergeDraftFormData(draft.formData);
    const allRequiredStepsDone = STEPS.every((step) => isStepValid(step.id, merged));
    return !allRequiredStepsDone;
};

function PostPropertyWizard() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading, user } = useAuth();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit") || searchParams.get("id");
    const shouldPromptPay = searchParams.get("pay") === "true";

    useEffect(
        () =>
            preloadWhenIdle([
                loadStep3,
                loadStep4,
                loadStep5,
                loadStep6,
                loadStep7,
                loadListingInfoModal,
                loadCheckoutModal,
            ]),
        []
    );

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace("/login?redirect=/post-property");
        }
    }, [isAuthenticated, authLoading, router]);

    const [formData, setFormData] = useState(initialFormData);
    const [currentStep, setCurrentStep] = useState(1);
    const [propertyId, setPropertyId] = useState(editId ? Number(editId) : null);
    const [saveStatus, setSaveStatus] = useState("saved");
    const [toast, setToast] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [publishedPropertyId, setPublishedPropertyId] = useState(null);
    const [draftPrompt, setDraftPrompt] = useState(null);
    const [showNewConfirm, setShowNewConfirm] = useState(false);
    const [isLoadingExisting, setIsLoadingExisting] = useState(!!editId);
    const [showListingInfoModal, setShowListingInfoModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutIncludeReel, setCheckoutIncludeReel] = useState(false);
    const [pendingPropertyId, setPendingPropertyId] = useState(null);
    const [reelEntitlement, setReelEntitlement] = useState({
        loaded: !editId,
        canCreateReel: false,
        hideDemo: false,
        source: null,
        planTitle: null,
        standardFee: 300,
        bundleFee: 500,
        justUnlocked: false,
    });

    const refreshReelEntitlement = async (targetPropId = propertyId) => {
        if (!isAuthenticated) return;
        try {
            const preferredCategory =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("plan_category")
                    : null;
            const res = await propertyPaymentApi.getReelEntitlement(
                targetPropId || 0,
                preferredCategory
            );
            if (res?.success && res?.data) {
                setReelEntitlement((prev) => ({
                    loaded: true,
                    canCreateReel: Boolean(res.data.can_create_reel || prev.justUnlocked),
                    hideDemo: Boolean(res.data.hide_demo),
                    source: res.data.reel_entitlement_source || prev.source,
                    planTitle: res.data.plan_title || prev.planTitle,
                    standardFee: Number(res.data.listing_fee || 300),
                    bundleFee: Number(res.data.listing_with_reel_fee || 500),
                    justUnlocked: prev.justUnlocked,
                }));
            } else {
                setReelEntitlement((prev) => ({ ...prev, loaded: true }));
            }
        } catch (err) {
            console.warn("Could not check reel entitlement:", err);
            setReelEntitlement((prev) => ({ ...prev, loaded: true }));
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            refreshReelEntitlement(propertyId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated, propertyId]);

    const hasHydratedRef = useRef(false);
    const saveTimerRef = useRef(null);
    const toastTimerRef = useRef(null);
    const hasLoadedDraftRef = useRef(false);
    const highlightTimerRef = useRef(null);

    // Scrolls the first unfilled required field of `step` into view and
    // flashes a highlight around it, so a Next/Publish click on an
    // incomplete step shows the user exactly what's missing.
    const scrollToInvalidField = (step, formData) => {
        const fieldId = getFirstInvalidFieldId(step, formData);
        if (!fieldId) return;
        requestAnimationFrame(() => {
            const el = document.getElementById(fieldId);
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add(styles.fieldInvalidHighlight);
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = setTimeout(() => {
                el.classList.remove(styles.fieldInvalidHighlight);
            }, 1600);
            const focusable = el.matches("input, select, textarea, button")
                ? el
                : el.querySelector("input, select, textarea, button");
            focusable?.focus?.({ preventScroll: true });
        });
    };

    const showToast = (message) => {
        setToast(message);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(""), 3800);
    };

    // Helper to get or create active draft property ID on backend
    const getActivePropertyId = async () => {
        if (propertyId) return propertyId;
        try {
            const res = await propertyWizardApi.createDraft();
            if (res?.data?.property_id) {
                setPropertyId(res.data.property_id);
                return res.data.property_id;
            }
        } catch (err) {
            console.error("Draft initialization error:", err);
        }
        return null;
    };

    // Save step data to backend
    const persistStep = async (stepNumber, dataToSave) => {
        setSaveStatus("saving");
        try {
            const activeId = await getActivePropertyId();
            if (activeId) {
                const currentData = dataToSave || formData;
                const res = await propertyWizardApi.saveStep(stepNumber, activeId, currentData);
                const savedId = res?.data?.property_id || activeId;
                if (savedId && savedId !== propertyId) {
                    setPropertyId(savedId);
                }

                if (stepNumber === 6 && res?.success && res?.data) {
                    const serverPhotos = Array.isArray(res.data.images) ? res.data.images : [];
                    const serverFloorPlans = Array.isArray(res.data.floor_plans) ? res.data.floor_plans : [];

                    setFormData((prev) => {
                        const prevPhotos = prev.media?.photos || [];
                        const prevFloorPlans = prev.media?.floorPlans || [];

                        // Build a map of server URLs for quick lookup
                        const serverPhotoMap = new Map(serverPhotos.map((img) => [String(img.id), img]));
                        const serverFloorMap = new Map(serverFloorPlans.map((img) => [String(img.id), img]));

                        // For photos already having a server ID, update their URL from server
                        // For local blob photos, try to match them to a newly uploaded server image
                        // by position among "new uploads" in the server list
                        const existingLocalPhotoIds = new Set(
                            prevPhotos.filter((p) => p.id && !isNaN(Number(p.id))).map((p) => String(p.id))
                        );
                        const newServerPhotos = serverPhotos.filter((img) => !existingLocalPhotoIds.has(String(img.id)));
                        const localBlobPhotos = prevPhotos.filter(
                            (p) => !p.id || isNaN(Number(p.id)) || String(p.id).startsWith("media_")
                        );

                        // Merge: replace each local blob photo with its corresponding server image
                        let newBlobIdx = 0;
                        const updatedPhotos = prevPhotos.map((photo) => {
                            // Already has a valid numeric server ID
                            if (photo.id && !isNaN(Number(photo.id)) && serverPhotoMap.has(String(photo.id))) {
                                const srv = serverPhotoMap.get(String(photo.id));
                                return { ...photo, url: srv.url, is_cover: srv.is_cover };
                            }
                            // Local blob — replace with next newly-uploaded server image
                            if (newServerPhotos[newBlobIdx]) {
                                const srv = newServerPhotos[newBlobIdx++];
                                // Revoke the blob URL to free memory
                                if (photo.url && photo.url.startsWith("blob:")) {
                                    try { URL.revokeObjectURL(photo.url); } catch (_) { }
                                }
                                return {
                                    id: srv.id,
                                    url: srv.url,
                                    is_cover: srv.is_cover,
                                    name: photo.name || `photo_${srv.id}.jpg`,
                                };
                            }
                            // No server match — keep as-is (upload may have failed silently)
                            return photo;
                        });

                        // Same for floor plans
                        const existingLocalFloorIds = new Set(
                            prevFloorPlans.filter((p) => p.id && !isNaN(Number(p.id))).map((p) => String(p.id))
                        );
                        const newServerFloors = serverFloorPlans.filter((img) => !existingLocalFloorIds.has(String(img.id)));
                        let newFloorIdx = 0;
                        const updatedFloorPlans = prevFloorPlans.map((plan) => {
                            if (plan.id && !isNaN(Number(plan.id)) && serverFloorMap.has(String(plan.id))) {
                                const srv = serverFloorMap.get(String(plan.id));
                                return { ...plan, url: srv.url };
                            }
                            if (newServerFloors[newFloorIdx]) {
                                const srv = newServerFloors[newFloorIdx++];
                                if (plan.url && plan.url.startsWith("blob:")) {
                                    try { URL.revokeObjectURL(plan.url); } catch (_) { }
                                }
                                return {
                                    id: srv.id,
                                    url: srv.url,
                                    is_cover: false,
                                    name: plan.name || `floor_${srv.id}.jpg`,
                                };
                            }
                            return plan;
                        });

                        const serverVideos = Array.isArray(res.data.videos) ? res.data.videos : (prev.media?.videos || []);
                        const nextData = {
                            ...prev,
                            media: {
                                ...prev.media,
                                photos: updatedPhotos,
                                floorPlans: updatedFloorPlans,
                                videos: serverVideos,
                                reelVideo: serverVideos[0] || prev.media?.reelVideo || null,
                            },
                        };
                        saveDraft(nextData, stepNumber, savedId);
                        return nextData;
                    });
                } else if (stepNumber !== 6) {
                    saveDraft(currentData, stepNumber, savedId);
                }
                setSaveStatus("saved");
                return savedId;
            }
            setSaveStatus("saved");
            return null;
        } catch (err) {
            console.error(`Error saving step ${stepNumber}:`, err);
            setSaveStatus("saved");
            return propertyId || null;
        }
    };

    // Check edit param or stored draft on mount
    useEffect(() => {
        if (hasLoadedDraftRef.current) return;
        hasLoadedDraftRef.current = true;

        if (editId) {
            // Load existing property details for editing
            setIsLoadingExisting(true);
            propertyWizardApi.getDraft(editId).then((res) => {
                setIsLoadingExisting(false);
                if (res?.success && res.data?.formData) {
                    setFormData(mergeDraftFormData(res.data.formData));
                    setPropertyId(Number(editId));
                    hasHydratedRef.current = true;
                    // Synchronize pay_for_property in local cache from fresh server data
                    if (res.data?.pay_for_property !== undefined) {
                        try {
                            const u = JSON.parse(localStorage.getItem("kp_auth_user") || "null");
                            if (u) {
                                u.pay_for_property = res.data.pay_for_property;
                                localStorage.setItem("kp_auth_user", JSON.stringify(u));
                            }
                        } catch {}
                    }

                    const targetStep = Math.min(Math.max(1, res.data?.draft_step || 1), STEPS.length);
                    if (shouldPromptPay || (res.data?.draft_step && res.data.draft_step >= STEPS.length)) {
                        setCurrentStep(STEPS.length);
                    } else if (targetStep > 1) {
                        setCurrentStep(targetStep);
                    }
                } else {
                    hasHydratedRef.current = true;
                    showToast("Property not found. Initializing new listing.");
                    getActivePropertyId();
                }
            }).catch((err) => {
                setIsLoadingExisting(false);
                hasHydratedRef.current = true;
                showToast("Failed to load property details.");
            });
            return;
        }

        const draft = loadDraft();
        if (draft?.formData && isDraftIncomplete(draft)) {
            setDraftPrompt(draft);
            if (draft.propertyId) setPropertyId(draft.propertyId);
        } else {
            if (draft?.formData) clearDraft();
            hasHydratedRef.current = true;
            // Pre-initialize draft on backend
            getActivePropertyId();
        }
    }, [editId]);

    const handleResumeDraft = () => {
        if (!draftPrompt) return;
        setFormData(mergeDraftFormData(draftPrompt.formData));
        if (draftPrompt.propertyId) setPropertyId(draftPrompt.propertyId);
        setCurrentStep(draftPrompt.step || 1);
        hasHydratedRef.current = true;
        setDraftPrompt(null);
        showToast("Restored your saved draft.");
    };

    const handleDiscardDraftAndStartNew = async () => {
        clearDraft();
        setFormData(initialFormData);
        setCurrentStep(1);
        hasHydratedRef.current = true;
        setDraftPrompt(null);
        setPropertyId(null);
        await getActivePropertyId();
        showToast("Started a new listing.");
    };

    const hasProgress = currentStep > 1 || !!formData.listingType;

    // Debounced autosave whenever the form changes.
    useEffect(() => {
        if (!hasHydratedRef.current || !hasProgress) return;
        setSaveStatus("saving");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            await persistStep(currentStep, formData);
        }, 1200);
        return () => clearTimeout(saveTimerRef.current);
    }, [formData, currentStep, hasProgress]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        };
    }, []);

    let maxUnlockedStep = STEPS.length;
    for (let s = 1; s <= STEPS.length; s++) {
        if (!isStepValid(s, formData)) {
            maxUnlockedStep = s;
            break;
        }
    }

    const allStepsValid = STEPS.every((s) => isStepValid(s.id, formData));
    const currentValid = isStepValid(currentStep, formData);
    const completedCount = STEPS.filter((s) => isStepValid(s.id, formData)).length;
    const progressPercent = Math.round((completedCount / STEPS.length) * 100);

    const goToStep = async (step) => {
        if (step > maxUnlockedStep) return;
        await persistStep(currentStep, formData);
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleNext = async () => {
        if (!currentValid) {
            showToast("Please complete the required fields to continue.");
            scrollToInvalidField(currentStep, formData);
            return;
        }
        if (currentStep < STEPS.length) {
            await goToStep(currentStep + 1);
        } else {
            await persistStep(currentStep, formData);
        }
    };

    const handlePrev = async () => {
        if (currentStep > 1) {
            await goToStep(currentStep - 1);
        }
    };

    const handleSaveDraft = async () => {
        try {
            await persistStep(currentStep, formData);
        } catch (err) {
            console.warn("Could not persist step on save draft:", err);
        }
        showToast("Draft saved successfully. Redirecting...");
        setTimeout(() => {
            router.push("/profile/added-properties");
        }, 300);
    };

    const handlePostNewProperty = () => {
        if (!hasProgress) return;
        setShowNewConfirm(true);
    };

    const confirmPostNewProperty = async () => {
        clearDraft();
        setFormData(initialFormData);
        setCurrentStep(1);
        setShowNewConfirm(false);
        setPropertyId(null);
        await getActivePropertyId();
        showToast("Started a new listing.");
    };

    const handlePublish = async () => {
        if (!allStepsValid) {
            showToast("A few required fields are still missing — please review each step.");
            const firstInvalidStep = STEPS.find((s) => !isStepValid(s.id, formData));
            if (firstInvalidStep) {
                if (firstInvalidStep.id !== currentStep) {
                    await persistStep(currentStep, formData);
                    setCurrentStep(firstInvalidStep.id);
                }
                scrollToInvalidField(firstInvalidStep.id, formData);
            }
            return;
        }
        setIsPublishing(true);
        try {
            let activeId = await getActivePropertyId();
            if (!activeId) {
                const draftRes = await propertyWizardApi.createDraft();
                activeId = draftRes?.data?.property_id;
                if (activeId) setPropertyId(activeId);
            }

            if (!activeId) {
                throw new Error("Unable to obtain property draft ID");
            }

            // Ensure critical step 7 is saved to the draft
            const s7Res = await propertyWizardApi.saveStep(7, activeId, formData);
            const targetId = s7Res?.data?.property_id || activeId;

            // Check server status in real time for payment exemption / already paid
            let isAlreadyPaid = false;
            let isFreeUser = false;

            const preferredCategory =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("plan_category")
                    : null;

            try {
                const statusRes = await propertyPaymentApi.getStatus(targetId, preferredCategory);
                if (statusRes?.success && statusRes?.data) {
                    if (statusRes.data.is_free || statusRes.data.bypass_payment) {
                        isFreeUser = true;
                        isAlreadyPaid = true;
                    } else if (statusRes.data.is_paid) {
                        isAlreadyPaid = true;
                    }

                    // Keep local storage synchronized with fresh server value
                    if (statusRes.data.pay_for_property !== undefined) {
                        try {
                            const u = JSON.parse(localStorage.getItem("kp_auth_user") || "null");
                            if (u) {
                                u.pay_for_property = statusRes.data.pay_for_property;
                                localStorage.setItem("kp_auth_user", JSON.stringify(u));
                            }
                        } catch {}
                    }
                }
            } catch (e) {
                console.warn("Could not check payment status:", e);
            }

            // If the property is already paid or user has free property posting permissions:
            // Directly update and publish without asking for payment again!
            if (isAlreadyPaid) {
                const publishRes = await propertyWizardApi.publish(targetId, preferredCategory);
                if (publishRes?.success) {
                    setPublishedPropertyId(targetId);
                    addAddedProperty(buildAddedPropertyFromForm(formData, targetId));
                    clearDraft();
                    setIsPublishing(false);
                    setIsPublished(true);
                    showToast(isFreeUser ? "Property published successfully! 🎉" : "Property published successfully! 🎉");
                    setTimeout(() => {
                        router.push("/profile/added-properties");
                    }, 400);
                    return;
                } else if (publishRes?.requires_payment) {
                    // Fallback in case publish rejected due to unpaid
                    setPendingPropertyId(targetId);
                    setIsPublishing(false);
                    setShowListingInfoModal(true);
                    return;
                } else {
                    throw new Error(publishRes?.message || "Failed to update property.");
                }
            }

            // If the property is unpaid:
            // Prompt the payment confirmation modal to complete payment & activate!
            setPendingPropertyId(targetId);
            setIsPublishing(false);
            setShowListingInfoModal(true);
        } catch (err) {
            console.error("Publish failed:", err);
            setIsPublishing(false);
            showToast(err.response?.data?.message || err.message || "Failed to process property. Please try again.");
        }
    };

    const handlePayNowFromInfoModal = (includeReel = false) => {
        setCheckoutIncludeReel(Boolean(includeReel));
        setShowListingInfoModal(false);
        setShowCheckoutModal(true);
    };

    const handleSaveDraftAndExit = () => {
        setShowListingInfoModal(false);
        showToast("Property saved as draft.");
        router.push("/profile/added-properties");
    };

    const handlePaymentSuccess = (paymentData) => {
        const publishedId = paymentData?.property_id || pendingPropertyId || propertyId;
        const unlockedReelNow = Boolean(paymentData?.include_reel || paymentData?.can_create_reel || checkoutIncludeReel);
        setShowCheckoutModal(false);
        setShowListingInfoModal(false);
        setPublishedPropertyId(publishedId);
        if (publishedId) setPropertyId(publishedId);
        addAddedProperty(buildAddedPropertyFromForm(formData, publishedId));
        clearDraft();

        if (unlockedReelNow && publishedId) {
            setReelEntitlement((prev) => ({
                ...prev,
                canCreateReel: true,
                source: "paid_reel_bundle",
                justUnlocked: true,
            }));
            setCurrentStep(7);
            try {
                const nextUrl = `/post-property?edit=${publishedId}&reel_unlocked=1`;
                window.history.replaceState(window.history.state, "", nextUrl);
            } catch {}
            showToast("₹500 Payment verified! Property published & Malayalam AI Reel Studio unlocked! 🎬");
            setTimeout(() => {
                const el = document.getElementById("property-reel-studio");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 180);
            return;
        }

        setIsPublished(true);
        showToast("Property published successfully! 🎉");
        setTimeout(() => {
            router.push("/profile/added-properties");
        }, 400);
    };

    const handleFinishAfterReelUnlock = () => {
        router.push("/profile/added-properties");
    };

    const stepProps = {
        formData,
        setFormData,
        showToast,
        propertyId,
        getActivePropertyId,
        persistStep,
        goToStep,
        reelEntitlement,
        onFinishAfterReelUnlock: handleFinishAfterReelUnlock,
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <Step1ListingType
                        {...stepProps}
                        onSelect={async (newType) => {
                            const updated = { ...formData, listingType: newType || formData.listingType };
                            await persistStep(1, updated);
                            setCurrentStep(2);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                    />
                );
            case 2:
                return (
                    <Step2PropertyType
                        {...stepProps}
                        onSelect={async (newPropType) => {
                            const updated = { ...formData, propertyType: newPropType || formData.propertyType };
                            await persistStep(2, updated);
                            setCurrentStep(3);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                    />
                );
            case 3:
                return (
                    <Step3Location
                        {...stepProps}
                        onSelect={async () => {
                            await persistStep(3, formData);
                            setCurrentStep(4);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                    />
                );
            case 4:
                return <Step4Details {...stepProps} />;
            case 5:
                return <Step5Price {...stepProps} />;
            case 6:
                return <Step6Media {...stepProps} />;
            case 7:
                return <Step7Description {...stepProps} />;
            default:
                return null;
        }
    };

    return (
        <>
            <Nav />
            {toast && <div className={styles.toastBar}>{toast}</div>}

            <div className={styles.page}>
                <div className={styles.layout}>
                    {/* ===================== SIDEBAR ===================== */}
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarCard}>

                            <div className={styles.progressHeaderRow}>
                                <span className={styles.progressLabel}>Your progress</span>
                                <span className={styles.progressPercent}>{progressPercent}%</span>
                            </div>
                            <div className={styles.progressBarTrack}>
                                <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
                            </div>

                            <div className={styles.stepperList}>
                                {STEPS.map((step) => {
                                    const done = isStepValid(step.id, formData) && step.id !== currentStep;
                                    const active = step.id === currentStep;
                                    const clickable = step.id <= maxUnlockedStep;
                                    return (
                                        <button
                                            type="button"
                                            key={step.id}
                                            className={`${styles.stepperItem} ${active ? styles.stepperItemActive : ""} ${done ? styles.stepperItemDone : ""
                                                }`}
                                            onClick={() => goToStep(step.id)}
                                            disabled={!clickable}
                                        >
                                            <span className={styles.stepperConnector} />
                                            <span className={styles.stepperIcon}>
                                                {done ? <RiCheckLine /> : step.id}
                                            </span>
                                            <span className={styles.stepperLabel}>{step.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button type="button" className={styles.saveDraftBtn} onClick={handleSaveDraft}>
                            <RiSaveLine /> Save Draft
                        </button>

                        {!isPublished && (
                            <button
                                type="button"
                                className={styles.postNewBtn}
                                onClick={handlePostNewProperty}
                                disabled={!hasProgress}
                            >
                                <RiAddCircleLine /> Post New Property
                            </button>
                        )}

                        {/* <div className={styles.sidebarCard}>
                            <div className={styles.infoCard}>
                                <span className={styles.infoCardIcon}>
                                    <RiShieldCheckLine />
                                </span>
                                <div>
                                    <div className={styles.infoCardTitle}>Privacy & Security</div>
                                    <p className={styles.infoCardText}>
                                        Your contact details are only shared with buyers you choose to reply to.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.sidebarCard}>
                            <div className={styles.infoCard}>
                                <span className={styles.infoCardIcon}>
                                    <RiCustomerServiceLine />
                                </span>
                                <div>
                                    <div className={styles.infoCardTitle}>Need help?</div>
                                    <p className={styles.infoCardText}>Our support team can help you list faster.</p>
                                    <button
                                        type="button"
                                        className={styles.helpLink}
                                        onClick={() => showToast("Reach us anytime at support@keralaplots.com")}
                                    >
                                        <RiQuestionLine /> Contact Support
                                    </button>
                                </div>
                            </div>
                        </div> */}
                    </aside>

                    {/* ===================== CONTENT ===================== */}
                    <main className={styles.content}>
                        {!isPublished && (
                            <div className={styles.utilityBar}>
                                <span className={styles.stepEyebrow}>
                                    Step {currentStep} of {STEPS.length}
                                    <span className={styles.stepEyebrowDivider} />
                                    <span className={styles.stepEyebrowLabel}>{STEPS[currentStep - 1]?.label || ""}</span>
                                </span>
                                <div className={styles.utilityBarMeta}>
                                    <span className={styles.autoSaveStatus}>
                                        {saveStatus === "saving" ? (
                                            <>
                                                <RiLoader4Line className={styles.aiSpinner} /> Saving
                                            </>
                                        ) : (
                                            <>
                                                <RiCheckboxCircleFill /> Saved
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {!isPublished && (
                            <div className={styles.mobileProgressTrack}>
                                <div className={styles.mobileProgressFill} style={{ width: `${progressPercent}%` }} />
                            </div>
                        )}

                        <div className={styles.formCard}>
                            {isPublished ? (
                                <div className={styles.successScreen}>
                                    {/* Close button top right */}
                                    {/* <button 
                                        type="button" 
                                        className={styles.successCloseBtn} 
                                        onClick={() => router.push("/profile/added-properties")}
                                        aria-label="Close"
                                    >
                                        <RiCloseLine />
                                    </button> */}

                                    {/* Success checkmark with concentric dashes and sparkles */}
                                    <div className={styles.successCheckContainer}>
                                        <div className={styles.successCheckPulseOuter}></div>
                                        <div className={styles.successCheckPulseInner}></div>
                                        <div className={styles.successCheckCircle}>
                                            <RiCheckLine />
                                        </div>
                                        <span className={`${styles.sparkle} ${styles.sp1}`}>✦</span>
                                        <span className={`${styles.sparkle} ${styles.sp2}`}>✦</span>
                                        <span className={`${styles.sparkle} ${styles.sp3}`}>✦</span>
                                        <span className={`${styles.sparkle} ${styles.sp4}`}>✦</span>
                                        <span className={`${styles.sparkle} ${styles.sp5}`}>✦</span>
                                        <span className={`${styles.sparkle} ${styles.sp6}`}>✦</span>
                                    </div>

                                    <h2 className={styles.successTitle}>
                                        {editId ? "Your property has been edited! 🎉" : "Your property has been added! 🎉"}
                                    </h2>
                                    <p className={styles.successText}>
                                        {editId
                                            ? "Your property changes have been updated and saved successfully."
                                            : "Thank you for listing with us. Your property is now live and visible to potential buyers and tenants."}
                                    </p>

                                    {/* Property Preview Card */}
                                    <div className={styles.propertyPreviewCard}>
                                        <div className={styles.previewImageWrap}>
                                            <img
                                                src={formData.media.photos[0]?.url || "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/e3f6ea0f-2ab2-48df-4158-b648fa395300/public"}
                                                alt="Property Preview"
                                                className={styles.previewImage}
                                            />
                                            <span className={styles.previewLiveBadge}>LIVE</span>
                                        </div>

                                        <div className={styles.previewBody}>
                                            <h3 className={styles.previewTitle}>
                                                {formData.details.bedrooms ? `${formData.details.bedrooms} BHK ` : ""}
                                                {getReadablePropertyType(formData.propertyType)}
                                            </h3>

                                            <p className={styles.previewLocation}>
                                                <RiMapPinLine />
                                                <span>{formData.location.locality ? `${formData.location.locality}, ` : ""}{formData.location.district || "Kerala"}</span>
                                            </p>

                                            <p className={styles.previewSpecs}>
                                                <span>{formData.details.builtupArea || formData.details.plotArea || "—"} {formData.propertyType === "plot" ? landAreaUnitLabel(formData.details.landAreaUnit) : "sq.ft"}</span>
                                                {formData.details.bedrooms && (
                                                    <>
                                                        <span className={styles.specDot}>•</span>
                                                        <span>{formData.details.bedrooms} Beds</span>
                                                    </>
                                                )}
                                                {formData.details.bathrooms && (
                                                    <>
                                                        <span className={styles.specDot}>•</span>
                                                        <span>{formData.details.bathrooms} Baths</span>
                                                    </>
                                                )}
                                            </p>

                                            <p className={styles.previewPrice}>
                                                {formatPriceForSuccess(formData.price.amount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div
                                        className={styles.successActions}
                                        style={editId ? { justifyContent: "center", maxWidth: "280px", margin: "0 auto" } : {}}
                                    >
                                        <button
                                            type="button"
                                            className={editId ? styles.successAddBtn : styles.successViewBtn}
                                            onClick={() => router.push("/profile/added-properties")}
                                        >
                                            View My Properties
                                        </button>
                                        {!editId && (
                                            <button
                                                type="button"
                                                className={styles.successAddBtn}
                                                onClick={() => {
                                                    setFormData(initialFormData);
                                                    setCurrentStep(1);
                                                    setIsPublished(false);
                                                }}
                                            >
                                                Add Another Property
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div key={currentStep} className={styles.stepPane}>
                                    {renderStep()}
                                </div>
                            )}
                        </div>

                        {!isPublished && (
                            <div className={styles.navFooter}>
                                <button
                                    type="button"
                                    className={styles.navBtnPrev}
                                    onClick={handlePrev}
                                    disabled={currentStep === 1}
                                >
                                    <RiArrowLeftLine /> Previous
                                </button>

                                <span className={styles.navFooterHint}>
                                    {currentValid ? (
                                        <>
                                            <RiCheckboxCircleFill className={styles.navFooterHintOk} /> Looks good
                                        </>
                                    ) : (
                                        "Complete the required fields to continue"
                                    )}
                                </span>

                                {currentStep === STEPS.length ? (
                                    <button
                                        type="button"
                                        className={`${styles.navBtnPublish} ${!currentValid ? styles.navBtnPublishInactive : ""}`}
                                        onClick={handlePublish}
                                        disabled={isPublishing}
                                    >
                                        {isPublishing ? (
                                            <>
                                                <RiLoader4Line className={styles.aiSpinner} /> Publishing…
                                            </>
                                        ) : (
                                            <>
                                                <RiRocketLine /> Publish Property
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className={`${styles.navBtnNext} ${!currentValid ? styles.navBtnNextInactive : ""}`}
                                        onClick={handleNext}
                                    >
                                        Next <RiArrowRightLine />
                                    </button>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {draftPrompt &&
                createPortal(
                    <div className={styles.modalOverlay} onClick={handleResumeDraft}>
                        <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                className={styles.modalDialogClose}
                                onClick={handleResumeDraft}
                                aria-label="Close"
                            >
                                <RiCloseLine />
                            </button>
                            <span className={styles.modalDialogIcon}>
                                <RiSaveLine />
                            </span>
                            <h3 className={styles.modalDialogTitle}>Continue where you left off?</h3>
                            <p className={styles.modalDialogText}>
                                You have a saved draft — {getReadablePropertyType(draftPrompt.formData.propertyType)}
                                {draftPrompt.formData.location?.locality
                                    ? ` in ${draftPrompt.formData.location.locality}`
                                    : ""}
                                {draftPrompt.formData.price?.amount
                                    ? ` at ${formatPriceForSuccess(draftPrompt.formData.price.amount)}`
                                    : ""}
                                .
                            </p>
                            <p className={styles.modalDialogSummary}>
                                <span>{STEPS[(draftPrompt.step || 1) - 1]?.label}</span>
                                <span>·</span>
                                <span>Saved {formatRelativeTime(draftPrompt.savedAt)}</span>
                            </p>
                            <button type="button" className={styles.modalDialogPrimaryBtn} onClick={handleResumeDraft}>
                                Continue Editing
                            </button>
                            <button type="button" className={styles.modalLinkBtn} onClick={handleDiscardDraftAndStartNew}>
                                Start a New Listing Instead
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

            {showNewConfirm &&
                createPortal(
                    <div className={styles.modalOverlay} onClick={() => setShowNewConfirm(false)}>
                        <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                className={styles.modalDialogClose}
                                onClick={() => setShowNewConfirm(false)}
                                aria-label="Close"
                            >
                                <RiCloseLine />
                            </button>
                            <span className={styles.modalDialogIcon}>
                                <RiAddCircleLine />
                            </span>
                            <h3 className={styles.modalDialogTitle}>Start a new listing?</h3>
                            <p className={styles.modalDialogText}>
                                {`Your current progress for ${getReadablePropertyType(formData.propertyType)}${formData.location?.locality ? ` in ${formData.location.locality}` : ""
                                    } will be replaced. This can't be undone.`}
                            </p>
                            <button
                                type="button"
                                className={`${styles.modalDialogPrimaryBtn} ${styles.modalDialogDangerBtn}`}
                                onClick={confirmPostNewProperty}
                            >
                                Start New Listing
                            </button>
                            <button type="button" className={styles.modalLinkBtn} onClick={() => setShowNewConfirm(false)}>
                                Cancel, keep editing
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

            <ListingInfoModal
                isOpen={showListingInfoModal}
                propertyId={pendingPropertyId || propertyId}
                onClose={() => {
                    setShowListingInfoModal(false);
                    router.push("/profile/added-properties");
                }}
                onPayNow={handlePayNowFromInfoModal}
                onSaveDraftAndExit={handleSaveDraftAndExit}
                onPublishSuccess={handlePaymentSuccess}
            />


            <PropertyCheckoutModal
                isOpen={showCheckoutModal}
                onClose={() => setShowCheckoutModal(false)}
                propertyId={pendingPropertyId || propertyId}
                includeReel={checkoutIncludeReel}
                user={user}
                onSuccess={handlePaymentSuccess}
                showToast={showToast}
            />
        </>
    );
}

export default function PostPropertyPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                <div style={{ textAlign: "center" }}>
                    <RiLoader4Line style={{ fontSize: "2rem", color: "#2563eb", animation: "spin 1s linear infinite" }} />
                    <p style={{ marginTop: "1rem", color: "#64748b", fontWeight: 500 }}>Loading property wizard…</p>
                </div>
            </div>
        }>
            <PostPropertyWizard />
        </Suspense>
    );
}
