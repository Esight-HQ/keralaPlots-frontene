"use client";

import Link from "next/link";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./aboutUs.module.css";
import {
    RiArrowRightLine,
    RiBookOpenLine,
    RiHome4Line,
    RiTeamLine,
    RiSearchLine,
    RiCustomerServiceLine,
    RiCheckboxCircleLine,
    RiEyeLine,
    RiCompass3Line,
    RiShieldCheckLine,
    RiMapPinLine
} from "react-icons/ri";

export default function AboutUsPage() {
    return (
        <div className={styles.pageWrapper}>
            <Nav />

            <main className={styles.mainContent}>

                {/* Hero Section */}
                <section className={styles.heroSection}>

                    <div className={styles.heroRight}>
                        <img
                            src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ed4c563b-293f-49fb-42fc-1bdeaa055d00/public"
                            alt="Kerala Perfect House"
                            className={styles.heroImage}
                        />
                    </div>
                    <div className={styles.heroContainer}>
                        <div className={styles.heroLeft}>
                            <span className={styles.heroBadge}>ABOUT KERALAPLOTS</span>
                            <h1 className={styles.heroTitle}>
                                Find Your Perfect Property<br />
                                with <span className={styles.blueText}>Confidence</span>
                            </h1>
                            <p className={styles.heroSubtitle}>
                                Keralaplots.com is Kerala's trusted real estate platform that connects buyers, sellers, property owners, builders, and verified agents. Our mission is to simplify property transactions through verified listings, transparent communication, and a seamless digital experience across Kerala.
                            </p>
                            <Link href="/properties" className={styles.heroBtn}>
                                <span>Explore Properties</span>
                                <RiArrowRightLine />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Our Story Section */}
                <section className={styles.storySection}>
                    <div className={styles.storyContainer}>
                        <div className={styles.storyLeft}>
                            <div className={styles.storyImageFrame}>
                                <img loading="lazy" decoding="async"
                                    src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/80af4bf0-14b9-4fbe-9655-dfe4ac7b3100/public"
                                    alt="Cozy Interior Story"
                                    className={styles.storyImage}
                                />
                                <div className={styles.storyBadgeOverlay}>
                                    <RiBookOpenLine />
                                    <span>Our Story</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.storyRight}>
                            <span className={styles.storyBadge}>OUR STORY</span>
                            <h2 className={styles.storyTitle}>Building Kerala's Trusted Property Platform</h2>
                            <p className={styles.storyParagraph}>
                                KeralaPlots was created to make buying, selling, and renting properties easier for everyone. Whether you're searching for a dream home, residential plot, commercial property, or investment opportunity, our platform helps you connect directly with genuine property owners and trusted real estate professionals.
                            </p>
                            <p className={styles.storyParagraph}>
                                From Kochi and Trivandrum to Thrissur, Kozhikode, Kannur, and every district in Kerala, we help people discover the right property with confidence.
                            </p>
                        </div>
                    </div>
                </section>

                {/* What We Offer Section */}
                <section className={styles.offerSection}>
                    <div className={styles.container}>
                        <span className={styles.heroTitle}>What We Offer</span>
                        <div className={styles.offerGrid}>
                            {/* Card 1 */}
                            <div className={styles.offerCard}>
                                <div className={styles.offerIconCircle}>
                                    <RiHome4Line />
                                </div>
                                <h3 className={styles.offerCardTitle}>Verified Property Listings</h3>
                                <ul className={styles.offerList}>
                                    <li><RiCheckboxCircleLine /><span>Residential</span></li>
                                    <li><RiCheckboxCircleLine /><span>Commercial</span></li>
                                    <li><RiCheckboxCircleLine /><span>Villas</span></li>
                                    <li><RiCheckboxCircleLine /><span>Apartments</span></li>
                                    <li><RiCheckboxCircleLine /><span>Plots &amp; Land</span></li>
                                </ul>
                            </div>

                            {/* Card 2 */}
                            <div className={styles.offerCard}>
                                <div className={styles.offerIconCircle}>
                                    <RiTeamLine />
                                </div>
                                <h3 className={styles.offerCardTitle}>Verified Agents</h3>
                                <ul className={styles.offerList}>
                                    <li><RiCheckboxCircleLine /><span>Trusted professionals</span></li>
                                    <li><RiCheckboxCircleLine /><span>Direct communication</span></li>
                                    <li><RiCheckboxCircleLine /><span>Expert guidance</span></li>
                                </ul>
                            </div>

                            {/* Card 3 */}
                            <div className={styles.offerCard}>
                                <div className={styles.offerIconCircle}>
                                    <RiSearchLine />
                                </div>
                                <h3 className={styles.offerCardTitle}>Smart Property Search</h3>
                                <ul className={styles.offerList}>
                                    <li><RiCheckboxCircleLine /><span>AI-powered search</span></li>
                                    <li><RiCheckboxCircleLine /><span>Advanced filters</span></li>
                                    <li><RiCheckboxCircleLine /><span>Location-based discovery</span></li>
                                </ul>
                            </div>

                            {/* Card 4 */}
                            <div className={styles.offerCard}>
                                <div className={styles.offerIconCircle}>
                                    <RiCustomerServiceLine />
                                </div>
                                <h3 className={styles.offerCardTitle}>Complete Support</h3>
                                <ul className={styles.offerList}>
                                    <li><RiCheckboxCircleLine /><span>Buying assistance</span></li>
                                    <li><RiCheckboxCircleLine /><span>Selling guidance</span></li>
                                    <li><RiCheckboxCircleLine /><span>Rental support</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Why Choose & Vision/Mission Split Row */}
                <section className={styles.splitSection}>
                    <div className={styles.container}>
                        <div className={styles.splitGrid}>
                            {/* Left Box: Why Choose */}
                            <div className={styles.whyChooseCard}>
                                <h3 className={styles.heroTitle} style={{ color: 'white' }}>Why Choose Keralaplots?</h3>
                                <ul className={styles.whyList}>
                                    <li><RiCheckboxCircleLine /><span>Verified Listings</span></li>
                                    <li><RiCheckboxCircleLine /><span>Trusted Agents</span></li>
                                    <li><RiCheckboxCircleLine /><span>AI-Powered Property Search</span></li>
                                    <li><RiCheckboxCircleLine /><span>Secure &amp; Transparent Transactions</span></li>
                                    <li><RiCheckboxCircleLine /><span>Easy Property Management</span></li>
                                    <li><RiCheckboxCircleLine /><span>Kerala-wide Coverage</span></li>
                                </ul>
                                {/* Subtle house graphic in bottom-right */}
                                <div className={styles.whyHouseGraphic}>
                                    <svg viewBox="0 0 100 100" className={styles.wireHouseSvg}>
                                        <path d="M10 90 L50 20 L90 90 Z" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                                        <path d="M30 90 L30 50 L70 50 L70 90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                                        <path d="M50 50 L50 90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Right Stack: Vision & Mission */}
                            <div className={styles.visionMissionStack}>
                                {/* Vision Card */}
                                <div className={styles.visionCard}>
                                    <div className={styles.visionIconBox}>
                                        <RiEyeLine />
                                    </div>
                                    <div className={styles.visionContent}>
                                        <span className={styles.vmBadge}>OUR VISION</span>
                                        <p className={styles.vmText}>
                                            To become Kerala's most trusted digital real estate platform by making property discovery simple, transparent, and accessible for everyone.
                                        </p>
                                    </div>
                                </div>

                                {/* Mission Card */}
                                <div className={styles.visionCard}>
                                    <div className={styles.visionIconBox}>
                                        <RiCompass3Line />
                                    </div>
                                    <div className={styles.visionContent}>
                                        <span className={styles.vmBadge}>OUR MISSION</span>
                                        <p className={styles.vmText}>
                                            To connect buyers, sellers, agents, and builders through technology-driven solutions that make every property transaction faster, safer, and more reliable.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Metrics Ribbon section */}
                <section className={styles.metricsSection} style={{ display: 'none' }}>
                    <div className={styles.container}>
                        <div className={styles.metricsRibbon}>
                            {/* Metric 1 */}
                            <div className={styles.metricCol}>
                                <div className={styles.metricIcon}>
                                    <RiHome4Line />
                                </div>
                                <div className={styles.metricInfo}>
                                    <span className={styles.metricVal}>25K+</span>
                                    <span className={styles.metricLabel}>Properties Listed</span>
                                </div>
                            </div>

                            {/* Metric 2 */}
                            <div className={styles.metricCol}>
                                <div className={styles.metricIcon}>
                                    <RiTeamLine />
                                </div>
                                <div className={styles.metricInfo}>
                                    <span className={styles.metricVal}>18K+</span>
                                    <span className={styles.metricLabel}>Happy Customers</span>
                                </div>
                            </div>

                            {/* Metric 3 */}
                            <div className={styles.metricCol}>
                                <div className={styles.metricIcon}>
                                    <RiShieldCheckLine />
                                </div>
                                <div className={styles.metricInfo}>
                                    <span className={styles.metricVal}>1K+</span>
                                    <span className={styles.metricLabel}>Verified Agents</span>
                                </div>
                            </div>

                            {/* Metric 4 */}
                            <div className={styles.metricCol}>
                                <div className={styles.metricIcon}>
                                    <RiMapPinLine />
                                </div>
                                <div className={styles.metricInfo}>
                                    <span className={styles.metricVal}>50+</span>
                                    <span className={styles.metricLabel}>Cities Covered</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bottom Call to Action Banner */}
                <section className={styles.ctaSection}>
                    <div className={styles.container}>
                        <div className={styles.ctaBannerCard}>
                            <div className={styles.ctaLeft}>
                                <h2 className={styles.ctaTitle}>Ready to Find Your Dream Property?</h2>
                                <p className={styles.ctaDesc}>
                                    Discover verified properties across Kerala and connect with trusted owners and agents.
                                </p>
                            </div>
                            <div className={styles.ctaRight}>
                                <Link href="/properties" className={styles.ctaBtn}>
                                    <span>Explore Properties</span>
                                    <RiArrowRightLine />
                                </Link>
                            </div>

                            {/* House outline vector graphic */}
                            <div className={styles.ctaHouseGraphic}>
                                <svg viewBox="0 0 100 100" className={styles.ctaWireHouseSvg}>
                                    <path d="M10 90 L50 20 L90 90 Z" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                                    <path d="M30 90 L30 50 L70 50 L70 90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
