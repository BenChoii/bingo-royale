import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Seed cosmetics catalog
export const seedCosmetics = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db.query("cosmetics").first();
        if (existing) return { success: true, message: "Already seeded" };

        const cosmetics = [
            // Daub styles
            { type: "daub", name: "Gold Stamp", description: "A luxurious golden daub", price: 800, rarity: "common", asset: "daub-gold" },
            { type: "daub", name: "Rainbow Burst", description: "Explosion of colors", price: 1500, rarity: "rare", asset: "daub-rainbow" },
            { type: "daub", name: "Fire Mark", description: "Leaves a trail of flames", price: 1800, rarity: "rare", asset: "daub-fire" },
            { type: "daub", name: "Ice Crystal", description: "Frozen elegance", price: 1800, rarity: "rare", asset: "daub-ice" },
            { type: "daub", name: "Neon Glow", description: "Cyberpunk vibes", price: 2500, rarity: "epic", asset: "daub-neon" },

            // Card themes
            { type: "card", name: "Classic", description: "The original look", price: 0, rarity: "common", asset: "card-classic" },
            { type: "card", name: "Neon Vegas", description: "Sin City nights", price: 1200, rarity: "common", asset: "card-vegas" },
            { type: "card", name: "Deep Ocean", description: "Underwater serenity", price: 2000, rarity: "rare", asset: "card-ocean" },
            { type: "card", name: "Cosmic", description: "Stars and galaxies", price: 3500, rarity: "epic", asset: "card-cosmic" },

            // Avatar frames
            { type: "frame", name: "Bronze Ring", description: "Simple and clean", price: 2000, rarity: "common", asset: "frame-bronze" },
            { type: "frame", name: "Silver Crown", description: "A touch of royalty", price: 4000, rarity: "rare", asset: "frame-silver" },
            { type: "frame", name: "Gold Champion", description: "For true winners", price: 6000, rarity: "epic", asset: "frame-gold" },
            { type: "frame", name: "Diamond Elite", description: "The pinnacle of status", price: 10000, rarity: "legendary", asset: "frame-diamond" },

            // Victory animations
            { type: "animation", name: "Confetti Shower", description: "Classic celebration", price: 1500, rarity: "common", asset: "anim-confetti" },
            { type: "animation", name: "Fireworks", description: "Light up the sky", price: 2500, rarity: "rare", asset: "anim-fireworks" },
            { type: "animation", name: "Lightning Strike", description: "Electrifying victory", price: 5000, rarity: "epic", asset: "anim-lightning" },
        ];

        for (const cosmetic of cosmetics) {
            await ctx.db.insert("cosmetics", cosmetic as any);
        }

        return { success: true, count: cosmetics.length };
    },
});

// Update existing cosmetic prices
export const updatePrices = mutation({
    args: {},
    handler: async (ctx) => {
        const priceMap: Record<string, number> = {
            "daub-gold": 800,
            "daub-rainbow": 1500,
            "daub-fire": 1800,
            "daub-ice": 1800,
            "daub-neon": 2500,
            "card-classic": 0,
            "card-vegas": 1200,
            "card-ocean": 2000,
            "card-cosmic": 3500,
            "frame-bronze": 2000,
            "frame-silver": 4000,
            "frame-gold": 6000,
            "frame-diamond": 10000,
            "anim-confetti": 1500,
            "anim-fireworks": 2500,
            "anim-lightning": 5000,
        };

        const cosmetics = await ctx.db.query("cosmetics").collect();
        let updated = 0;

        for (const cosmetic of cosmetics) {
            const newPrice = priceMap[cosmetic.asset];
            if (newPrice !== undefined && cosmetic.price !== newPrice) {
                await ctx.db.patch(cosmetic._id, { price: newPrice });
                updated++;
            }
        }

        return { success: true, updated };
    },
});

// Get all cosmetics
export const getAllCosmetics = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("cosmetics").collect();
    },
});

// Get cosmetics by type
export const getCosmeticsByType = query({
    args: { type: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("cosmetics")
            .withIndex("by_type", (q) => q.eq("type", args.type as any))
            .collect();
    },
});

// Get user's owned cosmetics
export const getUserCosmetics = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const owned = await ctx.db
            .query("userCosmetics")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const withDetails = await Promise.all(
            owned.map(async (uc) => {
                const cosmetic = await ctx.db.get(uc.cosmeticId);
                return { ...uc, cosmetic };
            })
        );

        return withDetails;
    },
});

// Get user's equipped cosmetics
export const getEquippedCosmetics = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const equipped = await ctx.db
            .query("userCosmetics")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("equipped"), true))
            .collect();

        const result: Record<string, any> = {};
        for (const uc of equipped) {
            const cosmetic = await ctx.db.get(uc.cosmeticId);
            if (cosmetic) {
                result[cosmetic.type] = cosmetic;
            }
        }

        return result;
    },
});

// Purchase cosmetic
export const purchaseCosmetic = mutation({
    args: {
        userId: v.id("users"),
        cosmeticId: v.id("cosmetics"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const cosmetic = await ctx.db.get(args.cosmeticId);
        if (!cosmetic) return { success: false, error: "Cosmetic not found" };

        // Check if already owned
        const existing = await ctx.db
            .query("userCosmetics")
            .withIndex("by_user_cosmetic", (q) =>
                q.eq("userId", args.userId).eq("cosmeticId", args.cosmeticId)
            )
            .first();

        if (existing) return { success: false, error: "Already owned" };

        // Check balance
        if (user.coins < cosmetic.price) {
            return { success: false, error: `Need ${cosmetic.price} Gems` };
        }

        // Deduct and grant
        await ctx.db.patch(args.userId, { coins: user.coins - cosmetic.price });
        await ctx.db.insert("userCosmetics", {
            userId: args.userId,
            cosmeticId: args.cosmeticId,
            equipped: false,
            purchasedAt: Date.now(),
        });

        return { success: true, cosmetic };
    },
});

// Equip cosmetic
export const equipCosmetic = mutation({
    args: {
        userId: v.id("users"),
        cosmeticId: v.id("cosmetics"),
    },
    handler: async (ctx, args) => {
        const cosmetic = await ctx.db.get(args.cosmeticId);
        if (!cosmetic) return { success: false, error: "Cosmetic not found" };

        // Find user's ownership
        const owned = await ctx.db
            .query("userCosmetics")
            .withIndex("by_user_cosmetic", (q) =>
                q.eq("userId", args.userId).eq("cosmeticId", args.cosmeticId)
            )
            .first();

        if (!owned) return { success: false, error: "You don't own this" };

        // Unequip same-type cosmetics
        const sameType = await ctx.db
            .query("userCosmetics")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        for (const uc of sameType) {
            const c = await ctx.db.get(uc.cosmeticId);
            if (c && c.type === cosmetic.type && uc.equipped) {
                await ctx.db.patch(uc._id, { equipped: false });
            }
        }

        // Equip this one
        await ctx.db.patch(owned._id, { equipped: true });

        return { success: true };
    },
});

// Unequip cosmetic
export const unequipCosmetic = mutation({
    args: {
        userId: v.id("users"),
        cosmeticId: v.id("cosmetics"),
    },
    handler: async (ctx, args) => {
        const owned = await ctx.db
            .query("userCosmetics")
            .withIndex("by_user_cosmetic", (q) =>
                q.eq("userId", args.userId).eq("cosmeticId", args.cosmeticId)
            )
            .first();

        if (!owned) return { success: false, error: "You don't own this" };

        await ctx.db.patch(owned._id, { equipped: false });
        return { success: true };
    },
});
