"use client";

import styles from "../postProperty.module.css";
import { PROPERTY_TYPES } from "../postPropertyData";
import { RiCheckLine } from "react-icons/ri";

export default function Step2PropertyType({ formData, setFormData, onSelect }) {
    const selectPropertyType = (id) => {
        setFormData((prev) => ({ ...prev, propertyType: id }));
        if (onSelect) onSelect(id);
    };

    return (
        <>
            <h2 className={styles.stepHeadline}>Choose Property Type</h2>
            <p className={styles.stepSubtext}>This helps us show you the right details to fill in next.</p>

            <div className={`${styles.selectCardGrid} ${styles.selectCardGrid2Col}`} id="field-propertyType">
                {PROPERTY_TYPES.map((type) => {
                    const selected = formData.propertyType === type.id;
                    return (
                        <button
                            type="button"
                            key={type.id}
                            className={`${styles.selectCard} ${selected ? styles.selectCardSelected : ""}`}
                            onClick={() => selectPropertyType(type.id)}
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
