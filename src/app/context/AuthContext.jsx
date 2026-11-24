"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, profileApi } from "../lib/api";
import { markPreferencePromptPending } from "../lib/preferencesStore";
import { syncGuestReelActions } from "../lib/guestReelActionsStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [completion, setCompletion] = useState(null);
    const [loading, setLoading] = useState(true);

    const calculateLocalCompletion = (userData) => {
        if (!userData) return null;
        const details = userData.personal_details || {};

        const fields = [
            { key: "fullname", val: details.fullname || userData.name },
            { key: "photo", val: userData.avatar },
            { key: "gender", val: details.gender },
            { key: "dob", val: details.dob },
            { key: "mobile", val: details.mobile || userData.phone },
            { key: "email", val: details.email || userData.email },
            { key: "address", val: details.address },
            { key: "district", val: details.district },
            { key: "city", val: details.city },
            { key: "occupation", val: details.occupation },
            { key: "experience", val: details.experience },
            { key: "website", val: details.website },
            { key: "social", val: details.instagram || details.facebook || details.linkedin },
        ];

        const total = fields.length;
        const completed = fields.filter((f) => String(f.val || "").trim().length > 0).length;
        const percentage = Math.round((completed / total) * 100);

        return {
            percentage,
            completed_count: completed,
            total_count: total,
        };
    };

    const normalizeUserData = (rawUser) => {
        if (!rawUser) return null;
        const rawRole = String(rawUser.role || rawUser.role_val || "User").toLowerCase();
        const role = rawRole === "agent" ? "Agent" : "User";
        let avatar = rawUser.avatar || rawUser.personal_details?.Image || rawUser.personal_details?.photo;
        if (avatar && (String(avatar).includes("images.unsplash.com/photo-1573496359142-b8d87734a5a2") || String(avatar).includes("ff7c6dab-0418-4d39-7586-932e36dae300"))) {
            avatar = "/user-placeholder.jpg";
        }
        return {
            ...rawUser,
            role,
            avatar: avatar || "/user-placeholder.jpg",
        };
    };

    const refreshProfile = useCallback(async () => {
        try {
            const res = await profileApi.getProfile();
            if (res.success && res.data?.user) {
                const refreshedUser = normalizeUserData(res.data.user);
                setUser(refreshedUser);
                setCompletion(res.data.completion || calculateLocalCompletion(refreshedUser));
                localStorage.setItem("kp_auth_user", JSON.stringify(refreshedUser));
            }
        } catch {
            // silent failure if offline / token invalid
        }
    }, []);

    // Initialize from storage on mount
    useEffect(() => {
        try {
            const storedToken = localStorage.getItem("kp_auth_token");
            const storedUser = localStorage.getItem("kp_auth_user");

            if (storedToken && storedUser) {
                const parsedUser = normalizeUserData(JSON.parse(storedUser));
                setToken(storedToken);
                setUser(parsedUser);
                setCompletion(calculateLocalCompletion(parsedUser));
                // Refresh asynchronously
                refreshProfile();
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }

        const handleAuthChange = () => {
            const u = localStorage.getItem("kp_auth_user");
            const t = localStorage.getItem("kp_auth_token");
            const parsed = u ? normalizeUserData(JSON.parse(u)) : null;
            setUser(parsed);
            setToken(t || null);
            if (parsed) setCompletion(calculateLocalCompletion(parsed));
        };

        window.addEventListener("kp_auth_changed", handleAuthChange);
        return () => window.removeEventListener("kp_auth_changed", handleAuthChange);
    }, [refreshProfile]);

    // Push reel likes/saves made before login to the user's account.
    useEffect(() => {
        if (!token || !user) return;
        syncGuestReelActions().catch(() => {});
    }, [token, user?.id, user?.loginId]); // eslint-disable-line react-hooks/exhaustive-deps

    const login = (userData, authToken) => {
        const normalized = normalizeUserData(userData);
        setUser(normalized);
        setToken(authToken);
        const comp = calculateLocalCompletion(normalized);
        setCompletion(comp);

        try {
            localStorage.setItem("kp_auth_token", authToken);
            localStorage.setItem("kp_auth_user", JSON.stringify(normalized));
            window.dispatchEvent(new Event("kp_auth_changed"));
        } catch {
            // ignore
        }
        // Ask for property preferences once, right after login / sign-up.
        markPreferencePromptPending(normalized);
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch {
            // ignore
        }
        setUser(null);
        setToken(null);
        setCompletion(null);
        try {
            localStorage.removeItem("kp_auth_token");
            localStorage.removeItem("kp_auth_user");
            sessionStorage.removeItem("kp_auth_user");
            window.dispatchEvent(new Event("kp_auth_changed"));
        } catch {
            // ignore
        }
    };

    const updateProfile = async (formDataOrData) => {
        const res = await profileApi.updateProfile(formDataOrData);
        if (res.success && res.data?.user) {
            const updated = res.data.user;
            setUser(updated);
            setCompletion(res.data.completion || calculateLocalCompletion(updated));
            localStorage.setItem("kp_auth_user", JSON.stringify(updated));
            window.dispatchEvent(new Event("kp_auth_changed"));
        }
        return res;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                completion,
                loading,
                login,
                logout,
                refreshProfile,
                updateProfile,
                isAuthenticated: !!token && !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
