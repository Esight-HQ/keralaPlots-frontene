import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("agents", {
    title: "Verified Real Estate Agents in Kerala | KeralaPlots",
    description: "Connect with trusted and verified real estate agents across Kerala. Find experienced property advisors in Kochi, Kozhikode, Trivandrum, and more.",
    canonical: "https://keralaplots.com/agent",
  });
}

export default function AgentLayout({ children }) {
  return children;
}
