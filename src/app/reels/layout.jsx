import { generateDynamicMetadata } from "../lib/seoHelper";

export async function generateMetadata() {
  return await generateDynamicMetadata("reels", {
    title: "Real Estate Video Reels Kerala | Property Walkthroughs",
    description: "Watch short property walkthrough reels and video tours of verified houses, plots, and apartments for sale across Kerala on KeralaPlots Reels.",
    canonical: "https://keralaplots.com/reels",
  });
}

export default function ReelsLayout({ children }) {
  return children;
}
