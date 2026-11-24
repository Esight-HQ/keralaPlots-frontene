import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("about-us", {
    title: "About KeralaPlots | Kerala’s Leading Real Estate Portal",
    description: "Learn about KeralaPlots, Kerala’s most trusted real estate marketplace connecting genuine buyers, sellers, and verified agents with 100% transparency.",
    canonical: "https://keralaplots.com/about-us",
  });
}

export default function AboutUsLayout({ children }) {
  return children;
}
