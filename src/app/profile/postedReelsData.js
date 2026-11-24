/* Seed data for the profile's "Posted Reels" panel — reels the signed-in demo
   user has already shared. These reuse the same Cloudflare Stream videos that
   power the public /reels feed, so "View Reel" opens something real instead
   of a dead link. */

export const initialPostedReels = [
    {
        id: 1,
        caption: "Kakkanad premium luxury villa tour is here.",
        location: "Kakkanad, Kochi, Kerala",
        price: "₹1,45,00,000",
        mediaType: "video",
        mediaUrl: "https://iframe.videodelivery.net/ef21fa16d2080bf9c7c1d21f73581f6b",
        poster: "https://videodelivery.net/ef21fa16d2080bf9c7c1d21f73581f6b/thumbnails/thumbnail.jpg?time=1s&height=600",
        postedOn: "12 Jul 2026",
        postedTs: new Date("2026-07-12").getTime(),
        views: 4820,
        likes: 213,
        shares: 47,
        saves: 96,
        status: "Active",
    },
    {
        id: 2,
        caption: "Beachfront villas starting from ₹1.2 Cr. High rental yields!",
        location: "Varkala, Thiruvananthapuram, Kerala",
        price: "₹1,20,00,000",
        mediaType: "video",
        mediaUrl: "https://iframe.videodelivery.net/6b0fa32e62508777ef2b3b88af0645ba",
        poster: "https://videodelivery.net/6b0fa32e62508777ef2b3b88af0645ba/thumbnails/thumbnail.jpg?time=1s&height=600",
        postedOn: "28 Jun 2026",
        postedTs: new Date("2026-06-28").getTime(),
        views: 12480,
        likes: 1845,
        shares: 312,
        saves: 528,
        status: "Active",
    },
];
