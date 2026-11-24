"use client";

import Link from "next/link";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./privacyPolicy.module.css";
import { RiLockPasswordLine, RiInformationFill } from "react-icons/ri";

export default function PrivacyPolicyPage() {
    return (
        <div className={styles.pageWrapper}>
            <Nav />

            <main className={styles.mainContent}>
                <div className={styles.container}>
                    {/* Breadcrumb section */}
                    <div className={styles.breadcrumbs}>
                        <Link href="/">Home</Link>
                        <span className={styles.separator}>&gt;</span>
                        <span className={styles.current}>Privacy Policy</span>
                    </div>

                    {/* Page Header */}
                    <h1 className={styles.pageTitle}>Privacy Policy</h1>
                    <p className={styles.lastUpdated}>Last Updated: May 16, 2025</p>

                    <p className={styles.introParagraph}>
                        Welcome to KeralaPlots. We value your privacy and are committed to protecting your personal data. 
                        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
                        visit our website (<strong>www.keralaplots.com</strong>) and use our related real estate services.
                    </p>

                    {/* Key Privacy Commitments box */}
                    <div className={styles.privacyCommitBox}>
                        <div className={styles.privacyIconBox}>
                            <RiLockPasswordLine />
                        </div>
                        <div className={styles.privacyContent}>
                            <h2 className={styles.privacyCommitTitle}>Our Commitment to You</h2>
                            <p className={styles.privacyCommitBody}>
                                We do not sell your personal data to third parties. We only share information with registered 
                                agents, builders, and service providers that you explicitly choose to connect with. We implement 
                                strict security measures to protect your account data.
                            </p>
                        </div>
                    </div>

                    {/* 2-Column Grid of Sections */}
                    <div className={styles.termsGrid}>
                        {/* Section 1 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>1. Information We Collect</h3>
                            <p className={styles.sectionIntro}>
                                We collect various types of information to provide and improve our services, including:
                            </p>
                            <ul className={styles.sectionList}>
                                <li><strong>Personal details</strong>: Name, email address, phone number, and location.</li>
                                <li><strong>Property preferences</strong>: Search queries, viewed listings, and contact requests.</li>
                                <li><strong>Verification documents</strong>: Profile photos, agency credentials, and ID documents (for agents/providers).</li>
                                <li><strong>Technical data</strong>: IP address, browser type, device information, and activity logs.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                All personal information you provide must be accurate, complete, and up to date.
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>2. How We Use Your Information</h3>
                            <p className={styles.sectionIntro}>
                                Your personal information is processed to ensure a smooth transactional experience:
                            </p>
                            <ul className={styles.sectionList}>
                                <li>To connect you with property owners, agents, builders, or service providers.</li>
                                <li>To personalize search results and recommend relevant properties in Kerala.</li>
                                <li>To verify identities, prevent fraud, and maintain platform security.</li>
                                <li>To send transactional emails, push notifications, and administrative updates.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                We only process your data for legitimate business and transactional purposes.
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>3. Sharing of Information</h3>
                            <p className={styles.sectionIntro}>We do not rent or sell your details, but we may share data:</p>
                            <ul className={styles.sectionList}>
                                <li>With other users (when you contact property owners or express interest).</li>
                                <li>With registered agents, builders, or service providers to fulfill request queries.</li>
                                <li>With law enforcement or legal authorities if required for compliance and safety.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                We never share your contact details publicly without your explicit consent.
                            </div>
                        </div>

                        {/* Section 4 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>4. Data Storage and Security</h3>
                            <p className={styles.sectionIntro}>We implement secure measures to safeguard your information:</p>
                            <ul className={styles.sectionList}>
                                <li>Encrypted databases with SSL/TLS protocols for data transmission.</li>
                                <li>Strict internal access controls limiting database permissions.</li>
                                <li>Routine security audits to prevent data breaches and hacking attempts.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                While we employ standard security, no method of transmission is 100% secure.
                            </div>
                        </div>

                        {/* Section 5 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>5. Your Privacy Rights</h3>
                            <p className={styles.sectionIntro}>You have complete control over your personal data:</p>
                            <ul className={styles.sectionList}>
                                <li>Right to access, edit, or update your profile details at any time.</li>
                                <li>Right to request the deletion of your account and search history.</li>
                                <li>Right to opt out of promotional messages and email newsletters.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                You can manage these settings directly inside your Account Settings panel.
                            </div>
                        </div>

                        {/* Section 6 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>6. Cookies and Tracking</h3>
                            <p className={styles.sectionBodyText}>
                                We use cookies and similar technologies to track platform activity, remember your sessions, 
                                and analyze web traffic trends. You can disable cookies in your browser settings, though some 
                                features of the platform may cease to function correctly.
                            </p>
                            <div className={styles.highlightNote}>
                                By continuing to use our website, you consent to our cookie policy guidelines.
                            </div>
                        </div>

                        {/* Section 7 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>7. Third-Party Links</h3>
                            <p className={styles.sectionBodyText}>
                                Our platform contains links to external sites (such as home loan banks or advertiser partners). 
                                We are not responsible for their independent privacy practices, and we advise you to review 
                                their policies before sharing personal data.
                            </p>
                        </div>

                        {/* Section 8 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>8. Changes and Updates</h3>
                            <p className={styles.sectionBodyText}>
                                We may update this Privacy Policy from time to time to reflect changes in our practices or laws. 
                                We will post updates on this page and revise the "Last Updated" date at the top.
                            </p>
                        </div>
                    </div>

                    {/* Bottom Info Alert box */}
                    <div className={styles.bottomAlertBox}>
                        <div className={styles.bottomAlertIcon}>
                            <RiInformationFill />
                        </div>
                        <div className={styles.bottomAlertContent}>
                            <h4 className={styles.bottomAlertTitle}>By using KeralaPlots, you acknowledge and agree that:</h4>
                            <p className={styles.bottomAlertBody}>
                                You consent to the collection, use, and sharing of your information as outlined in this Privacy Policy. 
                                If you do not agree with these policies, please discontinue using the platform.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
