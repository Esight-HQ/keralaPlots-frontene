"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import EditPersonalDetails from "../../EditPersonalDetails";
import { useAuth } from "../../../context/AuthContext";
import {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    saveProfile,
} from "../../../lib/profileStore";

export default function EditPersonalDetailsPage() {
    const router = useRouter();
    const { user, updateProfile, isAuthenticated } = useAuth();
    const [saving, setSaving] = useState(false);

    const localProfile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const activeProfile = user || localProfile;

    const handleSave = async (payload, draft) => {
        setSaving(true);
        try {
            if (isAuthenticated) {
                await updateProfile(payload);
            }
            saveProfile(draft || payload);
            router.push("/profile/personal-details?saved=1");
        } catch {
            // fallback save locally
            saveProfile(draft || payload);
            router.push("/profile/personal-details?saved=1");
        } finally {
            setSaving(false);
        }
    };

    return (
        <EditPersonalDetails
            profile={activeProfile}
            onBack={() => router.push("/profile/personal-details")}
            onSave={handleSave}
            saving={saving}
        />
    );
}
