"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { propertyApi } from "../../lib/api";
import { getPropertyUrl } from "../../lib/seoHelper";
import PropertyIdBadge, { PropertyBadgeRow } from "../../componants/propertyIdBadge/PropertyIdBadge";
import { arrayValue, safeUrl, matchesPropertyFilters, plainText } from "../blogModel.mjs";
import { BlogImage } from "../BlogExplorer";
import styles from "./blogDetails.module.css";

function propertyImage(property) {
  const image = property.image || property.cover_image;
  if (!image) return "/nophoto.webp";
  if (/^https?:\/\//.test(image)) return safeUrl(image, "/nophoto.webp");
  const file = String(image).split("/").pop();
  if (file.includes("KeralaPlots-Image-") || file.endsWith(".webp")) return `https://keralaplots.com/keralaplots/postProperty/assets/images/PropertyImageLow/${encodeURIComponent(file)}`;
  if (/^\/?uploads\//.test(image)) return `https://keralaplots.com/${image.replace(/^\/+/, "")}`;
  return `https://keralaplots.com/uploads/properties/images/${encodeURIComponent(file)}`;
}

export default function RelatedProperties({ article }) {
  const [result, setResult] = useState({ posts: [], loading: true, error: false });
  const [attempt, setAttempt] = useState(0);
  const filterKey = JSON.stringify(article.property_filters || {});
  const idsKey = JSON.stringify(arrayValue(article.related_properties).map(p => typeof p === "object" ? p.id : p).filter(Boolean).slice(0, 6));
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const allowed = ["district", "property_type", "listing_type", "min_price", "max_price", "min_area", "max_area", "area_unit", "search"];
        const filters = Object.fromEntries(Object.entries(JSON.parse(filterKey)).filter(([key]) => allowed.includes(key)));
        const ids = JSON.parse(idsKey);
        let posts;
        if (ids.length) {
          const responses = await Promise.allSettled(ids.map(id => propertyApi.show(id)));
          if (responses.every(r => r.status === "rejected")) throw new Error("Property service unavailable");
          posts = responses.filter(r => r.status === "fulfilled").map(r => r.value.data).filter(p => p?.id && matchesPropertyFilters(p, filters));
        } else {
          const matches = new Map();
          for (let page = 1; page <= 3; page++) {
            const response = await propertyApi.list({ ...filters, page, limit: 12 });
            if (response?.status === false || !Array.isArray(response?.data)) throw new Error("Invalid property response");
            response.data.filter(p => p?.id && matchesPropertyFilters(p, filters)).forEach(p => matches.set(p.id, p));
            if (matches.size >= 3 || page >= (response.meta?.last_page || 1)) break;
          }
          posts = [...matches.values()].slice(0, 3);
        }
        if (active) setResult({ posts, loading: false, error: false });
      } catch { if (active) setResult({ posts: [], loading: false, error: true }); }
    }
    load();
    return () => { active = false; };
  }, [filterKey, idsKey, attempt]);
  const filters = JSON.parse(filterKey);
  const query = new URLSearchParams(Object.entries(filters).filter(([key, value]) => ["district", "property_type", "listing_type", "search"].includes(key) && value != null)).toString();
  return <section id="explore-properties" className={styles.liveProperties} aria-labelledby="live-properties-heading"><div className={styles.relatedHeader}><div><p className={styles.kicker}>CONTINUE YOUR SEARCH</p><h2 id="live-properties-heading" className={styles.relatedTitle}>{filters.property_type === "Plot" ? "Explore residential plots" : filters.listing_type === "rent" ? "Explore rental properties" : "Explore properties in Kerala"}</h2></div><Link href={`/properties${query ? `?${query}` : ""}`}>View properties →</Link></div>
    {result.loading ? <p role="status">Loading current property listings…</p> : result.error ? <p role="status">Property listings are temporarily unavailable. <button onClick={() => { setResult({ posts: [], loading: true, error: false }); setAttempt(n => n + 1); }}>Try again</button></p> : result.posts.length === 0 ? <p>No matches were found among recent listings. Browse properties to adjust your search.</p> : <div className={styles.relatedGrid}>{result.posts.map(property => <Link key={property.id} href={getPropertyUrl(property)} className={styles.relatedCard}><div className={styles.relatedImageContainer}><BlogImage src={propertyImage(property)} alt={property.title || "Property listing"} className={styles.relatedCover} /></div><div className={styles.relatedCardBody}><PropertyBadgeRow style={{ marginBottom: 10 }}><span className={styles.relatedCategory}>{property.property_type || property.type || "Property"}</span><PropertyIdBadge property={property} /></PropertyBadgeRow><h3 className={styles.relatedCardTitle}>{property.title || "View property details"}</h3><p>{property.location_label || [property.locality, property.city, property.district].filter(Boolean).join(", ")}</p><strong>{String(property.price_visibility).toLowerCase() === "no" ? "Price on request" : plainText(property.price_formatted).replace(/<$/, "") || (Number(property.price) > 0 ? `₹${Number(property.price).toLocaleString("en-IN")}` : "Price on request")}</strong></div></Link>)}</div>}
  </section>;
}
