"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../lib/api";
import { getSafeRedirect, markAuthRedirect } from "../lib/authRedirect";
import {
    RiPhoneLine,
    RiUserLine,
    RiUserStarLine,
    RiBuilding2Line,
    RiCheckLine,
    RiArrowLeftLine,
    RiLoader4Line,
    RiErrorWarningLine,
    RiCloseLine,
} from "react-icons/ri";

const PHONE_REGEX = /^[6-9]\d{9}$/;

// Extracts a 6-digit verification code from raw inputs, SMS texts, or clipboard strings
const extractOtp = (raw) => {
    if (!raw) return "";
    const str = String(raw).trim();
    // 1. Look for explicit standalone 6-digit number (e.g. "Your OTP is 482910")
    // Prevents accidentally capturing 10-digit phone numbers like +91 9847123456
    const isolatedMatch = str.match(/(?:^|\D)(\d{6})(?:\D|$)/);
    if (isolatedMatch) return isolatedMatch[1];

    // 2. Look for hyphenated or spaced 6-digit code (e.g. "123-456" or "123 456")
    const formattedMatch = str.match(/(\d{3})[\s-](\d{3})/);
    if (formattedMatch) return formattedMatch[1] + formattedMatch[2];

    // 3. Fallback: extract all digits
    const digits = str.replace(/\D/g, "");
    if (digits.length >= 6) {
        return digits.slice(-6);
    }
    return digits;
};

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Validate the redirect param — rejects external URLs and redirect loops.
    const safeRedirectUrl = getSafeRedirect(searchParams?.get("redirect"));
    const { login, isAuthenticated } = useAuth();

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push(safeRedirectUrl || "/");
        }
    };

    // "signin" | "signup"
    const [mode, setMode] = useState("signin");
    // "details" | "verify"
    const [step, setStep] = useState("details");

    const [name, setName] = useState("");
    const [nameError, setNameError] = useState("");
    const [phone, setPhone] = useState("");
    const [phoneError, setPhoneError] = useState("");
    const [agree, setAgree] = useState(false);
    const [agreeError, setAgreeError] = useState("");

    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const [otpError, setOtpError] = useState("");

    const [resendTimer, setResendTimer] = useState(0);
    const otpInputsRef = useRef([]);
    // Guards against firing verify twice for the same code (auto-verify + button / re-renders).
    const verifyingRef = useRef(false);
    const refocusOtpRef = useRef(false);
    const resendIntervalRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState("");
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    // Redirect away if already authenticated — use replace so login is not in history.
    useEffect(() => {
        if (isAuthenticated) {
            router.replace(safeRedirectUrl);
        }
    }, [isAuthenticated, router, safeRedirectUrl]);

    /**
     * Single, centralised handler for every successful authentication path:
     * manual OTP submit, paste, SMS autofill, WebOTP API.
     * - Calls login() to persist the user/token.
     * - Sets the auth-redirect scroll flag so the destination page scrolls to top.
     * - Uses router.replace() so the login page is removed from browser history.
     */
    const handleSuccessfulLogin = (user, token) => {
        login(user, token);
        showToast(
            mode === "signup"
                ? `Account created! Welcome, ${user?.name || "User"}.`
                : `Welcome back, ${user?.name || "User"}!`
        );
        markAuthRedirect();
        // Small delay to let the toast flash before navigating.
        setTimeout(() => router.replace(safeRedirectUrl), 400);
    };

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
        };
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    };

    const clearResendInterval = () => {
        if (resendIntervalRef.current) {
            clearInterval(resendIntervalRef.current);
            resendIntervalRef.current = null;
        }
    };

    const startResendTimer = () => {
        clearResendInterval();
        setResendTimer(30);
        resendIntervalRef.current = setInterval(() => {
            setResendTimer((t) => {
                if (t <= 1) {
                    clearResendInterval();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
    };

    const resetOtp = () => {
        clearResendInterval();
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpError("");

        setResendTimer(0);
        setGeneralError("");
    };

    const switchMode = (next) => {
        setMode(next);
        setStep("details");
        setName("");
        setNameError("");
        setPhone("");
        setPhoneError("");
        setAgree(false);
        setAgreeError("");
        setGeneralError("");
        resetOtp();
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setGeneralError("");

        let hasError = false;

        if (mode === "signup") {
            if (!name.trim() || name.trim().length < 3) {
                setNameError("Enter your full name (at least 3 characters)");
                hasError = true;
            } else {
                setNameError("");
            }
        }

        const phoneValue = phone.trim();
        if (!phoneValue) {
            setPhoneError("Enter your mobile number");
            hasError = true;
        } else if (!PHONE_REGEX.test(phoneValue)) {
            setPhoneError("Enter a valid 10-digit Indian mobile number");
            hasError = true;
        } else {
            setPhoneError("");
        }

        if (mode === "signup") {
            if (!agree) {
                setAgreeError("You must accept the Terms & Privacy Policy");
                hasError = true;
            } else {
                setAgreeError("");
            }
        }

        if (hasError) return;

        setLoading(true);

        try {
            const res = await authApi.sendOtp(phoneValue, mode === "signup" ? "register" : "login");

            if (res.success) {
                setOtpDigits(["", "", "", "", "", ""]);
                setOtpError("");
                setStep("verify");
                startResendTimer();
                showToast(`OTP sent via SMS to +91 ${phoneValue}`);
            } else {
                setGeneralError(res.message || "Failed to send OTP. Please try again.");
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message || "An error occurred. Please try again.";
            setGeneralError(message);
            if (err.response?.status === 403 || err.response?.data?.account_deleted) {
                setPhoneError(message);
            } else if (err.response?.status === 404 && mode === "signin") {
                setPhoneError(message);
            } else if (err.response?.status === 422 && mode === "signup") {
                setPhoneError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0 || loading) return;
        setLoading(true);
        setGeneralError("");

        try {
            const phoneValue = phone.trim();
            const res = await authApi.sendOtp(phoneValue, mode === "signup" ? "register" : "login");

            if (res.success) {
                setOtpDigits(["", "", "", "", "", ""]);
                setOtpError("");
                startResendTimer();
                showToast("A new OTP has been sent via SMS.");
            } else {
                setOtpError(res.message || "Failed to resend OTP.");
            }
        } catch (err) {
            setOtpError(err.response?.data?.message || "Failed to resend OTP.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-focus the first OTP box upon reaching the verify step
    useEffect(() => {
        if (step === "verify") {
            const timer = setTimeout(() => {
                otpInputsRef.current[0]?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [step]);

    // Fill boxes starting at `startIndex` with `codeString` and auto-verify once all 6 are in.
    const fillOtp = (codeString, startIndex = 0) => {
        const extracted = extractOtp(codeString);
        if (!extracted) return;

        // Full 6-digit OTP (e.g. SMS autofill, paste, or WebOTP)
        if (extracted.length >= 6) {
            const fullCode = extracted.slice(0, 6);
            setOtpDigits(fullCode.split(""));
            setOtpError("");
            otpInputsRef.current[5]?.blur();
            verifyOtpCode(fullCode);
            return;
        }

        // Single digit or partial code (manual typing)
        setOtpDigits((prev) => {
            const next = [...prev];
            let i = startIndex;
            for (const ch of extracted) {
                if (i > 5) break;
                next[i] = ch;
                i++;
            }

            const code = next.join("");
            if (code.length === 6 && next.every(Boolean)) {
                otpInputsRef.current[Math.min(i, 5)]?.blur();
                setTimeout(() => verifyOtpCode(code), 0);
            } else {
                otpInputsRef.current[Math.min(i, 5)]?.focus();
            }
            return next;
        });
        setOtpError("");
    };

    const handleOtpDigitChange = (index, rawValue) => {
        if (!rawValue) {
            // Digit cleared
            setOtpDigits((prev) => {
                const next = [...prev];
                next[index] = "";
                return next;
            });
            setOtpError("");
            return;
        }

        // Several digits arrived: SMS autofill (iOS/Android/macOS) drops the whole code into the focused box
        const extracted = extractOtp(rawValue);
        if (extracted.length >= 6) {
            fillOtp(extracted, 0);
            return;
        }

        // If the box already had a digit and user typed over it
        const digits = rawValue.replace(/\D/g, "");
        if (digits.length > 1) {
            const prev = otpDigits[index];
            let newDigit = digits.slice(-1);
            if (prev && digits.startsWith(prev)) {
                newDigit = digits.slice(prev.length);
            } else if (prev && digits.endsWith(prev)) {
                newDigit = digits.slice(0, digits.length - prev.length);
            }
            fillOtp(newDigit, index);
            return;
        }

        fillOtp(digits, index);
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace") {
            if (!otpDigits[index] && index > 0) {
                e.preventDefault();
                setOtpDigits((prev) => {
                    const next = [...prev];
                    next[index - 1] = "";
                    return next;
                });
                otpInputsRef.current[index - 1]?.focus();
            }
        } else if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            otpInputsRef.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < 5) {
            e.preventDefault();
            otpInputsRef.current[index + 1]?.focus();
        }
    };

    const handleOtpPaste = (e, index = 0) => {
        e.preventDefault();
        const pasted = e.clipboardData?.getData("text") || "";
        const code = extractOtp(pasted);
        if (!code) return;

        if (code.length >= 6) {
            fillOtp(code, 0);
        } else {
            fillOtp(code, index);
        }
    };

    const verifyOtpCode = async (code) => {
        if (verifyingRef.current) return;
        if (!/^\d{6}$/.test(code)) {
            setOtpError("Enter the complete 6-digit OTP");
            return;
        }

        verifyingRef.current = true;
        setLoading(true);
        setOtpError("");

        let failed = false;
        try {
            const phoneValue = phone.trim();
            const res = await authApi.verifyOtp(
                phoneValue,
                code,
                mode === "signup" ? "register" : "login",
                mode === "signup" ? name.trim() : undefined
            );

            if (res.success && res.data?.token) {
                handleSuccessfulLogin(res.data.user, res.data.token);
            } else {
                failed = true;
                setOtpError(res.message || "Incorrect OTP. Please try again.");
            }
        } catch (err) {
            failed = true;
            const message = err.response?.data?.message || "Incorrect or expired OTP. Please try again.";
            setOtpError(message);
        } finally {
            verifyingRef.current = false;
            setLoading(false);
        }

        if (failed) {
            // Clear the boxes so the user can re-enter; focus after the inputs re-enable.
            setOtpDigits(["", "", "", "", "", ""]);
            refocusOtpRef.current = true;
        }
    };

    // After a failed verify, put the cursor back in the first box once inputs re-enable.
    useEffect(() => {
        if (!loading && refocusOtpRef.current) {
            refocusOtpRef.current = false;
            otpInputsRef.current[0]?.focus();
        }
    }, [loading]);

    const handleVerifyOtp = (e) => {
        e.preventDefault();
        verifyOtpCode(otpDigits.join(""));
    };

    // Android Chrome: read the OTP straight from the SMS (WebOTP API) and auto-verify.
    // Needs the SMS to end with a line like "@keralaplots.com #000000"; ignored elsewhere.
    useEffect(() => {
        if (step !== "verify" || typeof window === "undefined" || !("OTPCredential" in window)) return;
        const ac = new AbortController();
        navigator.credentials
            .get({ otp: { transport: ["sms"] }, signal: ac.signal })
            .then((otp) => {
                if (otp?.code) {
                    const code = extractOtp(otp.code);
                    if (code && code.length === 6) {
                        fillOtp(code, 0);
                    }
                }
            })
            .catch(() => { });
        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const handleChangeNumber = () => {
        clearResendInterval();
        setStep("details");
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpError("");
    };

    return (
        <div className={styles.page}>
            {toast && (
                <div
                    className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess
                        }`}
                >
                    {toast.type === "error" ? <RiErrorWarningLine /> : <RiCheckLine />}
                    <span>{toast.message}</span>
                </div>
            )}

            <div className={styles.wrapper}>
                {/* Left Showcase Panel */}
                <div className={styles.showcase}>
                    <div className={styles.showcaseOverlay} />
                    <Link href="/" className={styles.showcaseLogo}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/86cde5ae-ee46-447c-9428-7245915cf600/public"
                            alt="KeralaPlots Logo"
                            className={styles.logoImage}
                        />
                    </Link>

                    <div className={styles.showcaseContent}>
                        <h1 className={styles.showcaseTitle}>
                            One Account for<br /> Kerala Real Estate
                        </h1>
                        <p className={styles.showcaseSubtitle}>
                            Whether you&apos;re buying, selling, an agent or a builder — sign in once to list, find and connect across all 14 districts of Kerala.
                        </p>

                        <ul className={styles.showcaseFeatures}>
                            <li><RiUserLine /> Buyers &amp; owners — search, save and list properties</li>
                            <li><RiUserStarLine /> Agents — public profile, listings and direct enquiries</li>
                            <li><RiBuilding2Line /> Builders — showcase projects and collect leads</li>
                        </ul>

                        <div className={styles.showcaseStats}>
                            <div>
                                <strong>14</strong>
                                <span>Districts covered</span>
                            </div>
                            <div>
                                <strong>Buy · Rent</strong>
                                <span>Sell &amp; lease too</span>
                            </div>
                            <div>
                                <strong>Direct</strong>
                                <span>Chat with owners</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Form Panel */}
                <div className={styles.formPanel}>
                    {/* Top Right Close / Back Cross Button */}
                    <button
                        type="button"
                        onClick={handleBack}
                        className={styles.closePageBtn}
                        aria-label="Go back"
                        title="Go back"
                    >
                        <RiCloseLine size={24} />
                    </button>

                    <div className={styles.formCard}>
                        <Link href="/" className={styles.mobileLogo}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public"
                                alt="KeralaPlots Logo"
                                className={styles.logoImage}
                            />
                        </Link>

                        <div className={styles.tabs}>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${mode === "signin" ? styles.tabBtnActive : ""}`}
                                onClick={() => switchMode("signin")}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${mode === "signup" ? styles.tabBtnActive : ""}`}
                                onClick={() => switchMode("signup")}
                            >
                                Sign Up
                            </button>
                            <span className={`${styles.tabIndicator} ${mode === "signup" ? styles.tabIndicatorRight : ""}`} />
                        </div>

                        <div className={styles.form}>
                            <h2 className={styles.formTitle}>
                                {mode === "signin" ? "Welcome back" : "Create your account"}
                            </h2>
                            {step === "details" && (
                                <p className={styles.formSubtitle}>
                                    {mode === "signin"
                                        ? "Sign in with your mobile number to manage your properties, listings, projects and enquiries."
                                        : "Verify your mobile number to get started. You can register as an agent or builder after signing up."}
                                </p>
                            )}

                            {generalError && (
                                <div className={`${styles.bannerAlert} ${styles.bannerAlertError}`}>
                                    <RiErrorWarningLine />
                                    <span>{generalError}</span>
                                </div>
                            )}

                            {step === "details" ? (
                                <form className={styles.form} onSubmit={handleSendOtp} noValidate>
                                    {mode === "signup" && (
                                        <div className={styles.field}>
                                            <label htmlFor="signup-name">Full Name</label>
                                            <div className={`${styles.inputWrap} ${nameError ? styles.inputError : ""}`}>
                                                <RiUserLine className={styles.inputIcon} />
                                                <input
                                                    id="signup-name"
                                                    type="text"
                                                    placeholder="Your full name"
                                                    value={name}
                                                    onChange={(e) => {
                                                        setName(e.target.value);
                                                        setNameError("");
                                                    }}
                                                    autoComplete="name"
                                                />
                                            </div>
                                            {nameError && <span className={styles.errorText}>{nameError}</span>}
                                        </div>
                                    )}

                                    <div className={styles.field}>
                                        <label htmlFor="phone-number">Mobile Number</label>
                                        <div className={`${styles.inputWrap} ${phoneError ? styles.inputError : ""}`}>
                                            <RiPhoneLine className={styles.inputIcon} />
                                            <span className={styles.countryCode}>+91</span>
                                            <input
                                                id="phone-number"
                                                type="tel"
                                                placeholder="98XXXXXXXX"
                                                maxLength={10}
                                                value={phone}
                                                onChange={(e) => {
                                                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                                                    setPhoneError("");
                                                }}
                                                autoComplete="tel"
                                            />
                                        </div>
                                        {phoneError && <span className={styles.errorText}>{phoneError}</span>}
                                    </div>

                                    {mode === "signup" && (
                                        <>
                                            <label className={`${styles.checkboxLabel} ${styles.termsLabel}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={agree}
                                                    onChange={(e) => {
                                                        setAgree(e.target.checked);
                                                        setAgreeError("");
                                                    }}
                                                />
                                                <span>
                                                    I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                                                </span>
                                            </label>
                                            {agreeError && <span className={styles.errorText}>{agreeError}</span>}
                                        </>
                                    )}

                                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                                        {loading ? <RiLoader4Line className={styles.spinner} /> : "Send OTP"}
                                    </button>
                                </form>
                            ) : (
                                <form className={styles.form} onSubmit={handleVerifyOtp} noValidate>
                                    <button type="button" className={styles.backBtn} onClick={handleChangeNumber}>
                                        <RiArrowLeftLine /> Change number
                                    </button>

                                    <p className={styles.formSubtitle} style={{ marginTop: "-10px" }}>
                                        Enter the 6-digit code sent to <strong>+91 {phone}</strong>
                                    </p>

                                    <div className={styles.otpRow} onPaste={(e) => handleOtpPaste(e, 0)}>
                                        {otpDigits.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={(el) => (otpInputsRef.current[index] = el)}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                autoComplete="one-time-code"
                                                id={`otp-digit-${index}`}
                                                name={`otp_digit_${index}`}
                                                aria-label={`OTP digit ${index + 1}`}
                                                disabled={loading}
                                                className={`${styles.otpBox} ${otpError ? styles.otpBoxError : ""}`}
                                                value={digit}
                                                onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                onPaste={(e) => handleOtpPaste(e, index)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        ))}
                                    </div>
                                    {otpError && <span className={styles.errorText}>{otpError}</span>}

                                    <div className={styles.resendRow}>
                                        {resendTimer > 0 ? (
                                            <span>Resend OTP in 0:{String(resendTimer).padStart(2, "0")}</span>
                                        ) : (
                                            <button type="button" onClick={handleResendOtp} disabled={loading}>
                                                Resend OTP
                                            </button>
                                        )}
                                    </div>

                                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                                        {loading ? (
                                            <RiLoader4Line className={styles.spinner} />
                                        ) : mode === "signup" ? (
                                            "Verify & Create Account"
                                        ) : (
                                            "Verify & Sign In"
                                        )}
                                    </button>
                                </form>
                            )}

                            <p className={styles.switchText}>
                                {mode === "signin" ? (
                                    <>
                                        New to KeralaPlots?{" "}
                                        <button type="button" className={styles.linkBtn} onClick={() => switchMode("signup")}>
                                            Create an account
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?{" "}
                                        <button type="button" className={styles.linkBtn} onClick={() => switchMode("signin")}>
                                            Sign in
                                        </button>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc" }}>
                    <div style={{ textAlign: "center" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                border: "3px solid #2563eb",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                                margin: "0 auto",
                            }}
                        />
                    </div>
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
