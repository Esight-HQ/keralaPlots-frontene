import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublished, mergeBlogs, normalizeBlog, relatedBlogs, collectionPage, safeUrl } from '../src/app/blog/blogModel.mjs';

test('legacy API fields and IDs remain usable', () => {
  const post = normalizeBlog({ id: 42, title: 'A house', title_description: '<p>Useful &amp; local</p>', content: 'A short guide', blog_date: '2025-04-01' });
  assert.equal(post.href, '/blog/42'); assert.equal(post.excerpt, 'Useful & local');
  assert.equal(post.author, 'KeralaPlots Editorial Team'); assert.equal(post.readTime, 1);
});
test('draft, inactive and scheduled records are excluded, legacy records remain public', () => {
  for (const status of ['draft', 'archived', 'inactive', 0, false]) assert.equal(isPublished({ status }), false);
  assert.equal(isPublished({ status: 'published', published_at: '2999-01-01' }), false);
  assert.equal(isPublished({ title: 'legacy' }), true);
  assert.equal(isPublished({ status: true }), true);
});
test('remote editorial changes win, including unpublishing local content', () => {
  const local = [{ id: 'a', slug: 'same', title: 'Local', status: 'published' }];
  assert.equal(mergeBlogs(local, [{ id: 1, slug: 'same', title: 'Remote', status: 'published' }])[0].title, 'Remote');
  assert.equal(mergeBlogs(local, [{ id: 1, slug: 'same', status: 'draft' }]).length, 0);
  assert.equal(mergeBlogs([{...local[0], published_at:'2026-01-01'}], []).length, 1);
});
test('optional CMS JSON fields, noindex and unsafe URLs are handled', () => {
  const post = normalizeBlog({ id: 1, title: 'Test', tags: '["plots"]', faq: '[{"question":"Why?","answer":"Because."}]', is_indexed: '0', featured_image: 'javascript:alert(1)', canonical_url:'javascript:alert(1)' });
  assert.deepEqual(post.tags, ['plots']); assert.equal(post.faq.length, 1); assert.equal(post.indexable, false);
  assert.equal(post.image, '/nophoto.webp'); assert.equal(post.canonical, 'https://keralaplots.com/blog/1');
  assert.equal(safeUrl('//untrusted.example'), '');
});
test('related articles exclude current and prefer explicit or topical matches', () => {
  const posts = ['one', 'two', 'three', 'four'].map((slug, i) => normalizeBlog({ id: i, slug, category: i === 2 ? 'Land & Plot' : 'Other', title: slug }));
  const current = { ...posts[0], relatedIds: ['four'], tags: [] };
  const result = relatedBlogs(current, posts);
  assert.equal(result[0].slug, 'four'); assert.equal(result.length, 3); assert(!result.some(p => p.slug === 'one'));
});
test('pagination unwraps both API envelopes and rejects failures', () => {
  assert.equal(collectionPage({data:[{id:1}],meta:{last_page:5}}).lastPage,5);
  assert.equal(collectionPage({data:{data:[],last_page:3}}).lastPage,3);
  assert.throws(() => collectionPage({ status:false, data:[] }));
  assert.throws(() => collectionPage({ error:'unavailable' }));
});

test('property recommendations enforce topic, price, location, purpose and area even if API ignores filters', async () => {
  const { matchesPropertyFilters } = await import('../src/app/blog/blogModel.mjs');
  const property = {property_type:'Residential Land',listing_type:'buy',district:'Ernakulam',price:1000000,area:'8 Cent'};
  assert(matchesPropertyFilters(property,{property_type:'Plot',district:'Ernakulam',min_area:7,max_area:9,area_unit:'cent'}));
  assert(!matchesPropertyFilters({...property,property_type:'Agricultural Land'},{property_type:'Plot'}));
  assert(!matchesPropertyFilters(property,{listing_type:'rent'}));
  assert(!matchesPropertyFilters(property,{max_price:500000}));
  assert(!matchesPropertyFilters(property,{district:'Kollam'}));
  assert(!matchesPropertyFilters(property,{min_area:4000}));
  assert(!matchesPropertyFilters({...property,area:'unknown'},{min_area:1}));
});
