/* Shared display helpers for property and reel cards
   (used by the Saved page and the profile's Saved panel). */

/* "Residential House / Villa", "Residential Land"… -> a short, accurate label */
export function shortPropertyType(rawType, title = "") {
    const t = `${rawType || ""}`.toLowerCase();
    const ti = `${title || ""}`.toLowerCase();
    const has = (w) => t.includes(w);
    if (has("apartment") || has("flat")) return "Apartment";
    if (has("villa") && !has("house")) return "Villa";
    if (has("house") || has("home")) return ti.includes("villa") && !ti.includes("house") ? "Villa" : "House";
    if (has("shop")) return "Shop";
    if (has("office")) return "Office";
    if (has("industrial")) return "Industrial";
    if (has("agricultur") || has("farm")) return "Agricultural Land";
    if (has("commercial") && (has("land") || has("plot"))) return "Commercial Land";
    if (has("building")) return "Building";
    if (has("commercial")) return "Commercial";
    if (has("land") || has("plot")) return "Plot / Land";
    if (/plot|land|cent/.test(ti)) return "Plot / Land";
    return rawType ? String(rawType).replace(/^Residential\s+/i, "") : "Property";
}

/* Area from the API, or pulled from the title/description ("50 cent", "1200 sq ft") */
export function areaFromProperty(item) {
    const a = String(item?.area || "").trim();
    if (a && a !== "N/A" && a !== "1 Sq Ft" && a !== "0") return a;
    const text = `${item?.title || ""} ${item?.description || ""}`;
    const cent = text.match(/(\d+(?:\.\d+)?)\s*cents?\b/i);
    if (cent) return `${cent[1]} Cent`;
    const acre = text.match(/(\d+(?:\.\d+)?)\s*acres?\b/i);
    if (acre) return `${acre[1]} Acre`;
    const sqft = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft)\b/i);
    if (sqft) return `${sqft[1]} Sq Ft`;
    return "";
}

/* Reel captions often hold several lines plus a phone number — show only the
   first meaningful line as the card title. */
export function reelDisplayTitle(caption) {
    const lines = String(caption || "")
        .split(/\r?\n/)
        .map((l) => l.replace(/(\+?91[\s-]?)?\b\d{10}\b/g, "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
    return lines[0] || "Saved reel";
}

/* "20800000" / "2,08,00,000" -> "₹2.08 Cr"; already-formatted text is kept. */
export function formatReelPrice(raw) {
    const text = String(raw || "").trim();
    if (!text || /request/i.test(text)) return "";
    const num = Number(text.replace(/[₹,\s]/g, ""));
    if (!Number.isFinite(num) || num <= 0) return text;
    if (num >= 1e7) return `₹${+(num / 1e7).toFixed(2)} Cr`;
    if (num >= 1e5) return `₹${+(num / 1e5).toFixed(2)} L`;
    return `₹${num.toLocaleString("en-IN")}`;
}

/* 1200 -> "1.2K" */
export function formatCount(n) {
    const v = Number(n) || 0;
    if (v >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
    return String(v);
}

/* Saved-reel API item -> card data */
export function savedReelFromApi(item) {
    return {
        id: item.id || item.reel_id,
        title: item.caption || "Saved reel",
        location: item.location || "Kerala",
        price: item.price || "Price on request",
        thumbnail: item.thumbnail_url,
        videoUrl: item.video_url,
        creator: item.creator?.name || "KeralaPlots User",
        likes: Number(item.stats?.likes || 0),
        saves: Number(item.stats?.saves || 0),
        views: Number(item.stats?.views || 0),
        isLiked: !!item.is_liked,
        isSaved: !!item.is_saved,
    };
}
