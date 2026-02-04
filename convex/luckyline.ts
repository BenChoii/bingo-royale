import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const LUCKY_LINE_COST = 500;
const JACKPOT_REWARD = 2000;
const CONSOLATION_REWARD = 250;

// All 12 possible bingo lines
const ALL_LINES = [
    { row: 0, col: -1, direction: "row" },
    { row: 1, col: -1, direction: "row" },
    { row: 2, col: -1, direction: "row" },
    { row: 3, col: -1, direction: "row" },
    { row: 4, col: -1, direction: "row" },
    { row: -1, col: 0, direction: "col" },
    { row: -1, col: 1, direction: "col" },
    { row: -1, col: 2, direction: "col" },
    { row: -1, col: 3, direction: "col" },
    { row: -1, col: 4, direction: "col" },
    { row: 0, col: 0, direction: "diag1" }, // top-left to bottom-right
    { row: 0, col: 4, direction: "diag2" }, // top-right to bottom-left
];

// Start a Lucky Line game
export const startLuckyLine = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        if (user.coins < LUCKY_LINE_COST) {
            return { success: false, error: `Need ${LUCKY_LINE_COST} Gems to play Lucky Line!` };
        }

        // Deduct gems
        await ctx.db.patch(args.userId, { coins: user.coins - LUCKY_LINE_COST });

        // Create game
        const gameId = await ctx.db.insert("luckyLineGames", {
            userId: args.userId,
            lines: [],
            calledNumbers: [],
            status: "drawing",
            wager: LUCKY_LINE_COST,
            reward: 0,
            createdAt: Date.now(),
        });

        return { success: true, gameId };
    },
});

// Draw a line (player picks up to 5)
export const drawLine = mutation({
    args: {
        gameId: v.id("luckyLineGames"),
        row: v.number(),
        col: v.number(),
        direction: v.string(),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) return { success: false, error: "Game not found" };
        if (game.status !== "drawing") return { success: false, error: "Not in drawing phase" };
        if (game.lines.length >= 5) return { success: false, error: "Already drew 5 lines" };

        // Check for duplicate
        const duplicate = game.lines.find(
            l => l.row === args.row && l.col === args.col && l.direction === args.direction
        );
        if (duplicate) return { success: false, error: "Line already drawn" };

        await ctx.db.patch(args.gameId, {
            lines: [...game.lines, { row: args.row, col: args.col, direction: args.direction }],
        });

        return { success: true, linesDrawn: game.lines.length + 1 };
    },
});

// Remove a line (undo)
export const removeLine = mutation({
    args: {
        gameId: v.id("luckyLineGames"),
        index: v.number(),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) return { success: false, error: "Game not found" };
        if (game.status !== "drawing") return { success: false, error: "Not in drawing phase" };

        const newLines = [...game.lines];
        newLines.splice(args.index, 1);

        await ctx.db.patch(args.gameId, { lines: newLines });
        return { success: true };
    },
});

// Reveal the winner
export const revealWinner = mutation({
    args: { gameId: v.id("luckyLineGames") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) return { success: false, error: "Game not found" };
        if (game.status !== "drawing") return { success: false, error: "Already revealed" };
        if (game.lines.length === 0) return { success: false, error: "Draw at least 1 line!" };

        // Generate 75 random numbers (shuffled 1-75)
        const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

        // Generate a virtual 5x5 bingo card
        const ranges = [
            [1, 15], [16, 30], [31, 45], [46, 60], [61, 75]
        ];
        const card: number[][] = [];
        for (let col = 0; col < 5; col++) {
            const colNums = numbers.filter(n => n >= ranges[col][0] && n <= ranges[col][1]).slice(0, 5);
            card.push(colNums);
        }
        // Transpose to rows
        const grid: number[][] = [];
        for (let r = 0; r < 5; r++) {
            grid.push([card[0][r], card[1][r], card[2][r], card[3][r], card[4][r]]);
        }

        // Simulate calling numbers until a line completes
        let winningLine: { row: number; col: number; direction: string } | undefined = undefined;
        const calledNumbers: number[] = [];
        const daubed = Array.from({ length: 5 }, () => Array(5).fill(false));

        for (const num of numbers) {
            calledNumbers.push(num);

            // Mark on grid
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (grid[r][c] === num) {
                        daubed[r][c] = true;
                    }
                }
            }

            // Check all lines for completion
            for (const line of ALL_LINES) {
                let complete = true;
                if (line.direction === "row") {
                    for (let c = 0; c < 5; c++) {
                        if (!daubed[line.row][c]) complete = false;
                    }
                } else if (line.direction === "col") {
                    for (let r = 0; r < 5; r++) {
                        if (!daubed[r][line.col]) complete = false;
                    }
                } else if (line.direction === "diag1") {
                    for (let i = 0; i < 5; i++) {
                        if (!daubed[i][i]) complete = false;
                    }
                } else if (line.direction === "diag2") {
                    for (let i = 0; i < 5; i++) {
                        if (!daubed[i][4 - i]) complete = false;
                    }
                }

                if (complete) {
                    winningLine = { row: line.row, col: line.col, direction: line.direction };
                    break;
                }
            }
            if (winningLine) break;
        }

        // Check if player won
        let reward = 0;
        let status: "won" | "lost" = "lost";

        for (let i = 0; i < game.lines.length; i++) {
            const line = game.lines[i];
            const match = winningLine &&
                line.row === winningLine.row &&
                line.col === winningLine.col &&
                line.direction === winningLine.direction;

            if (match) {
                if (i === 0) {
                    // Jackpot! First pick matches
                    reward = JACKPOT_REWARD;
                    status = "won";
                } else {
                    // Consolation
                    reward = CONSOLATION_REWARD;
                    status = "won";
                }
                break;
            }
        }

        // Update game
        await ctx.db.patch(args.gameId, {
            status,
            winningLine,
            calledNumbers,
            reward,
        });

        // Credit reward
        if (reward > 0) {
            const user = await ctx.db.get(game.userId);
            if (user) {
                await ctx.db.patch(game.userId, { coins: user.coins + reward });
            }
        }

        return {
            success: true,
            status,
            reward,
            winningLine,
            jackpot: reward === JACKPOT_REWARD,
            calledNumbers,
        };
    },
});

// Get current game
export const getCurrentGame = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("luckyLineGames")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("status"), "drawing"))
            .first();
    },
});

// Get game by ID
export const getGame = query({
    args: { gameId: v.id("luckyLineGames") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.gameId);
    },
});
