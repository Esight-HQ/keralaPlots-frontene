"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./offlineScreen.module.css";
import {
    RiWifiLine,
    RiFlightTakeoffLine,
    RiSignalTowerLine,
    RiRefreshLine,
} from "react-icons/ri";

/* Text wraps on its own rather than at hardcoded breaks — a forced break plus a
   narrow column turns two lines into three. */
const TIPS = [
    { Icon: RiWifiLine, text: "Check your Wi-Fi or mobile data connection." },
    { Icon: RiFlightTakeoffLine, text: "Make sure airplane mode is turned off." },
    { Icon: RiSignalTowerLine, text: "Move to an area with better network coverage." },
];

/* The browser's connection status is external state, so it is subscribed to
   rather than mirrored into a state variable inside an effect. */
function subscribeToConnection(onChange) {
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
    };
}

const getIsOnline = () => navigator.onLine;

/* The server can't know the client's connection, so it renders as online and
   the first client read corrects it. */
const getIsOnlineOnServer = () => true;

/* Globe losing its signal, over the house it can no longer reach. Drawn inline
   so the screen needs no network to render itself. */
function OfflineArt() {
    return (
        <svg
            className={styles.art}
            viewBox="0 0 700 480"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* soft blob the scene sits in */}
            <path
                className={styles.blob}
                d="M350 92c72-16 148 10 174 66 28 56 22 118-10 158-32 42-96 60-162 58-66-2-134-16-166-56-32-42-28-110 2-152 30-44 90-58 162-74Z"
            />

            {/* clouds */}
            <g className={styles.cloud}>
                <ellipse cx="242" cy="112" rx="34" ry="13" />
                <ellipse cx="268" cy="103" rx="22" ry="11" />
                <ellipse cx="472" cy="140" rx="30" ry="12" />
                <ellipse cx="494" cy="132" rx="20" ry="10" />
            </g>

            {/* sparkles */}
            <g className={styles.sparkle}>
                <path d="M204 176l5 6-5 6-5-6z" />
                <path d="M500 216l5 6-5 6-5-6z" />
                <path d="M178 268l4 5-4 5-4-5z" />
                <path d="M420 116l4 5-4 5-4-5z" />
            </g>

            {/* ---- globe ---------------------------------------------------------- */}
            <g className={styles.globe}>
                <circle cx="350" cy="150" r="82" />
                <ellipse cx="350" cy="150" rx="34" ry="82" />
                <path d="M350 68v164" />
                <path d="M268 150h164" />
                <path d="M283 104c40 20 94 20 134 0" />
                <path d="M283 196c40-20 94-20 134 0" />
            </g>

            {/* wifi arcs inside the globe */}
            <g className={styles.wifi}>
                <path d="M318 143c18-17 46-17 64 0" />
                <path d="M330 157c11-10 29-10 40 0" />
                <circle cx="350" cy="172" r="6" fill="#2f6bed" stroke="none" />
            </g>

            {/* the badge that says it is cut off */}
            <circle cx="410" cy="200" r="23" fill="#2f6bed" />
            <path
                d="M401 191l18 18M419 191l-18 18"
                stroke="#ffffff"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
            />

            {/* ---- house ---------------------------------------------------------- */}
            <g className={styles.house}>
                {/* left tower */}
                <rect x="228" y="248" width="66" height="146" />
                <rect x="246" y="272" width="30" height="46" className={styles.glass} />
                <rect x="246" y="336" width="30" height="34" className={styles.glass} />

                {/* upper right mass */}
                <rect x="294" y="248" width="176" height="70" />
                <rect x="310" y="262" width="144" height="42" className={styles.glass} />

                {/* lower right mass */}
                <rect x="294" y="318" width="112" height="76" />
                <rect x="406" y="330" width="64" height="64" />
                <rect x="418" y="344" width="42" height="34" className={styles.glass} />
                <rect x="452" y="318" width="30" height="22" />

                {/* entrance */}
                <rect x="322" y="336" width="30" height="58" className={styles.door} />
                <circle cx="345" cy="366" r="2.4" className={styles.knob} />
                <rect x="300" y="330" width="16" height="30" className={styles.glass} />
            </g>

            {/* ---- planting ------------------------------------------------------- */}
            {/* right tree — clear of the house corner */}
            <g className={styles.plant}>
                <circle cx="546" cy="296" r="42" />
                <path d="M526 258c11 6 27 4 36-4" />
                <path d="M566 330c-9 6-24 8-35 4" />
                <path d="M546 338v56" />
                <path d="M546 356l-17-15M546 370l19-17" />
            </g>

            {/* left tree */}
            <g className={styles.plant}>
                <path d="M194 394v-78" />
                <path d="M194 320c-19-7-28-27-25-49 19 5 28 25 25 49Z" />
                <path d="M194 344c19-7 28-27 25-49-19 5-28 25-25 49Z" />
                <path d="M194 362c-16-6-23-22-21-40 16 4 23 21 21 40Z" />
            </g>

            {/* shrubs */}
            <g className={styles.plant}>
                <path d="M214 394c0-11 9-20 20-20s20 9 20 20" />
                <path d="M500 394c0-11 9-20 20-20s20 9 20 20" />
                <path d="M578 394c0-9 8-17 18-17s18 8 18 17" />
            </g>

            {/* ground */}
            <path className={styles.ground} d="M176 394h444" />
        </svg>
    );
}

export default function OfflineScreen() {
    const isOnline = useSyncExternalStore(
        subscribeToConnection,
        getIsOnline,
        getIsOnlineOnServer
    );
    const [checking, setChecking] = useState(false);
    const timer = useRef(null);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    /* Reload only once the connection is actually back — reloading while still
       offline would just replace this screen with a browser error page. */
    const handleRetry = () => {
        if (checking) return;
        setChecking(true);
        timer.current = setTimeout(() => {
            if (navigator.onLine) {
                window.location.reload();
            } else {
                setChecking(false);
            }
        }, 900);
    };

    if (isOnline) return null;

    return (
        <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="offlineTitle">
            <div className={styles.container}>
                <OfflineArt />

                <h1 className={styles.title} id="offlineTitle">No Internet Connection</h1>

                <p className={styles.lede}>
                    It looks like you&rsquo;re offline. Please check your internet connection
                    and try again to continue exploring properties.
                </p>

                <button
                    type="button"
                    className={styles.retryBtn}
                    onClick={handleRetry}
                    aria-live="polite"
                >
                    <RiRefreshLine className={checking ? styles.spinning : undefined} aria-hidden="true" />
                    <span>{checking ? "Checking…" : "Try Again"}</span>
                </button>

                <div className={styles.or}>
                    <span className={styles.orRule} />
                    <span className={styles.orWord}>or</span>
                    <span className={styles.orRule} />
                </div>

                <section className={styles.tips}>
                    <h2 className={styles.tipsTitle}>Things you can try:</h2>

                    <ul className={styles.tipsList}>
                        {TIPS.map(({ Icon, text }) => (
                            <li key={text} className={styles.tip}>
                                <span className={styles.tipIcon}>
                                    <Icon aria-hidden="true" />
                                </span>
                                <span className={styles.tipText}>{text}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
