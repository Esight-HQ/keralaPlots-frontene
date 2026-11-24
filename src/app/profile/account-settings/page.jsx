import { noIndexMetadata } from "../../lib/seoHelper";
import AccountSettings from "../AccountSettings";

export const metadata = noIndexMetadata("Account Settings");

export default function AccountSettingsPage() {
    return <AccountSettings />;
}
