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
                { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false, fertilized: false },
                { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false, fertilized: false },
                { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false, fertilized: false },
                { cropType: undefined, plantedAt: undefined, growTime: undefined, isReady: false, fertilized: false },
            ],
            plotCount: 4,
            helpers: {
                chicken: 0,
                farmBot: false,
                sprinkler: false,
            },
            animals: {
                chickens: 0,
                ducks: 0,
                sheep: 0,
                cows: 0,
                pigs: 0,
            },
            eggs: [], // Eggs from chickens/ducks
            inventory: {
                seeds: 5, // Start with 5 free seeds
                fertilizer: 0,
                superFertilizer: 0,
                waterCan: 0,
                wool: 0,
                milk: 0,
                truffles: 0,
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

        // Allow planting on empty plots OR changing existing crops
        // (changing a crop before it's ready loses progress)

        // Plant the crop
        const updatedPlots = [...farm.plots];
        updatedPlots[args.plotIndex] = {
            cropType: args.cropType,
            plantedAt: Date.now(),
            growTime: crop.growTime,
            isReady: false,
            fertilized: false,
        };

        await ctx.db.patch(farm._id, { plots: updatedPlots });

        return { success: true, crop: crop.emoji, replaced: !!plot.cropType };
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
                        // Apply fertilizer bonus
                        const yieldMultiplier = plot.fertilized ? 2 : 1;
                        totalGems += crop.gemYield * yieldMultiplier;
                        totalXp += crop.xp;
                        harvestCount++;
                    }

                    // Auto-replant the same crop (reset timer, clear fertilized)
                    return {
                        ...plot,
                        plantedAt: now,
                        isReady: false,
                        fertilized: false,
                    };
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

// ========== FARM SHOP ==========

// Shop item definitions
export const SHOP_ITEMS = {
    // Seeds & Consumables
    seedPack: { name: "Seed Pack", emoji: "🌱", cost: 10, type: "consumable", gives: { seeds: 10 } },
    fertilizer: { name: "Fertilizer", emoji: "💩", cost: 25, type: "consumable", gives: { fertilizer: 5 } },
    superFertilizer: { name: "Super Fertilizer", emoji: "✨", cost: 100, type: "consumable", gives: { superFertilizer: 2 } },
    waterCan: { name: "Watering Can", emoji: "💧", cost: 50, type: "consumable", gives: { waterCan: 3 } },

    // Animals - passive gem producers
    chicken: { name: "Chicken", emoji: "🐔", cost: 100, type: "animal", animal: "chickens", gemsPerMin: 1 },
    duck: { name: "Duck", emoji: "🦆", cost: 200, type: "animal", animal: "ducks", gemsPerMin: 2 },
    sheep: { name: "Sheep", emoji: "🐑", cost: 500, type: "animal", animal: "sheep", gemsPerMin: 5 },
    cow: { name: "Cow", emoji: "🐄", cost: 1000, type: "animal", animal: "cows", gemsPerMin: 10 },
    pig: { name: "Pig", emoji: "🐷", cost: 2000, type: "animal", animal: "pigs", gemsPerMin: 15 },

    // Upgrades
    sprinkler: { name: "Sprinkler", emoji: "💦", cost: 1500, type: "upgrade", upgrade: "sprinkler" },
    farmBot: { name: "Farm Bot", emoji: "🤖", cost: 5000, type: "upgrade", upgrade: "farmBot" },
};

// Get shop items
export const getShopItems = query({
    args: {},
    handler: async () => {
        return Object.entries(SHOP_ITEMS).map(([id, item]) => ({ id, ...item }));
    },
});

// Buy shop item
export const buyShopItem = mutation({
    args: {
        userId: v.id("users"),
        itemId: v.string(),
    },
    handler: async (ctx, args) => {
        const item = SHOP_ITEMS[args.itemId as keyof typeof SHOP_ITEMS];
        if (!item) return { success: false, error: "Unknown item" };

        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        if (user.coins < item.cost) {
            return { success: false, error: `Need ${item.cost} Gems` };
        }

        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        // Deduct gems
        await ctx.db.patch(args.userId, { coins: user.coins - item.cost });

        // Apply item effect
        if (item.type === "consumable" && "gives" in item) {
            const newInventory = { ...farm.inventory };
            for (const [key, amount] of Object.entries(item.gives)) {
                newInventory[key as keyof typeof newInventory] += amount as number;
            }
            await ctx.db.patch(farm._id, { inventory: newInventory });
        } else if (item.type === "animal" && "animal" in item) {
            const newAnimals = { ...farm.animals };
            newAnimals[item.animal as keyof typeof newAnimals] += 1;
            await ctx.db.patch(farm._id, { animals: newAnimals });
        } else if (item.type === "upgrade" && "upgrade" in item) {
            // Handle upgrade items (sprinkler, farmBot)
            if (item.upgrade === "sprinkler") {
                await ctx.db.patch(farm._id, { helpers: { ...farm.helpers, sprinkler: true } });
            } else if (item.upgrade === "farmBot") {
                await ctx.db.patch(farm._id, { helpers: { ...farm.helpers, farmBot: true } });
            }
        }

        return { success: true, item: item.emoji };
    },
});

// Collect gems from animals
export const collectAnimalGems = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        const now = Date.now();
        const lastCollect = farm.lastAnimalCollect || farm.createdAt;
        const hoursPassed = Math.min(24, (now - lastCollect) / 3600000); // Cap at 24h

        if (hoursPassed < 0.5) { // Need at least 30 min
            return { success: false, error: "Animals need more time (30min)" };
        }

        const totalAnimals = farm.animals.chickens + farm.animals.ducks +
            farm.animals.sheep + farm.animals.cows + farm.animals.pigs;

        if (totalAnimals === 0) {
            return { success: false, error: "No animals to collect from" };
        }

        // Calculate production based on time passed
        const productionMultiplier = Math.floor(hoursPassed * 2); // 2 items per hour

        // Chickens & Ducks lay eggs
        const newEggs: { type: string; laidAt: number; nurturing: boolean }[] = [];
        for (let i = 0; i < farm.animals.chickens * productionMultiplier; i++) {
            newEggs.push({ type: "chicken", laidAt: now, nurturing: false });
        }
        for (let i = 0; i < farm.animals.ducks * productionMultiplier; i++) {
            newEggs.push({ type: "duck", laidAt: now, nurturing: false });
        }

        // Sheep, Cows, Pigs produce goods
        const woolProduced = farm.animals.sheep * productionMultiplier;
        const milkProduced = farm.animals.cows * productionMultiplier;
        const trufflesProduced = farm.animals.pigs * productionMultiplier;

        // Update farm
        const currentEggs = farm.eggs || [];
        const newInventory = { ...farm.inventory };
        newInventory.wool = (newInventory.wool || 0) + woolProduced;
        newInventory.milk = (newInventory.milk || 0) + milkProduced;
        newInventory.truffles = (newInventory.truffles || 0) + trufflesProduced;

        await ctx.db.patch(farm._id, {
            lastAnimalCollect: now,
            eggs: [...currentEggs, ...newEggs],
            inventory: newInventory,
        });

        return {
            success: true,
            eggsLaid: newEggs.length,
            woolProduced,
            milkProduced,
            trufflesProduced,
        };
    },
});

// Use fertilizer on a plot
export const useFertilizer = mutation({
    args: {
        userId: v.id("users"),
        plotIndex: v.number(),
        type: v.string(), // "fertilizer" or "superFertilizer"
    },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        const inventoryKey = args.type as "fertilizer" | "superFertilizer";
        if (farm.inventory[inventoryKey] <= 0) {
            return { success: false, error: `No ${args.type} in inventory` };
        }

        const plot = farm.plots[args.plotIndex];
        if (!plot || !plot.cropType) {
            return { success: false, error: "No crop in this plot" };
        }

        if (plot.fertilized) {
            return { success: false, error: "Already fertilized" };
        }

        // Update plot and inventory
        const updatedPlots = [...farm.plots];
        updatedPlots[args.plotIndex] = { ...plot, fertilized: true };

        // Super fertilizer = instant ready
        if (args.type === "superFertilizer") {
            updatedPlots[args.plotIndex].isReady = true;
        }

        const newInventory = { ...farm.inventory };
        newInventory[inventoryKey] -= 1;

        await ctx.db.patch(farm._id, {
            plots: updatedPlots,
            inventory: newInventory,
        });

        return { success: true };
    },
});

// Sell an egg for 1 gem
export const sellEgg = mutation({
    args: {
        userId: v.id("users"),
        eggIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };
        if (!farm.eggs || args.eggIndex >= farm.eggs.length) {
            return { success: false, error: "Egg not found" };
        }

        const egg = farm.eggs[args.eggIndex];
        if (egg.nurturing) {
            return { success: false, error: "Can't sell a nurturing egg" };
        }

        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        // Remove egg and give 1 gem
        const newEggs = farm.eggs.filter((_, i) => i !== args.eggIndex);
        await ctx.db.patch(farm._id, { eggs: newEggs });
        await ctx.db.patch(args.userId, { coins: user.coins + 1 });

        return { success: true, gem: 1 };
    },
});

// Sell all eggs for gems
export const sellAllEggs = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        const sellableEggs = (farm.eggs || []).filter(e => !e.nurturing);
        if (sellableEggs.length === 0) {
            return { success: false, error: "No eggs to sell" };
        }

        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const nurturingEggs = (farm.eggs || []).filter(e => e.nurturing);
        await ctx.db.patch(farm._id, { eggs: nurturingEggs });
        await ctx.db.patch(args.userId, { coins: user.coins + sellableEggs.length });

        return { success: true, sold: sellableEggs.length, gems: sellableEggs.length };
    },
});

// Start nurturing an egg (24h to hatch)
export const nurtureEgg = mutation({
    args: {
        userId: v.id("users"),
        eggIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };
        if (!farm.eggs || args.eggIndex >= farm.eggs.length) {
            return { success: false, error: "Egg not found" };
        }

        const egg = farm.eggs[args.eggIndex];
        if (egg.nurturing) {
            return { success: false, error: "Already nurturing" };
        }

        // Start nurturing
        const newEggs = [...farm.eggs];
        newEggs[args.eggIndex] = { ...egg, nurturing: true, laidAt: Date.now() };
        await ctx.db.patch(farm._id, { eggs: newEggs });

        return { success: true, type: egg.type };
    },
});

// Hatch all ready eggs (24h after nurturing started)
export const hatchEggs = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        const now = Date.now();
        const HATCH_TIME = 24 * 60 * 60 * 1000; // 24 hours

        let chickensHatched = 0;
        let ducksHatched = 0;
        const remainingEggs: typeof farm.eggs = [];

        for (const egg of (farm.eggs || [])) {
            if (egg.nurturing && (now - egg.laidAt) >= HATCH_TIME) {
                // Egg is ready to hatch!
                if (egg.type === "chicken") chickensHatched++;
                else if (egg.type === "duck") ducksHatched++;
            } else {
                remainingEggs.push(egg);
            }
        }

        if (chickensHatched === 0 && ducksHatched === 0) {
            return { success: false, error: "No eggs ready to hatch" };
        }

        const newAnimals = { ...farm.animals };
        newAnimals.chickens += chickensHatched;
        newAnimals.ducks += ducksHatched;

        await ctx.db.patch(farm._id, {
            eggs: remainingEggs,
            animals: newAnimals,
        });

        return {
            success: true,
            chickensHatched,
            ducksHatched,
        };
    },
});

// Sell goods for gems
export const sellGoods = mutation({
    args: {
        userId: v.id("users"),
        goodType: v.string(), // "wool", "milk", "truffles"
    },
    handler: async (ctx, args) => {
        const GOOD_VALUES = { wool: 5, milk: 10, truffles: 25 };
        const value = GOOD_VALUES[args.goodType as keyof typeof GOOD_VALUES];

        if (!value) return { success: false, error: "Unknown good type" };

        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        const amount = farm.inventory[args.goodType as keyof typeof farm.inventory] || 0;
        if (amount <= 0) {
            return { success: false, error: `No ${args.goodType} to sell` };
        }

        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        const totalGems = amount * value;
        const newInventory = { ...farm.inventory };
        newInventory[args.goodType as keyof typeof newInventory] = 0;

        await ctx.db.patch(farm._id, { inventory: newInventory });
        await ctx.db.patch(args.userId, { coins: user.coins + totalGems });

        return { success: true, sold: amount, gems: totalGems };
    },
});

// Butcher an animal for meat (permanently removes the animal)
export const butcherAnimal = mutation({
    args: {
        userId: v.id("users"),
        animalType: v.string(), // "cow" for beef, "pig" for pork, "sheep" for mutton
    },
    handler: async (ctx, args) => {
        const MEAT_VALUES = {
            cow: { meat: "beef", gems: 150, emoji: "🥩" },
            pig: { meat: "pork", gems: 100, emoji: "🥓" },
            sheep: { meat: "mutton", gems: 75, emoji: "🍖" },
            chicken: { meat: "chicken", gems: 15, emoji: "🍗" },
            duck: { meat: "duck", gems: 25, emoji: "🦆" },
        };

        const meatInfo = MEAT_VALUES[args.animalType as keyof typeof MEAT_VALUES];
        if (!meatInfo) return { success: false, error: "Unknown animal type" };

        const farm = await ctx.db
            .query("farms")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!farm) return { success: false, error: "No farm found" };

        const animalKey = args.animalType === "cow" ? "cows" :
            args.animalType === "pig" ? "pigs" :
                args.animalType === "sheep" ? "sheep" :
                    args.animalType === "chicken" ? "chickens" : "ducks";

        if (farm.animals[animalKey as keyof typeof farm.animals] <= 0) {
            return { success: false, error: `No ${args.animalType} to butcher` };
        }

        const user = await ctx.db.get(args.userId);
        if (!user) return { success: false, error: "User not found" };

        // Remove one animal and give gems
        const newAnimals = { ...farm.animals };
        newAnimals[animalKey as keyof typeof newAnimals] -= 1;

        await ctx.db.patch(farm._id, { animals: newAnimals });
        await ctx.db.patch(args.userId, { coins: user.coins + meatInfo.gems });

        return {
            success: true,
            meat: meatInfo.meat,
            gems: meatInfo.gems,
            emoji: meatInfo.emoji,
        };
    },
});
