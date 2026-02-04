import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Challenge pool - randomly pick 3 per day
const CHALLENGE_POOL = [
    { type: "daub_50", target: 50, reward: 20, description: "Daub 50 numbers" },
    { type: "win_2", target: 2, reward: 40, description: "Win 2 games" },
    { type: "use_powerups_3", target: 3, reward: 25, description: "Use 3 power-ups" },
    { type: "play_5", target: 5, reward: 30, description: "Play 5 games" },
    { type: "defeat_boss", target: 1, reward: 50, description: "Defeat a boss" },
    { type: "win_streak_2", target: 2, reward: 35, description: "Win 2 games in a row" },
    { type: "earn_gems_100", target: 100, reward: 30, description: "Earn 100 gems" },
];

const BONUS_REWARD = 30;

// Get today's date string
function getTodayString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Get or create today's challenges
export const getTodaysChallenges = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const today = getTodayString();

        // Get daily challenges for today
        let dailyChallenges = await ctx.db
            .query("dailyChallenges")
            .withIndex("by_date", (q) => q.eq("date", today))
            .first();

        // If no challenges for today, they'll be created by the init mutation
        if (!dailyChallenges) {
            return { challenges: [], progress: [], bonusClaimed: false, needsInit: true };
        }

        // Get user's progress
        let userProgress = await ctx.db
            .query("userChallenges")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
            .first();

        return {
            challenges: dailyChallenges.challenges,
            progress: userProgress?.progress || [],
            bonusClaimed: userProgress?.bonusClaimed || false,
            needsInit: false,
        };
    },
});

// Initialize today's challenges (call once per day)
export const initDailyChallenges = mutation({
    args: {},
    handler: async (ctx) => {
        const today = getTodayString();

        // Check if already exists
        const existing = await ctx.db
            .query("dailyChallenges")
            .withIndex("by_date", (q) => q.eq("date", today))
            .first();

        if (existing) return { success: true, message: "Already initialized" };

        // Pick 3 random challenges
        const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
        const todaysChallenges = shuffled.slice(0, 3);

        await ctx.db.insert("dailyChallenges", {
            date: today,
            challenges: todaysChallenges,
        });

        return { success: true };
    },
});

// Initialize user's progress for today
export const initUserChallenges = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const today = getTodayString();

        // Check if already exists
        const existing = await ctx.db
            .query("userChallenges")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
            .first();

        if (existing) return { success: true };

        // Get today's challenges
        const dailyChallenges = await ctx.db
            .query("dailyChallenges")
            .withIndex("by_date", (q) => q.eq("date", today))
            .first();

        if (!dailyChallenges) return { success: false, error: "No challenges for today" };

        // Create user progress
        const progress = dailyChallenges.challenges.map(c => ({
            type: c.type,
            current: 0,
            claimed: false,
        }));

        await ctx.db.insert("userChallenges", {
            userId: args.userId,
            date: today,
            progress,
            bonusClaimed: false,
        });

        return { success: true };
    },
});

// Update challenge progress (called by game events)
export const updateProgress = mutation({
    args: {
        userId: v.id("users"),
        type: v.string(),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const today = getTodayString();

        const userProgress = await ctx.db
            .query("userChallenges")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
            .first();

        if (!userProgress) return { success: false };

        const newProgress = userProgress.progress.map(p => {
            if (p.type === args.type) {
                return { ...p, current: p.current + args.amount };
            }
            return p;
        });

        await ctx.db.patch(userProgress._id, { progress: newProgress });
        return { success: true };
    },
});

// Claim a challenge reward
export const claimChallengeReward = mutation({
    args: {
        userId: v.id("users"),
        challengeIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const today = getTodayString();

        const userProgress = await ctx.db
            .query("userChallenges")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
            .first();

        if (!userProgress) return { success: false, error: "No progress found" };

        const dailyChallenges = await ctx.db
            .query("dailyChallenges")
            .withIndex("by_date", (q) => q.eq("date", today))
            .first();

        if (!dailyChallenges) return { success: false, error: "No challenges found" };

        const challenge = dailyChallenges.challenges[args.challengeIndex];
        const progress = userProgress.progress[args.challengeIndex];

        if (!challenge || !progress) return { success: false, error: "Invalid challenge" };
        if (progress.claimed) return { success: false, error: "Already claimed" };
        if (progress.current < challenge.target) return { success: false, error: "Not completed" };

        // Mark as claimed
        const newProgress = [...userProgress.progress];
        newProgress[args.challengeIndex] = { ...progress, claimed: true };
        await ctx.db.patch(userProgress._id, { progress: newProgress });

        // Award gems
        const user = await ctx.db.get(args.userId);
        if (user) {
            await ctx.db.patch(args.userId, { coins: user.coins + challenge.reward });
        }

        return { success: true, reward: challenge.reward };
    },
});

// Claim bonus for completing all 3
export const claimBonusReward = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const today = getTodayString();

        const userProgress = await ctx.db
            .query("userChallenges")
            .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", today))
            .first();

        if (!userProgress) return { success: false, error: "No progress found" };
        if (userProgress.bonusClaimed) return { success: false, error: "Bonus already claimed" };

        // Check all challenges are claimed
        const allClaimed = userProgress.progress.every(p => p.claimed);
        if (!allClaimed) return { success: false, error: "Complete all challenges first" };

        // Award bonus
        await ctx.db.patch(userProgress._id, { bonusClaimed: true });

        const user = await ctx.db.get(args.userId);
        if (user) {
            await ctx.db.patch(args.userId, { coins: user.coins + BONUS_REWARD });
        }

        return { success: true, reward: BONUS_REWARD };
    },
});
