/* Builders shown on /builders.
   ─────────────────────────────────────────────────────────────────────────
   SAMPLE DATA: these are placeholder builders so the page has something to
   show while the backend has no builders. Replace each entry with a real
   builder (or delete the file's entries) before going live.

   Fields
   - id        unique string
   - name      company name
   - logo      logo image URL; leave "" to show a coloured initials badge.
               Sample logos live in /public/builder-logos/ (wide format,
               ~4:1 works best, e.g. 196×48)
   - cover     cover photo URL (a project photo works best, ~1200px wide)
   - place     location shown on the card, e.g. "Kakkanad, Kochi"
   - role      type of builder (Residential builder, Villa developer…)
   - since     year established (optional)
   - projects  number of completed projects (optional)
   - phone     contact number (optional; enables Call + WhatsApp buttons)

   Approved builders from the API (service providers with a builder /
   construction role) are added after these automatically. */

const img = (id) => `https://images.unsplash.com/${id}?w=900&auto=format&fit=crop&q=70`;

export const BUILDERS = [
    {
        id: "sample-1",
        name: "Periyar Homes & Developers",
        logo: "/builder-logos/periyar-homes.svg",
        cover: img("photo-1600596542815-ffad4c1539a9"),
        place: "Kakkanad, Kochi",
        role: "Residential builder",
        since: 2008,
        projects: 42,
        phone: "",
    },
    {
        id: "sample-2",
        name: "Malabar Crest Constructions",
        logo: "/builder-logos/malabar-crest.svg",
        cover: img("photo-1600585154340-be6161a56a0c"),
        place: "Kozhikode",
        role: "Villa developer",
        since: 2012,
        projects: 28,
        phone: "",
    },
    {
        id: "sample-3",
        name: "Ananthapuri Builders",
        logo: "/builder-logos/ananthapuri-builders.svg",
        cover: img("photo-1545324418-cc1a3fa10c00"),
        place: "Kazhakkoottam, Thiruvananthapuram",
        role: "Apartment developer",
        since: 2005,
        projects: 55,
        phone: "",
    },
    {
        id: "sample-4",
        name: "Thrissur Greenline Homes",
        logo: "/builder-logos/thrissur-greenline.svg",
        cover: img("photo-1512917774080-9991f1c4c750"),
        place: "Thrissur",
        role: "Residential builder",
        since: 2015,
        projects: 19,
        phone: "",
    },
    {
        id: "sample-5",
        name: "Backwater Villas & Resorts",
        logo: "/builder-logos/backwater-villas.svg",
        cover: img("photo-1613490493576-7fde63acd811"),
        place: "Alappuzha",
        role: "Villa developer",
        since: 2010,
        projects: 23,
        phone: "",
    },
    {
        id: "sample-6",
        name: "Meenachil Constructions",
        logo: "/builder-logos/meenachil-constructions.svg",
        cover: img("photo-1564013799919-ab600027ffc6"),
        place: "Pala, Kottayam",
        role: "Construction company",
        since: 2001,
        projects: 61,
        phone: "",
    },
    {
        id: "sample-7",
        name: "Western Ghats Builders",
        logo: "/builder-logos/western-ghats.svg",
        cover: img("photo-1580587771525-78b9dba3b914"),
        place: "Palakkad",
        role: "Residential builder",
        since: 2017,
        projects: 14,
        phone: "",
    },
    {
        id: "sample-8",
        name: "Kannur Coastal Developers",
        logo: "/builder-logos/kannur-coastal.svg",
        cover: img("photo-1570129477492-45c003edd2be"),
        place: "Thalassery, Kannur",
        role: "Apartment developer",
        since: 2011,
        projects: 31,
        phone: "",
    },
    {
        id: "sample-9",
        name: "Ashtamudi Realty Builders",
        logo: "/builder-logos/ashtamudi-realty.svg",
        cover: img("photo-1605276374104-dee2a0ed3cd6"),
        place: "Kollam",
        role: "Residential builder",
        since: 2009,
        projects: 26,
        phone: "",
    },
    {
        id: "sample-10",
        name: "Highrange Homes",
        logo: "/builder-logos/highrange-homes.svg",
        cover: img("photo-1449844908441-8829872d2607"),
        place: "Thodupuzha, Idukki",
        role: "Villa developer",
        since: 2014,
        projects: 12,
        phone: "",
    },
    {
        id: "sample-11",
        name: "Nila Infra Projects",
        logo: "/builder-logos/nila-infra.svg",
        cover: img("photo-1600607687939-ce8a6c25118c"),
        place: "Tirur, Malappuram",
        role: "Construction company",
        since: 2006,
        projects: 37,
        phone: "",
    },
    {
        id: "sample-12",
        name: "Cochin Skyview Developers",
        logo: "/builder-logos/cochin-skyview.svg",
        cover: img("photo-1486406146926-c627a92ad1ab"),
        place: "Edappally, Kochi",
        role: "Apartment developer",
        since: 2003,
        projects: 48,
        phone: "",
    },
];
