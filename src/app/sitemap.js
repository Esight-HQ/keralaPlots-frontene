import { getBlogCatalog } from "./blog/blogRepository";
import { KERALA_DISTRICTS } from "./lib/keralaDistricts";
import { getPropertyUrl } from "./lib/seoHelper";

/* Regenerated at most once an hour (was rebuilt on every request). */
export const revalidate = 3600;

const BASE_URL = "https://keralaplots.com";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://apitest.keralaplots.com/api";

// Google's limit is 50,000 URLs per sitemap; stay well under it.
const MAX_PROPERTIES = 20000;
const PAGE_SIZE = 100;

const toDate = (value) => {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? new Date(t) : undefined;
};

async function getJson(path, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}${path}?${qs}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

/* Every live listing, paged through the public list endpoint (4 pages at a time). */
async function getPropertyEntries() {
  try {
    const first = await getJson("/properties", { page: 1, limit: PAGE_SIZE, sort_by: "newest" });
    const lastPage = Math.min(first?.meta?.last_page || first?.last_page || 1, Math.ceil(MAX_PROPERTIES / PAGE_SIZE));
    const items = [...(first?.data || [])];
    for (let page = 2; page <= lastPage; page += 4) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(4, lastPage - page + 1) }, (_, i) =>
          getJson("/properties", { page: page + i, limit: PAGE_SIZE, sort_by: "newest" }).catch(() => null)
        )
      );
      batch.forEach((res) => items.push(...(res?.data || [])));
    }
    const seen = new Set();
    return items
      .filter((p) => p?.id && !seen.has(p.id) && seen.add(p.id))
      .map((p) => ({
        url: `${BASE_URL}${getPropertyUrl(p)}`,
        lastModified: toDate(p.updated_at || p.created_at),
        changeFrequency: "weekly",
        priority: 0.8,
      }));
  } catch (error) {
    console.error("Sitemap: could not load properties", error?.message);
    return [];
  }
}

async function getAgentEntries() {
  try {
    const res = await getJson("/agents", { limit: 500 });
    return (res?.data || [])
      .map((a) => a?.id)
      .filter((id) => /^\d+$/.test(String(id)))
      .map((id) => ({ url: `${BASE_URL}/agent/${id}`, changeFrequency: "weekly", priority: 0.6 }));
  } catch (error) {
    console.error("Sitemap: could not load agents", error?.message);
    return [];
  }
}

// Static pages: no fake "lastModified: now" (search engines learn to ignore sitemaps that always say "changed today").
const STATIC_PAGES = [
  ["", "daily", 1.0],
  ["/properties", "daily", 0.9],
  ["/quick-sell", "weekly", 0.9],
  ["/agent", "weekly", 0.8],
  ["/reels", "daily", 0.8],
  ["/builders", "weekly", 0.8],
  ["/services", "monthly", 0.7],
  ["/pricing", "monthly", 0.7],
  ["/about-us", "monthly", 0.7],
  ["/blog", "weekly", 0.7],
  ["/guides-faqs", "monthly", 0.6],
  ["/register-agent", "monthly", 0.5],
  ["/register-builder", "monthly", 0.5],
  ["/register-service", "monthly", 0.5],
  ["/privacy-policy", "yearly", 0.3],
  ["/terms-conditions", "yearly", 0.3],
];

export default async function sitemap() {
  const [{ posts }, properties, agents] = await Promise.all([
    getBlogCatalog(),
    getPropertyEntries(),
    getAgentEntries(),
  ]);

  return [
    ...STATIC_PAGES.map(([path, changeFrequency, priority]) => ({ url: `${BASE_URL}${path}`, changeFrequency, priority })),
    ...KERALA_DISTRICTS.map((d) => ({
      url: `${BASE_URL}/district/${d.slug}`,
      changeFrequency: "daily",
      priority: 0.8,
    })),
    ...KERALA_DISTRICTS.flatMap((d) =>
      d.places.map((p) => ({
        url: `${BASE_URL}/district/${d.slug}/${p.slug}`,
        changeFrequency: "daily",
        priority: 0.7,
      }))
    ),
    ...properties,
    ...agents,
    ...posts
      .filter((post) => post.indexable)
      .map((post) => ({
        url: post.canonical,
        lastModified: toDate(post.updatedAt) || toDate(post.publishedAt),
        changeFrequency: "monthly",
        priority: 0.6,
      })),
  ];
}
