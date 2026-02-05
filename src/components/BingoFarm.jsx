import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNotification } from "./Notifications";
import "./BingoFarm.css";

const CROPS = {
    seeds: { name: "Seeds", emoji: "🌱", growTime: 30000, gemYield: 1 },
    carrot: { name: "Carrots", emoji: "🥕", growTime: 120000, gemYield: 5 },
    corn: { name: "Corn", emoji: "🌽", growTime: 300000, gemYield: 12 },
    tomato: { name: "Tomatoes", emoji: "🍅", growTime: 600000, gemYield: 25 },
    strawberry: { name: "Strawberries", emoji: "🍓", growTime: 1200000, gemYield: 50 },
    sunflower: { name: "Sunflowers", emoji: "🌻", growTime: 1800000, gemYield: 75 },
    crystalBeet: { name: "Crystal Beets", emoji: "💎", growTime: 3600000, gemYield: 200 },
};

const CROP_UNLOCK_LEVELS = {
    seeds: 1, carrot: 3, corn: 5, tomato: 8, strawberry: 12, sunflower: 15, crystalBeet: 20
};

const SHOP_CATEGORIES = {
    animals: {
        name: "🐾 Animals",
        items: {
            chicken: { name: "Chicken", emoji: "🐔", cost: 100, desc: "Lays eggs (sell 1💎 or hatch 24h)" },
            duck: { name: "Duck", emoji: "🦆", cost: 200, desc: "Lays eggs (sell 1💎 or hatch 24h)" },
            sheep: { name: "Sheep", emoji: "🐑", cost: 500, desc: "Wool 5💎 each, butcher 75💎" },
            cow: { name: "Cow", emoji: "🐄", cost: 1000, desc: "Milk 10💎 each, butcher 150💎" },
            pig: { name: "Pig", emoji: "🐷", cost: 2000, desc: "Truffles 25💎 each, butcher 100💎" },
        }
    },
    consumables: {
        name: "🌱 Items",
        items: {
            seedPack: { name: "Seed Pack", emoji: "🌱", cost: 10, desc: "+10 seeds" },
            fertilizer: { name: "Fertilizer", emoji: "💩", cost: 25, desc: "5x fertilizer (2x yield)" },
            superFertilizer: { name: "Super Grow", emoji: "✨", cost: 100, desc: "2x instant grow" },
        }
    },
    upgrades: {
        name: "⚙️ Upgrades",
        items: {
            sprinkler: { name: "Sprinkler", emoji: "💦", cost: 1500, desc: "25% faster crops" },
            farmBot: { name: "Farm Bot", emoji: "🤖", cost: 5000, desc: "Auto-replant" },
        }
    }
};

export default function BingoFarm({ userId }) {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState("seeds");
    const [showShop, setShowShop] = useState(false);
    const [shopTab, setShopTab] = useState("animals");
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

    // Get crop closest to harvest for collapsed view
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
            showNotification(`Planted ${result.crop}!`, "success");
        } else {
            showNotification(result.error || "Failed to plant", "error");
        }
    };

    const handleHarvest = async () => {
        const result = await harvestCrops({ userId });
        if (result.success) {
            showNotification(
                `Harvested ${result.harvested} crops! +${result.gemsEarned} 💎${result.leveledUp ? ` 🎉 Level ${result.newLevel}!` : ""}`,
                "success"
            );
        } else {
            showNotification(result.error || "Nothing to harvest", "info");
        }
    };

    const handleBuyItem = async (itemId) => {
        const result = await buyShopItem({ userId, itemId });
        if (result.success) {
            showNotification(`Bought ${result.item}!`, "success");
        } else {
            showNotification(result.error || "Failed to buy", "error");
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
            showNotification(result.error || "Nothing to collect", "info");
        }
    };

    const handleSellAllEggs = async () => {
        const result = await sellAllEggs({ userId });
        if (result.success) {
            showNotification(`Sold ${result.sold} eggs for ${result.gems} 💎!`, "success");
        } else {
            showNotification(result.error || "No eggs", "info");
        }
    };

    const handleNurtureEgg = async (index) => {
        const result = await nurtureEgg({ userId, eggIndex: index });
        if (result.success) {
            showNotification(`Nurturing ${result.type} egg! 24h to hatch 🐣`, "success");
        } else {
            showNotification(result.error || "Failed", "error");
        }
    };

    const handleHatchEggs = async () => {
        const result = await hatchEggs({ userId });
        if (result.success) {
            let msg = "Hatched: ";
            if (result.chickensHatched > 0) msg += `${result.chickensHatched} 🐔 `;
            if (result.ducksHatched > 0) msg += `${result.ducksHatched} 🦆 `;
            showNotification(msg, "success");
        } else {
            showNotification(result.error || "No eggs ready", "info");
        }
    };

    const handleSellGoods = async (goodType) => {
        const result = await sellGoods({ userId, goodType });
        if (result.success) {
            showNotification(`Sold for ${result.gems} 💎!`, "success");
        } else {
            showNotification(result.error || "Nothing", "info");
        }
    };

    const handleButcher = async (animalType) => {
        if (!confirm(`Are you sure? This will permanently remove one ${animalType}!`)) return;
        const result = await butcherAnimal({ userId, animalType });
        if (result.success) {
            showNotification(`Butchered for ${result.gems} 💎 ${result.emoji}!`, "success");
        } else {
            showNotification(result.error || "Failed", "error");
        }
    };

    const readyCrops = farm.plots.filter(p => p.isReady).length;
    const availableCrops = Object.entries(CROPS).filter(
        ([key]) => CROP_UNLOCK_LEVELS[key] <= farm.farmLevel
    );

    const totalAnimals = farm.animals ?
        (farm.animals.chickens + farm.animals.ducks + farm.animals.sheep + farm.animals.cows + farm.animals.pigs) : 0;

    const eggs = farm.eggs || [];
    const sellableEggs = eggs.filter(e => !e.nurturing);
    const nurturingEggs = eggs.filter(e => e.nurturing);
    const readyToHatch = nurturingEggs.filter(e => (now - e.laidAt) >= 24 * 60 * 60 * 1000);

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
                        {eggs.length > 0 && <span>🥚 {eggs.length}</span>}
                    </div>
                    <button className="farm-fs-close" onClick={() => setIsFullScreen(false)}>✕</button>
                </div>

                <div className="farm-fs-content">
                    {/* Crop selector */}
                    <div className="farm-fs-section">
                        <h3>🌱 Select Crop to Plant</h3>
                        <div className="crop-selector-large">
                            {availableCrops.map(([key, crop]) => (
                                <button
                                    key={key}
                                    className={`crop-option-large ${selectedCrop === key ? "selected" : ""}`}
                                    onClick={() => setSelectedCrop(key)}
                                >
                                    <span className="crop-emoji-lg">{crop.emoji}</span>
                                    <span className="crop-name">{crop.name}</span>
                                    <span className="crop-info">{formatTime(crop.growTime)} → {crop.gemYield}💎</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Farm plots grid */}
                    <div className="farm-fs-section">
                        <h3>🌾 Your Farm ({readyCrops} ready)</h3>
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
                                                <span className="plot-status">{plot.isReady ? "Ready!" : `${Math.round(plot.progress || 0)}%`}</span>
                                            </>
                                        ) : (
                                            <span className="empty-plot-lg">+ Plant</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button className="harvest-btn-large" onClick={handleHarvest} disabled={readyCrops === 0}>
                            🌾 Harvest All ({readyCrops})
                        </button>
                    </div>

                    {/* Animals section */}
                    <div className="farm-fs-section">
                        <h3>🐾 Animals</h3>
                        <div className="animals-grid-large">
                            {farm.animals?.chickens > 0 && (
                                <div className="animal-card">
                                    <span className="animal-emoji-lg">🐔</span>
                                    <span className="animal-count">×{farm.animals.chickens}</span>
                                    <button className="butcher-btn" onClick={() => handleButcher("chicken")}>🍗 15💎</button>
                                </div>
                            )}
                            {farm.animals?.ducks > 0 && (
                                <div className="animal-card">
                                    <span className="animal-emoji-lg">🦆</span>
                                    <span className="animal-count">×{farm.animals.ducks}</span>
                                    <button className="butcher-btn" onClick={() => handleButcher("duck")}>🍖 25💎</button>
                                </div>
                            )}
                            {farm.animals?.sheep > 0 && (
                                <div className="animal-card">
                                    <span className="animal-emoji-lg">🐑</span>
                                    <span className="animal-count">×{farm.animals.sheep}</span>
                                    <button className="butcher-btn" onClick={() => handleButcher("sheep")}>🍖 75💎</button>
                                </div>
                            )}
                            {farm.animals?.cows > 0 && (
                                <div className="animal-card">
                                    <span className="animal-emoji-lg">🐄</span>
                                    <span className="animal-count">×{farm.animals.cows}</span>
                                    <button className="butcher-btn" onClick={() => handleButcher("cow")}>🥩 150💎</button>
                                </div>
                            )}
                            {farm.animals?.pigs > 0 && (
                                <div className="animal-card">
                                    <span className="animal-emoji-lg">🐷</span>
                                    <span className="animal-count">×{farm.animals.pigs}</span>
                                    <button className="butcher-btn" onClick={() => handleButcher("pig")}>🥓 100💎</button>
                                </div>
                            )}
                            {totalAnimals === 0 && <p className="no-items">No animals yet!</p>}
                        </div>
                        {totalAnimals > 0 && (
                            <button className="collect-btn-large" onClick={handleCollectAnimals}>
                                🐾 Collect from Animals
                            </button>
                        )}
                    </div>

                    {/* Eggs section */}
                    {eggs.length > 0 && (
                        <div className="farm-fs-section">
                            <h3>🥚 Eggs ({eggs.length})</h3>
                            <div className="eggs-grid-large">
                                {eggs.slice(0, 30).map((egg, i) => {
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
                                        💰 Sell ({sellableEggs.length}) = {sellableEggs.length}💎
                                    </button>
                                )}
                                {readyToHatch.length > 0 && (
                                    <button className="action-btn hatch" onClick={handleHatchEggs}>
                                        🐣 Hatch ({readyToHatch.length})
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Goods section */}
                    {(farm.inventory?.wool > 0 || farm.inventory?.milk > 0 || farm.inventory?.truffles > 0) && (
                        <div className="farm-fs-section">
                            <h3>📦 Goods to Sell</h3>
                            <div className="goods-grid-large">
                                {farm.inventory?.wool > 0 && (
                                    <button className="good-btn" onClick={() => handleSellGoods("wool")}>
                                        🧶 ×{farm.inventory.wool} → {farm.inventory.wool * 5}💎
                                    </button>
                                )}
                                {farm.inventory?.milk > 0 && (
                                    <button className="good-btn" onClick={() => handleSellGoods("milk")}>
                                        🥛 ×{farm.inventory.milk} → {farm.inventory.milk * 10}💎
                                    </button>
                                )}
                                {farm.inventory?.truffles > 0 && (
                                    <button className="good-btn" onClick={() => handleSellGoods("truffles")}>
                                        🍄 ×{farm.inventory.truffles} → {farm.inventory.truffles * 25}💎
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Shop button */}
                    <button className="farm-shop-btn-large" onClick={() => setShowShop(true)}>
                        🏪 Open Shop
                    </button>
                </div>

                {/* Shop Modal */}
                {showShop && (
                    <div className="farm-shop-overlay" onClick={() => setShowShop(false)}>
                        <div className="farm-shop-modal" onClick={e => e.stopPropagation()}>
                            <div className="shop-header">
                                <h2>🏪 Shop</h2>
                                <button className="shop-close" onClick={() => setShowShop(false)}>✕</button>
                            </div>
                            <div className="shop-tabs">
                                {Object.entries(SHOP_CATEGORIES).map(([id, cat]) => (
                                    <button
                                        key={id}
                                        className={`shop-tab ${shopTab === id ? "active" : ""}`}
                                        onClick={() => setShopTab(id)}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                            <div className="shop-content">
                                <div className="shop-items-grid">
                                    {Object.entries(SHOP_CATEGORIES[shopTab]?.items || {}).map(([itemId, item]) => (
                                        <button key={itemId} className="shop-item-card" onClick={() => handleBuyItem(itemId)}>
                                            <span className="item-emoji">{item.emoji}</span>
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-desc">{item.desc}</span>
                                            <span className="item-cost">{item.cost} 💎</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Collapsed bottom bar - shows closest to harvest
    return (
        <div className="bingo-farm-collapsed">
            <div className="farm-bar" onClick={() => setIsFullScreen(true)}>
                <div className="farm-bar-left">
                    <span className="farm-icon">🌾</span>
                    <span className="farm-level-sm">Lv.{farm.farmLevel}</span>
                </div>

                {/* Show closest crop to harvest */}
                <div className="farm-preview">
                    {closestCrop?.cropType ? (
                        <div className={`preview-crop ${closestCrop.isReady ? "ready" : ""}`}>
                            <span className="preview-emoji">{closestCropData?.emoji}</span>
                            {closestCrop.isReady ? (
                                <span className="preview-status ready">Ready!</span>
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
                        <span className="preview-empty">Tap to plant 🌱</span>
                    )}
                </div>

                <div className="farm-bar-right">
                    {readyCrops > 0 && <span className="ready-badge-sm">{readyCrops} ready</span>}
                    {eggs.length > 0 && <span className="egg-badge-sm">🥚{eggs.length}</span>}
                    <span className="expand-arrow">▲</span>
                </div>
            </div>
        </div>
    );
}
