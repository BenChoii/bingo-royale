import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ===== SYNDICATE/TEAM MANAGEMENT =====

// Create a new syndicate (team)
export const createSyndicate = mutation({
    args: {
        userId: v.id("users"),
        name: v.string(),
        logo: v.string(),
        color: v.string(),
        isPublic: v.boolean(),
    },
    handler: async (ctx, args) => {
        // Check if user already leads a syndicate
        const existingLeadership = await ctx.db
            .query("syndicates")
            .withIndex("by_leader", (q) => q.eq("leaderId", args.userId))
            .first();

        if (existingLeadership) {
            return { success: false, error: "You already lead a syndicate" };
        }

        // Check if user is already in a syndicate
        const existingMembership = await ctx.db
            .query("syndicateMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (existingMembership) {
            return { success: false, error: "You must leave your current syndicate first" };
        }

        // Check for duplicate name
        const existingName = await ctx.db
            .query("syndicates")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();

        if (existingName) {
            return { success: false, error: "Syndicate name already taken" };
        }

        // Create the syndicate
        const syndicateId = await ctx.db.insert("syndicates", {
            name: args.name,
            logo: args.logo,
            color: args.color,
            leaderId: args.userId,
            treasury: 0,
            defaultTitheRate: 10, // 10% default
            weeklyWins: 0,
            weeklyBossKills: 0,
            memberCount: 1,
            isPublic: args.isPublic,
            createdAt: Date.now(),
        });

        // Add leader as first member
        await ctx.db.insert("syndicateMembers", {
            syndicateId,
            userId: args.userId,
            role: "leader",
            weeklyContribution: 0,
            totalContribution: 0,
            joinedAt: Date.now(),
        });

        return { success: true, syndicateId };
    },
});

// Join a syndicate
export const joinSyndicate = mutation({
    args: {
        userId: v.id("users"),
        syndicateId: v.id("syndicates"),
    },
    handler: async (ctx, args) => {
        const syndicate = await ctx.db.get(args.syndicateId);
        if (!syndicate) {
            return { success: false, error: "Syndicate not found" };
        }

        if (!syndicate.isPublic) {
            return { success: false, error: "This syndicate is private (invite only)" };
        }

        // Check if user is already in a syndicate
        const existingMembership = await ctx.db
            .query("syndicateMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (existingMembership) {
            return { success: false, error: "You must leave your current syndicate first" };
        }

        // Add member
        await ctx.db.insert("syndicateMembers", {
            syndicateId: args.syndicateId,
            userId: args.userId,
            role: "member",
            weeklyContribution: 0,
            totalContribution: 0,
            joinedAt: Date.now(),
        });

        // Update member count
        await ctx.db.patch(args.syndicateId, {
            memberCount: syndicate.memberCount + 1,
        });

        return { success: true };
    },
});

// Leave a syndicate
export const leaveSyndicate = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const membership = await ctx.db
            .query("syndicateMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!membership) {
            return { success: false, error: "Not in a syndicate" };
        }

        if (membership.role === "leader") {
            return { success: false, error: "Leaders cannot leave. Transfer leadership or disband." };
        }

        const syndicate = await ctx.db.get(membership.syndicateId);
        if (syndicate) {
            await ctx.db.patch(syndicate._id, {
                memberCount: Math.max(0, syndicate.memberCount - 1),
            });
        }

        await ctx.db.delete(membership._id);

        return { success: true };
    },
});

// Contribute gems to syndicate treasury
export const contributeToTreasury = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        if (args.amount <= 0) {
            return { success: false, error: "Amount must be positive" };
        }

        const user = await ctx.db.get(args.userId);
        if (!user || user.coins < args.amount) {
            return { success: false, error: "Insufficient gems" };
        }

        const membership = await ctx.db
            .query("syndicateMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!membership) {
            return { success: false, error: "Not in a syndicate" };
        }

        const syndicate = await ctx.db.get(membership.syndicateId);
        if (!syndicate) {
            return { success: false, error: "Syndicate not found" };
        }

        // Deduct from user
        await ctx.db.patch(args.userId, {
            coins: user.coins - args.amount,
        });

        // Add to treasury
        await ctx.db.patch(syndicate._id, {
            treasury: syndicate.treasury + args.amount,
        });

        // Update member contribution
        await ctx.db.patch(membership._id, {
            weeklyContribution: membership.weeklyContribution + args.amount,
            totalContribution: membership.totalContribution + args.amount,
        });

        return { success: true, newTreasury: syndicate.treasury + args.amount };
    },
});

// Get syndicate details
export const getSyndicate = query({
    args: {
        syndicateId: v.id("syndicates"),
    },
    handler: async (ctx, args) => {
        const syndicate = await ctx.db.get(args.syndicateId);
        if (!syndicate) return null;

        const members = await ctx.db
            .query("syndicateMembers")
            .withIndex("by_syndicate", (q) => q.eq("syndicateId", args.syndicateId))
            .collect();

        const membersWithDetails = await Promise.all(
            members.map(async (member) => {
                const user = await ctx.db.get(member.userId);
                return {
                    userId: member.userId,
                    name: user?.name || "Unknown",
                    avatar: user?.avatar || "👤",
                    level: user?.level || 1,
                    role: member.role,
                    weeklyContribution: member.weeklyContribution,
                    totalContribution: member.totalContribution,
                    joinedAt: member.joinedAt,
                };
            })
        );

        return {
            ...syndicate,
            members: membersWithDetails,
        };
    },
});

// Get user's syndicate
export const getMySyndicate = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const membership = await ctx.db
            .query("syndicateMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!membership) return null;

        const syndicate = await ctx.db.get(membership.syndicateId);
        if (!syndicate) return null;

        return {
            syndicateId: syndicate._id,
            name: syndicate.name,
            logo: syndicate.logo,
            color: syndicate.color,
            treasury: syndicate.treasury,
            memberCount: syndicate.memberCount,
            role: membership.role,
        };
    },
});

// Get public syndicates (for browsing)
export const getPublicSyndicates = query({
    args: {},
    handler: async (ctx) => {
        const syndicates = await ctx.db
            .query("syndicates")
            .filter((q) => q.eq(q.field("isPublic"), true))
            .take(50);

        return syndicates.map((s) => ({
            id: s._id,
            name: s.name,
            logo: s.logo,
            color: s.color,
            memberCount: s.memberCount,
            weeklyWins: s.weeklyWins,
        }));
    },
});

// Get syndicate leaderboard
export const getSyndicateLeaderboard = query({
    args: {},
    handler: async (ctx) => {
        const syndicates = await ctx.db
            .query("syndicates")
            .take(100);

        // Sort by weekly wins
        const sorted = syndicates.sort((a, b) => b.weeklyWins - a.weeklyWins);

        return sorted.slice(0, 20).map((s, index) => ({
            rank: index + 1,
            id: s._id,
            name: s.name,
            logo: s.logo,
            color: s.color,
            memberCount: s.memberCount,
            weeklyWins: s.weeklyWins,
            weeklyBossKills: s.weeklyBossKills,
        }));
    },
});
