import Script from "next/script";
import { AuthProvider } from "./context/AuthContext";
import LazyWidgets from "./componants/lazyWidgets/LazyWidgets";
import PreventZoom from "./componants/PreventZoom/PreventZoom";
import MediaCacheRegister from "./componants/mediaCache/MediaCacheRegister";
// import ChatpierWidget from "./componants/chatWidget/ChatpierWidget";
import DeferredFonts from "./componants/fonts/DeferredFonts";
import AuthScrollManager from "./componants/AuthScrollManager/AuthScrollManager";
import RouteScrollManager from "./componants/RouteScrollManager/RouteScrollManager";
import { SITE_URL, DEFAULT_OG_IMAGE, ogImageEntry } from "./lib/seoHelper";
import { jsonLdHtml } from "./lib/jsonLd";
import "./globals.css";

/* Lock the mobile viewport at 1x so iOS Safari doesn't auto-zoom the page
   when a form field (input / select / textarea) gets focus. */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/* Site-wide defaults only. Each public page sets its own title, description and
   canonical URL; this used to call the "home" SEO API and give EVERY page the
   home page's canonical URL (telling Google they were duplicates of "/"). It is
   now static, so it also no longer adds an API round-trip to every page load. */
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Plots in Kerala | Buy & Sell Property – KeralaPlots",
    template: "%s",
  },
  description:
    "Explore plots in Kerala, property sale and land for sale. Buy, sell, rent or lease houses, villas and flats on KeralaPlots, a Kerala real estate website.",
  applicationName: "KeralaPlots",
  authors: [{ name: "KeralaPlots", url: SITE_URL }],
  publisher: "KeralaPlots",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    siteName: "KeralaPlots",
    locale: "en_IN",
    type: "website",
    images: [ogImageEntry(DEFAULT_OG_IMAGE, "KeralaPlots – Kerala real estate marketplace")],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE] },
  verification: { google: "lI6pRzYNtjUy6yhdmWgAu6O0UYWdBqINaFWHnYY0MDk" },
};

/* Organization + WebSite schema on every page: tells Google, Bing and AI
   answer engines who runs the site and how to search it (sitelinks search box). */
const SITE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "RealEstateAgent"],
      "@id": `${SITE_URL}/#organization`,
      name: "KeralaPlots",
      url: SITE_URL,
      logo: "https://imagedelivery.net/QePV2rqDMo30QKb63DbO_w/ff7c6dab-0418-4d39-7586-932e36dae300/public",
      image: DEFAULT_OG_IMAGE,
      description:
        "KeralaPlots is a Kerala real estate marketplace to buy, sell, rent and lease plots, houses, villas and flats across all 14 districts of Kerala.",
      areaServed: { "@type": "State", name: "Kerala", containedInPlace: { "@type": "Country", name: "India" } },
      address: { "@type": "PostalAddress", addressRegion: "Kerala", addressCountry: "IN" },
      sameAs: [
        "https://www.instagram.com/keralaplots/",
        "https://www.facebook.com/keralaplots/",
        "https://www.linkedin.com/in/kerala-plots-1a34b6249/",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "KeralaPlots",
      url: SITE_URL,
      inLanguage: "en-IN",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/properties?search={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* Open connections to fonts and media CDNs early */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Images are plain (non-CORS) requests, so the preconnect must not be crossOrigin. */}
        <link rel="preconnect" href="https://imagedelivery.net" />
        <link rel="dns-prefetch" href="https://customer-hrtlsfl7dijstj5i.cloudflarestream.com" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(SITE_SCHEMA) }} />
      </head>
      <body suppressHydrationWarning>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WPBQB5VF');`}
        </Script>
        {/* End Google Tag Manager */}
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WPBQB5VF"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <DeferredFonts />
        <PreventZoom />
        <MediaCacheRegister />
        <AuthProvider>
          <RouteScrollManager />
          <AuthScrollManager />
          {children}
          <LazyWidgets />
        </AuthProvider>
        {/* <ChatpierWidget /> */}
      </body>
    </html>
  );
}

