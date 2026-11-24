"use client";

import { useState } from "react";
import styles from "./profile.module.css";
import { shortDate, longDate } from "./profileData";

/* Two series on two scales: views on the left axis, calls on the right. Drawn as
   SVG rather than pulling in a charting library — the shape needed here is a
   smooth area, a crosshair and a tooltip, all of which are cheaper to own than
   to configure. */

const VIEW_BOX = { width: 820, height: 250 };
const PAD = { top: 18, right: 8, bottom: 28, left: 8 };

const plotWidth = VIEW_BOX.width - PAD.left - PAD.right;
const plotHeight = VIEW_BOX.height - PAD.top - PAD.bottom;

/* Catmull-Rom through the points, converted to cubic beziers. Keeps the curve
   passing through every reading instead of smoothing them away. */
function smoothPath(points) {
    if (points.length === 0) return "";
    if (points.length < 3) return points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

    let d = `M${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
}

/* A round number above the highest reading, so the axis ends on a sensible
   label rather than mid-air. */
function niceCeiling(value, step) {
    return Math.max(step, Math.ceil(value / step) * step);
}

export default function ActivityChart({ data }) {
    const [hover, setHover] = useState(null);

    if (data.length === 0) {
        return (
            <div className={styles.chartEmpty}>
                Select a property to see its views and calls.
            </div>
        );
    }

    const viewsMax = niceCeiling(Math.max(...data.map((d) => d.views)), 1000);
    const callsMax = niceCeiling(Math.max(...data.map((d) => d.calls)), 20);

    const xAt = (index) =>
        PAD.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    const yViews = (value) => PAD.top + plotHeight - (value / viewsMax) * plotHeight;
    const yCalls = (value) => PAD.top + plotHeight - (value / callsMax) * plotHeight;

    const viewPoints = data.map((d, i) => ({ x: xAt(i), y: yViews(d.views) }));
    const callPoints = data.map((d, i) => ({ x: xAt(i), y: yCalls(d.calls) }));

    const viewsLine = smoothPath(viewPoints);
    const callsLine = smoothPath(callPoints);
    const baseline = PAD.top + plotHeight;
    const areaOf = (line, points) =>
        `${line} L${points[points.length - 1].x} ${baseline} L${points[0].x} ${baseline} Z`;

    const gridValues = Array.from({ length: 6 }, (_, i) => (viewsMax / 5) * i);

    /* Whole weeks, counted back from the last day, so the final label always
       sits on the end of the range instead of floating short of it. */
    const labelStep = data.length >= 60 ? 14 : data.length >= 14 ? 7 : 1;
    const xLabels = [];
    for (let i = data.length - 1; i >= 0; i -= labelStep) {
        xLabels.unshift({ i, date: data[i].date });
    }

    const pickIndex = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        const raw = Math.round(ratio * (data.length - 1));
        return Math.min(data.length - 1, Math.max(0, raw));
    };

    const active = hover === null ? null : data[hover];

    return (
        <div className={styles.chartWrap}>
            <div className={styles.chartLegend}>
                <span><i className={styles.legendViews} />Views</span>
                <span><i className={styles.legendCalls} />Calls</span>
            </div>

            <div className={styles.chartAxisLeft}>
                {[...gridValues].reverse().map((value) => (
                    <span key={value}>{Math.round(value).toLocaleString("en-IN")}</span>
                ))}
            </div>

            <div className={styles.chartAxisRight}>
                {Array.from({ length: 6 }, (_, i) => Math.round((callsMax / 5) * (5 - i))).map((value, i) => (
                    <span key={`${value}-${i}`}>{value}</span>
                ))}
            </div>

            <div className={styles.chartPlot}>
                <svg
                    viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
                    className={styles.chartSvg}
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={`Views and calls over the last ${data.length} days`}
                >
                    <defs>
                        <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.20" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    <g className={styles.chartGrid}>
                        {gridValues.map((value) => (
                            <line key={value} x1={PAD.left} x2={PAD.left + plotWidth} y1={yViews(value)} y2={yViews(value)} />
                        ))}
                    </g>

                    <path d={areaOf(viewsLine, viewPoints)} fill="url(#viewsFill)" />
                    <path d={areaOf(callsLine, callPoints)} fill="url(#callsFill)" />
                    <path d={viewsLine} className={styles.chartLineViews} />
                    <path d={callsLine} className={styles.chartLineCalls} />

                    {hover !== null && (
                        <g>
                            <line
                                className={styles.chartCrosshair}
                                x1={xAt(hover)}
                                x2={xAt(hover)}
                                y1={PAD.top}
                                y2={baseline}
                            />
                            <circle className={styles.chartDotViews} cx={xAt(hover)} cy={yViews(data[hover].views)} r="5" />
                            <circle className={styles.chartDotCalls} cx={xAt(hover)} cy={yCalls(data[hover].calls)} r="5" />
                        </g>
                    )}
                </svg>

                {/* A transparent surface for pointer tracking, so hover works
                    anywhere in the plot and not only exactly on the line. */}
                <div
                    className={styles.chartHitArea}
                    onMouseMove={(event) => setHover(pickIndex(event))}
                    onMouseLeave={() => setHover(null)}
                />

                {active && (
                    <div
                        className={styles.chartTooltip}
                        style={{
                            left: `${((xAt(hover) - PAD.left) / plotWidth) * 100}%`,
                            /* Flips side near the right edge so it stays on screen. */
                            transform: hover > data.length * 0.7 ? "translateX(-108%)" : "translateX(8%)",
                        }}
                    >
                        <span className={styles.tooltipDate}>{longDate(active.date)}</span>
                        <span className={styles.tooltipRow}>
                            <i className={styles.legendViews} />
                            Views
                            <strong>{active.views.toLocaleString("en-IN")}</strong>
                        </span>
                        <span className={styles.tooltipRow}>
                            <i className={styles.legendCalls} />
                            Calls
                            <strong>{active.calls}</strong>
                        </span>
                    </div>
                )}
            </div>

            <div className={styles.chartAxisX}>
                {xLabels.map(({ i, date }) => (
                    <span
                        key={i}
                        className={hover === i ? styles.axisLabelActive : undefined}
                        style={{ left: `${((xAt(i) - PAD.left) / plotWidth) * 100}%` }}
                    >
                        {shortDate(date)}
                    </span>
                ))}
            </div>
        </div>
    );
}
