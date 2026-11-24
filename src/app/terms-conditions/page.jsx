"use client";

import Link from "next/link";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./termsCondition.module.css";
import { RiShieldCheckLine, RiInformationFill } from "react-icons/ri";

export default function TermsConditionPage() {
    return (
        <div className={styles.pageWrapper}>
            <Nav />

            <main className={styles.mainContent}>
                <div className={styles.container}>
                    {/* Breadcrumb section */}
                    <div className={styles.breadcrumbs}>
                        <Link href="/">Home</Link>
                        <span className={styles.separator}>&gt;</span>
                        <span className={styles.current}>Terms &amp; Conditions</span>
                    </div>

                    {/* Page Header */}
                    <h1 className={styles.pageTitle}>Terms &amp; Conditions</h1>
                    <p className={styles.lastUpdated}>Last Updated: May 16, 2025</p>

                    <p className={styles.introParagraph}>
                        Welcome to KeralaPlots ("we", "our", or "us"). These Terms &amp; Conditions govern your access to and
                        use of our website (<strong>www.keralaplots.com</strong>) and all related services provided by KeralaPlots. By
                        accessing or using our platform, you agree to be bound by these Terms &amp; Conditions.
                    </p>

                    {/* Important Disclaimer box */}
                    <div className={styles.disclaimerBox}>
                        <div className={styles.disclaimerIconBox}>
                            <RiShieldCheckLine />
                        </div>
                        <div className={styles.disclaimerContent}>
                            <h2 className={styles.disclaimerTitle}>Important Disclaimer</h2>
                            <p className={styles.disclaimerBody}>
                                KeralaPlots is an online platform that connects users with property listings, agents, builders,
                                and service providers. We act solely as an intermediary platform and do not own, buy, sell,
                                rent, lease, or deal in any properties or services.
                            </p>
                            <p className={styles.disclaimerBold}>
                                KeralaPlots will not be responsible or liable for any transactions, dealings, disputes, losses,
                                or damages related to properties, services, agents, or any third parties.
                            </p>
                        </div>
                    </div>

                    {/* 2-Column Grid of Sections */}
                    <div className={styles.termsGrid}>
                        {/* Section 1 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>1. No Responsibility for Property Transactions</h3>
                            <p className={styles.sectionIntro}>
                                KeralaPlots is not a party to any agreement or transaction between users and does not:
                            </p>
                            <ul className={styles.sectionList}>
                                <li>Sell, buy, rent, lease, or exchange any properties.</li>
                                <li>Verify the accuracy, legality, or authenticity of any property listing.</li>
                                <li>Guarantee the title, ownership, or availability of any property.</li>
                                <li>Participate in or control any negotiations or transactions.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                All property-related decisions, transactions, and agreements are strictly between the user and the respective property owner, agent, builder, or seller.
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>2. No Responsibility for Services</h3>
                            <p className={styles.sectionIntro}>
                                KeralaPlots does not provide, guarantee, or take responsibility for any services listed on the platform, including but not limited to:
                            </p>
                            <ul className={styles.sectionList}>
                                <li>Legal services</li>
                                <li>Home loans and financing</li>
                                <li>Interior designing and construction</li>
                                <li>Property management</li>
                                <li>Documentation and registration services</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                We are not responsible for the quality, accuracy, timeliness, legality, or outcomes of any services you obtain through third parties.
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>3. No Responsibility for Agents and Third Parties</h3>
                            <p className={styles.sectionIntro}>KeralaPlots does not:</p>
                            <ul className={styles.sectionList}>
                                <li>Employ, manage, or control any agents, brokers, builders, or service providers listed on the platform.</li>
                                <li>Verify the identity, credibility, or background of any agent or third party.</li>
                                <li>Ensure the performance, conduct, or reliability of any agent or third party.</li>
                                <li>Guarantee any offers, commitments, or representations made by agents, builders, or service providers.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                Any dealings or communications with agents or third parties are at your own risk.
                            </div>
                        </div>

                        {/* Section 4 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>4. User Responsibility</h3>
                            <p className={styles.sectionIntro}>By using KeralaPlots, you agree that:</p>
                            <ul className={styles.sectionList}>
                                <li>You will verify all property details, documents, and information independently.</li>
                                <li>You will conduct your own due diligence before entering into any transaction or agreement.</li>
                                <li>You will not hold KeralaPlots responsible for any actions, omissions, or misrepresentations by other users or third parties.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                Your use of the platform is at your sole risk and discretion.
                            </div>
                        </div>

                        {/* Section 5 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>5. No Legal or Financial Responsibility</h3>
                            <p className={styles.sectionIntro}>KeralaPlots will not be liable for:</p>
                            <ul className={styles.sectionList}>
                                <li>Any financial loss, fraud, or damages resulting from property transactions.</li>
                                <li>Any legal disputes between buyers, sellers, agents, or third parties.</li>
                                <li>Any delays, defaults, or failures in services provided by listed parties.</li>
                                <li>Any incorrect, outdated, or incomplete information on the platform.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                Users are advised to verify all information and documents independently and consult legal or financial professionals before making any decisions.
                            </div>
                        </div>

                        {/* Section 6 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>6. Changes to Terms</h3>
                            <p className={styles.sectionBodyText}>
                                KeralaPlots reserves the right to modify, update, or change these Terms &amp; Conditions at any time without prior notice. Continued use of the platform after such changes constitutes your acceptance of the updated terms.
                            </p>
                            <div className={styles.highlightNote}>
                                We encourage you to review this page periodically.
                            </div>
                        </div>

                        {/* Section 7 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>7. Limitation of Liability</h3>
                            <p className={styles.sectionIntro}>
                                To the maximum extent permitted by law, KeralaPlots, its directors, employees, and partners shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of or related to:
                            </p>
                            <ul className={styles.sectionList}>
                                <li>The use or inability to use our platform.</li>
                                <li>Any transactions or dealings between users and third parties.</li>
                                <li>Any loss of data, profits, or opportunities.</li>
                            </ul>
                            <div className={styles.highlightNote}>
                                You agree to indemnify and hold KeralaPlots harmless from any claims, losses, or damages arising from your use of the platform.
                            </div>
                        </div>

                        {/* Section 8 */}
                        <div className={styles.termsCol}>
                            <h3 className={styles.sectionTitle}>8. Governing Law &amp; Jurisdiction</h3>
                            <p className={styles.sectionBodyText}>
                                These Terms &amp; Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the courts in Ernakulam, Kerala.
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
                                KeralaPlots is only a platform that provides information and connections, and we do not take any responsibility for property transactions, services, agents, or any third parties.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
