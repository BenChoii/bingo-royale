import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Quick reactions
const REACTIONS = ["🔥", "😱", "👏", "😂", "💀", "🎉", "👀", "❤️"];

// Send a chat message
export const sendMessage = mutation({
    args: {
        roomId: v.id("rooms"),
        userId: v.id("users"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false };

        // Limit message length
        const content = args.content.slice(0, 200);

        await ctx.db.insert("messages", {
            roomId: args.roomId,
            userId: args.userId,
            userName: user.name,
            userAvatar: user.avatar,
            content,
            type: "chat",
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

// Send a reaction (quick emoji)
export const sendReaction = mutation({
    args: {
        roomId: v.id("rooms"),
        userId: v.id("users"),
        reaction: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false };

        // Validate reaction
        if (!REACTIONS.includes(args.reaction)) {
            return { success: false, error: "Invalid reaction" };
        }

        await ctx.db.insert("messages", {
            roomId: args.roomId,
            userId: args.userId,
            userName: user.name,
            userAvatar: user.avatar,
            content: args.reaction,
            type: "reaction",
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

// Get recent messages for a room
export const getMessages = query({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .order("desc")
            .take(50);

        return messages.reverse();
    },
});

// Get available reactions
export const getReactions = query({
    args: {},
    handler: async () => {
        return REACTIONS;
    },
});
