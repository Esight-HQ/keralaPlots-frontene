import { noIndexMetadata } from "../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Log in");

export default function LoginLayout({ children }) {
    return children;
}
