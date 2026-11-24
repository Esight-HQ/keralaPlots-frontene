import { noIndexMetadata } from "../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Notifications");

export default function NotificationsLayout({ children }) {
    return children;
}
