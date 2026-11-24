export const STEPS = [
    { id: 1, key: "listingType", label: "Listing Type" },
    { id: 2, key: "propertyType", label: "Property Type" },
    { id: 3, key: "location", label: "Location" },
    { id: 4, key: "details", label: "Property Details" },
    { id: 5, key: "price", label: "Price" },
    { id: 6, key: "media", label: "Photos & Videos" },
    { id: 7, key: "description", label: "Description" },
];

export const LISTING_TYPES = [
    { id: "sell", label: "Sell", desc: "Sell your property to a buyer", emoji: "💰" },
    { id: "rent", label: "Rent", desc: "Rent your property to a tenant", emoji: "🏠" },
    { id: "lease", label: "Lease", desc: "Lease your property long-term", emoji: "📄" },
];

export const PROPERTY_TYPES = [
    { id: "house", label: "House", desc: "Independent house or bungalow", emoji: "🏠" },
    { id: "apartment", label: "Apartment", desc: "Flat within a building", emoji: "🏢" },
    { id: "villa", label: "Villa", desc: "Luxury standalone villa", emoji: "🏡" },
    { id: "plot", label: "Plot / Land", desc: "Vacant residential land", emoji: "🌱" },
    { id: "commercial", label: "Commercial", desc: "Shop, showroom, office or building", emoji: "🏬" },
    { id: "other", label: "Other", desc: "Something else entirely", emoji: "➕" },
];

// Property types that share the "house-like" detail fields (bedrooms, bathrooms, amenities, ...)
export const RESIDENTIAL_TYPES = ["house", "apartment", "villa"];
export const COMMERCIAL_TYPES = ["commercial", "office", "warehouse", "hotel", "other"];

export const AMENITIES = [
    { id: "pool", label: "Swimming Pool" },
    { id: "garden", label: "Garden" },
    { id: "gym", label: "Gym" },
    { id: "lift", label: "Lift" },
    { id: "security", label: "Security" },
    { id: "power_backup", label: "Power Backup" },
    { id: "modular_kitchen", label: "Modular Kitchen" },
    { id: "childrens_park", label: "Children's Park" },
    { id: "club_house", label: "Club House" },
    { id: "cctv", label: "CCTV" },
    { id: "visitor_parking", label: "Visitor Parking" },
    { id: "solar_power", label: "Solar Power" },
];

export const COMMERCIAL_SUBTYPES = ["Office", "Shop", "Warehouse", "Factory", "Restaurant", "Showroom"];

export const DEFAULT_PROPERTY_FEATURES = [
    "Prime Location",
    "Vastu Compliant",
    "Gated Community",
    "24/7 Security",
    "High-quality Construction",
    "Ready to Move",
    "Tar Road Frontage",
    "Compound Wall",
    "Water Connection",
    "Well Water",
    "Clear Title",
    "Corner Property",
    "Drainage System",
    "Street Light",
];

export const NEARBY_PLACE_OPTIONS = ["Schools", "Hospitals", "Metro", "Airport", "Temple", "Mosque", "Shopping Mall"];

export const NEARBY_DISTANCE_OPTIONS = ["0.5 km", "1 km", "2 km", "3 km", "5 km", "10+ km"];
export const DEFAULT_NEARBY_DISTANCE = "1 km";

export const FACING_OPTIONS = ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
export const FURNISHING_OPTIONS = ["Unfurnished", "Semi-Furnished", "Fully Furnished"];
export const OWNERSHIP_OPTIONS = ["Freehold", "Leasehold", "Co-operative Society", "Power of Attorney"];
export const AVAILABILITY_OPTIONS = ["Ready to Move", "Under Construction"];
export const FLOOR_OPTIONS = ["1", "2", "3", "4", "5+"];
export const PROPERTY_AGE_OPTIONS = ["Under Construction", "0-1 Year", "1-5 Years", "5-10 Years", "10-20 Years", "20+ Years"];

export const KERALA_DISTRICTS = [
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki",
    "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod",
];

export const INDIAN_STATES = [
    "Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Maharashtra", "Goa",
    "Gujarat", "Rajasthan", "Madhya Pradesh", "Uttar Pradesh", "Uttarakhand", "Haryana", "Punjab",
    "Himachal Pradesh", "Bihar", "Jharkhand", "West Bengal", "Odisha", "Chhattisgarh", "Assam",
    "Arunachal Pradesh", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Sikkim", "Tripura",
    "Delhi", "Chandigarh", "Puducherry", "Jammu & Kashmir", "Ladakh", "Andaman & Nicobar Islands",
    "Lakshadweep", "Dadra & Nagar Haveli and Daman & Diu",
];

// Well-known localities per Kerala district. Not exhaustive by design — the
// locality picker allows a custom entry for anything not listed here.
export const KERALA_LOCALITIES = {
    Thiruvananthapuram: [
        "Kazhakoottam", "Technopark", "Kowdiar", "Pattom", "Vazhuthacaud", "Sreekariyam",
        "Vattiyoorkavu", "Peroorkada", "Ulloor", "Nedumangad", "Attingal", "Varkala",
        "Neyyattinkara", "Kovalam", "Balaramapuram", "Thampanoor",
    ],
    Kollam: [
        "Kollam Town", "Karunagappally", "Kottarakkara", "Punalur", "Chavara", "Paravur",
        "Kundara", "Anchal", "Chathannoor", "Sasthamcotta",
    ],
    Pathanamthitta: [
        "Pathanamthitta Town", "Adoor", "Thiruvalla", "Pandalam", "Ranni", "Konni",
        "Mallappally", "Kozhencherry", "Aranmula",
    ],
    Alappuzha: [
        "Alappuzha Town", "Cherthala", "Kayamkulam", "Mavelikkara", "Haripad", "Ambalappuzha",
        "Chengannur", "Aroor", "Punnapra",
    ],
    Kottayam: [
        "Kottayam Town", "Changanassery", "Pala", "Ettumanoor", "Vaikom", "Kanjirappally",
        "Kumarakom", "Erattupetta", "Kaduthuruthy",
    ],
    Idukki: [
        "Thodupuzha", "Munnar", "Kattappana", "Nedumkandam", "Thekkady", "Adimali",
        "Painavu", "Vagamon", "Kumily",
    ],
    Ernakulam: [
        "Kakkanad", "Edappally", "Palarivattom", "Vyttila", "Kaloor", "Aluva", "Perumbavoor",
        "Angamaly", "Tripunithura", "Fort Kochi", "Marine Drive", "Thrikkakara", "Kalamassery",
        "Muvattupuzha", "Nedumbassery", "Panampilly Nagar", "Kadavanthra", "Cheranalloor",
    ],
    Thrissur: [
        "Thrissur Town", "Guruvayur", "Chalakudy", "Irinjalakuda", "Kodungallur", "Wadakkanchery",
        "Kunnamkulam", "Ollur", "Mannuthy", "Puthukkad",
    ],
    Palakkad: [
        "Palakkad Town", "Ottapalam", "Shoranur", "Chittur", "Mannarkkad", "Alathur",
        "Pattambi", "Nenmara", "Kollengode",
    ],
    Malappuram: [
        "Malappuram Town", "Manjeri", "Perinthalmanna", "Tirur", "Ponnani", "Kottakkal",
        "Nilambur", "Edappal", "Valanchery", "Tanur",
    ],
    Kozhikode: [
        "Kozhikode City", "Kunnamangalam", "Feroke", "Vadakara", "Koyilandy", "Ramanattukara",
        "Beypore", "Thamarassery", "Mavoor", "Balussery",
    ],
    Wayanad: [
        "Kalpetta", "Sulthan Bathery", "Mananthavady", "Vythiri", "Meppadi", "Panamaram",
        "Pulpally",
    ],
    Kannur: [
        "Kannur Town", "Thalassery", "Payyanur", "Taliparamba", "Mattannur", "Iritty",
        "Kuthuparamba", "Azhikode", "Panoor",
    ],
    Kasaragod: [
        "Kasaragod Town", "Kanhangad", "Nileshwaram", "Bekal", "Uppala", "Manjeshwar",
        "Cheruvathur",
    ],
};

export const initialFormData = {
    listingType: "",
    propertyType: "",
    location: {
        state: "Kerala",
        district: "",
        locality: "",
        village: "",
        landmark: "",
        pincode: "",
        lat: 10.0159,
        lng: 76.3419,
        address: "",
    },
    details: {
        builtupArea: "",
        landArea: "",
        landAreaUnit: "cent",
        bedrooms: "",
        bathrooms: "",
        floors: "",
        propertyAge: "",
        facing: "",
        furnishing: "",
        carParking: "",
        balcony: "",
        ownership: "",
        availability: "",
        amenities: [],
        features: [],
        flatNumber: "",
        floorNumber: "",
        totalFloors: "",
        hasLift: false,
        associationFee: "",
        maintenanceCharge: "",
        plotArea: "",
        roadWidth: "",
        boundaryWall: false,
        waterConnection: false,
        electricity: false,
        surveyNumber: "",
        cornerPlot: false,
        commercialSubType: "",
    },
    price: {
        amount: "",
        priceType: "total",
        negotiable: false,
        loanAvailable: false,
    },
    media: {
        photos: [],
        coverIndex: 0,
        floorPlans: [],
        videos: [],
        reelVideo: null,
        videoUrl: "",
        tourUrl: "",
        voiceNote: null,
    },
    description: {
        title: "",
        description: "",
        nearbyPlaces: [],
    },
    contact: {
        ownerName: "",
        phone: "",
        whatsapp: "",
        whatsappSameAsPhone: true,
        email: "",
        showContact: true,
        agreeTerms: false,
        otpVerified: false,
    },
};
