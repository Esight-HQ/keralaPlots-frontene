import { noIndexMetadata } from "../../lib/seoHelper";
import SavedProperties from "../SavedProperties";

export const metadata = noIndexMetadata("Saved Properties & Reels");

export default function SavedPropertiesPage() {
    return <SavedProperties />;
}
