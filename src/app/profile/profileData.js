/* Everything here is deterministic on purpose. The series are generated from a
   seeded PRNG and the calendar is anchored to a fixed date rather than "today",
   so the server and the client render byte-identical markup — a Math.random()
   or Date.now() here would produce a hydration mismatch. */

export const profileUser = {
    name: "Jismi Jose",
    role: "Agent",
    email: "jismi.jose@email.com",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
};

export const dashboardStats = [
    { id: "favorites", value: 12, label: "Favorites", hint: "Properties & reels saved", tone: "blue" },
    { id: "added", value: 7, label: "Added Properties", hint: "Properties you listed", tone: "green" },
    { id: "contacted", value: 15, label: "Contacted Properties", hint: "Properties you inquired", tone: "amber" },
    /* `value` is a fallback only — the dashboard computes each count from its
       real source so an emptied account reports zero rather than the fixture. */
    { id: "views", value: 36, label: "Property Views", hint: "Across your listings", tone: "purple" },
];

export const trackedProperties = [
    {
        id: "vyttila",
        name: "Luxury\nApartment in Vyttila",
        title: "Luxury Apartment in Vyttila",
        thumb: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=160&auto=format&fit=crop&q=80",
        seed: 11,
        viewsBase: 2950,
    },
    {
        id: "edappally",
        name: "Modern\nVilla in Edappally",
        title: "Modern Villa in Edappally",
        thumb: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=160&auto=format&fit=crop&q=80",
        seed: 27,
        viewsBase: 1850,
    },
    {
        id: "kakkanad",
        name: "Premium\nVilla in Kakkanad",
        title: "Premium Villa in Kakkanad",
        thumb: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=160&auto=format&fit=crop&q=80",
        seed: 43,
        viewsBase: 1250,
    },
];

export const recentlyViewed = [
    {
        id: 1,
        title: "Premium Villa in Kakkanad",
        location: "Kakkand, Kochi, Kerala",
        price: "₹85,00,000",
        spec: "4 BHK Villa",
        badge: "Villa",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&auto=format&fit=crop&q=80",
    },
    {
        id: 2,
        title: "Luxury Apartment in Vyttila",
        location: "Vyttila, Kochi, Kerala",
        price: "₹65,00,000",
        spec: "3 BHK Apartment",
        badge: "Apartment",
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&auto=format&fit=crop&q=80",
    },
    {
        id: 3,
        title: "Modern Villa in Edappally",
        location: "Edappally, Kochi, Kerala",
        price: "₹1,15,00,000",
        spec: "5 BHK Villa",
        badge: "Villa",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&auto=format&fit=crop&q=80",
    },
    {
        id: 4,
        title: "Beach House in Varkala",
        location: "Varkala, Thiruvananthapuram",
        price: "₹1,25,00,000",
        spec: "3 BHK Villa",
        badge: "Villa",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&auto=format&fit=crop&q=80",
    },
    {
        id: 5,
        title: "3 BHK Apartment in Kochi",
        location: "Edappally, Kochi, Kerala",
        price: "₹68,00,000",
        spec: "3 BHK Apartment",
        badge: "Apartment",
        image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=700&auto=format&fit=crop&q=80",
    },
];

export const RANGE_OPTIONS = [
    { id: "7", label: "Last 7 Days" },
    { id: "30", label: "Last 30 Days" },
    { id: "90", label: "Last 90 Days" },
];

/* The chart's last day. Fixed rather than "today" so the axis labels never
   disagree between server and client. */
const SERIES_END = new Date("2025-06-25T00:00:00Z");
const SERIES_LENGTH = 90;

/* mulberry32 — small, fast, and repeatable for a given seed. */
function seededRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildSeries(property) {
    const random = seededRandom(property.seed);
    const points = [];

    for (let i = 0; i < SERIES_LENGTH; i += 1) {
        const day = new Date(SERIES_END);
        day.setUTCDate(day.getUTCDate() - (SERIES_LENGTH - 1 - i));

        /* A slow swell with a gentle secondary wave. Kept low-frequency and
           lightly dithered on purpose — heavy per-day noise turns the curve into
           a saw blade and buries the trend the chart exists to show. */
        const swell = Math.sin(i / 13) * 0.2 + Math.sin(i / 6.5) * 0.05;
        const drift = (i / SERIES_LENGTH) * 0.35;
        const noise = (random() - 0.5) * 0.045;
        const views = Math.max(320, Math.round(property.viewsBase * (1 + swell + drift + noise)));

        /* Calls track views at roughly one per fifty-five, with a little slack so
           the two lines are related without being the same shape. */
        const calls = Math.max(4, Math.round((views / 55) * (0.94 + random() * 0.12)));

        points.push({ date: day, views, calls });
    }

    return points;
}

/* Built once at module load, so switching ranges or properties never
   regenerates (and never changes) the numbers. */
export const propertySeries = Object.fromEntries(
    trackedProperties.map((property) => [property.id, buildSeries(property)])
);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toDate(d) {
    if (!d) return new Date();
    if (d instanceof Date) return d;
    if (typeof d === "string") {
        const parts = d.split("-");
        if (parts.length === 3) {
            return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
        }
        return new Date(d);
    }
    return new Date(d);
}

export const shortDate = (date) => {
    const d = toDate(date);
    return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
};

export const longDate = (date) => {
    const d = toDate(date);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

/* ==========================================================================
   PERSONAL DETAILS
   ========================================================================== */
export const agentProfile = {
    name: "Arun Prasad",
    title: "Villa & Luxury Property Specialist",
    intro:
        "With over 8 years of experience in Kerala's real estate market, Arun specializes in premium villas and luxury homes. He is dedicated to helping clients find properties that match their lifestyle and investment goals.",
    about:
        "Arun Prasad is a trusted real estate advisor specializing in villas, luxury homes, and premium plots across Kochi and surrounding areas. Known for his transparency, market knowledge, and client-first approach, Arun has helped hundreds of families find their dream properties.",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&auto=format&fit=crop&q=80",
    location: "Kochi, Kerala",
    /* Stored as bare counts so the edit form can offer them as options and the
       display can compose the labels — otherwise editing "Properties Sold"
       would leave the About stats saying something different. */
    soldCount: "120+",
    clientsCount: "95+",
    yearsCount: "8+",
    reviewsCount: "120+",
    phone: "+91 9847 654 321",
    email: "arun.prasad@keralaplots.com",
    office: "Kochi, Kerala",
    hours: "Mon - Sat: 9:00 AM - 7:00 PM",
    socials: {
        website: "https://keralaplots.com",
        facebook: "https://facebook.com",
        instagram: "https://instagram.com",
        linkedin: "https://linkedin.com",
    },
};

/* Derived from the profile so editing a highlight updates the About row too. */
export const statsFor = (profile) => {
    const details = profile?.personal_details || profile || {};
    const sold = profile?.soldCount || details?.properties_sold || details?.soldCount || "50+";
    const clients = profile?.clientsCount || details?.happy_clients || details?.clientsCount || "100+";
    const years = profile?.yearsCount || details?.years_experience || details?.yearsCount || "8+";
    const reviews = profile?.reviewsCount || details?.reviews_count || details?.reviewsCount || "120+";

    return [
        { id: "sold", value: sold, label: "Properties Sold" },
        { id: "clients", value: clients, label: "Happy Clients" },
        { id: "years", value: years, label: "Years Experience" },
        { id: "reviews", value: reviews, label: "Reviews" },
    ];
};

/* Composed labels, so the two places they appear can never disagree. */
export const experienceLabel = (profile) => {
    const details = profile?.personal_details || profile || {};
    const years = profile?.yearsCount || details?.years_experience || details?.yearsCount || "8+";
    return `${years} Years Experience`;
};

export const soldLabel = (profile) => {
    const details = profile?.personal_details || profile || {};
    const sold = profile?.soldCount || details?.properties_sold || details?.soldCount || "50+";
    return `${sold} Properties Sold`;
};

export const agentReviews = [
    {
        id: 1,
        name: "Meera Nair",
        rating: 5,
        date: "12 May 2025",
        text: "Arun understood exactly what we wanted and never pushed anything else. We saw four villas and bought the second one we visited.",
    },
    {
        id: 2,
        name: "Rahul Menon",
        rating: 5,
        date: "28 Apr 2025",
        text: "Straightforward about pricing and paperwork from the first call. The documentation was handled without a single delay.",
    },
    {
        id: 3,
        name: "Fathima Hassan",
        rating: 4,
        date: "09 Apr 2025",
        text: "Very knowledgeable about Kakkanad and Vyttila. Took time to explain the plot approvals, which no other agent bothered with.",
    },
];

/* ==========================================================================
   REVIEWS VIEW
   The histogram from the design is the source of truth: the review list is
   generated to match it exactly, so every filter count and the average are
   computed from real entries rather than typed in beside them.
   ========================================================================== */
export const ratingBreakdown = [
    { stars: 5, count: 95 },
    { stars: 4, count: 18 },
    { stars: 3, count: 5 },
    { stars: 2, count: 1 },
    { stars: 1, count: 1 },
];

const REVIEWER_FIRST = [
    "Ramesh", "Anjali", "Thomas", "Meera", "Rahul", "Fathima", "Vivek", "Deepa",
    "Arjun", "Sneha", "Manoj", "Divya", "Sanjay", "Neha", "Praveen", "Lakshmi",
    "Jithin", "Aparna", "Nikhil", "Reshma", "Vinod", "Kavya", "Sujith", "Anu",
];

const REVIEWER_LAST = "SPCNRHVDKMTJLABGY".split("");

const REVIEWER_PLACES = [
    "Kochi, Kerala", "Kakkanad, Kochi", "Vyttila, Kochi", "Edappally, Kochi",
    "Aluva, Ernakulam", "Thrissur, Kerala",
];

const REVIEW_TEXTS = {
    5: [
        "Arun helped us find our dream villa in Kakkanad. He understood our requirements perfectly and showed us the best options. Very professional and responsive throughout the process!",
        "Excellent experience working with Arun. He is knowledgeable, honest and always available to answer our questions. Highly recommend his services!",
        "Straightforward about pricing and paperwork from the first call. The documentation was handled without a single delay.",
        "He never pushed a property that did not fit our budget. That alone made the whole search far less stressful.",
        "Knows the Kochi market inside out. Found us a plot with clear title in under three weeks.",
    ],
    4: [
        "Good service and helpful guidance. Arun was patient and helped us close the deal smoothly. Overall a very good experience.",
        "Very knowledgeable about Kakkanad and Vyttila. Took time to explain the plot approvals, which no other agent bothered with.",
        "Smooth process overall. A couple of site visits were rescheduled, but he kept us informed each time.",
    ],
    3: [
        "Decent experience. The property matched the listing, though replies were slower than we expected during the final week.",
        "Helpful with the search itself. We handled most of the bank paperwork ourselves.",
    ],
    2: [
        "The listing details were not fully up to date when we visited, which cost us a trip.",
    ],
    1: [
        "We could not get a straight answer on the pending approvals and eventually walked away.",
    ],
};

/* Fixed anchor rather than "today", so the dates are identical on server and
   client and cannot cause a hydration mismatch. */
const REVIEW_ANCHOR = new Date("2024-05-12T00:00:00Z");

function reviewRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildReviews() {
    const random = reviewRandom(7);
    const rows = [];
    let index = 0;

    /* Interleave the ratings rather than emitting all fives first, so an
       unfiltered "latest first" list looks like a real feed. */
    const pool = ratingBreakdown.flatMap(({ stars, count }) =>
        Array.from({ length: count }, () => stars)
    );
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    pool.forEach((stars) => {
        const first = REVIEWER_FIRST[Math.floor(random() * REVIEWER_FIRST.length)];
        const last = REVIEWER_LAST[Math.floor(random() * REVIEWER_LAST.length)];
        const texts = REVIEW_TEXTS[stars];

        const date = new Date(REVIEW_ANCHOR);
        date.setUTCDate(date.getUTCDate() - index * 3 - Math.floor(random() * 3));

        rows.push({
            id: `rv-${index + 1}`,
            name: `${first} ${last}.`,
            place: REVIEWER_PLACES[Math.floor(random() * REVIEWER_PLACES.length)],
            rating: stars,
            date,
            text: texts[Math.floor(random() * texts.length)],
        });
        index += 1;
    });

    return rows;
}

/* Built once at module load so filtering and sorting never regenerate it. */
export const allAgentReviews = buildReviews();

export const REVIEW_SORTS = [
    { id: "latest", label: "Latest First" },
    { id: "oldest", label: "Oldest First" },
    { id: "highest", label: "Highest Rated" },
    { id: "lowest", label: "Lowest Rated" },
];

export const reviewDate = (date) =>
    `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;

/* ==========================================================================
   EDIT FORM OPTIONS
   ========================================================================== */
export const EXPERIENCE_OPTIONS = [
    "1+ Years Experience", "2+ Years Experience", "3+ Years Experience",
    "5+ Years Experience", "8+ Years Experience", "10+ Years Experience",
    "15+ Years Experience", "20+ Years Experience",
];

export const DESIGNATION_OPTIONS = [
    "Villa & Luxury Property Specialist",
    "Residential Property Advisor",
    "Commercial Property Consultant",
    "Plot & Land Specialist",
    "Investment Advisor",
    "Rental Specialist",
];

export const WORKING_HOURS_OPTIONS = [
    "Mon - Sat: 9:00 AM - 7:00 PM",
    "Mon - Fri: 9:00 AM - 6:00 PM",
    "Mon - Sat: 10:00 AM - 8:00 PM",
    "All days: 9:00 AM - 9:00 PM",
    "By appointment only",
];

export const COUNT_OPTIONS = ["10+", "25+", "50+", "75+", "95+", "120+", "150+", "200+"];

export const YEARS_OPTIONS = ["1+", "2+", "3+", "5+", "8+", "10+", "15+", "20+"];

export const BIO_MAX = 300;
