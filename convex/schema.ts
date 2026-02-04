import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Users/Players
    users: defineTable({
        name: v.string(),
        clerkId: v.optional(v.string()),
        avatar: v.string(), // Emoji avatar
        level: v.number(),
        xp: v.number(),
        xpToNext: v.number(),
        coins: v.number(),
        totalWins: v.number(),
        totalGames: v.number(),
        currentStreak: v.number(),
        bestStreak: v.number(),
        achievements: v.array(v.string()),
        lastDailyClaim: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_name", ["name"])
        .index("by_clerk_id", ["clerkId"]),

    // Game Rooms
    rooms: defineTable({
        code: v.string(), // 6-digit join code
        name: v.string(),
        hostId: v.id("users"),
        status: v.union(
            v.literal("waiting"),
            v.literal("playing"),
            v.literal("finished")
        ),
        mode: v.union(
            v.literal("classic"),
            v.literal("speed"),
            v.literal("pattern"),
            v.literal("blackout")
        ),
        maxPlayers: v.number(),
        buyIn: v.number(), // Coin buy-in (0 = free)
        prizePool: v.number(),
        isPrivate: v.boolean(),
        password: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_code", ["code"])
        .index("by_status", ["status"]),

    // Players in a room
    roomPlayers: defineTable({
        roomId: v.id("rooms"),
        odId: v.id("users"),
        card: v.array(v.array(v.object({
            value: v.union(v.number(), v.string()),
            daubed: v.boolean(),
        }))),
        daubedCount: v.number(),
        distanceToBingo: v.number(), // How many more needed
        isReady: v.boolean(),
        hasCalledBingo: v.boolean(),
        frozenUntil: v.optional(v.number()),
        shieldUntil: v.optional(v.number()),
        scrambledAt: v.optional(v.number()),
        joinedAt: v.number(),
    })
        .index("by_room", ["roomId"])
        .index("by_user", ["odId"]),

    // Active Games
    games: defineTable({
        roomId: v.id("rooms"),
        calledNumbers: v.array(v.number()),
        currentNumber: v.optional(v.number()),
        nextNumber: v.optional(v.number()),
        pattern: v.string(), // Pattern name
        winnerId: v.optional(v.id("users")),
        startedAt: v.number(),
        endedAt: v.optional(v.number()),
        nextCallAt: v.optional(v.number()),
    }).index("by_room", ["roomId"]),

    // Chat Messages
    messages: defineTable({
        roomId: v.id("rooms"),
        userId: v.id("users"),
        userName: v.string(),
        userAvatar: v.string(),
        content: v.string(),
        type: v.union(
            v.literal("chat"),
            v.literal("reaction"),
            v.literal("system")
        ),
        createdAt: v.number(),
    }).index("by_room", ["roomId"]),

    // Leaderboard entries
    leaderboard: defineTable({
        userId: v.id("users"),
        userName: v.string(),
        userAvatar: v.string(),
        period: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("alltime")
        ),
        wins: v.number(),
        gamesPlayed: v.number(),
        coinsEarned: v.number(),
        periodStart: v.number(),
    })
        .index("by_period", ["period"])
        .index("by_user_period", ["userId", "period"]),

    // Power-up usage tracking
    powerups: defineTable({
        gameId: v.id("games"),
        sourceUserId: v.id("users"),
        targetUserId: v.optional(v.id("users")),
        type: v.union(
            v.literal("quickdaub"),
            v.literal("wild"),
            v.literal("doublexp"),
            v.literal("peek"),
            v.literal("freeze"),
            v.literal("shuffle"),
            v.literal("blind"),
            v.literal("shield")
        ),
        usedAt: v.number(),
    }).index("by_game", ["gameId"])
        .index("by_game_user_type", ["gameId", "sourceUserId", "type"]),

    // Boss Battles (Active Shared Encounter)
    bossGames: defineTable({
        roomId: v.id("rooms"),
        bossLevel: v.number(),
        health: v.number(),
        maxHealth: v.number(),
        status: v.union(v.literal("preparing"), v.literal("active"), v.literal("won"), v.literal("lost")),
        totalWager: v.number(),
        participants: v.array(v.id("users")),
        startedAt: v.optional(v.number()),
        expiresAt: v.optional(v.number()),
        calledNumbers: v.array(v.number()),
    }).index("by_room", ["roomId"]),

    // Boss Battle Participation (Individual entries)
    bossBattles: defineTable({
        userId: v.id("users"),
        roomId: v.id("rooms"),
        bossGameId: v.optional(v.id("bossGames")),
        wager: v.number(),
        reward: v.number(),
        status: v.union(v.literal("won"), v.literal("lost"), v.literal("pending")),
        bossLevel: v.number(),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_room", ["roomId"]),

    // Lucky Line Minigame
    luckyLineGames: defineTable({
        userId: v.id("users"),
        lines: v.array(v.object({
            row: v.number(),
            col: v.number(),
            direction: v.string(), // "row", "col", "diag1", "diag2"
        })),
        winningLine: v.optional(v.object({
            row: v.number(),
            col: v.number(),
            direction: v.string(),
        })),
        calledNumbers: v.array(v.number()),
        status: v.union(v.literal("drawing"), v.literal("revealing"), v.literal("won"), v.literal("lost")),
        wager: v.number(),
        reward: v.number(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Daily Challenges
    dailyChallenges: defineTable({
        date: v.string(), // "2026-02-04"
        challenges: v.array(v.object({
            type: v.string(), // "daub_50", "win_2", "use_powerups_3"
            target: v.number(),
            reward: v.number(),
            description: v.string(),
        })),
    }).index("by_date", ["date"]),

    // User Challenge Progress
    userChallenges: defineTable({
        userId: v.id("users"),
        date: v.string(),
        progress: v.array(v.object({
            type: v.string(),
            current: v.number(),
            claimed: v.boolean(),
        })),
        bonusClaimed: v.boolean(),
    }).index("by_user_date", ["userId", "date"]),

    // Cosmetics Catalog
    cosmetics: defineTable({
        type: v.union(v.literal("daub"), v.literal("card"), v.literal("frame"), v.literal("animation"), v.literal("emote")),
        name: v.string(),
        description: v.string(),
        price: v.number(),
        rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary")),
        asset: v.string(), // CSS class or emoji/icon
    }).index("by_type", ["type"]),

    // User Owned Cosmetics
    userCosmetics: defineTable({
        userId: v.id("users"),
        cosmeticId: v.id("cosmetics"),
        equipped: v.boolean(),
        purchasedAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_user_cosmetic", ["userId", "cosmeticId"]),

    // Stripe Purchases (for idempotency)
    purchases: defineTable({
        userId: v.id("users"),
        sessionId: v.string(),
        gems: v.number(),
        createdAt: v.number(),
    }).index("by_session", ["sessionId"])
        .index("by_user", ["userId"]),
});
