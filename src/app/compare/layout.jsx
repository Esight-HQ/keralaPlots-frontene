import { noIndexMetadata } from "../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Compare properties");

export default function CompareLayout({ children }) {
    return children;
}
