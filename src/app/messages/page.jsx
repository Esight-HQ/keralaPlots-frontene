"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import Nav from "../componants/nav/nav";
import styles from "./messages.module.css";
import Link from "next/link";
import { consumePendingPropertyShare } from "../lib/messagesStore";
import { messagesApi, formatPropertyImgUrl, handlePropertyImageError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getPropertyUrl } from "../lib/seoHelper";
import {
    RiSendPlaneFill,
    RiArrowLeftLine,
    RiSearchLine,
    RiCheckDoubleLine,
    RiHome5Line,
    RiMicLine,
    RiAttachment2,
    RiDeleteBinLine,
    RiFile3Line,
    RiDownload2Line,
    RiMore2Fill,
    RiForbidLine,
    RiShieldCheckLine,
    RiSearchEyeLine,
    RiChatSmile2Line,
    RiPlayCircleFill,
    RiPlayFill,
    RiPauseFill,
    RiCloseLine,
    RiTimeLine,
    RiVolumeUpFill,
    RiVolumeMuteFill,
    RiFullscreenLine,
    RiFullscreenExitLine,
    RiZoomInLine,
    RiZoomOutLine,
} from "react-icons/ri";
import { createPortal } from "react-dom";
import PropertyIdBadge, { PropertyBadgeRow } from "../componants/propertyIdBadge/PropertyIdBadge";
import { safeHref } from "../lib/safeHref";

const MAX_RECORDING_SECONDS = 120;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB — keeps base64 attachments within localStorage quota

const formatDuration = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};

const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const URL_TEST_REGEX = /^(https?:\/\/|www\.)/i;
const TRAILING_PUNCT_REGEX = /[.,!?;:)"'\]]+$/;
const KERALAPLOTS_LOGO_URL = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public";
const isLogoUrl = (url) => {
    if (!url || typeof url !== "string") return true;
    const lower = url.toLowerCase();
    return (
        lower === KERALAPLOTS_LOGO_URL ||
        lower.includes("ff7c6dab") ||
        lower.includes("logo_placeholder") ||
        lower.includes("default_user") ||
        lower.includes("avatar_placeholder") ||
        lower.includes("placeholder") ||
        lower.includes("no_image")
    );
};
const isLogo = isLogoUrl;

function ChatAvatar({ src, name, className = "", imgClassName = "" }) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    const isSystemAccount = Boolean(
        name && /keralaplots|kerala plots|support\b/i.test(name)
    );

    // If it's the official KeralaPlots account and has no custom avatar or has the logo
    if (isSystemAccount && (!src || isLogoUrl(src)) && !hasError) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    boxSizing: "border-box",
                }}
                className={className}
            >
                <img
                    loading="lazy"
                    decoding="async"
                    src={KERALAPLOTS_LOGO_URL}
                    alt={name || "KeralaPlots"}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                    }}
                    onError={() => setHasError(true)}
                />
            </div>
        );
    }

    // For all regular users without an avatar or with a logo/placeholder: render initial avatar
    if (!src || hasError || isLogoUrl(src)) {
        const initials = (() => {
            const clean = (name || "User").replace(/[^a-zA-Z0-9\s]/g, "").trim();
            if (!clean) return "U";
            const parts = clean.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return clean.slice(0, 1).toUpperCase();
        })();

        const colors = [
            ["#2563eb", "#1d4ed8"],
            ["#059669", "#047857"],
            ["#7c3aed", "#6d28d9"],
            ["#ea580c", "#c2410c"],
            ["#0284c7", "#0369a1"],
            ["#db2777", "#be185d"],
            ["#4f46e5", "#4338ca"],
            ["#0d9488", "#0f766e"],
        ];
        let hash = 0;
        const str = (name || "User").toLowerCase();
        for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        const [fromColor, toColor] = colors[hash % colors.length];

        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `linear-gradient(135deg, ${fromColor}, ${toColor})`,
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "16px",
                    letterSpacing: "0.5px",
                    userSelect: "none",
                }}
                className={className}
                title={name}
            >
                {initials}
            </div>
        );
    }

    return (
        <img
            loading="lazy"
            decoding="async"
            src={src}
            alt={name || "User"}
            className={`${styles.avatar} ${imgClassName}`}
            onError={() => setHasError(true)}
        />
    );
}

// Splits message text on URLs and turns them into links that open in a new
// tab, so a pasted link is clickable instead of inert text.
const renderMessageText = (text) =>
    text.split(URL_SPLIT_REGEX).map((part, i) => {
        if (!URL_TEST_REGEX.test(part)) return part;

        const trailingMatch = part.match(TRAILING_PUNCT_REGEX);
        const trailing = trailingMatch ? trailingMatch[0] : "";
        const urlPart = trailing ? part.slice(0, part.length - trailing.length) : part;
        const href = urlPart.toLowerCase().startsWith("www.") ? `https://${urlPart}` : urlPart;

        return (
            <Fragment key={i}>
                <a href={href} target="_blank" rel="noopener noreferrer" className={styles.messageLink}>
                    {urlPart}
                </a>
                {trailing}
            </Fragment>
        );
    });

const getReelId = (reel) => reel?.reel_id ?? reel?.id;

const getAuthUser = (fallbackUser = null) => {
    if (fallbackUser && typeof fallbackUser === "object") return fallbackUser;
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("kp_auth_user") || sessionStorage.getItem("kp_auth_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const getViewerIdSet = (fallbackUser = null) => {
    const user = getAuthUser(fallbackUser);
    const set = new Set();
    if (!user) return set;
    [user.loginId, user.login_id, user.id, user.userId, user.user_id].forEach((val) => {
        if (val != null && val !== "") {
            set.add(String(val).trim());
            const num = Number(val);
            if (!Number.isNaN(num)) set.add(num);
        }
    });
    return set;
};

const getCurrentLoginId = (fallbackUser = null) => {
    const user = getAuthUser(fallbackUser);
    return Number(user?.loginId || user?.login_id || user?.id || user?.userId || user?.user_id) || null;
};

const formatMessageTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

// Local calendar-day key (YYYY-M-D) used to group messages by day
const getDayKey = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// WhatsApp-style day separator label: Today / Yesterday / d/m/yyyy
const formatDaySeparator = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (getDayKey(d) === getDayKey(today)) return "Today";
    if (getDayKey(d) === getDayKey(yesterday)) return "Yesterday";
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const parseBooleanFlag = (val) => {
    if (val === true || val === 1 || val === "1" || val === "true" || val === "yes" || val === "y") return true;
    if (val === false || val === 0 || val === "0" || val === "false" || val === "no" || val == null) return false;
    return false;
};

const parseEpoch = (val) => {
    if (!val || val === "null" || val === "0" || val === 0 || val === false) return 0;
    if (typeof val === "number") {
        return val < 1e11 ? val * 1000 : val;
    }
    if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed || trimmed === "0" || trimmed === "null") return 0;
        if (/^\d+$/.test(trimmed)) {
            const num = Number(trimmed);
            return num < 1e11 ? num * 1000 : num;
        }
        const isoStr = trimmed.replace(" ", "T");
        let t = new Date(isoStr).getTime();
        if (!Number.isNaN(t)) return t;
        t = new Date(isoStr + "Z").getTime();
        return Number.isNaN(t) ? 0 : t;
    }
    return 0;
};

// Identify the other participant in the conversation (ensuring the current logged-in user is never treated as the opposite participant)
const getOtherParticipant = (conversation, viewerIdSet) => {
    if (!conversation || typeof conversation !== "object") return {};
    const isMe = (candidate) => {
        if (!candidate || typeof candidate !== "object") return false;
        const candidateIds = [
            candidate.id,
            candidate.login_id,
            candidate.loginId,
            candidate.user_id,
            candidate.userId,
        ].filter((v) => v != null && v !== "");
        return candidateIds.some((id) =>
            viewerIdSet.has(id) || viewerIdSet.has(String(id).trim()) || viewerIdSet.has(Number(id))
        );
    };

    const candidates = [
        conversation.other_user,
        conversation.otherUser,
        conversation.participant,
        conversation.recipient,
        conversation.receiver,
        conversation.contact,
        conversation.target_user,
        conversation.second_user,
        conversation.user,
    ].filter(Boolean);

    const other = candidates.find((c) => !isMe(c));
    if (other) return other;

    if (Array.isArray(conversation.users)) {
        const notMe = conversation.users.find((u) => !isMe(u));
        if (notMe) return notMe;
    }
    if (Array.isArray(conversation.participants)) {
        const notMe = conversation.participants.find((u) => !isMe(u));
        if (notMe) return notMe;
    }

    return candidates[0] || {};
};

// Check if message is sent by current logged-in user
const checkIsFromMe = (message, viewerIdSet, participant) => {
    if (message.is_me === true || message.from_me === true || message.is_sender === true || message.is_mine === true) {
        return true;
    }
    if (message.is_me === false || message.from_me === false || message.is_sender === false || message.is_mine === false) {
        return false;
    }

    const senderCandidates = [
        message.sender_id,
        message.sender_login_id,
        message.sender?.id,
        message.sender?.login_id,
        message.user_id,
        message.from_id,
    ].filter((v) => v != null && v !== "");

    for (const s of senderCandidates) {
        if (viewerIdSet.has(s) || viewerIdSet.has(String(s).trim()) || viewerIdSet.has(Number(s))) {
            return true;
        }
    }

    // Check against participant candidate IDs (if matches participant, it is "them")
    const participantCandidates = [
        participant?.id,
        participant?.login_id,
        participant?.loginId,
        participant?.user_id,
    ].filter((v) => v != null && v !== "");

    for (const p of participantCandidates) {
        for (const s of senderCandidates) {
            if (String(s).trim() === String(p).trim()) {
                return false;
            }
        }
    }

    if (message.isOptimistic || message.from === "me") return true;
    return false;
};

// Read receipt: detect if the message was seen by recipient (handling all DB/API field conventions)
const isMessageSeen = (message, conversation = null, participant = null) => {
    if (!message) return false;

    // Direct boolean / integer flags
    if (parseBooleanFlag(message.is_read)) return true;
    if (parseBooleanFlag(message.is_seen)) return true;
    if (parseBooleanFlag(message.read)) return true;
    if (parseBooleanFlag(message.seen)) return true;
    if (parseBooleanFlag(message.isRead)) return true;
    if (parseBooleanFlag(message.isSeen)) return true;
    if (parseBooleanFlag(message.is_viewed)) return true;
    if (parseBooleanFlag(message.isViewed)) return true;
    if (parseBooleanFlag(message.viewed)) return true;
    if (parseBooleanFlag(message.is_opened)) return true;
    if (parseBooleanFlag(message.opened)) return true;
    if (parseBooleanFlag(message.is_read_by_recipient)) return true;
    if (parseBooleanFlag(message.is_recipient_read)) return true;
    if (parseBooleanFlag(message.receiver_seen)) return true;
    if (parseBooleanFlag(message.recipient_seen)) return true;
    if (parseBooleanFlag(message.seen_by_recipient)) return true;
    if (parseBooleanFlag(message.read_by_recipient)) return true;
    if (parseBooleanFlag(message.recipientRead)) return true;
    if (parseBooleanFlag(message.receiverSeen)) return true;

    // Check timestamps (non-null, non-empty and non-zero)
    const hasValidTimestamp = (ts) => ts && ts !== "null" && ts !== "0" && ts !== "" && ts !== false && ts !== 0;
    if (hasValidTimestamp(message.read_at)) return true;
    if (hasValidTimestamp(message.seen_at)) return true;
    if (hasValidTimestamp(message.viewed_at)) return true;
    if (hasValidTimestamp(message.opened_at)) return true;
    if (hasValidTimestamp(message.recipient_read_at)) return true;
    if (hasValidTimestamp(message.receiver_read_at)) return true;
    if (hasValidTimestamp(message.readAt)) return true;
    if (hasValidTimestamp(message.seenAt)) return true;
    if (hasValidTimestamp(message.viewedAt)) return true;

    // Check status string
    if (typeof message.status === "string") {
        const s = message.status.toLowerCase().trim();
        if (s === "read" || s === "seen" || s === "viewed" || s === "opened" || s === "delivered_read") return true;
    }
    if (typeof message.delivery_status === "string") {
        const s = message.delivery_status.toLowerCase().trim();
        if (s === "read" || s === "seen" || s === "viewed") return true;
    }
    if (typeof message.state === "string") {
        const s = message.state.toLowerCase().trim();
        if (s === "read" || s === "seen") return true;
    }
    if (typeof message.read_status === "string") {
        const s = message.read_status.toLowerCase().trim();
        if (s === "read" || s === "seen") return true;
    }
    if (typeof message.readStatus === "string") {
        const s = message.readStatus.toLowerCase().trim();
        if (s === "read" || s === "seen") return true;
    }

    // Check arrays of reads/readers
    if (Array.isArray(message.read_by) && message.read_by.length > 0) return true;
    if (Array.isArray(message.reads) && message.reads.length > 0) return true;
    if (Array.isArray(message.seen_by) && message.seen_by.length > 0) return true;
    if (Array.isArray(message.readers) && message.readers.length > 0) return true;

    const rawId = message.apiId ?? message.id;
    const cleanId = typeof rawId === "string" ? rawId.replace(/^(api|msg)-/, "").trim() : rawId;
    const msgNumId = Number(cleanId);

    // Conversation-level read markers
    if (conversation) {
        const lastReadMsgId = Number(
            conversation.recipient_last_read_message_id ??
            conversation.other_last_read_message_id ??
            conversation.recipient_last_read_id ??
            conversation.recipient_last_read ??
            conversation.other_last_read ??
            conversation.other_last_read_id ??
            conversation.receiver_last_read_message_id ??
            conversation.receiver_last_read_id ??
            conversation.last_read_message_id ??
            conversation.last_read_id ??
            conversation.last_seen_message_id ??
            conversation.recipient_last_seen_message_id ??
            conversation.other_last_seen_message_id ??
            participant?.last_read_message_id ??
            participant?.last_read_id ??
            participant?.pivot?.last_read_message_id ??
            participant?.pivot?.last_read_id
        ) || 0;

        if (lastReadMsgId > 0 && !Number.isNaN(msgNumId) && msgNumId > 0 && msgNumId <= lastReadMsgId) {
            return true;
        }

        const recipientReadAt =
            conversation.recipient_last_read_at ??
            conversation.recipient_read_at ??
            conversation.recipient_seen_at ??
            conversation.recipient_last_seen_at ??
            conversation.other_last_read_at ??
            conversation.other_read_at ??
            conversation.other_seen_at ??
            conversation.other_last_seen_at ??
            conversation.receiver_read_at ??
            conversation.receiver_last_read_at ??
            conversation.receiver_seen_at ??
            participant?.last_read_at ??
            participant?.read_at ??
            participant?.seen_at ??
            participant?.opened_at ??
            participant?.pivot?.read_at ??
            participant?.pivot?.last_read_at ??
            participant?.pivot?.seen_at;

        if (recipientReadAt && message.created_at) {
            const rTime = parseEpoch(recipientReadAt);
            const mTime = parseEpoch(message.created_at);
            if (rTime > 0 && mTime > 0 && mTime <= (rTime + 2000)) {
                return true;
            }
        }

        if (
            parseBooleanFlag(conversation.is_read_by_recipient) ||
            parseBooleanFlag(conversation.is_recipient_read) ||
            parseBooleanFlag(conversation.recipient_seen) ||
            parseBooleanFlag(conversation.seen_by_recipient)
        ) {
            return true;
        }
    }

    return false;
};

// Double-tick on my messages; turns WhatsApp Blue (#53bdeb) once the other person has seen it.
function ReadTick({ seen }) {
    const isSeen = Boolean(seen) && seen !== "false" && seen !== "0";
    return (
        <span
            className={`${styles.tickContainer} ${isSeen ? styles.tickSeenContainer : ""}`}
            title={isSeen ? "Seen by recipient" : "Delivered"}
        >
            <RiCheckDoubleLine
                className={isSeen ? styles.tickSeen : styles.tickSent}
                style={isSeen ? { color: "#53bdeb", fill: "#53bdeb" } : undefined}
                aria-label={isSeen ? "Seen by recipient" : "Delivered"}
            />
        </span>
    );
}

const mapApiMessage = (message, fromMe, seen) => {
    const base = {
        id: `api-${message.id}`,
        apiId: message.id,
        from: fromMe ? "me" : "them",
        time: formatMessageTime(message.created_at),
        createdAt: message.created_at || null,
        deleted: Boolean(message.is_deleted || message.deleted || message.deleted_at),
        seen: Boolean(seen),
    };

    if (message.message_type === "reel" && message.reel) {
        return {
            ...base,
            type: "reel",
            reel: {
                id: message.reel.reel_id || message.reel.id,
                reel_id: message.reel.reel_id || message.reel.id,
                caption: message.reel.caption || `Reel #${message.reel.reel_id || message.reel.id}`,
                location: message.reel.location || "",
                poster: message.reel.thumbnail_url || KERALAPLOTS_LOGO_URL,
            },
            note: message.message_text,
        };
    }

    if (message.message_type === "property" && message.property) {
        return {
            ...base,
            type: "property",
            property: {
                id: message.property.property_id || message.property.id,
                title: message.property.title || "Property",
                location: message.property.location || "",
                price: message.property.price || "",
                image: message.property.image || KERALAPLOTS_LOGO_URL,
            },
            text: message.message_text || "",
            note: message.message_text || "",
        };
    }

    const firstMedia = Array.isArray(message.media) && message.media.length > 0 ? message.media[0] : null;
    const mediaUrl = (firstMedia?.media_url || message.message_text || "").toLowerCase();

    const isVoiceMedia =
        message.message_type === "voice" ||
        message.message_type === "audio" ||
        firstMedia?.media_type === "voice" ||
        firstMedia?.media_type === "audio" ||
        mediaUrl.includes("/voice/") ||
        mediaUrl.includes("voice_message") ||
        /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)(\?|$)/i.test(mediaUrl) ||
        (!message.message_text && firstMedia?.duration && mediaUrl.endsWith(".webm"));

    if (isVoiceMedia) {
        return {
            ...base,
            type: "voice",
            audio: firstMedia?.media_url || message.message_text,
            duration: firstMedia?.duration || 0,
            text: "",
        };
    }

    if (message.message_type === "image" || firstMedia?.media_type === "image") {
        return {
            ...base,
            type: "image",
            image: firstMedia?.media_url || message.message_text,
            fileName: message.message_text || "Photo",
            text: "",
        };
    }

    if (message.message_type === "video" || firstMedia?.media_type === "video") {
        return {
            ...base,
            type: "video",
            video: firstMedia?.media_url || message.message_text,
            poster: firstMedia?.thumbnail || null,
            fileName: message.message_text || "Video",
            text: "",
        };
    }

    if (message.message_type === "file" || firstMedia?.media_type === "file") {
        return {
            ...base,
            type: "file",
            file: {
                name: message.message_text || "Attachment",
                size: firstMedia?.file_size || 0,
                dataUrl: firstMedia?.media_url || message.message_text,
            },
            text: "",
        };
    }

    return {
        ...base,
        text: message.message_text || "",
    };
};

const mapApiConversation = (conversation, rawMessages, viewerIdSet) => {
    const participant = getOtherParticipant(conversation, viewerIdSet);

    // Conversation-level read timestamp of the OTHER participant only
    const convoLastReadAt =
        conversation.recipient_last_read_at ??
        conversation.recipient_read_at ??
        conversation.recipient_seen_at ??
        conversation.recipient_last_seen_at ??
        conversation.other_last_read_at ??
        conversation.other_read_at ??
        conversation.other_seen_at ??
        conversation.other_last_seen_at ??
        conversation.receiver_read_at ??
        conversation.receiver_last_read_at ??
        conversation.receiver_seen_at ??
        participant?.last_read_at ??
        participant?.read_at ??
        participant?.seen_at ??
        participant?.opened_at ??
        participant?.pivot?.read_at ??
        participant?.pivot?.last_read_at ??
        participant?.pivot?.seen_at;
    const convoLastReadTimestamp = parseEpoch(convoLastReadAt);

    const convoLastReadMsgId = Number(
        conversation.recipient_last_read_message_id ??
        conversation.other_last_read_message_id ??
        conversation.recipient_last_read_id ??
        conversation.recipient_last_read ??
        conversation.other_last_read ??
        conversation.other_last_read_id ??
        conversation.receiver_last_read_message_id ??
        conversation.receiver_last_read_id ??
        conversation.last_read_message_id ??
        conversation.last_read_id ??
        conversation.last_seen_message_id ??
        conversation.recipient_last_seen_message_id ??
        conversation.other_last_seen_message_id ??
        participant?.last_read_message_id ??
        participant?.last_read_id ??
        participant?.pivot?.last_read_message_id ??
        participant?.pivot?.last_read_id
    ) || 0;

    // Identify recipient's latest message time and id
    let latestThemTime = 0;
    let latestThemId = 0;
    (rawMessages || []).forEach((m) => {
        const fromMe = checkIsFromMe(m, viewerIdSet, participant);
        if (!fromMe) {
            const t = parseEpoch(m.created_at);
            if (t > latestThemTime) latestThemTime = t;
            const rawMId = m.apiId ?? m.id;
            const cleanMId = typeof rawMId === "string" ? rawMId.replace(/^(api|msg)-/, "").trim() : rawMId;
            const nId = Number(cleanMId);
            if (!Number.isNaN(nId) && nId > latestThemId) latestThemId = nId;
        }
    });

    const mappedMessages = (rawMessages || []).map((message) => {
        const fromMe = checkIsFromMe(message, viewerIdSet, participant);
        const msgTime = parseEpoch(message.created_at);
        const rawMId = message.apiId ?? message.id;
        const cleanMId = typeof rawMId === "string" ? rawMId.replace(/^(api|msg)-/, "").trim() : rawMId;
        const msgNumId = Number(cleanMId);

        let seen = isMessageSeen(message, conversation, participant);

        if (fromMe) {
            // The recipient replied after this message → they opened the chat and saw it.
            if (!seen && latestThemTime > 0 && msgTime > 0 && msgTime <= latestThemTime) {
                seen = true;
            }
            if (!seen && latestThemId > 0 && !Number.isNaN(msgNumId) && msgNumId > 0 && msgNumId < latestThemId) {
                seen = true;
            }
            // The recipient's own read timestamp (from backend) is after this message.
            if (!seen && convoLastReadTimestamp > 0 && msgTime > 0 && msgTime <= (convoLastReadTimestamp + 2000)) {
                seen = true;
            }
            // The recipient's last read message ID is at or after this message.
            if (!seen && convoLastReadMsgId > 0 && !Number.isNaN(msgNumId) && msgNumId > 0 && msgNumId <= convoLastReadMsgId) {
                seen = true;
            }
        }

        return mapApiMessage(message, fromMe, seen);
    });

    // Calculate unread count from conversation metadata or from unseen incoming messages
    const unseenIncomingCount = mappedMessages.filter((m) => m.from === "them" && !m.seen && !m.deleted).length;
    const convoUnread = typeof conversation.unread_count === "number"
        ? conversation.unread_count
        : (typeof conversation.unread === "number" ? conversation.unread : unseenIncomingCount);

    return {
        id: conversation.id,
        apiId: conversation.id,
        isBackend: true,
        name: participant.name || "User",
        role: "Conversation",
        avatar: participant.avatar || null,
        online: !conversation.blocked,
        unread: convoUnread,
        messages: mappedMessages,
        blocked: Boolean(conversation.blocked),
        is_blocked_by_me: Boolean(conversation.is_blocked_by_me),
        is_blocked_by_other: Boolean(conversation.is_blocked_by_other),
    };
};

const WAVEFORM_BAR_HEIGHTS = [
    3, 8, 4, 7, 9, 13, 15, 15, 20, 16,
    22, 22, 18, 18, 24, 24, 18, 22, 24, 20,
    24, 22, 20, 22, 22, 18, 16, 18, 16, 14,
    12, 10, 8, 4, 4, 4, 4, 4, 4, 4,
];

function VoiceMessagePlayer({ m }) {
    const audioRef = useRef(null);
    const waveformRef = useRef(null);
    const isDraggingRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(Number(m.duration) || 0);
    const [speed, setSpeed] = useState(1);
    const [playbackError, setPlaybackError] = useState(false);

    const audioSrc = m.audio || m.video;
    const isWebm = audioSrc?.toLowerCase().includes(".webm");
    const isMp4 = audioSrc?.toLowerCase().includes(".m4a") || audioSrc?.toLowerCase().includes(".mp4");
    const mimeType = isWebm ? "audio/webm" : isMp4 ? "audio/mp4" : "audio/mpeg";

    useEffect(() => {
        if (m.duration && !duration) {
            setDuration(Number(m.duration));
        }
    }, [m.duration, duration]);

    const handleLoadedMetadata = () => {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
            setDuration(Math.round(audio.duration));
        }
    };

    const handleDurationChange = () => {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
            setDuration(Math.round(audio.duration));
        }
    };

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio || isDraggingRef.current) return;
        setCurrentTime(audio.currentTime);
        if (Number.isFinite(audio.duration) && audio.duration > 0 && !duration) {
            setDuration(Math.round(audio.duration));
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    };

    const togglePlay = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            try {
                // Pause any other media playing
                document.querySelectorAll("audio, video").forEach((media) => {
                    if (media !== audio && !media.paused) {
                        media.pause();
                    }
                });
                audio.playbackRate = speed;
                await audio.play();
                setIsPlaying(true);
            } catch (err) {
                console.error("Audio playback error:", err);
                setPlaybackError(true);
            }
        }
    };

    const handleSeek = (clientX) => {
        const track = waveformRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        const effectiveDuration = duration || Number(m.duration) || 0;
        if (effectiveDuration > 0) {
            const newTime = ratio * effectiveDuration;
            setCurrentTime(newTime);
            if (audioRef.current) {
                audioRef.current.currentTime = newTime;
            }
        }
    };

    const handlePointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = true;
        handleSeek(e.clientX);

        const onPointerMove = (moveEvent) => {
            if (isDraggingRef.current) {
                handleSeek(moveEvent.clientX);
            }
        };

        const onPointerUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    const handleCycleSpeed = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
        setSpeed(nextSpeed);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextSpeed;
        }
    };

    const effectiveDuration = duration || Number(m.duration) || 0;
    const progress = effectiveDuration > 0 ? Math.min(1, Math.max(0, currentTime / effectiveDuration)) : 0;
    const activeBarIndex = currentTime > 0
        ? Math.min(WAVEFORM_BAR_HEIGHTS.length - 1, Math.floor(progress * WAVEFORM_BAR_HEIGHTS.length))
        : -1;

    return (
        <div className={`${styles.bubble} ${styles.voiceBubble} ${m.from === "me" ? styles.bubbleMe : styles.bubbleThem}`}>
            <audio
                ref={audioRef}
                preload="metadata"
                playsInline
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleDurationChange}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => setPlaybackError(true)}
                style={{ display: "none" }}
            >
                <source src={audioSrc} type={mimeType} />
                <source src={audioSrc} />
            </audio>

            {!playbackError ? (
                <div className={styles.customAudioPlayer}>
                    {/* Play/Pause Button */}
                    <button
                        type="button"
                        className={styles.audioPlayBtn}
                        onClick={togglePlay}
                        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
                    >
                        {isPlaying ? <RiPauseFill /> : <RiPlayFill />}
                    </button>

                    {/* Waveform Track + Time Row */}
                    <div className={styles.waveformColumn}>
                        <div
                            ref={waveformRef}
                            className={styles.waveformTrack}
                            onPointerDown={handlePointerDown}
                            role="slider"
                            aria-label="Audio progress"
                            aria-valuenow={Math.round(currentTime)}
                            aria-valuemin={0}
                            aria-valuemax={Math.round(effectiveDuration)}
                        >
                            {WAVEFORM_BAR_HEIGHTS.map((h, i) => {
                                const isPast = i < activeBarIndex;
                                const isHead = i === activeBarIndex;
                                const isFilled = isPast || isHead;
                                const isHeadDot = isHead && h <= 8;
                                return (
                                    <div key={i} className={styles.waveformBarSlot}>
                                        <span
                                            className={`${styles.waveformBar} ${isFilled ? styles.waveformBarFilled : ""} ${isHead ? styles.waveformBarHead : ""}`}
                                            style={{
                                                height: isHeadDot ? "8px" : `${h}px`,
                                                width: isHeadDot ? "8px" : undefined,
                                                minWidth: isHeadDot ? "8px" : undefined,
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.audioTimeRow}>
                            <span className={styles.audioTimeCurrent}>{formatDuration(Math.floor(currentTime))}</span>
                            <span className={styles.audioTimeDuration}>{formatDuration(Math.floor(effectiveDuration))}</span>
                        </div>
                    </div>

                    {/* Speed Pill */}
                    <button
                        type="button"
                        className={styles.audioSpeedBtn}
                        onClick={handleCycleSpeed}
                        aria-label={`Playback speed: ${speed}x. Click to change`}
                    >
                        {speed}x
                    </button>
                </div>
            ) : (
                <div className={styles.audioErrorFallback}>
                    <span>Voice message ({formatDuration(effectiveDuration)})</span>
                    <a href={audioSrc} target="_blank" rel="noreferrer" className={styles.audioErrorLink}>
                        ▶ Open Voice Note
                    </a>
                </div>
            )}

            <div className={styles.voiceMetaRow}>
                <span className={styles.voiceMetaTime}>
                    {m.time}
                    {m.from === "me" && <ReadTick seen={m.seen} />}
                </span>
            </div>
        </div>
    );
}

const getFullscreenElement = () =>
    typeof document === "undefined" ? null : (document.fullscreenElement || document.webkitFullscreenElement || null);

const requestElementFullscreen = (el) => {
    if (!el) return false;
    if (el.requestFullscreen) { el.requestFullscreen().catch(() => { }); return true; }
    if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); return true; }
    return false;
};

const exitDocumentFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
};

// Chat bubble for a video: shows a preview frame + duration. Clicking opens the
// full-screen video viewer (same style as the image viewer) and starts playback.
function ChatVideoMessage({ m }) {
    const thumbRef = useRef(null);
    const [isAudioOnly, setIsAudioOnly] = useState(false);
    const [duration, setDuration] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // "#t=0.1" makes mobile browsers (iOS) render the first frame as a preview
    const thumbSrc = m.video && !m.video.includes("#") ? `${m.video}#t=0.1` : m.video;

    const handleThumbMetadata = () => {
        const v = thumbRef.current;
        if (!v) return;
        if (v.videoWidth === 0 && v.videoHeight === 0) {
            setIsAudioOnly(true);
            return;
        }
        if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    };

    if (isAudioOnly) {
        return <VoiceMessagePlayer m={{ ...m, audio: m.video }} />;
    }

    return (
        <div className={`${styles.imageBubble} ${styles.videoBubble} ${m.from === "me" ? styles.bubbleMe : styles.bubbleThem}`}>
            <button
                type="button"
                className={styles.videoThumb}
                onClick={() => setIsOpen(true)}
                aria-label="Play video in full screen"
            >
                <video disableRemotePlayback
                    ref={thumbRef}
                    src={thumbSrc}
                    poster={m.poster || undefined}
                    muted
                    playsInline
                    preload="metadata"
                    tabIndex={-1}
                    className={styles.videoThumbEl}
                    onLoadedMetadata={handleThumbMetadata}
                    onDurationChange={handleThumbMetadata}
                />
                <span className={styles.videoThumbPlay} aria-hidden="true">
                    <RiPlayFill />
                </span>
                {duration > 0 && (
                    <span className={styles.videoThumbDuration}>
                        <RiPlayFill aria-hidden="true" />
                        {formatDuration(Math.floor(duration))}
                    </span>
                )}
            </button>
            <span className={styles.bubbleTime}>
                {m.time}
                {m.from === "me" && <ReadTick seen={m.seen} />}
            </span>
            {isOpen && (
                <VideoLightbox
                    video={{ src: m.video, poster: m.poster, title: m.fileName, time: m.time }}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

// Full-screen video viewer with a custom player (play/pause, seek, time, mute, fullscreen).
// Opens over the page like the image lightbox and auto-plays.
function VideoLightbox({ video, onClose }) {
    const overlayRef = useRef(null);
    const videoRef = useRef(null);
    const progressRef = useRef(null);
    const hideTimerRef = useRef(null);
    const isSeekingRef = useRef(false);
    const onCloseRef = useRef(onClose);
    const actionsRef = useRef({});

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [muted, setMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const isIgnorablePlayError = (err) => err?.name === "AbortError";

    const togglePlay = async (e) => {
        e?.stopPropagation?.();
        const v = videoRef.current;
        if (!v) return;
        if (v.paused || v.ended) {
            try {
                await v.play();
            } catch (err) {
                if (!isIgnorablePlayError(err)) {
                    console.error("Video playback error:", err);
                    if (err?.name !== "NotAllowedError") setHasError(true);
                }
            }
        } else {
            v.pause();
        }
    };

    const toggleMute = (e) => {
        e?.stopPropagation?.();
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
    };

    const toggleFullscreen = (e) => {
        e?.stopPropagation?.();
        if (getFullscreenElement()) {
            exitDocumentFullscreen();
            return;
        }
        // iOS Safari has no element fullscreen — fall back to the native video fullscreen
        if (!requestElementFullscreen(overlayRef.current)) {
            videoRef.current?.webkitEnterFullscreen?.();
        }
    };

    const seekBy = (delta) => {
        const v = videoRef.current;
        if (!v) return;
        const max = Number.isFinite(v.duration) ? v.duration : v.currentTime + delta;
        v.currentTime = Math.max(0, Math.min(max, v.currentTime + delta));
        setCurrentTime(v.currentTime);
    };

    // Auto-hide controls while playing
    const scheduleHide = () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            if (!isSeekingRef.current) setShowControls(false);
        }, 2500);
    };

    const revealControls = () => {
        setShowControls(true);
        if (videoRef.current && !videoRef.current.paused) scheduleHide();
    };

    // Latest handlers for the (mount-only) keyboard listener
    actionsRef.current = { togglePlay, toggleMute, toggleFullscreen, seekBy, revealControls };

    useEffect(() => {
        if (isPlaying) {
            scheduleHide();
        } else {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            setShowControls(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying]);

    // Mount: lock scroll, keyboard shortcuts, fullscreen tracking, auto-play.
    // Deps are intentionally [] so the 1.2s chat poll re-render never resets the viewer.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e) => {
            const a = actionsRef.current;
            if (e.key === "Escape") {
                if (!getFullscreenElement()) onCloseRef.current();
                return;
            }
            if (e.key === " " || e.key === "k") { e.preventDefault(); a.togglePlay(); }
            else if (e.key === "m") { e.preventDefault(); a.toggleMute(); }
            else if (e.key === "f") { e.preventDefault(); a.toggleFullscreen(); }
            else if (e.key === "ArrowRight") { e.preventDefault(); a.seekBy(5); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); a.seekBy(-5); }
            else return;
            a.revealControls();
        };
        const onFsChange = () => setIsFullscreen(getFullscreenElement() === overlayRef.current);

        window.addEventListener("keydown", onKey);
        document.addEventListener("fullscreenchange", onFsChange);
        document.addEventListener("webkitfullscreenchange", onFsChange);

        // Auto-play (the click that opened the viewer counts as a user gesture).
        // If the browser still blocks sound, start muted so the video plays anyway.
        const v = videoRef.current;
        if (v) {
            v.play().catch((err) => {
                if (err?.name !== "NotAllowedError") return;
                v.muted = true;
                setMuted(true);
                v.play().catch(() => { });
            });
        }

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
            document.removeEventListener("fullscreenchange", onFsChange);
            document.removeEventListener("webkitfullscreenchange", onFsChange);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            if (getFullscreenElement() === overlayRef.current) exitDocumentFullscreen();
        };
    }, []);

    const readDuration = () => {
        const v = videoRef.current;
        if (v && Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    };

    const seekToClientX = (clientX) => {
        const track = progressRef.current;
        const v = videoRef.current;
        if (!track || !v || !duration) return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const t = ratio * duration;
        v.currentTime = t;
        setCurrentTime(t);
    };

    const handleProgressPointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isSeekingRef.current = true;
        setShowControls(true);
        seekToClientX(e.clientX);
        const onMove = (ev) => seekToClientX(ev.clientX);
        const onUp = () => {
            isSeekingRef.current = false;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            if (videoRef.current && !videoRef.current.paused) scheduleHide();
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    if (typeof document === "undefined") return null;

    const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
    const controlsVisible = showControls || !isPlaying;

    return createPortal(
        <div
            ref={overlayRef}
            className={`${styles.lightbox} ${controlsVisible ? "" : styles.lightboxIdle}`}
            role="dialog"
            aria-modal="true"
            aria-label="Video viewer"
            onClick={() => onCloseRef.current()}
            onMouseMove={revealControls}
            onTouchStart={revealControls}
        >
            <div className={styles.lightboxTopBar} onClick={(e) => e.stopPropagation()}>
                <span className={styles.lightboxTitle}>{video.title || "Video"}{video.time ? ` · ${video.time}` : ""}</span>
                <div className={styles.lightboxActions}>
                    <a className={styles.lightboxBtn} href={video.src} target="_blank" rel="noreferrer" download aria-label="Download video">
                        <RiDownload2Line />
                    </a>
                    {/* <button type="button" className={styles.lightboxBtn} onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit full screen" : "Full screen"}>
                        {isFullscreen ? <RiFullscreenExitLine /> : <RiFullscreenLine />}
                    </button> */}
                    <button type="button" className={styles.lightboxBtn} onClick={() => onCloseRef.current()} aria-label="Close">
                        <RiCloseLine />
                    </button>
                </div>
            </div>

            <div className={styles.lightboxStage}>
                <div
                    className={`${styles.videoPlayer} ${styles.lightboxVideoPlayer} ${controlsVisible ? styles.videoControlsVisible : ""}`}
                    onClick={(e) => e.stopPropagation()}
                    onMouseLeave={() => isPlaying && setShowControls(false)}
                >
                    <video disableRemotePlayback
                        ref={videoRef}
                        src={video.src}
                        poster={video.poster || undefined}
                        playsInline
                        preload="auto"
                        className={`${styles.videoEl} ${styles.lightboxVideoEl}`}
                        onClick={togglePlay}
                        onDoubleClick={toggleFullscreen}
                        onLoadedMetadata={readDuration}
                        onDurationChange={readDuration}
                        onTimeUpdate={() => {
                            const v = videoRef.current;
                            if (v && !isSeekingRef.current) setCurrentTime(v.currentTime);
                            if (!duration) readDuration();
                        }}
                        onProgress={() => {
                            const v = videoRef.current;
                            if (v && v.buffered.length && duration) {
                                setBuffered(Math.min(100, (v.buffered.end(v.buffered.length - 1) / duration) * 100));
                            }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        onWaiting={() => setIsLoading(true)}
                        onPlaying={() => setIsLoading(false)}
                        onCanPlay={() => setIsLoading(false)}
                        onLoadedData={() => setIsLoading(false)}
                        onVolumeChange={() => setMuted(Boolean(videoRef.current?.muted))}
                        onError={() => { setHasError(true); setIsLoading(false); }}
                    />

                    {isLoading && !hasError && <div className={styles.videoSpinner} aria-label="Loading" />}

                    {!isPlaying && !isLoading && !hasError && (
                        <button type="button" className={styles.videoBigPlay} onClick={togglePlay} aria-label="Play video">
                            <RiPlayFill />
                        </button>
                    )}

                    {hasError && (
                        <div className={styles.videoError}>
                            <span>Video can&apos;t be played</span>
                            <a href={video.src} target="_blank" rel="noreferrer">Open video</a>
                        </div>
                    )}

                    <div className={styles.videoControls} onClick={(e) => e.stopPropagation()}>
                        <div
                            ref={progressRef}
                            className={styles.videoProgress}
                            onPointerDown={handleProgressPointerDown}
                            role="slider"
                            aria-label="Seek"
                            aria-valuemin={0}
                            aria-valuemax={Math.round(duration)}
                            aria-valuenow={Math.round(currentTime)}
                        >
                            <div className={styles.videoProgressBuffered} style={{ width: `${buffered}%` }} />
                            <div className={styles.videoProgressFill} style={{ width: `${progressPct}%` }} />
                            <div className={styles.videoProgressThumb} style={{ left: `${progressPct}%` }} />
                        </div>
                        <div className={styles.videoControlsRow}>
                            <button type="button" className={styles.videoCtrlBtn} onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                                {isPlaying ? <RiPauseFill /> : <RiPlayFill />}
                            </button>
                            <span className={styles.videoTime}>
                                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                            </span>
                            <span className={styles.videoCtrlSpacer} />
                            <button type="button" className={styles.videoCtrlBtn} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                                {muted ? <RiVolumeMuteFill /> : <RiVolumeUpFill />}
                            </button>
                            {/* <button type="button" className={styles.videoCtrlBtn} onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit full screen" : "Full screen"}>
                                {isFullscreen ? <RiFullscreenExitLine /> : <RiFullscreenLine />}
                            </button> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Full-screen image viewer (Esc / backdrop click to close, click image to zoom)
function ImageLightbox({ image, onClose }) {
    const overlayRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const [zoomed, setZoomed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && !getFullscreenElement()) onCloseRef.current();
        };
        const onFsChange = () => setIsFullscreen(getFullscreenElement() === overlayRef.current);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        document.addEventListener("fullscreenchange", onFsChange);
        document.addEventListener("webkitfullscreenchange", onFsChange);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
            document.removeEventListener("fullscreenchange", onFsChange);
            document.removeEventListener("webkitfullscreenchange", onFsChange);
            if (getFullscreenElement() === overlayRef.current) exitDocumentFullscreen();
        };
    }, []);

    const toggleFullscreen = (e) => {
        e.stopPropagation();
        if (getFullscreenElement()) exitDocumentFullscreen();
        else requestElementFullscreen(overlayRef.current);
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            ref={overlayRef}
            className={styles.lightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            onClick={onClose}
        >
            <div className={styles.lightboxTopBar} onClick={(e) => e.stopPropagation()}>
                <span className={styles.lightboxTitle}>{image.alt || "Photo"}{image.time ? ` · ${image.time}` : ""}</span>
                <div className={styles.lightboxActions}>
                    <button type="button" className={styles.lightboxBtn} onClick={() => setZoomed((z) => !z)} aria-label={zoomed ? "Zoom out" : "Zoom in"}>
                        {zoomed ? <RiZoomOutLine /> : <RiZoomInLine />}
                    </button>
                    <a className={styles.lightboxBtn} href={image.src} target="_blank" rel="noreferrer" download aria-label="Download image">
                        <RiDownload2Line />
                    </a>
                    {/* <button type="button" className={styles.lightboxBtn} onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit full screen" : "Full screen"}>
                        {isFullscreen ? <RiFullscreenExitLine /> : <RiFullscreenLine />}
                    </button> */}
                    <button type="button" className={styles.lightboxBtn} onClick={onClose} aria-label="Close">
                        <RiCloseLine />
                    </button>
                </div>
            </div>
            <div className={`${styles.lightboxStage} ${zoomed ? styles.lightboxStageZoomed : ""}`}>
                <img
                    src={image.src}
                    alt={image.alt || "Photo"}
                    className={`${styles.lightboxImage} ${zoomed ? styles.lightboxImageZoomed : ""}`}
                    onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
                    draggable={false}
                />
            </div>
        </div>,
        document.body
    );
}

// WhatsApp-style delete confirmation: "Delete for everyone" (own messages only),
// "Delete for me" and "Cancel".
function DeleteMessageDialog({ canDeleteForEveryone, onDeleteForMe, onDeleteForEveryone, onClose }) {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onCloseRef.current();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className={styles.deleteDialogBackdrop} onClick={() => onCloseRef.current()}>
            <div
                className={styles.deleteDialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.deleteDialogIcon}>
                    <RiDeleteBinLine />
                </div>
                <h2 id="delete-dialog-title" className={styles.deleteDialogTitle}>Delete message?</h2>
                <p className={styles.deleteDialogText}>
                    {canDeleteForEveryone
                        ? "You can delete this message for everyone or only for yourself."
                        : "This message will be removed only from your chat. The other person can still see it."}
                </p>
                <div className={styles.deleteDialogActions}>
                    {canDeleteForEveryone && (
                        <button
                            type="button"
                            id="delete-for-everyone-btn"
                            className={`${styles.deleteDialogBtn} ${styles.deleteDialogBtnDanger}`}
                            onClick={onDeleteForEveryone}
                        >
                            Delete for everyone
                        </button>
                    )}
                    <button
                        type="button"
                        id="delete-for-me-btn"
                        className={`${styles.deleteDialogBtn} ${canDeleteForEveryone ? "" : styles.deleteDialogBtnDanger}`}
                        onClick={onDeleteForMe}
                        autoFocus
                    >
                        Delete for me
                    </button>
                    <button
                        type="button"
                        id="delete-cancel-btn"
                        className={`${styles.deleteDialogBtn} ${styles.deleteDialogBtnGhost}`}
                        onClick={() => onCloseRef.current()}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Key used to remember messages the user deleted "for me"
const getHideKey = (m) => String(m?.apiId ?? m?.id ?? "");
const getHiddenStorageKey = (viewerId) => `kp_hidden_messages_${viewerId || "guest"}`;

function ChatVoiceMessage({ m }) {
    return <VoiceMessagePlayer m={m} />;
}

// Circular progress ring. When `progress` is null it spins (indeterminate / processing).
function UploadProgressRing({ progress, size = 44, onCancel }) {
    const radius = (size - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const isIndeterminate = progress == null;
    const offset = isIndeterminate ? circumference * 0.7 : circumference * (1 - progress / 100);
    return (
        <div className={styles.uploadRing} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className={isIndeterminate ? styles.uploadRingSpin : ""}
                aria-hidden="true"
            >
                <circle className={styles.uploadRingTrack} cx={size / 2} cy={size / 2} r={radius} />
                <circle
                    className={styles.uploadRingBar}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            {onCancel && (
                <button type="button" className={styles.uploadCancelBtn} onClick={onCancel} aria-label="Cancel upload">
                    <RiCloseLine />
                </button>
            )}
        </div>
    );
}

// Temporary bubble shown in the thread while an attachment / voice note is uploading.
function UploadingBubble({ u, onCancel }) {
    const processing = u.progress >= 100;
    const ringProgress = processing ? null : u.progress;
    const cancel = processing ? undefined : () => onCancel(u.id);
    const loaded = Math.round((u.size * Math.min(u.progress, 100)) / 100);
    const statusText = processing ? "Processing…" : `${u.progress}% · ${formatFileSize(loaded)} of ${formatFileSize(u.size)}`;

    if ((u.kind === "image" || u.kind === "video") && u.previewUrl) {
        return (
            <div className={`${styles.imageBubble} ${styles.bubbleMe} ${styles.uploadBubble}`}>
                <div className={styles.uploadMediaWrap}>
                    {u.kind === "image" ? (
                        <img src={u.previewUrl} alt={u.name} className={`${styles.sharedImage} ${styles.uploadMediaPreview}`} />
                    ) : (
                        <video disableRemotePlayback src={u.previewUrl} muted playsInline className={`${styles.sharedImage} ${styles.uploadMediaPreview}`} />
                    )}
                    <div className={styles.uploadMediaOverlay}>
                        <UploadProgressRing progress={ringProgress} size={54} onCancel={cancel} />
                        <span className={styles.uploadMediaStatus}>{processing ? "Processing…" : `${u.progress}%`}</span>
                    </div>
                </div>
                <span className={styles.bubbleTime}>
                    {u.time}
                    <RiTimeLine aria-label="Sending" />
                </span>
            </div>
        );
    }

    return (
        <div className={`${styles.bubble} ${styles.bubbleMe} ${styles.uploadBubble}`}>
            <div className={styles.uploadFileRow}>
                <UploadProgressRing progress={ringProgress} size={40} onCancel={cancel} />
                <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{u.kind === "voice" ? "Voice message" : u.name}</span>
                    <span className={styles.fileSize}>{statusText}</span>
                </div>
                <span className={styles.uploadKindIcon}>{u.kind === "voice" ? <RiMicLine /> : <RiFile3Line />}</span>
            </div>
            <div className={styles.uploadBarTrack}>
                <div
                    className={`${styles.uploadBarFill} ${processing ? styles.uploadBarIndeterminate : ""}`}
                    style={{ width: processing ? "100%" : `${u.progress}%` }}
                />
            </div>
            <span className={styles.bubbleTime}>
                {u.time}
                <RiTimeLine aria-label="Sending" />
            </span>
        </div>
    );
}

const CHAT_SYNC_CHANNEL_NAME = "kp_chat_sync_events";

const broadcastChatOpened = (conversationId, readerId) => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined" || !conversationId) return;
    try {
        const bc = new BroadcastChannel(CHAT_SYNC_CHANNEL_NAME);
        bc.postMessage({
            type: "CHAT_OPENED",
            convoId: String(conversationId).replace(/^(convo|api)-/, "").trim(),
            readerId: readerId != null ? String(readerId) : null,
            timestamp: Date.now(),
        });
        bc.close();
    } catch { }
};

export default function MessagesPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading, user: authUser } = useAuth();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace("/login?redirect=/messages");
        }
    }, [isAuthenticated, authLoading, router]);

    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [draft, setDraft] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [toast, setToast] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [messageMenuOpenId, setMessageMenuOpenId] = useState(null);
    const [uploads, setUploads] = useState([]);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [hiddenMessageIds, setHiddenMessageIds] = useState(() => new Set());
    const uploadsRef = useRef([]);

    // Listen for chat opened events from other tabs / windows in real-time
    useEffect(() => {
        if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
        let bc;
        try {
            bc = new BroadcastChannel(CHAT_SYNC_CHANNEL_NAME);
            bc.onmessage = (event) => {
                const data = event?.data;
                if (!data || data.type !== "CHAT_OPENED" || !data.convoId) return;

                const currentLoginId = getCurrentLoginId(authUser);
                // If the reader is myself, do nothing (my own read shouldn't trigger me)
                if (data.readerId && currentLoginId && String(data.readerId) === String(currentLoginId)) {
                    return;
                }

                const targetConvoId = String(data.convoId);

                // The other person opened this conversation! Instantly mark all my sent messages as seen
                setConversations((prev) =>
                    prev.map((c) => {
                        const cId = String(c.id).replace(/^(convo|api)-/, "");
                        const apiId = String(c.apiId || "").replace(/^(convo|api)-/, "");
                        if (cId === targetConvoId || apiId === targetConvoId) {
                            return {
                                ...c,
                                messages: (c.messages || []).map((m) =>
                                    m.from === "me" ? { ...m, seen: true } : m
                                ),
                            };
                        }
                        return c;
                    })
                );
            };
        } catch { }

        return () => {
            try { bc?.close(); } catch { }
        };
    }, [authUser]);

    useEffect(() => {
        uploadsRef.current = uploads;
    }, [uploads]);

    // Abort in-flight uploads and free preview URLs when leaving the page
    useEffect(() => {
        return () => {
            uploadsRef.current.forEach((u) => {
                try { u.controller?.abort(); } catch { }
                if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
            });
        };
    }, []);

    const activeIdRef = useRef(null);
    const conversationsRef = useRef([]);
    const threadContainerRef = useRef(null);
    const threadEndRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const prevActiveIdRef = useRef(null);
    const prevMessagesCountRef = useRef(0);
    const menuRef = useRef(null);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);
    const recordingSecondsRef = useRef(0);
    const toastTimerRef = useRef(null);
    const hasInitializedRef = useRef(false);
    const markedReadIdsRef = useRef(new Set());
    const convoSigRef = useRef(new Map());

    // Load the messages this user deleted "for me" (stored per user)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(getHiddenStorageKey(getCurrentLoginId(authUser)));
            const ids = raw ? JSON.parse(raw) : [];
            setHiddenMessageIds(new Set(Array.isArray(ids) ? ids.map(String) : []));
        } catch {
            setHiddenMessageIds(new Set());
        }
    }, [authUser]);

    const getVisibleMessages = (convo) =>
        (convo?.messages || []).filter((m) => !hiddenMessageIds.has(getHideKey(m)));

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    // Remove stale local "read receipts" written by earlier versions. They were saved by the
    // viewer's own browser and wrongly turned the viewer's own ticks blue.
    useEffect(() => {
        try {
            Object.keys(localStorage)
                .filter((k) => k.startsWith("kp_convo_read_") || k.startsWith("kp_seen_convo_") || k === "kp_last_seen_event")
                .forEach((k) => localStorage.removeItem(k));
        } catch { }
    }, []);

    const handleThreadScroll = () => {
        const el = threadContainerRef.current;
        if (!el) return;
        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        // If user is within 120px from bottom, consider them "at bottom"
        isNearBottomRef.current = distanceToBottom < 120;
    };

    const loadBackendConversations = async ({ openFirst = false } = {}) => {
        const viewerIdSet = getViewerIdSet(authUser);
        const viewerId = getCurrentLoginId(authUser);
        if (viewerIdSet.size === 0 && !viewerId) return [];

        try {
            const res = await messagesApi.conversations({ per_page: 50 });
            if (!res.success || !Array.isArray(res.data)) return [];

            const currentActiveId = activeIdRef.current;
            const rows = await Promise.all(
                res.data.map(async (conversation) => {
                    const cIdStr = String(conversation.id);
                    const isActive = currentActiveId && String(currentActiveId) === cIdStr;
                    // Signature of the conversation's latest activity; if unchanged we can skip refetching
                    const sigParts = [
                        conversation.updated_at,
                        conversation.last_message_at,
                        conversation.last_message?.id,
                        conversation.unread_count,
                        conversation.recipient_read_at,
                        conversation.recipient_last_read_at,
                        conversation.recipient_last_read_message_id,
                        conversation.other_read_at,
                        conversation.other_last_read_at,
                        conversation.last_read_message_id,
                        conversation.recipient_seen_at,
                        conversation.participant?.last_read_at,
                        conversation.other_user?.last_read_at,
                    ];
                    const hasSig = sigParts.some((v) => v != null);
                    const sig = JSON.stringify(sigParts);
                    try {
                        const existing = conversationsRef.current.find((c) => String(c.id) === cIdStr);
                        if (
                            !isActive && hasSig && existing &&
                            convoSigRef.current.get(cIdStr) === sig &&
                            Array.isArray(existing.messages) && existing.messages.length > 0
                        ) {
                            return { ...mapApiConversation(conversation, [], viewerIdSet), messages: existing.messages, unread: existing.unread };
                        }
                        const messagesRes = await messagesApi.messages(conversation.id, { per_page: 50 });
                        const raw = messagesRes.success ? (Array.isArray(messagesRes.data) ? messagesRes.data : (messagesRes.data?.messages || [])) : [];
                        convoSigRef.current.set(cIdStr, sig);
                        return mapApiConversation(conversation, raw, viewerIdSet);
                    } catch {
                        return mapApiConversation(conversation, [], viewerIdSet);
                    }
                })
            );

            setConversations((prev) => {
                if (!prev || prev.length === 0) {
                    return rows;
                }
                return rows.map((newConvo) => {
                    const oldConvo = prev.find((c) => String(c.id) === String(newConvo.id));
                    if (!oldConvo) return newConvo;
                    const unread = String(oldConvo.id) === String(activeIdRef.current) ? 0 : (oldConvo.unread === 0 && newConvo.unread === 0 ? 0 : newConvo.unread);

                    // Preserve seen: true on messages so they never revert to grey
                    const mergedMessages = newConvo.messages.map((newMsg) => {
                        const oldMsg = oldConvo.messages?.find((m) => m.id === newMsg.id || (m.apiId && String(m.apiId) === String(newMsg.apiId)));
                        if (oldMsg?.seen && !newMsg.seen) {
                            return { ...newMsg, seen: true };
                        }
                        return newMsg;
                    });

                    return {
                        ...newConvo,
                        unread,
                        messages: mergedMessages,
                        blocked: oldConvo.blocked,
                    };
                });
            });

            if (openFirst && rows.length > 0) {
                setActiveId(rows[0].id);
            }
            return rows;
        } catch {
            return [];
        }
    };

    // Load backend conversations on mount. If a reel/property was just shared,
    // ensure it is synchronized to backend and open the resulting conversation.
    useEffect(() => {
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;

            const initConversations = async () => {
                const pending = consumePendingPropertyShare();
                let targetConvoId = null;

                if (pending) {
                    try {
                        if (pending.reel?.id || pending.reel?.reel_id) {
                            const res = await messagesApi.shareReel({
                                reel_id: pending.reel.id || pending.reel.reel_id,
                                recipient_id: pending.recipient_id || pending.reel?.creator?.login_id,
                                message_text: pending.note,
                            });
                            if (res?.data?.conversation_id) {
                                targetConvoId = res.data.conversation_id;
                            }
                        } else if (pending.property?.id) {
                            const res = await messagesApi.shareProperty({
                                property_id: pending.property.id,
                                recipient_id: pending.recipient_id,
                                message_text: pending.note,
                            });
                            if (res?.data?.conversation_id) {
                                targetConvoId = res.data.conversation_id;
                            }
                        }
                    } catch (err) {
                        console.error("Failed to sync shared item on mount:", err);
                    }
                }

                const rows = await loadBackendConversations({ openFirst: Boolean(targetConvoId) });
                if (targetConvoId) {
                    setActiveId(targetConvoId);
                }
            };

            initConversations();
        }
    }, []);

    // Periodic conversation list poll (every 5 seconds)
    useEffect(() => {
        const timer = setInterval(() => {
            loadBackendConversations();
        }, 5000);

        const handleFocus = () => {
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
                loadBackendConversations();
            }
        };
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleFocus);

        return () => {
            clearInterval(timer);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleFocus);
        };
    }, []);

    // Dedicated high-frequency live poll (1.2s) for the active conversation
    useEffect(() => {
        if (!activeId) return;
        let inFlight = false;
        let isCancelled = false;

        const syncActiveMessages = async () => {
            if (inFlight || isCancelled || !activeId) return;
            if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
            inFlight = true;

            try {
                const viewerIdSet = getViewerIdSet(authUser);
                const currentActiveId = activeId;
                const res = await messagesApi.messages(currentActiveId, { per_page: 50 });
                if (isCancelled || String(activeIdRef.current) !== String(currentActiveId)) return;

                const rawMessages = Array.isArray(res?.data)
                    ? res.data
                    : (Array.isArray(res?.data?.messages)
                        ? res.data.messages
                        : (Array.isArray(res?.messages) ? res.messages : []));

                if (Array.isArray(rawMessages)) {
                    setConversations((prev) => {
                        const targetConvo = prev.find((c) => String(c.id) === String(currentActiveId));
                        if (!targetConvo) return prev;

                        const rawConvo = res?.conversation || res?.data?.conversation || {};
                        const convoForMapping = {
                            ...(targetConvo || {}),
                            ...(rawConvo || {}),
                        };
                        if (targetConvo?.participant && !convoForMapping.participant) {
                            convoForMapping.participant = targetConvo.participant;
                        }
                        if (targetConvo?.recipient && !convoForMapping.recipient) {
                            convoForMapping.recipient = targetConvo.recipient;
                        }
                        if (targetConvo?.other_user && !convoForMapping.other_user) {
                            convoForMapping.other_user = targetConvo.other_user;
                        }

                        const mapped = mapApiConversation(convoForMapping, rawMessages, viewerIdSet);

                        // Retain pending optimistic messages
                        const backendIds = new Set(rawMessages.map((rm) => String(rm.id)));
                        const pendingOptimistic = (targetConvo.messages || []).filter(
                            (m) => m.isOptimistic && !backendIds.has(String(m.id))
                        );

                        // Merge seen: if an old message was seen, preserve seen: true
                        const mergedMessages = mapped.messages.map((newMsg) => {
                            const oldMsg = targetConvo.messages?.find(
                                (m) => m.id === newMsg.id || (m.apiId && String(m.apiId) === String(newMsg.apiId))
                            );
                            if (oldMsg?.seen && !newMsg.seen) {
                                return { ...newMsg, seen: true };
                            }
                            return newMsg;
                        });

                        const updatedMessages = [...mergedMessages, ...pendingOptimistic];

                        // Skip state re-render if no message signature changed
                        const oldSig = (targetConvo.messages || []).map((m) => `${m.id}:${m.seen}:${Boolean(m.deleted)}`).join(",");
                        const newSig = updatedMessages.map((m) => `${m.id}:${m.seen}:${Boolean(m.deleted)}`).join(",");

                        if (oldSig === newSig && targetConvo.unread === 0) return prev;

                        return prev.map((c) =>
                            String(c.id) === String(currentActiveId)
                                ? { ...c, messages: updatedMessages, unread: 0 }
                                : c
                        );
                    });
                }
            } catch {
            } finally {
                inFlight = false;
            }
        };

        syncActiveMessages();
        const liveTimer = setInterval(syncActiveMessages, 1200);

        return () => {
            isCancelled = true;
            clearInterval(liveTimer);
        };
    }, [activeId, authUser]);

    // Note: seen ticks come only from the server (polled every 1.2s above), so they turn blue
    // only after the other person has actually opened the chat.

    useEffect(() => {
        activeIdRef.current = activeId;
    }, [activeId]);

    useEffect(() => {
        setMenuOpen(false);
        setMessageMenuOpenId(null);
    }, [activeId]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
            if (!e.target.closest("[data-message-menu-root]")) {
                setMessageMenuOpenId(null);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    // Exclusive playback: when any voice note / audio / video starts playing,
    // pause every other media element so only one plays at a time.
    // Media "play" events don't bubble, so listen in the capture phase.
    useEffect(() => {
        const handleMediaPlay = (e) => {
            const current = e.target;
            if (!(current instanceof HTMLMediaElement)) return;
            document.querySelectorAll("audio, video").forEach((media) => {
                if (media !== current && !media.paused) {
                    media.pause();
                }
            });
        };
        document.addEventListener("play", handleMediaPlay, true);
        return () => document.removeEventListener("play", handleMediaPlay, true);
    }, []);

    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const activeConversation = conversations.find((c) => String(c.id) === String(activeId)) || null;
    const visibleMessages = getVisibleMessages(activeConversation);

    const filteredConversations = conversations.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    const getMessagePreview = (m) => {
        if (m.deleted) return "This message was deleted";
        if (m.type === "property") return m.text || m.note ? `🏠 ${m.property.title} — ${m.text || m.note}` : `🏠 ${m.property.title}`;
        if (m.type === "reel") return `🎬 ${m.reel?.caption || `Reel #${getReelId(m.reel)}`}`;
        if (m.type === "voice") return "🎤 Voice message";
        if (m.type === "image") return "📷 Photo";
        if (m.type === "video") return "🎬 Video";
        if (m.type === "file") return `📎 ${m.file?.name || "File"}`;
        return m.text;
    };

    useEffect(() => {
        const activeMessages = visibleMessages;
        const currentCount = activeMessages.length;
        const activeIdChanged = activeId !== prevActiveIdRef.current;
        const messagesCountChanged = currentCount !== prevMessagesCountRef.current;

        prevActiveIdRef.current = activeId;
        prevMessagesCountRef.current = currentCount;

        // When switching or opening a conversation: jump to bottom immediately
        if (activeIdChanged) {
            isNearBottomRef.current = true;
            // Short delay ensures DOM nodes for the new conversation have rendered
            setTimeout(() => {
                threadEndRef.current?.scrollIntoView({ behavior: "auto" });
            }, 30);
            return;
        }

        // When new message arrives in the current conversation:
        if (messagesCountChanged) {
            // Only auto-scroll down if the user is already looking at the bottom
            if (isNearBottomRef.current) {
                threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [activeId, visibleMessages.length]);

    // Mark the other person's messages as read while this chat is open on
    // screen, so their double-tick turns WhatsApp blue on their side.
    useEffect(() => {
        if (!activeConversation) return;
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches;
        if (isMobile && !showThreadOnMobile) return;

        const convoId = activeConversation.apiId || activeConversation.id;
        if (!convoId) return;

        const cleanConvoId = String(convoId).replace(/^(convo|api)-/, "").trim();
        const viewerId = getCurrentLoginId(authUser);

        // 1. Mark entire conversation as read on backend
        messagesApi.markConversationRead(cleanConvoId).catch(() => { });
        broadcastChatOpened(cleanConvoId, viewerId);

        // 2. Mark individual pending incoming messages as read
        const pending = (activeConversation.messages || []).filter(
            (m) => m.from === "them" && !m.seen && !m.deleted && m.apiId && !markedReadIdsRef.current.has(m.apiId)
        );
        pending.forEach((m) => {
            markedReadIdsRef.current.add(m.apiId);
            messagesApi.markRead(m.apiId, cleanConvoId).catch(() => {
                markedReadIdsRef.current.delete(m.apiId);
            });
        });

        // 3. Optimistically mark activeConversation's incoming messages as seen in state
        if (pending.length > 0) {
            setConversations((prev) =>
                prev.map((c) => {
                    if (String(c.id) === String(convoId) || String(c.apiId) === String(convoId)) {
                        return {
                            ...c,
                            unread: 0,
                            messages: (c.messages || []).map((m) => (m.from === "them" ? { ...m, seen: true } : m)),
                        };
                    }
                    return c;
                })
            );
        }
    }, [activeConversation?.id, activeConversation?.messages?.length, showThreadOnMobile, authUser]);

    // Also re-verify seen status when tab or window regains focus
    useEffect(() => {
        const handleRecheckVisibility = () => {
            if (typeof document !== "undefined" && document.visibilityState === "visible" && activeConversation) {
                const convoId = activeConversation.apiId || activeConversation.id;
                if (convoId) {
                    const cleanConvoId = String(convoId).replace(/^(convo|api)-/, "").trim();
                    const viewerId = getCurrentLoginId(authUser);
                    messagesApi.markConversationRead(cleanConvoId).catch(() => { });
                    broadcastChatOpened(cleanConvoId, viewerId);

                    const pending = (activeConversation.messages || []).filter(
                        (m) => m.from === "them" && !m.seen && !m.deleted && m.apiId && !markedReadIdsRef.current.has(m.apiId)
                    );
                    pending.forEach((m) => {
                        markedReadIdsRef.current.add(m.apiId);
                        messagesApi.markRead(m.apiId, cleanConvoId).catch(() => {
                            markedReadIdsRef.current.delete(m.apiId);
                        });
                    });
                }
            }
        };
        window.addEventListener("focus", handleRecheckVisibility);
        document.addEventListener("visibilitychange", handleRecheckVisibility);
        return () => {
            window.removeEventListener("focus", handleRecheckVisibility);
            document.removeEventListener("visibilitychange", handleRecheckVisibility);
        };
    }, [activeConversation, authUser]);

    const handleSelectConversation = (id) => {
        setActiveId(id);
        setShowThreadOnMobile(true);
        setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
        );
        const cleanId = String(id).replace(/^(convo|api)-/, "").trim();
        if (cleanId) {
            messagesApi.markConversationRead(cleanId).catch(() => { });
            broadcastChatOpened(cleanId, getCurrentLoginId(authUser));
        }
    };

    // Safely sync unread badge to localStorage and notify Nav outside of render
    useEffect(() => {
        const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
        try {
            localStorage.setItem("kp_unread_messages_count", String(totalUnread));
            window.dispatchEvent(new CustomEvent("kp_unread_messages_updated", { detail: { count: totalUnread } }));
        } catch { }
    }, [conversations]);

    const handleBackToList = () => {
        setShowThreadOnMobile(false);
    };

    const showToast = (message) => {
        setToast(message);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(""), 3500);
    };

    const handleToggleBlock = async () => {
        if (!activeConversation) return;
        const convoId = activeConversation.id;
        const rawApiId = activeConversation.apiId || convoId;

        try {
            const res = await messagesApi.toggleBlock(rawApiId);
            const isBlockedByMe = res?.data?.is_blocked_by_me ?? false;
            const isBlocked = res?.data?.blocked ?? false;
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === convoId
                        ? {
                            ...c,
                            blocked: isBlocked,
                            is_blocked_by_me: isBlockedByMe,
                            is_blocked_by_other: false,
                        }
                        : c
                )
            );
            setMenuOpen(false);
            showToast(isBlocked ? `${activeConversation.name} has been blocked.` : `${activeConversation.name} has been unblocked.`);
            loadBackendConversations();
        } catch (err) {
            console.error("Toggle block error:", err);
            showToast("Failed to update block status.");
        }
    };

    // Opens the WhatsApp-style delete dialog for a message
    const openDeleteDialog = (message) => {
        setMessageMenuOpenId(null);
        setDeleteTarget(message);
    };

    // Only my own, already-delivered, not-yet-deleted messages can be deleted for everyone
    const canDeleteForEveryone = (m) =>
        Boolean(m && m.from === "me" && !m.deleted && m.apiId && !Number.isNaN(Number(m.apiId)));

    // "Delete for me": hide the message only in this user's chat
    const handleDeleteForMe = async (messageItem) => {
        if (!messageItem) return;
        setDeleteTarget(null);
        const key = getHideKey(messageItem);
        if (!key) return;

        setHiddenMessageIds((prev) => {
            const next = new Set(prev);
            next.add(key);
            try {
                localStorage.setItem(getHiddenStorageKey(getCurrentLoginId(authUser)), JSON.stringify([...next]));
            } catch { }
            return next;
        });
        showToast("Message deleted for you");

        if (messageItem.apiId && !Number.isNaN(Number(messageItem.apiId))) {
            messagesApi.deleteMessageForMe(Number(messageItem.apiId)).catch(() => { });
        }
    };

    // "Delete for everyone": remove the message for both people (own messages only)
    const handleDeleteForEveryone = async (messageItem) => {
        if (!activeConversation || !canDeleteForEveryone(messageItem)) return;
        setDeleteTarget(null);
        const convoId = activeConversation.id;
        const targetId = messageItem.id;
        const rawApiId = Number(messageItem.apiId);

        const setDeleted = (deleted) =>
            setConversations((prev) =>
                prev.map((c) =>
                    String(c.id) === String(convoId)
                        ? {
                            ...c,
                            messages: c.messages.map((m) =>
                                m.id === targetId ? (deleted ? { ...m, deleted: true } : { ...messageItem }) : m
                            ),
                        }
                        : c
                )
            );

        // Optimistically show "This message was deleted"
        setDeleted(true);
        showToast("Message deleted for everyone");

        try {
            await messagesApi.deleteMessage(rawApiId);
            loadBackendConversations();
        } catch (err) {
            console.error("Backend delete message failed:", err);
            setDeleted(false);
            showToast(err?.response?.data?.message || "Couldn't delete the message for everyone.");
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text || !activeConversation || activeConversation.blocked) return;

        setDraft("");

        const optimisticId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: optimisticId,
            apiId: null,
            from: "me",
            type: "text",
            text: text,
            time: formatMessageTime(new Date()),
            deleted: false,
            seen: false,
            isOptimistic: true,
        };

        const convoId = activeConversation.id;
        setConversations((prev) =>
            prev.map((c) =>
                String(c.id) === String(convoId)
                    ? { ...c, messages: [...(c.messages || []), optimisticMsg] }
                    : c
            )
        );

        try {
            await messagesApi.send({
                conversation_id: activeConversation.apiId || activeConversation.id,
                message_text: text,
            });
            await loadBackendConversations();
        } catch (err) {
            const errMsg = err?.response?.data?.message || "Message delivery failed.";
            showToast(errMsg);
            setConversations((prev) =>
                prev.map((c) =>
                    String(c.id) === String(convoId)
                        ? { ...c, messages: (c.messages || []).filter((m) => m.id !== optimisticId) }
                        : c
                )
            );
        }
    };

    // Uploads a FormData payload while showing an "uploading" bubble with live progress.
    // Returns true on success, false on failure / cancel.
    const uploadWithProgress = async ({ formData, convoId, kind, name, size, file }) => {
        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const controller = new AbortController();
        const previewUrl = file && (kind === "image" || kind === "video") ? URL.createObjectURL(file) : null;

        setUploads((prev) => [
            ...prev,
            {
                id: uploadId,
                convoId: String(convoId),
                kind,
                name,
                size: size || 0,
                previewUrl,
                progress: 0,
                time: formatMessageTime(new Date()),
                controller,
            },
        ]);
        isNearBottomRef.current = true;
        setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

        const removeUpload = () => {
            setUploads((prev) => prev.filter((u) => u.id !== uploadId));
            if (previewUrl) setTimeout(() => URL.revokeObjectURL(previewUrl), 1000);
        };

        try {
            await messagesApi.send(formData, {
                signal: controller.signal,
                onUploadProgress: (evt) => {
                    const total = evt.total || size || 0;
                    if (!total) return;
                    const pct = Math.min(100, Math.round((evt.loaded / total) * 100));
                    setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: pct } : u)));
                },
            });
            // Upload done; keep the bubble in "Processing…" until the real message is loaded
            setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: 100 } : u)));
            await loadBackendConversations();
            removeUpload();
            return true;
        } catch (err) {
            removeUpload();
            const cancelled = err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError";
            showToast(cancelled ? "Upload cancelled." : (err?.response?.data?.message || `Couldn't send ${kind === "voice" ? "the voice message" : "that file"}.`));
            return false;
        }
    };

    const handleCancelUpload = (uploadId) => {
        const u = uploadsRef.current.find((x) => x.id === uploadId);
        try { u?.controller?.abort(); } catch { }
    };

    const stopRecording = (shouldSend) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;
        recorder.shouldSend = shouldSend;
        if (recorder.state !== "inactive") {
            recorder.stop();
        }
    };

    const startRecording = async () => {
        if (!activeConversation || activeConversation.blocked || isRecording) return;

        if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
            showToast("Voice recording isn't supported in this browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            audioChunksRef.current = [];
            recordingSecondsRef.current = 0;

            // Prefer audio/mp4 (AAC) if supported because it plays natively on both iOS and Chrome/Android
            const preferredTypes = [
                "audio/mp4",
                "audio/aac",
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/ogg",
            ];
            let selectedMimeType = "";
            for (const type of preferredTypes) {
                if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
                    selectedMimeType = type;
                    break;
                }
            }

            const recorder = selectedMimeType ? new MediaRecorder(stream, { mimeType: selectedMimeType }) : new MediaRecorder(stream);
            recorder.shouldSend = true;
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                mediaStreamRef.current = null;
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                    recordingIntervalRef.current = null;
                }
                const finalDuration = recordingSecondsRef.current;
                recordingSecondsRef.current = 0;
                setIsRecording(false);
                setRecordingSeconds(0);

                if (!recorder.shouldSend || audioChunksRef.current.length === 0) return;

                const actualMime = recorder.mimeType || selectedMimeType || "audio/mp4";
                const isMp4 = actualMime.includes("mp4") || actualMime.includes("aac") || actualMime.includes("m4a");
                const ext = isMp4 ? "m4a" : "webm";
                const blob = new Blob(audioChunksRef.current, { type: actualMime });

                const convoId = activeConversation?.apiId || activeConversation?.id;
                if (convoId) {
                    const formData = new FormData();
                    formData.append("conversation_id", convoId);
                    formData.append("file", blob, `voice_message.${ext}`);
                    formData.append("message_type", "voice");
                    formData.append("duration", finalDuration);

                    await uploadWithProgress({
                        formData,
                        convoId: activeConversation?.id ?? convoId,
                        kind: "voice",
                        name: "Voice message",
                        size: blob.size,
                    });
                }
            };

            recorder.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            recordingIntervalRef.current = setInterval(() => {
                recordingSecondsRef.current += 1;
                setRecordingSeconds(recordingSecondsRef.current);
                if (recordingSecondsRef.current >= MAX_RECORDING_SECONDS) {
                    stopRecording(true);
                }
            }, 1000);
        } catch {
            showToast("Microphone access is required to record a voice message.");
        }
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !activeConversation || activeConversation.blocked) return;

        if (file.size > MAX_FILE_SIZE) {
            showToast(`"${file.name}" is too large. Max file size is 8 MB.`);
            return;
        }

        const isImage = file.type.startsWith("image/");
        const isAudio = file.type.startsWith("audio/");
        const isVideo = file.type.startsWith("video/");
        const kind = isImage ? "image" : (isAudio ? "voice" : (isVideo ? "video" : "file"));

        const convoId = activeConversation?.apiId || activeConversation?.id;
        if (convoId) {
            const formData = new FormData();
            formData.append("conversation_id", convoId);
            formData.append("file", file);
            formData.append("file_name", file.name);
            formData.append("message_type", kind);

            await uploadWithProgress({
                formData,
                convoId: activeConversation?.id ?? convoId,
                kind,
                name: file.name,
                size: file.size,
                file,
            });
        }
    };

    return (
        <>
            {/* Site nav is hidden on mobile via CSS (messages has its own back buttons) */}
            <div className={styles.navWrap}>
                <Nav />
            </div>
            {toast && <div className={styles.toastBar}>{toast}</div>}
            {lightboxImage && <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />}
            {deleteTarget && (
                <DeleteMessageDialog
                    canDeleteForEveryone={canDeleteForEveryone(deleteTarget)}
                    onDeleteForMe={() => handleDeleteForMe(deleteTarget)}
                    onDeleteForEveryone={() => handleDeleteForEveryone(deleteTarget)}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
            <div className={styles.page}>
                <div className={styles.container}>
                    {/* Conversation List */}
                    <div className={`${styles.listPane} ${showThreadOnMobile ? styles.listPaneHiddenMobile : ""}`}>
                        <div className={styles.listHeader}>
                            <div className={styles.titleRow}>
                                <button
                                    onClick={() => router.back()}
                                    className={styles.pageBackBtn}
                                    aria-label="Go Back"
                                >
                                    <RiArrowLeftLine />
                                </button>
                                <h1>Messages</h1>
                            </div>
                            <div className={styles.searchWrap}>
                                <RiSearchLine className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.conversationList}>
                            {filteredConversations.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyStateIcon}>
                                        {searchTerm.trim() ? <RiSearchEyeLine /> : <RiChatSmile2Line />}
                                    </div>
                                    <p className={styles.emptyStateTitle}>
                                        {searchTerm.trim() ? "No results" : "No conversations"}
                                    </p>
                                    <p className={styles.emptyStateText}>
                                        {searchTerm.trim()
                                            ? `Nothing matches "${searchTerm}". Try a different name.`
                                            : "Messages from agents and owners will show up here."}
                                    </p>
                                </div>
                            ) : (
                                filteredConversations.map((c) => {
                                    const visible = getVisibleMessages(c);
                                    const lastMessage = visible[visible.length - 1];
                                    return (
                                        <button
                                            type="button"
                                            key={c.id}
                                            className={`${styles.conversationItem} ${String(c.id) === String(activeId) ? styles.conversationItemActive : ""}`}
                                            onClick={() => handleSelectConversation(c.id)}
                                        >
                                            <div className={styles.avatarWrap}>
                                                <ChatAvatar
                                                    src={c.avatar}
                                                    name={c.name}
                                                    imgClassName={styles.avatar}
                                                />
                                                {c.online && <span className={styles.onlineDot} />}
                                            </div>
                                            <div className={styles.conversationInfo}>
                                                <div className={styles.conversationTopRow}>
                                                    <span className={styles.conversationName}>{c.name}</span>
                                                    {lastMessage && <span className={styles.conversationTime}>{lastMessage.time}</span>}
                                                </div>
                                                <div className={styles.conversationBottomRow}>
                                                    <span className={`${styles.conversationPreview} ${c.unread > 0 ? styles.conversationPreviewUnread : ""}`}>
                                                        {c.blocked
                                                            ? "Blocked"
                                                            : lastMessage
                                                                ? `${lastMessage.from === "me" ? "You: " : ""}${getMessagePreview(lastMessage)}`
                                                                : "No messages yet"}
                                                    </span>
                                                    {c.unread > 0 && <span className={styles.unreadDot} aria-label={`${c.unread} unread`} />}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Chat Thread */}
                    <div className={`${styles.threadPane} ${showThreadOnMobile ? styles.threadPaneVisibleMobile : ""}`}>
                        {activeConversation ? (
                            <>
                                <div className={styles.threadHeader}>
                                    <button type="button" className={styles.backBtn} onClick={handleBackToList}>
                                        <RiArrowLeftLine />
                                    </button>
                                    <div className={styles.avatarWrap}>
                                        <ChatAvatar
                                            src={activeConversation.avatar}
                                            name={activeConversation.name}
                                            imgClassName={styles.avatar}
                                        />
                                        {activeConversation.online && <span className={styles.onlineDot} />}
                                    </div>
                                    <div className={styles.threadHeaderInfo}>
                                        <div className={styles.threadName}>{activeConversation.name}</div>
                                        <div className={styles.threadRole}>
                                            {activeConversation.blocked
                                                ? "Blocked"
                                                : activeConversation.online
                                                    ? "Online"
                                                    : activeConversation.role}
                                        </div>
                                    </div>

                                    <div className={styles.threadMenuWrapper} ref={menuRef}>
                                        <button
                                            type="button"
                                            className={styles.threadMenuBtn}
                                            onClick={() => setMenuOpen((open) => !open)}
                                            aria-label="Conversation options"
                                        >
                                            <RiMore2Fill />
                                        </button>

                                        {menuOpen && (
                                            <div className={styles.threadMenuDropdown}>
                                                {activeConversation.is_blocked_by_other ? (
                                                    <div className={styles.threadMenuItem} style={{ color: "#ef4444", cursor: "default" }}>
                                                        <RiForbidLine /> Blocked by {activeConversation.name}
                                                    </div>
                                                ) : (
                                                    <button type="button" className={styles.threadMenuItem} onClick={handleToggleBlock}>
                                                        {activeConversation.is_blocked_by_me ? (
                                                            <>
                                                                <RiShieldCheckLine /> Unblock {activeConversation.name}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RiForbidLine /> Block {activeConversation.name}
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className={styles.threadMessages}
                                    ref={threadContainerRef}
                                    onScroll={handleThreadScroll}
                                >
                                    {visibleMessages.length === 0 && (
                                        <div className={styles.emptyThread}>
                                            <div style={{ width: "64px", height: "64px", margin: "0 auto 12px", borderRadius: "50%", overflow: "hidden" }}>
                                                <ChatAvatar
                                                    src={activeConversation.avatar}
                                                    name={activeConversation.name}
                                                    imgClassName={styles.emptyThreadAvatar}
                                                />
                                            </div>
                                            <p className={styles.emptyThreadTitle}>No messages yet</p>
                                            <p className={styles.emptyThreadText}>
                                                Send a message to {activeConversation.name} to start the conversation.
                                            </p>
                                        </div>
                                    )}
                                    {visibleMessages.map((m, idx) => {
                                        const msgDate = m.createdAt || (m.isOptimistic ? new Date().toISOString() : null);
                                        const dayKey = getDayKey(msgDate);
                                        const prevMsg = visibleMessages[idx - 1];
                                        const prevDayKey = prevMsg
                                            ? getDayKey(prevMsg.createdAt || (prevMsg.isOptimistic ? new Date().toISOString() : null))
                                            : null;
                                        const showDateSeparator = Boolean(dayKey) && dayKey !== prevDayKey;
                                        const rowClass = `${styles.bubbleRow} ${m.from === "me" ? styles.bubbleRowMe : ""}`;
                                        const isMenuOpen = messageMenuOpenId === m.id;

                                        let content;

                                        if (m.deleted) {
                                            content = (
                                                <div className={`${styles.bubble} ${styles.deletedBubble} ${m.from === "me" ? styles.bubbleMe : styles.bubbleThem}`}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <RiForbidLine /> <span>This message was deleted</span>
                                                    </div>
                                                </div>
                                            );
                                        } else if (m.type === "property") {
                                            const propertyNote = m.text || m.note;
                                            content = (
                                                <div className={`${styles.propertyMessageWrap} ${propertyNote ? styles.propertyMessageWrapWithNote : ""}`}>
                                                    <Link href={getPropertyUrl(m.property)} className={styles.propertyCard}>
                                                        <img loading="lazy" decoding="async"
                                                            src={m.property.image ? formatPropertyImgUrl(m.property.image) : KERALAPLOTS_LOGO_URL}
                                                            alt={m.property.title}
                                                            className={`${styles.propertyCardImage} ${isLogo(m.property.image) ? styles.propertyCardLogo : ""}`}
                                                            onError={handlePropertyImageError}
                                                        />
                                                        <div className={styles.propertyCardInfo}>
                                                            <PropertyBadgeRow style={{ marginBottom: 4 }}>
                                                                <PropertyIdBadge property={m.property} />
                                                            </PropertyBadgeRow>
                                                            <span className={styles.propertyCardTitle}>{m.property.title}</span>
                                                            {m.property.location && (
                                                                <span className={styles.propertyCardLocation}>{m.property.location}</span>
                                                            )}
                                                            {m.property.price && (
                                                                <span className={styles.propertyCardPrice}>{m.property.price}</span>
                                                            )}
                                                        </div>
                                                        <span className={styles.propertyCardLinkRow}>
                                                            <RiHome5Line /> View Property
                                                        </span>
                                                    </Link>
                                                    {propertyNote && (
                                                        <div className={styles.propertyMessageNote}>
                                                            {propertyNote}
                                                        </div>
                                                    )}
                                                    <span className={styles.bubbleTime} style={{ marginTop: 4, padding: "0 6px" }}>
                                                        {m.time}
                                                        {m.from === "me" && <ReadTick seen={m.seen} />}
                                                    </span>
                                                </div>
                                            );
                                        } else if (m.type === "reel") {
                                            const reelId = getReelId(m.reel);
                                            const reelHref = reelId ? `/reels?reel=${encodeURIComponent(reelId)}` : "/reels";
                                            content = (
                                                <div className={`${styles.propertyMessageWrap} ${m.note ? styles.propertyMessageWrapWithNote : ""}`}>
                                                    <Link href={reelHref} className={`${styles.propertyCard} ${styles.reelCard}`}>
                                                        <div className={styles.reelCardMediaBox}>
                                                            <img loading="lazy" decoding="async"
                                                                src={m.reel.poster || KERALAPLOTS_LOGO_URL}
                                                                alt={m.reel.caption}
                                                                className={`${styles.reelCardImage} ${isLogo(m.reel.poster) ? styles.reelCardLogo : ""}`}
                                                            />
                                                            <RiPlayCircleFill className={styles.reelCardPlayIcon} />
                                                        </div>
                                                        <div className={styles.propertyCardInfo}>
                                                            <span className={styles.propertyCardTitle}>{m.reel.caption}</span>
                                                            <span className={styles.propertyCardLocation}>{m.reel.location}</span>
                                                        </div>
                                                        <span className={styles.propertyCardLinkRow}>
                                                            <RiPlayCircleFill /> View Reel
                                                        </span>
                                                    </Link>
                                                    {m.note && (
                                                        <div className={styles.propertyMessageNote}>
                                                            {m.note}
                                                        </div>
                                                    )}
                                                    <span className={styles.bubbleTime} style={{ marginTop: 4, padding: "0 6px" }}>
                                                        {m.time}
                                                        {m.from === "me" && <ReadTick seen={m.seen} />}
                                                    </span>
                                                </div>
                                            );
                                        } else if (m.type === "voice") {
                                            content = <ChatVoiceMessage m={m} />;
                                        } else if (m.type === "image") {
                                            content = (
                                                <div className={`${styles.imageBubble} ${m.from === "me" ? styles.bubbleMe : styles.bubbleThem}`}>
                                                    <img
                                                        loading="lazy"
                                                        decoding="async"
                                                        src={m.image}
                                                        alt={m.fileName || "Shared photo"}
                                                        className={`${styles.sharedImage} ${styles.sharedImageClickable}`}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-label="Open image full screen"
                                                        onClick={() => setLightboxImage({ src: m.image, alt: m.fileName, time: m.time })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault();
                                                                setLightboxImage({ src: m.image, alt: m.fileName, time: m.time });
                                                            }
                                                        }}
                                                    />
                                                    <span className={styles.bubbleTime}>
                                                        {m.time}
                                                        {m.from === "me" && <ReadTick seen={m.seen} />}
                                                    </span>
                                                </div>
                                            );
                                        } else if (m.type === "video") {
                                            content = <ChatVideoMessage m={m} />;
                                        } else if (m.type === "file") {
                                            content = (
                                                <div className={`${styles.bubble} ${m.from === "me" ? styles.bubbleMe : styles.bubbleThem}`}>
                                                    <a
                                                        href={safeHref(m.file.dataUrl, { allowData: true }) || undefined}
                                                        download={m.file.name}
                                                        className={`${styles.fileBubble} ${m.from === "me" ? styles.bubbleMe : styles.bubbleThem}`}
                                                    >
                                                        <span className={styles.fileIcon}><RiFile3Line /></span>
                                                        <div className={styles.fileInfo}>
                                                            <span className={styles.fileName}>{m.file.name}</span>
                                                            <span className={styles.fileSize}>{formatFileSize(m.file.size)}</span>
                                                        </div>
                                                        <RiDownload2Line className={styles.fileDownloadIcon} />
                                                    </a>
                                                    <span className={styles.bubbleTime} style={{ marginTop: 4 }}>
                                                        {m.time}
                                                        {m.from === "me" && <ReadTick seen={m.seen} />}
                                                    </span>
                                                </div>
                                            );
                                        } else {
                                            content = (
                                                <div className={`${styles.bubble} ${m.from === "me" ? styles.bubbleMe : styles.bubbleThem}`}>
                                                    <span>{renderMessageText(m.text)}</span>
                                                    <span className={styles.bubbleTime}>
                                                        {m.time}
                                                        {m.from === "me" && <ReadTick seen={m.seen} />}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const menuControl = (
                                            <div className={styles.messageMenuWrapper} data-message-menu-root>
                                                <button
                                                    type="button"
                                                    className={styles.messageMenuBtn}
                                                    onClick={() => setMessageMenuOpenId(isMenuOpen ? null : m.id)}
                                                    aria-label="Message options"
                                                >
                                                    <RiMore2Fill />
                                                </button>
                                                {isMenuOpen && (
                                                    <div
                                                        className={`${styles.messageMenuDropdown} ${m.from === "me" ? styles.messageMenuDropdownLeft : styles.messageMenuDropdownRight
                                                            }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            className={styles.threadMenuItem}
                                                            onClick={() => openDeleteDialog(m)}
                                                        >
                                                            <RiDeleteBinLine /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );

                                        return (
                                            <Fragment key={m.id}>
                                                {showDateSeparator && (
                                                    <div className={styles.dateSeparator} role="separator">
                                                        <span className={styles.dateSeparatorPill}>{formatDaySeparator(msgDate)}</span>
                                                    </div>
                                                )}
                                                <div className={rowClass}>
                                                    {m.from === "me" && menuControl}
                                                    {content}
                                                    {m.from !== "me" && menuControl}
                                                </div>
                                            </Fragment>
                                        );
                                    })}
                                    {uploads
                                        .filter((u) => u.convoId === String(activeConversation.id))
                                        .map((u) => (
                                            <div key={u.id} className={`${styles.bubbleRow} ${styles.bubbleRowMe}`}>
                                                <UploadingBubble u={u} onCancel={handleCancelUpload} />
                                            </div>
                                        ))}
                                    <div ref={threadEndRef} />
                                </div>

                                {activeConversation.is_blocked_by_other ? (
                                    <div className={styles.blockedBar}>
                                        <span>You cannot message {activeConversation.name} because you have been blocked.</span>
                                    </div>
                                ) : activeConversation.is_blocked_by_me || activeConversation.blocked ? (
                                    <div className={styles.blockedBar}>
                                        <span>You blocked {activeConversation.name}. You won&apos;t receive messages from them.</span>
                                        <button type="button" className={styles.unblockBtn} onClick={handleToggleBlock}>
                                            Unblock
                                        </button>
                                    </div>
                                ) : (
                                    <form className={styles.composer} onSubmit={handleSend}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelected}
                                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xlsx,.zip"
                                            className={styles.hiddenFileInput}
                                        />

                                        {isRecording ? (
                                            <div className={styles.recordingBar}>
                                                <span className={styles.recordingDot} />
                                                <span className={styles.recordingTimer}>{formatDuration(recordingSeconds)}</span>
                                                <span className={styles.recordingHint}>Recording voice message...</span>
                                                <button
                                                    type="button"
                                                    className={styles.recordingCancelBtn}
                                                    onClick={() => stopRecording(false)}
                                                    aria-label="Cancel recording"
                                                >
                                                    <RiDeleteBinLine />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.sendBtn}
                                                    onClick={() => stopRecording(true)}
                                                    aria-label="Send voice message"
                                                >
                                                    <RiSendPlaneFill />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button type="button" className={styles.attachBtn} onClick={handleAttachClick} aria-label="Attach a file">
                                                    <RiAttachment2 />
                                                </button>
                                                <input
                                                    type="text"
                                                    placeholder="Type a message..."
                                                    value={draft}
                                                    onChange={(e) => setDraft(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleSend(e);
                                                        }
                                                    }}
                                                />
                                                {draft.trim() ? (
                                                    <button type="submit" className={styles.sendBtn} aria-label="Send message">
                                                        <RiSendPlaneFill />
                                                    </button>
                                                ) : (
                                                    <button type="button" className={styles.micBtn} onClick={startRecording} aria-label="Record a voice message">
                                                        <RiMicLine />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </form>
                                )}
                            </>
                        ) : (
                            <div className={styles.noConversation}>
                                <div className={styles.noConversationIcon}>
                                    <RiChatSmile2Line />
                                </div>
                                <p className={styles.noConversationTitle}>Your Messages</p>
                                <p className={styles.noConversationText}>Select a conversation from the list to start chatting.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
