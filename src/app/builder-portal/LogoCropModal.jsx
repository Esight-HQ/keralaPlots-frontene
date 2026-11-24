"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./logoCropModal.module.css";
import {
    RiCloseLine,
    RiZoomInLine,
    RiZoomOutLine,
    RiClockwiseLine,
    RiRefreshLine,
    RiCheckLine,
    RiCropLine,
    RiShieldCheckLine,
} from "react-icons/ri";

const ASPECT_OPTIONS = [
    { id: "natural", label: "Original Fit" },
    { id: "1:1", label: "1:1 Square", ratio: 1, outW: 512, outH: 512 },
    { id: "2:1", label: "2:1 Wordmark", ratio: 2, outW: 600, outH: 300 },
    { id: "16:9", label: "16:9 Wide", ratio: 16 / 9, outW: 640, outH: 360 },
    { id: "4:3", label: "4:3 Standard", ratio: 4 / 3, outW: 512, outH: 384 },
];

const MAX_VIEW_W = 440;
const MAX_VIEW_H = 240;

function LogoCropModalInner({
    imageSrc,
    onClose,
    onApply,
}) {
    const [selectedAspect, setSelectedAspect] = useState("natural");
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [imgDims, setImgDims] = useState({ width: 0, height: 0 });

    const stageRef = useRef(null);
    const imgRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

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

    // Calculate effective aspect ratio
    const currentOption = ASPECT_OPTIONS.find((o) => o.id === selectedAspect) || ASPECT_OPTIONS[0];
    let targetRatio = 1;
    if (selectedAspect === "natural") {
        targetRatio = imgDims.width && imgDims.height ? imgDims.width / imgDims.height : 2;
    } else {
        targetRatio = currentOption.ratio || 1;
    }

    // Compute responsive stage width and height within bounding box
    let stageW = MAX_VIEW_W;
    let stageH = stageW / targetRatio;
    if (stageH > MAX_VIEW_H) {
        stageH = MAX_VIEW_H;
        stageW = stageH * targetRatio;
    }

    // Account for rotation
    const isSideways = rotation % 180 !== 0;
    const effectiveW = isSideways ? (imgDims.height || stageW) : (imgDims.width || stageW);
    const effectiveH = isSideways ? (imgDims.width || stageH) : (imgDims.height || stageH);

    // Base scale ensures image completely fills the stage with no empty borders
    const baseScale = Math.max(
        stageW / (effectiveW || 1),
        stageH / (effectiveH || 1)
    );

    // Current displayed dimensions
    const dispW = effectiveW * baseScale * zoom;
    const dispH = effectiveH * baseScale * zoom;

    // Pan clamping bounds
    const maxPanX = Math.max(0, (dispW - stageW) / 2);
    const maxPanY = Math.max(0, (dispH - stageH) / 2);

    const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, pan.x));
    const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, pan.y));

    // Pointer events for drag/pan
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

    // Export as high-resolution PNG with transparency preserved
    const handleApply = () => {
        if (!imgRef.current || !imgDims.width) return;

        let outW = 512;
        let outH = 512;
        if (selectedAspect === "natural") {
            if (targetRatio >= 1) {
                outW = 600;
                outH = Math.round(outW / targetRatio);
            } else {
                outH = 600;
                outW = Math.round(outH * targetRatio);
            }
        } else {
            outW = currentOption.outW || 512;
            outH = currentOption.outH || 512;
        }

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas to ensure transparent background is preserved
        ctx.clearRect(0, 0, outW, outH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const canvasScale = outW / stageW;

        // 1. Center of canvas
        ctx.translate(outW / 2, outH / 2);
        // 2. Pan
        ctx.translate(clampedPanX * canvasScale, clampedPanY * canvasScale);
        // 3. Rotate
        ctx.rotate((rotation * Math.PI) / 180);
        // 4. Scale
        const totalScale = baseScale * zoom * canvasScale;
        ctx.scale(totalScale, totalScale);
        // 5. Draw
        ctx.drawImage(
            imgRef.current,
            -imgDims.width / 2,
            -imgDims.height / 2,
            imgDims.width,
            imgDims.height
        );

        // Export as PNG so transparency is completely preserved
        const croppedDataUrl = canvas.toDataURL("image/png");
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
            aria-labelledby="logo-crop-modal-title"
        >
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleWrap}>
                        <div className={styles.titleRow}>
                            <h3 id="logo-crop-modal-title" className={styles.title}>
                                Crop Company Logo
                            </h3>
                            <span className={styles.pngBadge}>
                                <RiShieldCheckLine /> PNG Transparency
                            </span>
                        </div>
                        <p className={styles.subtitle}>
                            Select aspect ratio and position your brand mark
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

                {/* Aspect Ratio Selector */}
                <div className={styles.aspectBar}>
                    <span className={styles.aspectLabel}>Ratio:</span>
                    {ASPECT_OPTIONS.map((opt) => {
                        const isActive = selectedAspect === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    setSelectedAspect(opt.id);
                                    setZoom(1);
                                    setPan({ x: 0, y: 0 });
                                }}
                                className={`${styles.aspectBtn} ${isActive ? styles.aspectBtnActive : ""}`}
                            >
                                <RiCropLine /> {opt.label}
                            </button>
                        );
                    })}
                </div>

                {/* Crop Stage */}
                <div className={styles.stageWrap}>
                    <div className={styles.viewportContainer}>
                        <div
                            ref={stageRef}
                            className={`${styles.viewport} ${isDragging ? styles.viewportDragging : ""}`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            style={{
                                width: `${Math.round(stageW)}px`,
                                height: `${Math.round(stageH)}px`,
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imgRef}
                                src={imageSrc}
                                alt="Company logo preview"
                                crossOrigin="anonymous"
                                className={styles.image}
                                onLoad={handleImageLoad}
                                style={{
                                    width: imgDims.width ? `${imgDims.width}px` : "auto",
                                    height: imgDims.height ? `${imgDims.height}px` : "auto",
                                    transform: `translate(calc(-50% + ${clampedPanX}px), calc(-50% + ${clampedPanY}px)) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                                }}
                            />

                            {/* Rule of Thirds Guides */}
                            <div className={styles.ruleOfThirdsGrid}>
                                <div className={styles.gridLineV1} />
                                <div className={styles.gridLineV2} />
                                <div className={styles.gridLineH1} />
                                <div className={styles.gridLineH2} />
                            </div>
                        </div>
                    </div>
                    <div className={styles.stageHint}>Drag logo to center • Scroll to zoom • Transparency preserved</div>
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
                            <span>Export: Crystal Clear PNG</span>
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
                        <RiCheckLine /> Set Company Logo
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function LogoCropModal({
    isOpen,
    imageSrc,
    onClose,
    onApply,
}) {
    if (!isOpen || !imageSrc) return null;

    return (
        <LogoCropModalInner
            key={imageSrc}
            imageSrc={imageSrc}
            onClose={onClose}
            onApply={onApply}
        />
    );
}
