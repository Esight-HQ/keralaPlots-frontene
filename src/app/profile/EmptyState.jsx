"use client";

import styles from "./emptyState.module.css";

/* Empty-state artwork: an open box with a paper plane leaving it. Drawn inline
   in the same spirit as the dashboard's skyline, so it pulls in no asset.

   The box is one rhombus opening — left (162,198), back (250,172),
   right (338,198), front (250,224) — with every flap being an edge of that
   rhombus pushed outward. That is what makes it read as opened, not lidded. */
function EmptyBoxArt() {
    return (
        <svg
            className={styles.art}
            viewBox="0 0 440 300"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* ground */}
            <ellipse cx="250" cy="292" rx="122" ry="11" fill="#eef2fb" />

            {/* clouds */}
            <g fill="#e9effc">
                <circle cx="102" cy="92" r="9" />
                <circle cx="116" cy="85" r="13" />
                <circle cx="131" cy="92" r="8" />
                <rect x="102" y="91" width="29" height="9" rx="4.5" />

                <circle cx="372" cy="176" r="7" />
                <circle cx="383" cy="171" r="10" />
                <circle cx="394" cy="176" r="6" />
                <rect x="372" y="175" width="22" height="7" rx="3.5" />
            </g>

            {/* sparkles */}
            <g fill="#cfdbf7">
                <path
                    d="M0-8c1.1 4.5 2.4 5.8 6.9 6.9C2.4 0 1.1 1.3 0 5.8-1.1 1.3-2.4 0-6.9-1.1-2.4-2.2-1.1-3.5 0-8Z"
                    transform="translate(286 58)"
                />
                <path
                    d="M0-8c1.1 4.5 2.4 5.8 6.9 6.9C2.4 0 1.1 1.3 0 5.8-1.1 1.3-2.4 0-6.9-1.1-2.4-2.2-1.1-3.5 0-8Z"
                    transform="translate(366 226) scale(0.75)"
                />
                <path
                    d="M0-8c1.1 4.5 2.4 5.8 6.9 6.9C2.4 0 1.1 1.3 0 5.8-1.1 1.3-2.4 0-6.9-1.1-2.4-2.2-1.1-3.5 0-8Z"
                    transform="translate(150 150) scale(0.7)"
                />
            </g>

            {/* flight path — rises from the left, curls through a loop that
                crosses itself, then runs out to the plane */}
            <path
                d="M120 246C126 210 138 184 162 174C142 160 148 128 176 128C202 128 210 154 190 168C230 172 266 150 300 108"
                fill="none"
                stroke="#bccbf1"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray="4 10"
            />

            {/* sprig */}
            <path d="M116 290v-36" stroke="#cbd8f5" strokeWidth="2.4" strokeLinecap="round" />
            <g fill="#dbe4f9">
                <ellipse cx="104" cy="264" rx="13" ry="6" transform="rotate(-38 104 264)" />
                <ellipse cx="129" cy="258" rx="11" ry="5.5" transform="rotate(32 129 258)" />
            </g>

            {/* the two back flaps, behind the opening */}
            <path d="M162 198 250 172 216 152 128 178Z" fill="#cbd9f8" />
            <path d="M250 172 338 198 372 178 284 152Z" fill="#d5e0fa" />

            {/* the opening: inner wall around a lighter floor, so the top reads
                as a hole rather than a closed lid */}
            <path d="M162 198 250 172 338 198 250 224Z" fill="#8aa4e6" />
            <path d="M190 200 250 182 310 200 250 218Z" fill="#a8bdee" />

            {/* the two visible faces */}
            <path d="M162 198 250 224v64l-88-26Z" fill="#b9cbf3" />
            <path d="M250 224 338 198v64l-88 26Z" fill="#9db4ea" />

            {/* front flaps, folded down over the top of each face */}
            <path d="M162 198 250 224 226 238 138 212Z" fill="#c9d7f7" />
            <path d="M250 224 338 198l24 14-88 26Z" fill="#c9d7f7" />

            {/* notches */}
            <path d="M188 238l20 6v18l-20-6Z" fill="#a9c0ef" />
            <path d="M292 250l20-6v18l-20 6Z" fill="#8fa8e8" />

            {/* paper plane */}
            <path d="M398 34 312 80l42 10Z" fill="#7d9ce4" />
            <path d="M398 34 354 90l-8 32Z" fill="#3f63c9" />
            <path d="M354 90l-8 32-18-22Z" fill="#5b7fd4" />
        </svg>
    );
}

/**
 * The shared "nothing here yet" card — artwork, a heading, a couple of lines
 * and whatever actions the host panel wants under them.
 *
 * @param {string}   title     - heading, e.g. "No Content Yet"
 * @param {string[]} lines     - body sentences; each is its own line when there
 *                              is room and they reflow into a paragraph when not
 * @param {string}   className - host-supplied spacing; the card brings none of
 *                              its own so each panel can place it
 * @param {Node}     children  - action buttons
 */
export default function EmptyState({ title, lines = [], className = "", children }) {
    return (
        <div className={`${styles.empty} ${className}`}>
            <EmptyBoxArt />

            <h2 className={styles.title}>{title}</h2>

            {/* Spans rather than <br>: they stack as blocks at full width and
                reflow inline when narrow, keeping the sentence space either way. */}
            <p className={styles.desc}>
                {lines.map((line, i) => (
                    <span key={line} className={styles.descLine}>
                        {line}
                        {i < lines.length - 1 ? " " : null}
                    </span>
                ))}
            </p>

            {children && <div className={styles.actions}>{children}</div>}
        </div>
    );
}
