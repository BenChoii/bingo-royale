import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Constants
const REFERRAL_CODE_PREFIX = "BINGO";
const GAMES_REQUIRED_FOR_ACTIVATION = 3;
const WEEKLY_PASS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PREMIUM_PASS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Generate a unique referral code
function generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (I, O, 0, 1)
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${REFERRAL_CODE_PREFIX}-${code}`;
}

// ===== REFERRAL CODE MANAGEMENT =====

// Create a referral code for a user (called on user creation)
export const createReferralCode = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Check if user already has a code
        const existing = await ctx.db
            .query("referralCodes")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();

        if (existing) {
            return { code: existing.code };
        }

        // Generate unique code (retry if collision)
        let code = generateReferralCode();
        let attempts = 0;
        while (attempts < 10) {
            const collision = await ctx.db
                .query("referralCodes")
                .withIndex("by_code", (q) => q.eq("code", code))
                .unique();
            if (!collision) break;
            code = generateReferralCode();
            attempts++;
        }

        await ctx.db.insert("referralCodes", {
            userId: args.userId,
            code,
            usageCount: 0,
            createdAt: Date.now(),
        });

        return { code };
    },
});

// Get user's referral code
export const getReferralCode = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const referralCode = await ctx.db
            .query("referralCodes")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();

        return referralCode?.code || null;
    },
});

// ===== REFERRAL APPLICATION =====

// Apply a referral code during signup (links referee to referrer)
export const applyReferralCode = mutation({
    args: {
        refereeId: v.id("users"),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        // Find the referral code
        const referralCode = await ctx.db
            .query("referralCodes")
            .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
            .unique();

        if (!referralCode) {
            return { success: false, error: "Invalid referral code" };
        }

        // Prevent self-referral
        if (referralCode.userId === args.refereeId) {
            return { success: false, error: "Cannot use your own referral code" };
        }

        // Check if this referee already has a referrer
        const existingReferral = await ctx.db
            .query("referrals")
            .withIndex("by_referee", (q) => q.eq("refereeId", args.refereeId))
            .unique();

        if (existingReferral) {
            return { success: false, error: "Already used a referral code" };
        }

        // Create the referral relationship
        await ctx.db.insert("referrals", {
            referrerId: referralCode.userId,
            refereeId: args.refereeId,
            status: "pending",
            gamesPlayed: 0,
            createdAt: Date.now(),
        });

        // Increment usage count
        await ctx.db.patch(referralCode._id, {
            usageCount: referralCode.usageCount + 1,
        });

        return { success: true, referrerId: referralCode.userId };
    },
});

// ===== REFERRAL ACTIVATION (Called after each game) =====

// Check and update referral activation progress
export const checkReferralActivation = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Find if this user is a referee with pending referral
        const referral = await ctx.db
            .query("referrals")
            .withIndex("by_referee", (q) => q.eq("refereeId", args.userId))
            .unique();

        if (!referral || referral.status !== "pending") {
            return { activated: false };
        }

        // Increment games played
        const newGamesPlayed = referral.gamesPlayed + 1;

        if (newGamesPlayed >= GAMES_REQUIRED_FOR_ACTIVATION) {
            // Activate the referral
            await ctx.db.patch(referral._id, {
                gamesPlayed: newGamesPlayed,
                status: "activated",
                activatedAt: Date.now(),
            });

            // Grant tournament passes to both parties
            const now = Date.now();
            const expiresAt = now + WEEKLY_PASS_DURATION_MS;

            // Grant pass to referee (the new player)
            await ctx.db.insert("tournamentPasses", {
                userId: args.userId,
                type: "weekly",
                source: "referral",
                expiresAt,
                createdAt: now,
            });

            // Grant pass to referrer (the inviter)
            await ctx.db.insert("tournamentPasses", {
                userId: referral.referrerId,
                type: "weekly",
                source: "referral",
                expiresAt,
                createdAt: now,
            });

            // Mark referral as rewarded
            await ctx.db.patch(referral._id, {
                status: "rewarded",
                rewardedAt: now,
            });

            return {
                activated: true,
                referrerId: referral.referrerId,
                passExpiresAt: expiresAt,
            };
        } else {
            // Just increment the counter
            await ctx.db.patch(referral._id, {
                gamesPlayed: newGamesPlayed,
            });

            return {
                activated: false,
                gamesRemaining: GAMES_REQUIRED_FOR_ACTIVATION - newGamesPlayed,
            };
        }
    },
});

// ===== TOURNAMENT PASS MANAGEMENT =====

// Check if user has an active tournament pass
export const hasActiveTournamentPass = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const passes = await ctx.db
            .query("tournamentPasses")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const now = Date.now();

        // Check for any active pass
        const activePass = passes.find((pass) => {
            if (pass.type === "permanent") return true;
            return pass.expiresAt && pass.expiresAt > now;
        });

        if (activePass) {
            return {
                hasPass: true,
                type: activePass.type,
                source: activePass.source,
                expiresAt: activePass.expiresAt,
            };
        }

        return { hasPass: false };
    },
});

// Grant a tournament pass (for purchases or rewards)
export const grantTournamentPass = mutation({
    args: {
        userId: v.id("users"),
        type: v.union(v.literal("weekly"), v.literal("premium"), v.literal("permanent")),
        source: v.union(v.literal("referral"), v.literal("purchase"), v.literal("reward")),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        let expiresAt: number | undefined;

        if (args.type === "weekly") {
            expiresAt = now + WEEKLY_PASS_DURATION_MS;
        } else if (args.type === "premium") {
            expiresAt = now + PREMIUM_PASS_DURATION_MS;
        }
        // permanent passes have no expiry

        await ctx.db.insert("tournamentPasses", {
            userId: args.userId,
            type: args.type,
            source: args.source,
            expiresAt,
            createdAt: now,
        });

        return { success: true, expiresAt };
    },
});

// ===== REFERRAL STATS & QUERIES =====

// Get user's referral stats
export const getReferralStats = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const referrals = await ctx.db
            .query("referrals")
            .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
            .collect();

        const pending = referrals.filter((r) => r.status === "pending").length;
        const activated = referrals.filter((r) => r.status === "activated").length;
        const rewarded = referrals.filter((r) => r.status === "rewarded").length;

        return {
            total: referrals.length,
            pending,
            activated,
            rewarded,
            totalSuccessful: activated + rewarded,
        };
    },
});

// Get list of people user has referred
export const getMyReferrals = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const referrals = await ctx.db
            .query("referrals")
            .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
            .collect();

        // Get user details for each referee
        const referralDetails = await Promise.all(
            referrals.map(async (referral) => {
                const referee = await ctx.db.get(referral.refereeId);
                return {
                    id: referral._id,
                    refereeName: referee?.name || "Unknown",
                    refereeAvatar: referee?.avatar || "👤",
                    refereeLevel: referee?.level || 1,
                    status: referral.status,
                    gamesPlayed: referral.gamesPlayed,
                    gamesRequired: GAMES_REQUIRED_FOR_ACTIVATION,
                    createdAt: referral.createdAt,
                    activatedAt: referral.activatedAt,
                };
            })
        );

        return referralDetails;
    },
});

// Check if user was referred by someone (for onboarding UI)
export const getMyReferrer = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const referral = await ctx.db
            .query("referrals")
            .withIndex("by_referee", (q) => q.eq("refereeId", args.userId))
            .unique();

        if (!referral) {
            return null;
        }

        const referrer = await ctx.db.get(referral.referrerId);
        return {
            referrerName: referrer?.name || "Unknown",
            referrerAvatar: referrer?.avatar || "👤",
            status: referral.status,
            gamesPlayed: referral.gamesPlayed,
            gamesRequired: GAMES_REQUIRED_FOR_ACTIVATION,
        };
    },
});
