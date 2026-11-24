import { noIndexMetadata } from "../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Account");

export default function AuthLayout({ children }) {
    return children;
}
