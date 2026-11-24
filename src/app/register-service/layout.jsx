import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("register-service", {
    title: "Register Your Property Service | KeralaPlots",
    description: "List your property-related service on KeralaPlots – legal, survey, construction, interiors and more – and reach buyers and owners across Kerala.",
    canonical: "https://keralaplots.com/register-service",
  });
}

export default function RegisterServiceLayout({ children }) {
  return children;
}
