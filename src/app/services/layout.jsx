import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("services", {
    title: "Home Construction Services in Kerala | KeralaPlots",
    description: "Find verified architects, home builders, interior designers, surveyors, legal advisors, and maintenance professionals across Kerala on KeralaPlots.",
    canonical: "https://keralaplots.com/services",
  });
}

export default function ServicesLayout({ children }) {
  return children;
}
