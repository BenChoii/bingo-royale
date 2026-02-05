import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNotification } from "./Notifications";
import "./BingoFarm.css";

// BALANCED ECONOMY: Crops are FREE to plant (no cost), return gems on harvest
// Longer crops = better gems/minute ratio (rewards patience)
const CROPS = {
    // Quick crops - Low gems/min, good for active players
    sprout: { name: "Sprouts", emoji: "🌱", growTime: 30000, gemYield: 2, unlockLevel: 1, gemsPerMin: 4 },
    lettuce: { name: "Lettuce", emoji: "🥬", growTime: 60000, gemYield: 5, unlockLevel: 2, gemsPerMin: 5 },
    radish: { name: "Radish", emoji: "🫛", growTime: 120000, gemYield: 12, unlockLevel: 3, gemsPerMin: 6 },

    // Medium crops - Balanced
    carrot: { name: "Carrots", emoji: "🥕", growTime: 180000, gemYield: 21, unlockLevel: 4, gemsPerMin: 7 },
    potato: { name: "Potatoes", emoji: "🥔", growTime: 300000, gemYield: 40, unlockLevel: 5, gemsPerMin: 8 },
    corn: { name: "Corn", emoji: "🌽", growTime: 600000, gemYield: 90, unlockLevel: 6, gemsPerMin: 9 },

    // Long crops - High gems/min, rewards patience
    tomato: { name: "Tomatoes", emoji: "🍅", growTime: 900000, gemYield: 150, unlockLevel: 8, gemsPerMin: 10 },
    pepper: { name: "Peppers", emoji: "🌶️", growTime: 1200000, gemYield: 220, unlockLevel: 10, gemsPerMin: 11 },
    strawberry: { name: "Strawberries", emoji: "🍓", growTime: 1800000, gemYield: 360, unlockLevel: 12, gemsPerMin: 12 },

    // Premium crops - Best ROI for idle players
    pumpkin: { name: "Pumpkins", emoji: "🎃", growTime: 2700000, gemYield: 580, unlockLevel: 15, gemsPerMin: 13 },
    sunflower: { name: "Sunflowers", emoji: "🌻", growTime: 3600000, gemYield: 840, unlockLevel: 18, gemsPerMin: 14 },
    crystalBeet: { name: "Crystal Beets", emoji: "💎", growTime: 7200000, gemYield: 1800, unlockLevel: 20, gemsPerMin: 15 },
};

// ANIMAL ECONOMY: Cost gems upfront, produce goods passively
// ROI = break-even time, then pure profit
const ANIMALS = {
    chicken: {
        emoji: "🐔", name: "Chicken", cost: 50,
        produces: "eggs", produceEmoji: "🥚", producePerHour: 2,
        sellPrice: 1, // per egg
        butcherPrice: 10,
        roiHours: 25, // 50 cost / (2 eggs * 1 gem) = 25h to break even
    },
    duck: {
        emoji: "🦆", name: "Duck", cost: 100,
        produces: "eggs", produceEmoji: "🥚", producePerHour: 3,
        sellPrice: 1,
        butcherPrice: 20,
        roiHours: 33,
    },
    sheep: {
        emoji: "🐑", name: "Sheep", cost: 200,
        produces: "wool", produceEmoji: "🧶", producePerHour: 2,
        sellPrice: 3, // per wool
        butcherPrice: 50,
        roiHours: 33,
    },
    cow: {
        emoji: "🐄", name: "Cow", cost: 500,
        produces: "milk", produceEmoji: "🥛", producePerHour: 2,
        sellPrice: 8, // per milk
        butcherPrice: 100,
        roiHours: 31,
    },
    pig: {
        emoji: "🐷", name: "Pig", cost: 1000,
        produces: "truffles", produceEmoji: "🍄", producePerHour: 1,
        sellPrice: 30, // per truffle
        butcherPrice: 200,
        roiHours: 33,
    },
};

// BOOSTS: Enhance farming efficiency
const BOOSTS = {
    fertilizer: {
        emoji: "💩", name: "Fertilizer", cost: 20,
        desc: "2x yield on next harvest",
        details: "Apply to any growing crop. When harvested, get DOUBLE gems. Works once per use.",
        uses: 5,
    },
    superGrow: {
        emoji: "✨", name: "Super Grow", cost: 75,
        desc: "Instant harvest + 2x yield",
        details: "Immediately harvest any crop AND get double gems. Best used on long-growing crops!",
        uses: 2,
    },
    waterCan: {
        emoji: "💧", name: "Water Can", cost: 30,
        desc: "Halve remaining grow time",
        details: "Cuts the remaining time in half. Use when crop is 50%+ for best value!",
        uses: 3,
    },
};

// UPGRADES: Permanent improvements
const UPGRADES = {
    sprinkler: {
        emoji: "💦", name: "Sprinkler", cost: 800,
        desc: "All crops grow 25% faster",
        details: "Permanent! Reduces grow time on ALL crops by 25%. Stacks with Water Can. Best long-term investment.",
    },
    farmBot: {
        emoji: "🤖", name: "Farm Bot", cost: 2000,
        desc: "Auto-replant after harvest",
        details: "Permanent! When you harvest, the same crop auto-replants. Perfect for idle farming.",
    },
    extraPlot: {
        emoji: "🏡", name: "Extra Plot", cost: 500,
        desc: "Add 1 more farming plot",
        details: "Expand your farm! More plots = more simultaneous crops = more gems per hour.",
    },
};

export default function BingoFarm({ userId }) {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState("sprout");
    const [showShop, setShowShop] = useState(false);
    const [shopTab, setShopTab] = useState("animals");
    const [selectedItem, setSelectedItem] = useState(null);
    const [now, setNow] = useState(Date.now());
    const { showNotification } = useNotification();

    const farm = useQuery(api.farm.getFarm, { userId });
    const initializeFarm = useMutation(api.farm.initializeFarm);
    const plantCrop = useMutation(api.farm.plantCrop);
    const harvestCrops = useMutation(api.farm.harvestCrops);
    const buyShopItem = useMutation(api.farm.buyShopItem);
    const collectAnimalGems = useMutation(api.farm.collectAnimalGems);
    const sellAllEggs = useMutation(api.farm.sellAllEggs);
    const nurtureEgg = useMutation(api.farm.nurtureEgg);
    const hatchEggs = useMutation(api.farm.hatchEggs);
    const sellGoods = useMutation(api.farm.sellGoods);
    const butcherAnimal = useMutation(api.farm.butcherAnimal);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (farm === null) {
            initializeFarm({ userId });
        }
    }, [farm, userId, initializeFarm]);

    if (!farm || farm.isHidden) return null;

    const getClosestToHarvest = () => {
        const growing = farm.plots
            .map((p, i) => ({ ...p, index: i }))
            .filter(p => p.cropType && !p.isReady)
            .sort((a, b) => (b.progress || 0) - (a.progress || 0));
        return growing[0] || farm.plots.find(p => p.isReady) || farm.plots[0];
    };

    const handlePlant = async (plotIndex) => {
        const result = await plantCrop({ userId, plotIndex, cropType: selectedCrop });
        if (result.success) {
            showNotification(`Planted ${CROPS[selectedCrop]?.emoji}!`, "success");
        } else {
            showNotification(result.error || "Failed", "error");
        }
    };

    const handleHarvest = async () => {
        const result = await harvestCrops({ userId });
        if (result.success) {
            showNotification(`+${result.gemsEarned} 💎 from ${result.harvested} crops!`, "success");
        } else {
            showNotification(result.error || "Nothing ready", "info");
        }
    };

    const handleBuyItem = async (itemId) => {
        try {
            const result = await buyShopItem({ userId, itemId });
            if (result.success) {
                showNotification(`Bought ${result.item}!`, "success");
                setSelectedItem(null);
            } else {
                showNotification(result.error || "Not enough gems", "error");
            }
        } catch (err) {
            showNotification("Purchase failed", "error");
        }
    };

    const handleCollectAnimals = async () => {
        const result = await collectAnimalGems({ userId });
        if (result.success) {
            let msg = "Collected: ";
            if (result.eggsLaid > 0) msg += `${result.eggsLaid} 🥚 `;
            if (result.woolProduced > 0) msg += `${result.woolProduced} 🧶 `;
            if (result.milkProduced > 0) msg += `${result.milkProduced} 🥛 `;
            if (result.trufflesProduced > 0) msg += `${result.trufflesProduced} 🍄 `;
            showNotification(msg, "success");
        } else {
            showNotification(result.error || "Wait 30min", "info");
        }
    };

    const handleSellAllEggs = async () => {
        const result = await sellAllEggs({ userId });
        if (result.success) {
            showNotification(`Sold ${result.sold} eggs = ${result.gems} 💎!`, "success");
        }
    };

    const handleNurtureEgg = async (index) => {
        const result = await nurtureEgg({ userId, eggIndex: index });
        if (result.success) {
            showNotification(`Nurturing egg (24h to hatch) 🐣`, "success");
        }
    };

    const handleHatchEggs = async () => {
        const result = await hatchEggs({ userId });
        if (result.success) {
            let msg = "Hatched: ";
            if (result.chickensHatched > 0) msg += `${result.chickensHatched} 🐔 `;
            if (result.ducksHatched > 0) msg += `${result.ducksHatched} 🦆 `;
            showNotification(msg, "success");
        }
    };

    const handleSellGoods = async (goodType) => {
        const result = await sellGoods({ userId, goodType });
        if (result.success) {
            showNotification(`Sold for ${result.gems} 💎!`, "success");
        }
    };

    const handleButcher = async (animalType) => {
        const animal = ANIMALS[animalType];
        if (!confirm(`Butcher ${animal.name}? Get ${animal.butcherPrice}💎 but lose the animal!`)) return;
        const result = await butcherAnimal({ userId, animalType });
        if (result.success) {
            showNotification(`+${result.gems} 💎`, "success");
        }
    };

    const readyCrops = farm.plots.filter(p => p.isReady).length;
    const availableCrops = Object.entries(CROPS).filter(
        ([key]) => CROPS[key].unlockLevel <= farm.farmLevel
    );

    const totalAnimals = farm.animals ?
        (farm.animals.chickens + farm.animals.ducks + farm.animals.sheep + farm.animals.cows + farm.animals.pigs) : 0;

    const eggs = farm.eggs || [];
    const sellableEggs = eggs.filter(e => !e.nurturing);
    const readyToHatch = eggs.filter(e => e.nurturing && (now - e.laidAt) >= 24 * 60 * 60 * 1000);

    const closestCrop = getClosestToHarvest();
    const closestCropData = closestCrop?.cropType ? CROPS[closestCrop.cropType] : null;

    const formatTime = (ms) => {
        if (ms <= 0) return "Ready!";
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    };

    // Calculate hourly income from animals
    const hourlyIncome = farm.animals ? (
        farm.animals.chickens * 2 * 1 +  // 2 eggs/hr * 1 gem
        farm.animals.ducks * 3 * 1 +      // 3 eggs/hr * 1 gem
        farm.animals.sheep * 2 * 3 +      // 2 wool/hr * 3 gems
        farm.animals.cows * 2 * 8 +       // 2 milk/hr * 8 gems
        farm.animals.pigs * 1 * 30        // 1 truffle/hr * 30 gems
    ) : 0;

    // Full screen farm view
    if (isFullScreen) {
        return (
            <div className="farm-fullscreen">
                <div className="farm-fs-header">
                    <div className="farm-fs-title">
                        <span>🌾</span>
                        <span>Bingo Farm</span>
                        <span className="farm-level-badge">Lv.{farm.farmLevel}</span>
                    </div>
                    <div className="farm-fs-stats">
                        <span>💎 {farm.totalGemsEarned}</span>
                        {hourlyIncome > 0 && <span className="income-badge">+{hourlyIncome}/hr</span>}
                    </div>
                    <button className="farm-fs-close" onClick={() => setIsFullScreen(false)}>✕</button>
                </div>

                <div className="farm-fs-content">
                    {/* Crop selector with ROI info */}
                    <div className="farm-fs-section">
                        <h3>🌱 Select Crop (FREE to plant!)</h3>
                        <p className="section-tip">💡 Longer crops = better gems/minute. Patience pays!</p>
                        <div className="crop-selector-large">
                            {availableCrops.map(([key, crop]) => (
                                <button
                                    key={key}
                                    className={`crop-option-large ${selectedCrop === key ? "selected" : ""}`}
                                    onClick={() => setSelectedCrop(key)}
                                >
                                    <span className="crop-emoji-lg">{crop.emoji}</span>
                                    <span className="crop-name">{crop.name}</span>
                                    <span className="crop-time">{formatTime(crop.growTime)}</span>
                                    <span className="crop-yield">+{crop.gemYield}💎</span>
                                    <span className="crop-rate">{crop.gemsPerMin}💎/min</span>
                                </button>
                            ))}
                        </div>
                        {farm.helpers?.sprinkler && (
                            <p className="synergy-active">💦 Sprinkler active: -25% grow time!</p>
                        )}
                    </div>

                    {/* Farm plots */}
                    <div className="farm-fs-section">
                        <h3>🌾 Your Farm ({farm.plotCount} plots, {readyCrops} ready)</h3>
                        <div className="farm-grid-large">
                            {farm.plots.slice(0, farm.plotCount).map((plot, index) => {
                                const crop = plot.cropType ? CROPS[plot.cropType] : null;
                                return (
                                    <div
                                        key={index}
                                        className={`farm-plot-large ${plot.isReady ? "ready" : ""} ${!plot.cropType ? "empty" : ""}`}
                                        onClick={() => handlePlant(index)}
                                    >
                                        {plot.cropType ? (
                                            <>
                                                <span className={`crop-emoji-lg ${plot.isReady ? "bounce" : ""}`}>
                                                    {crop?.emoji}
                                                </span>
                                                {!plot.isReady && (
                                                    <div className="plot-progress-lg">
                                                        <div className="plot-progress-fill-lg" style={{ width: `${plot.progress || 0}%` }} />
                                                    </div>
                                                )}
                                                <span className="plot-status">
                                                    {plot.isReady ? `+${crop?.gemYield}💎` : `${Math.round(plot.progress || 0)}%`}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="empty-plot-lg">+</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button className="harvest-btn-large" onClick={handleHarvest} disabled={readyCrops === 0}>
                            🌾 Harvest All ({readyCrops})
                        </button>
                    </div>

                    {/* Animals & Production */}
                    {(totalAnimals > 0 || eggs.length > 0) && (
                        <div className="farm-fs-section">
                            <h3>🐾 Animals ({totalAnimals}) - Earning {hourlyIncome}💎/hour</h3>
                            {totalAnimals > 0 && (
                                <>
                                    <div className="animals-grid-large">
                                        {farm.animals?.chickens > 0 && (
                                            <div className="animal-card">
                                                <span className="animal-emoji-lg">🐔 ×{farm.animals.chickens}</span>
                                                <span className="animal-rate">{farm.animals.chickens * 2}🥚/hr</span>
                                                <button className="butcher-btn" onClick={() => handleButcher("chicken")}>Sell 10💎</button>
                                            </div>
                                        )}
                                        {farm.animals?.ducks > 0 && (
                                            <div className="animal-card">
                                                <span className="animal-emoji-lg">🦆 ×{farm.animals.ducks}</span>
                                                <span className="animal-rate">{farm.animals.ducks * 3}🥚/hr</span>
                                                <button className="butcher-btn" onClick={() => handleButcher("duck")}>Sell 20💎</button>
                                            </div>
                                        )}
                                        {farm.animals?.sheep > 0 && (
                                            <div className="animal-card">
                                                <span className="animal-emoji-lg">🐑 ×{farm.animals.sheep}</span>
                                                <span className="animal-rate">{farm.animals.sheep * 2}🧶/hr = {farm.animals.sheep * 6}💎</span>
                                                <button className="butcher-btn" onClick={() => handleButcher("sheep")}>Sell 50💎</button>
                                            </div>
                                        )}
                                        {farm.animals?.cows > 0 && (
                                            <div className="animal-card">
                                                <span className="animal-emoji-lg">🐄 ×{farm.animals.cows}</span>
                                                <span className="animal-rate">{farm.animals.cows * 2}🥛/hr = {farm.animals.cows * 16}💎</span>
                                                <button className="butcher-btn" onClick={() => handleButcher("cow")}>Sell 100💎</button>
                                            </div>
                                        )}
                                        {farm.animals?.pigs > 0 && (
                                            <div className="animal-card">
                                                <span className="animal-emoji-lg">🐷 ×{farm.animals.pigs}</span>
                                                <span className="animal-rate">{farm.animals.pigs}🍄/hr = {farm.animals.pigs * 30}💎</span>
                                                <button className="butcher-btn" onClick={() => handleButcher("pig")}>Sell 200💎</button>
                                            </div>
                                        )}
                                    </div>
                                    <button className="collect-btn-large" onClick={handleCollectAnimals}>
                                        🐾 Collect Goods (every 30min)
                                    </button>
                                </>
                            )}

                            {eggs.length > 0 && (
                                <div className="eggs-section">
                                    <h4>🥚 Eggs ({eggs.length}) - Sell 1💎 each OR hatch in 24h for FREE animal!</h4>
                                    <div className="eggs-grid-large">
                                        {eggs.slice(0, 20).map((egg, i) => {
                                            const isReady = egg.nurturing && (now - egg.laidAt) >= 24 * 60 * 60 * 1000;
                                            const timeLeft = egg.nurturing ? Math.max(0, 24 * 60 * 60 * 1000 - (now - egg.laidAt)) : 0;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`egg-item-lg ${egg.nurturing ? "nurturing" : ""} ${isReady ? "ready" : ""}`}
                                                    onClick={() => !egg.nurturing && handleNurtureEgg(i)}
                                                >
                                                    🥚
                                                    {egg.nurturing && !isReady && <span className="egg-timer-lg">{formatTime(timeLeft)}</span>}
                                                    {isReady && <span className="egg-hatch">🐣</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="egg-actions-lg">
                                        {sellableEggs.length > 0 && (
                                            <button className="action-btn sell" onClick={handleSellAllEggs}>
                                                💰 Sell All ({sellableEggs.length}) = {sellableEggs.length}💎
                                            </button>
                                        )}
                                        {readyToHatch.length > 0 && (
                                            <button className="action-btn hatch" onClick={handleHatchEggs}>
                                                🐣 Hatch ({readyToHatch.length}) FREE animals!
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Goods to sell */}
                    {(farm.inventory?.wool > 0 || farm.inventory?.milk > 0 || farm.inventory?.truffles > 0) && (
                        <div className="farm-fs-section">
                            <h3>📦 Goods Ready to Sell</h3>
                            <div className="goods-grid-large">
                                {farm.inventory?.wool > 0 && (
                                    <button className="good-btn" onClick={() => handleSellGoods("wool")}>
                                        🧶 ×{farm.inventory.wool} → {farm.inventory.wool * 3}💎
                                    </button>
                                )}
                                {farm.inventory?.milk > 0 && (
                                    <button className="good-btn" onClick={() => handleSellGoods("milk")}>
                                        🥛 ×{farm.inventory.milk} → {farm.inventory.milk * 8}💎
                                    </button>
                                )}
                                {farm.inventory?.truffles > 0 && (
                                    <button className="good-btn" onClick={() => handleSellGoods("truffles")}>
                                        🍄 ×{farm.inventory.truffles} → {farm.inventory.truffles * 30}💎
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <button className="farm-shop-btn-large" onClick={() => setShowShop(true)}>
                        🏪 Open Shop
                    </button>
                </div>

                {/* Shop Modal */}
                {showShop && (
                    <div className="farm-shop-overlay" onClick={() => { setShowShop(false); setSelectedItem(null); }}>
                        <div className="farm-shop-modal" onClick={e => e.stopPropagation()}>
                            <div className="shop-header">
                                <h2>🏪 Farm Shop</h2>
                                <button className="shop-close" onClick={() => { setShowShop(false); setSelectedItem(null); }}>✕</button>
                            </div>

                            <div className="shop-tabs">
                                <button className={`shop-tab ${shopTab === "animals" ? "active" : ""}`} onClick={() => setShopTab("animals")}>🐾 Animals</button>
                                <button className={`shop-tab ${shopTab === "boosts" ? "active" : ""}`} onClick={() => setShopTab("boosts")}>⚡ Boosts</button>
                                <button className={`shop-tab ${shopTab === "upgrades" ? "active" : ""}`} onClick={() => setShopTab("upgrades")}>⚙️ Upgrades</button>
                            </div>

                            <div className="shop-content">
                                {shopTab === "animals" && (
                                    <>
                                        <p className="shop-tip">💡 Animals produce goods passively every hour. Sell goods for gems, or hatch eggs for FREE animals!</p>
                                        <div className="shop-items-grid">
                                            {Object.entries(ANIMALS).map(([id, animal]) => (
                                                <button
                                                    key={id}
                                                    className={`shop-item-card ${selectedItem?.id === id ? "selected" : ""}`}
                                                    onClick={() => setSelectedItem({ id, ...animal })}
                                                >
                                                    <span className="item-emoji">{animal.emoji}</span>
                                                    <span className="item-name">{animal.name}</span>
                                                    <span className="item-production">
                                                        {animal.producePerHour}{animal.produceEmoji}/hr = {animal.producePerHour * animal.sellPrice}💎/hr
                                                    </span>
                                                    <span className="item-roi">ROI: ~{animal.roiHours}h</span>
                                                    <span className="item-cost">{animal.cost} 💎</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {shopTab === "boosts" && (
                                    <>
                                        <p className="shop-tip">💡 Boosts multiply your crop yields. Use on expensive crops for best value!</p>
                                        <div className="shop-items-grid">
                                            {Object.entries(BOOSTS).map(([id, boost]) => (
                                                <button
                                                    key={id}
                                                    className={`shop-item-card ${selectedItem?.id === id ? "selected" : ""}`}
                                                    onClick={() => setSelectedItem({ id, ...boost })}
                                                >
                                                    <span className="item-emoji">{boost.emoji}</span>
                                                    <span className="item-name">{boost.name}</span>
                                                    <span className="item-desc">{boost.desc}</span>
                                                    <span className="item-uses">×{boost.uses} uses</span>
                                                    <span className="item-cost">{boost.cost} 💎</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {shopTab === "upgrades" && (
                                    <>
                                        <p className="shop-tip">💡 Upgrades are permanent! They compound over time for massive long-term value.</p>
                                        <div className="shop-items-grid">
                                            {Object.entries(UPGRADES).map(([id, upgrade]) => (
                                                <button
                                                    key={id}
                                                    className={`shop-item-card ${selectedItem?.id === id ? "selected" : ""}`}
                                                    onClick={() => setSelectedItem({ id, ...upgrade })}
                                                >
                                                    <span className="item-emoji">{upgrade.emoji}</span>
                                                    <span className="item-name">{upgrade.name}</span>
                                                    <span className="item-desc">{upgrade.desc}</span>
                                                    <span className="item-permanent">PERMANENT</span>
                                                    <span className="item-cost">{upgrade.cost} 💎</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {selectedItem && (
                                    <div className="item-details">
                                        <h4>{selectedItem.emoji} {selectedItem.name}</h4>
                                        <p className="item-details-text">{selectedItem.details}</p>
                                        {selectedItem.roiHours && (
                                            <p className="roi-calc">
                                                📊 <strong>Investment Analysis:</strong><br />
                                                Cost: {selectedItem.cost}💎<br />
                                                Produces: {selectedItem.producePerHour} {selectedItem.produceEmoji} per hour<br />
                                                Each sells for: {selectedItem.sellPrice}💎<br />
                                                Hourly income: {selectedItem.producePerHour * selectedItem.sellPrice}💎/hr<br />
                                                Break-even: ~{selectedItem.roiHours} hours<br />
                                                <em>After that, pure profit forever!</em>
                                            </p>
                                        )}
                                        <button className="buy-btn" onClick={() => handleBuyItem(selectedItem.id)}>
                                            Buy for {selectedItem.cost} 💎
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Collapsed bar
    return (
        <div className="bingo-farm-collapsed">
            <div className="farm-bar" onClick={() => setIsFullScreen(true)}>
                <div className="farm-bar-left">
                    <span className="farm-icon">🌾</span>
                    <span className="farm-level-sm">Lv.{farm.farmLevel}</span>
                    {hourlyIncome > 0 && <span className="income-badge-sm">+{hourlyIncome}/hr</span>}
                </div>

                <div className="farm-preview">
                    {closestCrop?.cropType ? (
                        <div className={`preview-crop ${closestCrop.isReady ? "ready" : ""}`}>
                            <span className="preview-emoji">{closestCropData?.emoji}</span>
                            {closestCrop.isReady ? (
                                <span className="preview-status ready">+{closestCropData?.gemYield}💎</span>
                            ) : (
                                <>
                                    <div className="preview-bar">
                                        <div className="preview-fill" style={{ width: `${closestCrop.progress || 0}%` }} />
                                    </div>
                                    <span className="preview-pct">{Math.round(closestCrop.progress || 0)}%</span>
                                </>
                            )}
                        </div>
                    ) : (
                        <span className="preview-empty">Tap to farm 🌱</span>
                    )}
                </div>

                <div className="farm-bar-right">
                    {readyCrops > 0 && <span className="ready-badge-sm">{readyCrops} ready</span>}
                    <span className="expand-arrow">▲</span>
                </div>
            </div>
        </div>
    );
}
