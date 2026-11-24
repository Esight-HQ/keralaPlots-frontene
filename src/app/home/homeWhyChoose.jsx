"use client";

import styles from "./homeWhyChoose.module.css";

export default function HomeWhyChoose() {
    return (
        <section className={styles.whyChooseSection}>
            <div className={styles.container}>
                <div className={styles.mainCard}>
                    {/* Left Column: Title, Feature 1 & Skyline Illustration */}
                    <div className={styles.leftSection}>
                        <div>
                            <h2 className={styles.mainTitle}>Why Choose Keralaplots?</h2>

                            {/* Feature 1: Verified Listings */}
                            <div className={styles.leftFeature}>
                                <div className={styles.featureIcon}>
                                    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M24 6L8 12V22C8 32 15 40 24 44C33 40 40 32 40 22V12L24 6Z" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M17 22L22 27L31 17" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className={styles.featureTitle}>Verified Listings</h3>
                                    <p className={styles.featureDesc}>100% verified properties with authenticity check</p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Left Skyline Line Art SVG */}
                        <div className={styles.skylineIllustration}>
                            <svg width="220" height="70" viewBox="0 0 220 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* Low-rise building left */}
                                <path d="M2 68H45V48C45 46.8954 44.1046 46 43 46H22L10 60H2Z" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
                                <line x1="2" y1="68" x2="218" y2="68" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
                                {/* Building 2 */}
                                <rect x="50" y="38" width="22" height="30" rx="2" stroke="#60a5fa" strokeWidth="1.5" />
                                <line x1="56" y1="44" x2="66" y2="44" stroke="#60a5fa" strokeWidth="1" />
                                <line x1="56" y1="50" x2="66" y2="50" stroke="#60a5fa" strokeWidth="1" />
                                <line x1="56" y1="56" x2="66" y2="56" stroke="#60a5fa" strokeWidth="1" />
                                {/* Skyscraper 3 */}
                                <path d="M78 68V20L92 8L106 20V68H78Z" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
                                <line x1="92" y1="8" x2="92" y2="68" stroke="#60a5fa" strokeWidth="1" />
                                {/* Skyscraper 4 Tallest */}
                                <path d="M112 68V12L132 2L152 12V68H112Z" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
                                <line x1="132" y1="2" x2="132" y2="68" stroke="#60a5fa" strokeWidth="1" />
                                {/* Building 5 */}
                                <rect x="158" y="24" width="24" height="44" rx="2" stroke="#60a5fa" strokeWidth="1.5" />
                                <line x1="164" y1="32" x2="176" y2="32" stroke="#60a5fa" strokeWidth="1" />
                                <line x1="164" y1="42" x2="176" y2="42" stroke="#60a5fa" strokeWidth="1" />
                                <line x1="164" y1="52" x2="176" y2="52" stroke="#60a5fa" strokeWidth="1" />
                                {/* Building 6 Right */}
                                <rect x="188" y="32" width="24" height="36" rx="2" stroke="#60a5fa" strokeWidth="1.5" />
                                <line x1="194" y1="40" x2="206" y2="40" stroke="#60a5fa" strokeWidth="1" />
                                <line x1="194" y1="50" x2="206" y2="50" stroke="#60a5fa" strokeWidth="1" />
                            </svg>
                        </div>
                    </div>

                    {/* Right Column: 3 Top Features, Divider line, 4 Stats */}
                    <div className={styles.rightSection}>
                        {/* Top Features Row */}
                        <div className={styles.featuresGrid}>
                            {/* Feature 2: AI Powered Search */}
                            <div className={styles.topFeature}>
                                <div className={styles.featureIcon}>
                                    <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M24 6C16.268 6 10 12.268 10 20C10 24.8 12.4 29 16 31.5V36C16 37.1046 16.8954 38 18 38H30C31.1046 38 32 37.1046 32 36V31.5C35.6 29 38 24.8 38 20C38 12.268 31.732 6 24 6Z" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M20 42H28" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M24 2V4" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M6 20H8" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M40 20H42" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M11 7L13 9" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M37 7L35 9" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className={styles.featureTitle}>AI Powered Search</h3>
                                    <p className={styles.featureDesc}>Smart recommendations that save your time</p>
                                </div>
                            </div>

                            {/* Feature 3: Expert Support */}
                            <div className={styles.topFeature}>
                                <div className={styles.featureIcon}>
                                    <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 20C23.3137 20 26 17.3137 26 14C26 10.6863 23.3137 8 20 8C16.6863 8 14 10.6863 14 14C14 17.3137 16.6863 20 20 20Z" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M8 38V34C8 30.6863 10.6863 28 14 28H26C29.3137 28 32 30.6863 32 34V38" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M30 10C32.7614 10 35 12.2386 35 15C35 17.7614 32.7614 20 30 20" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M36 28C38.7614 28 41 30.2386 41 33V36" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className={styles.featureTitle}>Expert Support</h3>
                                    <p className={styles.featureDesc}>Get guidance from real estate professionals</p>
                                </div>
                            </div>

                            {/* Feature 4: Secure & Transparent */}
                            <div className={styles.topFeature}>
                                <div className={styles.featureIcon}>
                                    <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="10" y="8" width="28" height="32" rx="4" stroke="#0b132b" strokeWidth="2.5" strokeLinejoin="round" />
                                        <path d="M18 16H30" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M18 24H30" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M18 32H24" stroke="#0b132b" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d="M24 16V32" stroke="#0b132b" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className={styles.featureTitle}>Secure & Transparent</h3>
                                    <p className={styles.featureDesc}>Transparent deals with secure transactions</p>
                                </div>
                            </div>
                        </div>

                        {/* Horizontal Divider Line */}
                        {/* <div className={styles.divider} /> */}

                        {/* Bottom Stats Row */}
                        {/* <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <span className={styles.statNumber}>25K+</span>
                                <span className={styles.statLabel}>Properties Listed</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statNumber}>18K+</span>
                                <span className={styles.statLabel}>Happy Customers</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statNumber}>1K+</span>
                                <span className={styles.statLabel}>Verified Agents</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statNumber}>50+</span>
                                <span className={styles.statLabel}>Cities Covered</span>
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>
        </section>
    );
}
