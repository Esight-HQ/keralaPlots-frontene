"use client";

import Link from "next/link";
import styles from "../profile.module.css";

/* Not built yet, and says so plainly rather than showing an empty pane. */
export default function HelpPage() {
    return (
        <div className={styles.placeholder}>
            <h1 className={styles.pageTitle}>Help &amp; Support</h1>
            <p className={styles.pageSub}>Reach the Keralaplots team for anything you need.</p>
            <p className={styles.placeholderNote}>This section isn&rsquo;t built yet.</p>
            <Link href="tel:+919496187119" className={styles.placeholderBtn}>
                Contact support
            </Link>
        </div>
    );
}
