"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Nav from "../componants/nav/nav";
import ProfileSidebar from "../componants/profileSidebar/profileSidebar";
import styles from "./profile.module.css";
import { useAuth } from "../context/AuthContext";

/**
 * Shell shared by every profile route.
 * Only authenticated users can access any route under /profile.
 * If not logged in, immediately redirects to /login.
 */
export default function ProfileLayout({ children }) {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
            router.replace(redirectUrl);
        }
    }, [isAuthenticated, loading, router, pathname]);

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <>
                <Nav />
                <div className={styles.page}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "60vh",
                        flexDirection: "column",
                        gap: "16px"
                    }}>
                        <div
                            className={styles.spinner}
                            style={{
                                width: "36px",
                                height: "36px",
                                border: "3px solid #e2e8f0",
                                borderTopColor: "#1d4ed8",
                                borderRadius: "50%",
                            }}
                        />
                        <p style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
                            Verifying your session...
                        </p>
                    </div>
                </div>
            </>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            <Nav />

            <div className={styles.page}>
                <div className={styles.shell}>
                    <ProfileSidebar user={user} />

                    <main className={styles.main}>{children}</main>
                </div>
            </div>
        </>
    );
}
