"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../postProperty.module.css";
import {
    RiUploadCloud2Line,
    RiCloseLine,
    RiStarFill,
    RiGlobalLine,
    RiMicLine,
    RiStopFill,
    RiDeleteBinLine,
    RiLayout2Line,
    RiImageLine,
    RiClockwiseLine,
} from "react-icons/ri";
import { rotateImage } from "../../lib/rotateImage";
import PropertyReelGenerator from "../PropertyReelGenerator";

const MAX_VOICE_SECONDS = 180;

const formatDuration = (totalSeconds) => {
    const num = Number(totalSeconds);
    if (isNaN(num) || !isFinite(num) || num <= 0) return "0:00";
    const m = Math.floor(num / 60);
    const s = Math.floor(num % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
};

export default function Step6Media({
    formData,
    setFormData,
    showToast,
    propertyId,
    getActivePropertyId,
    persistStep,
    goToStep,
    reelEntitlement,
    onFinishAfterReelUnlock,
}) {
    const fileInputRef = useRef(null);
    const floorPlanInputRef = useRef(null);
    const dragIndexRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [loadedAudioDuration, setLoadedAudioDuration] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, type: '', id: null, title: '' });
    const { media } = formData;

    // ---- Voice note recording -------------------------------------------
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const secondsRef = useRef(0);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const stopRecording = (shouldSave) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;
        recorder.shouldSave = shouldSave;
        if (recorder.state !== "inactive") recorder.stop();
    };

    const startRecording = async () => {
        if (isRecording) return;
        if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
            showToast("Audio recording isn't supported in this browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            audioChunksRef.current = [];
            secondsRef.current = 0;

            const recorder = new MediaRecorder(stream);
            recorder.shouldSave = true;
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                mediaStreamRef.current = null;
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                const duration = secondsRef.current;
                secondsRef.current = 0;
                setIsRecording(false);
                setRecordingSeconds(0);

                if (!recorder.shouldSave || audioChunksRef.current.length === 0) return;

                const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
                // Replace any previous take so we never leak the old object URL.
                if (media.voiceNote?.url) URL.revokeObjectURL(media.voiceNote.url);
                updateMedia("voiceNote", { url: URL.createObjectURL(blob), duration, blob });
                showToast("Voice note added to your listing.");
            };

            recorder.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            timerRef.current = setInterval(() => {
                secondsRef.current += 1;
                setRecordingSeconds(secondsRef.current);
                if (secondsRef.current >= MAX_VOICE_SECONDS) stopRecording(true);
            }, 1000);
        } catch {
            showToast("Microphone access is required to record a voice note.");
        }
    };

    const deleteVoiceNote = () => {
        if (media.voiceNote?.url && media.voiceNote.url.startsWith("blob:")) {
            URL.revokeObjectURL(media.voiceNote.url);
        }
        setLoadedAudioDuration(null);
        updateMedia("voiceNote", null);
    };

    // Rotate a photo / floor plan 90° clockwise. The rotated image replaces the
    // original as a new upload (a server image gets a new local id, so the next
    // save uploads the rotated copy and drops the old one).
    const [rotatingIds, setRotatingIds] = useState({});
    const rotateMediaItem = async (listKey, id) => {
        const key = `${listKey}:${id}`;
        if (rotatingIds[key]) return;
        const item = (formData.media?.[listKey] || []).find((p) => String(p.id) === String(id));
        if (!item) return;

        setRotatingIds((prev) => ({ ...prev, [key]: true }));
        try {
            const rotatedFile = await rotateImage(item);
            const newId = `media_${Date.now()}_rot_${Math.random().toString(36).slice(2, 7)}`;
            const newUrl = URL.createObjectURL(rotatedFile);
            setFormData((prev) => ({
                ...prev,
                media: {
                    ...prev.media,
                    [listKey]: (prev.media?.[listKey] || []).map((p) => {
                        if (String(p.id) !== String(id)) return p;
                        if (String(p.url || "").startsWith("blob:")) URL.revokeObjectURL(p.url);
                        return { ...p, id: newId, url: newUrl, name: rotatedFile.name, file: rotatedFile };
                    }),
                },
            }));
        } catch (err) {
            console.error("Rotate failed:", err);
            showToast("Couldn't rotate this image. Please try again or re-upload it.");
        } finally {
            setRotatingIds((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const updateMedia = (field, value) => {
        setFormData((prev) => ({ ...prev, media: { ...prev.media, [field]: value } }));
    };

    const addFiles = (fileList) => {
        const files = [...fileList].filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return;

        const timestamp = Date.now();
        const newPhotos = files.map((file, index) => {
            const uniqueId = `media_${timestamp}_${index}_${Math.random().toString(36).slice(2, 7)}`;
            return {
                id: uniqueId,
                url: URL.createObjectURL(file),
                name: file.name,
                file,
            };
        });

        setFormData((prev) => ({
            ...prev,
            media: {
                ...prev.media,
                photos: [...(prev.media?.photos || []), ...newPhotos],
            },
        }));

        showToast(`${files.length} photo${files.length > 1 ? "s" : ""} added.`);
    };

    const addFloorPlanFiles = (fileList) => {
        const files = [...fileList].filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return;

        const timestamp = Date.now();
        const newPlans = files.map((file, index) => ({
            id: `floor_${timestamp}_${index}_${Math.random().toString(36).slice(2, 7)}`,
            url: URL.createObjectURL(file),
            name: file.name,
            file,
        }));

        setFormData((prev) => ({
            ...prev,
            media: {
                ...prev.media,
                floorPlans: [...(prev.media.floorPlans || []), ...newPlans],
            },
        }));
        showToast(`${files.length} floor plan image${files.length > 1 ? "s" : ""} added.`);
    };

    const handleFileInput = (e) => {
        addFiles(e.target.files);
        e.target.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    const removePhoto = (id) => {
        setFormData((prev) => {
            const removedIndex = prev.media.photos.findIndex((p) => String(p.id) === String(id));
            const target = prev.media.photos.find((p) => String(p.id) === String(id));
            if (target && target.file) URL.revokeObjectURL(target.url);
            const nextPhotos = prev.media.photos.filter((p) => String(p.id) !== String(id));
            let nextCover = prev.media.coverIndex;
            if (removedIndex === prev.media.coverIndex) nextCover = 0;
            else if (removedIndex < prev.media.coverIndex) nextCover -= 1;
            return { ...prev, media: { ...prev.media, photos: nextPhotos, coverIndex: Math.max(0, nextCover) } };
        });
    };

    const confirmDelete = () => {
        if (deleteModal.id === null || deleteModal.id === undefined) return;
        if (deleteModal.type === "photo") {
            removePhoto(deleteModal.id);
            showToast("Photo removed from property.");
        } else if (deleteModal.type === "floorPlan") {
            removeFloorPlan(deleteModal.id);
            showToast("Floor plan removed from property.");
        }
        setDeleteModal({ open: false, type: "", id: null, title: "" });
    };

    const setCover = (index) => updateMedia("coverIndex", index);

    // Manual escape hatch for when the filename heuristic gets it wrong in
    // either direction.
    const moveToFloorPlan = (id) => {
        setFormData((prev) => {
            const target = prev.media.photos.find((p) => String(p.id) === String(id));
            if (!target) return prev;
            const removedIndex = prev.media.photos.findIndex((p) => String(p.id) === String(id));
            const nextPhotos = prev.media.photos.filter((p) => String(p.id) !== String(id));
            let nextCover = prev.media.coverIndex;
            if (removedIndex === prev.media.coverIndex) nextCover = 0;
            else if (removedIndex < prev.media.coverIndex) nextCover -= 1;
            return {
                ...prev,
                media: {
                    ...prev.media,
                    photos: nextPhotos,
                    coverIndex: Math.max(0, nextCover),
                    floorPlans: [...prev.media.floorPlans, target],
                },
            };
        });
        showToast("Moved to Floor Plan.");
    };

    const moveToPhotos = (id) => {
        setFormData((prev) => {
            const target = prev.media.floorPlans.find((p) => String(p.id) === String(id));
            if (!target) return prev;
            return {
                ...prev,
                media: {
                    ...prev.media,
                    floorPlans: prev.media.floorPlans.filter((p) => String(p.id) !== String(id)),
                    photos: [...prev.media.photos, target],
                },
            };
        });
        showToast("Moved to Photos.");
    };

    const removeFloorPlan = (id) => {
        setFormData((prev) => {
            const target = prev.media.floorPlans.find((p) => String(p.id) === String(id));
            if (target && target.file) URL.revokeObjectURL(target.url);
            return {
                ...prev,
                media: { ...prev.media, floorPlans: prev.media.floorPlans.filter((p) => String(p.id) !== String(id)) },
            };
        });
    };

    // Drag-to-reorder for the photo gallery. Cover photo follows its tile if
    // the user drags it around.
    const handleDragStart = (index) => {
        dragIndexRef.current = index;
    };

    const handleDragOverThumb = (e) => {
        e.preventDefault();
    };

    const handleDropOnThumb = (dropIndex) => {
        const from = dragIndexRef.current;
        if (from === null || from === dropIndex) return;

        setFormData((prev) => {
            const copy = [...prev.media.photos];
            const [moved] = copy.splice(from, 1);
            copy.splice(dropIndex, 0, moved);

            let nextCover = prev.media.coverIndex;
            if (prev.media.coverIndex === from) nextCover = dropIndex;
            else if (from < prev.media.coverIndex && dropIndex >= prev.media.coverIndex) nextCover -= 1;
            else if (from > prev.media.coverIndex && dropIndex <= prev.media.coverIndex) nextCover += 1;

            return { ...prev, media: { ...prev.media, photos: copy, coverIndex: nextCover } };
        });

        dragIndexRef.current = null;
    };

    return (
        <>
            <h2 className={styles.stepHeadline}>Add photos & videos</h2>
            <p className={styles.stepSubtext}>
                Listings with 5+ clear photos get significantly more enquiries. Drag to reorder, and pick a cover photo.
            </p>

            <div
                id="field-photos"
                className={`${styles.uploadZone} ${isDragOver ? styles.uploadZoneDragging : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <span className={styles.uploadIcon}>
                    <RiUploadCloud2Line />
                </span>
                <span className={styles.uploadText}>Drag & drop photos here, or click to browse</span>
                <span className={styles.uploadHint}>JPG or PNG, up to 10 MB each</span>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className={styles.hiddenInput}
                    onChange={handleFileInput}
                />
            </div>

            {media.photos.length > 0 && (
                <div className={styles.photoGrid}>
                    {media.photos.map((photo, index) => {
                        const itemKey = photo.id ? `photo-${photo.id}` : `photo-${index}-${photo.url || ""}`;
                        return (
                            <div
                                key={itemKey}
                                className={`${styles.photoThumb} ${index === media.coverIndex ? styles.photoThumbCover : ""}`}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={handleDragOverThumb}
                                onDrop={() => handleDropOnThumb(index)}
                            >
                                <img src={photo.url} alt={photo.name || `Photo ${index + 1}`} className={styles.photoThumbImg} />
                                {index === media.coverIndex && <span className={styles.coverBadge}>Cover</span>}
                                {rotatingIds[`photos:${photo.id}`] && (
                                    <span className={styles.photoRotatingOverlay} aria-live="polite">
                                        <span className={styles.photoRotatingSpinner} /> Rotating…
                                    </span>
                                )}
                                <div className={styles.photoThumbActions}>
                                    <button
                                        type="button"
                                        className={`${styles.photoIconBtn} ${styles.photoIconBtnNeutral}`}
                                        onClick={() => rotateMediaItem("photos", photo.id)}
                                        disabled={!!rotatingIds[`photos:${photo.id}`]}
                                        aria-label="Rotate photo"
                                        title="Rotate 90° clockwise"
                                    >
                                        <RiClockwiseLine />
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.photoIconBtn} ${styles.photoIconBtnNeutral}`}
                                        onClick={() => moveToFloorPlan(photo.id)}
                                        aria-label="Mark as floor plan"
                                        title="This is a floor plan, not a photo"
                                    >
                                        <RiLayout2Line />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.photoIconBtn}
                                        onClick={() => setDeleteModal({ open: true, type: "photo", id: photo.id, title: photo.name || `Photo #${index + 1}` })}
                                        aria-label="Delete photo"
                                    >
                                        <RiCloseLine />
                                    </button>
                                </div>
                                {index !== media.coverIndex && (
                                    <button type="button" className={styles.photoSetCoverRow} onClick={() => setCover(index)}>
                                        <RiStarFill /> Set as cover
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Floor Plan Section */}
            <div style={{ marginTop: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Floor Plan</h3>
                    <button
                        type="button"
                        className={styles.voiceRecordBtn}
                        onClick={() => floorPlanInputRef.current?.click()}
                        style={{ margin: 0, padding: "7px 14px", fontSize: "13px" }}
                    >
                        <RiLayout2Line /> Upload Floor Plan
                    </button>
                    <input
                        ref={floorPlanInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className={styles.hiddenInput}
                        onChange={(e) => {
                            addFloorPlanFiles(e.target.files);
                            e.target.value = "";
                        }}
                    />
                </div>
                <p className={styles.helperText} style={{ marginBottom: "14px" }}>
                    Upload 2D / 3D floor plans and layout drawings so buyers can preview the spatial layout.
                </p>

                {media.floorPlans && media.floorPlans.length > 0 && (
                    <div className={styles.photoGrid} style={{ marginBottom: "20px" }}>
                        {media.floorPlans.map((plan, index) => {
                            const planKey = plan.id ? `plan-${plan.id}` : `plan-${index}-${plan.url || ""}`;
                            return (
                                <div key={planKey} className={styles.photoThumb}>
                                    <img src={plan.url} alt={plan.name || `Floor Plan ${index + 1}`} className={styles.photoThumbImg} />
                                    {rotatingIds[`floorPlans:${plan.id}`] && (
                                        <span className={styles.photoRotatingOverlay} aria-live="polite">
                                            <span className={styles.photoRotatingSpinner} /> Rotating…
                                        </span>
                                    )}
                                    <div className={styles.photoThumbActions}>
                                        <button
                                            type="button"
                                            className={`${styles.photoIconBtn} ${styles.photoIconBtnNeutral}`}
                                            onClick={() => rotateMediaItem("floorPlans", plan.id)}
                                            disabled={!!rotatingIds[`floorPlans:${plan.id}`]}
                                            aria-label="Rotate floor plan"
                                            title="Rotate 90° clockwise"
                                        >
                                            <RiClockwiseLine />
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.photoIconBtn} ${styles.photoIconBtnNeutral}`}
                                            onClick={() => moveToPhotos(plan.id)}
                                            aria-label="Move to photos"
                                            title="This isn't a floor plan — move it back to Photos"
                                        >
                                            <RiImageLine />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.photoIconBtn}
                                            onClick={() => setDeleteModal({ open: true, type: "floorPlan", id: plan.id, title: plan.name || `Floor Plan #${index + 1}` })}
                                            aria-label="Delete floor plan"
                                        >
                                            <RiCloseLine />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <PropertyReelGenerator
                formData={formData}
                setFormData={setFormData}
                propertyId={propertyId}
                getActivePropertyId={getActivePropertyId}
                persistStep={persistStep}
                goToStep={goToStep}
                showToast={showToast}
                compactMode={true}
                reelEntitlement={reelEntitlement}
                onFinishAfterReelUnlock={onFinishAfterReelUnlock}
            />

            <h3 className={styles.sectionTitle}>3D Video</h3>
            <div className={styles.mediaLinkRow}>
                <RiGlobalLine className={styles.mediaLinkIcon} />
                <input
                    type="text"
                    placeholder="3D video or tour URL / embed (YouTube, Matterport, Kuula, etc.)"
                    value={media.tourUrl || ""}
                    onChange={(e) => updateMedia("tourUrl", e.target.value)}
                />
            </div>

            <h3 className={styles.sectionTitle}>Voice Note</h3>
            <p className={styles.voiceNoteHint}>
                Record a short audio walkthrough — what makes the place special, the neighbourhood, anything photos
                can&apos;t show. Buyers hear it on your listing.
            </p>

            {media.voiceNote ? (
                <div className={styles.voiceNoteCard}>
                    <audio
                        controls
                        src={typeof media.voiceNote === "string" ? media.voiceNote : media.voiceNote?.url}
                        className={styles.voiceNotePlayer}
                        controlsList="nodownload noplaybackrate noremoteplayback"
                        onLoadedMetadata={(e) => {
                            if (e.target.duration && !isNaN(e.target.duration) && isFinite(e.target.duration)) {
                                setLoadedAudioDuration(Math.round(e.target.duration));
                            }
                        }}
                    />
                    <span className={styles.voiceNoteDuration}>
                        {formatDuration(
                            loadedAudioDuration ??
                            (typeof media.voiceNote === "object" ? media.voiceNote?.duration : 0)
                        )}
                    </span>
                    <button
                        type="button"
                        className={styles.voiceNoteDeleteBtn}
                        onClick={deleteVoiceNote}
                        aria-label="Delete voice note"
                        title="Delete voice note"
                    >
                        <RiDeleteBinLine />
                    </button>
                </div>
            ) : isRecording ? (
                <div className={styles.voiceRecordingBar}>
                    <span className={styles.voiceRecordingDot} />
                    <span className={styles.voiceRecordingTimer}>{formatDuration(recordingSeconds)}</span>
                    <span className={styles.voiceRecordingLabel}>Recording…</span>
                    <button type="button" className={styles.voiceCancelBtn} onClick={() => stopRecording(false)}>
                        Cancel
                    </button>
                    <button type="button" className={styles.voiceStopBtn} onClick={() => stopRecording(true)}>
                        <RiStopFill /> Stop &amp; save
                    </button>
                </div>
            ) : (
                <button type="button" className={styles.voiceRecordBtn} onClick={startRecording}>
                    <RiMicLine /> Record a voice note
                </button>
            )}

            {/* Delete Image Confirmation Modal */}
            {deleteModal.open && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(15, 23, 42, 0.6)",
                        backdropFilter: "blur(4px)",
                        padding: "16px",
                    }}
                    onClick={() => setDeleteModal({ open: false, type: "", id: null, title: "" })}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "380px",
                            backgroundColor: "#ffffff",
                            borderRadius: "16px",
                            padding: "24px",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                            textAlign: "center",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 16px auto",
                                fontSize: "24px",
                            }}
                        >
                            <RiDeleteBinLine />
                        </div>
                        <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
                            Delete {deleteModal.type === "photo" ? "Photo" : "Floor Plan"}?
                        </h3>
                        <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.5", marginBottom: "20px" }}>
                            Are you sure you want to delete this {deleteModal.type === "photo" ? "photo" : "floor plan"}? It will only be removed from your property after you confirm.
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => setDeleteModal({ open: false, type: "", id: null, title: "" })}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "10px",
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#ffffff",
                                    color: "#334155",
                                    fontWeight: "600",
                                    fontSize: "13.5px",
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "10px",
                                    border: "none",
                                    backgroundColor: "#dc2626",
                                    color: "#ffffff",
                                    fontWeight: "600",
                                    fontSize: "13.5px",
                                    cursor: "pointer",
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
