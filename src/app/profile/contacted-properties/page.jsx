import { noIndexMetadata } from "../../lib/seoHelper";
import ContactedProperties from "../ContactedProperties";

export const metadata = noIndexMetadata("Contacted Properties");

export default function ContactedPropertiesPage() {
    return <ContactedProperties />;
}
