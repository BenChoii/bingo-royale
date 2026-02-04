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
