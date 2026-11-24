import { landAreaUnitLabel } from "./areaUnits";

/*
 * Builds a short, scannable summary of a listing from its own data.
 *
 * It only restates what the listing actually contains — no invented
 * defaults (the detail page falls back to "East" / "Brand New" for display,
 * but a summary must never state those as fact). Anything important that is
 * missing is surfaced under "Worth confirming" instead.
 */

const EMPTY = new Set(["", "n/a", "na", "-", "—", "null", "undefined", "0", "none", "not specified"]);

const clean = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/\s+/g, " ").trim();
    return EMPTY.has(s.toLowerCase()) ? "" : s;
};

const formatNumber = (n) => {
    const num = Number(String(n).replace(/,/g, ""));
    return Number.isFinite(num) ? num.toLocaleString("en-IN") : String(n);
};

// "Thiruvananthapuram.This property" -> "Thiruvananthapuram. This property"
const tidyProse = (text) =>
    clean(text)
        .replace(/([a-z0-9)])\.([A-Z])/g, "$1. $2")
        .replace(/\s+([,.!?])/g, "$1");

// Splits on sentence ends only — a full stop followed by a space (or the end).
// Decimals like "8.75" and abbreviations like "sq.ft" stay intact.
const splitSentences = (text) =>
    tidyProse(text)
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);

// First one or two sentences, capped so the popup stays short.
const shortOverview = (description, maxChars = 240) => {
    const sentences = splitSentences(description);
    if (!sentences.length) return "";
    let out = sentences[0];
    if (sentences[1] && out.length + sentences[1].length + 1 <= maxChars) out += ` ${sentences[1]}`;
    if (out.length > maxChars) {
        out = out.slice(0, maxChars);
        out = `${out.slice(0, out.lastIndexOf(" ")).replace(/[,;:\s]+$/, "")}…`;
    }
    return out;
};

// Selling points a buyer cares about, spotted in the free-text description.
const DESCRIPTION_SIGNALS = [
    { re: /\bmain road\b|\bmain-road\b|road frontage|road facing/i, text: "Main-road frontage" },
    { re: /\bcorner plot\b/i, text: "Corner plot" },
    { re: /\bready to move\b|ready-to-move/i, text: "Ready to move in" },
    { re: /\bgated\b/i, text: "Gated community" },
    { re: /\bvastu\b/i, text: "Vastu compliant" },
    { re: /\bclear title\b|\bclean title\b/i, text: "Clear title" },
    { re: /\bfurnished\b/i, text: "Furnished" },
    { re: /\bredevelop/i, text: "Redevelopment potential" },
    { re: /\binvestment\b/i, text: "Good investment potential" },
    { re: /\b(car|vehicle) access\b|\bcar reachable\b/i, text: "Vehicle access" },
    { re: /\bwater (source|supply|connection)\b|\bwell\b/i, text: "Water available" },
];

// "near X Junction and Y College" -> ["X Junction", "Y College"]
const extractLandmarks = (description) => {
    const text = tidyProse(description);
    const found = [];
    const re = /\bnear(?:by)?\s+(?:the\s+)?([A-Z][\w'.-]*(?:\s+(?:[A-Z][\w'.-]*|of|and))*)/g;
    let m;
    while ((m = re.exec(text)) && found.length < 3) {
        m[1]
            .split(/\s+and\s+/)
            .map((s) => s.replace(/\s+(of|and)$/, "").trim())
            .filter((s) => s.length > 2 && !/^(The|This|It)$/.test(s))
            .forEach((s) => {
                if (!found.some((f) => f.toLowerCase() === s.toLowerCase())) found.push(s);
            });
    }
    return found.slice(0, 3);
};

const typeKind = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("plot") || t.includes("land")) return "plot";
    if (t.includes("commercial") || t.includes("office") || t.includes("warehouse") || t.includes("shop")) return "commercial";
    if (t.includes("apartment") || t.includes("flat")) return "apartment";
    if (t.includes("villa")) return "villa";
    if (t.includes("house") || t.includes("home")) return "house";
    return "other";
};

const purposeLabel = (action) =>
    action === "lease" ? "for lease" : action === "rent" ? "for rent" : "for sale";

export function buildPropertySummary(property) {
    if (!property) return null;

    const d = property.details || {};
    const loc = property.location || {};
    const kind = typeKind(property.type);
    const type = clean(property.type) || "Property";
    const purpose = purposeLabel(property.action);

    const place = [clean(loc.locality), clean(loc.district || loc.city)].filter(Boolean);
    const placeText = place.length
        ? [...new Set(place)].join(", ")
        : clean(loc.address || loc.fullAddress).split(",").slice(0, 2).join(",").trim();

    const price = clean(property.price);
    const priceKnown = price && !/on request/i.test(price);
    const negotiable = (property.pricingDetails || []).find((p) => p?.label === "Negotiable")?.value === "Yes";

    const builtUp = clean(d.builtupArea);
    const plot = clean(d.plotArea);
    // Many titles carry the land size ("Prime 8.75 Cent ...") even when the
    // plot-area field was left empty — that's still the listing's own data.
    const titleArea = (clean(property.title).match(/(\d+(?:\.\d+)?)\s*(cents?|acres?)\b/i) || []);
    const plotText = plot
        ? `${formatNumber(plot)} ${landAreaUnitLabel(d.landAreaUnit)}`
        : titleArea[1]
            ? `${titleArea[1]} ${/^acre/i.test(titleArea[2]) ? "Acre" : "Cent"}`
            : "";
    const builtText = builtUp ? `${formatNumber(builtUp)} sq ft` : "";
    const beds = clean(d.bedrooms);
    const baths = clean(d.bathrooms);
    const parking = clean(d.carParking);
    const facing = clean(d.facing);
    const age = clean(d.propertyAge);
    const subType = clean(d.commercialSubType);
    const furnishing = clean(d.furnishing || d.furnishingStatus);

    // ---- Headline: "3 BHK Villa for sale in Kakkanad, Ernakulam"
    const lead =
        (kind === "house" || kind === "villa" || kind === "apartment") && beds
            ? `${beds} BHK ${type}`
            : kind === "commercial" && subType && subType.toLowerCase() !== type.toLowerCase()
                ? `${type} ${subType.toLowerCase()} space`
                : kind === "plot" && plotText
                    ? `${plotText} ${type.toLowerCase()}`
                    : type;
    const headline = `${lead} ${purpose}${placeText ? ` in ${placeText}` : ""}`;

    // ---- Key facts (only real values)
    const facts = [];
    if (priceKnown) facts.push({ label: "Price", value: negotiable ? `${price} (negotiable)` : price });
    if (kind === "plot") {
        if (plotText) facts.push({ label: "Plot area", value: plotText });
        if (clean(d.roadWidth)) facts.push({ label: "Road width", value: `${clean(d.roadWidth)} ft` });
    } else {
        if (builtText) facts.push({ label: "Built-up area", value: builtText });
        if (plotText) facts.push({ label: "Land", value: plotText });
    }
    if (beds || baths) {
        facts.push({
            label: "Layout",
            value: [beds && `${beds} bed`, baths && `${baths} bath`].filter(Boolean).join(" · "),
        });
    }
    if (parking) facts.push({ label: "Parking", value: `${parking} car${parking === "1" ? "" : "s"}` });
    if (kind === "commercial" && subType) facts.push({ label: "Space type", value: subType });
    if (d.floorNumber) {
        facts.push({ label: "Floor", value: `${d.floorNumber}${d.totalFloors ? ` of ${d.totalFloors}` : ""}` });
    }
    if (furnishing) facts.push({ label: "Furnishing", value: furnishing });
    if (facing) facts.push({ label: "Facing", value: facing });
    if (age) facts.push({ label: "Age", value: age });

    // ---- Highlights: listed features, then signals from the description
    const highlights = [];
    const add = (text) => {
        const t = clean(text);
        if (t && !highlights.some((h) => h.toLowerCase() === t.toLowerCase())) highlights.push(t);
    };
    (property.features || []).forEach((f) => add(typeof f === "string" ? f : f?.label || f?.name));
    const listingText = `${property.title || ""} ${property.description || ""}`;
    DESCRIPTION_SIGNALS.forEach(({ re, text }) => re.test(listingText) && add(text));
    const landmarks = extractLandmarks(`${property.title || ""}. ${property.description || ""}`);
    if (landmarks.length) add(`Close to ${landmarks.join(" & ")}`);
    if (kind === "plot" && d.boundaryWall) add("Boundary wall in place");
    const amenities = (property.amenities || [])
        .map((a) => clean(typeof a === "string" ? a : a?.label || a?.name))
        .filter(Boolean);
    if (amenities.length) {
        add(`Amenities: ${amenities.slice(0, 4).join(", ")}${amenities.length > 4 ? ` +${amenities.length - 4} more` : ""}`);
    }

    // ---- Nearby: closest three with a distance
    const toKm = (dist) => {
        const s = String(dist || "").toLowerCase();
        const n = parseFloat(s);
        if (!Number.isFinite(n)) return Infinity;
        return /\bm\b|meter|metre/.test(s) && !s.includes("km") ? n / 1000 : n;
    };
    const nearby = (property.nearbyPlaces || [])
        .filter((p) => clean(p?.name))
        .map((p) => {
            const raw = clean(p.distance);
            const distance = raw ? (/[a-z]/i.test(raw) ? raw : `${raw} km`) : "";
            return { name: clean(p.name), distance, km: toKm(distance) };
        })
        .sort((a, b) => a.km - b.km)
        .slice(0, 3)
        .map(({ name, distance }) => ({ name, distance }));

    // ---- Worth confirming: gaps a buyer should ask about
    const checks = [];
    if (!priceKnown) checks.push("Price isn't listed — ask the owner for a quote.");
    if (kind === "plot" ? !plotText : !builtText && !plotText) checks.push("Area isn't specified — confirm the exact measurement.");
    if ((kind === "house" || kind === "villa" || kind === "apartment") && !beds) checks.push("Number of bedrooms isn't mentioned.");
    if (!facing && kind !== "apartment") checks.push("Facing direction isn't specified.");
    if (kind !== "plot" && !age) checks.push("Property age isn't mentioned.");
    const photoCount = (property.images || []).length;
    if (photoCount === 0) checks.push("No photos yet — request pictures or a site visit.");

    const overview = shortOverview(property.description);

    return {
        headline,
        overview,
        facts,
        highlights: highlights.slice(0, 6),
        nearby,
        checks: checks.slice(0, 3),
    };
}

// Plain-text version for the "Copy" button (WhatsApp / notes friendly).
export function summaryToText(summary, { title, code } = {}) {
    if (!summary) return "";
    const lines = [];
    if (title) lines.push(title);
    if (code) lines.push(`ID: ${code}`);
    lines.push("", summary.headline);
    if (summary.overview) lines.push(summary.overview);
    if (summary.facts.length) {
        lines.push("", "Key facts:");
        summary.facts.forEach((f) => lines.push(`• ${f.label}: ${f.value}`));
    }
    if (summary.highlights.length) {
        lines.push("", "Highlights:");
        summary.highlights.forEach((h) => lines.push(`• ${h}`));
    }
    if (summary.nearby.length) {
        lines.push("", "Nearby:");
        summary.nearby.forEach((n) => lines.push(`• ${n.name}${n.distance ? ` — ${n.distance}` : ""}`));
    }
    if (summary.checks.length) {
        lines.push("", "Worth confirming:");
        summary.checks.forEach((c) => lines.push(`• ${c}`));
    }
    return lines.join("\n");
}
