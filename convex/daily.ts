import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const BASE_REWARD = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STREAK_WINDOW = 48 * 60 * 60 * 1000; // 48 hours to maintain streak

// Streak bonus multipliers
const getStreakReward = (streak: number): { gems: number; bonus: string | null } => {
    if (streak >= 30) return { gems: 500, bonus: "🎉 30-Day Legend! +500 Gems" };
    if (streak >= 14) return { gems: 300, bonus: "🔥 2-Week Warrior! +300 Gems" };
    if (streak >= 7) return { gems: 250, bonus: "⭐ Weekly Champion! +250 Gems" };
    if (streak >= 6) return { gems: 175, bonus: null };
    if (streak >= 5) return { gems: 150, bonus: null };
    if (streak >= 4) return { gems: 130, bonus: null };
    if (streak >= 3) return { gems: 120, bonus: null };
    if (streak >= 2) return { gems: 110, bonus: null };
    return { gems: BASE_REWARD, bonus: null };
};

export const claimDailyReward = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const now = Date.now();
        const lastClaim = (user as any).lastDailyClaim || 0;

        // Strict 24-hour cooldown
        if ((now - lastClaim) < MS_PER_DAY) {
            const hoursRemaining = Math.ceil((MS_PER_DAY - (now - lastClaim)) / (60 * 60 * 1000));
            return {
                success: false,
                error: `Daily reward available in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}!`
            };
        }

        // Calculate streak
        let newStreak = 1;
        if (lastClaim > 0 && (now - lastClaim) <= STREAK_WINDOW) {
            // Within 48 hours - continue streak
            newStreak = user.currentStreak + 1;
        }
        // If more than 48 hours, streak resets to 1

        const { gems, bonus } = getStreakReward(newStreak);
        const bestStreak = Math.max(user.bestStreak, newStreak);

        // Grant reward and update streak
        await ctx.db.patch(args.userId, {
            coins: user.coins + gems,
            currentStreak: newStreak,
            bestStreak,
            lastDailyClaim: now,
        });

        return {
            success: true,
            amount: gems,
            newBalance: user.coins + gems,
            streak: newStreak,
            bestStreak,
            bonus,
        };
    },
});

export const canClaimReward = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { canClaim: false, hoursRemaining: 0, currentStreak: 0 };

        const now = Date.now();
        const lastClaim = (user as any).lastDailyClaim || 0;
        const canClaim = (now - lastClaim) >= MS_PER_DAY;
        const hoursRemaining = canClaim ? 0 : Math.ceil((MS_PER_DAY - (now - lastClaim)) / (60 * 60 * 1000));

        // Check if streak will continue or reset
        const streakWillContinue = lastClaim > 0 && (now - lastClaim) <= STREAK_WINDOW;
        const nextStreak = streakWillContinue ? user.currentStreak + 1 : 1;
        const { gems } = getStreakReward(nextStreak);

        return {
            canClaim,
            hoursRemaining,
            currentStreak: user.currentStreak,
            nextStreak,
            nextReward: gems,
        };
    },
});

export const getStreakInfo = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        return {
            currentStreak: user.currentStreak,
            bestStreak: user.bestStreak,
        };
    },
});
