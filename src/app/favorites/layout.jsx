import { noIndexMetadata } from "../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Saved properties");

export default function FavoritesLayout({ children }) {
    return children;
}
