import { noIndexMetadata } from "../../lib/seoHelper";
import PostedReels from "../PostedReels";

export const metadata = noIndexMetadata("My Posted Reels");

export default function PostedReelsPage() {
    return <PostedReels />;
}
