"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./profileCropModal.module.css";
import {
    RiCloseLine,
    RiZoomInLine,
    RiZoomOutLine,
    RiClockwiseLine,
    RiRefreshLine,
    RiCheckLine,
} from "react-icons/ri";

const CROP_SIZE = 300;

export default function ProfileCropModal({
    isOpen,
    imageSrc,
    originalFileName = "profile-avatar.jpg",
    onClose,
    onApply,
}) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [imgDims, setImgDims] = useState({ width: 0, height: 0 });

    const stageRef = useRef(null);
    const imgRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });


    // Reset zoom, rotation and pan when modal opens with a new image
    useEffect(() => {
        if (isOpen) {
            setZoom(1);
            setRotation(0);
            setPan({ x: 0, y: 0 });
        }
    }, [isOpen, imageSrc]);

    // Handle Escape key to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const handleImageLoad = (e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setImgDims({ width: naturalWidth, height: naturalHeight });
    };

    // Calculate base scale to ensure image covers crop circle
    const isSideways = rotation % 180 !== 0;
    const effectiveW = isSideways ? (imgDims.height || CROP_SIZE) : (imgDims.width || CROP_SIZE);
    const effectiveH = isSideways ? (imgDims.width || CROP_SIZE) : (imgDims.height || CROP_SIZE);
    const baseScale = Math.max(CROP_SIZE / effectiveW, CROP_SIZE / effectiveH);

    // Pointer event handlers for drag/pan
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
            panX: pan.x,
            panY: pan.y,
        };
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPan({
            x: dragStartRef.current.panX + dx,
            y: dragStartRef.current.panY + dy,
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
        if (!stage || !isOpen) return;
        stage.addEventListener("wheel", handleWheel, { passive: false });
        return () => stage.removeEventListener("wheel", handleWheel);
    }, [isOpen, handleWheel]);

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

    // Export cropped image via HTML5 canvas
    const handleApply = () => {
        if (!imgRef.current || !imgDims.width) return;

        const outputSize = 512;
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const canvasScale = outputSize / CROP_SIZE;

        // 1. Move origin to canvas center
        ctx.translate(outputSize / 2, outputSize / 2);
        // 2. Pan (scaled)
        ctx.translate(pan.x * canvasScale, pan.y * canvasScale);
        // 3. Rotate
        ctx.rotate((rotation * Math.PI) / 180);
        // 4. Scale
        const totalScale = baseScale * zoom * canvasScale;
        ctx.scale(totalScale, totalScale);
        // 5. Draw centered
        ctx.drawImage(
            imgRef.current,
            -imgDims.width / 2,
            -imgDims.height / 2,
            imgDims.width,
            imgDims.height
        );

        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const extension = originalFileName?.toLowerCase().endsWith(".png") ? "png" : "jpg";
                const mimeType = extension === "png" ? "image/png" : "image/jpeg";
                const baseName = originalFileName
                    ? originalFileName.replace(/\.[^/.]+$/, "")
                    : "profile-photo";
                const file = new File([blob], `${baseName}-cropped.${extension}`, {
                    type: mimeType,
                    lastModified: Date.now(),
                });
                const dataUrl = canvas.toDataURL(mimeType, 0.92);
                onApply({ file, dataUrl });
            },
            "image/jpeg",
            0.92
        );
    };

    if (!isOpen || !imageSrc) return null;

    const thumbScale = 28 / CROP_SIZE;

    return (
        <div
            className={styles.overlay}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-modal-title"
        >
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleWrap}>
                        <h3 id="crop-modal-title" className={styles.title}>
                            Crop Profile Photo
                        </h3>
                        <p className={styles.subtitle}>
                            Drag to reposition and adjust size to fit your avatar
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

                {/* Stage */}
                <div className={styles.stageWrap}>
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
                            alt="Crop target"
                            crossOrigin="anonymous"
                            className={styles.image}
                            onLoad={handleImageLoad}
                            style={{
                                width: imgDims.width ? `${imgDims.width}px` : "auto",
                                height: imgDims.height ? `${imgDims.height}px` : "auto",
                                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                            }}
                        />

                        {/* Circular cutout vignette & guide */}
                        <div className={styles.maskOverlay}>
                            <div className={styles.guideCross} />
                        </div>
                    </div>
                    <div className={styles.stageHint}>Drag photo to adjust position</div>
                </div>

                {/* Controls */}
                <div className={styles.controls}>
                    {/* Zoom Slider */}
                    <div className={styles.zoomRow}>
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
                                aria-label="Zoom level"
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

                    {/* Rotate & Reset & Live Preview */}
                    <div className={styles.toolbarRow}>
                        <div className={styles.toolbarBtns}>
                            <button
                                type="button"
                                className={styles.toolBtn}
                                onClick={handleRotate}
                                title="Rotate 90° clockwise"
                            >
                                <RiClockwiseLine />
                                <span>Rotate</span>
                            </button>
                            <button
                                type="button"
                                className={styles.toolBtn}
                                onClick={handleReset}
                                title="Reset position and zoom"
                            >
                                <RiRefreshLine />
                                <span>Reset</span>
                            </button>
                        </div>

                        <div className={styles.previewBadge}>
                            <span>Preview:</span>
                            <div className={styles.previewCircle}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imageSrc}
                                    alt="Live preview"
                                    style={{
                                        width: imgDims.width ? `${imgDims.width}px` : "auto",
                                        height: imgDims.height ? `${imgDims.height}px` : "auto",
                                        transform: `translate(calc(-50% + ${pan.x * thumbScale}px), calc(-50% + ${pan.y * thumbScale}px)) rotate(${rotation}deg) scale(${baseScale * zoom * thumbScale})`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
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
                        <RiCheckLine />
                        <span>Apply & Save Crop</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
