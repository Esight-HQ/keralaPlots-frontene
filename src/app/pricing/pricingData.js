// Single source of truth for the listing packages.
// `id` is passed to /post-property as ?package=<id>.

export const PACKAGES = [
    {
        id: "basic",
        name: "Basic",
        price: 300,
        days: 30,
        tagline: "Simple property listing for owners.",
        features: [
            "Property listing",
            "Property photos",
            "Property details",
            "Location & map",
            "Contact/enquiry option",
            "Listing ID",
            "Dashboard management",
            "30-day validity",
        ],
        cta: "Choose Basic",
    },
    {
        id: "featured",
        name: "Featured",
        price: 750,
        days: 60,
        tagline: "Get increased visibility for your property.",
        recommended: true,
        features: [
            "Everything in Basic",
            "Featured badge",
            "Higher search visibility",
            "Category placement",
            "Location placement",
            "60-day validity",
        ],
        cta: "Choose Featured",
    },
    {
        id: "premium",
        name: "Premium",
        price: 1500,
        days: 90,
        tagline: "Get priority exposure across KeralaPlots.",
        features: [
            "Everything in Featured",
            "Premium badge",
            "Priority search placement",
            "Homepage exposure",
            "Category priority",
            "Location priority",
            "90-day validity",
        ],
        cta: "Choose Premium",
    },
    {
        id: "premium-plus",
        name: "Premium Plus",
        price: 3000,
        days: 120,
        tagline: "Maximum promotional exposure.",
        features: [
            "Everything in Premium",
            "Homepage promotional placement",
            "Location spotlight",
            "Category spotlight",
            "Priority exposure",
            "Priority lead notification",
            "Promotional support",
            "120-day validity",
        ],
        cta: "Choose Premium Plus",
    },
];

// Comparison matrix — one boolean per package, in PACKAGES order.
export const COMPARISON = [
    { feature: "Listing", values: [true, true, true, true] },
    { feature: "Photos", values: [true, true, true, true] },
    { feature: "Map", values: [true, true, true, true] },
    { feature: "Enquiries", values: [true, true, true, true] },
    { feature: "Featured Badge", values: [false, true, true, true] },
    { feature: "Higher Visibility", values: [false, true, true, true] },
    { feature: "Category Priority", values: [false, true, true, true] },
    { feature: "Location Priority", values: [false, true, true, true] },
    { feature: "Premium Badge", values: [false, false, true, true] },
    { feature: "Homepage Exposure", values: [false, false, true, true] },
    { feature: "Priority Search", values: [false, false, true, true] },
    { feature: "Location Spotlight", values: [false, false, false, true] },
    { feature: "Promotional Support", values: [false, false, false, true] },
];

export const formatINR = (n) => `₹${n.toLocaleString("en-IN")}`;

/* ==========================================================================
   AGENT PLANS
   ========================================================================== */

// Yearly billing discount, as a percentage off 12 × the monthly price.
// ⚠️ Placeholder — set this to the discount the business actually offers.
// A plan can override it with its own `yearlyDiscount`.
export const YEARLY_DISCOUNT = 20;

export const AGENT_PLANS = [
    {
        id: "starter",
        name: "Starter Agent",
        shortName: "Starter",
        monthly: 999,
        pill: "10 listings",
        tagline: "For individual agents getting started.",
        features: [
            "10 active property listings",
            "10 listing credits / month",
            "Agent profile",
            "Agent contact information",
            "Property photo uploads",
            "Property location & map",
            "Enquiry management",
            "Agent dashboard",
            "Listing analytics",
            "WhatsApp enquiry button",
            "Basic search visibility",
        ],
        cta: "Choose Starter",
    },
    {
        id: "professional",
        name: "Professional Agent",
        shortName: "Professional",
        monthly: 2499,
        pill: "30 listings",
        tagline: "For active real estate agents.",
        recommended: true,
        badge: "Most Popular",
        features: [
            "30 active property listings",
            "30 listing credits / month",
            "Professional agent profile",
            "Featured agent badge",
            "Higher listing visibility",
            "Priority search placement",
            "Enquiry management",
            "WhatsApp enquiries",
            "Listing analytics",
            "Agent dashboard",
            "Property performance reports",
            "Listing renewal management",
        ],
        cta: "Choose Professional",
    },
    {
        id: "business",
        name: "Business Agent",
        shortName: "Business",
        monthly: 4999,
        pill: "75 listings",
        tagline: "For agencies and high-volume agents.",
        features: [
            "75 active property listings",
            "75 listing credits / month",
            "Premium agent profile",
            "Verified agent badge",
            "Priority search visibility",
            "Featured property opportunities",
            "Agency branding",
            "Advanced analytics",
            "Lead management",
            "WhatsApp enquiries",
            "Property performance reports",
            "Listing management dashboard",
            "CRM Software"
        ],
        cta: "Choose Business",
    },
    {
        id: "agency-pro",
        name: "Agency Pro",
        shortName: "Agency Pro",
        monthly: 9999,
        pill: "200 listings",
        tagline: "For established real estate agencies.",
        features: [
            "200 active property listings",
            "200 listing credits / month",
            "Premium agency profile",
            "Verified agency badge",
            "Maximum listing visibility",
            "Priority property placement",
            "Homepage promotional opportunities",
            "Agency branding",
            "Advanced lead management",
            "Advanced analytics",
            "Team member access",
            "Multiple agent management",
            "AI Assisted CRM Software",
            "Dedicated support",
        ],
        cta: "Choose Agency Pro",
    },
];

// Values: true = ✓, false = —, string/number = shown as text.
export const AGENT_COMPARISON = [
    { feature: "Monthly Price", values: ["₹999", "₹2,499", "₹4,999", "₹9,999"] },
    { feature: "Active Listings", values: [10, 30, 75, 200] },
    { feature: "Listing Credits", values: [10, 30, 75, 200] },
    { feature: "Agent Profile", values: [true, true, true, true] },
    { feature: "WhatsApp Enquiries", values: [true, true, true, true] },
    { feature: "Dashboard", values: [true, true, true, true] },
    { feature: "Analytics", values: ["Basic", "Advanced", "Advanced", "Advanced"] },
    { feature: "Featured Agent Badge", values: [false, true, true, true] },
    { feature: "Verified Badge", values: [false, false, true, true] },
    { feature: "Priority Search", values: [false, true, true, true] },
    { feature: "Lead Management", values: [false, true, true, true] },
    { feature: "Agency Branding", values: [false, false, true, true] },
    { feature: "Team Members", values: [false, false, false, true] },
    { feature: "Multiple Agents", values: [false, false, false, true] },
    { feature: "CRM Software", values: [false, false, true, true] },
    { feature: "Promotional Opportunities", values: [false, false, true, true] },
    { feature: "Dedicated Support", values: [false, false, false, true] },
];

// Yearly price for a plan: 12 months minus the discount, rounded to the rupee.
export const yearlyPrice = (plan) => {
    const pct = plan.yearlyDiscount ?? YEARLY_DISCOUNT;
    return Math.round(plan.monthly * 12 * (1 - pct / 100));
};

export const yearlyDiscountOf = (plan) => plan.yearlyDiscount ?? YEARLY_DISCOUNT;

export const maxYearlyDiscount = () =>
    Math.max(...AGENT_PLANS.map(yearlyDiscountOf));

/* --------------------------------------------------------------------------
   Builder / developer plans
   ⚠️ Placeholder prices and limits — set these to what the business actually offers.
   Same shape as AGENT_PLANS (monthly price + yearly discount), so the same
   card and billing toggle are reused.
   -------------------------------------------------------------------------- */
export const BUILDER_PLANS = [
    {
        id: "builder-starter",
        name: "Builder Starter",
        shortName: "Starter",
        monthly: 4999,
        pill: "1 project",
        tagline: "For small builders launching their first project online.",
        features: [
            "Verified builder webpage",
            "1 active project",
            "Up to 10 floor plans / units",
            "3 webpage templates",
            "Project photos, specs & location map",
            "Site-visit & enquiry forms",
            "Enquiries dashboard",
            "Call & WhatsApp buttons",
            "Builder directory listing",
        ],
        cta: "Choose Starter",
    },
    {
        id: "builder-growth",
        name: "Builder Growth",
        shortName: "Growth",
        monthly: 9999,
        pill: "5 projects",
        tagline: "For growing developers with several live projects.",
        recommended: true,
        badge: "Most Popular",
        features: [
            "Everything in Starter",
            "5 active projects",
            "Unlimited floor plans / units",
            "Featured builder badge",
            "Priority placement in Builders directory",
            "Enquiry status tracking & notes",
            "Export enquiries to CSV",
            "Webpage visit & enquiry analytics",
            "Featured project slots in search",
        ],
        cta: "Choose Growth",
    },
    {
        id: "builder-enterprise",
        name: "Builder Enterprise",
        shortName: "Enterprise",
        monthly: 19999,
        pill: "Unlimited",
        tagline: "For established developers and large builder groups.",
        features: [
            "Everything in Growth",
            "Unlimited active projects",
            "Homepage promotional slots",
            "Video & reels spotlight for projects",
            "Multiple team logins",
            "Lead management & CRM",
            "Advanced analytics & reports",
            "Dedicated account manager",
        ],
        cta: "Choose Enterprise",
    },
];

export const BUILDER_COMPARISON = [
    { feature: "Monthly Price", values: ["₹4,999", "₹9,999", "₹19,999"] },
    { feature: "Active Projects", values: [1, 5, "Unlimited"] },
    { feature: "Floor Plans / Units", values: ["10", "Unlimited", "Unlimited"] },
    { feature: "Builder Webpage", values: [true, true, true] },
    { feature: "Webpage Templates", values: [3, 3, 3] },
    { feature: "Enquiry Forms & Dashboard", values: [true, true, true] },
    { feature: "Verified Builder Badge", values: [true, true, true] },
    { feature: "Featured Builder Badge", values: [false, true, true] },
    { feature: "Directory Placement", values: ["Standard", "Priority", "Top"] },
    { feature: "Enquiry Tracking & CSV Export", values: [false, true, true] },
    { feature: "Analytics", values: [false, "Standard", "Advanced"] },
    { feature: "Featured Project Slots", values: [false, true, true] },
    { feature: "Homepage Promotion", values: [false, false, true] },
    { feature: "Video & Reels Spotlight", values: [false, false, true] },
    { feature: "Team Logins", values: [false, false, true] },
    { feature: "Lead Management / CRM", values: [false, false, true] },
    { feature: "Dedicated Account Manager", values: [false, false, true] },
];
