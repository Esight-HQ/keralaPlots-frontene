import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("blog", {
    title: "Kerala Real Estate Blog | Property Insights & Trends",
    description: "Practical Kerala property guides for buyers, sellers and renters. Explore site visit checklists, neighbourhood comparisons and more from KeralaPlots.",
    canonical: "https://keralaplots.com/blog",
  });
}

export default function BlogLayout({ children }) {
  return children;
}
