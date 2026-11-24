import { noIndexMetadata } from "../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Messages");

export default function MessagesLayout({ children }) {
    return children;
}
