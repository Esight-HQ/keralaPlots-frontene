"use client";

import { use, useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../../../componants/nav/nav";
import Footer from "../../../componants/footer/footer";
import styles from "../../postReel.module.css";
import {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    updatePostedReels,
} from "../../../lib/postedReelsStore";
import {
    RiArrowRightSLine,
    RiUploadCloud2Line,
    RiCloseLine,
    RiFileVideoLine,
    RiImageLine,
    RiCheckboxCircleFill,
    RiArrowRightLine,
    RiMapPinLine,
    RiMoneyRupeeCircleLine,
} from "react-icons/ri";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CAPTION_LENGTH = 70;

// Applied silently in the background after a new upload - not shown in the UI
const ENHANCEMENT_KEYS = ["removeClutter", "brightness", "stabilize", "noiseReduction"];

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* Same frame-capture helper as /post-reel: grabs the ~0.5s frame of an
   offscreen <video disableRemotePlayback> as a JPEG data URL, so a freshly swapped-in video gets a
   real thumbnail instead of losing its poster on reload. */
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

export default function EditReelPage({ params }) {
    const { id } = use(params);
    const router = useRouter();

    const { hydrated, list: reels } = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );
    const reel = reels.find((r) => String(r.id) === String(id));

    // New-upload state — null until the user picks a replacement file, in
    // which case it takes over the preview from the reel's existing media.
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
    const [loadedReelId, setLoadedReelId] = useState(null);
    const fileInputRef = useRef(null);
    const enhanceTimeoutsRef = useRef([]);
    const mediaUrlRef = useRef(null);

    // Seeds the form from the reel once it's available — a plain assignment
    // in render would re-run on every keystroke, wiping edits in progress.
    useEffect(() => {
        if (!reel || loadedReelId === reel.id) return;
        setCaption(reel.caption);
        setLocation(reel.location);
        setPrice(reel.price ? reel.price.replace(/^₹/, "") : "");
        setLoadedReelId(reel.id);
    }, [reel, loadedReelId]);

    const clearEnhanceTimeouts = () => {
        enhanceTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
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

    const isImage = mediaFile ? mediaFile.type.startsWith("image/") : reel?.mediaType === "image";
    const hasNewMedia = Boolean(mediaFile);

    const isEnhancing = mediaFile
        ? ENHANCEMENT_KEYS.some((key) => enhancementStatus[key] !== "done")
        : false;

    useEffect(() => {
        mediaUrlRef.current = mediaUrl;
    }, [mediaUrl]);

    // Revokes only on true unmount — see /post-reel for why this can't be
    // keyed on mediaUrl: a saved swap hands the URL to the store, and an
    // eager revoke there would break playback for what was just published.
    useEffect(() => {
        return () => {
            if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current);
        };
    }, []);

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

    /* Discards the newly picked file and falls back to the reel's original
       media — not a delete, since a reel always needs something to show. */
    const handleDiscardNewMedia = () => {
        if (mediaUrl) URL.revokeObjectURL(mediaUrl);
        clearEnhanceTimeouts();
        setMediaFile(null);
        setMediaUrl(null);
        setPosterDataUrl(null);
        setEnhancementStatus({});
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const canSave =
        reel &&
        caption.trim().length > 0 &&
        location.trim().length > 0 &&
        !isEnhancing;

    const handleSave = () => {
        if (!canSave) return;

        const updates = {
            caption: caption.trim(),
            location: location.trim(),
            price: price.trim() ? `₹${price.trim()}` : null,
        };

        if (hasNewMedia) {
            updates.mediaType = isImage ? "image" : "video";
            updates.mediaUrl = mediaUrl;
            updates.poster = isImage ? mediaUrl : posterDataUrl || reel.poster;
        }

        updatePostedReels((prev) => prev.map((r) => (r.id === reel.id ? { ...r, ...updates } : r)));

        triggerToast("Your reel has been updated!");

        // Hands the new mediaUrl off to the store without revoking it — see
        // handleFile's comment on why an eager revoke here would break
        // playback for the media that was just saved.
        clearEnhanceTimeouts();
        setMediaFile(null);
        setMediaUrl(null);
        setPosterDataUrl(null);
        setEnhancementStatus({});
        if (fileInputRef.current) fileInputRef.current.value = "";

        setTimeout(() => router.push("/profile/posted-reels"), 900);
    };

    if (hydrated && !reel) {
        return (
            <>
                <Nav />
                <div className={styles.pageContainer}>
                    <div className={styles.container}>
                        <div className={styles.pageHeader} style={{ paddingTop: 130, textAlign: "center" }}>
                            <h1 className={styles.pageTitle}>Reel Not Found</h1>
                            <p className={styles.pageSub} style={{ margin: "0 auto" }}>
                                We couldn&apos;t find the reel you&apos;re trying to edit.
                            </p>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    const displayUrl = hasNewMedia ? mediaUrl : reel?.mediaUrl;

    return (
        <>
            <Nav />

            <div className={styles.pageContainer}>
                <div className={styles.container}>
                    <div className={styles.breadcrumb}>
                        <Link href="/">Home</Link>
                        <RiArrowRightSLine />
                        <Link href="/profile/posted-reels">My Posted Reels</Link>
                        <RiArrowRightSLine />
                        <span>Edit Reel</span>
                    </div>

                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>Edit Reel</h1>
                        <p className={styles.pageSub}>
                            Update the caption, location or price — or swap the video/photo entirely.
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

                            {!displayUrl ? (
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
                                            src={displayUrl}
                                            alt="Reel preview"
                                            className={styles.previewVideo}
                                        />
                                    ) : (
                                        <video disableRemotePlayback
                                            src={displayUrl}
                                            className={styles.previewVideo}
                                            controls
                                            playsInline
                                        />
                                    )}
                                    {hasNewMedia ? (
                                        <button
                                            type="button"
                                            className={styles.removeVideoBtn}
                                            onClick={handleDiscardNewMedia}
                                            aria-label="Discard new upload"
                                            title="Keep original media"
                                        >
                                            <RiCloseLine />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.removeVideoBtn}
                                            onClick={() => fileInputRef.current?.click()}
                                            aria-label="Change media"
                                            title="Change media"
                                        >
                                            <RiCloseLine />
                                        </button>
                                    )}
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
                                    Price
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
                                    disabled={!canSave}
                                    onClick={handleSave}
                                >
                                    <span>Save Changes</span>
                                    <RiArrowRightLine />
                                </button>
                                <Link
                                    href="/profile/posted-reels"
                                    className={styles.postHint}
                                    style={{ display: "block", textDecoration: "underline", cursor: "pointer" }}
                                >
                                    Cancel and go back
                                </Link>
                                {mediaFile && isEnhancing && (
                                    <p className={styles.postHint}>Applying AI enhancements...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />

            {toastMessage && (
                <div className={styles.toast}>
                    <RiCheckboxCircleFill className={styles.toastIcon} />
                    <span>{toastMessage}</span>
                </div>
            )}
        </>
    );
}
