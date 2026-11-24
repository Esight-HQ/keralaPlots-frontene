"use client";

import styles from "../postProperty.module.css";
import { LISTING_TYPES } from "../postPropertyData";
import { RiCheckLine } from "react-icons/ri";

export default function Step1ListingType({ formData, setFormData, onSelect }) {
    const selectListingType = (id) => {
        setFormData((prev) => ({ ...prev, listingType: id }));
        if (onSelect) onSelect(id);
    };

    return (
        <>
            <h2 className={styles.stepHeadline}>What do you want to do?</h2>
            <p className={styles.stepSubtext}>Choose how you&apos;d like to list this property.</p>

            <div className={styles.selectCardGrid} id="field-listingType">
                {LISTING_TYPES.map((type) => {
                    const selected = formData.listingType === type.id;
                    return (
                        <button
                            type="button"
                            key={type.id}
                            className={`${styles.selectCard} ${selected ? styles.selectCardSelected : ""}`}
                            onClick={() => selectListingType(type.id)}
                        >
                            {selected && (
                                <span className={styles.selectCardCheck}>
                                    <RiCheckLine />
                                </span>
                            )}
                            <span className={styles.selectCardEmoji}>{type.emoji}</span>
                            <span className={styles.selectCardLabel}>{type.label}</span>
                            <span className={styles.selectCardDesc}>{type.desc}</span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
