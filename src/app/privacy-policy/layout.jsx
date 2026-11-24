import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("privacy-policy", {
    title: "Privacy Policy | KeralaPlots Real Estate Marketplace",
    description: "Read KeralaPlots Privacy Policy to understand how we collect, use, and protect your personal and property data when using our platform and mobile services.",
    canonical: "https://keralaplots.com/privacy-policy",
  });
}

export default function PrivacyPolicyLayout({ children }) {
  return children;
}
