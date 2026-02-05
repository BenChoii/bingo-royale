import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateBingoCard } from "./rooms";

// Specific patterns for pattern mode - each has a name and the exact cells required
export const SPECIFIC_PATTERNS: Record<string, { name: string; emoji: string; cells: [number, number][] }> = {
    // Diagonals
    "diagonal_down": { name: "Diagonal ↘", emoji: "↘️", cells: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]] },
    "diagonal_up": { name: "Diagonal ↗", emoji: "↗️", cells: [[4, 0], [3, 1], [2, 2], [1, 3], [0, 4]] },

    // X shape
    "x_shape": { name: "X Pattern", emoji: "❌", cells: [[0, 0], [0, 4], [1, 1], [1, 3], [2, 2], [3, 1], [3, 3], [4, 0], [4, 4]] },

    // Corners
    "four_corners": { name: "Four Corners", emoji: "📐", cells: [[0, 0], [0, 4], [4, 0], [4, 4]] },

    // Specific rows
    "top_row": { name: "Top Row", emoji: "⬆️", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    "bottom_row": { name: "Bottom Row", emoji: "⬇️", cells: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]] },
    "middle_row": { name: "Middle Row", emoji: "➡️", cells: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]] },

    // Specific columns
    "left_column": { name: "B Column", emoji: "🅱️", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    "right_column": { name: "O Column", emoji: "🅾️", cells: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]] },

    // T shapes
    "t_top": { name: "T Shape ⊤", emoji: "🇹", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 2], [3, 2], [4, 2]] },
    "t_bottom": { name: "T Shape ⊥", emoji: "🇹", cells: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]] },

    // L shapes  
    "l_shape": { name: "L Shape", emoji: "🇱", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]] },

    // Plus/Cross
    "plus": { name: "Plus +", emoji: "➕", cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [3, 2], [4, 2]] },

    // Frame/Border
    "frame": { name: "Frame", emoji: "🖼️", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 4], [2, 0], [2, 4], [3, 0], [3, 4], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]] },

    // Diamond
    "diamond": { name: "Diamond", emoji: "💎", cells: [[0, 2], [1, 1], [1, 3], [2, 0], [2, 2], [2, 4], [3, 1], [3, 3], [4, 2]] },
};

// Get a random specific pattern
export function getRandomSpecificPattern(): string {
    const patternKeys = Object.keys(SPECIFIC_PATTERNS);
    return patternKeys[Math.floor(Math.random() * patternKeys.length)];
}

// Game configuration by mode
const GAME_CONFIG = {
    classic: { interval: 3000, pattern: "line", xpMultiplier: 1 },
    speed: { interval: 1500, pattern: "line", xpMultiplier: 1.5 },
    pattern: { interval: 2500, pattern: "specific", xpMultiplier: 2 },
    blackout: { interval: 2000, pattern: "blackout", xpMultiplier: 3 },
};

// Start a game in a room
export const startGame = mutation({
    args: {
        roomId: v.id("rooms"),
        hostId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get(args.roomId);
        if (!room) return { success: false, error: "Room not found" };

        // Allow any player to start the game
        if (room.status !== "waiting" && room.status !== "finished") {
            return { success: false, error: "Game already in progress" };
        }

        // Reset player cards if replaying
        if (room.status === "finished") {
            const players = await ctx.db
                .query("roomPlayers")
                .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
                .collect();

            for (const player of players) {
                const newCard = generateBingoCard();
                await ctx.db.patch(player._id, {
                    card: newCard,
                    daubedCount: 1, // Free space
                    distanceToBingo: 4,
                    hasCalledBingo: false,
                });
            }
        }

        // Games can be played solo or with other players

        // Update room status
        await ctx.db.patch(args.roomId, { status: "playing" });

        // Pre-calculate first next number
        const nextNumber = Math.floor(Math.random() * 75) + 1;

        // Create game record
        const config = GAME_CONFIG[room.mode];

        // For pattern mode, select a random specific pattern
        const patternToUse = config.pattern === "specific"
            ? getRandomSpecificPattern()
            : config.pattern;

        const gameId = await ctx.db.insert("games", {
            roomId: args.roomId,
            calledNumbers: [],
            currentNumber: undefined,
            nextNumber,
            pattern: patternToUse,
            winnerId: undefined,
            startedAt: Date.now(),
            endedAt: undefined,
            nextCallAt: Date.now() + config.interval,
        });

        // Send system message
        await ctx.db.insert("messages", {
            roomId: args.roomId,
            userId: args.hostId,
            userName: "System",
            userAvatar: "🎱",
            content: "Game started! Good luck everyone!",
            type: "system",
            createdAt: Date.now(),
        });

        // Schedule first number call
        await ctx.scheduler.runAfter(config.interval, internal.games.callNextNumber, {
            gameId,
        });

        return { success: true, gameId };
    },
});

// Internal: Call the next number
export const callNextNumber = internalMutation({
    args: { gameId: v.id("games") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game || game.winnerId) return;

        const room = await ctx.db.get(game.roomId);
        if (!room || room.status !== "playing") return;

        // All 75 numbers called, game should end
        if (game.calledNumbers.length >= 75) return;

        // If nextNumber is somehow undefined, pick a new one
        let nextNumber = game.nextNumber;
        if (!nextNumber) {
            const allNumbers = [...Array(75)].map((_, i) => i + 1);
            const available = allNumbers.filter((n) => !game.calledNumbers.includes(n));
            if (available.length === 0) return;
            nextNumber = available[Math.floor(Math.random() * available.length)];
        }

        const newCalledNumbers = [...game.calledNumbers, nextNumber];

        // Pick the NEXT next number
        const allNumbers = [...Array(75)].map((_, i) => i + 1);
        const available = allNumbers.filter((n) => !newCalledNumbers.includes(n));
        const nextNextNumber = available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : undefined;

        await ctx.db.patch(args.gameId, {
            calledNumbers: newCalledNumbers,
            currentNumber: nextNumber,
            nextNumber: nextNextNumber,
        });

        const players = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", game.roomId))
            .collect();

        const now = Date.now();
        for (const player of players) {
            // Skip bots - they daub on their own schedule
            if (player.isBot) continue;

            // Check if player is frozen
            if (player.frozenUntil && player.frozenUntil > now) {
                continue;
            }

            // Auto-mark called numbers on cards
            let newDaubs = 0;
            const updatedCard = player.card.map((row: any[]) =>
                row.map((cell: any) => {
                    if (cell.value === nextNumber && !cell.daubed) {
                        newDaubs++;
                        return { ...cell, daubed: true };
                    }
                    return cell;
                })
            );

            if (newDaubs > 0) {
                const distance = calculateDistanceToBingo(updatedCard, game.pattern);
                await ctx.db.patch(player._id, {
                    card: updatedCard,
                    daubedCount: player.daubedCount + newDaubs,
                    distanceToBingo: distance,
                });
            }
        }

        // Schedule next number call
        const config = GAME_CONFIG[room.mode];
        await ctx.scheduler.runAfter(config.interval, internal.games.callNextNumber, {
            gameId: args.gameId,
        });
    },
});

// Manual daub for called numbers
export const daubNumber = mutation({
    args: {
        gameId: v.id("games"),
        userId: v.id("users"),
        number: v.number(),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) return { success: false, error: "Game not found" };

        const room = await ctx.db.get(game.roomId);
        if (!room) return { success: false, error: "Room not found" };
        if (room.status !== "playing") return { success: false, error: "Game not active" };

        // Check if number has been called
        if (!game.calledNumbers.includes(args.number)) {
            return { success: false, error: "Number not called yet" };
        }

        const player = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", game.roomId))
            .filter((q) => q.eq(q.field("odId"), args.userId))
            .first();

        if (!player) return { success: false, error: "Player not in room" };

        // Check if player is frozen
        if (player.frozenUntil && player.frozenUntil > Date.now()) {
            return { success: false, error: "You're frozen!" };
        }

        // Find and daub the cell
        let foundAndDaubed = false;
        const updatedCard = player.card.map((row: any[]) =>
            row.map((cell: any) => {
                if (cell.value === args.number && !cell.daubed) {
                    foundAndDaubed = true;
                    return { ...cell, daubed: true };
                }
                return cell;
            })
        );

        if (!foundAndDaubed) {
            return { success: false, error: "Already daubed or not on card" };
        }

        const distance = calculateDistanceToBingo(updatedCard, game.pattern);
        await ctx.db.patch(player._id, {
            card: updatedCard,
            daubedCount: player.daubedCount + 1,
            distanceToBingo: distance,
        });

        return { success: true };
    },
});

// Player claims bingo
export const claimBingo = mutation({
    args: {
        gameId: v.id("games"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) return { success: false, error: "Game not found" };
        if (game.winnerId) return { success: false, error: "Game already won" };

        const room = await ctx.db.get(game.roomId);
        if (!room) return { success: false, error: "Room not found" };

        const player = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", game.roomId))
            .filter((q) => q.eq(q.field("odId"), args.userId))
            .first();

        if (!player) return { success: false, error: "Player not in game" };

        // Verify bingo
        const hasBingo = checkBingo(player.card, game.pattern);

        if (!hasBingo) {
            // False bingo - penalty
            const user = await ctx.db.get(args.userId);
            if (user) {
                await ctx.db.patch(args.userId, {
                    coins: Math.max(0, user.coins - 25),
                });
            }
            return { success: false, error: "Invalid bingo!" };
        }

        // Winner!
        await ctx.db.patch(args.gameId, {
            winnerId: args.userId,
            endedAt: Date.now(),
        });

        await ctx.db.patch(game.roomId, { status: "finished" });

        // Award prizes
        const user = await ctx.db.get(args.userId);
        if (user) {
            const config = GAME_CONFIG[room.mode];
            const xpEarned = Math.round(50 * config.xpMultiplier);
            const gemsEarned = room.prizePool > 0 ? room.prizePool : 10;

            let xp = user.xp + xpEarned;
            let level = user.level;
            let xpToNext = user.xpToNext;
            let levelUps = 0;

            while (xp >= xpToNext) {
                xp -= xpToNext;
                level++;
                levelUps++;
                xpToNext = Math.round(xpToNext * 1.5);
            }

            // Achievements logic
            const currentAchievements = user.achievements || [];
            const newAchievements = [...currentAchievements];

            if (user.totalWins === 0) {
                newAchievements.push("First Win! 🏆");
            }
            if (user.currentStreak + 1 === 3) {
                newAchievements.push("Triple Threat (3-win streak)! 🔥");
            }
            if (user.coins + gemsEarned >= 1000 && !currentAchievements.includes("Wealthy 💎")) {
                newAchievements.push("Wealthy 💎");
            }

            await ctx.db.patch(args.userId, {
                xp,
                level,
                xpToNext,
                coins: user.coins + gemsEarned,
                totalWins: user.totalWins + 1,
                totalGames: user.totalGames + 1,
                currentStreak: user.currentStreak + 1,
                bestStreak: Math.max(user.bestStreak, user.currentStreak + 1),
                achievements: newAchievements,
            });

            // System message
            await ctx.db.insert("messages", {
                roomId: game.roomId,
                userId: args.userId,
                userName: "System",
                userAvatar: "🎉",
                content: `${user.name} got BINGO! 🎉 +${xpEarned} XP, +${gemsEarned} Gems!`,
                type: "system",
                createdAt: Date.now(),
            });

            return {
                success: true,
                xpEarned,
                coinsEarned: gemsEarned,
                levelUp: levelUps > 0,
            };
        }

        return { success: true };
    },
});

// Get current game state
export const getGameState = query({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const game = await ctx.db
            .query("games")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .order("desc")
            .first();

        if (!game) return null;

        const players = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .collect();

        // Filter out bots - only show real players
        const humanPlayers = players.filter(p => p.odId !== undefined);

        const playersWithDetails = await Promise.all(
            humanPlayers.map(async (player) => {
                const user = player.odId ? await ctx.db.get(player.odId) : null;
                return {
                    odId: player.odId,
                    name: user?.name || "Unknown",
                    avatar: user?.avatar || "👤",
                    distanceToBingo: player.distanceToBingo,
                    hasCalledBingo: player.hasCalledBingo,
                    frozenUntil: player.frozenUntil,
                    shieldUntil: player.shieldUntil,
                    scrambledAt: player.scrambledAt,
                    card: player.card,
                };
            })
        );

        // Sort by distance to bingo
        playersWithDetails.sort((a, b) => a.distanceToBingo - b.distanceToBingo);

        let winner = null;
        if (game.winnerId) {
            const winnerUser = await ctx.db.get(game.winnerId);
            winner = winnerUser ? { name: winnerUser.name, avatar: winnerUser.avatar } : null;
        }

        const powerupHistory = await ctx.db
            .query("powerups")
            .withIndex("by_game", (q) => q.eq("gameId", game._id))
            .collect();

        return {
            ...game,
            players: playersWithDetails,
            winner,
            powerupHistory,
        };
    },
});

// Get player's card
export const getMyCard = query({
    args: {
        roomId: v.id("rooms"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const player = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .filter((q) => q.eq(q.field("odId"), args.userId))
            .first();

        return player?.card || null;
    },
});

// Helper: Check if card has bingo
export function checkBingo(
    card: { value: number | string; daubed: boolean }[][],
    pattern: string
): boolean {
    if (pattern === "blackout") {
        return card.every((row) => row.every((cell) => cell.daubed));
    }

    // Check if this is a specific pattern
    if (SPECIFIC_PATTERNS[pattern]) {
        const specificPattern = SPECIFIC_PATTERNS[pattern];
        return specificPattern.cells.every(([row, col]) => card[row][col].daubed);
    }

    // For "line" pattern or fallback - check any line (horizontal, vertical, diagonal)
    const linePatterns = [
        // Horizontal
        [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
        [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
        [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
        [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
        [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
        // Vertical
        [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
        [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
        [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
        [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]],
        [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]],
        // Diagonals
        [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]],
        [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]],
    ];

    return linePatterns.some((p) =>
        p.every(([row, col]) => card[row][col].daubed)
    );
}

// Helper: Calculate distance to bingo
export function calculateDistanceToBingo(
    card: { value: number | string; daubed: boolean }[][],
    pattern: string
): number {
    if (pattern === "blackout") {
        let remaining = 0;
        card.forEach((row) =>
            row.forEach((cell) => {
                if (!cell.daubed) remaining++;
            })
        );
        return remaining;
    }

    // Check if this is a specific pattern
    if (SPECIFIC_PATTERNS[pattern]) {
        const specificPattern = SPECIFIC_PATTERNS[pattern];
        return specificPattern.cells.filter(([row, col]) => !card[row][col].daubed).length;
    }

    // For "line" pattern or fallback - find closest line
    const linePatterns = [
        [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
        [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
        [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
        [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
        [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
        [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
        [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
        [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
        [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]],
        [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]],
        [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]],
        [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]],
    ];

    let minDistance = 5;
    linePatterns.forEach((p) => {
        const remaining = p.filter(([row, col]) => !card[row][col].daubed).length;
        minDistance = Math.min(minDistance, remaining);
    });

    return minDistance;
}

