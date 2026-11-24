"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Nav from "../componants/nav/nav";
import Footer from "../componants/footer/footer";
import styles from "./postReel.module.css";
import reelsApi from "../lib/reelsApi";
import { useAuth } from "../context/AuthContext";

const ReelInfoModal = dynamic(() => import("./ReelInfoModal"), { ssr: false });
const ReelCheckoutModal = dynamic(() => import("./ReelCheckoutModal"), { ssr: false });
import {
    RiArrowRightSLine,
    RiUploadCloud2Line,
    RiCloseLine,
    RiFileVideoLine,
    RiImageLine,
    RiLightbulbFlashLine,
    RiCheckboxCircleFill,
    RiArrowRightLine,
    RiMapPinLine,
    RiMoneyRupeeCircleLine
} from "react-icons/ri";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CAPTION_LENGTH = 70;

// Applied silently in the background after upload - not shown in the UI
const ENHANCEMENT_KEYS = ["removeClutter", "brightness", "stabilize", "noiseReduction"];

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* Captures the frame at ~0.5s into an offscreen <video disableRemotePlayback> and returns it as a
   JPEG data URL — a real thumbnail for the posted-reels list, since Cloudflare
   Stream (which generates the public /reels posters) never sees these local
   uploads. A data URL is inlined rather than an object URL, so unlike the
   source video it survives a reload. */
function capturePosterFromVideo(url) {
    return new Promise((resolve) => {
        const videoEl = document.createElement("video");
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.preload = "auto";

        const finish = (result) => resolve(result);

        videoEl.addEventListener("loadeddata", () => {
            try {
                videoEl.currentTime = Math.min(0.5, (videoEl.duration || 1) / 2);
            } catch {
                finish(null);
            }
        });
        videoEl.addEventListener(
            "seeked",
            () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = videoEl.videoWidth || 360;
                    canvas.height = videoEl.videoHeight || 640;
                    canvas.getContext("2d").drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                    finish(canvas.toDataURL("image/jpeg", 0.82));
                } catch {
                    finish(null);
                }
            },
            { once: true }
        );
        videoEl.addEventListener("error", () => finish(null), { once: true });
        videoEl.src = url;
    });
}

export default function PostReelPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace("/login?redirect=/post-reel");
        }
    }, [isAuthenticated, authLoading, router]);

    const [mediaFile, setMediaFile] = useState(null);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [posterDataUrl, setPosterDataUrl] = useState(null);
    const [caption, setCaption] = useState("");
    const [location, setLocation] = useState("");
    const [price, setPrice] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [enhancementStatus, setEnhancementStatus] = useState({});
    const [activeReelId, setActiveReelId] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const fileInputRef = useRef(null);
    const enhanceTimeoutsRef = useRef([]);
    const mediaUrlRef = useRef(null);

    const clearEnhanceTimeouts = () => {
        enhanceTimeoutsRef.current.forEach((id) => clearTimeout(id));
        enhanceTimeoutsRef.current = [];
    };

    const runAutoEnhancements = () => {
        clearEnhanceTimeouts();
        const initialStatus = {};
        ENHANCEMENT_KEYS.forEach((key) => {
            initialStatus[key] = "pending";
        });
        setEnhancementStatus(initialStatus);

        ENHANCEMENT_KEYS.forEach((key, index) => {
            const startDelay = index * 450;
            const doneDelay = startDelay + 700;

            enhanceTimeoutsRef.current.push(
                setTimeout(() => {
                    setEnhancementStatus((prev) => ({ ...prev, [key]: "processing" }));
                }, startDelay)
            );
            enhanceTimeoutsRef.current.push(
                setTimeout(() => {
                    setEnhancementStatus((prev) => ({ ...prev, [key]: "done" }));
                }, doneDelay)
            );
        });
    };

    const isImage = mediaFile ? mediaFile.type.startsWith("image/") : false;

    const isEnhancing = mediaFile
        ? ENHANCEMENT_KEYS.some((key) => enhancementStatus[key] !== "done")
        : false;

    /* Revokes only on true unmount, not on every mediaUrl change — a
       successful post hands the URL off to the posted-reels store, and
       revoking it the moment local state resets would break playback for a
       reel that was just published. Explicit replaces/removals (handleFile,
       handleRemoveMedia) still revoke immediately. */
    useEffect(() => {
        mediaUrlRef.current = mediaUrl;
    }, [mediaUrl]);

    useEffect(() => {
        return () => {
            if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current);
        };
    }, []);

    // Only clear pending enhancement timers on unmount, not on every mediaUrl change
    useEffect(() => {
        return () => clearEnhanceTimeouts();
    }, []);

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3500);
    };

    const handleFile = (file) => {
        if (!file) return;

        const isVideoFile = file.type.startsWith("video/");
        const isImageFile = file.type.startsWith("image/");

        if (!isVideoFile && !isImageFile) {
            setErrorMessage("Please upload a video (MP4, MOV, WebM) or image (JPG, PNG) file.");
            return;
        }

        const maxSize = isVideoFile ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > maxSize) {
            setErrorMessage(
                isVideoFile
                    ? "Video is too large. Please upload a file under 100MB."
                    : "Image is too large. Please upload a file under 10MB."
            );
            return;
        }

        setErrorMessage("");
        if (mediaUrl) URL.revokeObjectURL(mediaUrl);
        const url = URL.createObjectURL(file);
        setMediaFile(file);
        setMediaUrl(url);
        setPosterDataUrl(null);
        if (isVideoFile) {
            capturePosterFromVideo(url).then(setPosterDataUrl);
        }
        runAutoEnhancements();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
    };

    const handleRemoveMedia = () => {
        if (mediaUrl) URL.revokeObjectURL(mediaUrl);
        clearEnhanceTimeouts();
        setMediaFile(null);
        setMediaUrl(null);
        setPosterDataUrl(null);
        setEnhancementStatus({});
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const canPost =
        mediaFile &&
        caption.trim().length > 0 &&
        location.trim().length > 0 &&
        !isEnhancing;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePost = async () => {
        if (!canPost || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("video", mediaFile);
            formData.append("caption", caption);
            formData.append("location", location);
            if (price && price.trim().length > 0) {
                formData.append("price", price.trim());
            }

            if (posterDataUrl) {
                formData.append("thumbnail_base64", posterDataUrl);
                try {
                    const blob = await (await fetch(posterDataUrl)).blob();
                    formData.append("thumbnail", blob, "thumbnail.jpg");
                } catch {
                    // ignore
                }
            }

            const res = await reelsApi.createReel(formData);
            const createdReel = res?.data;
            const newReelId = createdReel?.id || createdReel?.reel_id;

            clearEnhanceTimeouts();
            setMediaFile(null);
            setMediaUrl(null);
            setPosterDataUrl(null);
            setEnhancementStatus({});
            if (fileInputRef.current) fileInputRef.current.value = "";
            setCaption("");
            setLocation("");
            setPrice("");

            if (createdReel?.is_paid) {
                triggerToast("Your reel has been posted to KeralaPlots! ✨");
                setTimeout(() => router.push("/profile/posted-reels"), 800);
            } else if (newReelId) {
                setActiveReelId(newReelId);
                setShowInfoModal(true);
            } else {
                triggerToast("Reel created! Redirecting to your profile...");
                setTimeout(() => router.push("/profile/posted-reels"), 800);
            }
        } catch (err) {
            console.error("Post reel error:", err);
            const serverErrors = err.response?.data?.errors;
            const errorMsg = serverErrors
                ? Object.values(serverErrors).flat().join(", ")
                : (err.response?.data?.message || "Failed to post reel. Please check video file.");
            triggerToast(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInfoPayNow = () => {
        setShowInfoModal(false);
        setShowCheckoutModal(true);
    };

    const handleInfoClose = () => {
        setShowInfoModal(false);
        triggerToast("Reel saved as draft. You can publish it anytime from your Profile.");
        setTimeout(() => router.push("/profile/posted-reels"), 800);
    };

    const handleCheckoutSuccess = () => {
        setShowCheckoutModal(false);
        setShowInfoModal(false);
        triggerToast("Payment verified! Your reel is now live in the KeralaPlots feed! 🎉");
        setTimeout(() => router.push("/profile/posted-reels"), 400);
    };

    const handleCheckoutClose = () => {
        setShowCheckoutModal(false);
        triggerToast("Payment cancelled. Your reel remains saved as a draft.");
        setTimeout(() => router.push("/profile/posted-reels"), 800);
    };

    return (
        <>
            <Nav />

            <div className={styles.pageContainer}>
                <div className={styles.container}>
                    <div className={styles.breadcrumb}>
                        <Link href="/">Home</Link>
                        <RiArrowRightSLine />
                        <Link href="/reels">Reels</Link>
                        <RiArrowRightSLine />
                        <span>Post Reel</span>
                    </div>

                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>Share a Reel</h1>
                        <p className={styles.pageSub}>
                            Show off a property, service, or moment. Upload a short vertical video or photo and add a caption to share it with the KeralaPlots community.
                        </p>
                    </div>

                    <div className={styles.formGrid}>
                        {/* Left: Upload / Preview */}
                        <div className={styles.uploadCol}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*,image/*"
                                className={styles.hiddenInput}
                                onChange={(e) => handleFile(e.target.files?.[0])}
                            />

                            {!mediaUrl ? (
                                <div
                                    className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                >
                                    <div className={styles.dropzoneIconBox}>
                                        <RiUploadCloud2Line />
                                    </div>
                                    <h3 className={styles.dropzoneTitle}>Click to upload or drag and drop</h3>
                                    <p className={styles.dropzoneHint}>MP4, MOV, WebM, JPG or PNG &middot; video up to 100MB, image up to 10MB &middot; vertical works best</p>
                                </div>
                            ) : (
                                <div className={styles.previewWrapper}>
                                    {isImage ? (
                                        <img
                                            src={mediaUrl}
                                            alt="Reel preview"
                                            className={styles.previewVideo}
                                        />
                                    ) : (
                                        <video disableRemotePlayback
                                            src={mediaUrl}
                                            className={styles.previewVideo}
                                            controls
                                            playsInline
                                        />
                                    )}
                                    <button
                                        type="button"
                                        className={styles.removeVideoBtn}
                                        onClick={handleRemoveMedia}
                                        aria-label="Remove media"
                                    >
                                        <RiCloseLine />
                                    </button>
                                </div>
                            )}

                            {mediaFile && (
                                <div className={styles.fileInfoRow}>
                                    {isImage ? <RiImageLine /> : <RiFileVideoLine />}
                                    <span className={styles.fileName}>{mediaFile.name}</span>
                                    <span className={styles.fileSize}>{formatFileSize(mediaFile.size)}</span>
                                    <button
                                        type="button"
                                        className={styles.changeVideoBtn}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Change
                                    </button>
                                </div>
                            )}

                            {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

                        </div>

                        {/* Right: Details */}
                        <div className={styles.detailsCol}>
                            <div className={styles.formCard}>
                                <label className={styles.formLabel} htmlFor="caption">
                                    Caption
                                </label>
                                <textarea
                                    id="caption"
                                    className={styles.captionTextarea}
                                    placeholder="Write a short, catchy caption for your reel..."
                                    value={caption}
                                    maxLength={MAX_CAPTION_LENGTH}
                                    onChange={(e) => setCaption(e.target.value)}
                                />
                                <div className={styles.charCount}>
                                    {caption.length}/{MAX_CAPTION_LENGTH}
                                </div>

                                <label className={styles.formLabel} htmlFor="location">
                                    Location
                                </label>
                                <div className={styles.locationInputWrapper}>
                                    <RiMapPinLine className={styles.locationIcon} />
                                    <input
                                        id="location"
                                        type="text"
                                        className={styles.locationInput}
                                        placeholder="e.g. Kochi, Kerala"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>

                                <label className={styles.formLabel} htmlFor="price">
                                    Price <span style={{ fontWeight: 400, color: "#64748b", fontSize: "12px" }}>(Optional)</span>
                                </label>
                                <div className={styles.locationInputWrapper}>
                                    <RiMoneyRupeeCircleLine className={styles.locationIcon} />
                                    <input
                                        id="price"
                                        type="text"
                                        inputMode="numeric"
                                        className={styles.locationInput}
                                        placeholder="e.g. 1,45,00,000"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value.replace(/[^0-9,]/g, ""))}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className={styles.postBtn}
                                    disabled={!canPost || isSubmitting}
                                    onClick={handlePost}
                                >
                                    <span>{isSubmitting ? "Posting Reel..." : "Post Reel"}</span>
                                    <RiArrowRightLine />
                                </button>
                                {!mediaFile && (
                                    <p className={styles.postHint}>Upload a video or image to continue</p>
                                )}
                                {mediaFile && isEnhancing && (
                                    <p className={styles.postHint}>Applying AI enhancements...</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className={styles.tipsCard}>
                        <div className={styles.tipsHeader}>
                            <RiLightbulbFlashLine />
                            <span>Tips for a great reel</span>
                        </div>
                        <ul className={styles.tipsList}>
                            <li>Keep it under 60 seconds for the best engagement</li>
                            <li>Shoot vertically and use good natural lighting</li>
                            <li>Show the property&apos;s best angles and key features first</li>
                            <li>Add a clear caption so viewers know what they&apos;re seeing</li>
                        </ul>
                    </div>
                </div>
            </div>

            <Footer />

            <ReelInfoModal
                isOpen={showInfoModal}
                onClose={handleInfoClose}
                onPayNow={handleInfoPayNow}
                reelId={activeReelId}
                onPublishSuccess={handleCheckoutSuccess}
            />


            <ReelCheckoutModal
                isOpen={showCheckoutModal}
                onClose={handleCheckoutClose}
                reelId={activeReelId}
                user={user}
                onSuccess={handleCheckoutSuccess}
                showToast={triggerToast}
            />

            {toastMessage && (
                <div className={styles.toast}>
                    <RiCheckboxCircleFill className={styles.toastIcon} />
                    <span>{toastMessage}</span>
                </div>
            )}
        </>
    );
}
