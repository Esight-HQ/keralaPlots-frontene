"use client";

import styles from "../postProperty.module.css";
import { RiLightbulbFlashLine } from "react-icons/ri";

const PRICE_TYPES = [
    { id: "total", label: "Total Price" },
    { id: "per_cent", label: "Per Cent" },
    { id: "per_sqft", label: "Per Sq.ft" },
];

// Toy price-band estimator standing in for a real market-data-backed AI
// suggestion — scales a base rate by area and a per-property-type multiplier.
// It's a rough demo heuristic, not a real valuation.
function estimateRange(formData) {
    const area = parseFloat(formData.details.builtupArea || formData.details.plotArea || formData.details.landArea);
    if (!area || area <= 0) return null;

    const baseRatePerSqft = { house: 4200, apartment: 4800, villa: 5600, plot: 2600, commercial: 6000, office: 5200, warehouse: 2200, hotel: 5800, other: 3500 };
    const rate = baseRatePerSqft[formData.propertyType] || 4000;
    const estimate = area * rate;
    const low = Math.round((estimate * 0.9) / 100000) * 100000;
    const high = Math.round((estimate * 1.1) / 100000) * 100000;

    const fmt = (n) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : `₹${(n / 100000).toFixed(1)} L`);
    return `${fmt(low)} – ${fmt(high)}`;
}

// Renders the typed figure in the lakh/crore units Indian buyers actually
// read prices in, so a long string of digits is easy to sanity-check.
function amountInWords(amount) {
    const n = parseFloat(amount);
    if (!n) return "";
    if (n >= 10000000) return `${(n / 10000000).toFixed(2).replace(/\.00$/, "")} Crore`;
    if (n >= 100000) return `${(n / 100000).toFixed(2).replace(/\.00$/, "")} Lakh`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} Thousand`;
    return "";
}

export default function Step5Price({ formData, setFormData }) {
    const { price } = formData;

    const updatePrice = (field, value) => {
        setFormData((prev) => ({ ...prev, price: { ...prev.price, [field]: value } }));
    };

    const estimatedRange = estimateRange(formData);

    return (
        <>
            <h2 className={styles.stepHeadline}>Set your expected price</h2>
            <p className={styles.stepSubtext}>Buyers filter by price first — an accurate figure gets more genuine enquiries.</p>

            <div className={styles.priceInputWrap} id="field-price">
                <span className={styles.priceCurrencySymbol}>₹</span>
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={price.amount ? Number(price.amount).toLocaleString("en-IN") : ""}
                    onChange={(e) => updatePrice("amount", e.target.value.replace(/[^0-9]/g, ""))}
                />
                {price.amount && <span className={styles.priceInWords}>{amountInWords(price.amount)}</span>}
            </div>

            <div className={styles.priceTypeRow}>
                {PRICE_TYPES.map((opt) => {
                    const selected = price.priceType === opt.id;
                    return (
                        <button
                            type="button"
                            key={opt.id}
                            className={`${styles.priceTypeOption} ${selected ? styles.priceTypeOptionSelected : ""}`}
                            onClick={() => updatePrice("priceType", opt.id)}
                        >
                            <span className={styles.priceRadioDot}>{selected && <span className={styles.priceRadioDotInner} />}</span>
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            <div className={styles.toggleStack}>
                <div className={styles.toggleRow}>
                    <div className={styles.toggleRowInfo}>
                        <span className={styles.toggleRowTitle}>Negotiable</span>
                        <span className={styles.toggleRowDesc}>Let buyers know there&apos;s room to negotiate.</span>
                    </div>
                    <button
                        type="button"
                        className={`${styles.toggleSwitch} ${price.negotiable ? styles.toggleSwitchOn : ""}`}
                        onClick={() => updatePrice("negotiable", !price.negotiable)}
                        aria-pressed={price.negotiable}
                    >
                        <span className={styles.toggleSwitchKnob} />
                    </button>
                </div>
                <div className={styles.toggleRow}>
                    <div className={styles.toggleRowInfo}>
                        <span className={styles.toggleRowTitle}>Loan Available</span>
                        <span className={styles.toggleRowDesc}>Show that home loan assistance is possible.</span>
                    </div>
                    <button
                        type="button"
                        className={`${styles.toggleSwitch} ${price.loanAvailable ? styles.toggleSwitchOn : ""}`}
                        onClick={() => updatePrice("loanAvailable", !price.loanAvailable)}
                        aria-pressed={price.loanAvailable}
                    >
                        <span className={styles.toggleSwitchKnob} />
                    </button>
                </div>
            </div>

            {estimatedRange && (
                <div className={styles.insightCard}>
                    <div className={styles.insightCardHeader}>
                        <RiLightbulbFlashLine /> AI Price Insight
                    </div>
                    <div className={styles.insightRange}>{estimatedRange}</div>
                    <p className={styles.insightNote}>
                        Based on similar {formData.propertyType || "properties"} listed nearby. This is a rough demo estimate,
                        not a formal valuation.
                    </p>
                </div>
            )}
        </>
    );
}
