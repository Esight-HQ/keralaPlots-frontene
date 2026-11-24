import { noIndexMetadata } from "../../lib/seoHelper";
import Preferences from "../Preferences";

export const metadata = noIndexMetadata("My Preferences");

export default function PreferencesPage() {
    return <Preferences />;
}
