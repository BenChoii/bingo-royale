import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { generateBingoCard } from "./rooms";
import { checkBingo } from "./games";

const BOSS_CONFIG = {
    1: { name: "Slime King 👑", wager: 100, multiplier: 3, health: 40, duration: 45000 },
    2: { name: "Giga Golem 🗿", wager: 250, multiplier: 3.5, health: 80, duration: 40000 },
    3: { name: "Fire Drake 🐲", wager: 500, multiplier: 4, health: 120, duration: 35000 },
    4: { name: "Void Titan 🌑", wager: 2500, multiplier: 5, health: 300, duration: 30000 },
};

const SELECTION_TIMEOUT = 10000; // 10 seconds to reach consensus

// ===== COORDINATED BOSS SELECTION =====

// Get current selection phase state (for real-time UI)
export const getBossSelectionPhase = query({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const phase = await ctx.db
            .query("bossSelectionPhase")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .order("desc")
            .first();

        if (!phase || phase.status === "expired") {
            return null;
        }

        // Check if expired but not yet marked
        if (phase.status === "selecting" && Date.now() > phase.expiresAt) {
            return { ...phase, status: "expired" as const };
        }

        return phase;
    },
});

// Player votes for a boss
export const selectBossVote = mutation({
    args: {
        roomId: v.id("rooms"),
        odId: v.id("users"),
        bossLevel: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.odId);
        if (!user) return { success: false, error: "User not found" };

        const room = await ctx.db.get(args.roomId);
        if (!room || room.status !== "finished") {
            return { success: false, error: "Boss selection only available after Bingo ends!" };
        }

        const config = BOSS_CONFIG[args.bossLevel as keyof typeof BOSS_CONFIG];
        if (!config) return { success: false, error: "Invalid boss level" };

        // Check if user can afford this boss
        if (user.coins < config.wager) {
            return { success: false, error: `Need ${config.wager} Gems for ${config.name}!` };
        }

        // Get or create selection phase
        let phase = await ctx.db
            .query("bossSelectionPhase")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("status"), "selecting"))
            .first();

        const now = Date.now();

        // Check if phase expired
        if (phase && now > phase.expiresAt) {
            await ctx.db.patch(phase._id, { status: "expired" });
            return { success: false, error: "Selection time expired! Boss escaped." };
        }

        if (!phase) {
            // First vote starts the timer
            const phaseId = await ctx.db.insert("bossSelectionPhase", {
                roomId: args.roomId,
                status: "selecting",
                expiresAt: now + SELECTION_TIMEOUT,
                playerVotes: [{
                    odId: args.odId,
                    userName: user.name,
                    userAvatar: user.avatar,
                    bossLevel: args.bossLevel,
                    votedAt: now,
                }],
                createdAt: now,
            });
            phase = await ctx.db.get(phaseId);
        } else {
            // Update existing vote or add new one
            const existingVotes = phase.playerVotes.filter(v => v.odId !== args.odId);
            const newVotes = [...existingVotes, {
                odId: args.odId,
                userName: user.name,
                userAvatar: user.avatar,
                bossLevel: args.bossLevel,
                votedAt: now,
            }];

            await ctx.db.patch(phase._id, { playerVotes: newVotes });
            phase = await ctx.db.get(phase._id);
        }

        if (!phase) return { success: false, error: "Failed to update selection" };

        // Check for consensus - all room players voted for same boss
        const roomPlayers = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.neq(q.field("isBot"), true))
            .collect();

        const humanPlayerIds: Array<typeof args.odId> = roomPlayers
            .map(p => p.odId)
            .filter((id): id is typeof args.odId => id !== undefined);
        const votes = phase.playerVotes;

        // All humans voted?
        const allVoted = humanPlayerIds.every(pid =>
            votes.some(v => v.odId === pid)
        );

        if (allVoted && votes.length > 0) {
            // Check if all voted for same boss
            const firstBoss = votes[0].bossLevel;
            const allSame = votes.every(v => v.bossLevel === firstBoss);

            if (allSame) {
                // CONSENSUS REACHED! Auto-start the battle
                const consensusConfig = BOSS_CONFIG[firstBoss as keyof typeof BOSS_CONFIG];

                // Verify all players can afford it
                const playerUsers = await Promise.all(humanPlayerIds.map(id => ctx.db.get(id)));
                const allCanAfford = playerUsers.every(u => u && u.coins >= consensusConfig.wager);

                if (!allCanAfford) {
                    return { success: false, error: "Not all players can afford this boss!" };
                }

                // Mark phase as starting
                await ctx.db.patch(phase._id, {
                    status: "starting",
                    consensusBoss: firstBoss,
                });

                // Deduct wagers from all players
                for (const pUser of playerUsers) {
                    if (pUser) {
                        await ctx.db.patch(pUser._id, { coins: pUser.coins - consensusConfig.wager });
                    }
                }

                // Create the boss game
                const bossGameId = await ctx.db.insert("bossGames", {
                    roomId: args.roomId,
                    bossLevel: firstBoss,
                    health: consensusConfig.health,
                    maxHealth: consensusConfig.health,
                    status: "active",
                    totalWager: consensusConfig.wager * humanPlayerIds.length,
                    participants: humanPlayerIds,
                    calledNumbers: [],
                    startedAt: now,
                    expiresAt: now + consensusConfig.duration,
                    damageEvents: [],
                });

                // Create individual battle entries
                for (const pId of humanPlayerIds) {
                    await ctx.db.insert("bossBattles", {
                        userId: pId,
                        roomId: args.roomId,
                        bossGameId,
                        wager: consensusConfig.wager,
                        reward: 0,
                        status: "pending",
                        bossLevel: firstBoss,
                        createdAt: now,
                    });
                }

                // Give all players fresh cards
                for (const player of roomPlayers) {
                    await ctx.db.patch(player._id, {
                        card: generateBingoCard(),
                        daubedCount: 1,
                        distanceToBingo: 4,
                    });
                }

                // System message
                await ctx.db.insert("messages", {
                    roomId: args.roomId,
                    userId: args.odId,
                    userName: "System",
                    userAvatar: "⚔️",
                    content: `CONSENSUS REACHED! All ${humanPlayerIds.length} players unite to battle ${consensusConfig.name}!`,
                    type: "system",
                    createdAt: now,
                });

                return { success: true, consensus: true, bossLevel: firstBoss };
            }
        }

        return { success: true, consensus: false };
    },
});

// Check and expire stale selection phases (called periodically)
export const checkSelectionExpiry = mutation({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const phase = await ctx.db
            .query("bossSelectionPhase")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("status"), "selecting"))
            .first();

        if (phase && Date.now() > phase.expiresAt) {
            await ctx.db.patch(phase._id, { status: "expired" });

            // System message
            await ctx.db.insert("messages", {
                roomId: args.roomId,
                userName: "System",
                userAvatar: "💨",
                content: `The boss escaped! Players couldn't agree in time.`,
                type: "system",
                createdAt: Date.now(),
            });

            return { expired: true };
        }

        return { expired: false };
    },
});

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

        // Get user info for damage event
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        // Reduce boss health
        const newHealth = Math.max(0, bossGame.health - 1);

        // Track damage event for animations
        const damageEvent = {
            odId: args.userId,
            userName: user.name,
            userAvatar: user.avatar,
            damage: 1,
            timestamp: Date.now(),
        };

        // Keep only last 10 damage events for performance
        const recentEvents = (bossGame.damageEvents || []).slice(-9);
        await ctx.db.patch(bossGame._id, {
            health: newHealth,
            damageEvents: [...recentEvents, damageEvent],
        });

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

        // Check timeout - only if expiresAt is actually set
        if (bossGame.expiresAt && Date.now() > bossGame.expiresAt) {
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

                // Check if player has an active shield
                const hasShield = targetPlayer.shieldUntil && targetPlayer.shieldUntil > Date.now();

                if (hasShield) {
                    // Shield blocks the attack!
                    // Consume the shield (set to expired)
                    await ctx.db.patch(targetPlayer._id, {
                        shieldUntil: 0,
                    });

                    await ctx.db.insert("messages", {
                        roomId: args.roomId,
                        userId: targetId,
                        userName: "System",
                        userAvatar: "🛡️",
                        content: `BLOCKED! ${targetName}'s shield absorbed the ${attackType === "freeze" ? "Ice Nova 🧊" : "Chaos Scramble 🌀"}!`,
                        type: "system",
                        createdAt: Date.now(),
                    });
                } else if (attackType === "freeze") {
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
                    // Chaos Scramble - shuffle ALL undaubed numbers
                    const newCard = targetPlayer.card.map(row => row.map(cell => ({ ...cell })));

                    const columns = [
                        { min: 1, max: 15 },   // B column
                        { min: 16, max: 30 },  // I column
                        { min: 31, max: 45 },  // N column
                        { min: 46, max: 60 },  // G column
                        { min: 61, max: 75 },  // O column
                    ];

                    let scrambledCount = 0;
                    for (let r = 0; r < 5; r++) {
                        for (let c = 0; c < 5; c++) {
                            if (newCard[r][c].value !== "FREE" && !newCard[r][c].daubed) {
                                const range = columns[c];
                                newCard[r][c].value = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
                                scrambledCount++;
                            }
                        }
                    }

                    if (scrambledCount > 0) {
                        await ctx.db.patch(targetPlayer._id, {
                            card: newCard,
                            scrambledAt: Date.now()
                        });
                        await ctx.db.insert("messages", {
                            roomId: args.roomId,
                            userId: targetId,
                            userName: "System",
                            userAvatar: "🌀",
                            content: `CHAOS PULSE! The boss scrambled ALL of ${targetName}'s numbers! (${scrambledCount} changed)`,
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
        const bossGame = await ctx.db
            .query("bossGames")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .order("desc")
            .first();

        if (!bossGame) return null;

        // Only return boss if it's actively relevant:
        // - "preparing" or "active" -> always show
        // - "won" or "lost" -> only show if finished recently (within 60s) for the result screen
        if (bossGame.status === "preparing" || bossGame.status === "active") {
            return bossGame;
        }

        // For won/lost, check if it was recent (show result briefly)
        const isRecent = bossGame.expiresAt && (Date.now() - bossGame.expiresAt) < 60000;
        if (isRecent) {
            return bossGame;
        }

        // Otherwise, don't show stale boss results
        return null;
    },
});

// Claim bingo during boss battle - deals massive damage to boss
export const claimBossBingo = mutation({
    args: {
        roomId: v.id("rooms"),
        odId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const bossGame = await ctx.db
            .query("bossGames")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        if (!bossGame) {
            return { success: false, error: "No active boss battle!" };
        }

        const player = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("odId"), args.odId))
            .first();

        if (!player) {
            return { success: false, error: "Player not in room" };
        }

        // Boss battles use "line" pattern for quick bingos
        const hasBingo = checkBingo(player.card, "line");

        if (!hasBingo) {
            // False bingo - small penalty
            const user = await ctx.db.get(args.odId);
            if (user) {
                await ctx.db.patch(args.odId, {
                    coins: Math.max(0, user.coins - 10),
                });
            }
            return { success: false, error: "Not a valid BINGO! (-10💎)" };
        }

        // Valid bingo! Deal massive damage to boss
        const bingoDamage = 10;
        const newHealth = Math.max(0, bossGame.health - bingoDamage);

        // Track as damage event for animation
        const user = await ctx.db.get(args.odId);
        const damageEvent = {
            odId: args.odId,
            userName: user?.name || "Player",
            userAvatar: user?.avatar || "👤",
            damage: bingoDamage,
            timestamp: Date.now(),
        };

        const recentEvents = (bossGame.damageEvents || []).slice(-9);
        await ctx.db.patch(bossGame._id, {
            health: newHealth,
            damageEvents: [...recentEvents, damageEvent],
        });

        // Regenerate player's card for more bingo opportunities
        const newCard = generateBingoCard();
        await ctx.db.patch(player._id, { card: newCard });

        // System message
        await ctx.db.insert("messages", {
            roomId: args.roomId,
            userId: args.odId,
            userName: "System",
            userAvatar: "💥",
            content: `${user?.name || "A player"} scored BINGO! 💥 ${bingoDamage} MASSIVE DAMAGE! (Boss HP: ${newHealth}/${bossGame.maxHealth})`,
            type: "system",
            createdAt: Date.now(),
        });

        // Check for victory
        if (newHealth <= 0) {
            await ctx.db.patch(bossGame._id, { status: "won" });

            // Calculate rewards for all participants
            const config = BOSS_CONFIG[bossGame.bossLevel as keyof typeof BOSS_CONFIG];
            const totalPrize = Math.floor(
                bossGame.participants.length * config.wager * config.multiplier
            );
            const perPlayerReward = Math.floor(totalPrize / bossGame.participants.length);

            // Distribute rewards
            for (const odId of bossGame.participants) {
                if (!odId) continue;
                const participant = await ctx.db.get(odId);
                if (participant) {
                    await ctx.db.patch(odId, {
                        coins: participant.coins + perPlayerReward,
                    });
                }
            }

            await ctx.db.insert("messages", {
                roomId: args.roomId,
                userName: "System",
                userAvatar: "🏆",
                content: `VICTORY! ${config.name} has been defeated! Each player earned ${perPlayerReward} Gems!`,
                type: "system",
                createdAt: Date.now(),
            });
        }

        return {
            success: true,
            damage: bingoDamage,
            newHealth,
            victory: newHealth <= 0,
        };
    },
});

// Boss-specific powerups
const BOSS_POWERUP_COSTS = {
    quickdaub: 50,
    wild: 100,
    freeze: 120, // Freezes boss timer
    shield: 90,
};

export const useBossPowerup = mutation({
    args: {
        roomId: v.id("rooms"),
        userId: v.id("users"),
        type: v.union(
            v.literal("quickdaub"),
            v.literal("wild"),
            v.literal("freeze"),
            v.literal("shield")
        ),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const cost = BOSS_POWERUP_COSTS[args.type as keyof typeof BOSS_POWERUP_COSTS];
        if (user.coins < cost) {
            return { success: false, error: "Not enough Gems" };
        }

        const bossGame = await ctx.db
            .query("bossGames")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        if (!bossGame) {
            return { success: false, error: "No active boss battle" };
        }

        const player = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("odId"), args.userId))
            .first();

        if (!player) return { success: false, error: "Player not in room" };

        let effectDescription = "";
        let effectApplied = false;

        switch (args.type) {
            case "quickdaub": {
                // Daub one random cell and deal 1 damage to boss
                const unDaubed = [];
                for (let r = 0; r < 5; r++) {
                    for (let c = 0; c < 5; c++) {
                        if (!player.card[r][c].daubed) {
                            unDaubed.push({ r, c });
                        }
                    }
                }
                if (unDaubed.length > 0) {
                    const pos = unDaubed[Math.floor(Math.random() * unDaubed.length)];
                    const newCard = [...player.card];
                    newCard[pos.r][pos.c].daubed = true;

                    await ctx.db.patch(player._id, { card: newCard });

                    // Damage the boss
                    const newHealth = Math.max(0, bossGame.health - 1);
                    await ctx.db.patch(bossGame._id, { health: newHealth });

                    effectDescription = `used QUICK DAUB! Boss took 1 damage! (HP: ${newHealth}/${bossGame.maxHealth})`;
                    effectApplied = true;

                    // Check for victory
                    if (newHealth <= 0) {
                        await ctx.db.patch(bossGame._id, { status: "won" });
                    }
                }
                break;
            }

            case "wild": {
                // Daub two random cells and deal 2 damage to boss
                const availableCells = [];
                for (let r = 0; r < 5; r++) {
                    for (let c = 0; c < 5; c++) {
                        if (!player.card[r][c].daubed) availableCells.push({ r, c });
                    }
                }
                if (availableCells.length >= 2) {
                    const newCard = [...player.card];
                    for (let i = 0; i < 2; i++) {
                        const idx = Math.floor(Math.random() * availableCells.length);
                        const { r, c } = availableCells.splice(idx, 1)[0];
                        newCard[r][c].daubed = true;
                    }
                    await ctx.db.patch(player._id, { card: newCard });

                    // Damage the boss
                    const newHealth = Math.max(0, bossGame.health - 2);
                    await ctx.db.patch(bossGame._id, { health: newHealth });

                    effectDescription = `used WILD! Boss took 2 damage! (HP: ${newHealth}/${bossGame.maxHealth})`;
                    effectApplied = true;

                    // Check for victory
                    if (newHealth <= 0) {
                        await ctx.db.patch(bossGame._id, { status: "won" });
                    }
                }
                break;
            }

            case "freeze": {
                // Freeze the boss timer - extend expiresAt by 10 seconds
                if (bossGame.expiresAt) {
                    await ctx.db.patch(bossGame._id, {
                        expiresAt: bossGame.expiresAt + 10000, // +10 seconds
                    });
                    effectDescription = "used FREEZE RAY on the boss! ❄️ Timer extended by 10 seconds!";
                    effectApplied = true;
                }
                break;
            }

            case "shield": {
                // Protect from boss attacks for 30 seconds
                await ctx.db.patch(player._id, {
                    shieldUntil: Date.now() + 30000,
                });
                effectDescription = "activated TITAN SHIELD! 🛡️ Protected from boss attacks for 30s!";
                effectApplied = true;
                break;
            }
        }

        if (!effectApplied) {
            return { success: false, error: "Power-up could not be applied" };
        }

        // Deduct Gems
        await ctx.db.patch(args.userId, {
            coins: user.coins - cost,
        });

        // Send system message
        await ctx.db.insert("messages", {
            roomId: args.roomId,
            userId: args.userId,
            userName: "System",
            userAvatar: "⚡",
            content: `${user.name} ${effectDescription}`,
            type: "system",
            createdAt: Date.now(),
        });

        return { success: true };
    },
});
