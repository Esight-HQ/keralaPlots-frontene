"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dashboardApi } from "./api";
import { useAuth } from "../context/AuthContext";

export function useDashboard(initialRange = "30") {
    const { isAuthenticated } = useAuth();
    const [range, setRange] = useState(initialRange);
    const [selectedProperties, setSelectedProperties] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const hasInitializedSelection = useRef(false);

    const fetchDashboard = useCallback(async (opts = {}) => {
        if (!isAuthenticated) return;
        const currentRange = opts.range || range;
        const currentSelected = opts.selectedProperties !== undefined ? opts.selectedProperties : selectedProperties;

        try {
            if (!opts.silent) setLoading(true);
            const params = {
                range: currentRange,
            };
            if (currentSelected && currentSelected.length > 0) {
                params.properties = currentSelected.join(",");
            }

            const res = await dashboardApi.get(params);
            if (res.success && res.data) {
                setData(res.data);
                setError(null);

                // Auto-select all properties or the first one on initial load if none selected
                if (!hasInitializedSelection.current && res.data.tracked_properties?.length > 0) {
                    hasInitializedSelection.current = true;
                    const allIds = res.data.tracked_properties.map((p) => String(p.id));
                    setSelectedProperties(allIds);
                }
            }
        } catch (err) {
            console.error("Failed to load user dashboard data:", err);
            setError(err?.response?.data?.message || "Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, range, selectedProperties]);

    // Initial fetch
    useEffect(() => {
        if (isAuthenticated) {
            fetchDashboard();
        }
    }, [isAuthenticated, range]);

    // Toggle property selection for chart
    const toggleProperty = useCallback((propertyId) => {
        const idStr = String(propertyId);
        setSelectedProperties((prev) => {
            let next;
            if (prev.includes(idStr)) {
                next = prev.length === 1 ? prev : prev.filter((p) => p !== idStr);
            } else {
                next = [...prev, idStr];
            }
            fetchDashboard({ selectedProperties: next, silent: true });
            return next;
        });
    }, [fetchDashboard]);

    // Select or unselect every tracked property in one action
    const toggleAllProperties = useCallback(() => {
        const allIds = (data?.tracked_properties || []).map((p) => String(p.id));
        if (allIds.length === 0) return;

        setSelectedProperties((prev) => {
            const next = prev.length >= allIds.length ? allIds.slice(0, 1) : allIds;
            fetchDashboard({ selectedProperties: next, silent: true });
            return next;
        });
    }, [data, fetchDashboard]);

    // Change range
    const handleRangeChange = useCallback((newRange) => {
        setRange(newRange);
        fetchDashboard({ range: newRange, silent: false });
    }, [fetchDashboard]);

    return {
        data,
        loading,
        error,
        range,
        setRange: handleRangeChange,
        selectedProperties,
        toggleProperty,
        toggleAllProperties,
        refetch: fetchDashboard,
        stats: data?.stats || { favorites: 0, added: 0, contacted: 0, views: 0 },
        chartData: data?.chart || [],
        trackedProperties: data?.tracked_properties || [],
        recentProperties: data?.recently_viewed || [],
        addedProperties: data?.added_properties || [],
        agentStatus: data?.agent_status || null,
        completion: data?.profile_completion || null,
        notifications: data?.notifications || { unread_count: 0, latest: [] },
    };
}
