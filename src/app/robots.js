const baseUrl = "https://keralaplots.com";

// Account and internal areas that no crawler should fetch.
const PRIVATE_PATHS = [
  // Internal site search — ephemeral, user-typed query URLs that are
  // already canonicalised to /properties; crawling them wastes
  // budget (SEO audit flagged 285+ of these as "URL: Internal Search").
  "/properties?search=*",
  // Authenticated / account-only areas, not meant to be indexed.
  "/auth/",
  "/login",
  "/profile",
  "/messages",
  "/notifications",
  "/favorites",
  "/compare",
  "/post-property",
  "/post-reel",
  "/builder-portal",
  "/api/",
  "/adminPanel",
  "/agent/subscription",
];

// AI answer-engine crawlers are welcomed explicitly (GEO): being crawlable is
// what lets ChatGPT, Perplexity, Claude, Gemini and Copilot cite KeralaPlots.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: PRIVATE_PATHS },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
