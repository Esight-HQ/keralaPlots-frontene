import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BLOG_CATEGORIES, normalizeBlog, isPublished, safeUrl } from '../src/app/blog/blogModel.mjs';
const posts = JSON.parse(await readFile(new URL('../content/blog/articles.json', import.meta.url)));
const topics = JSON.parse(await readFile(new URL('../content/blog/topics.json', import.meta.url)));
const slugs = new Set();
for (const post of posts) {
  assert(post.title && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug), 'Title and slug required');
  assert(!slugs.has(post.slug), `Duplicate slug: ${post.slug}`); slugs.add(post.slug);
  assert(['draft', 'published'].includes(post.status), `${post.slug}: invalid status`);
  assert(BLOG_CATEGORIES.includes(post.category), `${post.slug}: unknown category`);
  if (!isPublished(post)) continue;
  for (const field of ['excerpt', 'author', 'featured_image', 'alt_text', 'primary_keyword', 'meta_title', 'meta_description', 'published_at']) assert(post[field], `${post.slug}: missing ${field}`);
  assert(Number.isFinite(Date.parse(post.published_at)), `${post.slug}: invalid date`);
  assert(post.secondary_keywords.length >= 5 && post.secondary_keywords.length <= 15);
  assert(post.faq.length >= 5 && post.faq.length <= 8);
  assert(post.sections.length >= 3 && post.sections.every(s => s.heading && s.paragraphs.length));
  assert(post.sources.length && post.sources.every(s => safeUrl(s.url)), `${post.slug}: sources required`);
  assert(post.cta.text && safeUrl(post.cta.href), `${post.slug}: CTA required`);
  assert(post.image_plan.featured && post.image_plan.supporting.length >= 3);
  assert(post.editorial_review?.original_copy && post.editorial_review?.reviewed_at);
  const normalized = normalizeBlog(post);
  assert(normalized.indexable && normalized.readTime > 0);
}
for (const post of posts) assert(post.related_articles.every(slug => slugs.has(slug)), `${post.slug}: broken related article`);
assert(topics.length >= 50);
assert(topics.every(t => t.status === 'draft' && BLOG_CATEGORIES.includes(t.category)));
console.log(`Validated ${posts.length} articles and ${topics.length} draft topics. Factual and originality review still require editorial judgment.`);
