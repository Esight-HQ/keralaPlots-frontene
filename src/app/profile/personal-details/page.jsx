"use client";

import { Suspense, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PersonalDetails from "../PersonalDetails";
import { useAuth } from "../../context/AuthContext";
import { subscribe, getSnapshot, getServerSnapshot } from "../../lib/profileStore";

export default function PersonalDetailsPage() {
    return (
        <Suspense fallback={null}>
            <PersonalDetailsView />
        </Suspense>
    );
}

function PersonalDetailsView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const localProfile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const activeProfile = user || localProfile;

    return (
        <PersonalDetails
            profile={activeProfile}
            savedNote={searchParams.get("saved") ? "Profile updated successfully." : ""}
            onEdit={() => router.push("/profile/personal-details/edit")}
            onViewReviews={() => router.push("/profile/personal-details/reviews")}
        />
    );
}
