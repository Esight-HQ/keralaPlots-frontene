"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    RiPlayFill,
    RiPauseFill,
    RiVolumeMuteLine,
    RiErrorWarningLine,
} from "react-icons/ri";
import styles from "./voiceNotePlayer.module.css";

const SPEEDS = [1, 1.5, 2];
const BAR_COUNT = 46;

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// Deterministic WhatsApp-style waveform: quiet edges, louder body, natural jitter.
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
    const t = i / (BAR_COUNT - 1);
    const envelope = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.6;
    const jitter = 0.72 + 0.28 * Math.abs(Math.sin(i * 2.3) * Math.cos(i * 0.7));
    return Math.max(14, Math.round(envelope * jitter * 100)); // 14%–100%
});

function normalizeAudioUrl(url) {
    if (!url || typeof url !== "string") return "";
    let clean = url.trim();
    if (!clean) return "";

    // Convert protocol-relative to https
    if (clean.startsWith("//")) {
        return "https:" + clean;
    }

    // Upgrade http to https (except for local dev server)
    if (clean.startsWith("http://") && !clean.includes("localhost") && !clean.includes("127.0.0.1")) {
        return "https://" + clean.slice(7);
    }

    // Direct web / blob URLs
    if (/^https?:\/\//i.test(clean) || clean.startsWith("blob:") || clean.startsWith("data:")) {
        return clean;
    }

    // Relative URLs
    const cleanPath = clean.replace(/^\/+/, "");
    const base = typeof window !== "undefined"
        ? (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "::1"
            ? "http://127.0.0.1:8000"
            : "https://apitest.keralaplots.com")
        : (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "https://apitest.keralaplots.com");
    return `${base}/${cleanPath}`;
}

function getMimeType(url) {
    if (!url || typeof url !== "string") return "";
    const lower = url.toLowerCase().split("?")[0];
    if (lower.endsWith(".webm") || lower.includes(".webm")) return "audio/webm";
    if (lower.endsWith(".m4a") || lower.includes(".m4a")) return "audio/mp4";
    if (lower.endsWith(".mp4") || lower.includes(".mp4")) return "audio/mp4";
    if (lower.endsWith(".mp3") || lower.includes(".mp3")) return "audio/mpeg";
    if (lower.endsWith(".ogg") || lower.endsWith(".oga") || lower.includes(".ogg")) return "audio/ogg";
    if (lower.endsWith(".wav") || lower.includes(".wav")) return "audio/wav";
    if (lower.endsWith(".aac") || lower.includes(".aac")) return "audio/aac";
    return "";
}

export default function VoiceNotePlayer({ src, title = "Voice note", initialDuration = 0 }) {
    const audioRef = useRef(null);
    const trackRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [duration, setDuration] = useState(() => Number(initialDuration) || 0);
    const [currentTime, setCurrentTime] = useState(0);
    const [speedIndex, setSpeedIndex] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    const cleanSrc = normalizeAudioUrl(src);
    const mimeType = getMimeType(cleanSrc);

    // Reset state whenever the audio source changes
    const [prevSrc, setPrevSrc] = useState(cleanSrc);
    if (prevSrc !== cleanSrc) {
        setPrevSrc(cleanSrc);
        setIsPlaying(false);
        setIsLoading(false);
        setHasError(false);
        setCurrentTime(0);
        setDuration(Number(initialDuration) || 0);
    }

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        try {
            audio.load();
        } catch { }
    }, [cleanSrc]);

    // Safely update duration
    const updateDuration = useCallback((d) => {
        if (Number.isFinite(d) && d > 0) {
            setDuration(Math.round(d));
        } else if (d === Infinity) {
            // WebM recorded in browser without EBML duration header
            const audio = audioRef.current;
            if (audio && audio.seekable && audio.seekable.length > 0) {
                try {
                    const seekableEnd = audio.seekable.end(audio.seekable.length - 1);
                    if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
                        setDuration(Math.round(seekableEnd));
                    }
                } catch { }
            }
        }
    }, []);

    const handleLoadedMetadata = (e) => {
        setIsLoading(false);
        setHasError(false);
        updateDuration(e.currentTarget.duration);
    };

    const handleDurationChange = (e) => {
        updateDuration(e.currentTarget.duration);
    };

    const handleTimeUpdate = (e) => {
        const audio = e.currentTarget;
        if (!isSeeking) {
            setCurrentTime(audio.currentTime);
        }
        if (!duration || !Number.isFinite(duration) || duration <= 0) {
            updateDuration(audio.duration);
        }
        if ((!duration || !Number.isFinite(duration) || duration <= 0) && audio.currentTime > 0) {
            setDuration((prev) => Math.max(prev, Math.round(audio.currentTime)));
        }
    };

    const handleEnded = (e) => {
        setIsPlaying(false);
        setIsLoading(false);
        const audio = e.currentTarget;
        if (audio.currentTime > 0) {
            setDuration((prev) => Math.max(prev, Math.round(audio.currentTime)));
        }
        audio.currentTime = 0;
        setCurrentTime(0);
    };

    const handleError = () => {
        const err = audioRef.current?.error;
        // Code 1 is MEDIA_ERR_ABORTED - not an actual playback error
        if (err && err.code === 1) {
            setIsLoading(false);
            return;
        }
        console.warn("Audio load error:", err);
        setHasError(true);
        setIsPlaying(false);
        setIsLoading(false);
    };

    const togglePlay = useCallback(async (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();

        const audio = audioRef.current;
        if (!audio || !cleanSrc) return;

        // If previously errored, reset and reload
        if (hasError) {
            setHasError(false);
            try {
                audio.load();
            } catch { }
        }

        if (audio.paused || audio.ended) {
            // Restart from beginning if at or past the end
            const effectiveDuration = duration > 0 ? duration : (Number.isFinite(audio.duration) ? audio.duration : 0);
            if (effectiveDuration > 0 && audio.currentTime >= effectiveDuration) {
                audio.currentTime = 0;
                setCurrentTime(0);
            }

            // Pause other media playing on the page
            try {
                document.querySelectorAll("audio, video").forEach((media) => {
                    if (media !== audio && !media.paused) {
                        media.pause();
                    }
                });
            } catch { }

            // Immediate loading state feedback for mobile touch
            setIsLoading(true);

            try {
                audio.playbackRate = SPEEDS[speedIndex];
            } catch { }

            try {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    await playPromise;
                }
                setIsPlaying(true);
                setIsLoading(false);
            } catch (err) {
                console.warn("Audio play rejected:", err);
                if (err?.name !== "AbortError") {
                    setIsPlaying(false);
                    setIsLoading(false);
                    if (err?.name !== "NotAllowedError") {
                        setHasError(true);
                    }
                }
            }
        } else {
            audio.pause();
            setIsPlaying(false);
            setIsLoading(false);
        }
    }, [cleanSrc, hasError, duration, speedIndex]);

    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = !audio.muted;
        setIsMuted(audio.muted);
    }, []);

    const seekTo = useCallback((time) => {
        const audio = audioRef.current;
        if (!audio) return;
        const effectiveDuration = duration > 0 ? duration : (Number.isFinite(audio.duration) ? audio.duration : 0);
        if (effectiveDuration <= 0) return;
        const target = Math.min(Math.max(time, 0), effectiveDuration);
        audio.currentTime = target;
        setCurrentTime(target);
    }, [duration]);

    const handleTrackClick = (e) => {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const clientX = e.clientX;
        if (clientX == null) return;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const effectiveDuration = duration > 0 ? duration : (Number.isFinite(audioRef.current?.duration) ? audioRef.current.duration : 0);
        if (effectiveDuration > 0) {
            seekTo(ratio * effectiveDuration);
        }
    };

    const skip = useCallback((delta) => {
        const audio = audioRef.current;
        if (!audio) return;
        seekTo(audio.currentTime + delta);
    }, [seekTo]);

    const cycleSpeed = useCallback(() => {
        const next = (speedIndex + 1) % SPEEDS.length;
        setSpeedIndex(next);
        if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
    }, [speedIndex]);

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
        if (e.target.tagName === "INPUT") return;
        if (e.key === " " || e.key === "k") {
            e.preventDefault();
            togglePlay();
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            skip(5);
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            skip(-5);
        } else if (e.key === "m" || e.key === "M") {
            toggleMute();
        }
    };

    const effectiveDuration = duration > 0 ? duration : (Number.isFinite(audioRef.current?.duration) ? audioRef.current.duration : 0);
    const progress = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;
    const hasStarted = isPlaying || currentTime > 0;
    const leftTime = hasStarted ? formatTime(currentTime) : (effectiveDuration > 0 ? formatTime(effectiveDuration) : "0:00");

    if (!cleanSrc) return null;

    return (
        <div
            className={`${styles.player} ${isPlaying ? styles.playing : ""} ${hasError ? styles.errored : ""}`}
            onKeyDown={handleKeyDown}
            role="group"
            aria-label={title}
        >
            <audio
                ref={audioRef}
                src={cleanSrc}
                preload="metadata"
                playsInline
                webkit-playsinline="true"
                x-webkit-airplay="allow"
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleDurationChange}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                }}
                onPlaying={() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                }}
                onPause={() => {
                    setIsPlaying(false);
                    setIsLoading(false);
                }}
                onWaiting={() => setIsLoading(true)}
                onCanPlay={() => setIsLoading(false)}
                onCanPlayThrough={() => setIsLoading(false)}
                onEnded={handleEnded}
                onError={handleError}
                style={{ display: "none" }}
            >
                {mimeType ? <source src={cleanSrc} type={mimeType} /> : null}
                <source src={cleanSrc} />
            </audio>

            <div className={styles.mainRow}>
                <button
                    type="button"
                    className={styles.playBtn}
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
                    title={isPlaying ? "Pause" : "Play"}
                >
                    {isLoading ? (
                        <span className={styles.spinner} aria-hidden="true" />
                    ) : isPlaying ? (
                        <RiPauseFill aria-hidden="true" />
                    ) : (
                        <RiPlayFill aria-hidden="true" />
                    )}
                </button>

                {hasError ? (
                    <div className={styles.errorRow}>
                        <p className={styles.errorText}>
                            <RiErrorWarningLine aria-hidden="true" /> Unable to load voice note.
                        </p>
                        <button
                            type="button"
                            className={styles.retryBtn}
                            onClick={togglePlay}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div
                        ref={trackRef}
                        className={styles.track}
                        onClick={handleTrackClick}
                    >
                        <div className={styles.wave} aria-hidden="true">
                            {BAR_HEIGHTS.map((h, i) => {
                                const barPos = ((i + 0.5) / BAR_COUNT) * 100;
                                return (
                                    <span
                                        key={i}
                                        className={`${styles.bar} ${barPos <= progress ? styles.barPlayed : ""}`}
                                        style={{ height: `${h}%` }}
                                    />
                                );
                            })}
                        </div>

                        {/* Blue playhead dot */}
                        <span
                            className={styles.thumb}
                            style={{ left: `${progress}%` }}
                            aria-hidden="true"
                        />

                        {/* Native range input on top for touch, pointer & keyboard seeking */}
                        <input
                            type="range"
                            className={styles.seek}
                            min={0}
                            max={effectiveDuration > 0 ? effectiveDuration : 100}
                            step={0.01}
                            value={Math.min(currentTime, effectiveDuration > 0 ? effectiveDuration : 100)}
                            disabled={effectiveDuration <= 0}
                            aria-label="Seek"
                            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(effectiveDuration)}`}
                            onPointerDown={() => setIsSeeking(true)}
                            onPointerUp={() => setIsSeeking(false)}
                            onPointerCancel={() => setIsSeeking(false)}
                            onBlur={() => setIsSeeking(false)}
                            onChange={(e) => seekTo(Number(e.target.value))}
                        />
                    </div>
                )}

                <div className={styles.sideCol}>
                    <button
                        type="button"
                        className={styles.speedBtn}
                        onClick={cycleSpeed}
                        aria-label={`Playback speed ${SPEEDS[speedIndex]}x`}
                        title="Playback speed"
                    >
                        {SPEEDS[speedIndex]}×
                    </button>
                </div>
            </div>

            <div className={styles.metaRow}>
                <span className={styles.time}>{leftTime}</span>
                <span className={styles.metaRight}>
                    {isMuted && (
                        <RiVolumeMuteLine className={styles.mutedIcon} aria-label="Muted" />
                    )}
                    {hasStarted && effectiveDuration > 0 ? formatTime(effectiveDuration) : title}
                </span>
            </div>
        </div>
    );
}
