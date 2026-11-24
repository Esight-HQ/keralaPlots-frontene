"use client";

import { useState, useRef } from "react";
import styles from "../postProperty.module.css";
import {
    AMENITIES,
    DEFAULT_PROPERTY_FEATURES,
    COMMERCIAL_SUBTYPES,
    FACING_OPTIONS,
    FURNISHING_OPTIONS,
    OWNERSHIP_OPTIONS,
    AVAILABILITY_OPTIONS,
    RESIDENTIAL_TYPES,
    NEARBY_PLACE_OPTIONS,
    NEARBY_DISTANCE_OPTIONS,
    DEFAULT_NEARBY_DISTANCE,
    FLOOR_OPTIONS,
    PROPERTY_AGE_OPTIONS,
} from "../postPropertyData";
import { LAND_AREA_UNITS, DEFAULT_LAND_AREA_UNIT } from "../../lib/areaUnits";
import { RiAddLine, RiArrowDownSLine, RiCloseLine, RiMapPin2Line } from "react-icons/ri";

const ROOM_OPTIONS = ["1", "2", "3", "4", "5+"];

export default function Step4Details({ formData, setFormData }) {
    const { propertyType, details, description } = formData;
    const nearbyPlaces = details?.nearbyPlaces || description?.nearbyPlaces || [];
    const selectedFeatures = details?.features || description?.features || [];
    const isResidential = RESIDENTIAL_TYPES.includes(propertyType);
    const isApartment = propertyType === "apartment";
    const isPlot = propertyType === "plot";
    const isCommercial = !isResidential && !isPlot;
    const [nearbyInput, setNearbyInput] = useState("");
    const [featureInput, setFeatureInput] = useState("");
    const [customFeatures, setCustomFeatures] = useState([]);
    const featureInputRef = useRef(null);
    const nearbyInputRef = useRef(null);

    // Deduplicated list of available features (combines defaults, custom added, and loaded from database)
    const allAvailableFeatures = Array.from(
        new Set([
            ...DEFAULT_PROPERTY_FEATURES,
            ...customFeatures,
            ...selectedFeatures,
        ])
    );

    const updateDetail = (field, value) => {
        setFormData((prev) => {
            const nextDetails = { ...prev.details, [field]: value };
            if (field === "plotArea") nextDetails.landArea = value;
            if (field === "landArea") nextDetails.plotArea = value;
            return { ...prev, details: nextDetails };
        });
    };

    const updateNearbyList = (newList) => {
        setFormData((prev) => ({
            ...prev,
            details: { ...prev.details, nearbyPlaces: newList },
            description: { ...prev.description, nearbyPlaces: newList },
        }));
    };

    const toggleAmenity = (id) => {
        setFormData((prev) => {
            const has = prev.details.amenities.includes(id);
            return {
                ...prev,
                details: {
                    ...prev.details,
                    amenities: has ? prev.details.amenities.filter((a) => a !== id) : [...prev.details.amenities, id],
                },
            };
        });
    };

    const toggleFeature = (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setFormData((prev) => {
            const current = prev.details?.features || [];
            const exists = current.some((f) => f.toLowerCase() === trimmed.toLowerCase());
            const nextFeatures = exists
                ? current.filter((f) => f.toLowerCase() !== trimmed.toLowerCase())
                : [...current, trimmed];
            return {
                ...prev,
                details: { ...prev.details, features: nextFeatures },
                description: { ...prev.description, features: nextFeatures },
            };
        });
    };

    const addCustomFeature = (input) => {
        const trimmed = input.trim();
        if (!trimmed) return;

        // Check if feature already exists (case-insensitive)
        const existing = allAvailableFeatures.find(
            (f) => f.toLowerCase() === trimmed.toLowerCase()
        );
        const featureToAdd = existing || trimmed;

        if (!existing) {
            setCustomFeatures((prev) => [...prev, trimmed]);
        }

        // Toggle / select feature without duplication
        setFormData((prev) => {
            const current = prev.details?.features || [];
            if (current.some((f) => f.toLowerCase() === featureToAdd.toLowerCase())) {
                return prev;
            }
            const nextFeatures = [...current, featureToAdd];
            return {
                ...prev,
                details: { ...prev.details, features: nextFeatures },
                description: { ...prev.description, features: nextFeatures },
            };
        });
    };

    // A feature is "custom" when it isn't one of the built-in defaults
    // (added by the user now, or saved earlier and loaded back from the database).
    const isCustomFeature = (name) =>
        !DEFAULT_PROPERTY_FEATURES.some((f) => f.toLowerCase() === name.toLowerCase());

    // Remove a custom feature completely: from the chip list and from the selected features.
    const removeCustomFeature = (name) => {
        const key = name.toLowerCase();
        setCustomFeatures((prev) => prev.filter((f) => f.toLowerCase() !== key));
        setFormData((prev) => {
            const current = prev.details?.features || prev.description?.features || [];
            const nextFeatures = current.filter((f) => f.toLowerCase() !== key);
            return {
                ...prev,
                details: { ...prev.details, features: nextFeatures },
                description: { ...prev.description, features: nextFeatures },
            };
        });
    };

    const addNearby = (place) => {
        const name = place.trim();
        if (!name || nearbyPlaces.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
        updateNearbyList([...nearbyPlaces, { name, distance: DEFAULT_NEARBY_DISTANCE }]);
    };

    // Shared by Enter key and the + button; keeps focus in the field for quick multiple entries.
    const submitFeatureInput = () => {
        if (!featureInput.trim()) return;
        addCustomFeature(featureInput);
        setFeatureInput("");
        featureInputRef.current?.focus();
    };

    const submitNearbyInput = () => {
        if (!nearbyInput.trim()) return;
        addNearby(nearbyInput);
        setNearbyInput("");
        nearbyInputRef.current?.focus();
    };

    const removeNearby = (name) => {
        updateNearbyList(nearbyPlaces.filter((p) => p.name !== name));
    };

    const updateNearbyDistance = (name, distance) => {
        updateNearbyList(
            nearbyPlaces.map((p) => (p.name === name ? { ...p, distance } : p))
        );
    };

    return (
        <>
            <h2 className={styles.stepHeadline}>Tell us about the property</h2>
            <p className={styles.stepSubtext}>
                These details help buyers understand exactly what you&apos;re offering.
            </p>

            {isPlot ? (
                <PlotFields details={details} updateDetail={updateDetail} />
            ) : isCommercial ? (
                <CommercialFields details={details} updateDetail={updateDetail} />
            ) : (
                <ResidentialFields details={details} updateDetail={updateDetail} />
            )}

            {isApartment && <ApartmentFields details={details} updateDetail={updateDetail} />}

            {isResidential && (
                <>
                    <h3 className={`${styles.sectionTitle} ${styles.sectionTitleDivider}`}>Amenities</h3>
                    <div className={styles.chipsRow}>
                        {AMENITIES.map((a) => {
                            const selected = details.amenities.includes(a.id);
                            return (
                                <button
                                    type="button"
                                    key={a.id}
                                    className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
                                    onClick={() => toggleAmenity(a.id)}
                                >
                                    {a.label}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Features Section */}
            <h3 className={`${styles.sectionTitle} ${styles.sectionTitleDivider}`}>Property Features</h3>
            <p className={styles.helperText} style={{ marginBottom: "10px" }}>
                Select features or add custom ones to highlight what makes this property special.
            </p>
            <div className={styles.chipsRow} style={{ marginBottom: "14px" }}>
                {allAvailableFeatures.map((feat) => {
                    const selected = selectedFeatures.some(
                        (f) => f.toLowerCase() === feat.toLowerCase()
                    );
                    if (isCustomFeature(feat)) {
                        return (
                            <span
                                key={feat}
                                className={`${styles.chip} ${styles.chipEditable} ${styles.chipCustom} ${selected ? styles.chipSelected : ""}`}
                            >
                                <button
                                    type="button"
                                    className={styles.chipLabelBtn}
                                    onClick={() => toggleFeature(feat)}
                                    aria-pressed={selected}
                                >
                                    {feat}
                                </button>
                                <button
                                    type="button"
                                    className={styles.chipRemoveBtn}
                                    onClick={() => removeCustomFeature(feat)}
                                    aria-label={`Remove ${feat}`}
                                    title="Remove"
                                >
                                    <RiCloseLine />
                                </button>
                            </span>
                        );
                    }
                    return (
                        <button
                            type="button"
                            key={feat}
                            className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
                            onClick={() => toggleFeature(feat)}
                            aria-pressed={selected}
                        >
                            {feat}
                        </button>
                    );
                })}
            </div>
            <div className={`${styles.mediaLinkRow} ${styles.addInputRow}`} style={{ marginBottom: "20px" }}>
                <input
                    ref={featureInputRef}
                    type="text"
                    placeholder="Add custom feature and press Enter"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                        // Ignore Enter while an IME / mobile keyboard is still composing a word.
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            submitFeatureInput();
                        }
                    }}
                />
                <button
                    type="button"
                    className={styles.addInputBtn}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={submitFeatureInput}
                    disabled={!featureInput.trim()}
                    aria-label="Add feature"
                    title="Add feature"
                >
                    <RiAddLine />
                </button>
            </div>

            <h3 className={`${styles.sectionTitle} ${styles.sectionTitleDivider}`}>Nearby Places</h3>
            <p className={styles.helperText} style={{ marginBottom: "10px" }}>
                Pick what&apos;s close by, then set how far it is.
            </p>
            <div className={styles.chipsRow} style={{ marginBottom: "14px" }}>
                {NEARBY_PLACE_OPTIONS.map((place) => {
                    const selected = nearbyPlaces.some((p) => p.name === place);
                    return (
                        <button
                            type="button"
                            key={place}
                            className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
                            onClick={() => (selected ? removeNearby(place) : addNearby(place))}
                        >
                            {place}
                        </button>
                    );
                })}
            </div>

            {nearbyPlaces.length > 0 && (
                <div className={styles.nearbyList} style={{ marginBottom: "14px" }}>
                    {nearbyPlaces.map((place) => (
                        <div key={place.name} className={styles.nearbyRow}>
                            <span className={styles.nearbyRowName}>
                                <RiMapPin2Line />
                                {place.name}
                            </span>
                            <select
                                className={styles.nearbyDistanceSelect}
                                value={place.distance}
                                onChange={(e) => updateNearbyDistance(place.name, e.target.value)}
                                aria-label={`Distance to ${place.name}`}
                            >
                                {NEARBY_DISTANCE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className={styles.nearbyRemoveBtn}
                                onClick={() => removeNearby(place.name)}
                                aria-label={`Remove ${place.name}`}
                            >
                                <RiCloseLine />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className={`${styles.mediaLinkRow} ${styles.addInputRow}`}>
                <input
                    ref={nearbyInputRef}
                    type="text"
                    placeholder="Add another nearby place and press Enter"
                    value={nearbyInput}
                    onChange={(e) => setNearbyInput(e.target.value)}
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            submitNearbyInput();
                        }
                    }}
                />
                <button
                    type="button"
                    className={styles.addInputBtn}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={submitNearbyInput}
                    disabled={!nearbyInput.trim()}
                    aria-label="Add nearby place"
                    title="Add nearby place"
                >
                    <RiAddLine />
                </button>
            </div>
        </>
    );
}

function ChipField({ label, options, value, onChange, required, id }) {
    return (
        <div className={styles.field} id={id}>
            <label className={styles.fieldLabel}>
                {label} {required && <span className={styles.requiredMark}>*</span>}
            </label>
            <div className={styles.chipsRow}>
                {options.map((opt) => (
                    <button
                        type="button"
                        key={opt}
                        className={`${styles.chip} ${value === opt ? styles.chipSelected : ""}`}
                        onClick={() => onChange(opt)}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

function SelectField({ label, options, value, onChange, span }) {
    return (
        <div className={`${styles.field} ${span ? styles.fieldSpan2 : ""}`}>
            <label className={styles.fieldLabel}>{label}</label>
            <select className={styles.selectInput} value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    );
}

function TextField({ label, value, onChange, placeholder, required, suffix, id }) {
    return (
        <div className={styles.field} id={id}>
            <label className={styles.fieldLabel}>
                {label} {required && <span className={styles.requiredMark}>*</span>}
            </label>
            <div className={styles.inputWithPrefix}>
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
                />
                {suffix && <span className={styles.inputPrefixLabel}>{suffix}</span>}
            </div>
        </div>
    );
}

// Area input with a unit picker (Cent / Acre / Sq.ft …). Accepts decimals like 2.5 acre.
function AreaUnitField({ label, value, unit, onChange, onUnitChange, placeholder, required, id }) {
    const unitValue = LAND_AREA_UNITS.some((u) => u.value === unit) ? unit : DEFAULT_LAND_AREA_UNIT;
    const inputId = id ? `${id}-input` : undefined;

    const handleChange = (raw) => {
        // Digits and a single decimal point, max 2 decimal places.
        let v = raw.replace(/[^0-9.]/g, "");
        const firstDot = v.indexOf(".");
        if (firstDot !== -1) {
            v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "").slice(0, 2);
        }
        if (v.startsWith(".")) v = "0" + v;
        onChange(v);
    };

    return (
        <div className={styles.field} id={id}>
            <label className={styles.fieldLabel} htmlFor={inputId}>
                {label} {required && <span className={styles.requiredMark}>*</span>}
            </label>
            <div className={`${styles.inputWithPrefix} ${styles.inputWithUnit}`}>
                <input
                    id={inputId}
                    type="text"
                    inputMode="decimal"
                    placeholder={placeholder}
                    value={value || ""}
                    onChange={(e) => handleChange(e.target.value)}
                />
                <div className={styles.unitSelectWrap}>
                    <select
                        className={styles.unitSelect}
                        value={unitValue}
                        onChange={(e) => onUnitChange(e.target.value)}
                        aria-label={`${label} unit`}
                    >
                        {LAND_AREA_UNITS.map((u) => (
                            <option key={u.value} value={u.value}>
                                {u.label}
                            </option>
                        ))}
                    </select>
                    <RiArrowDownSLine className={styles.unitSelectIcon} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}

function StepperField({ label, value, onChange, suffix, min = 0, max = 99, required }) {
    const numValue = value === "" ? 0 : parseInt(value, 10) || 0;

    return (
        <div className={styles.field}>
            <label className={styles.fieldLabel}>
                {label} {required && <span className={styles.requiredMark}>*</span>}
            </label>
            <div className={styles.stepperControl}>
                <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => onChange(String(Math.max(min, numValue - 1)))}
                    disabled={numValue <= min}
                    aria-label={`Decrease ${label}`}
                >
                    −
                </button>
                <div className={styles.stepperValueWrap}>
                    <input
                        type="text"
                        inputMode="numeric"
                        className={styles.stepperInput}
                        value={value}
                        placeholder="0"
                        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    {suffix && <span className={styles.stepperSuffix}>{suffix}</span>}
                </div>
                <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => onChange(String(Math.min(max, numValue + 1)))}
                    disabled={numValue >= max}
                    aria-label={`Increase ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
}

function ToggleField({ title, desc, checked, onChange }) {
    return (
        <div className={styles.toggleRow}>
            <div className={styles.toggleRowInfo}>
                <span className={styles.toggleRowTitle}>{title}</span>
                {desc && <span className={styles.toggleRowDesc}>{desc}</span>}
            </div>
            <button
                type="button"
                className={`${styles.toggleSwitch} ${checked ? styles.toggleSwitchOn : ""}`}
                onClick={() => onChange(!checked)}
                aria-pressed={checked}
            >
                <span className={styles.toggleSwitchKnob} />
            </button>
        </div>
    );
}

function ResidentialFields({ details, updateDetail }) {
    return (
        <>
            <h3 className={styles.sectionTitle}>Basic Details</h3>
            <div className={styles.fieldGrid}>
                <TextField
                    id="field-builtupArea"
                    label="Built-up Area"
                    suffix="sq.ft"
                    required
                    value={details.builtupArea}
                    onChange={(v) => updateDetail("builtupArea", v)}
                />
                <AreaUnitField
                    id="field-landArea"
                    label="Land Area"
                    value={details.landArea}
                    unit={details.landAreaUnit}
                    onChange={(v) => updateDetail("landArea", v)}
                    onUnitChange={(u) => updateDetail("landAreaUnit", u)}
                />
                <SelectField
                    label="Floors"
                    options={FLOOR_OPTIONS}
                    value={details.floors}
                    onChange={(v) => updateDetail("floors", v)}
                />
                <SelectField
                    label="Property Age"
                    options={PROPERTY_AGE_OPTIONS}
                    value={details.propertyAge}
                    onChange={(v) => updateDetail("propertyAge", v)}
                />
                <SelectField
                    label="Facing"
                    options={FACING_OPTIONS}
                    value={details.facing}
                    onChange={(v) => updateDetail("facing", v)}
                />
                <SelectField
                    label="Furnishing"
                    options={FURNISHING_OPTIONS}
                    value={details.furnishing}
                    onChange={(v) => updateDetail("furnishing", v)}
                />
                <SelectField
                    label="Ownership"
                    options={OWNERSHIP_OPTIONS}
                    value={details.ownership}
                    onChange={(v) => updateDetail("ownership", v)}
                />
                <SelectField
                    label="Availability"
                    options={AVAILABILITY_OPTIONS}
                    value={details.availability}
                    onChange={(v) => updateDetail("availability", v)}
                />
                <StepperField
                    label="Car Parking"
                    suffix="slots"
                    max={20}
                    value={details.carParking}
                    onChange={(v) => updateDetail("carParking", v)}
                />
                <StepperField
                    label="Balcony"
                    suffix="count"
                    max={20}
                    value={details.balcony}
                    onChange={(v) => updateDetail("balcony", v)}
                />
                <ChipField
                    id="field-bedrooms"
                    label="Bedrooms"
                    required
                    options={ROOM_OPTIONS}
                    value={details.bedrooms}
                    onChange={(v) => updateDetail("bedrooms", v)}
                />
                <ChipField
                    id="field-bathrooms"
                    label="Bathrooms"
                    required
                    options={ROOM_OPTIONS}
                    value={details.bathrooms}
                    onChange={(v) => updateDetail("bathrooms", v)}
                />
            </div>
        </>
    );
}

function ApartmentFields({ details, updateDetail }) {
    return (
        <>
            <h3 className={styles.sectionTitle}>Apartment Details</h3>
            <div className={styles.fieldGrid}>
                <TextField
                    label="Flat Number"
                    value={details.flatNumber}
                    onChange={(v) => updateDetail("flatNumber", v)}
                />
                <TextField label="Floor" value={details.floorNumber} onChange={(v) => updateDetail("floorNumber", v)} />
                <TextField
                    label="Total Floors"
                    value={details.totalFloors}
                    onChange={(v) => updateDetail("totalFloors", v)}
                />
                <TextField
                    label="Association Fee"
                    suffix="₹/mo"
                    value={details.associationFee}
                    onChange={(v) => updateDetail("associationFee", v)}
                />
                <TextField
                    label="Maintenance Charge"
                    suffix="₹/mo"
                    value={details.maintenanceCharge}
                    onChange={(v) => updateDetail("maintenanceCharge", v)}
                />
            </div>
            <div className={styles.toggleStack} style={{ marginTop: "16px" }}>
                <ToggleField
                    title="Lift Available"
                    checked={details.hasLift}
                    onChange={(v) => updateDetail("hasLift", v)}
                />
            </div>
        </>
    );
}

function PlotFields({ details, updateDetail }) {
    return (
        <>
            <h3 className={styles.sectionTitle}>Plot Details</h3>
            <div className={styles.fieldGrid}>
                <AreaUnitField
                    id="field-plotArea"
                    label="Plot Area"
                    required
                    value={details.plotArea}
                    unit={details.landAreaUnit}
                    onChange={(v) => updateDetail("plotArea", v)}
                    onUnitChange={(u) => updateDetail("landAreaUnit", u)}
                />
                <TextField
                    label="Road Width"
                    suffix="ft"
                    value={details.roadWidth}
                    onChange={(v) => updateDetail("roadWidth", v)}
                />
                <TextField
                    label="Survey Number"
                    value={details.surveyNumber}
                    onChange={(v) => updateDetail("surveyNumber", v)}
                />
            </div>
            <div className={styles.toggleStack} style={{ marginTop: "16px" }}>
                <ToggleField
                    title="Boundary Wall"
                    checked={details.boundaryWall}
                    onChange={(v) => updateDetail("boundaryWall", v)}
                />
                <ToggleField
                    title="Water Connection"
                    checked={details.waterConnection}
                    onChange={(v) => updateDetail("waterConnection", v)}
                />
                <ToggleField
                    title="Electricity Connection"
                    checked={details.electricity}
                    onChange={(v) => updateDetail("electricity", v)}
                />
                <ToggleField
                    title="Corner Plot"
                    checked={details.cornerPlot}
                    onChange={(v) => updateDetail("cornerPlot", v)}
                />
            </div>
        </>
    );
}

function CommercialFields({ details, updateDetail }) {
    return (
        <>
            <h3 className={styles.sectionTitle}>Commercial Details</h3>
            <div className={styles.field} id="field-commercialSubType" style={{ marginBottom: "18px" }}>
                <label className={styles.fieldLabel}>
                    Space Type <span className={styles.requiredMark}>*</span>
                </label>
                <div className={styles.chipsRow}>
                    {COMMERCIAL_SUBTYPES.map((opt) => (
                        <button
                            type="button"
                            key={opt}
                            className={`${styles.chip} ${details.commercialSubType === opt ? styles.chipSelected : ""}`}
                            onClick={() => updateDetail("commercialSubType", opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
            <div className={styles.fieldGrid}>
                <TextField
                    id="field-builtupArea"
                    label="Built-up Area"
                    suffix="sq.ft"
                    required
                    value={details.builtupArea}
                    onChange={(v) => updateDetail("builtupArea", v)}
                />
                <SelectField
                    label="Floors"
                    options={FLOOR_OPTIONS}
                    value={details.floors}
                    onChange={(v) => updateDetail("floors", v)}
                />
                <SelectField
                    label="Property Age"
                    options={PROPERTY_AGE_OPTIONS}
                    value={details.propertyAge}
                    onChange={(v) => updateDetail("propertyAge", v)}
                />
                <SelectField
                    label="Ownership"
                    options={OWNERSHIP_OPTIONS}
                    value={details.ownership}
                    onChange={(v) => updateDetail("ownership", v)}
                />
                <SelectField
                    label="Availability"
                    options={AVAILABILITY_OPTIONS}
                    value={details.availability}
                    onChange={(v) => updateDetail("availability", v)}
                />
            </div>
        </>
    );
}
