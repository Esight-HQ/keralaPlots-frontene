import Link from "next/link";
import styles from "./noAgents.module.css";
import { RiHome5Line, RiLayoutGridLine, RiUserAddLine } from "react-icons/ri";

/* Scenery artwork: hills, clouds, a house with an empty agent clipboard */
function NoAgentsArt() {
    return (
        <svg
            className={styles.emptyArt}
            viewBox="0 0 720 440"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="nagHills" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f3f5fa" />
                    <stop offset="100%" stopColor="#e9edf6" />
                </linearGradient>
            </defs>

            {/* Backdrop hill */}
            <path
                d="M 60 410 C 180 260 260 210 360 210 C 460 210 540 260 660 410 Z"
                fill="url(#nagHills)"
            />

            {/* Clouds */}
            <g fill="#e3e8f4">
                <circle cx="210" cy="110" r="14" />
                <circle cx="230" cy="100" r="18" />
                <circle cx="250" cy="110" r="13" />
                <rect x="210" y="108" width="40" height="14" rx="7" />

                <circle cx="490" cy="85" r="16" />
                <circle cx="512" cy="74" r="21" />
                <circle cx="534" cy="85" r="15" />
                <rect x="490" y="83" width="44" height="16" rx="8" />
            </g>

            {/* Dotted decorative ring */}
            <circle
                cx="360"
                cy="230"
                r="170"
                fill="none"
                stroke="#dbe1ef"
                strokeWidth="2"
                strokeDasharray="4 8"
            />

            {/* Modern House Wireframe */}
            <g stroke="#9aa6c4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#ffffff">
                {/* Main house body */}
                <polygon points="320,165 425,165 425,300 320,300" fill="#f8fafc" />
                <polygon points="305,175 372,125 440,175" fill="#eef2f9" />

                {/* Second story extension */}
                <polygon points="260,205 320,205 320,300 260,300" fill="#f1f5fb" />
                <polygon points="250,210 290,178 330,210" fill="#e6edf7" />

                {/* Windows */}
                <rect x="340" y="185" width="28" height="32" rx="3" fill="#ffffff" />
                <line x1="354" y1="185" x2="354" y2="217" stroke="#b4bfd6" strokeWidth="1.5" />
                <line x1="340" y1="201" x2="368" y2="201" stroke="#b4bfd6" strokeWidth="1.5" />

                <rect x="380" y="185" width="28" height="32" rx="3" fill="#ffffff" />
                <line x1="394" y1="185" x2="394" y2="217" stroke="#b4bfd6" strokeWidth="1.5" />
                <line x1="380" y1="201" x2="408" y2="201" stroke="#b4bfd6" strokeWidth="1.5" />

                <rect x="275" y="225" width="30" height="26" rx="3" fill="#ffffff" />

                {/* Ground floor door */}
                <rect x="356" y="248" width="32" height="52" rx="2" fill="#e6edf7" />
                <circle cx="382" cy="275" r="2" fill="#64748b" stroke="none" />
            </g>

            {/* Tree */}
            <g stroke="#9aa6c4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="225" y1="315" x2="225" y2="265" />
                <circle cx="225" cy="245" r="22" fill="#edf2fa" />
                <circle cx="212" cy="240" r="14" fill="#e2ebf7" />
            </g>

            {/* Foreground Agent ID Clipboard / Profile Card Artwork */}
            <g filter="drop-shadow(0 14px 28px rgba(15,23,42,0.08))">
                <rect
                    x="375"
                    y="185"
                    width="125"
                    height="160"
                    rx="14"
                    fill="#ffffff"
                    stroke="#12296b"
                    strokeWidth="3.5"
                />

                {/* Clipboard Clip */}
                <rect x="415" y="174" width="45" height="18" rx="5" fill="#12296b" />
                <rect x="427" y="170" width="21" height="8" rx="4" fill="#ffffff" />

                {/* Avatar Icon */}
                <circle cx="437" cy="230" r="18" fill="#e0e9f8" stroke="#12296b" strokeWidth="2.5" />
                <circle cx="437" cy="226" r="6" fill="#12296b" />
                <path
                    d="M 425 242 C 425 236 430 234 437 234 C 444 234 449 236 449 242"
                    fill="#12296b"
                />

                {/* Placeholder Detail Lines */}
                <g fill="#c8d3e6">
                    <rect x="400" y="262" width="75" height="7" rx="3.5" />
                    <rect x="410" y="277" width="55" height="6" rx="3" />
                    <rect x="395" y="298" width="85" height="5" rx="2.5" />
                    <rect x="395" y="310" width="65" height="5" rx="2.5" />
                </g>
            </g>
        </svg>
    );
}

export default function NoAgents({ isAgent = false, isAuthenticated = false, isSearching = false, onBrowseAll }) {
    const registerHref = isAuthenticated ? "/register-agent" : "/login?redirect=/register-agent";

    return (
        <div className={styles.wrap}>
            <NoAgentsArt />

            <h2 className={styles.title}>
                {isSearching
                    ? "No Matching Agents Found"
                    : isAgent
                    ? "No Other Agents Listed"
                    : "No Agents Registered Yet"}
            </h2>

            <p className={styles.lede}>
                {isSearching ? (
                    "No agents matched your current filter criteria. Try searching with different terms or reset your filters."
                ) : isAgent ? (
                    "There are currently no other registered agents in the directory. Your verified profile is active and publicly listed."
                ) : (
                    "We're just getting started! There are no agents registered on our platform yet. Join our network and start growing your real estate business."
                )}
            </p>

            {isSearching ? (
                <button type="button" onClick={onBrowseAll} className={styles.primaryBtn}>
                    <RiLayoutGridLine aria-hidden="true" />
                    <span>Reset Filters &amp; View All</span>
                </button>
            ) : !isAgent ? (
                <Link href={registerHref} className={styles.primaryBtn}>
                    <RiUserAddLine aria-hidden="true" />
                    <span>Register as an Agent</span>
                </Link>
            ) : null}

            {!isSearching && !isAgent && (
                <div className={styles.or}>
                    <span className={styles.orRule} />
                    <span className={styles.orWord}>or</span>
                    <span className={styles.orRule} />
                </div>
            )}

            <p className={styles.altText}>Explore properties or learn more about our services.</p>

            <div className={styles.altActions}>
                <Link href="/properties" className={styles.ghostBtn}>
                    <RiHome5Line aria-hidden="true" />
                    <span>Explore Properties</span>
                </Link>
                <Link href="/services" className={styles.ghostBtn}>
                    <RiLayoutGridLine aria-hidden="true" />
                    <span>Explore Services</span>
                </Link>
            </div>
        </div>
    );
}
