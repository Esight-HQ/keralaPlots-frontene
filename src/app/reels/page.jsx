"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../componants/nav/nav";
import styles from "./reels.module.css";
import reelsApi from "../lib/reelsApi";
import { useAuth } from "../context/AuthContext";
import { queuePropertyShare } from "../lib/messagesStore";
import {
    getGuestReelActions,
    toggleGuestReelAction,
    GUEST_REEL_ACTIONS_SYNCED_EVENT
} from "../lib/guestReelActionsStore";
import {
    RiArrowLeftLine,
    RiArrowUpSLine,
    RiArrowDownSLine,
    RiHeart3Line,
    RiHeart3Fill,
    RiSendPlaneLine,
    RiBookmarkLine,
    RiBookmarkFill,
    RiPlayFill,
    RiVolumeUpFill,
    RiVolumeMuteFill,
    RiWhatsappLine,
    RiFileCopyLine,
    RiMapPinLine,
    RiChatNewLine,
    RiVideoLine
} from "react-icons/ri";

const KERALAPLOTS_LOGO = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public";

function normalizeVideoUrl(url) {
    if (!url || typeof url !== "string") return "";
    let clean = url.trim();
    if (!clean) return "";
    if (clean.startsWith("//")) return "https:" + clean;
    if (clean.startsWith("http://") && !clean.includes("localhost") && !clean.includes("127.0.0.1")) {
        return "https://" + clean.slice(7);
    }
    if (/^https?:\/\//i.test(clean) || clean.startsWith("blob:") || clean.startsWith("data:")) return clean;
    const cleanPath = clean.replace(/^\/+/, "");
    const base = typeof window !== "undefined"
        ? (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "::1"
            ? "http://127.0.0.1:8000"
            : "https://apitest.keralaplots.com")
        : (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "https://apitest.keralaplots.com");
    return `${base}/${cleanPath}`;
}

function getCloudflareStreamId(src) {
    if (!src || typeof src !== "string") return null;
    const match = src.match(/(?:videodelivery\.net|cloudflarestream\.com)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

function getStreamPoster(src) {
    const id = getCloudflareStreamId(src);
    if (!id) return null;
    return `https://customer-hrtlsfl7dijstj5i.cloudflarestream.com/${id}/thumbnails/thumbnail.jpg?time=1s&height=1200`;
}

function getStreamHlsUrl(src) {
    const id = getCloudflareStreamId(src);
    if (!id) return null;
    return `https://customer-hrtlsfl7dijstj5i.cloudflarestream.com/${id}/manifest/video.m3u8`;
}

function getStreamIframeUrl(src) {
    const id = getCloudflareStreamId(src);
    if (id) {
        return `https://customer-hrtlsfl7dijstj5i.cloudflarestream.com/${id}/iframe`;
    }
    return normalizeVideoUrl(src);
}

/* ------------------------------------------------------------------ */
/* Playback engine selection                                           */
/* ------------------------------------------------------------------ */

function isAppleWebKit() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isIOS = /iP(hone|od|ad)/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
    return isIOS || isSafari;
}

function canPlayNativeHls() {
    if (typeof document === "undefined") return false;
    const v = document.createElement("video");
    return Boolean(v.canPlayType("application/vnd.apple.mpegurl") || v.canPlayType("application/x-mpegURL"));
}

function hasMediaSource() {
    if (typeof window === "undefined") return false;
    return Boolean(window.ManagedMediaSource || window.MediaSource || window.WebKitMediaSource);
}

// Decided once per page load, synchronously, so a reel never mounts an iframe and then swaps to <video>.
let cachedEngine = null;
function getHlsEngine() {
    if (cachedEngine) return cachedEngine;
    if (typeof window === "undefined") return "none";
    if (canPlayNativeHls() && isAppleWebKit()) cachedEngine = "native"; // Safari / iOS: hardware HLS
    else if (hasMediaSource()) cachedEngine = "hlsjs";                  // Chrome, Edge, Firefox, Android
    else if (canPlayNativeHls()) cachedEngine = "native";
    else cachedEngine = "iframe";
    return cachedEngine;
}

// hls.js is bundled (no CDN script race) and fetched only by browsers that need it.
let hlsModulePromise = null;
function loadHls() {
    if (!hlsModulePromise) {
        hlsModulePromise = import("../lib/vendor/hls.min.mjs").then((m) => m.default || m);
    }
    return hlsModulePromise;
}

const HLS_CONFIG = {
    enableWorker: true,
    lowLatencyMode: false,          // reels are VOD, not live
    startFragPrefetch: true,
    capLevelToPlayerSize: true,     // don't fetch 1080p for a 420px card
    capLevelOnFPSDrop: true,
    startLevel: -1,
    abrEwmaDefaultEstimate: 2_000_000,
    backBufferLength: 10,
    maxBufferLength: 4,             // neighbours: only buffer the first few seconds
    maxMaxBufferLength: 30,
    fragLoadingMaxRetry: 4,
    manifestLoadingMaxRetry: 3,
};
const ACTIVE_BUFFER_SECONDS = 20;
const PRELOAD_BUFFER_SECONDS = 4;

// Pause a video and mark it so our onPause safety-net knows it was on purpose.
function pauseOnPurpose(video) {
    if (!video || video.paused) return;
    video.dataset.kpPause = "1";
    video.pause();
}

function ReelVideo({ src, poster, isActive, isMuted, isPlaying, shouldLoad, onAutoplayBlocked, onForcedMute, onVideoEl }) {
    const videoRef = useRef(null);
    const iframeRef = useRef(null);
    const hlsRef = useRef(null);
    const playerRef = useRef(null);
    const [isFirstFramePainted, setIsFirstFramePainted] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);

    const streamId = getCloudflareStreamId(src);
    const isExternalEmbed = !!(src?.includes("youtube") || src?.includes("vimeo") || src?.includes("/embed/"));
    const posterUrl = poster || getStreamPoster(src);
    const hlsUrl = getStreamHlsUrl(src);
    const cleanSrc = normalizeVideoUrl(src);

    const engine = streamId ? getHlsEngine() : "direct";
    const shouldUseIframe = isExternalEmbed || engine === "iframe";

    // Latest desired state, readable inside async callbacks without stale closures.
    const desiredRef = useRef({ isActive, isMuted, isPlaying });
    desiredRef.current = { isActive, isMuted, isPlaying };
    const callbacksRef = useRef({ onAutoplayBlocked, onForcedMute });
    callbacksRef.current = { onAutoplayBlocked, onForcedMute };

    // Apply desired playback state (play/pause/mute) to whichever player is mounted.
    const syncPlayback = useCallback(() => {
        const { isActive: active, isMuted: muted, isPlaying: playing } = desiredRef.current;

        const video = videoRef.current;
        if (video) {
            video.loop = true;
            if (active && playing) {
                // Muting is always allowed. Un-muting a video that is already playing is only
                // safe inside a tap/click, so the page's gesture handlers do that directly.
                if (muted) video.muted = true;
                if (video.paused) {
                    video.muted = muted;
                    const p = video.play();
                    p?.catch?.((err) => {
                        if (err?.name !== "NotAllowedError") return; // AbortError etc. = superseded, ignore
                        if (!video.muted) {
                            // Unmuted autoplay blocked: play muted (like Instagram) and tell the UI.
                            video.muted = true;
                            callbacksRef.current.onForcedMute?.();
                            video.play().catch((e2) => {
                                if (e2?.name === "NotAllowedError") callbacksRef.current.onAutoplayBlocked?.();
                            });
                        } else {
                            callbacksRef.current.onAutoplayBlocked?.();
                        }
                    });
                }
            } else {
                pauseOnPurpose(video);
                video.muted = true;
                if (!active && video.currentTime > 0.05) {
                    try { video.currentTime = 0; } catch { }
                }
            }
        }

        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
            try {
                const post = (m) => iframe.contentWindow.postMessage(JSON.stringify(m), "*");
                post({ method: active && playing ? "play" : "pause" });
                post({ method: "muted", value: muted || !active });
                if (!active) post({ method: "currentTime", value: 0 });
            } catch { }
        }

        const player = playerRef.current;
        if (player) {
            try {
                if (active && playing) {
                    player.muted = muted;
                    player.play()?.catch?.(() => { player.muted = true; player.play?.(); });
                } else {
                    player.pause();
                    if (!active) player.currentTime = 0;
                }
            } catch { }
        }
    }, []);

    // Attach the source. Neighbours get a small buffer so swiping to them starts instantly.
    useEffect(() => {
        if (shouldUseIframe || !shouldLoad) return;
        const video = videoRef.current;
        if (!video) return;

        let cancelled = false;
        let hls = null;

        if (streamId && engine === "native") {
            video.src = hlsUrl;
            video.load();
        } else if (streamId && engine === "hlsjs") {
            loadHls().then((Hls) => {
                if (cancelled || !videoRef.current) return;
                if (!Hls.isSupported()) {
                    if (canPlayNativeHls()) { video.src = hlsUrl; video.load(); }
                    return;
                }
                hls = new Hls({
                    ...HLS_CONFIG,
                    maxBufferLength: desiredRef.current.isActive ? ACTIVE_BUFFER_SECONDS : PRELOAD_BUFFER_SECONDS,
                });
                hlsRef.current = hls;
                let mediaRecoveries = 0;
                hls.on(Hls.Events.ERROR, (_evt, data) => {
                    if (!data.fatal) return;
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        hls.startLoad();
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
                        mediaRecoveries += 1;
                        hls.recoverMediaError();
                    } else {
                        hls.destroy();
                        hlsRef.current = null;
                    }
                });
                hls.on(Hls.Events.MANIFEST_PARSED, () => syncPlayback());
                hls.attachMedia(video);
                hls.loadSource(hlsUrl);
            }).catch((e) => console.warn("hls.js failed to load:", e));
        } else if (cleanSrc) {
            video.src = cleanSrc;
            video.load();
        }

        return () => {
            cancelled = true;
            if (hls) {
                try { hls.destroy(); } catch { }
            }
            hlsRef.current = null;
            // Free the decoder + memory for reels that scrolled out of range.
            try {
                pauseOnPurpose(video);
                video.removeAttribute("src");
                video.load();
            } catch { }
            setIsFirstFramePainted(false);
        };
    }, [shouldUseIframe, shouldLoad, streamId, engine, hlsUrl, cleanSrc, syncPlayback]);

    // Grow the buffer for the reel on screen, shrink it again for neighbours.
    useEffect(() => {
        const hls = hlsRef.current;
        if (hls) hls.config.maxBufferLength = isActive ? ACTIVE_BUFFER_SECONDS : PRELOAD_BUFFER_SECONDS;
        if (!isActive) setIsBuffering(false);
    }, [isActive]);

    // Iframe fallback (YouTube/Vimeo or browsers without HLS support) — loaded once.
    useEffect(() => {
        if (!shouldUseIframe || !shouldLoad || !iframeRef.current) return;
        const iframe = iframeRef.current;
        const iframeSrc = getStreamIframeUrl(src);
        if (!iframeSrc || iframe.getAttribute("src")) return;
        const auto = desiredRef.current.isActive && desiredRef.current.isPlaying;
        const sep = iframeSrc.includes("?") ? "&" : "?";
        iframe.src = `${iframeSrc}${sep}autoplay=${auto}&muted=true&loop=true&controls=false&preload=auto&api=1`;
    }, [shouldUseIframe, shouldLoad, src]);

    useEffect(() => {
        if (!shouldUseIframe) return;
        const onMessage = (e) => {
            let host = "";
            try { host = new URL(e.origin).hostname; } catch { return; }
            if (!/(videodelivery\.net|cloudflarestream\.com)$/.test(host)) return;
            let data = e.data;
            if (typeof data === "string") {
                try { data = JSON.parse(data); } catch { return; }
            }
            const evt = data?.eventName || data?.event || data?.type;
            if (evt === "playing" || evt === "play" || evt === "timeupdate") setIsFirstFramePainted(true);
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [shouldUseIframe]);

    const wrapPlayer = useCallback(() => {
        if (playerRef.current || !shouldUseIframe) return;
        if (typeof window === "undefined" || typeof window.Stream !== "function") return;
        const iframe = iframeRef.current;
        if (!iframe || !iframe.getAttribute("src")) return;
        try {
            const player = window.Stream(iframe);
            playerRef.current = player;
            player.loop = true;
            player.muted = desiredRef.current.isMuted;
            player.addEventListener("playing", () => { setIsFirstFramePainted(true); syncPlayback(); });
            player.addEventListener("loadeddata", () => { setIsFirstFramePainted(true); syncPlayback(); });
            syncPlayback();
        } catch { }
    }, [shouldUseIframe, syncPlayback]);

    useEffect(() => {
        syncPlayback();
    }, [isActive, isPlaying, isMuted, shouldLoad, syncPlayback]);

    // Pause when the tab is hidden, resume when it comes back.
    useEffect(() => {
        const onVis = () => {
            const video = videoRef.current;
            if (!video || !desiredRef.current.isActive) return;
            if (document.hidden) pauseOnPurpose(video);
            else syncPlayback();
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, [syncPlayback]);

    const showSpinner = isActive && isPlaying && (!isFirstFramePainted || isBuffering);

    return (
        <>
            {posterUrl && (
                <img
                    src={posterUrl}
                    alt="Reel preview"
                    className={`${styles.mediaPoster} ${isFirstFramePainted ? styles.mediaPosterHidden : ""}`}
                    loading={shouldLoad ? "eager" : "lazy"}
                    fetchPriority={isActive ? "high" : "low"}
                    decoding="async"
                />
            )}

            {showSpinner && (
                <div className={styles.reelLoader} aria-label="Loading video">
                    <div className={styles.reelLoaderRing} />
                </div>
            )}

            {shouldUseIframe ? (
                <iframe
                    ref={iframeRef}
                    className={styles.mediaBackground}
                    allow="accelerometer; gyroscope; autoplay *; encrypted-media *; picture-in-picture *; fullscreen *"
                    allowFullScreen
                    title="KeralaPlots Real Estate Reel"
                    onLoad={wrapPlayer}
                />
            ) : (
                <video
                    ref={(el) => {
                        videoRef.current = el;
                        onVideoEl?.(el);
                    }}
                    className={styles.mediaBackground}
                    poster={posterUrl || undefined}
                    muted
                    loop
                    playsInline
                    webkit-playsinline="true"
                    x5-playsinline="true"
                    disablePictureInPicture
                    disableRemotePlayback
                    controlsList="nodownload noplaybackrate"
                    preload={isActive ? "auto" : "metadata"}
                    onLoadedData={() => { if (desiredRef.current.isActive) syncPlayback(); }}
                    onCanPlay={() => { setIsBuffering(false); syncPlayback(); }}
                    onPlaying={() => { setIsFirstFramePainted(true); setIsBuffering(false); }}
                    onWaiting={() => { if (desiredRef.current.isActive) setIsBuffering(true); }}
                    onPause={(e) => {
                        const v = e.currentTarget;
                        if (v.dataset.kpPause) { delete v.dataset.kpPause; return; }
                        const d = desiredRef.current;
                        if (!d.isActive || !d.isPlaying || document.hidden || v.ended) return;
                        // The browser paused it (e.g. Chrome un-mute without a gesture):
                        // keep the reel running muted and show the muted icon.
                        v.muted = true;
                        callbacksRef.current.onForcedMute?.();
                        v.play().catch(() => callbacksRef.current.onAutoplayBlocked?.());
                    }}
                    onEnded={(e) => {
                        // Safety net for browsers/streams where `loop` doesn't restart HLS.
                        if (!desiredRef.current.isActive || !desiredRef.current.isPlaying) return;
                        const v = e.currentTarget;
                        try { v.currentTime = 0; } catch { }
                        v.play().catch(() => { });
                    }}
                />
            )}
        </>
    );
}

export default function ReelsPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();

    const [reels, setReels] = useState([]);
    const [currentReelIndex, setCurrentReelIndex] = useState(0);
    const [isFeedLoading, setIsFeedLoading] = useState(true);
    const [feedError, setFeedError] = useState("");

    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    // True while the browser forced us to start muted (autoplay policy), not the user's choice.
    const forcedMuteRef = useRef(false);

    const handleForcedMute = useCallback(() => {
        forcedMuteRef.current = true;
        setIsMuted(true);
    }, []);
    const handleAutoplayBlocked = useCallback(() => {
        // Even muted autoplay was refused (e.g. Low Power Mode): show the play button.
        setIsPlaying(false);
    }, []);
    // The user's own sound choice (survives swipes). isMuted = what is actually happening.
    const userMutedRef = useRef(false);
    const isMutedRef = useRef(false);
    const isPlayingRef = useRef(true);
    isMutedRef.current = isMuted;
    isPlayingRef.current = isPlaying;
    const videoElsRef = useRef(new Map());

    const getVideoEl = (index) => videoElsRef.current.get(index) || null;

    // Must be called synchronously from a tap/click/key handler so browsers allow sound.
    const playWithSound = useCallback((video) => {
        if (!video) return;
        const wantSound = !userMutedRef.current;
        video.muted = !wantSound;
        const p = video.play();
        if (wantSound) {
            forcedMuteRef.current = false;
            setIsMuted(false);
        }
        p?.catch?.((err) => {
            if (err?.name !== "NotAllowedError") return;
            if (!video.muted) {
                video.muted = true;
                forcedMuteRef.current = true;
                setIsMuted(true);
                video.play().catch(() => setIsPlaying(false));
            } else {
                setIsPlaying(false);
            }
        });
    }, []);

    const setSound = useCallback((wantMuted) => {
        userMutedRef.current = wantMuted;
        forcedMuteRef.current = false;
        const video = getVideoEl(currentIndexRef.current);
        if (video) {
            video.muted = wantMuted;
            if (!wantMuted && video.paused && isPlayingRef.current) video.play().catch(() => { });
        }
        setIsMuted(wantMuted);
    }, []);

    const toggleMute = useCallback(() => {
        setSound(!isMutedRef.current);
    }, [setSound]);

    const togglePlay = useCallback(() => {
        const video = getVideoEl(currentIndexRef.current);
        if (isPlayingRef.current) {
            pauseOnPurpose(video);
            setIsPlaying(false);
        } else {
            playWithSound(video);
            setIsPlaying(true);
        }
    }, [playWithSound]);

    // Start downloading hls.js in parallel with the feed request.
    useEffect(() => {
        if (getHlsEngine() === "hlsjs") loadHls().catch(() => { });
    }, []);

    const [likedStates, setLikedStates] = useState({});
    const [likesCounts, setLikesCounts] = useState({});
    const [savedStates, setSavedStates] = useState({});
    const [sharesCounts, setSharesCounts] = useState({});

    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const shareButtonRef = useRef(null);
    const viewedReelsRef = useRef(new Set());
    const reelsRef = useRef([]);
    const currentIndexRef = useRef(0);
    useEffect(() => {
        reelsRef.current = reels;
        currentIndexRef.current = currentReelIndex;
    }, [reels, currentReelIndex]);

    const fetchFeed = useCallback(async (keepReelId = null) => {
        const isRefresh = keepReelId !== null && keepReelId !== undefined;
        if (!isRefresh) setIsFeedLoading(true);
        setFeedError("");

        try {
            const targetReelId = typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get("reel")
                : null;
            let targetReel = null;

            if (targetReelId) {
                try {
                    const singleRes = await reelsApi.getReel(targetReelId);
                    if (singleRes.success && singleRes.data) {
                        targetReel = singleRes.data;
                    }
                } catch {
                    // Fall back to regular feed if the shared reel was removed.
                }
            }

            const res = await reelsApi.getFeed(1, 20);
            if (res.success && Array.isArray(res.data)) {
                const feedReels = targetReel
                    ? [targetReel, ...res.data.filter((r) => Number(r.id) !== Number(targetReel.id))]
                    : res.data;
                setReels(feedReels);
                const keepIndex = isRefresh
                    ? feedReels.findIndex((r) => String(r.id) === String(keepReelId))
                    : -1;
                setCurrentReelIndex(keepIndex >= 0 ? keepIndex : 0);

                const likes = {};
                const saves = {};
                const likeCounts = {};
                const shareCounts = {};
                // Likes/saves made before login (or not yet synced) are shown on top of the API state.
                const guest = getGuestReelActions();
                feedReels.forEach((r) => {
                    const id = String(r.id);
                    const guestLiked = guest.likes.has(id) && !r.is_liked;
                    likes[r.id] = !!r.is_liked || guestLiked;
                    saves[r.id] = !!r.is_saved || guest.saves.has(id);
                    likeCounts[r.id] = (r.stats?.likes || 0) + (guestLiked ? 1 : 0);
                    shareCounts[r.id] = r.stats?.shares || 0;
                });
                setLikedStates(likes);
                setSavedStates(saves);
                setLikesCounts(likeCounts);
                setSharesCounts(shareCounts);
            }
        } catch (err) {
            console.error("Failed to load reels feed:", err);
            if (!isRefresh) {
                setReels([]);
                setFeedError("Unable to load reels right now.");
            }
        } finally {
            setIsFeedLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        Promise.resolve().then(() => {
            if (active) fetchFeed();
        });
        return () => {
            active = false;
        };
    }, [fetchFeed]);

    // After login, guest likes/saves are pushed to the API; reload to show the stored state.
    useEffect(() => {
        const handleSynced = () => {
            const activeId = reelsRef.current[currentIndexRef.current]?.id;
            fetchFeed(activeId);
        };
        window.addEventListener(GUEST_REEL_ACTIONS_SYNCED_EVENT, handleSynced);
        return () => window.removeEventListener(GUEST_REEL_ACTIONS_SYNCED_EVENT, handleSynced);
    }, [fetchFeed]);


    // Track active reel view
    useEffect(() => {
        const reel = reels[currentReelIndex];
        if (!reel || viewedReelsRef.current.has(reel.id)) return;
        viewedReelsRef.current.add(reel.id);
        reelsApi.recordView(reel.id).catch(() => { });
    }, [currentReelIndex, reels]);

    const handleToggleLike = async (eventOrId) => {
        eventOrId?.stopPropagation?.();

        const targetId = typeof eventOrId === "number" || typeof eventOrId === "string" ? eventOrId : null;
        const reel = targetId ? reels.find((item) => String(item.id) === String(targetId)) : reels[currentReelIndex];
        if (!reel) return;

        if (!isAuthenticated) {
            // Not logged in: remember the like on this device; it is synced after login.
            const nowLiked = toggleGuestReelAction("like", reel.id);
            setLikedStates((prev) => ({ ...prev, [reel.id]: nowLiked }));
            setLikesCounts((prev) => ({
                ...prev,
                [reel.id]: Math.max(0, (prev[reel.id] || 0) + (nowLiked ? 1 : -1))
            }));
            return;
        }

        const wasLiked = !!likedStates[reel.id];
        setLikedStates((prev) => ({ ...prev, [reel.id]: !wasLiked }));
        setLikesCounts((prev) => ({
            ...prev,
            [reel.id]: Math.max(0, (prev[reel.id] || 0) + (wasLiked ? -1 : 1))
        }));

        try {
            const res = await reelsApi.toggleLike(reel.id);
            if (res.success && res.data) {
                setLikedStates((prev) => ({ ...prev, [reel.id]: !!res.data.is_liked }));
                setLikesCounts((prev) => ({ ...prev, [reel.id]: Number(res.data.likes_count || 0) }));
            }
        } catch {
            setLikedStates((prev) => ({ ...prev, [reel.id]: wasLiked }));
            setLikesCounts((prev) => ({
                ...prev,
                [reel.id]: Math.max(0, (prev[reel.id] || 0) + (wasLiked ? 1 : -1))
            }));
        }
    };

    const handleToggleSave = async (eventOrId) => {
        eventOrId?.stopPropagation?.();

        const targetId = typeof eventOrId === "number" || typeof eventOrId === "string" ? eventOrId : null;
        const reel = targetId ? reels.find((item) => String(item.id) === String(targetId)) : reels[currentReelIndex];
        if (!reel) return;

        if (!isAuthenticated) {
            // Not logged in: remember the save on this device; it is synced after login.
            const nowSaved = toggleGuestReelAction("save", reel.id);
            setSavedStates((prev) => ({ ...prev, [reel.id]: nowSaved }));
            return;
        }

        const wasSaved = !!savedStates[reel.id];
        setSavedStates((prev) => ({ ...prev, [reel.id]: !wasSaved }));

        try {
            const res = await reelsApi.toggleSave(reel.id);
            if (res.success && res.data) {
                setSavedStates((prev) => ({ ...prev, [reel.id]: !!res.data.is_saved }));
            }
        } catch {
            setSavedStates((prev) => ({ ...prev, [reel.id]: wasSaved }));
        }
    };

    const handleWhatsAppShare = (e) => {
        e.stopPropagation();
        const reel = reels[currentReelIndex];
        if (!reel) return;

        reelsApi.recordShare(reel.id, "whatsapp").catch(() => { });
        const shareText = `Check out this property reel on KeralaPlots: "${reel.caption}"\n${window.location.href}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        setShareMenuOpen(false);
    };

    const handleShareWhatsApp = handleWhatsAppShare;

    const handleCopyLink = (e) => {
        e.stopPropagation();
        const reel = reels[currentReelIndex];
        if (!reel) return;

        reelsApi.recordShare(reel.id, "copy_link").catch(() => { });
        navigator.clipboard.writeText(`${window.location.origin}/reels?reel=${encodeURIComponent(reel.id)}`)
            .then(() => alert("Reel link copied to clipboard!"))
            .catch(() => alert("Failed to copy link."));
        setShareMenuOpen(false);
    };

    const handleConnect = (e, reel) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            router.push(`/login?redirect=${encodeURIComponent("/reels")}`);
            return;
        }

        const currentLoginId = Number(user?.loginId || user?.id);
        const reelCreatorId = Number(reel.creator?.login_id || reel.creator?.id || reel.login_id);

        if (currentLoginId && reelCreatorId && currentLoginId === reelCreatorId) {
            router.push("/profile/posted-reels");
            return;
        }

        const note = `Hi, I'm interested in the property from this reel: "${reel.caption}"`;

        queuePropertyShare({
            agentName: reel.creator?.name || "Agent",
            recipient_id: reelCreatorId,
            reel: {
                id: reel.id || reel.reel_id,
                reel_id: reel.id || reel.reel_id,
                username: reel.creator?.name || "Agent",
                avatar: reel.creator?.avatar || KERALAPLOTS_LOGO,
                poster: reel.thumbnail_url || getStreamPoster(reel.video_url),
                caption: reel.caption,
                location: reel.location,
            },
            note,
        });

        router.push("/messages");
    };

    const sliderRef = useRef(null);
    const touchStartYRef = useRef(0);
    const touchLastYRef = useRef(0);
    const touchStartTimeRef = useRef(0);
    const isDraggingRef = useRef(false);
    const isSwipingRef = useRef(false);
    const userHasInteractedRef = useRef(false);

    const animateSliderTo = useCallback((index, smooth = true) => {
        if (!sliderRef.current) return;
        if (smooth) {
            sliderRef.current.style.transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
        } else {
            sliderRef.current.style.transition = "none";
        }
        sliderRef.current.style.transform = `translate3d(0, -${index * 100}%, 0)`;
    }, []);

    useEffect(() => {
        animateSliderTo(currentReelIndex, true);
    }, [currentReelIndex, animateSliderTo]);

    const registerUserGesture = useCallback(() => {
        userHasInteractedRef.current = true;
    }, []);

    // Switch reels inside the gesture: pause the old one and start the new one (with sound) right now.
    const goToReel = useCallback((nextIndex) => {
        const from = currentIndexRef.current;
        if (nextIndex === from || nextIndex < 0 || nextIndex >= reelsRef.current.length) return;
        const oldVideo = getVideoEl(from);
        if (oldVideo) {
            pauseOnPurpose(oldVideo);
            oldVideo.muted = true;
        }
        currentIndexRef.current = nextIndex;
        playWithSound(getVideoEl(nextIndex));
        setCurrentReelIndex(nextIndex);
        setIsPlaying(true);
    }, [playWithSound]);

    const handleNext = useCallback(() => {
        registerUserGesture();
        goToReel(currentIndexRef.current + 1);
    }, [registerUserGesture, goToReel]);

    const handlePrev = useCallback(() => {
        registerUserGesture();
        goToReel(currentIndexRef.current - 1);
    }, [registerUserGesture, goToReel]);

    // Phones fire touch events and then fake mouse events for the same tap; ignore the fakes.
    const lastTouchTimeRef = useRef(0);
    const isEmulatedMouse = () => Date.now() - lastTouchTimeRef.current < 800;

    const handleDragStart = (clientY, target) => {
        if (target?.closest?.("button, a, input, textarea, select, ." + styles.actionsPanel)) {
            return;
        }
        registerUserGesture();
        isDraggingRef.current = true;
        isSwipingRef.current = false;
        touchStartYRef.current = clientY;
        touchLastYRef.current = clientY;
        touchStartTimeRef.current = Date.now();
        if (sliderRef.current) {
            sliderRef.current.style.transition = "none";
        }
    };

    const handleDragMove = (clientY) => {
        if (!isDraggingRef.current || !sliderRef.current) return;
        touchLastYRef.current = clientY;
        const diffY = clientY - touchStartYRef.current;
        if (Math.abs(diffY) > 8) {
            isSwipingRef.current = true;
        }

        let offset = diffY;
        const isFirst = currentIndexRef.current === 0;
        const isLast = currentIndexRef.current === reelsRef.current.length - 1;
        if ((isFirst && diffY > 0) || (isLast && diffY < 0)) {
            offset = diffY * 0.3; // Rubber-band resistance at boundaries
        }

        sliderRef.current.style.transform = `translate3d(0, calc(-${currentIndexRef.current * 100}% + ${offset}px), 0)`;
    };

    const handleDragEnd = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        const diffY = touchLastYRef.current - touchStartYRef.current;
        const duration = Math.max(1, Date.now() - touchStartTimeRef.current);
        const velocity = Math.abs(diffY) / duration;

        // Tap detection: minimal movement and short duration
        if (!isSwipingRef.current || (Math.abs(diffY) < 10 && duration < 300)) {
            animateSliderTo(currentIndexRef.current, true);
            if (forcedMuteRef.current) {
                // Reel was muted only because of the browser: first tap turns sound on (no pause).
                setSound(false);
            } else {
                togglePlay();
            }
            return;
        }

        // Swipe / flick threshold
        const isFlickUp = diffY < -25 && velocity > 0.35;
        const isDragUp = diffY < -55;
        const isFlickDown = diffY > 25 && velocity > 0.35;
        const isDragDown = diffY > 55;

        if ((isFlickUp || isDragUp) && currentIndexRef.current < reelsRef.current.length - 1) {
            handleNext();
        } else if ((isFlickDown || isDragDown) && currentIndexRef.current > 0) {
            handlePrev();
        } else {
            animateSliderTo(currentIndexRef.current, true);
        }
    };

    const lastWheelTimeRef = useRef(0);
    const handleWheel = (e) => {
        const now = Date.now();
        if (now - lastWheelTimeRef.current < 600) return;
        registerUserGesture();

        if (e.deltaY > 30 && currentIndexRef.current < reelsRef.current.length - 1) {
            lastWheelTimeRef.current = now;
            handleNext();
        } else if (e.deltaY < -30 && currentIndexRef.current > 0) {
            lastWheelTimeRef.current = now;
            handlePrev();
        }
    };

    const handleKeyDown = (e) => {
        registerUserGesture();
        if (e.key === "ArrowDown" && currentIndexRef.current < reelsRef.current.length - 1) {
            handleNext();
        } else if (e.key === "ArrowUp" && currentIndexRef.current > 0) {
            handlePrev();
        } else if (e.key === " ") {
            e.preventDefault();
            togglePlay();
        } else if (e.key === "m" || e.key === "M") {
            toggleMute();
        }
    };

    const currentReel = reels[currentReelIndex] || null;

    // Back: return to the previous page; fall back to home when the reel was
    // opened directly in a fresh tab (e.g. from a shared link).
    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
        }
        router.push("/");
    };

    return (
        <>
            {/* Only needed for the rare iframe fallback; never blocks the video path. */}
            <Script src="https://embed.cloudflarestream.com/embed/sdk.latest.js" strategy="lazyOnload" />

            <h1 className={styles.srOnly}>Real Estate Video Reels Kerala | Property Walkthroughs</h1>

            {/* Site navigation is hidden on mobile for a full-screen reel experience */}
            <div className={styles.navWrap}>
                <Nav />
            </div>

            {/* Mobile back button */}
            <button
                type="button"
                className={styles.backBtn}
                onClick={handleBack}
                aria-label="Go back"
                title="Back"
            >
                <RiArrowLeftLine aria-hidden="true" />
            </button>

            {!isFeedLoading && !currentReel ? (
                <div className={styles.reelsContainer}>
                    <div className={styles.emptyFeed}>
                        <RiVideoLine />
                        <h2>{feedError ? "Reels unavailable" : "No reels yet"}</h2>
                        <p>{feedError || "Posted reels from KeralaPlots users will appear here."}</p>
                    </div>
                </div>
            ) : isFeedLoading ? (
                <div className={styles.reelsContainer}>
                    <div className={styles.emptyFeed}>
                        <RiVideoLine />
                        <h2>Loading reels</h2>
                        <p>Fetching latest property reels from KeralaPlots.</p>
                    </div>
                </div>
            ) : (
                <div
                    className={styles.reelsContainer}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onWheel={handleWheel}
                    onMouseDown={(e) => { if (!isEmulatedMouse()) handleDragStart(e.clientY, e.target); }}
                    onMouseMove={(e) => isDraggingRef.current && !isEmulatedMouse() && handleDragMove(e.clientY)}
                    onMouseUp={() => { if (!isEmulatedMouse()) handleDragEnd(); }}
                    onMouseLeave={() => { if (!isEmulatedMouse()) handleDragEnd(); }}
                    onTouchStart={(e) => {
                        lastTouchTimeRef.current = Date.now();
                        handleDragStart(e.touches[0].clientY, e.target);
                    }}
                    onTouchMove={(e) => {
                        if (isDraggingRef.current) {
                            if (e.cancelable) e.preventDefault();
                            handleDragMove(e.touches[0].clientY);
                        }
                    }}
                    onTouchEnd={() => {
                        lastTouchTimeRef.current = Date.now();
                        handleDragEnd();
                    }}
                >
                    <div className={styles.reelsLayout}>
                        {/* Main Smartphone Screen Viewport Card */}
                        <div className={styles.playerCard}>
                            <div
                                ref={sliderRef}
                                className={styles.reelSlider}
                                style={{
                                    transform: `translate3d(0, -${currentReelIndex * 100}%, 0)`,
                                }}
                            >
                                {reels.map((reel, index) => {
                                    const isActive = index === currentReelIndex;
                                    const offset = index - currentReelIndex;
                                    const isNeighbor = offset >= -1 && offset <= 2;

                                    return (
                                        <div
                                            key={reel.id}
                                            className={styles.reelSlide}
                                        >
                                            <ReelVideo
                                                src={reel.video_url}
                                                poster={reel.thumbnail_url}
                                                isActive={isActive}
                                                isMuted={isMuted}
                                                isPlaying={isPlaying}
                                                shouldLoad={isNeighbor}
                                                onAutoplayBlocked={handleAutoplayBlocked}
                                                onForcedMute={handleForcedMute}
                                                onVideoEl={(el) => {
                                                    if (el) videoElsRef.current.set(index, el);
                                                    else if (videoElsRef.current.get(index)) videoElsRef.current.delete(index);
                                                }}
                                            />

                                            {/* Center Play/Pause Indicator */}
                                            {isActive && !isPlaying && (
                                                <button
                                                    type="button"
                                                    className={styles.centerPlayBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        playWithSound(getVideoEl(currentIndexRef.current));
                                                        setIsPlaying(true);
                                                    }}
                                                    aria-label="Play Reel"
                                                >
                                                    <RiPlayFill />
                                                </button>
                                            )}

                                            {/* Sound Toggle Button */}
                                            {isActive && (
                                                <button
                                                    type="button"
                                                    className={styles.muteBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleMute();
                                                    }}
                                                    aria-label={isMuted ? "Unmute" : "Mute"}
                                                >
                                                    {isMuted ? <RiVolumeMuteFill /> : <RiVolumeUpFill />}
                                                </button>
                                            )}

                                            {/* Bottom Overlay Info & Profile */}
                                            <div className={styles.bottomStack}>
                                                <div className={styles.propertyDetailsCard}>
                                                    <p className={styles.propertyTitle}>{reel.caption}</p>
                                                    <div className={styles.propertyPriceRow}>
                                                        <span className={styles.propertyPrice}>{reel.price}</span>
                                                    </div>
                                                    <div className={styles.propertyActionsRow}>
                                                        {Boolean(
                                                            isAuthenticated &&
                                                            user &&
                                                            (Number(user?.loginId || user?.id) === Number(reel.creator?.login_id || reel.creator?.id || reel.login_id))
                                                        ) ? (
                                                            <Link
                                                                href="/profile/posted-reels"
                                                                className={styles.propertyConnectBtn}
                                                                style={{ background: "rgba(255, 255, 255, 0.22)", backdropFilter: "blur(8px)" }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <RiVideoLine />
                                                                <span>Your Reel</span>
                                                            </Link>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className={styles.propertyConnectBtn}
                                                                onClick={(e) => handleConnect(e, reel)}
                                                            >
                                                                <RiChatNewLine />
                                                                <span>Connect</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className={styles.bottomOverlay}>
                                                    <Link
                                                        href={`/user/${reel.creator?.login_id || reel.creator?.id || reel.login_id}`}
                                                        className={styles.profileRow}
                                                        style={{ textDecoration: "none", color: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        title={`View ${reel.creator?.name || "User"}'s Profile`}
                                                    >
                                                        <img loading="lazy" decoding="async"
                                                            src={reel.creator?.avatar || "/user-placeholder.jpg"}
                                                            alt={reel.creator?.name || "Creator"}
                                                            className={styles.avatar}
                                                            onError={(e) => {
                                                                e.currentTarget.src = "/user-placeholder.jpg";
                                                            }}
                                                        />
                                                        <span className={styles.username}>{reel.creator?.name || "KeralaPlots User"}</span>
                                                    </Link>

                                                    {reel.location && (
                                                        <p className={styles.location}>
                                                            <RiMapPinLine />
                                                            <span>{reel.location}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Interaction Buttons on the Right Side */}
                        {currentReel && (
                            <div className={styles.actionsPanel}>
                                {/* Like Button */}
                                <button
                                    type="button"
                                    className={`${styles.actionButton} ${likedStates[currentReel.id] ? styles.actionButtonActive : ""}`}
                                    onClick={handleToggleLike}
                                >
                                    <span className={styles.actionIcon}>
                                        {likedStates[currentReel.id] ? <RiHeart3Fill /> : <RiHeart3Line />}
                                    </span>
                                    <span className={styles.actionCount}>
                                        {((likesCounts[currentReel.id] ?? currentReel.stats?.likes ?? 0)).toLocaleString()}
                                    </span>
                                </button>

                                {/* Direct Message Share */}
                                <div ref={shareButtonRef} style={{ position: "relative" }}>
                                    <button
                                        type="button"
                                        className={styles.actionButton}
                                        title="Share Reel"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShareMenuOpen(!shareMenuOpen);
                                        }}
                                    >
                                        <span className={styles.actionIcon}><RiSendPlaneLine /></span>
                                    </button>

                                    {shareMenuOpen && (
                                        <div className={styles.shareTooltip} onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className={styles.shareTooltipLink}
                                                onClick={handleShareWhatsApp}
                                            >
                                                <RiWhatsappLine className={styles.shareTooltipIcon} style={{ color: "#25D366" }} />
                                                <span>WhatsApp</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.shareTooltipLink}
                                                onClick={handleCopyLink}
                                            >
                                                <RiFileCopyLine className={styles.shareTooltipIcon} />
                                                <span>Copy Link</span>
                                            </button>
                                            <div className={styles.shareTooltipArrow} />
                                        </div>
                                    )}
                                </div>

                                {/* Save Bookmark */}
                                <button
                                    type="button"
                                    className={`${styles.actionButton} ${savedStates[currentReel.id] ? styles.actionButtonSaveActive : ""}`}
                                    onClick={handleToggleSave}
                                    title="Save Reel"
                                >
                                    <span className={styles.actionIcon}>
                                        {savedStates[currentReel.id] ? <RiBookmarkFill /> : <RiBookmarkLine />}
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* Navigation Arrows */}
                        <div className={styles.navigationGroup}>
                            <button
                                type="button"
                                className={styles.navArrowBtn}
                                onClick={handlePrev}
                                disabled={currentReelIndex === 0}
                                title="Previous Reel"
                            >
                                <RiArrowUpSLine />
                            </button>
                            <button
                                type="button"
                                className={styles.navArrowBtn}
                                onClick={handleNext}
                                disabled={currentReelIndex === reels.length - 1}
                                title="Next Reel"
                            >
                                <RiArrowDownSLine />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
