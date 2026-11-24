import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("pricing", {
    title: "Listing Packages & Pricing | KeralaPlots",
    description:
      "Choose a KeralaPlots listing package — Basic, Featured, Premium or Premium Plus — for the right visibility across Kerala. Plans from ₹300.",
    canonical: "https://keralaplots.com/pricing",
  });
}

export default function PricingLayout({ children }) {
  return children;
}
