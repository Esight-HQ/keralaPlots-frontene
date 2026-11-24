import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("terms-conditions", {
    title: "Terms and Conditions | KeralaPlots Property Marketplace",
    description: "Review the terms and conditions governing property listings, user rights, agent policies, and services provided on the KeralaPlots website and apps.",
    canonical: "https://keralaplots.com/terms-conditions",
  });
}

export default function TermsConditionsLayout({ children }) {
  return children;
}
