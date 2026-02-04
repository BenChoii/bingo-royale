import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { generateBingoCard } from "./rooms";

const BOSS_CONFIG = {
    1: { name: "Slime King 👑", wager: 100, multiplier: 3, health: 40, duration: 45000 },
    2: { name: "Giga Golem 🗿", wager: 250, multiplier: 3.5, health: 80, duration: 40000 },
    3: { name: "Fire Drake 🐲", wager: 500, multiplier: 4, health: 120, duration: 35000 },
    4: { name: "Void Titan 🌑", wager: 2500, multiplier: 5, health: 300, duration: 30000 },
};

// 1. Players wager to "Ready Up" for the boss
export const joinBossBattle = mutation({
    args: {
        userId: v.id("users"),
        roomId: v.id("rooms"),
        bossLevel: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const room = await ctx.db.get(args.roomId);
        if (!room || room.status !== "finished") {
            return { success: false, error: "Boss phase only available after Bingo ends!" };
        }

        const config = BOSS_CONFIG[args.bossLevel as keyof typeof BOSS_CONFIG];
        if (!config) return { success: false, error: "Invalid boss level" };

        if (user.coins < config.wager) {
            return { success: false, error: `Need ${config.wager} Gems to challenge ${config.name}!` };
        }

        // Check if a battle is already in progress
        let bossGame = await ctx.db
            .query("bossGames")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.neq(q.field("status"), "won"))
            .filter((q) => q.neq(q.field("status"), "lost"))
            .first();

        if (bossGame && bossGame.status === "active") {
            return { success: false, error: "Battle already started!" };
        }

        if (!bossGame) {
            // First person joining creates the "preparing" session
            const gameId = await ctx.db.insert("bossGames", {
                roomId: args.roomId,
                bossLevel: args.bossLevel,
                health: config.health,
                maxHealth: config.health,
                status: "preparing",
                totalWager: 0,
                participants: [],
                calledNumbers: [],
            });
            bossGame = await ctx.db.get(gameId);
        }

        if (!bossGame) return { success: false, error: "Failed to initialize battle" };

        if (bossGame.participants.includes(args.userId)) {
            return { success: false, error: "Already joined" };
        }

        // Deduct gems and participate
        await ctx.db.patch(args.userId, { coins: user.coins - config.wager });
        await ctx.db.patch(bossGame._id, {
            participants: [...bossGame.participants, args.userId],
            totalWager: bossGame.totalWager + config.wager,
        });

        // Create individual record
        await ctx.db.insert("bossBattles", {
            userId: args.userId,
            roomId: args.roomId,
            bossGameId: bossGame._id,
            wager: config.wager,
            reward: 0,
            status: "pending",
            bossLevel: args.bossLevel,
            createdAt: Date.now(),
        });

        // Give player a fresh Bingo Card for this battle
        const player = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("odId"), args.userId))
            .first();

        if (player) {
            await ctx.db.patch(player._id, {
                card: generateBingoCard(),
                daubedCount: 1,
                distanceToBingo: 4,
            });
        }

        return { success: true };
    },
});

// 2. Start the encounter - auto-includes ALL room players
export const startBossBattle = mutation({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const bossGame = await ctx.db
            .query("bossGames")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("status"), "preparing"))
            .first();

        if (!bossGame) {
            return { success: false, error: "No boss battle to start. Select a boss first!" };
        }

        const config = BOSS_CONFIG[bossGame.bossLevel as keyof typeof BOSS_CONFIG];
        const startedAt = Date.now();

        // Get ALL players in the room and add them to the battle
        const allRoomPlayers = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .collect();

        const allParticipantIds = allRoomPlayers.map(p => p.odId);

        // Give each player a fresh card for the boss battle
        for (const player of allRoomPlayers) {
            await ctx.db.patch(player._id, {
                card: generateBingoCard(),
                daubedCount: 1,
                distanceToBingo: 4,
            });
        }

        await ctx.db.patch(bossGame._id, {
            status: "active",
            startedAt,
            expiresAt: startedAt + config.duration,
            calledNumbers: [],
            participants: allParticipantIds, // All room players participate!
        });

        // System message
        await ctx.db.insert("messages", {
            roomId: args.roomId,
            userId: allParticipantIds[0], // First player as proxy
            userName: "System",
            userAvatar: "👿",
            content: `THE ${config.name.toUpperCase()} HAS AWOKEN! All ${allParticipantIds.length} players are battling together!`,
            type: "system",
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

// 3. Daub during boss battle
export const daubBossNumber = mutation({
    args: {
        roomId: v.id("rooms"),
        userId: v.id("users"),
        number: v.number()
    },
    handler: async (ctx, args) => {
        const bossGame = await ctx.db
            .query("bossGames")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        if (!bossGame) return { success: false, error: "No active battle" };

        const player = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("odId"), args.userId))
            .first();

        if (!player) return { success: false, error: "Player not found" };

        // Reduce boss health
        const newHealth = Math.max(0, bossGame.health - 1);
        await ctx.db.patch(bossGame._id, { health: newHealth });

        // Update player card
        let updated = false;
        const newCard = player.card.map(row => row.map(cell => {
            if (cell.value === args.number && !cell.daubed) {
                updated = true;
                return { ...cell, daubed: true };
            }
            return cell;
        }));

        if (updated) {
            await ctx.db.patch(player._id, { card: newCard });
        }

        // Check for victory
        if (newHealth <= 0) {
            await ctx.db.patch(bossGame._id, { status: "won" });

            // Distribute rewards to ALL participants
            const config = BOSS_CONFIG[bossGame.bossLevel as keyof typeof BOSS_CONFIG];
            const pot = Math.floor(bossGame.totalWager * config.multiplier);
            const share = Math.floor(pot / bossGame.participants.length);

            for (const pId of bossGame.participants) {
                const pUser = await ctx.db.get(pId);
                if (pUser) {
                    await ctx.db.patch(pId, { coins: pUser.coins + share });
                }

                const battleEntry = await ctx.db
                    .query("bossBattles")
                    .withIndex("by_user", (q) => q.eq("userId", pId))
                    .filter((q) => q.eq(q.field("bossGameId"), bossGame._id))
                    .first();
                if (battleEntry) {
                    await ctx.db.patch(battleEntry._id, { status: "won", reward: share });
                }
            }

            await ctx.db.insert("messages", {
                roomId: args.roomId,
                userId: args.userId,
                userName: "System",
                userAvatar: "👑",
                content: `BOSS DEFEATED! Everyone in the party won ${share} Gems! 🎉`,
                type: "system",
                createdAt: Date.now(),
            });
        }

        return { success: true };
    },
});

// Logic to call numbers for the boss
export const bossCallNumber = mutation({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const bossGame = await ctx.db
            .query("bossGames")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        if (!bossGame) return;

        // Check timeout
        if (Date.now() > (bossGame.expiresAt || 0)) {
            await ctx.db.patch(bossGame._id, { status: "lost" });

            // System message for defeat
            await ctx.db.insert("messages", {
                roomId: args.roomId,
                userId: bossGame.participants[0],
                userName: "System",
                userAvatar: "💀",
                content: `THE BOSS HAS ESCAPED! You were too slow and lost your wagers. Better luck next time...`,
                type: "system",
                createdAt: Date.now(),
            });

            // Update battle entries to lost
            for (const pId of bossGame.participants) {
                const battleEntry = await ctx.db
                    .query("bossBattles")
                    .withIndex("by_user", (q) => q.eq("userId", pId))
                    .filter((q) => q.eq(q.field("bossGameId"), bossGame._id))
                    .first();
                if (battleEntry) {
                    await ctx.db.patch(battleEntry._id, { status: "lost" });
                }
            }
            return;
        }

        // Generate next number
        let next;
        do {
            next = Math.floor(Math.random() * 75) + 1;
        } while (bossGame.calledNumbers.includes(next));

        const newCalledNumbers = [...bossGame.calledNumbers, next];
        await ctx.db.patch(bossGame._id, {
            calledNumbers: newCalledNumbers,
        });

        // --- BOSS ATTACK MECHANIC ---
        // Every 5th number, the boss performs a special attack
        if (newCalledNumbers.length % 5 === 0) {
            const attackType = Math.random() > 0.5 ? "freeze" : "shuffle";
            const targetId = bossGame.participants[Math.floor(Math.random() * bossGame.participants.length)];
            const targetPlayer = await ctx.db
                .query("roomPlayers")
                .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
                .filter((q) => q.eq(q.field("odId"), targetId))
                .first();

            if (targetPlayer) {
                const user = await ctx.db.get(targetId);
                const targetName = user?.name || "a player";

                if (attackType === "freeze") {
                    await ctx.db.patch(targetPlayer._id, {
                        frozenUntil: Date.now() + 5000, // 5 second freeze
                    });
                    await ctx.db.insert("messages", {
                        roomId: args.roomId,
                        userId: targetId,
                        userName: "System",
                        userAvatar: "🧊",
                        content: `ICE NOVA! The boss has frozen ${targetName}!`,
                        type: "system",
                        createdAt: Date.now(),
                    });
                } else {
                    // Chaos Scramble
                    const card = [...targetPlayer.card];
                    const r = Math.floor(Math.random() * 5);
                    const c = Math.floor(Math.random() * 5);
                    if (card[r][c].value !== "FREE" && !card[r][c].daubed) {
                        card[r][c].value = Math.floor(Math.random() * 75) + 1;
                        await ctx.db.patch(targetPlayer._id, {
                            card,
                            scrambledAt: Date.now()
                        });
                        await ctx.db.insert("messages", {
                            roomId: args.roomId,
                            userId: targetId,
                            userName: "System",
                            userAvatar: "🌀",
                            content: `CHAOS PULSE! The boss has scrambled ${targetName}'s card!`,
                            type: "system",
                            createdAt: Date.now(),
                        });
                    }
                }
            }
        }
    }
});

export const getActiveBoss = query({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("bossGames")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.neq(q.field("status"), "won")) // optional: keep it for a while?
            .order("desc")
            .first();
    },
});
