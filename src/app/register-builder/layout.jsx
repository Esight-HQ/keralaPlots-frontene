import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("register-builder", {
    title: "Register as a Builder | KeralaPlots",
    description: "List your construction company or development firm on KeralaPlots. Submit your details for verification and reach home buyers across Kerala.",
    canonical: "https://keralaplots.com/register-builder",
  });
}

export default function RegisterBuilderLayout({ children }) {
  return children;
}
