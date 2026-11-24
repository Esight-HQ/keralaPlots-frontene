import { noIndexMetadata } from "../../lib/seoHelper";
import AddedProperties from "../AddedProperties";

export const metadata = noIndexMetadata("My Added Properties");

export default function AddedPropertiesPage() {
    return <AddedProperties />;
}
