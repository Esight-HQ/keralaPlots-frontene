import { BUILDERS } from "../buildersData";
import { SITE_URL, DEFAULT_OG_IMAGE, ogImageEntry, truncateAtWord } from "../../lib/seoHelper";

const titleCase = (slug) =>
    String(slug || "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();

export async function generateMetadata({ params }) {
    const { id } = await params;
    const raw = decodeURIComponent(String(id || "")).slice(0, 100);
    const local = BUILDERS.find((b) => b.id === raw || b.slug === raw);
    const name = local?.name || titleCase(raw) || "Builder";
    const place = local?.place ? ` in ${local.place}` : " in Kerala";
    const title = truncateAtWord(`${name} – Builder & Developer${place} | KeralaPlots`, 60);
    const description = truncateAtWord(
        `${name}: ongoing and completed projects, amenities, location and enquiry details for this builder${place} on KeralaPlots.`,
        155
    );
    const url = `${SITE_URL}/builders/${encodeURIComponent(raw)}`;
    return {
        title,
        description,
        alternates: { canonical: url },
        // Sample builders are placeholders and must not be indexed.
        robots: raw.startsWith("sample-") ? { index: false, follow: true } : undefined,
        openGraph: { title, description, url, siteName: "KeralaPlots", locale: "en_IN", type: "website", images: [ogImageEntry(DEFAULT_OG_IMAGE, title)] },
    };
}

export default function BuilderDetailLayout({ children }) {
    return children;
}
