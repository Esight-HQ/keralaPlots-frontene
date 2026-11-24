import { noIndexMetadata } from "../../lib/seoHelper";

/* Private / account page: never shown in search results. */
export const metadata = noIndexMetadata("Agent subscription");

export default function AgentSubscriptionLayout({ children }) {
    return children;
}
