import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Random avatar options
const AVATARS = ["😎", "🤠", "🥳", "😈", "👻", "🤖", "👽", "🦊", "🐼", "🦄", "🐉", "🎃", "💀", "🌟", "🔥"];
const ADJECTIVES = ["Lucky", "Swift", "Bold", "Epic", "Super", "Mega", "Ultra", "Turbo", "Hyper", "Pro"];
const NOUNS = ["Dabber", "Caller", "Winner", "Player", "Champ", "Ace", "Star", "Legend", "Master", "King"];

function generateRandomName(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${adj}${noun}${num}`;
}

function getRandomAvatar(): string {
    return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

// Create a new user
export const createUser = mutation({
    args: {
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
        clerkId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const name = args.name || generateRandomName();
        const avatar = args.avatar || getRandomAvatar();

        const userId = await ctx.db.insert("users", {
            name,
            avatar,
            clerkId: args.clerkId,
            level: 1,
            xp: 0,
            xpToNext: 100,
            coins: 500, // Starting Gems
            totalWins: 0,
            totalGames: 0,
            currentStreak: 0,
            bestStreak: 0,
            achievements: [],
            createdAt: Date.now(),
        });

        return { userId, name, avatar };
    },
});

// Update user profile
export const updateUser = mutation({
    args: {
        userId: v.id("users"),
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: Partial<{ name: string; avatar: string }> = {};
        if (args.name) updates.name = args.name;
        if (args.avatar) updates.avatar = args.avatar;

        await ctx.db.patch(args.userId, updates);
        return { success: true };
    },
});

// Get user by ID
export const getUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// Get user by Clerk ID
export const getUserByClerkId = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();
    },
});

// Get user stats
export const getUserStats = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        const winRate = user.totalGames > 0
            ? Math.round((user.totalWins / user.totalGames) * 100)
            : 0;

        return {
            level: user.level,
            xp: user.xp,
            xpToNext: user.xpToNext,
            coins: user.coins,
            totalWins: user.totalWins,
            totalGames: user.totalGames,
            winRate,
            currentStreak: user.currentStreak,
            bestStreak: user.bestStreak,
            achievements: user.achievements,
        };
    },
});

// Add XP and level up
export const addXp = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false };

        let xp = user.xp + args.amount;
        let level = user.level;
        let xpToNext = user.xpToNext;
        let levelUps = 0;

        while (xp >= xpToNext) {
            xp -= xpToNext;
            level++;
            levelUps++;
            xpToNext = Math.round(xpToNext * 1.5);
        }

        await ctx.db.patch(args.userId, {
            xp,
            level,
            xpToNext,
        });

        return { success: true, levelUp: levelUps > 0, newLevel: level };
    },
});

// Grant Gems (for testing or rewards)
export const grantGems = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false };

        await ctx.db.patch(args.userId, {
            coins: user.coins + args.amount,
        });

        return { success: true, newBalance: user.coins + args.amount };
    },
});

// Random name suggestions
export const getNameSuggestions = query({
    args: {},
    handler: async () => {
        return [
            generateRandomName(),
            generateRandomName(),
            generateRandomName(),
        ];
    },
});

// Get available avatars
export const getAvatars = query({
    args: {},
    handler: async () => {
        return AVATARS;
    },
});
