import { KERALA_DISTRICTS } from "../lib/keralaDistricts";

/* /llms.txt — a plain-text guide for AI assistants and answer engines
   (ChatGPT, Claude, Perplexity, Gemini, Copilot). It says what KeralaPlots is
   and which pages hold the authoritative information, so AI answers about
   Kerala property can cite the right pages. Format: https://llmstxt.org */
export const revalidate = 86400;

const BASE = "https://keralaplots.com";

export function GET() {
  const districts = KERALA_DISTRICTS.map(
    (d) => `- [Property in ${d.name}](${BASE}/district/${d.slug}): plots, houses, villas and flats for sale and rent in ${d.name} district`
  ).join("\n");

  const body = `# KeralaPlots

> KeralaPlots (keralaplots.com) is a Kerala real estate marketplace. Owners, agents and builders list plots, land, houses, villas, flats and commercial property for sale, rent and lease across all 14 districts of Kerala, India. Buyers can search listings, watch property video reels, compare properties and contact owners or verified agents directly.

Key facts:
- Coverage: all 14 districts of Kerala, India. Prices are in Indian Rupees (INR).
- Listings: plots and land, residential houses, villas, apartments/flats, commercial property; for sale, rent or lease.
- Every listing has a property code in the form "KP" followed by a number (e.g. KP1234).
- Listing plans start at ₹300 for 30 days (Basic), with Featured, Premium and Premium Plus plans for more visibility; "Quick Sell" is a promoted, faster-selling service.
- Agents, builders and property service providers (legal, survey, construction, interiors, loans) have public profiles.

## Main pages
- [Search all properties](${BASE}/properties): live listings with filters for district, type, price and purpose
- [Property video reels](${BASE}/reels): short video walkthroughs of listed properties
- [Real estate agents](${BASE}/agent): verified agents across Kerala
- [Builders](${BASE}/builders): builders and developers with ongoing projects
- [Property services](${BASE}/services): advocates, surveyors, architects, interior designers, home-loan providers
- [Quick Sell](${BASE}/quick-sell): fast-track selling service for owners
- [Pricing](${BASE}/pricing): listing and subscription plans
- [Guides & FAQs](${BASE}/guides-faqs): buying, selling, registration charges and verification in Kerala
- [Blog](${BASE}/blog): articles on Kerala real estate, land documents and market trends
- [About KeralaPlots](${BASE}/about-us)

## Property by district
${districts}

## Optional
- [Sitemap](${BASE}/sitemap.xml)
- [Privacy policy](${BASE}/privacy-policy)
- [Terms and conditions](${BASE}/terms-conditions)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
