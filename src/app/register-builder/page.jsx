"use client";

/* Builder registration form (frontend submission design ready for future backend integration). */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./registerBuilder.module.css";
import { useAuth } from "../context/AuthContext";
import {
    RiBuilding2Line,
    RiUploadCloud2Line,
    RiDeleteBinLine,
    RiFileTextLine,
    RiCheckLine,
    RiCloseLine,
    RiLoader4Line,
    RiArrowRightLine,
    RiShieldCheckLine,
    RiMapPinLine,
    RiTimeLine,
    RiHome4Line,
} from "react-icons/ri";
import { setBuilderStatus } from "../lib/builderStatus";
import { builderApi } from "../lib/api";

const BUILDER_TYPES = [
    "Residential builder",
    "Villa developer",
    "Apartment developer",
    "Construction company",
    "Commercial developer",
    "Building contractor",
    "Other",
];

const DISTRICTS = [
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam",
    "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod",
];

const PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const PROOF_MAX_BYTES = 5 * 1024 * 1024;
const ABOUT_MAX = 500;
const THIS_YEAR = new Date().getFullYear();

const readAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

function Field({ label, required, error, hint, htmlFor, children, style, className }) {
    return (
        <div
            data-invalid={!!error}
            className={`${styles.field} ${error ? styles.fieldError : ""} ${className || ""}`.trim()}
            style={style}
        >
            <label className={styles.label} htmlFor={htmlFor}>
                {label} {required ? <span className={styles.req} aria-hidden="true">*</span> : <span className={styles.optional}>(optional)</span>}
            </label>
            {children}
            {error ? (
                <p className={styles.errorText} id={`${htmlFor}-error`} role="alert">{error}</p>
            ) : hint ? (
                <p className={styles.hint}>{hint}</p>
            ) : null}
        </div>
    );
}

export default function RegisterBuilderPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [form, setForm] = useState(() => ({
        companyName: "",
        builderType: [],
        contactPerson: user?.name || "",
        phone: String(user?.mobile || user?.phone || "").replace(/\D/g, "").slice(-10),
        email: user?.email || "",
        district: "",
        locality: "",
        establishedYear: "",
        website: "",
        reraNumber: "",
        about: "",
    }));
    const [proof, setProof] = useState({ file: null, data: "", name: "", size: "", existing: false, url: "" });
    const [agree, setAgree] = useState(false);

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [existingApplication, setExistingApplication] = useState(null);

    const proofInputRef = useRef(null);
    const formRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        try {
            const stored = localStorage.getItem("kp_builder_verification_pending");
            if (stored) {
                const data = JSON.parse(stored);
                if (data.companyName || data.reraNumber) {
                    setForm((f) => ({
                        ...f,
                        companyName: f.companyName || data.companyName || "",
                        builderType: f.builderType.length
                            ? f.builderType
                            : Array.isArray(data.builderType)
                              ? data.builderType
                              : typeof data.builderType === "string" && data.builderType
                                ? data.builderType.split(",").map((s) => s.trim()).filter(Boolean)
                                : [],
                        reraNumber: f.reraNumber || data.reraNumber || "",
                        contactPerson: f.contactPerson || data.contactPerson || "",
                        phone: f.phone || data.phone || "",
                        email: f.email || data.email || "",
                        district: f.district || data.district || "",
                        locality: f.locality || data.locality || "",
                        establishedYear: f.establishedYear || data.establishedYear || "",
                        website: f.website || data.website || "",
                        about: f.about || data.about || "",
                    }));
                }
            }
        } catch { }

        async function fetchStatus() {
            try {
                const storedRaw = localStorage.getItem("kp_builder_verification_pending");
                const localData = storedRaw ? JSON.parse(storedRaw) : null;
                const localCompany = String(localData?.companyName || "").trim();

                const res = await builderApi.status();
                if (!mounted) return;
                if (res && res.success && res.has_applied) {
                    const b = res.builder;
                    const backendCompany = String(b?.company_name || "").trim();

                    // If local pending registration is for a newer company (e.g. SolutionArcVision) not yet in DB, sync it now
                    if (localCompany && (localData?.status === "pending" || !localData?.status) && backendCompany.toLowerCase() !== localCompany.toLowerCase()) {
                        try {
                            const portalRaw = localStorage.getItem("kp_builder_custom_webpage_data");
                            const portal = portalRaw ? JSON.parse(portalRaw) : {};
                            const phoneRaw = String(localData?.phone || portal.phone || b?.mobile_number || "7902701482").replace(/\D/g, "");
                            const phone10 = phoneRaw.length > 10 ? phoneRaw.slice(-10) : (phoneRaw.length === 10 ? phoneRaw : "7902701482");
                            const builderTypeVal = Array.isArray(localData?.builderType)
                                ? localData.builderType.join(", ")
                                : (localData?.builderType || portal.builderType || b?.builder_type || "Residential builder");
                            await builderApi.register({
                                company_name: localCompany,
                                builder_type: builderTypeVal,
                                rera_number: localData?.reraNumber || portal.reraNumber || b?.rera_number || "KRERA-" + Date.now().toString().slice(-6),
                                contact_person: localData?.contactPerson || b?.contact_person || "Builder Contact",
                                mobile_number: phone10,
                                email: localData?.email || portal.email || b?.email || "",
                                district: localData?.district || portal.headquarters || b?.district || "Palakkad",
                                locality: localData?.locality || b?.locality || "",
                                company_description: localData?.about || portal.about || "",
                                established_year: localData?.establishedYear || portal.foundedYear || undefined,
                                company_website: localData?.website || portal.website || "",
                                terms_accepted: 1,
                                is_local_sync: 1,
                            });
                            const refreshed = await builderApi.status();
                            if (mounted && refreshed?.success && refreshed?.has_applied) {
                                setExistingApplication(refreshed);
                            }
                            return;
                        } catch { }
                    }

                    setExistingApplication(res);
                    if (b) {
                        const parsedTypes = b.builder_type
                            ? String(b.builder_type).split(",").map((s) => s.trim()).filter(Boolean)
                            : [];
                        setForm((f) => ({
                            ...f,
                            companyName: b.company_name || f.companyName,
                            builderType: parsedTypes.length ? parsedTypes : f.builderType,
                            contactPerson: b.contact_person || f.contactPerson,
                            phone: String(b.mobile_number || f.phone).replace(/\D/g, "").slice(-10),
                            email: b.email || f.email,
                            district: b.district || f.district,
                            locality: b.locality || f.locality,
                            establishedYear: b.established_year ? String(b.established_year) : f.establishedYear,
                            website: b.company_website || f.website,
                            reraNumber: b.rera_number || f.reraNumber,
                            about: b.company_description || f.about,
                        }));
                        if (b.verification_document_url) {
                            setProof({
                                file: null,
                                data: "",
                                name: b.verification_document_name || "Verification Document",
                                size: "",
                                existing: true,
                                url: b.verification_document_url,
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not check builder registration status:", err?.message || err);
            }
        }

        fetchStatus();
        return () => {
            mounted = false;
        };
    }, []);

    const set = (key) => (e) => {
        const value = e.target.value;
        setForm((f) => ({ ...f, [key]: value }));
        if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    };

    const toggleBuilderType = (type) => {
        setForm((f) => ({
            ...f,
            builderType: f.builderType.includes(type)
                ? f.builderType.filter((t) => t !== type)
                : [...f.builderType, type],
        }));
        if (errors.builderType) setErrors((er) => ({ ...er, builderType: undefined }));
    };

    const pickProof = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!PROOF_TYPES.includes(file.type)) {
            setErrors((er) => ({ ...er, proof: "Upload a PDF, JPG or PNG file." }));
            return;
        }
        if (file.size > PROOF_MAX_BYTES) {
            setErrors((er) => ({ ...er, proof: "File size exceeds the 5MB limit." }));
            return;
        }
        try {
            const data = await readAsDataUrl(file);
            setProof({ file, data, name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`, existing: false, url: "" });
            setErrors((er) => ({ ...er, proof: undefined }));
        } catch {
            setErrors((er) => ({ ...er, proof: "That file couldn’t be read. Try another." }));
        }
    };

    const validate = () => {
        const e = {};
        const phone = form.phone.replace(/\D/g, "");
        if (!form.companyName.trim()) e.companyName = "Company name is required.";
        else if (form.companyName.trim().length < 3) e.companyName = "Enter the full company name.";
        if (!form.builderType.length) e.builderType = "Select at least one type of builder.";
        if (form.establishedYear) {
            const y = Number(form.establishedYear);
            if (!Number.isInteger(y) || y < 1900 || y > THIS_YEAR) e.establishedYear = `Enter a year between 1900 and ${THIS_YEAR}.`;
        }
        if (!form.reraNumber.trim()) e.reraNumber = "RERA registration number is required.";
        if (!form.contactPerson.trim()) e.contactPerson = "Contact person is required.";
        if (!phone) e.phone = "Phone number is required.";
        else if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter a valid 10-digit mobile number.";
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
        if (!form.district) e.district = "Select your main district.";
        if (form.website.trim() && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(form.website.trim())) {
            e.website = "Enter a valid website, e.g. www.example.com";
        }
        if (form.about.length > ABOUT_MAX) e.about = `Keep it under ${ABOUT_MAX} characters.`;
        if (!proof.data && !proof.name && !proof.existing) e.proof = "Upload a registration or licence document.";
        if (!agree) e.agree = "Please confirm the details are correct.";
        return e;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length) {
            // Bring the first problem into view.
            requestAnimationFrame(() => {
                formRef.current?.querySelector('[data-invalid="true"], [aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
            return;
        }

        const website = form.website.trim();
        const formattedWebsite = website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : "";
        const builderTypeStr = Array.isArray(form.builderType) ? form.builderType.join(", ") : String(form.builderType || "");

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("company_name", form.companyName.trim());
            formData.append("builder_type", builderTypeStr);
            if (form.establishedYear) formData.append("established_year", form.establishedYear);
            formData.append("rera_number", form.reraNumber.trim());
            if (form.about.trim()) formData.append("company_description", form.about.trim());
            formData.append("contact_person", form.contactPerson.trim());
            formData.append("mobile_number", form.phone.replace(/\D/g, ""));
            if (form.email.trim()) formData.append("email", form.email.trim());
            if (formattedWebsite) formData.append("company_website", formattedWebsite);
            formData.append("district", form.district);
            if (form.locality.trim()) formData.append("locality", form.locality.trim());
            formData.append("terms_accepted", "1");

            if (proof.file) {
                formData.append("proof_file", proof.file);
            } else if (proof.data) {
                formData.append("proof", proof.data);
                formData.append("proof_name", proof.name || "verification_document");
            }

            const res = await builderApi.register(formData);
            if (res && res.success) {
                try {
                    localStorage.setItem(
                        "kp_builder_verification_pending",
                        JSON.stringify({
                            companyName: form.companyName.trim() || "",
                            builderType: form.builderType,
                            reraNumber: form.reraNumber.trim() || "",
                            contactPerson: form.contactPerson.trim() || "",
                            phone: form.phone.trim() || "",
                            email: form.email.trim() || "",
                            district: form.district || "",
                            locality: form.locality.trim() || "",
                            establishedYear: form.establishedYear || "",
                            website: form.website.trim() || "",
                            about: form.about.trim() || "",
                            submittedAt: Date.now(),
                            status: "pending",
                        })
                    );
                    setBuilderStatus("pending", { companyName: form.companyName.trim() || "" });
                } catch { }
                setSubmitted(true);
                setExistingApplication({
                    success: true,
                    has_applied: true,
                    status: "pending",
                    builder: {
                        company_name: form.companyName.trim(),
                        builder_type: builderTypeStr,
                        contact_person: form.contactPerson.trim(),
                        mobile_number: form.phone.replace(/\D/g, ""),
                        rera_number: form.reraNumber.trim(),
                        district: form.district,
                        locality: form.locality.trim(),
                        approval_status: "pending",
                        submitted_at: new Date().toISOString(),
                    },
                });
            } else {
                const msg = res?.message || "Failed to submit builder registration.";
                if (res?.errors) {
                    const mappedErrors = {};
                    for (const [k, v] of Object.entries(res.errors)) {
                        mappedErrors[k] = Array.isArray(v) ? v[0] : v;
                    }
                    setErrors(mappedErrors);
                } else {
                    setErrors({ submit: msg });
                }
            }
        } catch (err) {
            const respData = err?.response?.data;
            if (respData?.errors) {
                const mappedErrors = {};
                for (const [k, v] of Object.entries(respData.errors)) {
                    const uiKey =
                        k === "company_name" ? "companyName" :
                        k === "builder_type" ? "builderType" :
                        k === "rera_number" ? "reraNumber" :
                        k === "contact_person" ? "contactPerson" :
                        k === "mobile_number" ? "phone" :
                        k === "established_year" ? "establishedYear" :
                        k === "company_website" ? "website" :
                        k === "company_description" ? "about" :
                        k === "proof_file" ? "proof" : k;
                    mappedErrors[uiKey] = Array.isArray(v) ? v[0] : v;
                }
                setErrors({ ...mappedErrors, submit: respData.message });
            } else {
                setErrors({
                    submit: respData?.message || err?.message || "Failed to submit application. Please check your connection and try again.",
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const finish = useCallback(() => router.push("/builders?verification=pending"), [router]);
    const invalid = (key) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});

    // Close on Escape key
    useEffect(() => {
        if (!submitted) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") finish();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [submitted, finish]);

    return (
        <div className={styles.page}>
            <Nav />

            {submitted && (
                <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="builder-submitted" onClick={finish}>
                    <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={styles.dialogClose} onClick={finish} aria-label="Close dialog">
                            <RiCloseLine />
                        </button>

                        <div className={styles.dialogHeader}>
                            <div className={styles.successBadgeWrap}>
                                <div className={styles.successPulseRing} />
                                <div className={styles.dialogIcon}>
                                    <RiShieldCheckLine aria-hidden="true" />
                                </div>
                            </div>
                            <span className={styles.dialogTag}>Application Received</span>
                            <h2 id="builder-submitted" className={styles.dialogTitle}>Registration Submitted!</h2>
                            <p className={styles.dialogDesc}>
                                Thanks! Your company details and verification documents have been received. Once reviewed by our team, you can Build Your Page.
                            </p>
                        </div>

                        {/* Company summary card */}
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryTop}>
                                <div className={styles.summaryIcon}>
                                    <RiBuilding2Line aria-hidden="true" />
                                </div>
                                <div className={styles.summaryInfo}>
                                    <h3 className={styles.summaryName}>{form.companyName || "Your Company"}</h3>
                                    <div className={styles.summaryMeta}>
                                        <span className={styles.summaryBadge}>{form.builderType.join(", ") || "Builder"}</span>
                                        <span className={styles.summaryLocation}>
                                            <RiMapPinLine aria-hidden="true" /> {[form.locality, form.district].filter(Boolean).join(", ") || "Kerala"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.summaryDetails}>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Contact Person</span>
                                    <span className={styles.summaryVal}>{form.contactPerson || "—"}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Mobile</span>
                                    <span className={styles.summaryVal}>+91 {form.phone || "—"}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>RERA Number</span>
                                    <span className={styles.summaryVal}>{form.reraNumber || "Submitted"}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Review Status</span>
                                    <span className={styles.statusPill}>
                                        <RiTimeLine aria-hidden="true" /> In verification
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={styles.dialogActions}>
                            <button type="button" className={styles.primaryBtn} onClick={finish} autoFocus>
                                Back to Builders <RiArrowRightLine aria-hidden="true" />
                            </button>
                            <Link href="/" className={styles.dialogSecondaryBtn}>
                                <RiHome4Line aria-hidden="true" /> Home
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <header className={styles.hero}>
                <div className={styles.container}>
                    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
                        <Link href="/">Home</Link>
                        <span aria-hidden="true">/</span>
                        <Link href="/builders">Builders</Link>
                        <span aria-hidden="true">/</span>
                        <span aria-current="page">Register</span>
                    </nav>
                    <h1 className={styles.heroTitle}>Register as a builder</h1>
                    <p className={styles.heroSub}>
                        List your company on KeralaPlots and get enquiries from home buyers and plot owners across Kerala.
                        Every application is checked by our team before it goes live.
                    </p>
                    <ol className={styles.steps}>
                        <li className={styles.stepDone}><span>1</span> Submit details</li>
                        <li><span>2</span> Admin verification</li>
                        <li><span>3</span> Build Your Page</li>
                        <li><span>4</span> Listed on Builders</li>
                    </ol>
                </div>
            </header>

            <main className={styles.container}>
                {existingApplication?.status === "approved" && (
                    <div style={{
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "12px",
                        padding: "20px 24px",
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "16px",
                    }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#065f46", fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>
                                <RiShieldCheckLine style={{ fontSize: "22px", color: "#059669" }} />
                                Approved KeralaPlots Builder
                            </div>
                            <p style={{ margin: 0, color: "#047857", fontSize: "14px" }}>
                                Your registration for <strong>{existingApplication.builder?.company_name}</strong> is verified and active.
                            </p>
                        </div>
                        <Link href="/builder-portal" style={{
                            background: "#059669",
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: "14px",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            Open Builder Portal <RiArrowRightLine />
                        </Link>
                    </div>
                )}

                {existingApplication?.status === "pending" && !submitted && (
                    <div style={{
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "12px",
                        padding: "20px 24px",
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "16px",
                    }}>
                        <RiTimeLine style={{ fontSize: "24px", color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ color: "#92400e", fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>
                                Verification Pending
                            </div>
                            <p style={{ margin: "0 0 10px", color: "#b45309", fontSize: "14px", lineHeight: "1.5" }}>
                                Your application for <strong>{existingApplication.builder?.company_name}</strong> is currently being reviewed by our administrative team.
                                We will notify you once approved.
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "#78350f" }}>
                                <span><strong>RERA:</strong> {existingApplication.builder?.rera_number}</span>
                                <span><strong>District:</strong> {existingApplication.builder?.district}</span>
                                <span><strong>Status:</strong> Under Review</span>
                            </div>
                        </div>
                    </div>
                )}

                {existingApplication?.status === "resubmission_required" && (
                    <div style={{
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "12px",
                        padding: "20px 24px",
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "16px",
                    }}>
                        <RiFileTextLine style={{ fontSize: "24px", color: "#2563eb", flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ color: "#1e40af", fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>
                                Document Resubmission Requested
                            </div>
                            <p style={{ margin: "0 0 8px", color: "#1d4ed8", fontSize: "14px" }}>
                                The admin requested updated documents: <em>&ldquo;{existingApplication.builder?.rejection_reason || "Please provide clearer registration / RERA documents."}&rdquo;</em>
                            </p>
                            <p style={{ margin: 0, color: "#3b82f6", fontSize: "13px" }}>
                                Please re-upload your document below and resubmit.
                            </p>
                        </div>
                    </div>
                )}

                {errors.submit && (
                    <div style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        padding: "14px 18px",
                        marginBottom: "20px",
                        color: "#991b1b",
                        fontSize: "14px"
                    }} role="alert">
                        {errors.submit}
                    </div>
                )}

                <form ref={formRef} className={styles.card} onSubmit={handleSubmit} noValidate>
                    {/* Company */}
                    <fieldset className={styles.section}>
                        <legend className={styles.sectionTitle}>Company details</legend>
                        <div className={styles.grid2}>
                            <Field label="Company name" required error={errors.companyName} htmlFor="companyName">
                                <input id="companyName" className={styles.input} value={form.companyName} onChange={set("companyName")} placeholder="e.g. Periyar Homes & Developers" autoComplete="organization" maxLength={120} {...invalid("companyName")} />
                            </Field>
                        </div>
                        <Field style={{ marginBottom: "20px" }} label="Builder type" required error={errors.builderType} htmlFor="builderType" hint="Select all that apply.">
                            <div id="builderType" className={styles.typeChips} role="group" aria-label="Builder type" {...invalid("builderType")}>
                                {BUILDER_TYPES.map((t) => {
                                    const selected = form.builderType.includes(t);
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`${styles.typeChip} ${selected ? styles.typeChipActive : ""}`}
                                            aria-pressed={selected}
                                            onClick={() => toggleBuilderType(t)}
                                        >
                                            {selected && <RiCheckLine aria-hidden="true" />}
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>
                        </Field>
                        <div className={styles.grid2}>
                            <Field label="Year established" error={errors.establishedYear} htmlFor="establishedYear">
                                <input id="establishedYear" className={styles.input} inputMode="numeric" value={form.establishedYear} onChange={set("establishedYear")} placeholder={`e.g. ${THIS_YEAR - 10}`} maxLength={4} {...invalid("establishedYear")} />
                            </Field>
                            <Field label="RERA registration no." required error={errors.reraNumber} htmlFor="reraNumber" hint="Required for builder verification.">
                                <input id="reraNumber" className={styles.input} value={form.reraNumber} onChange={set("reraNumber")} placeholder="e.g. K-RERA/PRJ/…" maxLength={60} {...invalid("reraNumber")} />
                            </Field>
                        </div>
                        <Field label="About your company" error={errors.about} htmlFor="about" hint={`${form.about.length}/${ABOUT_MAX} characters`}>
                            <textarea id="about" className={`${styles.input} ${styles.textarea}`} value={form.about} onChange={set("about")} rows={4} maxLength={ABOUT_MAX} placeholder="What you build, where you work and what makes you different." {...invalid("about")} />
                        </Field>
                    </fieldset>

                    {/* Contact & location */}
                    <fieldset className={styles.section}>
                        <legend className={styles.sectionTitle}>Contact &amp; location</legend>
                        <div className={styles.grid2}>
                            <Field label="Contact person" required error={errors.contactPerson} htmlFor="contactPerson">
                                <input id="contactPerson" className={styles.input} value={form.contactPerson} onChange={set("contactPerson")} autoComplete="name" maxLength={80} {...invalid("contactPerson")} />
                            </Field>
                            <Field label="Mobile number" required error={errors.phone} htmlFor="phone">
                                <div className={styles.phoneWrap}>
                                    <span className={styles.phonePrefix}>+91</span>
                                    <input id="phone" className={styles.input} type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set("phone")({ target: { value: e.target.value.replace(/\D/g, "").slice(0, 10) } })} placeholder="10-digit mobile" autoComplete="tel-national" {...invalid("phone")} />
                                </div>
                            </Field>
                            <Field label="Email" error={errors.email} htmlFor="email">
                                <input id="email" className={styles.input} type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={120} {...invalid("email")} />
                            </Field>
                            <Field label="Website" error={errors.website} htmlFor="website">
                                <input id="website" className={styles.input} value={form.website} onChange={set("website")} placeholder="www.yourcompany.com" autoComplete="url" maxLength={200} {...invalid("website")} />
                            </Field>
                            <Field label="Main district" required error={errors.district} htmlFor="district">
                                <select id="district" className={styles.input} value={form.district} onChange={set("district")} {...invalid("district")}>
                                    <option value="">Select district</option>
                                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </Field>
                            <Field label="Office locality / town" error={errors.locality} htmlFor="locality">
                                <input id="locality" className={styles.input} value={form.locality} onChange={set("locality")} placeholder="e.g. Kakkanad" maxLength={80} />
                            </Field>
                        </div>
                    </fieldset>

                    {/* Verification */}
                    <fieldset className={styles.section}>
                        <legend className={styles.sectionTitle}>Verification document</legend>
                        <p className={styles.sectionDesc}>
                            Upload your company registration, GST certificate, trade licence or RERA certificate.
                            Only our admin team sees this document.
                        </p>
                        <div data-invalid={!!errors.proof} className={`${styles.proofBox} ${errors.proof ? styles.dropError : ""}`}>
                            <input ref={proofInputRef} id="proof" type="file" accept=".pdf,.jpg,.jpeg,.png" className={styles.srOnly} onChange={pickProof} aria-describedby={errors.proof ? "proof-error" : undefined} />
                            {proof.data ? (
                                <div className={styles.proofFile}>
                                    <RiFileTextLine aria-hidden="true" />
                                    <span className={styles.proofName}>{proof.name}</span>
                                    <span className={styles.proofSize}>{proof.size}</span>
                                    <button type="button" className={`${styles.smallBtn} ${styles.smallBtnDanger}`} onClick={() => setProof((p) => ({ ...p, data: "", name: "", size: "" }))} aria-label="Remove document">
                                        <RiDeleteBinLine aria-hidden="true" />
                                    </button>
                                </div>
                            ) : proof.existing ? (
                                <div className={styles.proofFile}>
                                    <RiCheckLine aria-hidden="true" />
                                    <span className={styles.proofName}>Document already on file</span>
                                    <button type="button" className={styles.smallBtn} onClick={() => proofInputRef.current?.click()}>Replace</button>
                                </div>
                            ) : (
                                <button type="button" className={styles.proofEmpty} onClick={() => proofInputRef.current?.click()}>
                                    <RiUploadCloud2Line aria-hidden="true" />
                                    <span><strong>Upload document</strong> · PDF, JPG or PNG · max 5MB</span>
                                </button>
                            )}
                        </div>
                        {errors.proof && <p className={styles.errorText} id="proof-error" role="alert">{errors.proof}</p>}
                    </fieldset>

                    <div data-invalid={!!errors.agree} className={styles.agreeRow}>
                        <label className={styles.checkbox}>
                            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors((er) => ({ ...er, agree: undefined })); }} />
                            <span>
                                I confirm these details are correct and agree to KeralaPlots’{" "}
                                <Link href="/terms-conditions" target="_blank" rel="noopener noreferrer">terms</Link> and{" "}
                                <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer">privacy policy</Link>.
                            </span>
                        </label>
                        {errors.agree && <p className={styles.errorText} role="alert">{errors.agree}</p>}
                    </div>

                    <div className={styles.submitRow}>
                        <Link href="/builders" className={styles.secondaryBtn}>Cancel</Link>
                        <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                            {submitting ? (
                                <><RiLoader4Line className={styles.spin} aria-hidden="true" /> Submitting…</>
                            ) : (
                                <><RiBuilding2Line aria-hidden="true" /> Submit for verification</>
                            )}
                        </button>
                    </div>
                </form>
            </main>

            <Footer />
        </div>
    );
}
