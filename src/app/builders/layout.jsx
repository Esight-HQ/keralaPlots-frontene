import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("builders", {
    title: "Builders & Developers in Kerala | KeralaPlots",
    description: "Find verified home builders and developers across Kerala. Compare service areas and rates, then call or WhatsApp them directly on KeralaPlots.",
    canonical: "https://keralaplots.com/builders",
  });
}

export default function BuildersLayout({ children }) {
  return children;
}
