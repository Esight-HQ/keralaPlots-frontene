"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./guidesFaqs.module.css";
import { FAQ_DATA } from "./faqData";
import {
    RiAddLine,
    RiSubtractLine,
    RiQuestionLine,
    RiBookOpenLine,
    RiCompass3Line,
    RiBriefcaseLine,
    RiShieldCheckLine,
} from "react-icons/ri";

const CATEGORIES = ["All", "Buying", "Selling", "Agents & Services", "Legal & Verification"];

export default function GuidesFaqsPage() {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [activeFaqId, setActiveFaqId] = useState(null);

    // Filter FAQs by category
    const filteredFaqs = FAQ_DATA.filter((faq) => {
        if (selectedCategory === "All") return true;
        return faq.category === selectedCategory;
    });

    const toggleFaq = (id) => {
        if (activeFaqId === id) {
            setActiveFaqId(null);
        } else {
            setActiveFaqId(id);
        }
    };

    // Helper to map category icons
    const getCategoryIcon = (category) => {
        switch (category) {
            case "Buying":
                return <RiCompass3Line />;
            case "Selling":
                return <RiBriefcaseLine />;
            case "Agents & Services":
                return <RiBookOpenLine />;
            case "Legal & Verification":
                return <RiShieldCheckLine />;
            default:
                return <RiQuestionLine />;
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <Nav />

            <main className={styles.mainContent}>
                <div className={styles.container}>
                    {/* Breadcrumbs */}
                    <div className={styles.breadcrumbs}>
                        <Link href="/">Home</Link>
                        <span className={styles.separator}>&gt;</span>
                        <span className={styles.current}>Guides &amp; FAQs</span>
                    </div>

                    {/* Page Headers */}
                    <div className={styles.headerArea}>
                        <h1 className={styles.pageTitle}>Guides &amp; FAQs</h1>
                        <p className={styles.pageSubtitle}>
                            Get answers to frequently asked questions and read our guides to buy, sell, or register services in Kerala.
                        </p>
                    </div>

                    {/* Category Tabs Row */}
                    <div className={styles.tabsWrapper}>
                        <div className={styles.tabsList}>
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    className={`${styles.tabBtn} ${selectedCategory === cat ? styles.tabBtnActive : ""}`}
                                    onClick={() => {
                                        setSelectedCategory(cat);
                                        setActiveFaqId(null); // Reset open questions
                                    }}
                                >
                                    <span>{cat}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FAQs Accordion Grid */}
                    <div className={styles.faqWrapper}>
                        {filteredFaqs.length > 0 ? (
                            <div className={styles.faqList}>
                                {filteredFaqs.map((faq) => {
                                    const isOpen = activeFaqId === faq.id;
                                    return (
                                        <div
                                            key={faq.id}
                                            className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ""}`}
                                        >
                                            <button
                                                type="button"
                                                className={styles.faqHeader}
                                                onClick={() => toggleFaq(faq.id)}
                                                aria-expanded={isOpen}
                                            >
                                                <div className={styles.faqHeaderLeft}>
                                                    <span className={styles.categoryIcon}>
                                                        {getCategoryIcon(faq.category)}
                                                    </span>
                                                    <span className={styles.faqQuestion}>{faq.question}</span>
                                                </div>
                                                <span className={styles.toggleIcon}>
                                                    {isOpen ? <RiSubtractLine /> : <RiAddLine />}
                                                </span>
                                            </button>

                                            <div
                                                className={`${styles.faqAnswerContainer} ${isOpen ? styles.answerOpen : ""
                                                    }`}
                                            >
                                                <div className={styles.faqAnswerContent}>
                                                    <p className={styles.faqAnswerText}>{faq.answer}</p>
                                                    <div className={styles.faqAnswerFooter}>
                                                        <span className={styles.tagCategory}>
                                                            Category: {faq.category}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles.emptyFaqState}>
                                <RiQuestionLine className={styles.emptyIcon} />
                                <h3 className={styles.emptyTitle}>No Questions Found</h3>
                                <p className={styles.emptyDesc}>
                                    There are currently no questions listed in the "{selectedCategory}" category. Please check back later.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Still Have Questions Box */}
                    <div className={styles.contactSupportCard}>
                        <div className={styles.supportLeft}>
                            <h3 className={styles.supportTitle}>Still have questions?</h3>
                            <p className={styles.supportDesc}>
                                If you cannot find the answer to your question here, feel free to contact our customer support team. We're here to help!
                            </p>
                        </div>
                        <div className={styles.supportRight}>
                            <a href="mailto:support@keralaplots.com" className={styles.supportBtn}>
                                Contact Support
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
