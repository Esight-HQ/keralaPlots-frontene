"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { propertyWizardApi } from "../lib/propertyWizardApi";
import { formatPropertyMediaUrl, formatPropertyImgUrl } from "../lib/api";
import {
    RiSparkling2Fill,
    RiRefreshLine,
    RiPlayCircleFill,
    RiPlayFill,
    RiPauseFill,
    RiLoader4Line,
    RiCheckDoubleLine,
    RiDeleteBinLine,
    RiUploadCloud2Line,
    RiVolumeUpLine,
    RiVolumeMuteLine,
    RiFullscreenLine,
    RiMusic2Line,
    RiTimeLine,
    RiClosedCaptioningLine,
    RiImageAddLine,
    RiFilmLine,
    RiPriceTag3Line,
    RiLockLine,
    RiCheckboxCircleFill,
    RiArrowRightLine,
} from "react-icons/ri";

function formatTimeMMSS(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function ReelVideoCardPlayer({ src, poster, isAiMalayalam, fallbackDuration }) {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const isScrubbingRef = useRef(false);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(Number(fallbackDuration) || 0);
    const [muted, setMuted] = useState(false);
    const [isFs, setIsFs] = useState(false);

    useEffect(() => {
        const onFs = () => {
            setIsFs(
                document.fullscreenElement === containerRef.current ||
                    document.webkitFullscreenElement === containerRef.current
            );
        };
        document.addEventListener("fullscreenchange", onFs);
        document.addEventListener("webkitfullscreenchange", onFs);
        return () => {
            document.removeEventListener("fullscreenchange", onFs);
            document.removeEventListener("webkitfullscreenchange", onFs);
        };
    }, []);

    const togglePlay = () => {
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) {
            el.play().catch(() => {});
        } else {
            el.pause();
        }
    };

    const toggleMute = () => {
        const el = videoRef.current;
        if (!el) return;
        el.muted = !el.muted;
        setMuted(el.muted);
    };

    const seekTo = (targetSec) => {
        const el = videoRef.current;
        if (!el || !Number.isFinite(targetSec)) return;
        const maxDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
        const clamped = Math.max(0, maxDur > 0 ? Math.min(maxDur, targetSec) : targetSec);
        el.currentTime = clamped;
        setCurrentTime(clamped);
    };

    const handleSeek = (e) => {
        seekTo(Number(e.target.value));
    };

    const skipBy = (delta) => {
        const el = videoRef.current;
        const base = el ? (el.currentTime || 0) : currentTime;
        seekTo(base + delta);
    };

    const toggleFs = () => {
        const target = containerRef.current;
        if (!target) return;
        if (document.fullscreenElement === target || document.webkitFullscreenElement === target) {
            (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        } else {
            (target.requestFullscreen || target.webkitRequestFullscreen)?.call(target);
        }
    };

    const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

    return (
        <div
            ref={containerRef}
            style={{
                display: "flex",
                flexDirection: "column",
                background: "#020617",
            }}
        >
            <div
                onClick={togglePlay}
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: isFs ? undefined : "9 / 14",
                    flex: isFs ? "1 1 auto" : undefined,
                    minHeight: isFs ? 0 : undefined,
                    background: "#020617",
                    cursor: "pointer",
                    overflow: "hidden",
                }}
            >
                <video
                    ref={videoRef}
                    src={src}
                    poster={poster}
                    playsInline
                    preload="metadata"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                    onTimeUpdate={(e) => {
                        if (!isScrubbingRef.current) {
                            setCurrentTime(e.currentTarget.currentTime || 0);
                        }
                    }}
                    onLoadedMetadata={(e) => {
                        if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
                            setDuration(e.currentTarget.duration);
                        }
                    }}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                    }}
                />
                {!playing && (
                    <span
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            background: "rgba(37, 99, 235, 0.92)",
                            color: "#ffffff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "24px",
                            boxShadow: "0 10px 26px rgba(0, 0, 0, 0.45)",
                            pointerEvents: "none",
                        }}
                    >
                        <RiPlayFill style={{ marginLeft: "2px" }} />
                    </span>
                )}
                {isAiMalayalam && (
                    <span
                        style={{
                            position: "absolute",
                            top: "10px",
                            left: "10px",
                            background: "rgba(37, 99, 235, 0.92)",
                            color: "#ffffff",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: "999px",
                            pointerEvents: "none",
                        }}
                    >
                        മലയാളം AI Reel
                    </span>
                )}
            </div>

            {/* Dedicated docked control bar below 9:14 Reel frame so controls never overlap video or subtitles */}
            <div
                style={{
                    padding: "8px 10px 9px",
                    background: "#0f172a",
                    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    color: "#f8fafc",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="range"
                        min={0}
                        max={duration > 0 ? duration : 1}
                        step={0.1}
                        value={Math.min(currentTime, duration > 0 ? duration : 1)}
                        onMouseDown={() => {
                            isScrubbingRef.current = true;
                        }}
                        onTouchStart={() => {
                            isScrubbingRef.current = true;
                        }}
                        onPointerDown={() => {
                            isScrubbingRef.current = true;
                        }}
                        onMouseUp={() => {
                            isScrubbingRef.current = false;
                        }}
                        onTouchEnd={() => {
                            isScrubbingRef.current = false;
                        }}
                        onPointerUp={() => {
                            isScrubbingRef.current = false;
                        }}
                        onChange={handleSeek}
                        aria-label="Seek video"
                        style={{
                            flex: 1,
                            minWidth: "60px",
                            height: "5px",
                            accentColor: "#3b82f6",
                            cursor: "pointer",
                            background: `linear-gradient(to right, #3b82f6 ${pct}%, rgba(255,255,255,0.24) ${pct}%)`,
                            borderRadius: "999px",
                        }}
                    />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <button
                            type="button"
                            onClick={togglePlay}
                            aria-label={playing ? "Pause video" : "Play video"}
                            style={{
                                background: "rgba(255, 255, 255, 0.12)",
                                border: "none",
                                borderRadius: "7px",
                                width: "28px",
                                height: "26px",
                                color: "#ffffff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                        >
                            {playing ? <RiPauseFill /> : <RiPlayFill />}
                        </button>

                        <button
                            type="button"
                            onClick={() => skipBy(-5)}
                            aria-label="Backward 5 seconds"
                            style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "none",
                                borderRadius: "6px",
                                height: "26px",
                                padding: "0 6px",
                                color: "#cbd5e1",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                        >
                            -5s
                        </button>

                        <button
                            type="button"
                            onClick={() => skipBy(5)}
                            aria-label="Forward 5 seconds"
                            style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "none",
                                borderRadius: "6px",
                                height: "26px",
                                padding: "0 6px",
                                color: "#cbd5e1",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                        >
                            +5s
                        </button>
                    </div>

                    <span
                        style={{
                            fontSize: "11.5px",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            color: "#e2e8f0",
                            flexShrink: 0,
                        }}
                    >
                        {formatTimeMMSS(currentTime)} / {formatTimeMMSS(duration)}
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-label={muted ? "Unmute video" : "Mute video"}
                            style={{
                                background: "transparent",
                                border: "none",
                                width: "26px",
                                height: "26px",
                                color: "#e2e8f0",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                        >
                            {muted ? <RiVolumeMuteLine /> : <RiVolumeUpLine />}
                        </button>

                        <button
                            type="button"
                            onClick={toggleFs}
                            aria-label={isFs ? "Exit fullscreen" : "Fullscreen video"}
                            style={{
                                background: "transparent",
                                border: "none",
                                width: "26px",
                                height: "26px",
                                color: "#e2e8f0",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "15px",
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                        >
                            <RiFullscreenLine />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const MUSIC_OPTIONS = [
    { id: "calm_acoustic", name: "Gentle Acoustic", mood: "Plots & Land" },
    { id: "premium_ambient", name: "Quiet Architecture", mood: "Villas & Homes" },
    { id: "soft_cinematic", name: "Soft Cinematic", mood: "Apartments" },
    { id: "modern_upbeat", name: "Modern Pulse", mood: "Commercial" },
    { id: "nature_ambient", name: "Kerala Hills & Breeze", mood: "Estates & Green" },
    { id: "none", name: "Voiceover Only", mood: "No Background Music" },
];

export default function PropertyReelGenerator({
    formData,
    setFormData,
    propertyId,
    getActivePropertyId,
    persistStep,
    goToStep,
    showToast,
    compactMode = false,
    reelEntitlement = null,
    onFinishAfterReelUnlock = null,
}) {
    const canCreateReel = Boolean(reelEntitlement?.canCreateReel);
    const standardFee = Number(reelEntitlement?.standardFee || 300);
    const bundleFee = Number(reelEntitlement?.bundleFee || 500);
    const justUnlocked = Boolean(reelEntitlement?.justUnlocked);
    const entitlementSource = reelEntitlement?.source || null;
    const entitlementPlanTitle = reelEntitlement?.planTitle || null;

    const photos = formData?.media?.photos || [];
    const videos = formData?.media?.videos || [];

    const [narrationText, setNarrationText] = useState("");
    const [scriptTouched, setScriptTouched] = useState(false);
    const [estimatedSeconds, setEstimatedSeconds] = useState(0);
    const [duration, setDuration] = useState(30);
    const [musicId, setMusicId] = useState("calm_acoustic");
    const [subtitles, setSubtitles] = useState(true);
    const [narratePrice, setNarratePrice] = useState(true);
    const [publishToReels, setPublishToReels] = useState(true);
    const [warnings, setWarnings] = useState([]);

    const [isDraftingScript, setIsDraftingScript] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderStage, setRenderStage] = useState("");
    const [renderError, setRenderError] = useState("");
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [deletingVideoId, setDeletingVideoId] = useState(null);
    const [videoToDelete, setVideoToDelete] = useState(null);

    const pollTimerRef = useRef(null);
    const autoDraftedOnceRef = useRef(false);
    const videoUploadRef = useRef(null);

    useEffect(() => {
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, []);

    const draftMalayalamScript = useCallback(
        async (overrideOpts = {}, silent = false) => {
            setIsDraftingScript(true);
            setRenderError("");
            try {
                const targetDur = overrideOpts.duration ?? duration;
                const targetNarratePrice = overrideOpts.narratePrice ?? narratePrice;
                const res = await propertyWizardApi.draftReelScript(propertyId || 0, {
                    duration: targetDur,
                    narrate_price: targetNarratePrice,
                    speed: 1.03,
                    force_structured: Boolean(overrideOpts.forceStructured),
                    formData,
                });

                if (res?.success && res?.data) {
                    setNarrationText(res.data.narration_text || "");
                    setEstimatedSeconds(Number(res.data.estimated_seconds || 0));
                    if (res.data.recommended_duration && !overrideOpts.keepDuration) {
                        setDuration(res.data.recommended_duration);
                    }
                    if (res.data.music_id && !overrideOpts.keepMusic) {
                        setMusicId(res.data.music_id);
                    }
                    setWarnings(Array.isArray(res.data.warnings) ? res.data.warnings : []);
                    setScriptTouched(false);
                    if (!silent && showToast) {
                        showToast("Malayalam voiceover script drafted from your property details & description.");
                    }
                } else if (!silent && res?.message) {
                    setRenderError(res.message);
                }
            } catch (err) {
                if (!silent) {
                    setRenderError(err?.message || "Could not draft Malayalam script.");
                }
            } finally {
                setIsDraftingScript(false);
            }
        },
        [propertyId, duration, narratePrice, formData, showToast]
    );

    // Auto-draft initial Malayalam script once on mount when key property details exist and Reel Studio is unlocked
    useEffect(() => {
        if (!canCreateReel || autoDraftedOnceRef.current || compactMode) return;
        const hasContext =
            Boolean(formData?.location?.locality || formData?.location?.district) ||
            Boolean(formData?.description?.description);
        if (hasContext && !narrationText) {
            autoDraftedOnceRef.current = true;
            const t = setTimeout(() => {
                draftMalayalamScript({}, true);
            }, 40);
            return () => clearTimeout(t);
        }
    }, [canCreateReel, compactMode, formData?.location?.locality, formData?.location?.district, formData?.description?.description, narrationText, draftMalayalamScript]);

    const syncVideosToForm = useCallback(
        (nextVideos) => {
            const cleanList = Array.isArray(nextVideos) ? nextVideos : [];
            setFormData((prev) => ({
                ...prev,
                media: {
                    ...prev.media,
                    videos: cleanList,
                    reelVideo: cleanList[0] || null,
                    videoUrl: cleanList[0]?.url || "",
                },
            }));
        },
        [setFormData]
    );

    const startPollingJob = (activePropId, jobId) => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);

        pollTimerRef.current = setInterval(async () => {
            const res = await propertyWizardApi.getReelStatus(activePropId, jobId);
            if (!res?.success || !res?.data) return;

            const st = res.data;
            setRenderProgress(Number(st.progress || 15));
            if (st.stage_label) setRenderStage(st.stage_label);

            if (st.status === "completed") {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
                setIsGenerating(false);
                setRenderProgress(100);
                setRenderStage("Malayalam Reel ready & added to Property Images Gallery!");

                const updatedVideos =
                    Array.isArray(st.videos) && st.videos.length > 0
                        ? st.videos
                        : st.video
                        ? [st.video, ...videos.filter((v) => !v.is_ai_malayalam)]
                        : videos;

                syncVideosToForm(updatedVideos);
                if (showToast) {
                    showToast("Malayalam speaking property reel generated & added to your property gallery! 🎬");
                }
            } else if (st.status === "failed" || st.status === "cancelled") {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
                setIsGenerating(false);
                setRenderError(st.error || "Reel generation failed. Please try again.");
                if (showToast) {
                    showToast(st.error || "Could not generate reel. Please check your script & photos.");
                }
            }
        }, 1800);
    };

    const handleGenerateReel = async () => {
        if (isGenerating) return;
        setRenderError("");

        if (!photos.length) {
            setRenderError("Please add at least 1 property photo in Step 6 (Photos & Videos) before generating the reel.");
            if (showToast) showToast("Upload at least 1 property photo first.");
            return;
        }

        setIsGenerating(true);
        setRenderProgress(5);
        setRenderStage("Saving property photos & details...");

        try {
            const activeId = (await (getActivePropertyId ? getActivePropertyId() : Promise.resolve(propertyId))) || propertyId;
            if (!activeId) {
                throw new Error("Could not create or load property draft. Please ensure you are signed in.");
            }

            // Ensure any local blob photos & latest wizard steps are persisted before rendering
            if (persistStep) {
                const hasUnsavedBlobPhotos = photos.some(
                    (p) => p?.file instanceof File || p?.file instanceof Blob || String(p?.url || "").startsWith("blob:")
                );
                if (hasUnsavedBlobPhotos) {
                    setRenderStage("Uploading property photos for video scenes...");
                    await persistStep(6, formData);
                }
                await Promise.all([
                    persistStep(3, formData),
                    persistStep(4, formData),
                    persistStep(5, formData),
                    persistStep(7, formData),
                ]);
            }

            setRenderProgress(12);
            setRenderStage("Starting Malayalam Neural Voice & 1080×1920 Reel Renderer...");

            const serverPhotoUrls = (formData?.media?.photos || [])
                .map((p) => p?.url)
                .filter((u) => u && !String(u).startsWith("blob:"));

            const res = await propertyWizardApi.generateReel(activeId, {
                narration_text: scriptTouched && narrationText.trim() ? narrationText.trim() : narrationText.trim() || "",
                duration,
                music_id: musicId,
                subtitles,
                narrate_price: narratePrice,
                publish_to_reels: publishToReels,
                speed: 1.03,
                image_urls: serverPhotoUrls,
                formData,
            });

            if (!res?.success || !res?.data?.job_id) {
                throw new Error(res?.message || "Failed to start Malayalam reel generation.");
            }

            if (res.data.narration_text) {
                setNarrationText(res.data.narration_text);
            }
            if (res.data.estimated_seconds) {
                setEstimatedSeconds(Number(res.data.estimated_seconds));
            }
            if (res.data.duration) {
                setDuration(Number(res.data.duration));
            }

            setRenderProgress(Number(res.data.progress || 16));
            setRenderStage(res.data.stage_label || "Synthesizing Malayalam voiceover...");
            startPollingJob(activeId, res.data.job_id);
        } catch (err) {
            setIsGenerating(false);
            setRenderError(err?.message || "Failed to generate Malayalam reel.");
            if (showToast) showToast(err?.message || "Failed to generate Malayalam reel.");
        }
    };

    const handleManualVideoUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (file.size > 100 * 1024 * 1024) {
            if (showToast) showToast("Video file must be under 100 MB.");
            return;
        }

        setIsUploadingVideo(true);
        setRenderError("");
        try {
            const activeId = (await (getActivePropertyId ? getActivePropertyId() : Promise.resolve(propertyId))) || propertyId;
            if (!activeId) {
                throw new Error("Could not initialize property draft.");
            }
            const res = await propertyWizardApi.uploadPropertyVideo(activeId, file, "Property Walkthrough Video");
            if (!res?.success) {
                throw new Error(res?.message || "Video upload failed.");
            }
            if (Array.isArray(res.data?.videos)) {
                syncVideosToForm(res.data.videos);
            } else if (res.data?.video) {
                syncVideosToForm([...videos, res.data.video]);
            }
            if (showToast) showToast("Video uploaded & listed alongside your property images!");
        } catch (err) {
            setRenderError(err?.message || "Could not upload video.");
            if (showToast) showToast(err?.message || "Could not upload video.");
        } finally {
            setIsUploadingVideo(false);
        }
    };

    const handleDeleteVideo = async (vid) => {
        if (!vid?.id) return;
        const activeId = propertyId;
        if (!activeId) {
            syncVideosToForm(videos.filter((v) => String(v.id) !== String(vid.id)));
            return;
        }

        setDeletingVideoId(vid.id);
        try {
            const res = await propertyWizardApi.deletePropertyVideo(activeId, vid.id);
            if (res?.success && Array.isArray(res.data?.videos)) {
                syncVideosToForm(res.data.videos);
            } else {
                syncVideosToForm(videos.filter((v) => String(v.id) !== String(vid.id)));
            }
            if (showToast) showToast("Video removed from property gallery.");
        } catch (_) {
            syncVideosToForm(videos.filter((v) => String(v.id) !== String(vid.id)));
        } finally {
            setDeletingVideoId(null);
            setVideoToDelete(null);
        }
    };

    const handleToggleNarratePrice = () => {
        const nextVal = !narratePrice;
        setNarratePrice(nextVal);
        draftMalayalamScript({ narratePrice: nextVal, keepDuration: true, keepMusic: true }, true);
    };

    const coverPhoto =
        photos[formData?.media?.coverIndex || 0] || photos[0] || null;
    const demoPreviewImg = coverPhoto?.url
        ? coverPhoto.url.startsWith("blob:") || coverPhoto.url.startsWith("data:")
            ? coverPhoto.url
            : formatPropertyImgUrl(coverPhoto.url)
        : null;

    // -----------------------------------------------------------------------
    // DEMO & DESCRIPTION SECTION (Shown first when user has NOT yet unlocked
    // Reel Creation via ₹500 Property+Reel payment or Active Agent/Builder Plan;
    // hidden completely when editing an already-paid ₹300 standard listing)
    // -----------------------------------------------------------------------
    if (!canCreateReel) {
        if (reelEntitlement?.loaded === false || reelEntitlement?.hideDemo) {
            return null;
        }
        return (
            <div
                id="property-reel-studio"
                style={{
                    marginTop: compactMode ? "24px" : "28px",
                    borderRadius: "18px",
                    border: "1.5px solid #c7d2fe",
                    background: "linear-gradient(180deg, #f5f7ff 0%, #ffffff 100%)",
                    padding: compactMode ? "20px" : "24px",
                    boxShadow: "0 10px 30px -12px rgba(79, 70, 229, 0.14)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 11px",
                            borderRadius: "999px",
                            background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
                            color: "#ffffff",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                        }}
                    >
                        <RiSparkling2Fill /> MALAYALAM AI REEL STUDIO &bull; DEMO PREVIEW
                    </span>
                    <span
                        style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#4338ca",
                            background: "#eef2ff",
                            padding: "3px 10px",
                            borderRadius: "999px",
                        }}
                    >
                        9:16 HD &bull; Neural Malayalam Voiceover + Subtitles
                    </span>
                </div>

                <h3
                    style={{
                        fontSize: "17.5px",
                        fontWeight: 700,
                        color: "#0f172a",
                        margin: "10px 0 6px 0",
                    }}
                >
                    Create Malayalam Speaking Property Video (Demo &amp; Overview)
                </h3>
                <p style={{ fontSize: "13.5px", color: "#475569", margin: "0 0 18px 0", lineHeight: 1.55 }}>
                    Turn your uploaded property photos, location, price, and description into an engaging{" "}
                    <strong>9:16 HD Malayalam narrated property reel</strong> with synchronized Malayalam subtitles and
                    background music — showcased directly inside your property image gallery to attract more buyers.
                </p>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                        gap: "18px",
                        alignItems: "stretch",
                    }}
                >
                    {/* Visual 9:16 Demo Reel Mockup */}
                    <div
                        style={{
                            position: "relative",
                            minHeight: "230px",
                            borderRadius: "14px",
                            overflow: "hidden",
                            background: demoPreviewImg
                                ? `linear-gradient(180deg, rgba(15,23,42,0.28) 0%, rgba(15,23,42,0.82) 100%), url("${demoPreviewImg}") center/cover no-repeat`
                                : "linear-gradient(155deg, #1e1b4b 0%, #312e81 52%, #0f172a 100%)",
                            padding: "14px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            color: "#ffffff",
                            border: "1px solid rgba(99, 102, 241, 0.35)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                            <span
                                style={{
                                    background: "rgba(37, 99, 235, 0.92)",
                                    padding: "3px 9px",
                                    borderRadius: "999px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                }}
                            >
                                മലയാളം AI Reel Demo
                            </span>
                            <span
                                style={{
                                    background: "rgba(15, 23, 42, 0.72)",
                                    padding: "3px 8px",
                                    borderRadius: "999px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                }}
                            >
                                15s / 30s / 45s HD
                            </span>
                        </div>

                        <div style={{ textAlign: "center", margin: "16px 0" }}>
                            <div
                                style={{
                                    width: "46px",
                                    height: "46px",
                                    borderRadius: "50%",
                                    background: "rgba(255,255,255,0.2)",
                                    backdropFilter: "blur(6px)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1.5px solid rgba(255,255,255,0.5)",
                                }}
                            >
                                <RiPlayFill size={24} />
                            </div>
                            <div style={{ fontSize: "11.5px", marginTop: "6px", opacity: 0.92, fontWeight: 600 }}>
                                {photos.length > 0
                                    ? `${photos.length} Property Photo${photos.length === 1 ? "" : "s"} Ready for Reel`
                                    : "Auto-staged from your Property Photos"}
                            </div>
                        </div>

                        <div>
                            <div
                                style={{
                                    background: "rgba(15, 23, 42, 0.82)",
                                    borderRadius: "8px",
                                    padding: "7px 10px",
                                    fontSize: "11.5px",
                                    textAlign: "center",
                                    lineHeight: 1.45,
                                    border: "1px solid rgba(255,255,255,0.16)",
                                }}
                            >
                                “എല്ലാ സൗകര്യങ്ങളോടും കൂടിയ മനോഹരമായ പ്രോപ്പർട്ടി വിൽപ്പനയ്ക്ക്...”
                            </div>
                            <div
                                style={{
                                    marginTop: "8px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    fontSize: "11px",
                                    opacity: 0.9,
                                }}
                            >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <RiVolumeUpLine /> Studio Malayalam Voice
                                </span>
                                <span>Auto Subtitles ✓</span>
                            </div>
                        </div>
                    </div>

                    {/* Description & Unlock Provision Details */}
                    <div
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "14px",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "12px",
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: "#1e293b",
                                    marginBottom: "10px",
                                }}
                            >
                                What You Get With Reel Creation Provision:
                            </div>
                            <ul
                                style={{
                                    margin: 0,
                                    padding: 0,
                                    listStyle: "none",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                    fontSize: "12.8px",
                                    color: "#334155",
                                }}
                            >
                                <li style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                    <RiCheckboxCircleFill style={{ color: "#4f46e5", marginTop: "2px", flexShrink: 0 }} />
                                    <span>
                                        <strong>Auto-Drafted Malayalam Script:</strong> Built from your property details,
                                        location &amp; price — fully editable before voice generation.
                                    </span>
                                </li>
                                <li style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                    <RiCheckboxCircleFill style={{ color: "#4f46e5", marginTop: "2px", flexShrink: 0 }} />
                                    <span>
                                        <strong>9:16 HD Malayalam AI Reel:</strong> Automatically renders a Malayalam
                                        speaking video with subtitles and background music directly into your gallery.
                                    </span>
                                </li>
                                <li style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                    <RiCheckboxCircleFill style={{ color: "#059669", marginTop: "2px", flexShrink: 0 }} />
                                    <span>
                                        <strong>Included for Agent &amp; Builder Plans:</strong> Unlocked automatically
                                        when you have an active Agent or Builder plan with available property limit{" "}
                                        <em>(does not deduct from your plan&apos;s Reel count)</em>.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div
                            style={{
                                background: "#f5f3ff",
                                border: "1px solid #ddd6fe",
                                borderRadius: "10px",
                                padding: "10px 12px",
                                fontSize: "12.5px",
                                color: "#4c1d95",
                                lineHeight: 1.5,
                            }}
                        >
                            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                                <RiLockLine size={14} /> How to Unlock Reel Creation on Publish:
                            </div>
                            Click <strong>Publish Property</strong> and choose{" "}
                            <strong>Property Listing + Reel Creation (₹{bundleFee})</strong> to unlock this studio, or
                            choose <strong>Standard Property Listing (₹{standardFee})</strong> for photo listing only.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            id="property-reel-studio"
            style={{
                marginTop: compactMode ? "24px" : "28px",
                borderRadius: "18px",
                border: "1.5px solid #dbeafe",
                background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
                padding: compactMode ? "20px" : "24px",
                boxShadow: "0 10px 30px -12px rgba(37, 99, 235, 0.14)",
            }}
        >
            {justUnlocked && (
                <div
                    style={{
                        marginBottom: "16px",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: "#ecfdf5",
                        border: "1.5px solid #10b981",
                        color: "#065f46",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "10px",
                    }}
                >
                    <div style={{ fontSize: "13.5px", fontWeight: 600 }}>
                        🎉 <strong>₹{bundleFee} Payment Confirmed!</strong> Your property is now published live &amp; Malayalam AI Reel Studio is unlocked. Generate your Malayalam speaking property video below!
                    </div>
                    {onFinishAfterReelUnlock && (
                        <button
                            type="button"
                            onClick={onFinishAfterReelUnlock}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                borderRadius: "9px",
                                border: "none",
                                background: "#059669",
                                color: "#ffffff",
                                fontSize: "12.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            <span>Finish &amp; View My Properties</span>
                            <RiArrowRightLine size={15} />
                        </button>
                    )}
                </div>
            )}

            {/* Studio Header */}
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "16px",
                }}
            >
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
                                color: "#ffffff",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                letterSpacing: "0.02em",
                            }}
                        >
                            <RiSparkling2Fill /> MALAYALAM AI REEL STUDIO
                        </span>
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#065f46",
                                background: "#ecfdf5",
                                border: "1px solid #a7f3d0",
                                padding: "3px 10px",
                                borderRadius: "999px",
                            }}
                        >
                            {entitlementSource === "paid_reel_bundle"
                                ? `✓ Unlocked (₹${bundleFee} Property + Reel Package)`
                                : `✓ Included with ${entitlementPlanTitle || "Active Plan"} · 0 Reel Quota Used`}
                        </span>
                    </div>
                    <h3
                        style={{
                            fontSize: "17px",
                            fontWeight: 700,
                            color: "#0f172a",
                            margin: "10px 0 4px 0",
                        }}
                    >
                        Create Malayalam Speaking Property Video
                    </h3>
                    <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                        Automatically generates an accurate Malayalam narrated property reel from your uploaded photos, specs &amp; description — and lists it directly inside your property image gallery.
                    </p>
                </div>
            </div>

            {/* Selected Property Photos Preview Strip */}
            <div
                style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    marginBottom: "16px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: photos.length > 0 ? "10px" : 0,
                        gap: "8px",
                    }}
                >
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                        <RiFilmLine style={{ color: "#2563eb" }} />
                        {photos.length > 0
                            ? `${Math.min(photos.length, 8)} Property Photo${photos.length > 1 ? "s" : ""} staged for Reel scenes`
                            : "No property photos uploaded yet"}
                    </span>
                    {photos.length === 0 && goToStep && (
                        <button
                            type="button"
                            onClick={() => goToStep(6)}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "5px 11px",
                                borderRadius: "8px",
                                border: "1px solid #bfdbfe",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            <RiImageAddLine /> Add Photos in Step 6
                        </button>
                    )}
                </div>

                {photos.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
                        {photos.slice(0, 8).map((p, idx) => (
                            <div
                                key={p.id || idx}
                                style={{
                                    position: "relative",
                                    width: "62px",
                                    height: "62px",
                                    borderRadius: "9px",
                                    overflow: "hidden",
                                    flexShrink: 0,
                                    border: idx === (formData?.media?.coverIndex || 0) ? "2px solid #2563eb" : "1px solid #cbd5e1",
                                }}
                            >
                                <img
                                    src={p.url?.startsWith("blob:") || p.url?.startsWith("data:") ? p.url : formatPropertyImgUrl(p.url)}
                                    alt={`Scene ${idx + 1}`}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                                <span
                                    style={{
                                        position: "absolute",
                                        bottom: "3px",
                                        right: "3px",
                                        background: "rgba(15, 23, 42, 0.75)",
                                        color: "#fff",
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        padding: "1px 5px",
                                        borderRadius: "4px",
                                    }}
                                >
                                    #{idx + 1}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Full Malayalam Script Editor & Controls (shown fully in Step 7, or expandable/compact in Step 6) */}
            {!compactMode ? (
                <>
                    {/* Malayalam Script Box */}
                    <div style={{ marginBottom: "16px" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: "8px",
                                marginBottom: "8px",
                            }}
                        >
                            <label
                                style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: "#1e293b",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                <RiVolumeUpLine style={{ color: "#2563eb" }} />
                                Malayalam Narration Script (മലയാളം വിവരണം)
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "#047857",
                                        background: "#ecfdf5",
                                        border: "1px solid #a7f3d0",
                                        padding: "2px 8px",
                                        borderRadius: "999px",
                                    }}
                                    title="Nandana — clean, articulate native Malayalam studio broadcast narrator (age 22–24) with poised professional cadence and crystal-clear diction."
                                >
                                    🎙️ Nandana (22–24 · Malayalam Studio Voice)
                                </span>
                                {estimatedSeconds > 0 && (
                                    <span
                                        style={{
                                            fontSize: "11.5px",
                                            fontWeight: 600,
                                            color: "#0369a1",
                                            background: "#e0f2fe",
                                            padding: "2px 8px",
                                            borderRadius: "999px",
                                        }}
                                    >
                                        ~{estimatedSeconds.toFixed(1)}s speech
                                    </span>
                                )}
                            </label>

                            <button
                                type="button"
                                onClick={() => draftMalayalamScript({ forceStructured: true }, false)}
                                disabled={isDraftingScript || isGenerating}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #bfdbfe",
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    fontSize: "12.5px",
                                    fontWeight: 600,
                                    cursor: isDraftingScript ? "wait" : "pointer",
                                }}
                            >
                                {isDraftingScript ? <RiLoader4Line className="animate-spin" /> : <RiRefreshLine />}
                                {narrationText ? "Refresh Script from Property & Description" : "Auto-Draft Malayalam Script"}
                            </button>
                        </div>

                        <textarea
                            rows={4}
                            value={narrationText}
                            onChange={(e) => {
                                setNarrationText(e.target.value);
                                setScriptTouched(true);
                            }}
                            placeholder="നിങ്ങളുടെ പ്രോപ്പർട്ടി വിവരങ്ങളിൽ നിന്നും വിവരണത്തിൽ നിന്നും സ്വാഭാവിക മലയാളം സ്ക്രിപ്റ്റ് ഇവിടെ തയ്യാറാക്കപ്പെടും..."
                            style={{
                                width: "100%",
                                borderRadius: "12px",
                                border: "1.5px solid #cbd5e1",
                                padding: "12px 14px",
                                fontSize: "14.5px",
                                lineHeight: 1.7,
                                color: "#0f172a",
                                background: "#ffffff",
                                fontFamily: "'Noto Sans Malayalam', system-ui, -apple-system, sans-serif",
                                resize: "vertical",
                            }}
                        />
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "5px 0 0 0" }}>
                            You can edit any Malayalam word above — your exact Malayalam text is preserved without alteration during voice synthesis.
                        </p>
                    </div>

                    {/* Duration + Music Controls */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "14px",
                            marginBottom: "16px",
                        }}
                    >
                        {/* Duration Preset */}
                        <div>
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "12.5px",
                                    fontWeight: 700,
                                    color: "#334155",
                                    marginBottom: "6px",
                                }}
                            >
                                <RiTimeLine /> Reel Duration
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                                {[15, 30, 45].map((sec) => {
                                    const active = duration === sec;
                                    return (
                                        <button
                                            key={sec}
                                            type="button"
                                            onClick={() => setDuration(sec)}
                                            disabled={isGenerating}
                                            style={{
                                                padding: "8px 10px",
                                                borderRadius: "9px",
                                                border: active ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                                background: active ? "#eff6ff" : "#ffffff",
                                                color: active ? "#1d4ed8" : "#475569",
                                                fontWeight: 700,
                                                fontSize: "13px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {sec}s
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Background Music */}
                        <div>
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "12.5px",
                                    fontWeight: 700,
                                    color: "#334155",
                                    marginBottom: "6px",
                                }}
                            >
                                <RiMusic2Line /> Background Music (Auto-Ducked)
                            </label>
                            <select
                                value={musicId}
                                onChange={(e) => setMusicId(e.target.value)}
                                disabled={isGenerating}
                                style={{
                                    width: "100%",
                                    padding: "8.5px 12px",
                                    borderRadius: "9px",
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                }}
                            >
                                {MUSIC_OPTIONS.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.mood})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Feature Pills / Checkboxes */}
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginBottom: "18px",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setSubtitles((v) => !v)}
                            disabled={isGenerating}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                borderRadius: "999px",
                                border: subtitles ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                background: subtitles ? "#eff6ff" : "#ffffff",
                                color: subtitles ? "#1d4ed8" : "#475569",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            <RiClosedCaptioningLine /> Malayalam Subtitles {subtitles ? "✓" : ""}
                        </button>

                        <button
                            type="button"
                            onClick={handleToggleNarratePrice}
                            disabled={isGenerating}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                borderRadius: "999px",
                                border: narratePrice ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                background: narratePrice ? "#eff6ff" : "#ffffff",
                                color: narratePrice ? "#1d4ed8" : "#475569",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            <RiPriceTag3Line /> Speak Price in Malayalam {narratePrice ? "✓" : ""}
                        </button>

                        <button
                            type="button"
                            onClick={() => setPublishToReels((v) => !v)}
                            disabled={isGenerating}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                borderRadius: "999px",
                                border: publishToReels ? "1.5px solid #059669" : "1px solid #cbd5e1",
                                background: publishToReels ? "#ecfdf5" : "#ffffff",
                                color: publishToReels ? "#047857" : "#475569",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            <RiCheckDoubleLine /> Show in Property Gallery &amp; Reels {publishToReels ? "✓" : ""}
                        </button>
                    </div>
                </>
            ) : null}

            {/* Warnings */}
            {warnings.length > 0 && !compactMode && (
                <div
                    style={{
                        marginBottom: "14px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        fontSize: "12.5px",
                        color: "#92400e",
                    }}
                >
                    {warnings[0]}
                </div>
            )}

            {/* Error Banner */}
            {renderError && (
                <div
                    style={{
                        marginBottom: "14px",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        fontSize: "13px",
                        fontWeight: 600,
                    }}
                >
                    {renderError}
                </div>
            )}

            {/* Live Progress Bar while Rendering */}
            {isGenerating ? (
                <div
                    style={{
                        padding: "16px",
                        borderRadius: "14px",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        marginBottom: videos.length > 0 ? "18px" : 0,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                            gap: "10px",
                        }}
                    >
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13.5px",
                                fontWeight: 700,
                                color: "#1e3a8a",
                            }}
                        >
                            <RiLoader4Line className="animate-spin" style={{ fontSize: "18px" }} />
                            {renderStage || "Generating Malayalam speaking property reel..."}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "#1d4ed8" }}>{renderProgress}%</span>
                    </div>
                    <div
                        style={{
                            width: "100%",
                            height: "9px",
                            borderRadius: "999px",
                            background: "#dbeafe",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: `${Math.max(5, Math.min(100, renderProgress))}%`,
                                height: "100%",
                                borderRadius: "999px",
                                background: "linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)",
                                transition: "width 0.45s ease",
                            }}
                        />
                    </div>
                    <p style={{ fontSize: "12px", color: "#475569", margin: "8px 0 0 0" }}>
                        Synthesizing neural Malayalam speech and compositing 1080×1920 HD scenes. First run may take ~30–60s while loading the Indic-Mio model.
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
                    <button
                        type="button"
                        onClick={handleGenerateReel}
                        disabled={photos.length === 0}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "12px 22px",
                            borderRadius: "12px",
                            border: "none",
                            background:
                                photos.length === 0
                                    ? "#94a3b8"
                                    : "linear-gradient(135deg, #2563eb 0%, #6d28d9 100%)",
                            color: "#ffffff",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: photos.length === 0 ? "not-allowed" : "pointer",
                            boxShadow:
                                photos.length === 0 ? "none" : "0 10px 20px -8px rgba(37, 99, 235, 0.55)",
                        }}
                    >
                        <RiPlayCircleFill style={{ fontSize: "19px" }} />
                        {videos.some((v) => v.is_ai_malayalam)
                            ? "Regenerate Malayalam Speaking Reel"
                            : "Generate Malayalam Speaking Reel"}
                    </button>

                    {compactMode && goToStep && (
                        <button
                            type="button"
                            onClick={() => goToStep(7)}
                            style={{
                                padding: "11px 16px",
                                borderRadius: "11px",
                                border: "1px solid #bfdbfe",
                                background: "#ffffff",
                                color: "#1d4ed8",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Customize Malayalam Script in Step 7 →
                        </button>
                    )}
                </div>
            )}

            {/* Added Property Videos / Reels List (Listed alongside Property Images) */}
            {videos.length > 0 && (
                <div
                    style={{
                        marginTop: "20px",
                        paddingTop: "18px",
                        borderTop: "1px solid #e2e8f0",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "12px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "13.5px",
                                fontWeight: 700,
                                color: "#0f172a",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            <span>🎬 Property Videos in Image Gallery ({videos.length})</span>
                            <span
                                style={{
                                    fontSize: "11.5px",
                                    fontWeight: 700,
                                    color: "#047857",
                                    background: "#d1fae5",
                                    padding: "2px 9px",
                                    borderRadius: "999px",
                                }}
                            >
                                Listed with Property Photos ✓
                            </span>
                        </span>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 300px))",
                            gap: "16px",
                        }}
                    >
                        {videos.map((vid, idx) => {
                            const src = formatPropertyMediaUrl(vid.url);
                            const poster = vid.thumbnail_url ? formatPropertyMediaUrl(vid.thumbnail_url) : undefined;
                            return (
                                <div
                                    key={vid.id || idx}
                                    style={{
                                        borderRadius: "14px",
                                        overflow: "hidden",
                                        border: "1.5px solid #cbd5e1",
                                        background: "#0f172a",
                                        display: "flex",
                                        flexDirection: "column",
                                    }}
                                >
                                    <ReelVideoCardPlayer
                                        src={src}
                                        poster={poster}
                                        isAiMalayalam={Boolean(vid.is_ai_malayalam)}
                                        fallbackDuration={vid.duration}
                                    />
                                    <div
                                        style={{
                                            padding: "10px 12px",
                                            background: "#ffffff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "8px",
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: "13px",
                                                    fontWeight: 700,
                                                    color: "#0f172a",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {vid.title || "Malayalam Property Reel"}
                                            </div>
                                            <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                                                {vid.duration_formatted ? `${vid.duration_formatted} · ` : ""}Shown in Property Gallery
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setVideoToDelete(vid)}
                                            disabled={deletingVideoId === vid.id}
                                            title="Remove video from property"
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "8px",
                                                border: "1px solid #fecaca",
                                                background: "#fef2f2",
                                                color: "#dc2626",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {deletingVideoId === vid.id ? (
                                                <RiLoader4Line className="animate-spin" />
                                            ) : (
                                                <RiDeleteBinLine />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Confirmation Popup Modal before deleting a property reel */}
            {videoToDelete && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-reel-modal-title"
                    onClick={() => {
                        if (deletingVideoId === null) setVideoToDelete(null);
                    }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        background: "rgba(15, 23, 42, 0.58)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px",
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: "400px",
                            background: "#ffffff",
                            borderRadius: "16px",
                            padding: "24px",
                            boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.28)",
                            border: "1px solid #e2e8f0",
                        }}
                    >
                        <div
                            style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "12px",
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#dc2626",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "20px",
                                marginBottom: "14px",
                            }}
                        >
                            <RiDeleteBinLine />
                        </div>
                        <h4
                            id="delete-reel-modal-title"
                            style={{
                                margin: "0 0 8px 0",
                                fontSize: "17px",
                                fontWeight: 700,
                                color: "#0f172a",
                            }}
                        >
                            Delete Property Reel?
                        </h4>
                        <p
                            style={{
                                margin: "0 0 20px 0",
                                fontSize: "13.5px",
                                lineHeight: 1.55,
                                color: "#475569",
                            }}
                        >
                            Are you sure you want to delete &ldquo;{videoToDelete.title || "Malayalam AI Reel"}&rdquo;? This will remove the video from your property image gallery and Reels feed.
                        </p>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: "10px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setVideoToDelete(null)}
                                disabled={deletingVideoId !== null}
                                style={{
                                    padding: "9px 16px",
                                    borderRadius: "10px",
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#334155",
                                    fontSize: "13.5px",
                                    fontWeight: 600,
                                    cursor: deletingVideoId !== null ? "not-allowed" : "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteVideo(videoToDelete)}
                                disabled={deletingVideoId !== null}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "9px 18px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    fontSize: "13.5px",
                                    fontWeight: 700,
                                    cursor: deletingVideoId !== null ? "not-allowed" : "pointer",
                                    opacity: deletingVideoId !== null ? 0.75 : 1,
                                }}
                            >
                                {deletingVideoId !== null ? (
                                    <>
                                        <RiLoader4Line className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <RiDeleteBinLine />
                                        Delete Reel
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
