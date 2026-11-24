import { generateDynamicMetadata } from "../lib/seoHelper";
import { jsonLdHtml } from "../lib/jsonLd";
import { FAQ_DATA } from "./faqData";

/* FAQPage structured data: lets Google, Bing and AI answer engines quote these
   answers directly (the answers are collapsed in the UI). */
const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_DATA.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export async function generateMetadata() {
  return await generateDynamicMetadata("guides-faqs", {
    title: "Real Estate FAQs & User Guides | KeralaPlots Help Center",
    description: "Got questions? Find answers to frequently asked questions about posting properties, quick sell, hiring verified agents, and security on KeralaPlots.",
    canonical: "https://keralaplots.com/guides-faqs",
  });
}

export default function GuidesFaqsLayout({ children }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(FAQ_SCHEMA) }} />
      {children}
    </>
  );
}
