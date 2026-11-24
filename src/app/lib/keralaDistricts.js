/* Kerala's 14 districts: shared by the home "Explore by District" cards and the
   /district/[slug] pages.
   - aliases: other spellings / town names listings may use for the district
   - areaKm2 / population: Census of India 2011
   - places: well-known towns & localities, linked to a property search */

import { getDistrictSeoData, getPlaceSeoData } from "./districtSeoContent.js";

const SOFT_HYPHENATED = {
    Thiruvananthapuram: "Thiru­vanan­tha­puram",
    Pathanamthitta: "Pathanam­thitta",
    Malappuram: "Malap­puram",
    Alappuzha: "Alap­puzha",
    Kozhikode: "Kozhi­kode",
    Kasaragod: "Kasara­god",
    Ernakulam: "Erna­kulam",
};

const RAW_DISTRICTS = [
    {
        name: "Thiruvananthapuram",
        caption: "Capital city living",
        short: "TVM",
        aliases: ["trivandrum", "tvm"],
        hq: "Thiruvananthapuram",
        areaKm2: 2192,
        population: 3301427,
        tagline: "Kerala's capital city, home to Technopark",
        about: [
            "Thiruvananthapuram is the capital of Kerala and the seat of the state government. Technopark in Kazhakkoottam, one of India's largest IT parks, and the Vizhinjam international port project keep demand for homes and plots steady.",
            "Beyond the city, Kovalam and Varkala have a strong holiday-home and homestay market, while towns like Neyyattinkara and Attingal offer more affordable land.",
        ],
        highlights: ["State capital & government offices", "Technopark IT corridor", "Vizhinjam international port", "Kovalam & Varkala beaches"],
        places: [
            { name: "Kazhakkoottam", note: "Technopark IT corridor" },
            { name: "Pattom", note: "Central city locality" },
            { name: "Kowdiar", note: "Premium residential area" },
            { name: "Sreekaryam", note: "Near Technopark & CET" },
            { name: "Peroorkada", note: "Quiet residential suburb" },
            { name: "Neyyattinkara", note: "Affordable plots, south" },
            { name: "Attingal", note: "Growing town, north" },
            { name: "Kovalam", note: "Beach & holiday homes" },
            { name: "Varkala", note: "Cliff beach, homestays" },
        ],
        extraFaqs: [
            {
                q: "Which areas in Thiruvananthapuram are good for IT professionals?",
                a: "Kazhakkoottam, Sreekaryam, Kulathoor and Pothencode are close to Technopark, so apartments and houses there are popular with IT professionals and easy to rent out.",
            },
        ],
    },
    {
        name: "Ernakulam",
        caption: "Queen of the Arabian Sea",
        short: "EKM",
        aliases: ["kochi", "cochin", "kakkanad", "aluva"],
        hq: "Kakkanad",
        areaKm2: 3068,
        population: 3282388,
        tagline: "Kochi, Kerala's business and IT hub",
        about: [
            "Ernakulam district includes Kochi, Kerala's commercial capital, with Infopark, SmartCity, the Kochi Metro and Water Metro, Cochin International Airport and the port. It has the state's most active property market.",
            "City apartments are concentrated in Kakkanad, Edappally and Vyttila, while Aluva, Angamaly, Tripunithura and Perumbavoor are popular for villas, independent houses and plots.",
        ],
        highlights: ["Infopark & SmartCity", "Kochi Metro & Water Metro", "Cochin International Airport", "Kerala's busiest property market"],
        places: [
            { name: "Kakkanad", note: "Infopark & district HQ" },
            { name: "Edappally", note: "Lulu Mall, metro access" },
            { name: "Vyttila", note: "Transport hub" },
            { name: "Kaloor", note: "Central Kochi" },
            { name: "Aluva", note: "Near airport & metro" },
            { name: "Tripunithura", note: "Heritage town, metro" },
            { name: "Angamaly", note: "Airport side, plots" },
            { name: "Kalamassery", note: "Industrial & education hub" },
            { name: "Perumbavoor", note: "Affordable houses" },
            { name: "Muvattupuzha", note: "Eastern growth town" },
            { name: "Fort Kochi", note: "Heritage & homestays" },
        ],
        extraFaqs: [
            {
                q: "Which areas in Ernakulam are close to Infopark and the Kochi Metro?",
                a: "Kakkanad is home to Infopark, and areas along the metro line such as Edappally, Palarivattom, Kaloor, Vyttila, Aluva and Tripunithura offer quick access to the rest of the city.",
            },
        ],
    },
    {
        name: "Thrissur",
        caption: "Cultural capital",
        short: "TSR",
        aliases: ["trichur"],
        hq: "Thrissur",
        areaKm2: 3032,
        population: 3121200,
        tagline: "The cultural capital of Kerala",
        about: [
            "Thrissur is known for Thrissur Pooram, the Guruvayur temple and a strong trading and gold business community. NH 544 and the main rail line connect it easily to Kochi and Palakkad.",
            "The district offers a balanced mix of city apartments, independent houses and residential plots, with Guruvayur and Chalakudy also popular for investment.",
        ],
        highlights: ["Cultural capital & Pooram", "Guruvayur temple town", "NH 544 & rail connectivity", "Strong trade & gold business"],
        places: [
            { name: "Thrissur Town", note: "Swaraj Round & city centre" },
            { name: "Guruvayur", note: "Temple town" },
            { name: "Chalakudy", note: "Towards Kochi on NH 544" },
            { name: "Irinjalakuda", note: "Education town" },
            { name: "Kunnamkulam", note: "Trading town" },
            { name: "Kodungallur", note: "Historic coastal town" },
            { name: "Wadakkanchery", note: "Northern suburb" },
            { name: "Ollur", note: "Southern suburb" },
        ],
        extraFaqs: [],
    },
    {
        name: "Kollam",
        caption: "Gateway to the backwaters",
        short: "KLM",
        aliases: ["quilon"],
        hq: "Kollam",
        areaKm2: 2491,
        population: 2635375,
        tagline: "Gateway to the backwaters and Kerala's cashew capital",
        about: [
            "Kollam is one of Kerala's oldest port towns and the centre of the state's cashew industry. Ashtamudi Lake and a long coastline give it plenty of waterfront land.",
            "Good rail connectivity and land prices lower than neighbouring Thiruvananthapuram make Kollam popular with home buyers and investors.",
        ],
        highlights: ["Ashtamudi Lake backwaters", "Cashew industry hub", "Major railway junction", "Affordable land"],
        places: [
            { name: "Kollam City", note: "Port city centre" },
            { name: "Karunagappally", note: "Northern town on NH 66" },
            { name: "Kottarakkara", note: "Inland trading town" },
            { name: "Punalur", note: "Eastern hill town" },
            { name: "Chathannoor", note: "Towards Thiruvananthapuram" },
            { name: "Paravur", note: "Coastal town" },
            { name: "Kundara", note: "Industrial area" },
            { name: "Sasthamcotta", note: "Freshwater lake town" },
        ],
        extraFaqs: [],
    },
    {
        name: "Kottayam",
        caption: "Lakes, letters & latex",
        short: "KTM",
        aliases: [],
        hq: "Kottayam",
        areaKm2: 2208,
        population: 1974551,
        tagline: "Land of letters, lakes and latex",
        about: [
            "Kottayam is known for its high literacy, rubber plantations and Vembanad Lake. Good schools, hospitals and a calm lifestyle attract families and returning NRIs.",
            "Towns like Changanassery and Pala suit everyday living, while Kumarakom draws buyers looking for lakeside holiday homes and resorts.",
        ],
        highlights: ["High literacy & top schools", "Vembanad Lake & Kumarakom", "Rubber plantation belt", "Popular with NRIs"],
        places: [
            { name: "Kottayam Town", note: "District centre" },
            { name: "Changanassery", note: "Education & trade town" },
            { name: "Pala", note: "Plantation town" },
            { name: "Ettumanoor", note: "Temple town, MC Road" },
            { name: "Vaikom", note: "Lakeside town" },
            { name: "Kanjirappally", note: "Eastern hills" },
            { name: "Erattupetta", note: "Gateway to Vagamon" },
            { name: "Kumarakom", note: "Backwater resorts" },
        ],
        extraFaqs: [],
    },
    {
        name: "Alappuzha",
        caption: "Venice of the East",
        short: "ALP",
        aliases: ["alleppey"],
        hq: "Alappuzha",
        areaKm2: 1415,
        population: 2127789,
        tagline: "The Venice of the East",
        about: [
            "Alappuzha is famous for its backwaters, houseboats and the paddy fields of Kuttanad. Waterfront land, homestays and resort properties are in steady demand from the tourism sector.",
            "Towns along NH 66 such as Cherthala, Haripad and Kayamkulam are well suited for everyday living and residential plots.",
        ],
        highlights: ["Backwaters & houseboats", "Tourism & homestay demand", "NH 66 coastal corridor", "Kuttanad paddy belt"],
        places: [
            { name: "Alappuzha Town", note: "Canals & beach" },
            { name: "Cherthala", note: "Northern town on NH 66" },
            { name: "Kayamkulam", note: "Southern trading town" },
            { name: "Haripad", note: "Temple town" },
            { name: "Mavelikkara", note: "Inland residential town" },
            { name: "Chengannur", note: "Rail station for Sabarimala" },
            { name: "Ambalappuzha", note: "Temple town" },
            { name: "Kuttanad", note: "Backwater & paddy land" },
        ],
        extraFaqs: [
            {
                q: "Can I build on paddy land in Kuttanad or other parts of Alappuzha?",
                a: "Land recorded as paddy land or wetland is protected under the Kerala Conservation of Paddy Land and Wetland Act, 2008, and generally cannot be converted or built on without approval. Check the land's status in the village office records and the data bank before buying.",
            },
        ],
    },
    {
        name: "Palakkad",
        caption: "Granary of Kerala",
        short: "PKD",
        aliases: ["palghat"],
        hq: "Palakkad",
        areaKm2: 4482,
        population: 2809934,
        tagline: "The granary of Kerala",
        about: [
            "Palakkad sits at the Palakkad Gap, Kerala's main road and rail link to Coimbatore and Tamil Nadu. It is the largest district by area, with wide paddy fields and farmland.",
            "Larger plots, agricultural land and industrial areas like Kanjikode make it attractive for buyers who want more land for their budget.",
        ],
        highlights: ["Gateway to Coimbatore", "Kanjikode industrial area", "Large plots & farmland", "Shoranur rail junction"],
        places: [
            { name: "Palakkad Town", note: "District centre" },
            { name: "Ottapalam", note: "Residential town" },
            { name: "Shoranur", note: "Major rail junction" },
            { name: "Mannarkkad", note: "Towards Attappadi hills" },
            { name: "Chittur", note: "Border town" },
            { name: "Alathur", note: "Paddy belt town" },
            { name: "Pattambi", note: "Bharathapuzha riverside" },
            { name: "Kanjikode", note: "Industrial area" },
        ],
        extraFaqs: [],
    },
    {
        name: "Pathanamthitta",
        caption: "Hills & holy rivers",
        short: "PTA",
        aliases: [],
        hq: "Pathanamthitta",
        areaKm2: 2637,
        population: 1197412,
        tagline: "Hill country and gateway to Sabarimala",
        about: [
            "Pathanamthitta is a green, hilly district and the gateway to Sabarimala. The Pamba and Achankovil rivers run through it, and much of the district is forest and plantation land.",
            "Thiruvalla, Adoor and Kozhencherry have a large NRI community, which keeps demand for spacious independent houses and residential plots strong.",
        ],
        highlights: ["Gateway to Sabarimala", "Strong NRI community", "Pamba & Achankovil rivers", "Quiet residential towns"],
        places: [
            { name: "Pathanamthitta Town", note: "District centre" },
            { name: "Thiruvalla", note: "Largest town, rail station" },
            { name: "Adoor", note: "Town on MC Road" },
            { name: "Ranni", note: "Riverside town" },
            { name: "Konni", note: "Forest & elephant camp" },
            { name: "Kozhencherry", note: "NRI residential area" },
            { name: "Mallappally", note: "Quiet residential town" },
            { name: "Pandalam", note: "Temple town" },
        ],
        extraFaqs: [],
    },
    {
        name: "Kannur",
        caption: "Land of looms & lores",
        short: "KNR",
        aliases: ["cannanore"],
        hq: "Kannur",
        areaKm2: 2966,
        population: 2523003,
        tagline: "Land of looms and lores",
        about: [
            "Kannur is known for handloom, Theyyam, its beaches and Kannur International Airport at Mattannur. The airport has boosted interest from Gulf NRIs in homes and plots.",
            "Towns like Thalassery, Taliparamba and Payyanur offer affordable plots and independent houses with good road and rail links.",
        ],
        highlights: ["Kannur International Airport", "Beaches & Theyyam", "Handloom heritage", "Affordable plots"],
        places: [
            { name: "Kannur Town", note: "District centre" },
            { name: "Thalassery", note: "Historic coastal town" },
            { name: "Payyanur", note: "Northern town" },
            { name: "Taliparamba", note: "Trading town" },
            { name: "Mattannur", note: "Airport town" },
            { name: "Iritty", note: "Eastern hill town" },
            { name: "Kuthuparamba", note: "Residential town" },
            { name: "Sreekandapuram", note: "Hill-side town" },
        ],
        extraFaqs: [],
    },
    {
        name: "Idukki",
        caption: "Hills & tea gardens",
        short: "IDK",
        aliases: ["thodupuzha", "munnar"],
        hq: "Painavu",
        areaKm2: 4358,
        population: 1108974,
        tagline: "Hills, tea gardens and spice country",
        about: [
            "Idukki is Kerala's mountain district, home to Munnar's tea estates, Thekkady, Vagamon and the Idukki dam. It is the place for plantation land, farm stays and hill-view holiday homes.",
            "Land and building rules are stricter here than in most of Kerala, so buyers should verify title, land type and building permissions carefully before purchase.",
        ],
        highlights: ["Munnar tea estates", "Thekkady & spice plantations", "Holiday homes & resorts", "Stricter land-use rules"],
        places: [
            { name: "Thodupuzha", note: "Largest town" },
            { name: "Munnar", note: "Tea estates & resorts" },
            { name: "Kattappana", note: "Cardamom trading town" },
            { name: "Adimali", note: "On the way to Munnar" },
            { name: "Nedumkandam", note: "High-range town" },
            { name: "Kumily", note: "Thekkady & spices" },
            { name: "Vagamon", note: "Meadows & holiday homes" },
            { name: "Painavu", note: "District HQ" },
        ],
        extraFaqs: [
            {
                q: "Are there special building rules in Munnar and other parts of Idukki?",
                a: "Yes. Parts of Idukki, especially the Munnar region, have extra controls on land use and construction, and a no-objection certificate from the Revenue Department may be needed before building. Confirm the land's status and permissions with the village office before you buy.",
            },
        ],
    },
    {
        name: "Kozhikode",
        caption: "City of spices",
        short: "KKD",
        aliases: ["calicut"],
        hq: "Kozhikode",
        areaKm2: 2344,
        population: 3086293,
        tagline: "City of spices and Malabar's commercial hub",
        about: [
            "Kozhikode is the commercial centre of north Kerala, with a long spice-trade history, the Government Cyberpark, NIT Calicut and IIM Kozhikode.",
            "The city and suburbs such as Ramanattukara, Feroke and Kunnamangalam see strong demand for apartments, villas and commercial space.",
        ],
        highlights: ["Malabar's commercial hub", "IIM & NIT Kozhikode", "Government Cyberpark", "Beaches & food culture"],
        places: [
            { name: "Kozhikode City", note: "Commercial centre" },
            { name: "Ramanattukara", note: "Towards the airport" },
            { name: "Feroke", note: "Southern suburb" },
            { name: "Kunnamangalam", note: "Near NIT & IIM" },
            { name: "Vadakara", note: "Northern town" },
            { name: "Koyilandy", note: "Coastal town" },
            { name: "Mukkam", note: "Eastern town" },
            { name: "Thamarassery", note: "Gateway to Wayanad" },
        ],
        extraFaqs: [],
    },
    {
        name: "Malappuram",
        caption: "Heart of Malabar",
        short: "MLP",
        aliases: [],
        hq: "Malappuram",
        areaKm2: 3550,
        population: 4112920,
        tagline: "Kerala's most populous district",
        about: [
            "Malappuram is Kerala's most populous district, with a large Gulf NRI community and fast-growing towns like Manjeri, Perinthalmanna and Tirur. Calicut International Airport at Karipur is in the district.",
            "Demand is steady for independent houses, residential plots and commercial buildings in the main towns.",
        ],
        highlights: ["Calicut Airport (Karipur)", "Large Gulf NRI community", "Fast-growing towns", "Education & healthcare hubs"],
        places: [
            { name: "Malappuram Town", note: "District centre" },
            { name: "Manjeri", note: "Medical college town" },
            { name: "Perinthalmanna", note: "Healthcare hub" },
            { name: "Tirur", note: "Rail & trading town" },
            { name: "Kottakkal", note: "Ayurveda town" },
            { name: "Ponnani", note: "Coastal town" },
            { name: "Nilambur", note: "Teak & forest town" },
            { name: "Kondotty", note: "Airport town" },
        ],
        extraFaqs: [],
    },
    {
        name: "Wayanad",
        caption: "Green hills & coffee",
        short: "WYD",
        aliases: ["kalpetta"],
        hq: "Kalpetta",
        areaKm2: 2131,
        population: 817420,
        tagline: "Green hills of the Western Ghats",
        about: [
            "Wayanad is a hill district on the Western Ghats, bordering Karnataka and Tamil Nadu, and known for coffee, tea and spice plantations.",
            "It is popular for plantation land, farm houses and resort or homestay projects. Buyers should check slope, zoning and eco-sensitive area rules before purchase.",
        ],
        highlights: ["Coffee & spice plantations", "Resorts & homestays", "Borders Karnataka & Tamil Nadu", "Cool hill climate"],
        places: [
            { name: "Kalpetta", note: "District HQ" },
            { name: "Sulthan Bathery", note: "Largest town" },
            { name: "Mananthavady", note: "Northern town" },
            { name: "Meppadi", note: "Tea estates" },
            { name: "Vythiri", note: "Resorts & homestays" },
            { name: "Pulpally", note: "Plantation town" },
            { name: "Panamaram", note: "Riverside town" },
            { name: "Ambalavayal", note: "Near Edakkal Caves" },
        ],
        extraFaqs: [
            {
                q: "What should I check before buying land in Wayanad?",
                a: "Check whether the land is in an ecologically sensitive or restricted zone, its slope and landslide risk, and whether it is classified as plantation land, since these affect what you can build. The village office and local panchayat can confirm this.",
            },
        ],
    },
    {
        name: "Kasaragod",
        caption: "Land of seven languages",
        short: "KSD",
        aliases: ["kasargod", "kasaragode"],
        hq: "Kasaragod",
        areaKm2: 1992,
        population: 1307375,
        tagline: "Land of seven languages",
        about: [
            "Kasaragod is Kerala's northernmost district, bordering Karnataka, with Bekal Fort and long beaches. Many languages are spoken here, including Malayalam, Kannada, Tulu and Konkani.",
            "Land is affordable compared with the rest of Kerala, and nearness to Mangaluru makes it attractive for plots and independent houses.",
        ],
        highlights: ["Bekal Fort & beaches", "Close to Mangaluru", "Affordable land", "Many languages spoken"],
        places: [
            { name: "Kasaragod Town", note: "District centre" },
            { name: "Kanhangad", note: "Largest town" },
            { name: "Nileshwaram", note: "Riverside town" },
            { name: "Bekal", note: "Fort & beach resorts" },
            { name: "Uppala", note: "Northern town" },
            { name: "Manjeshwaram", note: "Near Mangaluru" },
            { name: "Cheruvathur", note: "Southern town" },
            { name: "Trikaripur", note: "Coastal town" },
        ],
        extraFaqs: [],
    },
];

export const toSlug = (name) => String(name || "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

export const KERALA_DISTRICTS = RAW_DISTRICTS.map((d) => ({
    ...d,
    places: d.places.map((p) => ({ ...p, slug: toSlug(p.name) })),
    slug: toSlug(d.name),
    image: `/districts/${toSlug(d.name)}.avif`,
    label: SOFT_HYPHENATED[d.name] || d.name,
}));

/** Town / area page inside a district, e.g. /district/ernakulam/kakkanad */
export const getPlaceBySlug = (district, placeSlug) =>
    district?.places.find((p) => p.slug === String(placeSlug || "").toLowerCase()) || null;

export const placeHref = (district, place) => `/district/${district.slug}/${place.slug}`;

export const getDistrictBySlug = (slug) => KERALA_DISTRICTS.find((d) => d.slug === String(slug || "").toLowerCase()) || null;

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z]/g, "");

/** Map a district / town name from the API ("Kochi", "Trivandrum") to its district. */
export const districtForKey = (rawKey) => {
    const key = normalize(rawKey);
    if (!key) return null;
    return KERALA_DISTRICTS.find((d) => normalize(d.name) === key || d.aliases.some((a) => normalize(a) === key)) || null;
};

/** The raw district names in the facet list that belong to `district` (e.g. ["Ernakulam", "Kochi"]). */
export const facetKeysFor = (district, facet) =>
    Object.keys(facet || {}).filter((k) => districtForKey(k)?.name === district.name);

/** Property search link for a district (optionally a town inside it). */
export const districtSearchHref = (filterValue, place) => {
    const params = new URLSearchParams({ district: filterValue });
    if (place) params.set("search", place);
    return `/properties?${params.toString()}`;
};

/** District FAQs: returns the 10 comprehensive buying & real estate FAQs for the district. */
export const getDistrictFaqs = (d) => {
    return getDistrictSeoData(d).faqs;
};

/** FAQs for a town / area page: returns the 10 comprehensive buying & real estate FAQs. */
export const getPlaceFaqs = (d, place) => {
    return getPlaceSeoData(d, place).faqs;
};
