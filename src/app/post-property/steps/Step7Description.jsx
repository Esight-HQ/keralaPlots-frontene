"use client";

import { useState } from "react";
import styles from "../postProperty.module.css";
import { PROPERTY_TYPES, AMENITIES } from "../postPropertyData";
import { RiSparklingLine, RiLoader4Line } from "react-icons/ri";
import PropertyReelGenerator from "../PropertyReelGenerator";

const MAX_DESCRIPTION_LENGTH = 2000;

function formatPrice(amount) {
    const n = parseFloat(amount);
    if (!n) return "";
    return n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : `₹${(n / 100000).toFixed(1)} L`;
}

// Template-based copy generation standing in for a real AI writer — builds a
// title/description from whatever fields are already filled in. No LLM call
// happens here, it's plain string templating dressed up with a short delay.
function generateTitle(formData) {
    const typeLabel = PROPERTY_TYPES.find((t) => t.id === formData.propertyType)?.label || "Property";
    const bhk = formData.details.bedrooms ? `${formData.details.bedrooms} BHK ` : "";
    const locality = formData.location.locality ? ` in ${formData.location.locality}` : "";
    const verb = formData.listingType === "rent" ? "for Rent" : formData.listingType === "lease" ? "for Lease" : "for Sale";
    return `${bhk}${typeLabel}${locality} ${verb}`.replace(/\s+/g, " ").trim();
}

function generateDescription(formData) {
    const typeLabel = PROPERTY_TYPES.find((t) => t.id === formData.propertyType)?.label || "Property";
    const isRent = formData.listingType === "rent";
    const isLease = formData.listingType === "lease";
    const actionLabel = isRent ? "available for rent" : isLease ? "available for lease" : "available for sale";
    const locParts = [formData.location?.locality, formData.location?.district].filter(Boolean);
    const locText = locParts.length ? ` in ${locParts.join(", ")}` : "";

    const sentences = [];
    sentences.push(`Well-maintained ${typeLabel.toLowerCase()} ${actionLabel}${locText}, ideal for comfortable living and strong long-term value.`);

    const builtup = parseFloat(formData.details?.builtupArea);
    const plotArea = parseFloat(formData.details?.plotArea || formData.details?.landArea);
    const beds = parseInt(formData.details?.bedrooms, 10);
    const baths = parseInt(formData.details?.bathrooms, 10);
    const furnishing = formData.details?.furnishing;

    const layoutBits = [];
    if (plotArea > 0) layoutBits.push(`set on a ${plotArea} cent plot`);
    if (builtup >= 50) layoutBits.push(`${builtup.toLocaleString("en-IN")} sq.ft of built-up space`);
    if (beds > 0) {
        const bedStr = `${beds} spacious bedroom${beds === 1 ? "" : "s"}`;
        const bathCount = baths > 0 ? baths : beds;
        const bathStr = `${bathCount} bathroom${bathCount === 1 ? "" : "s"}`;
        layoutBits.push(`${bedStr} and ${bathStr}`);
    }
    if (furnishing) layoutBits.push(`${furnishing.toLowerCase()} interiors`);
    if (layoutBits.length) {
        sentences.push(`Features ${layoutBits.join(", ")} with good natural light and ventilation.`);
    }

    const amenityLabels = (formData.details?.amenities || []).map(
        (id) => AMENITIES.find((a) => a.id === id)?.label || id
    );
    const accessExtras = [];
    if (formData.details?.roadWidth) accessExtras.push(`${formData.details.roadWidth} ft road access`);
    if (formData.details?.carParking && String(formData.details.carParking) !== "0") accessExtras.push("dedicated car parking");
    const combinedHighlights = [...accessExtras, ...amenityLabels];
    if (combinedHighlights.length) {
        sentences.push(`Key conveniences include ${combinedHighlights.join(", ")}.`);
    }

    const nearby = (formData.description?.nearbyPlaces || formData.details?.nearbyPlaces || [])
        .filter((p) => p?.name)
        .slice(0, 3)
        .map((p) => (p.distance ? `${p.name} (${p.distance})` : p.name));
    if (nearby.length) {
        sentences.push(`Conveniently close to ${nearby.join(", ")}.`);
    }

    if (formData.price?.amount) {
        const formatted = formatPrice(formData.price.amount) || `₹${Number(formData.price.amount).toLocaleString("en-IN")}`;
        const priceExtras = [];
        if (formData.price.negotiable) priceExtras.push("negotiable");
        if (formData.price.loanAvailable) priceExtras.push("bank loan facility available");
        sentences.push(
            `Expected price is ${formatted}${priceExtras.length ? ` (${priceExtras.join(", ")})` : ""}.`
        );
    }

    sentences.push("Direct owner/verified listing — contact today to schedule a site visit.");
    return sentences.join(" ");
}

export default function Step7Description({
    formData,
    setFormData,
    showToast,
    propertyId,
    getActivePropertyId,
    persistStep,
    goToStep,
    reelEntitlement,
    onFinishAfterReelUnlock,
}) {
    const { description } = formData;
    const [aiTitleLoading, setAiTitleLoading] = useState(false);
    const [aiDescLoading, setAiDescLoading] = useState(false);

    const updateDescription = (field, value) => {
        setFormData((prev) => ({ ...prev, description: { ...prev.description, [field]: value } }));
    };

    const handleSuggestTitle = async () => {
        setAiTitleLoading(true);
        await new Promise((r) => setTimeout(r, 700));
        updateDescription("title", generateTitle(formData));
        setAiTitleLoading(false);
        showToast("AI suggested a title based on your listing so far.");
    };

    const handleImproveDescription = async () => {
        setAiDescLoading(true);
        await new Promise((r) => setTimeout(r, 900));
        updateDescription("description", generateDescription(formData));
        setAiDescLoading(false);
        showToast("AI drafted a description — feel free to edit it.");
    };

    const remaining = MAX_DESCRIPTION_LENGTH - description.description.length;

    return (
        <>
            <h2 className={styles.stepHeadline}>Tell buyers about your property</h2>
            <p className={styles.stepSubtext}>A clear title and honest description build trust and get faster replies.</p>

            <div className={styles.field} id="field-title" style={{ marginBottom: "22px" }}>
                <label className={styles.fieldLabel}>
                    Property Title <span className={styles.requiredMark}>*</span>
                </label>
                <div className={styles.titleRow}>
                    <input
                        type="text"
                        className={styles.textInput}
                        placeholder="e.g. 3 BHK Villa in Kakkanad for Sale"
                        maxLength={80}
                        value={description.title}
                        onChange={(e) => updateDescription("title", e.target.value)}
                    />
                    <button type="button" className={styles.miniAiBtn} onClick={handleSuggestTitle} disabled={aiTitleLoading}>
                        {aiTitleLoading ? <RiLoader4Line className={styles.aiSpinner} /> : <RiSparklingLine />}
                        Suggest Title
                    </button>
                </div>
            </div>

            <div className={styles.field} id="field-description">
                <label className={styles.fieldLabel}>
                    Description <span className={styles.requiredMark}>*</span>
                </label>
                <textarea
                    className={styles.textareaInput}
                    placeholder="Describe the property, its condition, nearby conveniences and why it's a great buy..."
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    value={description.description}
                    onChange={(e) => updateDescription("description", e.target.value)}
                />
                <div className={styles.charCounterRow}>
                    <button
                        type="button"
                        className={styles.miniAiBtn}
                        style={{ marginRight: "auto" }}
                        onClick={handleImproveDescription}
                        disabled={aiDescLoading}
                    >
                        {aiDescLoading ? <RiLoader4Line className={styles.aiSpinner} /> : <RiSparklingLine />}
                        AI Improve Description
                    </button>
                    <span className={`${styles.charCounter} ${remaining < 100 ? styles.charCounterWarn : ""}`}>
                        {remaining} characters left
                    </span>
                </div>
            </div>

            <PropertyReelGenerator
                formData={formData}
                setFormData={setFormData}
                propertyId={propertyId}
                getActivePropertyId={getActivePropertyId}
                persistStep={persistStep}
                goToStep={goToStep}
                showToast={showToast}
                reelEntitlement={reelEntitlement}
                onFinishAfterReelUnlock={onFinishAfterReelUnlock}
            />
        </>
    );
}
