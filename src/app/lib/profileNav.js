/*
 * The profile menu, shared by the sidebar (/profile/*) and the account popup in the
 * top nav, so both always show the same links.
 */
import { MdOutlineContacts } from "react-icons/md";
import {
    RiLayoutGridLine,
    RiUserLine,
    RiHome5Line,
    RiHeart3Line,
    RiPriceTag3Line,
    RiFilmLine,
    RiSettings3Line,
    RiQuestionLine,
    RiEqualizerLine,
    RiVipCrownLine,
    RiQuestionAnswerLine,
    RiPaletteLine,
    RiGlobalLine,
} from "react-icons/ri";

export const PROFILE_NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", Icon: RiLayoutGridLine, href: "/profile" },
    { id: "personal", label: "Personal Details", Icon: RiUserLine, href: "/profile/personal-details" },
    { id: "saved", label: "Saved", Icon: RiHeart3Line, href: "/profile/saved-properties" },
    { id: "preferences", label: "My Preferences", Icon: RiEqualizerLine, href: "/profile/preferences" },
    { id: "added", label: "Added Properties", Icon: RiHome5Line, href: "/profile/added-properties" },
    { id: "offers", label: "Property Offers", Icon: RiPriceTag3Line, href: "/profile/offers" },
    { id: "reels", label: "Posted Reels", Icon: RiFilmLine, href: "/profile/posted-reels" },
    { id: "contacted", label: "Contacted Properties", Icon: MdOutlineContacts, href: "/profile/contacted-properties" },
    { id: "enquiries", label: "Enquiries", Icon: RiQuestionAnswerLine, href: "/profile/enquiries" },
    { id: "settings", label: "Account Settings", Icon: RiSettings3Line, href: "/profile/account-settings" },
    { id: "help", label: "Help & Support", Icon: RiQuestionLine, href: "/profile/help" },
];

export const SUBSCRIPTION_ITEM = {
    id: "subscription",
    label: "My Subscription",
    Icon: RiVipCrownLine,
    href: "/agent/subscription",
};

/**
 * Menu sections for the current user.
 * Approved builders get a "Builder Portal" section (editor, public page, enquiries).
 */
export function buildProfileNav({ items = PROFILE_NAV_ITEMS, showSubscription = false, builder = {} } = {}) {
    const main = [...items];

    if (showSubscription && !main.some((i) => i.id === "subscription")) {
        const at = main.findIndex((i) => i.id === "added");
        main.splice(at === -1 ? 1 : at + 1, 0, SUBSCRIPTION_ITEM);
    }

    // Enquiries come from the builder webpage, so only approved builders see them
    if (!builder.isApproved) return [{ id: "main", items: main.filter((i) => i.id !== "enquiries") }];

    // Builder section: Enquiries moves here because they come from the builder webpage
    const enquiries = main.find((i) => i.id === "enquiries");
    const rest = main.filter((i) => i.id !== "enquiries");
    const builderItems = [
        { id: "builder-portal", label: "Builder Portal", Icon: RiPaletteLine, href: "/builder-portal", highlight: true, newTab: true },
        builder.webpageHref && {
            id: "builder-webpage",
            label: "View My Webpage",
            Icon: RiGlobalLine,
            href: builder.webpageHref,
            newTab: true,
        },
        enquiries,
    ].filter(Boolean);

    // Builder section sits right under "Personal Details"
    const split = rest.findIndex((i) => i.id === "personal") + 1 || 1;
    return [
        { id: "main", items: rest.slice(0, split) },
        { id: "builder", title: "Builder Portal", items: builderItems },
        { id: "more", items: rest.slice(split) },
    ];
}

export const isNavItemActive = (href, pathname = "") =>
    href === "/profile" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);
