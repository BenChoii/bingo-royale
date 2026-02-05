"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// Gem packages available for purchase
export const GEM_PACKAGES = {
    starter: { gems: 500, price: 199, label: "Starter Pack" }, // $1.99
    popular: { gems: 1500, price: 499, label: "Popular Pack" }, // $4.99 (Most Popular)
    mega: { gems: 4000, price: 999, label: "Mega Pack" }, // $9.99 (Best Value)
    ultra: { gems: 10000, price: 1999, label: "Ultra Pack" }, // $19.99 (Whale Pack)
};

// Create Stripe checkout session for gem purchase
export const createCheckoutSession = action({
    args: {
        userId: v.id("users"),
        packageId: v.string(),
        successUrl: v.string(),
        cancelUrl: v.string(),
    },
    handler: async (ctx, args): Promise<{ sessionId: string; url: string | null }> => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey);

        const packageInfo = GEM_PACKAGES[args.packageId as keyof typeof GEM_PACKAGES];
        if (!packageInfo) {
            throw new Error(`Invalid package: ${args.packageId}`);
        }

        // Verify user exists
        const user = await ctx.runQuery(internal.paymentHelpers.getUser, { userId: args.userId });
        if (!user) {
            throw new Error("User not found");
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `💎 ${packageInfo.gems.toLocaleString()} Gems`,
                            description: `Bingo Royale ${packageInfo.label}`,
                        },
                        unit_amount: packageInfo.price,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${args.successUrl}?session_id={CHECKOUT_SESSION_ID}&package=${args.packageId}`,
            cancel_url: args.cancelUrl,
            metadata: {
                userId: args.userId,
                packageId: args.packageId,
                gems: packageInfo.gems.toString(),
            },
        });

        return { sessionId: session.id, url: session.url };
    },
});

// Verify payment and grant gems
export const verifyPayment = action({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args): Promise<{ success: boolean; error?: string; gems?: number; newBalance?: number }> => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey);

        const session = await stripe.checkout.sessions.retrieve(args.sessionId);

        if (session.payment_status !== "paid") {
            return { success: false, error: "Payment not completed" };
        }

        const userId = session.metadata?.userId;
        const gems = parseInt(session.metadata?.gems || "0");

        if (!userId || gems <= 0) {
            return { success: false, error: "Invalid session metadata" };
        }

        // Grant gems via internal mutation
        const result = await ctx.runMutation(internal.paymentHelpers.grantGems, {
            userId: userId as any,
            gems,
            sessionId: args.sessionId,
        });

        return { success: true, gems, newBalance: result.newBalance };
    },
});

// Subscription tiers (20% cheaper per gem than individual)
export const SUBSCRIPTION_TIERS = {
    bronze: { price: 2800, gems: 17500, label: "Bronze", emoji: "🥉" }, // $28/mo
    silver: { price: 5800, gems: 40000, label: "Silver", emoji: "🥈" }, // $58/mo
    gold: { price: 12000, gems: 90000, label: "Gold", emoji: "🥇" }, // $120/mo
    diamond: { price: 20000, gems: 160000, label: "Diamond", emoji: "💎" }, // $200/mo
    vip: { price: 30000, gems: 280000, label: "VIP", emoji: "👑" }, // $300/mo
};

// Create Stripe subscription checkout
export const createSubscriptionCheckout = action({
    args: {
        userId: v.id("users"),
        tier: v.string(),
        successUrl: v.string(),
        cancelUrl: v.string(),
    },
    handler: async (ctx, args): Promise<{ sessionId: string; url: string | null }> => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey);

        const tierInfo = SUBSCRIPTION_TIERS[args.tier as keyof typeof SUBSCRIPTION_TIERS];
        if (!tierInfo) {
            throw new Error(`Invalid tier: ${args.tier}`);
        }

        // Verify user exists
        const user = await ctx.runQuery(internal.paymentHelpers.getUser, { userId: args.userId });
        if (!user) {
            throw new Error("User not found");
        }

        // Check for existing active subscription
        const existingSub = await ctx.runQuery(internal.paymentHelpers.getActiveSubscription, { userId: args.userId });
        if (existingSub) {
            throw new Error("User already has an active subscription. Please cancel or upgrade first.");
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "cad", // Canadian dollars
                        product_data: {
                            name: `${tierInfo.emoji} ${tierInfo.label} Subscription`,
                            description: `${tierInfo.gems.toLocaleString()} Gems/month - Bingo Royale`,
                        },
                        unit_amount: tierInfo.price,
                        recurring: {
                            interval: "month",
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: "subscription",
            // Enable automatic tax for BC, Canada
            automatic_tax: { enabled: true },
            tax_id_collection: { enabled: true },
            customer_creation: "always",
            success_url: `${args.successUrl}?session_id={CHECKOUT_SESSION_ID}&tier=${args.tier}&type=subscription`,
            cancel_url: args.cancelUrl,
            metadata: {
                userId: args.userId,
                tier: args.tier,
                gems: tierInfo.gems.toString(),
            },
            subscription_data: {
                metadata: {
                    userId: args.userId,
                    tier: args.tier,
                    gems: tierInfo.gems.toString(),
                },
            },
        });

        return { sessionId: session.id, url: session.url };
    },
});

// Verify subscription and grant gems
export const verifySubscription = action({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args): Promise<{ success: boolean; error?: string; gems?: number; tier?: string }> => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey);

        const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
            expand: ["subscription"],
        });

        if (session.payment_status !== "paid") {
            return { success: false, error: "Payment not completed" };
        }

        const subscription = session.subscription as Stripe.Subscription;
        if (!subscription) {
            return { success: false, error: "Subscription not found" };
        }

        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;
        const gems = parseInt(session.metadata?.gems || "0");

        if (!userId || !tier || gems <= 0) {
            return { success: false, error: "Invalid session metadata" };
        }

        // Create subscription record and grant gems
        await ctx.runMutation(internal.paymentHelpers.createSubscriptionRecord, {
            userId: userId as any,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id || "",
            tier,
            monthlyGems: gems,
            currentPeriodEnd: subscription.current_period_end * 1000,
        });

        return { success: true, gems, tier };
    },
});

// Cancel subscription
export const cancelSubscription = action({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey);

        // Get active subscription
        const subscription = await ctx.runQuery(internal.paymentHelpers.getActiveSubscription, { userId: args.userId });
        if (!subscription) {
            return { success: false, error: "No active subscription found" };
        }

        // Cancel in Stripe (at period end)
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        // Update status
        await ctx.runMutation(internal.paymentHelpers.updateSubscription, {
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            status: "canceled",
        });

        return { success: true };
    },
});

// Upgrade subscription to higher tier
export const upgradeSubscription = action({
    args: {
        userId: v.id("users"),
        newTier: v.string(),
    },
    handler: async (ctx, args): Promise<{ success: boolean; error?: string; url?: string }> => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error("Stripe secret key not configured");
        }

        const stripe = new Stripe(stripeSecretKey);

        const tierInfo = SUBSCRIPTION_TIERS[args.newTier as keyof typeof SUBSCRIPTION_TIERS];
        if (!tierInfo) {
            return { success: false, error: "Invalid tier" };
        }

        // Get current subscription
        const subscription = await ctx.runQuery(internal.paymentHelpers.getActiveSubscription, { userId: args.userId });
        if (!subscription) {
            return { success: false, error: "No active subscription to upgrade" };
        }

        // Get Stripe subscription
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

        // Create new price
        const newPrice = await stripe.prices.create({
            currency: "cad",
            unit_amount: tierInfo.price,
            recurring: { interval: "month" },
            product_data: {
                name: `${tierInfo.emoji} ${tierInfo.label} Subscription`,
            },
        });

        // Update subscription to new tier (prorated)
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            items: [
                {
                    id: stripeSub.items.data[0].id,
                    price: newPrice.id,
                },
            ],
            proration_behavior: "create_prorations",
            metadata: {
                userId: args.userId,
                tier: args.newTier,
                gems: tierInfo.gems.toString(),
            },
        });

        // Update local record
        await ctx.runMutation(internal.paymentHelpers.createSubscriptionRecord, {
            userId: args.userId,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripePriceId: newPrice.id,
            tier: args.newTier,
            monthlyGems: tierInfo.gems,
            currentPeriodEnd: subscription.currentPeriodEnd,
        });

        return { success: true };
    },
});
