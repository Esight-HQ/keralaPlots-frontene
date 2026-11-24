import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("properties", {
    title: "Verified Properties for Sale & Rent in Kerala | KeralaPlots",
    description: "Browse verified plots, residential houses, luxury villas, and commercial spaces across all 14 districts in Kerala. Filter by price and location.",
    canonical: "https://keralaplots.com/properties",
  });
}

export default function PropertiesLayout({ children }) {
  return children;
}
