"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./bannerCropModal.module.css";
import {
    RiCloseLine,
    RiZoomInLine,
    RiZoomOutLine,
    RiClockwiseLine,
    RiRefreshLine,
    RiCheckLine,
    RiCropLine,
} from "react-icons/ri";

const ASPECT_RATIO = 16 / 7; // ~2.2857:1
const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 700; // 1600 * (7 / 16) = 700 exactly

function BannerCropModalInner({
    imageSrc,
    onClose,
    onApply,
    title = "Crop Hero Cover Banner",
    subtitle = "Reposition & scale your architectural banner to fit the 16:7 hero header",
    badge = "16:7 Ratio",
    applyLabel = "Set 16:7 Banner",
}) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
    const [stageSize, setStageSize] = useState({ width: 640, height: 280 });

    const stageRef = useRef(null);
    const imgRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    // Measure stage dimensions responsively
    useEffect(() => {
        const updateSize = () => {
            if (stageRef.current) {
                const w = stageRef.current.clientWidth;
                const h = w / ASPECT_RATIO;
                setStageSize({ width: w, height: h });
            }
        };
        updateSize();

        const observer = new ResizeObserver(() => updateSize());
        if (stageRef.current) observer.observe(stageRef.current);
        window.addEventListener("resize", updateSize);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateSize);
        };
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleImageLoad = (e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setImgDims({ width: naturalWidth, height: naturalHeight });
    };

    // Calculate dimensions with rotation taken into account
    const isSideways = rotation % 180 !== 0;
    const effectiveW = isSideways ? (imgDims.height || stageSize.width) : (imgDims.width || stageSize.width);
    const effectiveH = isSideways ? (imgDims.width || stageSize.height) : (imgDims.height || stageSize.height);

    // Base scale ensures image completely fills the 16:7 stage with zero empty borders
    const baseScale = Math.max(
        stageSize.width / (effectiveW || 1),
        stageSize.height / (effectiveH || 1)
    );

    // Current displayed dimensions
    const dispW = effectiveW * baseScale * zoom;
    const dispH = effectiveH * baseScale * zoom;

    // Pan clamping bounds
    const maxPanX = Math.max(0, (dispW - stageSize.width) / 2);
    const maxPanY = Math.max(0, (dispH - stageSize.height) / 2);

    // Computed clamped pan for render & canvas export
    const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, pan.x));
    const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, pan.y));

    // Drag / Pan interaction
    const handlePointerDown = (e) => {
        e.preventDefault();
        try {
            stageRef.current?.setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            panX: clampedPanX,
            panY: clampedPanY,
        };
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const targetX = dragStartRef.current.panX + dx;
        const targetY = dragStartRef.current.panY + dy;

        setPan({
            x: Math.max(-maxPanX, Math.min(maxPanX, targetX)),
            y: Math.max(-maxPanY, Math.min(maxPanY, targetY)),
        });
    };

    const handlePointerUp = (e) => {
        if (isDragging) {
            try {
                stageRef.current?.releasePointerCapture(e.pointerId);
            } catch {
                // ignore
            }
            setIsDragging(false);
        }
    };

    // Mouse wheel zoom
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        setZoom((prev) => {
            const delta = -e.deltaY * 0.0015;
            return Math.min(3, Math.max(1, +(prev + delta).toFixed(2)));
        });
    }, []);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        stage.addEventListener("wheel", handleWheel, { passive: false });
        return () => stage.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
    };

    const stepZoom = (delta) => {
        setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
    };

    // High resolution 16:7 (1600 × 700 px) canvas export
    const handleApply = () => {
        if (!imgRef.current || !imgDims.width) return;

        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_WIDTH;
        canvas.height = OUTPUT_HEIGHT;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const canvasScale = OUTPUT_WIDTH / stageSize.width;

        // 1. Move origin to canvas center (800, 350)
        ctx.translate(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2);
        // 2. Pan (scaled to high resolution output)
        ctx.translate(clampedPanX * canvasScale, clampedPanY * canvasScale);
        // 3. Rotate
        ctx.rotate((rotation * Math.PI) / 180);
        // 4. Scale
        const totalScale = baseScale * zoom * canvasScale;
        ctx.scale(totalScale, totalScale);
        // 5. Draw image centered
        ctx.drawImage(
            imgRef.current,
            -imgDims.width / 2,
            -imgDims.height / 2,
            imgDims.width,
            imgDims.height
        );

        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.90);
        onApply(croppedDataUrl);
    };

    return (
        <div
            className={styles.overlay}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="banner-crop-modal-title"
        >
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleWrap}>
                        <div className={styles.titleRow}>
                            <h3 id="banner-crop-modal-title" className={styles.title}>
                                {title}
                            </h3>
                            <span className={styles.badge167}>
                                <RiCropLine /> {badge}
                            </span>
                        </div>
                        <p className={styles.subtitle}>
                            {subtitle}
                        </p>
                    </div>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close crop modal"
                    >
                        <RiCloseLine />
                    </button>
                </div>

                {/* Crop Stage with 16:7 Viewport */}
                <div className={styles.stageWrap}>
                    <div className={styles.viewportContainer}>
                        <div
                            ref={stageRef}
                            className={`${styles.viewport} ${isDragging ? styles.viewportDragging : ""}`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imgRef}
                                src={imageSrc}
                                alt="Banner crop preview"
                                crossOrigin="anonymous"
                                className={styles.image}
                                onLoad={handleImageLoad}
                                style={{
                                    width: imgDims.width ? `${imgDims.width}px` : "auto",
                                    height: imgDims.height ? `${imgDims.height}px` : "auto",
                                    transform: `translate(calc(-50% + ${clampedPanX}px), calc(-50% + ${clampedPanY}px)) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                                }}
                            />

                            {/* 16:7 Rule-of-Thirds Grid Guides */}
                            <div className={styles.ruleOfThirdsGrid}>
                                <div className={styles.gridLineV1} />
                                <div className={styles.gridLineV2} />
                                <div className={styles.gridLineH1} />
                                <div className={styles.gridLineH2} />
                            </div>

                            <span className={styles.ratioCornerTag}>16:7 Widescreen</span>
                        </div>
                    </div>
                    <div className={styles.stageHint}>Drag photo to adjust composition • Scroll to zoom</div>
                </div>

                {/* Controls */}
                <div className={styles.controls}>
                    {/* Zoom Slider */}
                    <div className={styles.zoomRow}>
                        <span className={styles.zoomLabelLeft}>Zoom</span>
                        <button
                            type="button"
                            className={styles.controlIconBtn}
                            onClick={() => stepZoom(-0.1)}
                            disabled={zoom <= 1}
                            aria-label="Zoom out"
                            title="Zoom out"
                        >
                            <RiZoomOutLine />
                        </button>
                        <div className={styles.sliderWrap}>
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.01"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className={styles.slider}
                                aria-label="Zoom slider"
                            />
                        </div>
                        <button
                            type="button"
                            className={styles.controlIconBtn}
                            onClick={() => stepZoom(0.1)}
                            disabled={zoom >= 3}
                            aria-label="Zoom in"
                            title="Zoom in"
                        >
                            <RiZoomInLine />
                        </button>
                        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
                    </div>

                    {/* Secondary Toolbar */}
                    <div className={styles.toolbarRow}>
                        <div className={styles.toolbarGroup}>
                            <button
                                type="button"
                                className={styles.toolbarBtn}
                                onClick={handleRotate}
                                title="Rotate 90 degrees clockwise"
                            >
                                <RiClockwiseLine /> Rotate 90°
                            </button>
                            <button
                                type="button"
                                className={styles.toolbarBtn}
                                onClick={handleReset}
                                title="Reset position, zoom and rotation"
                            >
                                <RiRefreshLine /> Reset Fit
                            </button>
                        </div>
                        <div className={styles.resolutionNote}>
                            <span className={styles.resolutionDot} />
                            <span>Export: 1600 × 700 px (16:7 HD)</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.applyBtn}
                        onClick={handleApply}
                    >
                        <RiCheckLine /> {applyLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function BannerCropModal({
    isOpen,
    imageSrc,
    onClose,
    onApply,
    title,
    subtitle,
    badge,
    applyLabel,
}) {
    if (!isOpen || !imageSrc) return null;

    return (
        <BannerCropModalInner
            key={imageSrc}
            imageSrc={imageSrc}
            onClose={onClose}
            onApply={onApply}
            title={title}
            subtitle={subtitle}
            badge={badge}
            applyLabel={applyLabel}
        />
    );
}
