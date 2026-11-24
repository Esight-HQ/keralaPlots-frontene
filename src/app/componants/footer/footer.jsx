import Link from "next/link";
import styles from "./footer.module.css";
import {
    RiInstagramLine,
    RiFacebookFill,
    RiLinkedinFill,
    RiPhoneFill,
    RiMailFill,
    RiMapPin2Fill,
    RiArrowRightSLine,
} from "react-icons/ri";
import { IoHeart } from "react-icons/io5";
export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                {/* Column 1: Brand */}
                <div className={styles.brandCol}>
                    <img
                        loading="lazy"
                        decoding="async"
                        src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public"
                        alt="KeralaPlots Logo"
                        className={styles.logoImage}
                    />
                    <p className={styles.brandDesc}>
                        Keralaplots.com is a modern real estate platform designed to simplify your property search. With our verified listings, you can confidently find your dream property and connect directly with owners, trusted agents or reputed builders.
                    </p>
                    <div className={styles.socialRow}>
                        <a href="https://www.instagram.com/keralaplots/" className={styles.socialIcon} aria-label="Instagram" target="_blank" rel="noopener noreferrer"><RiInstagramLine /></a>
                        <a href="https://www.facebook.com/keralaplots/" className={styles.socialIcon} aria-label="Facebook" target="_blank" rel="noopener noreferrer"><RiFacebookFill /></a>
                        <a href="https://www.linkedin.com/in/kerala-plots-1a34b6249/?isSelfProfile=false" className={styles.socialIcon} aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><RiLinkedinFill /></a>
                    </div>
                </div>

                {/* Column 2: Quick Links */}
                <div className={styles.linksCol}>
                    <h4 className={styles.colTitle}>Quick Links</h4>
                    <ul className={styles.linksList}>
                        <li><Link href="/"><span>Home</span><RiArrowRightSLine /></Link></li>
                        <li><Link href="/properties"><span>Properties</span><RiArrowRightSLine /></Link></li>
                        <li><Link href="/agent"><span>Agents</span><RiArrowRightSLine /></Link></li>
                        <li><Link href="/builders"><span>Builders</span><RiArrowRightSLine /></Link></li>
                        <li><Link href="/services"><span>Services</span><RiArrowRightSLine /></Link></li>
                        <li><Link href="/quick-sell"><span>Quick Sell</span><RiArrowRightSLine /></Link></li>
                        <li><Link href="/about-us"><span>About Us</span><RiArrowRightSLine /></Link></li>
                    </ul>
                </div>

                {/* Column 3: Resources */}
                <div className={styles.resourcesCol}>
                    <h4 className={styles.colTitle}>Resources</h4>
                    <ul className={styles.resourcesList}>
                        <li><Link href="/blog">Blog</Link></li>
                        <li><Link href="/guides-faqs">Guides & FAQs</Link></li>
                        <li><Link href="/privacy-policy">Privacy Policy</Link></li>
                        <li><Link href="/terms-conditions">Terms & Conditions</Link></li>
                        {/* <li><Link href="/sitemap">Sitemap</Link></li> */}
                    </ul>
                </div>

                {/* Column 4: Get In Touch */}
                <div className={styles.touchCol}>
                    <h4 className={styles.colTitle}>Get In Touch</h4>
                    <div className={styles.touchItem}>
                        <div className={styles.touchIconBox}><RiPhoneFill /></div>
                        <div className={styles.touchText}>
                            <a className={styles.touchMain} href="tel:+919496187119">+91 9496187119</a>
                            <span className={styles.touchSub}>Mon - Sat 9:00 AM - 6:00 PM</span>
                        </div>
                    </div>
                    <div className={styles.touchItem}>
                        <div className={styles.touchIconBox}><RiMailFill /></div>
                        <div className={styles.touchText}>
                            <a href="mailto:info@keralaplots.com" className={styles.touchMain}>info@keralaplots.com</a>
                            <span className={styles.touchSub}>We reply within 24 hours</span>
                        </div>
                    </div>
                    <div className={styles.touchItem}>
                        <div className={styles.touchIconBox}><RiMapPin2Fill /></div>
                        <div className={styles.touchText}>
                            <span className={styles.touchMain}>Angamaly,Kerala</span>
                            <span className={styles.touchSub}>683572</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.footerBottom}>
                <div className={styles.footerBottomContainer}>
                    <span className={styles.copyrightText}>
                        © {new Date().getFullYear()} KeralaPlots. All rights reserved.
                    </span>
                    <div className={styles.footerBottomLinks}>
                        <p>Designed with</p>
                        <IoHeart />
                        <a href="https://esightsolutions.com/" target="_blank" rel="noopener noreferrer" className={styles.esightLogo}>
                            <img loading="lazy" decoding="async" width={60} height={60} src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ecfcbf90-0db3-485c-9801-c863f3ee8e00/public" alt="eSight Solutions" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
