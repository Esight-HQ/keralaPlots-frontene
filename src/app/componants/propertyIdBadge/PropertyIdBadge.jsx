import { getPropertyCode } from "../../lib/propertyCode";
import styles from "./propertyIdBadge.module.css";

/* Small "ID: KP822" badge used on every property card.
   Pass either the property object or a ready-made `code`. */
export default function PropertyIdBadge({ property, code, className = "" }) {
    const value = code || getPropertyCode(property);
    if (!value) return null;

    return (
        <span className={`${styles.badge} ${className}`} title={`Property ID ${value}`}>
            ID: {value}
        </span>
    );
}

/* Lays the "added on" date badge and the ID badge out on one line. */
export function PropertyBadgeRow({ children, className = "", style }) {
    return (
        <div className={`${styles.row} ${className}`} style={style}>
            {children}
        </div>
    );
}
