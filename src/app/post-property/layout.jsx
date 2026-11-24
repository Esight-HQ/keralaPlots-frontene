import { noIndexMetadata } from "../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Post a property");

export default function PostPropertyLayout({ children }) {
    return children;
}
