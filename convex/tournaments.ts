import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ===== TOURNAMENT MANAGEMENT =====

// Create a scheduled tournament (admin function)
export const createTournament = mutation({
    args: {
        name: v.string(),
        type: v.union(v.literal("royale"), v.literal("blitz"), v.literal("syndicate_war")),
        entryFee: v.number(),
        maxParticipants: v.number(),
        minParticipants: v.number(),
        teamMode: v.boolean(),
        requiresPass: v.boolean(),
        startsAt: v.number(),
        registrationEndsAt: v.number(),
    },
    handler: async (ctx, args) => {
        const tournamentId = await ctx.db.insert("tournaments", {
            name: args.name,
            type: args.type,
            status: "upcoming",
            prizePool: 0,
            entryFee: args.entryFee,
            maxParticipants: args.maxParticipants,
            minParticipants: args.minParticipants,
            registeredCount: 0,
            teamMode: args.teamMode,
            requiresPass: args.requiresPass,
            startsAt: args.startsAt,
            registrationEndsAt: args.registrationEndsAt,
            createdAt: Date.now(),
        });

        return { success: true, tournamentId };
    },
});

// Register for a tournament
export const registerForTournament = mutation({
    args: {
        userId: v.id("users"),
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            return { success: false, error: "Tournament not found" };
        }

        const now = Date.now();

        // Check registration window
        if (now > tournament.registrationEndsAt) {
            return { success: false, error: "Registration has closed" };
        }

        if (tournament.status !== "upcoming" && tournament.status !== "registration") {
            return { success: false, error: "Tournament is not open for registration" };
        }

        // Check capacity
        if (tournament.registeredCount >= tournament.maxParticipants) {
            return { success: false, error: "Tournament is full" };
        }

        // Check if already registered
        const existingReg = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("tournamentId"), args.tournamentId))
            .first();

        if (existingReg) {
            return { success: false, error: "Already registered" };
        }

        // Check tournament pass requirement
        if (tournament.requiresPass) {
            const passes = await ctx.db
                .query("tournamentPasses")
                .withIndex("by_user", (q) => q.eq("userId", args.userId))
                .collect();

            const hasValidPass = passes.some((pass) => {
                if (pass.type === "permanent") return true;
                return pass.expiresAt && pass.expiresAt > now;
            });

            if (!hasValidPass) {
                return { success: false, error: "Tournament Pass required", needsPass: true };
            }
        }

        // Check entry fee
        const user = await ctx.db.get(args.userId);
        if (!user) {
            return { success: false, error: "User not found" };
        }

        if (user.coins < tournament.entryFee) {
            return { success: false, error: "Insufficient gems for entry fee" };
        }

        // Deduct entry fee
        await ctx.db.patch(args.userId, {
            coins: user.coins - tournament.entryFee,
        });

        // Create registration
        await ctx.db.insert("tournamentRegistrations", {
            tournamentId: args.tournamentId,
            userId: args.userId,
            status: "registered",
            registeredAt: now,
        });

        // Update tournament
        await ctx.db.patch(args.tournamentId, {
            registeredCount: tournament.registeredCount + 1,
            prizePool: tournament.prizePool + tournament.entryFee,
            status: "registration", // Move to registration status if not already
        });

        return { success: true };
    },
});

// Unregister from a tournament (with refund)
export const unregisterFromTournament = mutation({
    args: {
        userId: v.id("users"),
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            return { success: false, error: "Tournament not found" };
        }

        // Can only unregister before tournament starts
        if (tournament.status === "active" || tournament.status === "completed") {
            return { success: false, error: "Tournament already started" };
        }

        const registration = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("tournamentId"), args.tournamentId))
            .first();

        if (!registration) {
            return { success: false, error: "Not registered" };
        }

        // Refund entry fee
        const user = await ctx.db.get(args.userId);
        if (user) {
            await ctx.db.patch(args.userId, {
                coins: user.coins + tournament.entryFee,
            });
        }

        // Remove registration
        await ctx.db.delete(registration._id);

        // Update tournament
        await ctx.db.patch(args.tournamentId, {
            registeredCount: Math.max(0, tournament.registeredCount - 1),
            prizePool: Math.max(0, tournament.prizePool - tournament.entryFee),
        });

        return { success: true };
    },
});

// Get upcoming tournaments
export const getUpcomingTournaments = query({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        const tournaments = await ctx.db
            .query("tournaments")
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "upcoming"),
                    q.eq(q.field("status"), "registration")
                )
            )
            .take(20);

        // Sort by start time
        return tournaments
            .sort((a, b) => a.startsAt - b.startsAt)
            .map((t) => ({
                id: t._id,
                name: t.name,
                type: t.type,
                status: t.status,
                prizePool: t.prizePool,
                entryFee: t.entryFee,
                registeredCount: t.registeredCount,
                maxParticipants: t.maxParticipants,
                minParticipants: t.minParticipants,
                requiresPass: t.requiresPass,
                teamMode: t.teamMode,
                startsAt: t.startsAt,
                registrationEndsAt: t.registrationEndsAt,
                timeUntilStart: t.startsAt - now,
            }));
    },
});

// Get user's tournament registrations
export const getMyTournaments = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const tournamentsWithDetails = await Promise.all(
            registrations.map(async (reg) => {
                const tournament = await ctx.db.get(reg.tournamentId);
                return tournament
                    ? {
                        registrationId: reg._id,
                        tournamentId: tournament._id,
                        name: tournament.name,
                        type: tournament.type,
                        status: tournament.status,
                        prizePool: tournament.prizePool,
                        startsAt: tournament.startsAt,
                        registrationStatus: reg.status,
                        placement: reg.placement,
                        gemsWon: reg.gemsWon,
                    }
                    : null;
            })
        );

        return tournamentsWithDetails.filter(Boolean);
    },
});

// Check if user is registered for a tournament
export const isRegistered = query({
    args: {
        userId: v.id("users"),
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        const registration = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("tournamentId"), args.tournamentId))
            .first();

        return !!registration;
    },
});

// Get active/live tournaments
export const getActiveTournaments = query({
    args: {},
    handler: async (ctx) => {
        const tournaments = await ctx.db
            .query("tournaments")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .take(10);

        return tournaments.map((t) => ({
            id: t._id,
            name: t.name,
            type: t.type,
            prizePool: t.prizePool,
            registeredCount: t.registeredCount,
            teamMode: t.teamMode,
        }));
    },
});

// Seed regular tournaments (to be called by a cron job)
export const seedDailyTournaments = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const today8PM = new Date();
        today8PM.setHours(20, 0, 0, 0);

        // Grand Royale - Daily at 8PM
        const grandRoyaleTime = today8PM.getTime();
        if (grandRoyaleTime > now) {
            // Check if already exists
            const existing = await ctx.db
                .query("tournaments")
                .withIndex("by_start", (q) => q.eq("startsAt", grandRoyaleTime))
                .first();

            if (!existing) {
                await ctx.db.insert("tournaments", {
                    name: "Grand Royale",
                    type: "royale",
                    status: "upcoming",
                    prizePool: 0,
                    entryFee: 100,
                    maxParticipants: 64,
                    minParticipants: 8,
                    registeredCount: 0,
                    teamMode: false,
                    requiresPass: true,
                    startsAt: grandRoyaleTime,
                    registrationEndsAt: grandRoyaleTime - 30 * 60 * 1000, // 30 min before
                    createdAt: now,
                });
            }
        }

        return { success: true };
    },
});
