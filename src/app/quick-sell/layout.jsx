import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("quick-sell", {
    title: "Quick Sell Property in Kerala | Fast Real Estate Selling",
    description: "Sell your plot, villa, or house in Kerala quickly. Get maximum exposure, expert agent assistance, and genuine buyers fast on KeralaPlots marketplace.",
    canonical: "https://keralaplots.com/quick-sell",
  });
}

export default function QuickSellLayout({ children }) {
  return children;
}
