"use client";

import styles from "./addedProperties.module.css";
import { PROPERTY_TYPES, STATUSES } from "./addedPropertiesData";

/* Split out of AddedProperties.jsx so it loads as its own chunk, only when needed. */
export default function AddedPropertyEditModal({
    editValid,
    editing,
    saveEdit,
    setEditing,
}) {
    return (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label="Edit listing details"
            onClick={() => setEditing(null)}
        >
            <form
                className={`${styles.dialog} ${styles.editDialog}`}
                onClick={(e) => e.stopPropagation()}
                onSubmit={saveEdit}
            >
                <h2 className={styles.dialogTitle}>Edit listing details</h2>
                <p className={styles.dialogDesc}>
                    Update what buyers see on this listing. Photos and specs stay as posted.
                </p>
        
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>Property title</span>
                    <input
                        className={styles.fieldInput}
                        value={editing.title}
                        onChange={(e) => setEditing((v) => ({ ...v, title: e.target.value }))}
                        autoFocus
                    />
                </label>
        
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>Location</span>
                    <input
                        className={styles.fieldInput}
                        value={editing.location}
                        onChange={(e) => setEditing((v) => ({ ...v, location: e.target.value }))}
                    />
                </label>
        
                <div className={styles.fieldRow}>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Price (₹)</span>
                        <input
                            type="number"
                            min="1"
                            className={styles.fieldInput}
                            value={editing.priceNum}
                            onChange={(e) => setEditing((v) => ({ ...v, priceNum: e.target.value }))}
                        />
                    </label>
        
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Property type</span>
                        <select
                            className={styles.fieldInput}
                            value={editing.type}
                            onChange={(e) => setEditing((v) => ({ ...v, type: e.target.value }))}
                        >
                            {PROPERTY_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </label>
                </div>
        
                <div className={styles.fieldRow}>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Status</span>
                        <select
                            className={styles.fieldInput}
                            value={editing.status}
                            onChange={(e) => setEditing((v) => ({ ...v, status: e.target.value }))}
                        >
                            {STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </label>
        
                    <label className={`${styles.field} ${styles.fieldCheck}`}>
                        <input
                            type="checkbox"
                            checked={editing.perMonth}
                            onChange={(e) => setEditing((v) => ({ ...v, perMonth: e.target.checked }))}
                        />
                        <span>Price is per month</span>
                    </label>
                </div>
        
                <div className={styles.dialogActions}>
                    <button type="button" className={styles.dialogCancel} onClick={() => setEditing(null)}>
                        Cancel
                    </button>
                    <button type="submit" className={styles.dialogSave} disabled={!editValid}>
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
