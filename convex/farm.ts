import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Crop definitions
export const CROPS = {
    seeds: { name: "Seeds", emoji: "🌱", growTime: 30000, gemYield: 1, xp: 1, unlockLevel: 1 },
    carrot: { name: "Carrots", emoji: "🥕", growTime: 120000, gemYield: 5, xp: 3, unlockLevel: 3 },
    corn: { name: "Corn", emoji: "🌽", growTime: 300000, gemYield: 12, xp: 6, unlockLevel: 5 },
    tomato: { name: "Tomatoes", emoji: "🍅", growTime: 600000, gemYield: 25, xp: 10, unlockLevel: 8 },
    strawberry: { name: "Strawberries", emoji: "🍓", growTime: 1200000, gemYield: 50, xp: 18, unlockLevel: 12 },
    sunflower: { name: "Sunflowers", emoji: "🌻", growTime: 1800000, gemYield: 75, xp: 25, unlockLevel: 15 },
    crystalBeet: { name: "Crystal Beets", emoji: "💎", growTime: 3600000, gemYield: 200, xp: 50, unlockLevel: 20 },
};

// Plot unlock costs
const PLOT_COSTS = [0, 0, 0, 0, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];

// Farm XP per level (cumulative)
const FARM_LEVEL_XP = [0, 20, 50, 100, 180, 300, 500, 800, 1200, 1800, 2600, 3600, 5000];

// Get or create farm for user
export const getFarm = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return null;

        // Calculate real-time crop status
        const now = Date.now();
        const updatedPlots = farm.plots.map((plot) => {
            if (plot.cropType && plot.plantedAt && plot.growTime) {
                // Apply sprinkler bonus
                const effectiveGrowTime = farm.helpers.sprinkler
                    ? plot.growTime * 0.75
                    : plot.growTime;

                // Apply bingo win bonus (50% faster for 10 min after win)
                const hasBingoBonus = farm.lastBingoBonus &&
                    (now - farm.lastBingoBonus < 600000);
                const finalGrowTime = hasBingoBonus
                    ? effectiveGrowTime * 0.5
                    : effectiveGrowTime;

                const elapsed = now - plot.plantedAt;
                const isReady = elapsed >= finalGrowTime;
                const progress = Math.min(100, (elapsed / finalGrowTime) * 100);

                return { ...plot, isReady, progress };
            }
            return { ...plot, progress: 0 };
        });

        return {
            ...farm,
            plots: updatedPlots,
            hasBingoBonus: farm.lastBingoBonus && (now - farm.lastBingoBonus < 600000),
        };
    },
});

// Initialize farm for new user
export const initializeFarm = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Check if farm already exists
        const existing = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (existing) return existing._id;

        // Create new farm with 4 empty plots
        const farmId = await ctx.db.insert("farms", {
            userId: args.userId,
            plots: [
                { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false },
                { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false },
                { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false },
                { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false },
            ],
            plotCount: 4,
            helpers: {
                chicken: 0,
                farmBot: false,
                sprinkler: false,
            },
            farmLevel: 1,
            farmXp: 0,
            totalHarvested: 0,
            totalGemsEarned: 0,
            isHidden: false,
            createdAt: Date.now(),
        });

        return farmId;
    },
});

// Plant a crop in a plot
export const plantCrop = mutation({
    args: {
        userId: v.id("users"),
        plotIndex: v.number(),
        cropType: v.string(),
    },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        if (args.plotIndex < 0 || args.plotIndex >= farm.plotCount) {
            return { success: false, error: "Invalid plot" };
        }

        const crop = CROPS[args.cropType as keyof typeof CROPS];
        if (!crop) return { success: false, error: "Unknown crop type" };

        // Check farm level requirement
        if (farm.farmLevel < crop.unlockLevel) {
            return { success: false, error: `Requires farm level ${crop.unlockLevel}` };
        }

        // Check if plot is empty
        const plot = farm.plots[args.plotIndex];
        if (plot.cropType) {
            return { success: false, error: "Plot is not empty" };
        }

        // Plant the crop
        const updatedPlots = [...farm.plots];
        updatedPlots[args.plotIndex] = {
            cropType: args.cropType,
            plantedAt: Date.now(),
            growTime: crop.growTime,
            isReady: false,
        };

        await ctx.db.patch(farm._id, { plots: updatedPlots });

        return { success: true, crop: crop.emoji };
    },
});

// Harvest ready crops
export const harvestCrops = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const now = Date.now();
        let totalGems = 0;
        let totalXp = 0;
        let harvestCount = 0;

        const updatedPlots = farm.plots.map((plot) => {
            if (plot.cropType && plot.plantedAt && plot.growTime) {
                // Calculate effective grow time with bonuses
                let effectiveGrowTime = plot.growTime;
                if (farm.helpers.sprinkler) effectiveGrowTime *= 0.75;

                const hasBingoBonus = farm.lastBingoBonus &&
                    (now - farm.lastBingoBonus < 600000);
                if (hasBingoBonus) effectiveGrowTime *= 0.5;

                const elapsed = now - plot.plantedAt;

                if (elapsed >= effectiveGrowTime) {
                    // Harvest this crop
                    const crop = CROPS[plot.cropType as keyof typeof CROPS];
                    if (crop) {
                        totalGems += crop.gemYield;
                        totalXp += crop.xp;
                        harvestCount++;
                    }

                    // Clear the plot (or auto-replant if farmBot)
                    if (farm.helpers.farmBot) {
                        return {
                            ...plot,
                            plantedAt: now,
                            isReady: false,
                        };
                    } else {
                        return {
                            cropType: undefined,
                            plantedAt: undefined,
                            growTime: undefined,
                            isReady: false,
                        };
                    }
                }
            }
            return plot;
        });

        if (harvestCount === 0) {
            return { success: false, error: "No crops ready to harvest" };
        }

        // Calculate new farm level
        let newXp = farm.farmXp + totalXp;
        let newLevel = farm.farmLevel;
        while (newLevel < FARM_LEVEL_XP.length - 1 && newXp >= FARM_LEVEL_XP[newLevel]) {
            newXp -= FARM_LEVEL_XP[newLevel];
            newLevel++;
        }

        // Update farm
        await ctx.db.patch(farm._id, {
            plots: updatedPlots,
            farmXp: newXp,
            farmLevel: newLevel,
            totalHarvested: farm.totalHarvested + harvestCount,
            totalGemsEarned: farm.totalGemsEarned + totalGems,
        });

        // Award gems to user
        await ctx.db.patch(args.userId, {
            coins: user.coins + totalGems,
        });

        return {
            success: true,
            gemsEarned: totalGems,
            xpEarned: totalXp,
            harvested: harvestCount,
            leveledUp: newLevel > farm.farmLevel,
            newLevel,
        };
    },
});

// Buy a new plot
export const buyPlot = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };
        if (farm.plotCount >= 12) return { success: false, error: "Max plots reached" };

        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const cost = PLOT_COSTS[farm.plotCount];
        if (user.coins < cost) {
            return { success: false, error: `Need ${cost} Gems` };
        }

        // Add new empty plot
        const updatedPlots = [
            ...farm.plots,
            { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false },
        ];

        await ctx.db.patch(farm._id, {
            plots: updatedPlots,
            plotCount: farm.plotCount + 1,
        });

        await ctx.db.patch(args.userId, {
            coins: user.coins - cost,
        });

        return { success: true, newPlotCount: farm.plotCount + 1 };
    },
});

// Toggle farm visibility
export const toggleFarmVisibility = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false };

        await ctx.db.patch(farm._id, { isHidden: !farm.isHidden });
        return { success: true, isHidden: !farm.isHidden };
    },
});

// Apply bingo win bonus (called when player wins)
export const applyBingoBonus = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return;

        await ctx.db.patch(farm._id, {
            lastBingoBonus: Date.now(),
        });
    },
});

// Get available crops for user's farm level
export const getAvailableCrops = query({
    args: { farmLevel: v.number() },
    handler: async (ctx, args) => {
        return Object.entries(CROPS)
            .filter(([_, crop]) => crop.unlockLevel <= args.farmLevel)
            .map(([key, crop]) => ({
                id: key,
                ...crop,
            }));
    },
});
