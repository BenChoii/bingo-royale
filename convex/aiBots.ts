import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { generateBingoCard } from "./rooms";
import { internal } from "./_generated/api";

// Bot difficulty configuration based on buy-in
export const BOT_DIFFICULTY = {
    easy: { reactionDelay: 2000, missChance: 0.15, botCount: 2 },
    medium: { reactionDelay: 1000, missChance: 0.08, botCount: 3 },
    hard: { reactionDelay: 500, missChance: 0.03, botCount: 4 },
    expert: { reactionDelay: 200, missChance: 0, botCount: 5 },
};

// Fun bot names
const BOT_NAMES = [
    { name: "Lucky Larry", avatar: "🤖" },
    { name: "Bingo Betty", avatar: "👵" },
    { name: "Fast Fred", avatar: "🏃" },
    { name: "Queen Beatrice", avatar: "👑" },
    { name: "Speedy Sam", avatar: "⚡" },
    { name: "Pro Pat", avatar: "🎯" },
    { name: "Ace Alice", avatar: "🃏" },
    { name: "Sharp Shane", avatar: "🦅" },
    { name: "Turbo Terry", avatar: "🚀" },
    { name: "Mega Mike", avatar: "💪" },
];

// Get difficulty based on buy-in
export function getDifficultyFromBuyIn(buyIn: number): keyof typeof BOT_DIFFICULTY {
    if (buyIn >= 2000) return "expert";
    if (buyIn >= 500) return "hard";
    if (buyIn >= 100) return "medium";
    return "easy";
}

// Add bots to a room for single-player mode
export const addBotsToRoom = internalMutation({
    args: {
        roomId: v.id("rooms"),
        buyIn: v.number(),
    },
    handler: async (ctx, args) => {
        const difficulty = getDifficultyFromBuyIn(args.buyIn);
        const config = BOT_DIFFICULTY[difficulty];

        // Shuffle and pick bot names
        const shuffledBots = [...BOT_NAMES].sort(() => Math.random() - 0.5);
        const botsToAdd = shuffledBots.slice(0, config.botCount);

        const botIds: string[] = [];

        for (const bot of botsToAdd) {
            // Generate a bingo card for the bot
            const card = generateBingoCard();

            // Add bot as a player with isBot flag
            const botPlayerId = await ctx.db.insert("roomPlayers", {
                roomId: args.roomId,
                odId: undefined, // Bots don't have a user ID
                card,
                daubedCount: 1, // Free space
                distanceToBingo: 4,
                isReady: true,
                hasCalledBingo: false,
                joinedAt: Date.now(),
                isBot: true,
                botName: bot.name,
                botAvatar: bot.avatar,
                botDifficulty: difficulty,
            });

            botIds.push(botPlayerId);
        }

        // Send system message
        await ctx.db.insert("messages", {
            roomId: args.roomId,
            userId: undefined,
            userName: "System",
            userAvatar: "🤖",
            content: `${config.botCount} AI opponents have joined! Good luck!`,
            type: "system",
            createdAt: Date.now(),
        });

        return { success: true, botCount: config.botCount, difficulty };
    },
});

// Bot daubs a number (called after delay)
export const botDaubNumber = internalMutation({
    args: {
        botPlayerId: v.id("roomPlayers"),
        number: v.number(),
        gameId: v.id("games"),
    },
    handler: async (ctx, args) => {
        const botPlayer = await ctx.db.get(args.botPlayerId);
        if (!botPlayer || !botPlayer.isBot) return;

        const game = await ctx.db.get(args.gameId);
        if (!game || game.winnerId) return; // Game already won

        const room = await ctx.db.get(game.roomId);
        if (!room || room.status !== "playing") return;

        // Check miss chance
        const difficulty = botPlayer.botDifficulty || "easy";
        const config = BOT_DIFFICULTY[difficulty as keyof typeof BOT_DIFFICULTY];
        if (Math.random() < config.missChance) {
            // Bot "misses" this number (doesn't daub)
            return;
        }

        // Daub the number on bot's card
        let daubedThisNumber = false;
        const updatedCard = botPlayer.card.map((row: any[]) =>
            row.map((cell: any) => {
                if (cell.value === args.number && !cell.daubed) {
                    daubedThisNumber = true;
                    return { ...cell, daubed: true };
                }
                return cell;
            })
        );

        if (!daubedThisNumber) return;

        const newDaubedCount = (botPlayer.daubedCount || 1) + 1;

        await ctx.db.patch(args.botPlayerId, {
            card: updatedCard,
            daubedCount: newDaubedCount,
        });

        // Check if bot got bingo
        const hasBingo = checkBotBingo(updatedCard, game.pattern);

        if (hasBingo) {
            // Bot wins!
            await ctx.db.patch(args.gameId, {
                winnerId: args.botPlayerId as any,
                endedAt: Date.now(),
            });

            await ctx.db.patch(game.roomId, {
                status: "finished",
            });

            // Send win message
            await ctx.db.insert("messages", {
                roomId: game.roomId,
                userId: undefined,
                userName: "System",
                userAvatar: "🏆",
                content: `${botPlayer.botName} (AI) won the game! Better luck next time!`,
                type: "system",
                createdAt: Date.now(),
            });
        }
    },
});

// Check if bot has bingo (simplified version)
function checkBotBingo(card: any[][], pattern: string): boolean {
    if (pattern === "blackout") {
        // All cells must be daubed
        return card.every(row => row.every(cell => cell.daubed));
    }

    // Check rows
    for (const row of card) {
        if (row.every(cell => cell.daubed)) return true;
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
        let colComplete = true;
        for (let row = 0; row < 5; row++) {
            if (!card[row][col].daubed) {
                colComplete = false;
                break;
            }
        }
        if (colComplete) return true;
    }

    // Check diagonals
    let diag1 = true, diag2 = true;
    for (let i = 0; i < 5; i++) {
        if (!card[i][i].daubed) diag1 = false;
        if (!card[i][4 - i].daubed) diag2 = false;
    }
    if (diag1 || diag2) return true;

    return false;
}

// Get bots in a room
export const getBotsInRoom = internalQuery({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const players = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .collect();

        return players.filter(p => p.isBot);
    },
});
