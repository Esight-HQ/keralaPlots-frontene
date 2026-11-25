"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import styles from "./postedReels.module.css";
import emptyStyles from "./emptyState.module.css";
import EmptyState from "./EmptyState";
import reelsApi from "../lib/reelsApi";
import {
    RiSearchLine,
    RiCloseLine,
    RiMapPin2Fill,
    RiEyeLine,
    RiHeart3Fill,
    RiPlayFill,
    RiMore2Fill,
    RiShareForwardLine,
    RiPauseCircleLine,
    RiPlayCircleLine,
    RiDeleteBinLine,
    RiAddLine,
    RiFilmLine,
    RiExternalLinkLine,
    RiBookmarkFill,
    RiEditLine,
} from "react-icons/ri";
import dynamic from "next/dynamic";
import { preloadWhenIdle } from "../lib/preloadWhenIdle";

/* Reel edit / upload / delete dialogs only appear after a click, so they load as separate
   chunks (fetched in the background once the page is idle). */
const loadPostedReelEditModal = () => import("./PostedReelEditModal");
const loadPostedReelUploadModal = () => import("./PostedReelUploadModal");
const loadPostedReelDeleteDialog = () => import("./PostedReelDeleteDialog");
const PostedReelEditModal = dynamic(loadPostedReelEditModal, { ssr: false });
const PostedReelUploadModal = dynamic(loadPostedReelUploadModal, { ssr: false });
const PostedReelDeleteDialog = dynamic(loadPostedReelDeleteDialog, { ssr: false });
const ReelInfoModal = dynamic(() => import("../post-reel/ReelInfoModal"), { ssr: false });
const ReelCheckoutModal = dynamic(() => import("../post-reel/ReelCheckoutModal"), { ssr: false });
const InvoiceModal = dynamic(() => import("../componants/invoice/InvoiceModal"), { ssr: false });
import { RiFileTextLine } from "react-icons/ri";

import { useAuth } from "../context/AuthContext";
import { profileApi } from "../lib/api";

const SKELETON_ROWS = [0, 1, 2];

const STATUS_PILL_CLASS = {
    Active: styles.statusActive,
    Inactive: styles.statusInactive,
    Pending: styles.statusPending,
};

export default function PostedReels() {
    const { user } = useAuth();
    useEffect(() => preloadWhenIdle([loadPostedReelEditModal, loadPostedReelUploadModal, loadPostedReelDeleteDialog]), []);

    const [reels, setReels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [openMenu, setOpenMenu] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [toast, setToast] = useState("");
    const [payReelId, setPayReelId] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [isFreeReelUser, setIsFreeReelUser] = useState(
        Boolean(user && (user.pay_for_reels === 0 || user.pay_for_reels === false))
    );

    // Create Reel Modal State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadVideoFile, setUploadVideoFile] = useState(null);
    const [uploadVideoPreview, setUploadVideoPreview] = useState(null);
    const [uploadCaption, setUploadCaption] = useState("");
    const [uploadPrice, setUploadPrice] = useState("");
    const [uploadLocation, setUploadLocation] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadPosterDataUrl, setUploadPosterDataUrl] = useState(null);

    // Edit Reel Modal State
    const [editingReel, setEditingReel] = useState(null);
    const [editCaption, setEditCaption] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [editStatus, setEditStatus] = useState("Active");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    // Load User's Reels & Free Reel Entitlement
    const fetchUserReels = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await reelsApi.getMyReels();
            if (res.success && Array.isArray(res.data)) {
                setReels(res.data);
            }
            if (typeof res?.is_free_reels === "boolean") {
                setIsFreeReelUser(res.is_free_reels);
            }
        } catch (err) {
            console.error("Failed to load user reels:", err);
            showToast("Failed to fetch your reels");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserReels();
        profileApi
            .getProfile()
            .then((res) => {
                const payReels = res?.data?.user?.pay_for_reels;
                if (payReels !== undefined) {
                    setIsFreeReelUser(payReels === 0 || payReels === false);
                    try {
                        const cached = JSON.parse(localStorage.getItem("kp_auth_user") || "null");
                        if (cached) {
                            cached.pay_for_reels = payReels;
                            localStorage.setItem("kp_auth_user", JSON.stringify(cached));
                        }
                    } catch {}
                }
            })
            .catch(() => {});
    }, [fetchUserReels]);

    // Close menu on click outside or Escape
    useEffect(() => {
        if (openMenu === null) return;
        const onPointerDown = (event) => {
            if (!event.target.closest(`.${styles.actionsCell}`)) setOpenMenu(null);
        };
        const onKey = (event) => {
            if (event.key === "Escape") setOpenMenu(null);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [openMenu]);

    useEffect(() => {
        if (!pendingDelete && !editingReel) return;
        const onKey = (event) => {
            if (event.key === "Escape") {
                setPendingDelete(null);
                setEditingReel(null);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [pendingDelete, editingReel]);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return reels;
        return reels.filter(
            (r) =>
                (r.caption || "").toLowerCase().includes(needle) ||
                (r.location || "").toLowerCase().includes(needle)
        );
    }, [reels, query]);

    // Status Toggle
    const handleToggleStatus = async (id) => {
        setOpenMenu(null);
        try {
            const res = await reelsApi.toggleStatus(id);
            if (res.success) {
                const updatedStatus = res.data?.status || "Active";
                setReels((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, status: updatedStatus } : r))
                );
                showToast(`Reel marked as ${updatedStatus.toLowerCase()}`);
            }
        } catch {
            showToast("Failed to update status");
        }
    };

    // Copy Link
    const copyLink = async (reel) => {
        setOpenMenu(null);
        const url = `${window.location.origin}/reels`;
        try {
            await navigator.clipboard.writeText(url);
            showToast("Reel link copied to clipboard.");
        } catch {
            showToast("Couldn't copy link.");
        }
    };

    // Delete Reel
    const confirmDelete = async () => {
        if (!pendingDelete) return;
        const reelId = pendingDelete.id;
        try {
            const res = await reelsApi.deleteReel(reelId);
            if (res.success) {
                setReels((prev) => prev.filter((r) => r.id !== reelId));
                showToast("Reel deleted successfully.");
            }
        } catch {
            showToast("Failed to delete reel.");
        } finally {
            setPendingDelete(null);
        }
    };

    const capturePoster = (url) => {
        return new Promise((resolve) => {
            const videoEl = document.createElement("video");
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.preload = "auto";
            videoEl.addEventListener("loadeddata", () => {
                try {
                    videoEl.currentTime = Math.min(0.5, (videoEl.duration || 1) / 2);
                } catch {
                    resolve(null);
                }
            });
            videoEl.addEventListener("seeked", () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = videoEl.videoWidth || 360;
                    canvas.height = videoEl.videoHeight || 640;
                    canvas.getContext("2d").drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/jpeg", 0.82));
                } catch {
                    resolve(null);
                }
            }, { once: true });
            videoEl.addEventListener("error", () => resolve(null), { once: true });
            videoEl.src = url;
        });
    };

    // Upload Reel Handlers
    const handleVideoFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 100 * 1024 * 1024) {
            showToast("Video must be smaller than 100MB");
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setUploadVideoFile(file);
        setUploadVideoPreview(previewUrl);
        capturePoster(previewUrl).then((dataUrl) => {
            setUploadPosterDataUrl(dataUrl);
        });
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadVideoFile) {
            showToast("Please choose a video file");
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("video", uploadVideoFile);
        if (uploadCaption) formData.append("caption", uploadCaption);
        if (uploadPrice) formData.append("price", uploadPrice);
        if (uploadLocation) formData.append("location", uploadLocation);

        if (uploadPosterDataUrl) {
            formData.append("thumbnail_base64", uploadPosterDataUrl);
            try {
                const blob = await (await fetch(uploadPosterDataUrl)).blob();
                formData.append("thumbnail", blob, "thumbnail.jpg");
            } catch {
                // ignore
            }
        }

        try {
            const res = await reelsApi.createReel(formData, (percent) => {
                setUploadProgress(percent);
            });

            if (res.success && res.data) {
                setShowUploadModal(false);
                setUploadVideoFile(null);
                setUploadVideoPreview(null);
                setUploadPosterDataUrl(null);
                setUploadCaption("");
                setUploadPrice("");
                setUploadLocation("");
                fetchUserReels();

                if (!res.data.is_paid && !isFreeReelUser) {
                    setPayReelId(res.data.id || res.data.reel_id);
                    setShowPayModal(true);
                } else {
                    showToast("Reel uploaded successfully! ✨");
                }
            }
        } catch (err) {
            console.error("Upload error:", err);
            showToast(err.response?.data?.message || "Failed to upload reel");
        } finally {
            setIsUploading(false);
        }
    };

    // Edit Reel Handlers
    const startEditing = (reel) => {
        setOpenMenu(null);
        setEditingReel(reel);
        setEditCaption(reel.caption || "");
        setEditPrice(reel.price || "");
        setEditLocation(reel.location || "");
        setEditStatus(reel.status || "Active");
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingReel) return;

        setIsSavingEdit(true);
        try {
            const payload = {
                caption: editCaption,
                price: editPrice,
                location: editLocation,
                status: editStatus,
            };

            const res = await reelsApi.updateReel(editingReel.id, payload);
            if (res.success) {
                setReels((prev) =>
                    prev.map((r) =>
                        r.id === editingReel.id
                            ? {
                                  ...r,
                                  caption: editCaption,
                                  price: editPrice,
                                  location: editLocation,
                                  status: editStatus,
                              }
                            : r
                    )
                );
                showToast("Reel updated successfully! ✨");
                setEditingReel(null);
            }
        } catch (err) {
            console.error("Edit reel error:", err);
            showToast(err.response?.data?.message || "Failed to update reel.");
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <>
            <section className={styles.page}>
                <div className={styles.container}>
                    <header>
                        <h1 className={styles.pageTitle}>My Posted Reels</h1>
                        <p className={styles.pageSub}>Reels you&apos;ve shared on Keralaplots.</p>
                    </header>

                    {(!isLoading || reels.length > 0) && (
                        <div className={styles.toolbar}>
                            <span className={styles.total}>
                                {!isLoading
                                    ? `Total ${visible.length} ${visible.length === 1 ? "Reel" : "Reels"}`
                                    : "Loading your reels…"}
                            </span>

                            <div className={styles.toolbarActions}>
                                <div className={styles.searchWrap}>
                                    <RiSearchLine className={styles.searchIcon} />
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder="Search by caption or location..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        aria-label="Search your posted reels"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            className={styles.searchClear}
                                            onClick={() => setQuery("")}
                                            aria-label="Clear search"
                                        >
                                            <RiCloseLine />
                                        </button>
                                    )}
                                </div>

                                <Link href="/post-reel" className={styles.postBtn}>
                                    <RiAddLine aria-hidden="true" />
                                    Post a Reel
                                </Link>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className={styles.list} aria-hidden="true">
                            {SKELETON_ROWS.map((i) => (
                                <div key={i} className={styles.skeletonRow}>
                                    <span className={styles.skeletonThumb} />
                                    <span className={styles.skeletonLines}>
                                        <span className={styles.skeletonLine} />
                                        <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : visible.length === 0 ? (
                        reels.length === 0 ? (
                            <EmptyState
                                title="No Reels Yet"
                                className={styles.emptyPlacement}
                                lines={[
                                    "You haven’t posted any reels yet.",
                                    "Share a video tour to showcase properties to thousands of buyers.",
                                ]}
                            >
                                <Link href="/reels" className={emptyStyles.btn}>
                                    <RiFilmLine aria-hidden="true" />
                                    Explore Reels
                                </Link>
                                <button
                                    type="button"
                                    className={emptyStyles.btnGhost}
                                    onClick={() => setShowUploadModal(true)}
                                >
                                    <RiAddLine aria-hidden="true" />
                                    Post a Reel
                                </button>
                            </EmptyState>
                        ) : (
                            <EmptyState
                                title="No Matches Found"
                                className={styles.emptyPlacement}
                                lines={[
                                    "No reels match your search query.",
                                    "Try searching with a different keyword or location.",
                                ]}
                            >
                                <button
                                    type="button"
                                    className={emptyStyles.btn}
                                    onClick={() => setQuery("")}
                                >
                                    Reset Search
                                </button>
                            </EmptyState>
                        )
                    ) : (
                        <div className={styles.list}>
                            {visible.map((r, index) => {
                                const menuOpen = openMenu === r.id;
                                const menuUp = visible.length > 2 && index >= visible.length - 2;

                                return (
                                    <article key={r.id} className={styles.row}>
                                        <div className={styles.rowThumbWrap}>
                                            {(() => {
                                                const streamThumb = r.video_url?.match(/(?:videodelivery\.net|cloudflarestream\.com)\/([a-zA-Z0-9]+)/)
                                                    ? `https://customer-hrtlsfl7dijstj5i.cloudflarestream.com/${r.video_url.match(/(?:videodelivery\.net|cloudflarestream\.com)\/([a-zA-Z0-9]+)/)[1]}/thumbnails/thumbnail.jpg?time=1s&height=600`
                                                    : null;
                                                const thumbSrc = r.thumbnail_url || streamThumb;
                                                const isMp4 = !thumbSrc && r.video_url && /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(r.video_url);
                                                return isMp4 ? (
                                                    <video
                                                        src={`${r.video_url}#t=0.5`}
                                                        preload="metadata"
                                                        muted
                                                        playsInline
                                                        className={styles.thumb}
                                                    />
                                                ) : (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        loading="lazy"
                                                        decoding="async"
                                                        src={thumbSrc || "/logo_placeholder.png"}
                                                        alt={r.caption || "Reel"}
                                                        className={styles.thumb}
                                                        onError={(e) => {
                                                            e.currentTarget.src = "/logo_placeholder.png";
                                                        }}
                                                    />
                                                );
                                            })()}
                                            <span className={styles.mediaTypeBadge}>
                                                <RiPlayFill />
                                            </span>

                                            {r.video_url && (
                                                <Link
                                                    href="/reels"
                                                    className={styles.viewOverlay}
                                                    aria-label="View reel in feed"
                                                    title="View in Feed"
                                                >
                                                    <span className={styles.viewOverlayIcon}>
                                                        <RiExternalLinkLine />
                                                    </span>
                                                </Link>
                                            )}
                                        </div>

                                        <div className={styles.rowContent}>
                                            <div className={styles.rowTop}>
                                                <div className={styles.rowDetails}>
                                                    <p className={styles.caption}>{r.caption || "Real Estate Video Tour"}</p>

                                                    {r.location && (
                                                        <p className={styles.location}>
                                                            <RiMapPin2Fill className={styles.pinIcon} />
                                                            {r.location}
                                                        </p>
                                                    )}

                                                    {r.price && <p className={styles.price}>{r.price}</p>}
                                                </div>

                                                <div className={styles.rowMeta}>
                                                    {r.is_paid || isFreeReelUser ? (
                                                        <span className={`${styles.statusPill} ${STATUS_PILL_CLASS[r.is_paid ? r.status : "Active"] ?? styles.statusActive}`}>
                                                            {r.is_paid ? r.status : "Active"}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className={`${styles.statusPill} ${styles.statusPending}`}>
                                                                Unpaid Draft
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className={styles.payPublishBtn}
                                                                onClick={() => {
                                                                    setPayReelId(r.id || r.reel_id);
                                                                    setShowInfoModal(true);
                                                                }}
                                                            >
                                                                Pay &amp; Publish
                                                            </button>
                                                        </>
                                                    )}

                                                    <div className={styles.actionsCell}>
                                                        <button
                                                            type="button"
                                                            className={`${styles.actionsBtn} ${menuOpen ? styles.actionsBtnOpen : ""}`}
                                                            onClick={() => setOpenMenu(menuOpen ? null : r.id)}
                                                            aria-haspopup="menu"
                                                            aria-expanded={menuOpen}
                                                            aria-label="Actions"
                                                        >
                                                            <RiMore2Fill />
                                                        </button>

                                                        {menuOpen && (
                                                            <div className={`${styles.menu} ${menuUp ? styles.menuUp : ""}`} role="menu">
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className={styles.menuItem}
                                                                    onClick={() => startEditing(r)}
                                                                >
                                                                    <RiEditLine />
                                                                    Edit Reel
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className={styles.menuItem}
                                                                    onClick={() => copyLink(r)}
                                                                >
                                                                    <RiShareForwardLine />
                                                                    Copy Link
                                                                </button>

                                                                {r.status === "Active" ? (
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className={styles.menuItem}
                                                                        onClick={() => handleToggleStatus(r.id)}
                                                                    >
                                                                        <RiPauseCircleLine />
                                                                        Deactivate
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className={styles.menuItem}
                                                                        onClick={() => handleToggleStatus(r.id)}
                                                                    >
                                                                        <RiPlayCircleLine />
                                                                        Set Active
                                                                    </button>
                                                                )}

                                                                {r.is_paid && (
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className={styles.menuItem}
                                                                        onClick={() => {
                                                                            setOpenMenu(null);
                                                                            setActiveInvoice({
                                                                                type: "reel",
                                                                                invoice_no: `KP-REL-${String(r.id || r.reel_id).padStart(5, "0")}`,
                                                                                title: r.caption ? `Reel Spotlight: ${r.caption}` : "Reel Spotlight & Feed Listing",
                                                                                amount: r.price ? Number(String(r.price).replace(/[^0-9.]/g, "")) || 1 : 1,
                                                                                date: r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent",
                                                                                payment_status: "Paid",
                                                                                customer: {
                                                                                    name: user?.name || user?.personal_details?.fullname || user?.username,
                                                                                    role: user?.role_val || user?.role || "Agent",
                                                                                    phone: user?.phone || user?.personal_details?.phone_number,
                                                                                    email: user?.email,
                                                                                },
                                                                                details: {
                                                                                    reel_id: r.id || r.reel_id,
                                                                                    service: "Reel Video Spotlight & Feed Placement",
                                                                                    validity: "Lifetime",
                                                                                },
                                                                            });
                                                                            setShowInvoiceModal(true);
                                                                        }}
                                                                    >
                                                                        <RiFileTextLine />
                                                                        View Invoice
                                                                    </button>
                                                                )}

                                                                <span className={styles.menuDivider} />

                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                                                    onClick={() => {
                                                                        setOpenMenu(null);
                                                                        setPendingDelete(r);
                                                                    }}
                                                                >
                                                                    <RiDeleteBinLine />
                                                                    Delete Reel
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.rowFooter}>
                                                <div className={styles.rowStats}>
                                                    <span className={styles.stat} title="Unique Views">
                                                        <RiEyeLine className={styles.statIcon} />
                                                        {(r.stats?.views || 0).toLocaleString("en-IN")}
                                                    </span>
                                                    <span className={styles.stat} title="Total Likes">
                                                        <RiHeart3Fill className={styles.statIcon} />
                                                        {(r.stats?.likes || 0).toLocaleString("en-IN")}
                                                    </span>
                                                    <span className={styles.stat} title="Total Shares">
                                                        <RiShareForwardLine className={styles.statIcon} />
                                                        {(r.stats?.shares || 0).toLocaleString("en-IN")}
                                                    </span>
                                                    <span className={styles.stat} title="Total Saves">
                                                        <RiBookmarkFill className={styles.statIcon} />
                                                        {(r.stats?.saves || 0).toLocaleString("en-IN")}
                                                    </span>
                                                </div>

                                                <span className={styles.postedOn}>
                                                    Posted {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Edit Reel Modal */}
            {editingReel && (
                <PostedReelEditModal
                    editCaption={editCaption}
                    editLocation={editLocation}
                    editPrice={editPrice}
                    editStatus={editStatus}
                    handleEditSubmit={handleEditSubmit}
                    isSavingEdit={isSavingEdit}
                    setEditCaption={setEditCaption}
                    setEditLocation={setEditLocation}
                    setEditPrice={setEditPrice}
                    setEditStatus={setEditStatus}
                    setEditingReel={setEditingReel}
                />
            )}

            {/* Upload Reel Modal */}
            {showUploadModal && (
                <PostedReelUploadModal
                    handleUploadSubmit={handleUploadSubmit}
                    handleVideoFileChange={handleVideoFileChange}
                    isUploading={isUploading}
                    setShowUploadModal={setShowUploadModal}
                    setUploadCaption={setUploadCaption}
                    setUploadLocation={setUploadLocation}
                    setUploadPrice={setUploadPrice}
                    uploadCaption={uploadCaption}
                    uploadLocation={uploadLocation}
                    uploadPrice={uploadPrice}
                    uploadProgress={uploadProgress}
                    uploadVideoFile={uploadVideoFile}
                    uploadVideoPreview={uploadVideoPreview}
                />
            )}

            {/* Confirm Delete Dialog */}
            {pendingDelete && <PostedReelDeleteDialog confirmDelete={confirmDelete} pendingDelete={pendingDelete} setPendingDelete={setPendingDelete} />}

            {/* Reel Subscription & Spotlight Info Modal */}
            <ReelInfoModal
                isOpen={showInfoModal}
                skipExitWarning={true}
                onClose={() => {
                    setShowInfoModal(false);
                    setPayReelId(null);
                }}
                onPayNow={() => {
                    setShowInfoModal(false);
                    setShowPayModal(true);
                }}
                reelId={payReelId}
                user={user}
                onPublishSuccess={() => {
                    setShowInfoModal(false);
                    setPayReelId(null);
                    showToast("Reel published successfully! 🎉");
                    fetchUserReels();
                }}
            />

            {/* Reel Checkout Payment Modal */}
            <ReelCheckoutModal
                isOpen={showPayModal}
                onClose={() => {
                    setShowPayModal(false);
                    setPayReelId(null);
                }}
                reelId={payReelId}
                user={user}
                onSuccess={() => {
                    setShowPayModal(false);
                    setPayReelId(null);
                    showToast("Payment verified! Your reel is now live in the feed! 🎉");
                    fetchUserReels();
                }}
                showToast={showToast}
            />

            {/* Invoice Print & View Modal */}
            <InvoiceModal
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
                invoiceData={activeInvoice}
                currentUser={user}
            />

            {toast && (
                <div className={styles.toast} role="status">
                    {toast}
                </div>
            )}
        </>
    );
}
