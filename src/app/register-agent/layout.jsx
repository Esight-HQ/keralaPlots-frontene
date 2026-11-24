import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("register-agent", {
    title: "Register as a Real Estate Agent | KeralaPlots",
    description: "Join KeralaPlots as a verified real estate agent. Get a public profile, list properties and receive buyer enquiries from across Kerala.",
    canonical: "https://keralaplots.com/register-agent",
  });
}

export default function RegisterAgentLayout({ children }) {
  return children;
}
