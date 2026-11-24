import apiClient from "./api";

const safePost = async (url, data, config) => {
    try {
        const res = await apiClient.post(url, data, config);
        return res.data;
    } catch (err) {
        console.warn(`[agentSubscriptionApi] POST ${url} error:`, err.response?.data?.message || err.message);
        return {
            success: false,
            message: err.response?.data?.message || err.message,
            reason: err.response?.data?.reason,
            status: err.response?.status,
        };
    }
};

const safeGet = async (url) => {
    try {
        const res = await apiClient.get(url);
        return res.data;
    } catch (err) {
        console.warn(`[agentSubscriptionApi] GET ${url} error:`, err.response?.data?.message || err.message);
        return {
            success: false,
            message: err.response?.data?.message || err.message,
            status: err.response?.status,
        };
    }
};

export const loadRazorpayCheckoutScript = () => {
    return new Promise((resolve) => {
        if (typeof window !== "undefined" && window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const agentSubscriptionApi = {
    // 1. Get all active subscription plans
    getPlans: async () => {
        return safeGet("/agent/subscription/plans");
    },

    // 1b. Get all active top-up booster plans (optionally filtered by ?for=property or ?for=reel)
    getTopupPlans: async (forResource = null) => {
        const query = forResource ? `?for=${encodeURIComponent(forResource)}` : "";
        return safeGet(`/agent/subscription/topup-plans${query}`);
    },

    // 1c. Get unified Agent + Builder subscriptions, quotas, and role registration/approval status
    getUnifiedSubscriptions: async () => {
        return safeGet(`/entitlements/my-subscriptions?_t=${Date.now()}`);
    },

    // 1d. Get public live plans across Agent & Builder categories
    getAllPublicPlans: async () => {
        return safeGet(`/plans?_t=${Date.now()}`);
    },

    // 2. Get current active subscription for authenticated agent or builder
    getCurrentSubscription: async (category = null, forResource = null) => {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (forResource) params.set("for", forResource);
        params.set("_t", String(Date.now()));
        return safeGet(`/agent/subscription/current?${params.toString()}`);
    },

    // 3. Get subscription purchase history
    getHistory: async () => {
        return safeGet("/agent/subscription/history");
    },

    // 4. Create Razorpay order to buy legacy agent plan
    createOrder: async (planId) => {
        return safePost("/agent/subscription/create-order", { plan_id: planId });
    },

    // 4b. Create Razorpay order to buy top-up plan
    createTopupOrder: async (planId) => {
        return safePost("/agent/subscription/topup/create-order", { plan_id: planId });
    },

    // 4c. Unified Order creation (supports AGENT_SUBSCRIPTION & BUILDER_SUBSCRIPTION + yearly/monthly billing)
    createUnifiedOrder: async ({ productType, planId, billingInterval = "monthly" }) => {
        return safePost("/payments/create-order", {
            product_type: productType,
            plan_id: planId,
            billing_interval: billingInterval,
        });
    },

    // 5. Verify Razorpay payment and activate subscription
    verifyPayment: async (data) => {
        return safePost("/agent/subscription/verify-payment", data);
    },

    // 5b. Verify Razorpay payment and activate top-up
    verifyTopupPayment: async (data) => {
        return safePost("/agent/subscription/topup/verify-payment", data);
    },

    // 5c. Unified Payment verification (supports AGENT_SUBSCRIPTION & BUILDER_SUBSCRIPTION + yearly/monthly billing)
    verifyUnifiedPayment: async (data) => {
        return safePost("/payments/verify", data);
    },

    // 6. Get detailed quota usage
    getUsage: async () => {
        return safeGet("/agent/subscription/usage");
    },

    // 7. Publish property or reel using active subscription quota
    publishWithSubscription: async (resourceType, resourceId, subscriptionCategory = null) => {
        const res = await safePost("/agent/subscription/publish-with-subscription", {
            resource_type: resourceType,
            resource_id: resourceId,
            ...(subscriptionCategory ? { subscription_category: subscriptionCategory } : {}),
        });
        if (res?.success && typeof BroadcastChannel !== "undefined") {
            try {
                const bc = new BroadcastChannel("kp_subscriptions_sync");
                bc.postMessage({ type: "SUBSCRIPTION_UPDATED", ts: Date.now() });
                bc.close();
            } catch {}
        }
        return res;
    },

    // 8. Get all purchase invoices
    getInvoices: async () => {
        return safeGet("/agent/subscription/invoices");
    },
};

/**
 * End-to-end Razorpay Checkout helper for Agent & Builder Subscriptions.
 */
export async function startSubscriptionCheckout({
    planId,
    category, // "agent_subscription" | "builder_subscription"
    billingInterval = "monthly",
    planTitle = "Subscription Plan",
    isTopup = false,
    onSuccess,
    onError,
    onDismiss,
}) {
    const productType = isTopup
        ? category === "builder_subscription"
            ? "BUILDER_TOPUP"
            : "AGENT_TOPUP"
        : category === "builder_subscription"
        ? "BUILDER_SUBSCRIPTION"
        : "AGENT_SUBSCRIPTION";
    const effectiveInterval = isTopup ? "one_time" : billingInterval;

    const scriptLoaded = await loadRazorpayCheckoutScript();
    if (!scriptLoaded) {
        onError?.({ message: "Razorpay checkout could not load. Please check your internet connection." });
        return;
    }

    const orderRes = await agentSubscriptionApi.createUnifiedOrder({
        productType,
        planId,
        billingInterval: effectiveInterval,
    });

    if (!orderRes?.success || !orderRes?.data) {
        onError?.({
            message: orderRes?.message || "Failed to initialize payment order.",
            reason: orderRes?.reason || null,
            status: orderRes?.status || null,
        });
        return;
    }

    const orderData = orderRes.data;
    const isMockOrder = String(orderData.order_id || "").startsWith("mock_");

    const options = {
        key: orderData.key,
        amount: orderData.amount_in_paise,
        currency: orderData.currency || "INR",
        name: "KeralaPlots",
        description: orderData.product_title || `${planTitle} Subscription`,
        image: "/favicon.ico",
        ...(!isMockOrder && orderData.order_id ? { order_id: orderData.order_id } : {}),
        prefill: {
            name: orderData.user?.name || "",
            email: orderData.user?.email || "",
            contact: orderData.user?.contact || "",
        },
        theme: {
            color: category === "builder_subscription" ? "#4f46e5" : "#12296b",
        },
        handler: async function (response) {
            const verifyRes = await agentSubscriptionApi.verifyUnifiedPayment({
                product_type: productType,
                plan_id: planId,
                billing_interval: effectiveInterval,
                razorpay_order_id: response.razorpay_order_id || orderData.order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || "",
            });

            if (!verifyRes?.success) {
                onError?.({ message: verifyRes?.message || "Payment verification failed." });
                return;
            }

            try {
                localStorage.setItem("kp_subscriptions_updated_at", String(Date.now()));
                if (typeof BroadcastChannel !== "undefined") {
                    const bc = new BroadcastChannel("kp_subscriptions_sync");
                    bc.postMessage("updated");
                    bc.close();
                }
            } catch {
                // ignore
            }

            onSuccess?.(verifyRes);
        },
        modal: {
            ondismiss: function () {
                onDismiss?.();
            },
        },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (fRes) {
        onError?.({ message: fRes?.error?.description || "Payment failed. Please try again." });
    });
    rzp.open();
}
