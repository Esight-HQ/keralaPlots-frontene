# KeralaPlots editorial workflow

## What is connected

The journal reads the existing `/blogs` and `/blogs/:id` endpoints through `src/app/lib/api.js`. That file, its base URLs, authentication interceptors, and the existing admin panel are unchanged. The former article-only `127.0.0.1:8000` override has been removed. Related properties use the existing `propertyApi.list` / `propertyApi.show` methods, with no generated or fallback property records.

The API returned an empty collection during implementation. Six original starter guides live in `content/blog/articles.json`; these render alongside backend records. A backend record with the same slug supersedes a starter, including draft status. These files are not database inserts. Manage database articles in the existing admin; manage the local starter collection in source control. Source-file changes require a deployment in production.

`content/blog/topics.json` contains 55 draft research briefs across all nine categories. They are an editorial backlog, not published articles. There is no AI provider, automatic generation job or automated publishing connection in this repository. This implementation does not imply one has been configured.

## Supported article fields

Existing fields continue to work: `id`, `title`, `title_description`, `short_description`, `content`, `category`, `featured_image`, `alt_text`, `blog_date`, `published_at`, `created_at`. Existing numeric URLs remain accepted; an article with a supplied slug redirects its numeric URL to its slug URL.

Optional extended fields:

| Field | Format / behaviour |
| --- | --- |
| `slug` | Unique lowercase hyphenated slug; numeric ID remains the fallback |
| `excerpt`, `intro` | Plain text |
| `content` | Plain text, basic Markdown or legacy HTML converted to safe text blocks; arbitrary HTML, styling and embeds are not executed |
| `sections` | Array of `{ heading, paragraphs: string[], bullets?: string[], table?: { headers: string[], rows: string[][] } }` |
| `author` | Name, or an object with `name`; defaults to KeralaPlots Editorial Team |
| `featured_image`, `alt_text`, `image_caption` | Image URL, accurate alternative text, optional caption |
| `gallery` | Array of `{ url, alt, caption }` |
| `tags`, `secondary_keywords` | String arrays; JSON-encoded arrays also accepted |
| `primary_keyword`, `meta_title`, `meta_description` | Editorial SEO values |
| `canonical_url` | Absolute HTTP(S) canonical; defaults to the article’s KeralaPlots URL |
| `published_at`, `updated_at` | ISO date strings; future publication dates remain hidden |
| `reading_time` | Optional minutes; otherwise calculated from content, sections and FAQs |
| `faq` | Array of `{ question, answer }` |
| `related_articles` | Preferred article IDs or slugs; topic matching supplies remaining suggestions |
| `related_properties` | Existing property IDs, or objects with `id`; fetched from the actual property API |
| `property_filters` | Existing property API parameters: `district`, `property_type`, `listing_type`, `min_price`, `max_price`, `min_area`, `max_area`, `area_unit`, `search`. Area bounds use `area_unit` (default square feet); listings with unknown units are excluded when area bounds are set |
| `status` | `draft` or `published`; legacy active/boolean flags supported; absent status preserves legacy public API behaviour |
| `is_indexed` | Boolean / 0 / 1; false keeps the public page but applies noindex and excludes it from the sitemap |
| `sources` | Array of `{ title, url }`; link to exact supporting sources |
| `internal_links` | Array of `{ label, href }` using actual relative site routes |
| `cta` | `{ text, label, href }` |
| `strategy`, `image_plan`, `editorial_review` | Editorial planning fields; not shown as reader-facing implementation details |

Extended fields render when supplied. Persisting new fields through the current CMS requires the backend/admin to support them; no migrations or admin changes were made. Public draft filtering is defence in depth: the backend must also restrict draft records and enforce author permissions. This frontend is not an access-control substitute.

## Create an article

1. Pick a draft brief and identify the audience, intent, primary keyword and 5–15 secondary keywords.
2. Research the subject. HelloAddress is topic inspiration only; write a fresh outline and examples. Do not copy its wording, statistics or brand claims.
3. Verify any current tax, legal, rate, infrastructure, market or NRI eligibility claim using current primary sources. Record the source and check date; leave unverified articles as drafts.
4. Write a useful introduction, practical sections, 5–8 FAQs and a restrained CTA. Keep land area and building area distinct. Use a qualified-professional note where appropriate.
5. Supply metadata, internal links to actual routes, a featured-image plan and 3–5 supporting image concepts with filenames and alt text. Use licensed or owned photographs; never imply an illustrative image is a specific live property.
6. Check factual accuracy and originality manually. Automated validation cannot certify either. No profit promises, fabricated experts, invented testimonials or unsupported platform claims.
7. Set `status: "published"` only after review; include publish and updated dates. Keep planned briefs in `topics.json`.
8. Run `node scripts/check-blog-content.mjs` for local articles and `node --test scripts/blog-model.test.mjs`. Preview the article, FAQs, links and mobile layout before deploying.

## Operational notes

- The server loads the backend’s paginated catalogue in batches of four requests and filters draft/scheduled posts. A React request cache shares it between metadata and rendering; it is not a stale global catalogue. Only card data goes to the index client. For much larger collections, add documented backend search/category queries before switching to database pagination; do not assume those filters already exist.
- If the blog API is unavailable, the index labels the issue and offers retry while local guides remain available. Backend article failures show retry UI, rather than falsely claiming the article does not exist. A confirmed missing article uses Next.js notFound.
- Backend detail data supplies the full body; related articles are selected from published catalogue entries. Up to six supplied property IDs are fetched independently; ordinary recommendations check up to three pages of twelve live records and display up to three matches. Category, location, purpose, budget and area constraints are checked again locally because the API does not consistently apply all filters. A no-match message refers to recent listings, not the entire database.
- No automatic tax rates, prices, appreciation figures or NRI eligibility assertions were published. Sources in starter guides support the resources actually mentioned, not a professional assessment of any property.
- Initial research: [HelloAddress topic index](https://www.helloaddress.com/real-estate-news/en), [KSDMA hazard maps](https://sdma.kerala.gov.in/hazard-maps/), [K-RERA project search guide](https://rera.kerala.gov.in/explore-project-), [Registration Department EC resources](https://registration.kerala.gov.in/en/encumbrance-certificate/), and [KeralaPlots](https://keralaplots.com/), accessed 1 October 2026.
