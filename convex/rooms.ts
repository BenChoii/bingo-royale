import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a random 6-character room code
function generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Create a new game room
export const createRoom = mutation({
    args: {
        hostId: v.id("users"),
        name: v.string(),
        mode: v.union(
            v.literal("classic"),
            v.literal("speed"),
            v.literal("pattern"),
            v.literal("blackout")
        ),
        maxPlayers: v.number(),
        buyIn: v.number(),
        isPrivate: v.boolean(),
        password: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Generate unique room code
        let code = generateRoomCode();
        let existing = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", code))
            .first();

        while (existing) {
            code = generateRoomCode();
            existing = await ctx.db
                .query("rooms")
                .withIndex("by_code", (q) => q.eq("code", code))
                .first();
        }

        const host = await ctx.db.get(args.hostId);
        if (!host) return { success: false, error: "Host not found" };
        if (host.coins < args.buyIn) {
            return { success: false, error: "Insufficient Gems for buy-in" };
        }

        // Deduct from host
        if (args.buyIn > 0) {
            await ctx.db.patch(args.hostId, { coins: host.coins - args.buyIn });
        }

        const roomId = await ctx.db.insert("rooms", {
            code,
            name: args.name,
            hostId: args.hostId,
            status: "waiting",
            mode: args.mode,
            maxPlayers: args.maxPlayers,
            buyIn: args.buyIn,
            prizePool: args.buyIn, // Initial prize pool from host
            isPrivate: args.isPrivate,
            password: args.password,
            createdAt: Date.now(),
        });

        return { success: true, roomId, code };
    },
});

// Join a room by code
export const joinRoom = mutation({
    args: {
        code: v.string(),
        userId: v.id("users"),
        password: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
            .first();

        if (!room) {
            return { success: false, error: "Room not found" };
        }

        if (room.status === "finished") {
            return { success: false, error: "Game already finished" };
        }

        if (room.isPrivate && room.password !== args.password) {
            return { success: false, error: "Incorrect password" };
        }

        // Check if already in room
        const existingPlayer = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .filter((q) => q.eq(q.field("odId"), args.userId))
            .first();

        if (existingPlayer) {
            return { success: true, roomId: room._id };
        }

        // Check max players
        const players = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect();

        if (players.length >= room.maxPlayers) {
            return { success: false, error: "Room is full" };
        }

        // Handle buy-in strictly
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        if (room.buyIn > 0) {
            if (user.coins < room.buyIn) {
                return { success: false, error: "Insufficient Gems for buy-in" };
            }
            // Deduct and add to pool
            await ctx.db.patch(args.userId, { coins: user.coins - room.buyIn });
            await ctx.db.patch(room._id, { prizePool: room.prizePool + room.buyIn });
        }

        const card = generateBingoCard();

        // If joining mid-game, auto-daub already called numbers
        let updatedCard = card;
        let daubedCount = 1; // Free space

        if (room.status === "playing") {
            // Get the current game to find called numbers
            const game = await ctx.db
                .query("games")
                .withIndex("by_room", (q) => q.eq("roomId", room._id))
                .order("desc")
                .first();

            if (game && game.calledNumbers.length > 0) {
                // Auto-daub all called numbers on the new player's card
                updatedCard = card.map((row: any[]) =>
                    row.map((cell: any) => {
                        if (game.calledNumbers.includes(cell.value)) {
                            return { ...cell, daubed: true };
                        }
                        return cell;
                    })
                );

                // Count daubed cells
                daubedCount = updatedCard.flat().filter((cell: any) => cell.daubed).length;
            }
        }

        // Add player to room
        await ctx.db.insert("roomPlayers", {
            roomId: room._id,
            odId: args.userId,
            card: updatedCard,
            daubedCount,
            distanceToBingo: 4, // Will be recalculated
            isReady: false,
            hasCalledBingo: false,
            joinedAt: Date.now(),
        });

        // Send system message
        const messageContent = room.status === "playing"
            ? `${user.name} joined the game late! 🏃`
            : `${user.name} joined the room!`;

        await ctx.db.insert("messages", {
            roomId: room._id,
            userId: args.userId,
            userName: "System",
            userAvatar: "👋",
            content: messageContent,
            type: "system",
            createdAt: Date.now(),
        });

        return { success: true, roomId: room._id };
    },
});

// Leave a room
export const leaveRoom = mutation({
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

        if (player) {
            await ctx.db.delete(player._id);
        }

        // Check if room is empty
        const remainingPlayers = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .collect();

        if (remainingPlayers.length === 0) {
            const room = await ctx.db.get(args.roomId);
            if (room) {
                await ctx.db.delete(args.roomId);
            }
        }

        return { success: true };
    },
});

// Get public rooms
export const getPublicRooms = query({
    args: {},
    handler: async (ctx) => {
        const rooms = await ctx.db
            .query("rooms")
            .filter((q) => q.and(
                q.or(
                    q.eq(q.field("status"), "waiting"),
                    q.eq(q.field("status"), "playing")
                ),
                q.eq(q.field("isPrivate"), false)
            ))
            .order("desc")
            .take(20);

        // Get player counts for each room
        const roomsWithCounts = await Promise.all(
            rooms.map(async (room) => {
                const players = await ctx.db
                    .query("roomPlayers")
                    .withIndex("by_room", (q) => q.eq("roomId", room._id))
                    .collect();

                const host = await ctx.db.get(room.hostId);

                return {
                    ...room,
                    playerCount: players.length,
                    hostName: host?.name || "Unknown",
                };
            })
        );

        return roomsWithCounts;
    },
});

// Get room by code
export const getRoomByCode = query({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("rooms")
            .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
            .first();
    },
});

// Get room details with players
export const getRoomDetails = query({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const room = await ctx.db.get(args.roomId);
        if (!room) return null;

        const players = await ctx.db
            .query("roomPlayers")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .collect();

        const playersWithDetails = await Promise.all(
            players.map(async (player) => {
                // Handle bots differently
                if (player.isBot) {
                    return {
                        ...player,
                        name: player.botName || "AI Player",
                        avatar: player.botAvatar || "🤖",
                        level: 99, // Bots show as high level
                        isBot: true,
                    };
                }

                const user = player.odId ? await ctx.db.get(player.odId) : null;
                return {
                    ...player,
                    name: user?.name || "Unknown",
                    avatar: user?.avatar || "👤",
                    level: user?.level || 1,
                };
            })
        );

        const host = await ctx.db.get(room.hostId);

        return {
            ...room,
            hostName: host?.name || "Unknown",
            players: playersWithDetails,
        };
    },
});

// Helper: Generate a bingo card
export function generateBingoCard() {
    const card: { value: number | string; daubed: boolean }[][] = [];

    const columns = [
        shuffleArray([...Array(15)].map((_, i) => i + 1)).slice(0, 5),
        shuffleArray([...Array(15)].map((_, i) => i + 16)).slice(0, 5),
        shuffleArray([...Array(15)].map((_, i) => i + 31)).slice(0, 5),
        shuffleArray([...Array(15)].map((_, i) => i + 46)).slice(0, 5),
        shuffleArray([...Array(15)].map((_, i) => i + 61)).slice(0, 5),
    ];

    for (let row = 0; row < 5; row++) {
        const rowData: { value: number | string; daubed: boolean }[] = [];
        for (let col = 0; col < 5; col++) {
            if (row === 2 && col === 2) {
                rowData.push({ value: "FREE", daubed: true });
            } else {
                rowData.push({ value: columns[col][row], daubed: false });
            }
        }
        card.push(rowData);
    }

    return card;
}

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
