"use client";

import { useState, useEffect, useCallback } from "react";
import { agentSubscriptionApi } from "../lib/agentSubscriptionApi";

export function useAgentSubscription() {
    const [subscription, setSubscription] = useState(null);
    const [isAgent, setIsAgent] = useState(false);
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState([]);

    const fetchSubscription = useCallback(async () => {
        try {
            setLoading(true);
            const [subRes, plansRes] = await Promise.all([
                agentSubscriptionApi.getCurrentSubscription(),
                agentSubscriptionApi.getPlans(),
            ]);

            if (subRes?.success) {
                setIsAgent(!!subRes.is_agent);
                setSubscription(subRes.data?.subscription || null);
            }
            if (plansRes?.success) {
                setPlans(plansRes.data || []);
            }
        } catch (err) {
            console.error("[useAgentSubscription] fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    const isActive = !!(subscription && subscription.is_active);

    return {
        subscription,
        isActive,
        isAgent,
        loading,
        plans,
        // Property limits
        propertyUsed: subscription?.property_used ?? 0,
        propertyLimit: subscription?.property_limit ?? 0,
        propertyRemaining: subscription?.property_remaining,
        propertyUnlimited: !!subscription?.property_unlimited,
        // Reel limits
        reelUsed: subscription?.reel_used ?? 0,
        reelLimit: subscription?.reel_limit ?? 0,
        reelRemaining: subscription?.reel_remaining,
        reelUnlimited: !!subscription?.reel_unlimited,
        // Expiry
        expiresAt: subscription?.expires_at,
        expiresAtFormatted: subscription?.expires_at_formatted,
        daysRemaining: subscription?.days_remaining ?? 0,
        isExpiringSoon: !!subscription?.is_expiring_soon,
        refresh: fetchSubscription,
    };
}
