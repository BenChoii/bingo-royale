import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get leaderboard
export const getLeaderboard = query({
    args: {
        period: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("alltime")
        ),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 10;

        // For simplicity, we'll query users directly and sort
        // In production, you'd maintain separate leaderboard entries
        const users = await ctx.db
            .query("users")
            .order("desc")
            .take(100);

        // Sort by wins for now
        const sorted = users.sort((a, b) => b.totalWins - a.totalWins);

        return sorted.slice(0, limit).map((user, index) => ({
            rank: index + 1,
            odId: user._id,
            name: user.name,
            avatar: user.avatar,
            level: user.level,
            wins: user.totalWins,
            streak: user.bestStreak,
        }));
    },
});

// Get user's rank
export const getUserRank = query({
    args: { odId: v.id("users") },
    handler: async (ctx, args) => {
        const targetUser = await ctx.db.get(args.odId);
        if (!targetUser) return null;

        const users = await ctx.db
            .query("users")
            .order("desc")
            .collect();

        const sorted = users.sort((a, b) => b.totalWins - a.totalWins);
        const rank = sorted.findIndex((u) => u._id === args.odId) + 1;

        return {
            rank,
            totalPlayers: users.length,
            wins: targetUser.totalWins,
        };
    },
});

// Get rank title based on level
export const getRankTitle = query({
    args: { level: v.number() },
    handler: async (ctx, args) => {
        if (args.level >= 50) return { title: "Champion", emoji: "👑", color: "#FFD700" };
        if (args.level >= 40) return { title: "Diamond", emoji: "💎", color: "#B9F2FF" };
        if (args.level >= 30) return { title: "Platinum", emoji: "🌟", color: "#E5E4E2" };
        if (args.level >= 20) return { title: "Gold", emoji: "🥇", color: "#FFD700" };
        if (args.level >= 10) return { title: "Silver", emoji: "🥈", color: "#C0C0C0" };
        if (args.level >= 5) return { title: "Bronze", emoji: "🥉", color: "#CD7F32" };
        return { title: "Rookie", emoji: "🌱", color: "#90EE90" };
    },
});
