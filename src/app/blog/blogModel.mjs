export const BLOG_CATEGORIES = ["Buying Property", "Selling Property", "Land & Plot", "Property Documentation & Legal Awareness", "Kerala Property Market", "Investment", "NRI Property", "Renting", "Real Estate Technology"];
export const SITE_URL = "https://keralaplots.com";
export const DEFAULT_COVER = "/nophoto.webp";

export function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return value.split(",").map(item => item.trim()).filter(Boolean); }
}

export function plainText(value = "") {
  return String(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

export function safeUrl(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  if (/^\/(?!\/)/.test(value)) return value;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : fallback; }
  catch { return fallback; }
}

export function isPublished(post, now = Date.now()) {
  const status = post.status ?? post.publish_status;
  if (status !== undefined && status !== null && !["published", "active", "1", "true"].includes(String(status).toLowerCase())) return false;
  if ([false, 0, "0", "false"].includes(post.is_published)) return false;
  const date = post.published_at || post.publish_date || post.blog_date;
  return !date || !Number.isFinite(Date.parse(date)) || Date.parse(date) <= now;
}

export function normalizeBlog(raw) {
  const title = plainText(raw.title || "Untitled article");
  const content = typeof raw.content === "string" ? raw.content : "";
  const sections = arrayValue(raw.sections).filter(s => s && typeof s === "object" && s.heading).map((s, i) => ({ ...s, id: `section-${i + 1}`, paragraphs: arrayValue(s.paragraphs), bullets: arrayValue(s.bullets) }));
  const faq = arrayValue(raw.faq || raw.faqs).filter(f => f?.question && f?.answer);
  const body = [content, ...sections.flatMap(s => [s.heading, ...s.paragraphs, ...s.bullets]), ...faq.flatMap(f => [f.question, f.answer])].join(" ");
  const slug = typeof raw.slug === "string" && /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(raw.slug) ? raw.slug : String(raw.id || "");
  const href = `/blog/${encodeURIComponent(slug)}`;
  const canonical = safeUrl(raw.canonical_url, `${SITE_URL}${href}`);
  const publishedAt = raw.published_at || raw.publish_date || raw.blog_date || raw.created_at || null;
  const author = typeof raw.author === "string" ? raw.author : raw.author?.name;
  return {
    ...raw, title, content, sections, faq, slug, href, canonical,
    id: raw.id ?? slug,
    excerpt: plainText(raw.excerpt || raw.title_description || raw.short_description || plainText(body).slice(0, 155)),
    category: typeof raw.category === "string" ? raw.category : raw.category?.name || "Real Estate",
    author: author || "KeralaPlots Editorial Team",
    image: safeUrl(raw.featured_image, DEFAULT_COVER),
    imageAlt: raw.alt_text || title,
    tags: arrayValue(raw.tags), secondaryKeywords: arrayValue(raw.secondary_keywords),
    publishedAt, updatedAt: raw.updated_at || raw.updated_date || null,
    readTime: Math.max(1, parseInt(raw.reading_time, 10) || Math.ceil(plainText(body).split(/\s+/).filter(Boolean).length / 180)),
    indexable: ![false, 0, "0", "false", "noindex"].includes(raw.is_indexed ?? raw.seo_indexing ?? true),
    gallery: arrayValue(raw.gallery).filter(item => item && typeof item === "object" && safeUrl(item.url)),
    relatedIds: arrayValue(raw.related_articles).map(String),
    sources: arrayValue(raw.sources).filter(s => s?.title && safeUrl(s.url)),
    internalLinks: arrayValue(raw.internal_links).filter(l => l?.label && /^\/(?!\/)/.test(l.href)),
  };
}

export function mergeBlogs(local, remote) {
  // Remote records own a matching slug, including when an editor unpublishes it.
  const map = new Map(local.map(p => [p.slug || String(p.id), p]));
  for (const post of remote) map.set(post.slug || String(post.id), post);
  return [...map.values()].filter(post => isPublished(post)).map(normalizeBlog).sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
}

export function relatedBlogs(article, posts, limit = 3) {
  const score = p => (article.relatedIds.includes(String(p.id)) || article.relatedIds.includes(p.slug) ? 20 : 0) + (p.category === article.category ? 5 : 0) + p.tags.filter(t => article.tags.includes(t)).length;
  return posts.filter(p => p.id !== article.id && p.slug !== article.slug).sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export function formatDate(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";
}

export function collectionPage(response) {
  if (response?.status === false) throw new Error("Blog API reported a failure");
  const items = Array.isArray(response?.data) ? response.data : response?.data?.data;
  if (!Array.isArray(items)) throw new Error("Invalid blog collection response");
  const meta = response.meta || response.data;
  return { items, lastPage: Math.max(1, Number(meta?.last_page) || 1) };
}

export function matchesPropertyFilters(property, filters = {}) {
  const clean = value => String(value || "").trim().toLowerCase();
  const selected = value => String(value).split(",").map(clean);
  const type = clean(property.property_type || property.type);
  if (filters.property_type && !selected(filters.property_type).some(wanted => {
    if (wanted === "plot") return /plot|residential land/.test(type) && !/agricultur/.test(type);
    return type === wanted || type === `residential ${wanted}`;
  })) return false;
  const purpose = value => ["sale", "sell"].includes(clean(value)) ? "buy" : clean(value);
  if (filters.listing_type && !selected(filters.listing_type).map(purpose).includes(purpose(property.listing_type || property.action))) return false;
  if (filters.district && !selected(filters.district).includes(clean(property.district))) return false;
  if (filters.search && !clean([property.title, property.location_label, property.locality, property.city, property.district].join(" ")).includes(clean(filters.search))) return false;
  const price = Number(property.price || property.price_sort);
  if ((filters.min_price != null || filters.max_price != null) && (!Number.isFinite(price) || price <= 0 || clean(property.price_visibility) === "no")) return false;
  if (filters.min_price != null && price < Number(filters.min_price)) return false;
  if (filters.max_price != null && price > Number(filters.max_price)) return false;
  if (filters.min_area != null || filters.max_area != null) {
    const units = { cent: 435.6, acre: 43560, sqft: 1, sqm: 10.7639104167, sqyd: 9, are: 1076.39104167, hectare: 107639.104167 };
    const raw = String(property.area || "").replace(/,/g, "").match(/^([\d.]+)\s*(.+)$/);
    const unit = value => clean(value).replace(/[\s._-]/g, "").replace(/s$/, "");
    const factor = raw && units[unit(raw[2])];
    const target = units[unit(filters.area_unit || "sqft")];
    if (!factor || !target || !Number.isFinite(Number(raw[1]))) return false;
    const area = Number(raw[1]) * factor / target;
    if (filters.min_area != null && area < Number(filters.min_area)) return false;
    if (filters.max_area != null && area > Number(filters.max_area)) return false;
  }
  return true;
}
