import { noIndexMetadata } from "../../lib/seoHelper";
import Enquiries from "../Enquiries";

export const metadata = noIndexMetadata("Enquiries");

export default function EnquiriesPage() {
    return <Enquiries />;
}
