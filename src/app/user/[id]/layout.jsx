import { generateUserMetadata } from "../../lib/seoHelper";

/* Public member profile: gives the page its own title and canonical URL
   (it previously inherited the home page's). */
export async function generateMetadata({ params }) {
    const { id } = await params;
    return generateUserMetadata(id);
}

export default function UserProfileLayout({ children }) {
    return children;
}
