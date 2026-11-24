import {
  generatePropertyDynamicMetadata,
  getPropertySeo,
  getPropertyForSeo,
  cleanPropertyId,
  getPropertyUrl,
  SITE_URL,
} from "../../lib/seoHelper";
import { formatPropertyImgUrl } from "../../lib/api";
import { jsonLdHtml } from "../../lib/jsonLd";

const idFromSlug = (slug) => (Array.isArray(slug) ? slug[slug.length - 1] : slug);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const path = Array.isArray(slug) ? slug.map((part) => decodeURIComponent(part)).join("/") : "";
  return await generatePropertyDynamicMetadata(idFromSlug(slug), path);
}

/* Fallback structured data built from the listing itself, used when the
   SEO API has no hand-written schema for this property. Gives Google and AI
   answer engines the price, location, type and photos as facts. */
function buildListingSchema(property, id) {
  if (!property?.title) return null;
  const url = `${SITE_URL}${getPropertyUrl({ id, title: property.title })}`;
  const loc = property.location || {};
  const locality = loc.locality || loc.town || loc.city || "";
  const district = loc.district || "";
  const priceDigits = String(property.price_value ?? property.raw_price ?? property.price ?? "").replace(/[^\d.]/g, "");
  const images = (Array.isArray(property.images) ? property.images : [])
    .slice(0, 6)
    .map((img) => formatPropertyImgUrl(typeof img === "string" ? img : img?.url || img?.image_url || img?.file_path))
    .filter((src) => /^https:\/\//.test(src));
  const offerType = property.action === "rent" ? "rent" : property.action === "lease" ? "lease" : "sale";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateListing",
        "@id": `${url}#listing`,
        url,
        name: property.title,
        ...(property.description ? { description: String(property.description).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500) } : {}),
        ...(images.length ? { image: images } : {}),
        ...(property.created_at ? { datePosted: property.created_at } : {}),
        identifier: property.code || `KP${id}`,
        about: {
          "@type": "Place",
          name: [locality, district, "Kerala"].filter(Boolean).join(", "),
          address: {
            "@type": "PostalAddress",
            ...(locality ? { addressLocality: locality } : {}),
            ...(district ? { addressRegion: `${district}, Kerala` } : { addressRegion: "Kerala" }),
            addressCountry: "IN",
          },
          ...(loc.latitude && loc.longitude
            ? { geo: { "@type": "GeoCoordinates", latitude: Number(loc.latitude), longitude: Number(loc.longitude) } }
            : {}),
        },
        ...(priceDigits && Number(priceDigits) > 0
          ? {
              offers: {
                "@type": "Offer",
                price: Number(priceDigits),
                priceCurrency: "INR",
                availability: "https://schema.org/InStock",
                businessFunction: `https://purl.org/goodrelations/v1#${offerType === "sale" ? "Sell" : "LeaseOut"}`,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Properties", item: `${SITE_URL}/properties` },
          ...(district
            ? [{ "@type": "ListItem", position: 3, name: `Property in ${district}`, item: `${SITE_URL}/properties?location=${encodeURIComponent(district)}` }]
            : []),
          { "@type": "ListItem", position: district ? 4 : 3, name: property.title, item: url },
        ],
      },
    ],
  };
}

export default async function PropertyCatchAllLayout({ children, params }) {
  const { slug } = await params;
  const id = cleanPropertyId(idFromSlug(slug));
  const seo = id ? await getPropertySeo(id) : null;
  let schema = seo?.schema_markup || null;
  if (!schema && id) schema = buildListingSchema(await getPropertyForSeo(id), id);
  const html = schema ? jsonLdHtml(schema) : "";

  return (
    <>
      {html && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />}
      {children}
    </>
  );
}
