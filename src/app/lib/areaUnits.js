// Land area units offered wherever a property's land / plot area is entered.
// `value` is what gets saved (details.landAreaUnit); `label` is what users see.
export const LAND_AREA_UNITS = [
    { value: "cent", label: "Cent" },
    { value: "acre", label: "Acre" },
    { value: "sqft", label: "Sq.ft" },
    { value: "sqm", label: "Sq.m" },
    { value: "sqyd", label: "Sq.yd" },
    { value: "are", label: "Are" },
    { value: "hectare", label: "Hectare" },
];

export const DEFAULT_LAND_AREA_UNIT = "cent";

// Label for a saved unit value; falls back to "Cent" for older listings saved before units existed.
export function landAreaUnitLabel(unit) {
    const key = String(unit || "").toLowerCase().replace(/[\s._]/g, "");
    const match = LAND_AREA_UNITS.find((u) => u.value === key || u.label.toLowerCase().replace(/\./g, "") === key);
    return match ? match.label : "Cent";
}

// "12.5 Cent", "2 Acre" … or "" when there's no figure.
export function formatLandArea(amount, unit) {
    if (amount === undefined || amount === null || String(amount).trim() === "") return "";
    return `${amount} ${landAreaUnitLabel(unit)}`;
}
