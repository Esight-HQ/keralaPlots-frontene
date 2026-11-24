import { noIndexMetadata } from "../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Builder portal");

export default function BuilderPortalLayout({ children }) {
    return children;
}
