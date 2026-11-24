import "server-only";
import { cache } from "react";
import apiClient from "../lib/api";
import { collectionPage, normalizeBlog, isPublished } from "./blogModel.mjs";

// Reuse the existing client, URL resolution and interceptors. No second backend.
const request = async (path, params) => (await apiClient.get(path, { params, timeout: 10000 })).data;

export const getBlogCatalog = cache(async () => {
  try {
    const first = collectionPage(await request("/blogs", { page: 1, limit: 100 }));
    const remote = [...first.items];
    // Bounded concurrency; full bodies never go into the listing's client bundle.
    for (let page = 2; page <= first.lastPage; page += 4) {
      const batch = await Promise.all(Array.from({ length: Math.min(4, first.lastPage - page + 1) }, (_, i) => request("/blogs", { page: page + i, limit: 100 })));
      batch.forEach(response => remote.push(...collectionPage(response).items));
    }
    const posts = remote
      .filter(post => isPublished(post))
      .map(normalizeBlog)
      .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
    return { posts, unavailable: false };
  } catch (error) {
    console.error("Error loading blogs from database:", error);
    return { posts: [], unavailable: true };
  }
});

export const getBlog = cache(async (identifier) => {
  const catalog = await getBlogCatalog();
  const matched = catalog.posts.find(p => p.slug === identifier || String(p.id) === identifier);
  // The existing API accepts numeric IDs, not arbitrary slugs. A successfully
  // loaded public catalogue is authoritative for missing/unpublished routes.
  if (!matched && !catalog.unavailable) return { article: null, catalog };
  try {
    const response = await request(`/blogs/${encodeURIComponent(matched?.id ?? identifier)}`);
    const raw = response?.data;
    return { article: raw?.title && isPublished(raw) ? normalizeBlog(raw) : null, catalog };
  } catch (error) {
    if (error.response?.status === 404) return { article: null, catalog };
    // Do not mistake a backend outage for a missing article.
    throw new Error("The article service is temporarily unavailable. Please try again.");
  }
});
