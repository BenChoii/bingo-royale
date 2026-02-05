import { query } from "./_generated/server";
import { v } from "convex/values";

// Get user's active subscription (public query for frontend)
export const getActiveSubscription = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        return subscription;
    },
});

// Get user's purchase history
export const getPurchaseHistory = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const purchases = await ctx.db
            .query("purchases")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(20);

        return purchases;
    },
});
