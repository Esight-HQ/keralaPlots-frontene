"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import AgentReviews from "../../AgentReviews";
import { useAuth } from "../../../context/AuthContext";
import { subscribe, getSnapshot, getServerSnapshot } from "../../../lib/profileStore";

export default function AgentReviewsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const localProfile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const activeProfile = user || localProfile;

    return (
        <AgentReviews
            profile={activeProfile}
            onBack={() => router.push("/profile/personal-details")}
            onEditProfile={() => router.push("/profile/personal-details/edit")}
        />
    );
}
