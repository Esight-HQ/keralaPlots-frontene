import {
    RiDoorOpenLine,
    RiDropLine,
    RiFlashlightLine,
    RiPaintBrushLine,
    RiLayoutGridLine,
    RiRestaurantLine,
    RiShieldCheckLine,
    RiArrowUpDownLine,
    RiFireLine,
    RiCarLine,
    RiLeafLine,
    RiSunLine,
    RiWifiLine,
    RiTempColdLine,
    RiBuilding2Line,
    RiFileList3Line,
} from "react-icons/ri";

// Keyword → icon, checked in order (first match wins). More specific terms
// (lift, fire, security, parking...) are checked before the broader
// electrical/backup rule so e.g. "Lifts & Power Backup" doesn't fall through
// to the generic power icon just because it also mentions "backup".
const SPEC_ICON_RULES = [
    [/door|window|glaz/i, RiDoorOpenLine],
    [/floor|tile|tiling|marble|granite/i, RiLayoutGridLine],
    [/sanitar|plumb|bath|toilet|cp fitting|water/i, RiDropLine],
    [/paint|finish|plaster|wall/i, RiPaintBrushLine],
    [/kitchen|dining|pantry/i, RiRestaurantLine],
    [/lift|elevator/i, RiArrowUpDownLine],
    [/fire/i, RiFireLine],
    [/security|safety|cctv|access/i, RiShieldCheckLine],
    [/parking|car/i, RiCarLine],
    [/solar|energy/i, RiSunLine],
    [/garden|landscap|green|eco/i, RiLeafLine],
    [/internet|wifi|smart|automation/i, RiWifiLine],
    [/air|hvac|ac\b|cool/i, RiTempColdLine],
    [/electric|wiring|power|switch|backup|generator|inverter/i, RiFlashlightLine],
    [/civil|struct|foundation|rcc|frame|masonry/i, RiBuilding2Line],
];

export const renderSpecIcon = (category) => {
    const match = SPEC_ICON_RULES.find(([re]) => re.test(String(category || "")));
    const Icon = match ? match[1] : RiFileList3Line;
    return <Icon aria-hidden="true" />;
};

// Same keyword ordering as the icon rules, mapped to a real representative
// photo instead. Every URL below was verified to load before being added.
const SPEC_PHOTO_RULES = [
    [/door|window|glaz/i, "https://images.unsplash.com/photo-1691517534724-3732c7621407?w=400&auto=format&fit=crop&q=80"],
    [/floor|tile|tiling|marble|granite/i, "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=400&auto=format&fit=crop&q=80"],
    [/sanitar|plumb|bath|toilet|cp fitting|water/i, "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80"],
    [/paint|finish|plaster|wall/i, "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&auto=format&fit=crop&q=80"],
    [/kitchen|dining|pantry/i, "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop&q=80"],
    [/lift|elevator/i, "https://images.unsplash.com/photo-1735178181188-855a87e83dca?w=400&auto=format&fit=crop&q=80"],
    [/fire/i, "https://images.unsplash.com/photo-1625958936686-a9343dc35b5b?w=400&auto=format&fit=crop&q=80"],
    [/security|safety|cctv|access/i, "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&auto=format&fit=crop&q=80"],
    [/parking|car/i, "https://images.unsplash.com/photo-1545179605-1296651e9d43?w=400&auto=format&fit=crop&q=80"],
    [/solar|energy/i, "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&auto=format&fit=crop&q=80"],
    [/garden|landscap|green|eco/i, "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&auto=format&fit=crop&q=80"],
    [/internet|wifi|smart|automation/i, "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop&q=80"],
    [/air|hvac|ac\b|cool/i, "https://images.unsplash.com/photo-1718203862467-c33159fdc504?w=400&auto=format&fit=crop&q=80"],
    [/electric|wiring|power|switch|backup|generator|inverter/i, "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80"],
    [/civil|struct|foundation|rcc|frame|masonry/i, "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&auto=format&fit=crop&q=80"],
];

const SPEC_PHOTO_FALLBACK = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&auto=format&fit=crop&q=80";

// Representative stock photo for a specification category, used when no
// custom photo has been uploaded for that item.
export const specPhoto = (category) => {
    const match = SPEC_PHOTO_RULES.find(([re]) => re.test(String(category || "")));
    return match ? match[1] : SPEC_PHOTO_FALLBACK;
};

// "a; b; c" or one point per line → ["A", "B", "C"]
export const splitSpecDetails = (details) =>
    String(details || "")
        .split(/;\s*|\n+/)
        .map((part) => part.trim().replace(/[.;]+$/, ""))
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
