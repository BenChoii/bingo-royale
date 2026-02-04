import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { calculateDistanceToBingo } from "./games";

const POWERUP_COSTS = {
    quickdaub: 50,
    wild: 100,
    doublexp: 75,
    peek: 60,
    freeze: 120,
    shuffle: 80,
    blind: 100,
    shield: 90,
    undaub: 110,
};

type PowerupType = keyof typeof POWERUP_COSTS;

// Use a power-up
export const usePowerup = mutation({
    args: {
        gameId: v.id("games"),
        userId: v.id("users"),
        type: v.union(
            v.literal("quickdaub"),
            v.literal("wild"),
            v.literal("doublexp"),
            v.literal("peek"),
            v.literal("freeze"),
            v.literal("shuffle"),
            v.literal("blind"),
            v.literal("shield"),
            v.literal("undaub")
        ),
        targetUserId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const type = args.type as PowerupType;
        const cost = POWERUP_COSTS[type];
        if (user.coins < cost) {
            return { success: false, error: "Not enough Gems" };
        }

        const game = await ctx.db.get(args.gameId);
        if (!game || game.winnerId) {
            return { success: false, error: "Game is not active" };
        }

        // Cooldown check (60 seconds)
        const lastPowerup = await ctx.db
            .query("powerups")
            .withIndex("by_game_user_type", (q) =>
                q.eq("gameId", args.gameId)
                    .eq("sourceUserId", args.userId)
                    .eq("type", args.type)
            )
            .order("desc")
            .first();

        if (lastPowerup) {
            const timeSince = Date.now() - lastPowerup.usedAt;
            const cooldown = 60000;
            if (timeSince < cooldown) {
                const remaining = Math.ceil((cooldown - timeSince) / 1000);
                return { success: false, error: `Cooldown active: ${remaining}s left` };
            }
        }

        // Apply effect
        const player = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", game.roomId))
            .filter((q) => q.eq(q.field("odId"), args.userId))
            .first();

        if (!player) return { success: false, error: "Player not in room" };

        let effectDescription = "";
        let effectApplied = false;

        switch (type) {
            case "quickdaub": {
                const unDaubed = [];
                for (let r = 0; r < 5; r++) {
                    for (let c = 0; c < 5; c++) {
                        if (!player.card[r][c].daubed) {
                            unDaubed.push({ r, c });
                        }
                    }
                }
                if (unDaubed.length > 0) {
                    const randomPos = unDaubed[Math.floor(Math.random() * unDaubed.length)];
                    const newCard = [...player.card];
                    newCard[randomPos.r][randomPos.c].daubed = true;

                    const distance = calculateDistanceToBingo(newCard, game.pattern);
                    await ctx.db.patch(player._id, {
                        card: newCard,
                        daubedCount: player.daubedCount + 1,
                        distanceToBingo: distance,
                    });
                    effectDescription = "daubed a random number!";
                    effectApplied = true;
                }
                break;
            }

            case "wild": {
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
                    const distance = calculateDistanceToBingo(newCard, game.pattern);
                    await ctx.db.patch(player._id, {
                        card: newCard,
                        daubedCount: player.daubedCount + 2,
                        distanceToBingo: distance,
                    });
                    effectDescription = "used a WILD to daub two numbers!";
                    effectApplied = true;
                }
                break;
            }

            case "peek":
                effectDescription = "is peeking at the next ball...";
                effectApplied = true;
                return { success: true, peekedNumber: game.nextNumber };

            case "doublexp":
                effectDescription = "activated Double XP!";
                effectApplied = true;
                break;

            case "freeze": {
                if (!args.targetUserId) return { success: false, error: "Target required for Freeze!" };
                const targetPlayer = await ctx.db
                    .query("roomPlayers")
                    .withIndex("by_room", (q) => q.eq("roomId", game.roomId))
                    .filter((q) => q.eq(q.field("odId"), args.targetUserId))
                    .first();

                if (!targetPlayer) return { success: false, error: "Target player not found" };
                if (targetPlayer.shieldUntil && targetPlayer.shieldUntil > Date.now()) {
                    effectDescription = `tried to freeze ${targetPlayer.odId} but they were SHIELDED!`;
                    effectApplied = true;
                    // Still consume gems? In PvP games, usually yes, or "Blocked!"
                } else {
                    await ctx.db.patch(targetPlayer._id, {
                        frozenUntil: Date.now() + 7000,
                    });
                    const targetUser = await ctx.db.get(args.targetUserId);
                    effectDescription = `FROZE ${targetUser?.name || "someone"} for 7 seconds! 🧊`;
                    effectApplied = true;
                }
                break;
            }

            case "shuffle": {
                if (!args.targetUserId) return { success: false, error: "Target required for Scramble!" };
                const targetPlayer = await ctx.db
                    .query("roomPlayers")
                    .withIndex("by_room", (q) => q.eq("roomId", game.roomId))
                    .filter((q) => q.eq(q.field("odId"), args.targetUserId))
                    .first();

                if (!targetPlayer) return { success: false, error: "Target player not found" };
                if (targetPlayer.shieldUntil && targetPlayer.shieldUntil > Date.now()) {
                    effectDescription = `tried to scramble ${targetPlayer.odId} but they were SHIELDED!`;
                    effectApplied = true;
                } else {
                    const unDaubed = [];
                    for (let r = 0; r < 5; r++) {
                        for (let c = 0; c < 5; c++) {
                            if (!targetPlayer.card[r][c].daubed && targetPlayer.card[r][c].value !== "FREE") {
                                unDaubed.push({ r, c });
                            }
                        }
                    }
                    if (unDaubed.length > 0) {
                        const pos = unDaubed[Math.floor(Math.random() * unDaubed.length)];
                        // Deep copy the card to avoid mutation issues
                        const newCard = targetPlayer.card.map(row => row.map(cell => ({ ...cell })));
                        const oldVal = newCard[pos.r][pos.c].value;
                        const newVal = Math.floor(Math.random() * 75) + 1;
                        newCard[pos.r][pos.c].value = newVal;

                        await ctx.db.patch(targetPlayer._id, {
                            card: newCard,
                            scrambledAt: Date.now()
                        });
                        const targetUser = await ctx.db.get(args.targetUserId);
                        effectDescription = `SCRAMBLED ${targetUser?.name || "someone's"} card! (Changed ${oldVal} to ${newVal}) 🌀`;
                        effectApplied = true;
                    }
                }
                break;
            }

            case "shield": {
                await ctx.db.patch(player._id, {
                    shieldUntil: Date.now() + 30000,
                });
                effectDescription = "activated a TITAN SHIELD! 🛡️ (30s)";
                effectApplied = true;
                break;
            }

            case "undaub": {
                if (!args.targetUserId) return { success: false, error: "Target required for Undaub!" };
                const targetPlayer = await ctx.db
                    .query("roomPlayers")
                    .withIndex("by_room", (q) => q.eq("roomId", game.roomId))
                    .filter((q) => q.eq(q.field("odId"), args.targetUserId))
                    .first();

                if (!targetPlayer) return { success: false, error: "Target player not found" };
                if (targetPlayer.shieldUntil && targetPlayer.shieldUntil > Date.now()) {
                    effectDescription = `tried to undaub ${targetPlayer.odId} but they were SHIELDED!`;
                    effectApplied = true;
                } else {
                    // Find daubed cells (excluding FREE space)
                    const daubedCells = [];
                    for (let r = 0; r < 5; r++) {
                        for (let c = 0; c < 5; c++) {
                            if (targetPlayer.card[r][c].daubed && targetPlayer.card[r][c].value !== "FREE") {
                                daubedCells.push({ r, c });
                            }
                        }
                    }
                    if (daubedCells.length > 0) {
                        const pos = daubedCells[Math.floor(Math.random() * daubedCells.length)];
                        // Deep copy the card
                        const newCard = targetPlayer.card.map(row => row.map(cell => ({ ...cell })));
                        const removedVal = newCard[pos.r][pos.c].value;
                        newCard[pos.r][pos.c].daubed = false;

                        const distance = calculateDistanceToBingo(newCard, game.pattern);
                        await ctx.db.patch(targetPlayer._id, {
                            card: newCard,
                            daubedCount: Math.max(0, targetPlayer.daubedCount - 1),
                            distanceToBingo: distance,
                        });
                        const targetUser = await ctx.db.get(args.targetUserId);
                        effectDescription = `UNDAUBED ${targetUser?.name || "someone's"} card! (Removed ${removedVal}) 🚫`;
                        effectApplied = true;
                    } else {
                        return { success: false, error: "No daubed numbers to remove!" };
                    }
                }
                break;
            }

            default:
                effectDescription = `used ${type}!`;
                effectApplied = true;
        }

        if (!effectApplied) {
            return { success: false, error: "Power-up could not be applied" };
        }

        // Deduct Gems
        await ctx.db.patch(args.userId, {
            coins: user.coins - cost,
        });

        // Record usage
        await ctx.db.insert("powerups", {
            gameId: args.gameId,
            sourceUserId: args.userId,
            targetUserId: args.targetUserId,
            type: args.type,
            usedAt: Date.now(),
        });

        // Send system message
        await ctx.db.insert("messages", {
            roomId: game.roomId,
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
