"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./homeServices.module.css";
import { testimonialApi } from "../lib/api";

const defaultTestimonials = [
    {
        id: 1,
        text: "Keralaplots made my home buying journey smooth and transparent. Highly recommended!",
        name: "Anil Kumar",
        location: "Kochi",
        avatar: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/5d5e346e-2b2d-4702-bac6-ce4fd50f3a00/public",
        rating: 5,
    },
    {
        id: 2,
        text: "Found our dream plot in Trivandrum within 2 weeks! The AI search is absolutely amazing.",
        name: "Reshmi V.",
        location: "Trivandrum",
        avatar: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/55294e59-5054-4a06-1fbf-d74a689e3200/public",
        rating: 5,
    },
    {
        id: 3,
        text: "Direct contact with verified agents saved us time and hassle. 10/10 experience!",
        name: "Mohammed Shafi",
        location: "Calicut",
        avatar: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/4dbfaad7-7c8c-4602-736c-d628b609df00/public",
        rating: 5,
    },
    {
        id: 4,
        text: "Transparent deals and expert support throughout the property document verification process.",
        name: "Deepa Menon",
        location: "Thrissur",
        avatar: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/029a518d-be8e-4fe9-651d-6cebd437d700/public",
        rating: 5,
    },
];

export default function HomeServices() {
    // 1. EMI Calculator State
    const [propertyPrice, setPropertyPrice] = useState(5000000); // 50 Lakhs
    const [downPayment, setDownPayment] = useState(1000000);   // 10 Lakhs
    const [interestRate, setInterestRate] = useState(8.5);       // 8.5%
    const [tenureYears, setTenureYears] = useState(20);          // 20 Years

    // 2. Testimonial Carousel & Dynamic State
    const [testimonials, setTestimonials] = useState(defaultTestimonials);
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);

    // Fetch dynamic testimonials from backend
    useEffect(() => {
        let alive = true;
        const fetchTestimonials = async () => {
            try {
                const res = await testimonialApi.getAll();
                if (alive && res?.data && res.data.length > 0) {
                    const mapped = res.data.map((item) => ({
                        id: item.id,
                        text: item.description,
                        name: item.name,
                        location: item.place || "Kerala",
                        avatar: item.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
                        rating: Number(item.star_count) || 5,
                    }));
                    setTestimonials(mapped);
                }
            } catch (err) {
                console.error("Could not fetch testimonials:", err);
            }
        };

        fetchTestimonials();

        return () => {
            alive = false;
        };
    }, []);

    // Auto-advance carousel smoothly if not dragging
    useEffect(() => {
        if (testimonials.length <= 1 || isDragging) return;
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [testimonials.length, isDragging]);

    const safeActiveIndex = testimonials.length > 0 ? (activeTestimonial % testimonials.length) : 0;

    // Drag / Swipe handlers for Testimonials
    const handleDragStart = (clientX) => {
        setIsDragging(true);
        startXRef.current = clientX;
        setDragOffset(0);
    };

    const handleDragMove = (clientX) => {
        if (!isDragging) return;
        const deltaX = clientX - startXRef.current;
        setDragOffset(deltaX);
    };

    const handleDragEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const threshold = 40; // 40px drag threshold to trigger slide change
        if (dragOffset < -threshold) {
            // Dragged left -> Next Testimonial
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        } else if (dragOffset > threshold) {
            // Dragged right -> Previous Testimonial
            setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
        }

        setDragOffset(0);
    };

    // Calculate Loan EMI
    const calculateEMI = () => {
        const principal = Math.max(0, propertyPrice - downPayment);
        const monthlyRate = interestRate / 12 / 100;
        const totalMonths = tenureYears * 12;

        if (principal <= 0 || monthlyRate <= 0 || totalMonths <= 0) return 0;

        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1);

        return Math.round(emi);
    };

    const emiValue = calculateEMI();

    return (
        <section className={styles.servicesSection}>
            <div className={styles.container}>
                <div className={styles.cardsGrid}>

                    {/* Card 1: EMI Calculator */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>EMI Calculator</h3>
                        <p className={styles.cardSubtitle}>Plan your home loan in seconds</p>

                        <div className={styles.calcInputs}>
                            {/* Property Price */}
                            <div className={styles.inputRow}>
                                <span className={styles.inputLabel}>Property Price</span>
                                <div className={styles.sliderTrack}>
                                    <input
                                        type="range"
                                        min="1000000"
                                        max="30000000"
                                        step="500000"
                                        value={propertyPrice}
                                        onChange={(e) => setPropertyPrice(Number(e.target.value))}
                                        className={styles.rangeSlider}
                                    />
                                </div>
                                <div className={styles.inputBox}>
                                    ₹ {(propertyPrice / 100000).toFixed(0)} L
                                </div>
                            </div>

                            {/* Down Payment */}
                            <div className={styles.inputRow}>
                                <span className={styles.inputLabel}>Down Payment</span>
                                <div className={styles.sliderTrack}>
                                    <input
                                        type="range"
                                        min="200000"
                                        max={propertyPrice * 0.8}
                                        step="100000"
                                        value={downPayment}
                                        onChange={(e) => setDownPayment(Number(e.target.value))}
                                        className={styles.rangeSlider}
                                    />
                                </div>
                                <div className={styles.inputBox}>
                                    ₹ {(downPayment / 100000).toFixed(0)} L
                                </div>
                            </div>

                            {/* Interest Rate */}
                            <div className={styles.inputRow}>
                                <span className={styles.inputLabel}>Interest Rate (p.a)</span>
                                <div className={styles.sliderTrack}>
                                    <input
                                        type="range"
                                        min="6.5"
                                        max="14.0"
                                        step="0.1"
                                        value={interestRate}
                                        onChange={(e) => setInterestRate(Number(e.target.value))}
                                        className={styles.rangeSlider}
                                    />
                                </div>
                                <div className={styles.inputBox}>
                                    {interestRate}%
                                </div>
                            </div>

                            {/* Tenure (Years) */}
                            <div className={styles.inputRow}>
                                <span className={styles.inputLabel}>Tenure (Years)</span>
                                <div className={styles.sliderTrack}>
                                    <input
                                        type="range"
                                        min="5"
                                        max="30"
                                        step="1"
                                        value={tenureYears}
                                        onChange={(e) => setTenureYears(Number(e.target.value))}
                                        className={styles.rangeSlider}
                                    />
                                </div>
                                <div className={styles.inputBox}>
                                    {tenureYears} Yrs
                                </div>
                            </div>
                        </div>

                        {/* EMI Result & Calculate Button */}
                        <div className={styles.calcBottomRow}>
                            <div>
                                <span className={styles.emiResultLabel}>Estimated EMI</span>
                                <span className={styles.emiResultVal}>
                                    ₹{emiValue.toLocaleString("en-IN")} <span className={styles.emiResultSub}>/month</span>
                                </span>
                            </div>
                            <button type="button" className={styles.actionBtn}>
                                Calculate EMI
                            </button>
                        </div>
                    </div>

                    {/* Card 2: What Our Customers Say (Horizontal Slider Track) */}
                    <div className={styles.card}>
                        <div className={styles.centerCardHeader}>
                            <h3 className={styles.cardTitle}>What Our Customers Say</h3>

                            {/* Double Quote Icon */}
                            <div className={styles.quoteIcon}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="#0b132b">
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                </svg>
                            </div>
                        </div>

                        {/* Draggable Viewport & Slider Track */}
                        <div
                            className={`${styles.testimonialViewport} ${isDragging ? styles.grabbing : ""}`}
                            onMouseDown={(e) => handleDragStart(e.clientX)}
                            onMouseMove={(e) => handleDragMove(e.clientX)}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                            onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                            onTouchEnd={handleDragEnd}
                        >
                            <div
                                className={styles.testimonialSliderTrack}
                                style={{
                                    transform: `translateX(calc(-${safeActiveIndex * 100}% + ${dragOffset}px))`,
                                    transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
                                }}
                            >
                                {testimonials.map((item) => (
                                    <div key={item.id} className={styles.testimonialSlide}>
                                        <p className={styles.testimonialText}>
                                            &ldquo;{item.text}&rdquo;
                                        </p>

                                        <div className={styles.customerMeta}>
                                            <img
                                                loading="lazy"
                                                decoding="async"
                                                src={item.avatar}
                                                alt={item.name}
                                                className={styles.customerAvatar}
                                                draggable={false}
                                                onError={(e) => {
                                                    e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
                                                }}
                                            />
                                            <div className={styles.customerDetails}>
                                                <span className={styles.customerName}>{item.name}</span>
                                                <span className={styles.customerLocation}>{item.location}</span>
                                                <div className={styles.starsRow}>
                                                    {[...Array(item.rating || 5)].map((_, i) => (
                                                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b">
                                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                        </svg>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Carousel Pagination Dots */}
                        <div className={styles.dotsRow}>
                            {testimonials.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`${styles.dot} ${idx === safeActiveIndex ? styles.activeDot : ""}`}
                                    onClick={() => setActiveTestimonial(idx)}
                                    aria-label={`Go to testimonial ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Card 3: List Your Property With Us */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>List your property with us</h3>
                        <p className={styles.cardSubtitle}>Reach thousands of genuine buyers and tenants.</p>

                        <div className={styles.propertyImageWrapper}>
                            <img
                                loading="lazy"
                                decoding="async"
                                src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/84e50349-17fe-4ab1-28c5-8f109b425000/public"
                                alt="Modern Architecture Home"
                                className={styles.propertyImage}
                            />
                        </div>

                        <Link href="/post-property" className={`${styles.actionBtn} ${styles.fullWidthBtn}`}>
                            Post Your Property
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                </div>
            </div>
        </section>
    );
}
