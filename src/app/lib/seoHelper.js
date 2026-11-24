const LOCAL_API_BASE_URL = "https://apitest.keralaplots.com/api";
const STAGING_API_BASE_URL = "https://api.keralaplots.com/api";
const TEST_API_BASE_URL = "https://apitest.keralaplots.com/api";

const resolveApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return LOCAL_API_BASE_URL;
    }
    if (hostname === "test.keralaplots.com") {
      return STAGING_API_BASE_URL;
    }
    if (hostname === "keralaplots.com" || hostname === "www.keralaplots.com") {
      return TEST_API_BASE_URL;
    }
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NODE_ENV === "development" ? LOCAL_API_BASE_URL : TEST_API_BASE_URL;
};

const API_URL = resolveApiBaseUrl();

/* Site-wide share image (Open Graph / Twitter / WhatsApp preview).
   Used for every page; property and blog pages use their own photo when they have one. */
export const SITE_URL = "https://keralaplots.com";
export const DEFAULT_OG_IMAGE = "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/84e50349-17fe-4ab1-28c5-8f109b425000/public";

export const ogImageEntry = (url, alt) => ({
  url,
  secureUrl: url,
  width: 1200,
  height: 630,
  alt,
});

/* Defensive cap for <title>/<meta description> so CMS-entered SEO text can
   never push a page over Google's practical length limits, whatever an
   editor later types into the SEO fields. Cuts at the last whole word
   inside the limit rather than mid-word. */
export function truncateAtWord(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? sliced.slice(0, lastSpace) : sliced).trim();
}
export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 155;

/**
 * Fetch SEO settings for a given page_key
 */
/* Only plain ids/keys ever reach the backend URL path — a crafted page URL
   like /properties/x/..%2F..%2Fadmin can't steer the server-side request. */
const SAFE_KEY = /^[A-Za-z0-9_-]{1,80}$/;
export function cleanPropertyId(value) {
  const id = String(value ?? "").trim().replace(/^kp-?/i, "");
  return /^\d{1,12}$/.test(id) ? id : null;
}

export async function getSeoSettings(pageKey) {
  if (!SAFE_KEY.test(String(pageKey || ""))) return null;
  try {
    const res = await fetch(`${API_URL}/seo/${encodeURIComponent(pageKey)}`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data?.data || null;
  } catch (error) {
    console.error(`Error fetching SEO metadata for ${pageKey}:`, error);
    return null;
  }
}

/**
 * Fetch dynamic SEO settings for a single property
 */
export async function getPropertySeo(propertyId) {
  const id = cleanPropertyId(propertyId);
  if (!id) return null;
  try {
    const res = await fetch(`${API_URL}/properties/${id}/seo`, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data?.data || null;
  } catch (error) {
    console.error(`Error fetching SEO metadata for property ${propertyId}:`, error);
    return null;
  }
}

/**
 * Generate Next.js Dynamic Metadata object for standard pages
 */
export async function generateDynamicMetadata(pageKey, fallback = {}) {
  const seo = await getSeoSettings(pageKey);

  const title = truncateAtWord(seo?.meta_title || fallback.title || "KeralaPlots | Real Estate & Property Marketplace", MAX_TITLE_LENGTH);
  const description = truncateAtWord(seo?.meta_description || fallback.description || "Find verified plots, villas, and apartments across Kerala.", MAX_DESCRIPTION_LENGTH);
  const canonical = seo?.canonical_url || fallback.canonical || `https://keralaplots.com/${pageKey === "home" ? "" : pageKey}`;
  const ogTitle = seo?.og_title || title;
  const ogDescription = seo?.og_description || description;
  // Standard pages always share the KeralaPlots image.
  const ogImage = DEFAULT_OG_IMAGE;

  const keywords = seo?.primary_keywords
    ? `${seo.primary_keywords}${seo.secondary_keywords ? ", " + seo.secondary_keywords : ""}`
    : fallback.keywords;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: keywords ? keywords.split(",").map((k) => k.trim()) : undefined,
    alternates: {
      canonical,
    },
    robots: {
      index: seo?.is_indexed ?? true,
      follow: seo?.is_indexed ?? true,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      siteName: "KeralaPlots",
      locale: "en_IN",
      type: "website",
      images: [ogImageEntry(ogImage, ogTitle)],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [{ url: ogImage, alt: ogTitle }],
    },
  };
}

/**
 * Public property details (same data the page shows). Next.js de-duplicates
 * this fetch between generateMetadata and the layout in one request.
 */
export async function getPropertyForSeo(propertyId) {
  const id = cleanPropertyId(propertyId);
  if (!id) return null;
  try {
    const res = await fetch(`${API_URL}/properties/${id}`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success === false ? null : json?.data || null;
  } catch {
    return null;
  }
}

/**
 * Generate Next.js Dynamic Metadata object for single Property page
 */
export async function generatePropertyDynamicMetadata(propertyId, requestedPath = "") {
  const id = cleanPropertyId(propertyId);
  if (!id) {
    return { title: "Property not found | KeralaPlots", robots: { index: false, follow: true } };
  }
  const [seo, property] = await Promise.all([getPropertySeo(id), getPropertyForSeo(id)]);

  const loc = property?.location || {};
  const place = [loc.locality || loc.town || loc.city, loc.district].filter(Boolean).join(", ");
  const fallbackTitle = property?.title
    ? withBrand(`${property.title}${place && !property.title.includes(loc.district || "~") ? ` – ${place}` : ""}`)
    : withBrand(`Property KP${id} in Kerala`);
  const fallbackDescription = property?.title
    ? `${property.title}${place ? ` in ${place}, Kerala` : " in Kerala"}${property.price ? ` – ${/^(₹|rs\.?|inr)/i.test(String(property.price).trim()) ? property.price : `₹${property.price}`}` : ""}. See photos, details and contact the owner on KeralaPlots.`
    : "View verified property details, price, photos, and contact owner on KeralaPlots.";

  const title = seo?.meta_title ? truncateAtWord(seo.meta_title, MAX_TITLE_LENGTH) : fallbackTitle;
  const description = truncateAtWord(seo?.meta_description || fallbackDescription, MAX_DESCRIPTION_LENGTH);
  // Canonical = the real /properties/<title-slug>/<id> URL, so slug variants don't compete.
  const safePath = /^[\p{L}\p{N}-]{1,120}\/\d{1,12}$/u.test(requestedPath) ? `/properties/${requestedPath}` : `/properties/${id}`;
  const slugCanonical = `${SITE_URL}${property?.title ? getPropertyUrl({ id, title: property.title }) : safePath}`;
  const rawSeoCanonical = String(seo?.canonical_url || "").trim();
  const isBareIdCanonical = /^https?:\/\/(www\.)?keralaplots\.com\/properties\/\d+\/?$/i.test(rawSeoCanonical);
  const canonical = rawSeoCanonical && !isBareIdCanonical ? rawSeoCanonical : slugCanonical;
  const ogTitle = seo?.og_title || title;
  const ogDescription = seo?.og_description || description;
  const firstImage = Array.isArray(property?.images) && property.images[0];
  const firstImageUrl = typeof firstImage === "string" ? firstImage : firstImage?.url || firstImage?.image_url || "";
  // A property shares its own photo when there is one, otherwise the site image.
  const ogImage = seo?.og_image || (/^https:\/\//.test(firstImageUrl) ? firstImageUrl : DEFAULT_OG_IMAGE);

  const keywords = seo?.primary_keywords
    ? `${seo.primary_keywords}${seo.secondary_keywords ? ", " + seo.secondary_keywords : ""}`
    : [property?.type, place, "property for sale kerala", `kp-${id}`].filter(Boolean).join(", ");

  // Only the CMS flag can de-index a listing; a temporary API outage must not.
  const indexable = seo?.is_indexed ?? true;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    alternates: {
      canonical,
    },
    robots: {
      index: indexable,
      follow: true,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      siteName: "KeralaPlots",
      locale: "en_IN",
      type: "article",
      images: [ogImageEntry(ogImage, ogTitle)],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [{ url: ogImage, alt: ogTitle }],
    },
  };
}

/**
 * Convert text to SEO-friendly URL slug (replaces spaces and special chars with hyphens)
 */
export function slugify(text) {
  if (!text) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate property inner page URL with property title: /properties/[slug]/[id]
 */
export function getPropertyUrl(propertyOrId, customTitle) {
  if (!propertyOrId) return "/properties";

  if (typeof propertyOrId === "object") {
    const id = propertyOrId.id || propertyOrId.propertyId || propertyOrId.property_id;
    const title = propertyOrId.title || propertyOrId.propertyTitle || propertyOrId.name || propertyOrId.property_title || propertyOrId.propTitle || customTitle || "";
    if (!id) return "/properties";
    const slug = slugify(title);
    if (slug) {
      return `/properties/${slug}/${id}`;
    }
    return `/properties/${id}`;
  }

  const id = propertyOrId;
  const slug = slugify(customTitle);
  if (slug) {
    return `/properties/${slug}/${id}`;
  }
  return `/properties/${id}`;
}


/* ---------------------------------------------------------------------------
   Shared helpers for pages that had no metadata of their own.
--------------------------------------------------------------------------- */

/* Account / private pages: keep them out of search results entirely. */
export function noIndexMetadata(title) {
  return {
    title: title ? `${title} | KeralaPlots` : "KeralaPlots",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  };
}

/* Small public read from the API for metadata. Only digit ids reach the URL. */
async function fetchPublicData(path) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

const cleanId = (value) => {
  const id = String(value ?? "").trim();
  return /^\d{1,12}$/.test(id) ? id : null;
};

const plain = (text) =>
  String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* "<main> | KeralaPlots", trimming the main part so the brand is never cut off. */
const BRAND = " | KeralaPlots";
export function withBrand(main) {
  const cut = truncateAtWord(String(main || "").trim(), MAX_TITLE_LENGTH - BRAND.length);
  return `${cut.replace(/[\s,;:–—-]+$/u, "")}${BRAND}`;
}

function profileMetadata({ title, description, path, image, type = "profile" }) {
  const url = `${SITE_URL}${path}`;
  const t = withBrand(title);
  const d = truncateAtWord(description, MAX_DESCRIPTION_LENGTH);
  const img = image && /^https:\/\//.test(image) ? image : DEFAULT_OG_IMAGE;
  return {
    title: t,
    description: d,
    alternates: { canonical: url },
    openGraph: { title: t, description: d, url, siteName: "KeralaPlots", locale: "en_IN", type, images: [ogImageEntry(img, t)] },
    twitter: { card: "summary_large_image", title: t, description: d, images: [img] },
  };
}

/* /agent/[id] */
export async function getAgentForSeo(id) {
  const safe = cleanId(id);
  return safe ? fetchPublicData(`/agents/${safe}`) : null;
}

export function agentDisplay(agent) {
  if (!agent) return null;
  const name = agent.name || agent.fullname || agent.username || "Real Estate Agent";
  const place = [agent.town || agent.city, agent.district].filter(Boolean).join(", ");
  const bio = plain(agent.short_bio || agent.intro || agent.about);
  const image = agent.profile_image || agent.avatar || agent.photo || agent.image || "";
  return { name, place, bio, image };
}

export async function generateAgentMetadata(id) {
  const safe = cleanId(id);
  if (!safe) return { ...noIndexMetadata("Agent not found") };
  const a = agentDisplay(await getAgentForSeo(safe));
  const name = a?.name && a.name !== "Real Estate Agent" ? a.name : "";
  const where = a?.place ? `${a.place}, Kerala` : "Kerala";
  return profileMetadata({
    title: name ? `${name} – Real Estate Agent, ${where}` : `Real Estate Agent Profile, ${where}`,
    description:
      a?.bio ||
      `${name || "This agent"} is a real estate agent on KeralaPlots serving ${where}. View listed properties, reviews and contact details.`,
    path: `/agent/${safe}`,
    image: a?.image,
  });
}

/* /user/[id] */
export async function getUserForSeo(id) {
  const safe = cleanId(id);
  return safe ? fetchPublicData(`/users/${safe}`) : null;
}

export async function generateUserMetadata(id) {
  const safe = cleanId(id);
  if (!safe) return { ...noIndexMetadata("Profile not found") };
  const u = await getUserForSeo(safe);
  const name = u?.fullname || u?.username || "KeralaPlots Member";
  const where = [u?.town, u?.district].filter(Boolean).join(", ") || "Kerala";
  const count = Array.isArray(u?.properties) ? u.properties.length : 0;
  return profileMetadata({
    title: `${name} – Properties in ${where}`,
    description: `See ${count ? `${count} ` : ""}property listings and reels posted by ${name} on KeralaPlots, the Kerala real estate marketplace.`,
    path: `/user/${safe}`,
    image: u?.profile_image || u?.avatar || "",
  });
}
