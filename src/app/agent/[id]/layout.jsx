import { generateAgentMetadata, getAgentForSeo, agentDisplay, SITE_URL } from "../../lib/seoHelper";
import { jsonLdHtml } from "../../lib/jsonLd";

/* The agent page itself is a client component, so its title, description,
   canonical URL and structured data are produced here on the server. */
export async function generateMetadata({ params }) {
    const { id } = await params;
    return generateAgentMetadata(id);
}

export default async function AgentProfileLayout({ children, params }) {
    const { id } = await params;
    const a = /^\d{1,12}$/.test(String(id)) ? agentDisplay(await getAgentForSeo(id)) : null;
    const url = `${SITE_URL}/agent/${id}`;
    const schema = a && {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "RealEstateAgent",
                "@id": `${url}#agent`,
                name: a.name,
                url,
                ...(a.image && /^https:\/\//.test(a.image) ? { image: a.image } : {}),
                ...(a.bio ? { description: a.bio } : {}),
                areaServed: a.place ? `${a.place}, Kerala` : "Kerala",
                address: { "@type": "PostalAddress", addressRegion: "Kerala", addressCountry: "IN", ...(a.place ? { addressLocality: a.place } : {}) },
                memberOf: { "@id": `${SITE_URL}/#organization` },
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                    { "@type": "ListItem", position: 2, name: "Agents", item: `${SITE_URL}/agent` },
                    { "@type": "ListItem", position: 3, name: a.name, item: url },
                ],
            },
        ],
    };
    return (
        <>
            {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(schema) }} />}
            {children}
        </>
    );
}
