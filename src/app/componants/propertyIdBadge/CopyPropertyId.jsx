"use client";

import { useEffect, useRef, useState } from "react";
import { RiFileCopyLine, RiCheckLine } from "react-icons/ri";
import { copyText } from "../../lib/copyText";
import styles from "./copyPropertyId.module.css";

/* "ID: KP822" that copies the ID (just "KP822") when clicked.
   `className` is applied to the ID text so the page keeps its own style. */
export default function CopyPropertyId({ code, className = "" }) {
    const [status, setStatus] = useState("idle"); // idle | copied | failed
    const timer = useRef(null);

    useEffect(() => () => clearTimeout(timer.current), []);

    if (!code) return null;

    const handleCopy = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await copyText(code);
        setStatus(ok ? "copied" : "failed");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setStatus("idle"), 2000);
    };

    const label =
        status === "copied" ? "Copied!" : status === "failed" ? "Press Ctrl+C to copy" : "Copy property ID";

    return (
        <button
            type="button"
            className={`${styles.copyBtn} ${status === "copied" ? styles.copied : ""}`}
            onClick={handleCopy}
            title={label}
            aria-label={`Property ID ${code}. ${label}`}
        >
            <span className={className}>ID: {code}</span>
            <span className={styles.icon} aria-hidden="true">
                {status === "copied" ? <RiCheckLine /> : <RiFileCopyLine />}
            </span>
            {status !== "idle" && (
                <span className={styles.tip} role="status">
                    {status === "copied" ? "Copied!" : "Couldn't copy"}
                </span>
            )}
        </button>
    );
}
