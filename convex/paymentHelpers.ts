import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query to get user
export const getUser = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// Internal mutation to grant gems
export const grantGems = internalMutation({
    args: {
        userId: v.id("users"),
        gems: v.number(),
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Check if we've already processed this session (idempotency)
        const existingPurchase = await ctx.db
            .query("purchases")
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();

        if (existingPurchase) {
            return { success: true, alreadyProcessed: true, newBalance: user.coins };
        }

        // Grant gems
        const newBalance = (user.coins || 0) + args.gems;
        await ctx.db.patch(args.userId, {
            coins: newBalance,
        });

        // Record purchase for idempotency
        await ctx.db.insert("purchases", {
            userId: args.userId,
            sessionId: args.sessionId,
            gems: args.gems,
            createdAt: Date.now(),
        });

        return { success: true, alreadyProcessed: false, newBalance };
    },
});

// Get user's active subscription
export const getActiveSubscription = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("subscriptions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();
    },
});

// Update subscription status
export const updateSubscription = internalMutation({
    args: {
        stripeSubscriptionId: v.string(),
        status: v.string(),
        currentPeriodEnd: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("by_stripe_id", (q) => q.eq("stripeSubscriptionId", args.stripeSubscriptionId))
            .first();

        if (!subscription) {
            throw new Error("Subscription not found");
        }

        const updates: any = { status: args.status };
        if (args.currentPeriodEnd) {
            updates.currentPeriodEnd = args.currentPeriodEnd;
        }

        await ctx.db.patch(subscription._id, updates);
        return { success: true };
    },
});

// Create new subscription record
export const createSubscriptionRecord = internalMutation({
    args: {
        userId: v.id("users"),
        stripeSubscriptionId: v.string(),
        stripePriceId: v.string(),
        tier: v.string(),
        monthlyGems: v.number(),
        currentPeriodEnd: v.number(),
    },
    handler: async (ctx, args) => {
        // Check for existing subscription
        const existing = await ctx.db
            .query("subscriptions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        if (existing) {
            // Update existing
            await ctx.db.patch(existing._id, {
                stripeSubscriptionId: args.stripeSubscriptionId,
                stripePriceId: args.stripePriceId,
                tier: args.tier as any,
                monthlyGems: args.monthlyGems,
                currentPeriodEnd: args.currentPeriodEnd,
                status: "active",
            });
        } else {
            // Create new
            await ctx.db.insert("subscriptions", {
                userId: args.userId,
                stripeSubscriptionId: args.stripeSubscriptionId,
                stripePriceId: args.stripePriceId,
                tier: args.tier as any,
                status: "active",
                monthlyGems: args.monthlyGems,
                currentPeriodEnd: args.currentPeriodEnd,
                createdAt: Date.now(),
            });
        }

        // Grant initial gems
        const user = await ctx.db.get(args.userId);
        if (user) {
            await ctx.db.patch(args.userId, {
                coins: (user.coins || 0) + args.monthlyGems,
            });
        }

        return { success: true, gemsGranted: args.monthlyGems };
    },
});
