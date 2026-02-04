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
