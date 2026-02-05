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
    consumables: {
        name: "🌱 Seeds & Items",
        items: {
            seedPack: { name: "Seed Pack", emoji: "🌱", cost: 10, desc: "+10 basic seeds" },
            fertilizer: { name: "Fertilizer", emoji: "💩", cost: 25, desc: "5x fertilizer (2x crop yield)" },
            superFertilizer: { name: "Super Grow", emoji: "✨", cost: 100, desc: "2x instant grow potion" },
            waterCan: { name: "Watering Can", emoji: "💧", cost: 50, desc: "3x speed boost for crops" },
        }
    },
    animals: {
        name: "🐾 Animals",
        items: {
            chicken: { name: "Chicken", emoji: "🐔", cost: 100, desc: "Produces 1 gem per minute" },
            duck: { name: "Duck", emoji: "🦆", cost: 200, desc: "Produces 2 gems per minute" },
            sheep: { name: "Sheep", emoji: "🐑", cost: 500, desc: "Produces 5 gems per minute" },
            cow: { name: "Cow", emoji: "🐄", cost: 1000, desc: "Produces 10 gems per minute" },
            pig: { name: "Pig", emoji: "🐷", cost: 2000, desc: "Produces 15 gems per minute" },
        }
    },
    upgrades: {
        name: "⚙️ Upgrades",
        items: {
            sprinkler: { name: "Sprinkler", emoji: "💦", cost: 1500, desc: "25% faster crop growth (permanent)" },
            farmBot: { name: "Farm Bot", emoji: "🤖", cost: 5000, desc: "Auto-replant after harvest (permanent)" },
        }
    }
};

export default function BingoFarm({ userId }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState("seeds");
    const [showShop, setShowShop] = useState(false);
    const [now, setNow] = useState(Date.now());
    const { showNotification } = useNotification();

    const farm = useQuery(api.farm.getFarm, { userId });
    const initializeFarm = useMutation(api.farm.initializeFarm);
    const plantCrop = useMutation(api.farm.plantCrop);
    const harvestCrops = useMutation(api.farm.harvestCrops);
    const buyShopItem = useMutation(api.farm.buyShopItem);
    const collectAnimalGems = useMutation(api.farm.collectAnimalGems);

    // Update time every second for progress bars
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Initialize farm if doesn't exist
    useEffect(() => {
        if (farm === null) {
            initializeFarm({ userId });
        }
    }, [farm, userId, initializeFarm]);

    if (!farm || farm.isHidden) return null;

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
                `Harvested ${result.harvested} crops! +${result.gemsEarned} 💎${result.leveledUp ? ` 🎉 Farm Level ${result.newLevel}!` : ""}`,
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
            showNotification(`Collected +${result.gemsEarned} 💎 from animals!`, "success");
        } else {
            showNotification(result.error || "No gems to collect", "info");
        }
    };

    const readyCrops = farm.plots.filter(p => p.isReady).length;
    const availableCrops = Object.entries(CROPS).filter(
        ([key]) => CROP_UNLOCK_LEVELS[key] <= farm.farmLevel
    );

    const totalAnimals = farm.animals ?
        (farm.animals.chickens + farm.animals.ducks + farm.animals.sheep + farm.animals.cows + farm.animals.pigs) : 0;

    const gemsPerMinute = farm.animals ?
        (farm.animals.chickens * 1 + farm.animals.ducks * 2 + farm.animals.sheep * 5 +
            farm.animals.cows * 10 + farm.animals.pigs * 15) : 0;

    const formatTime = (ms) => {
        if (ms <= 0) return "Ready!";
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    };

    return (
        <>
            {/* Shop Modal */}
            {showShop && (
                <div className="farm-shop-overlay" onClick={() => setShowShop(false)}>
                    <div className="farm-shop-modal" onClick={e => e.stopPropagation()}>
                        <div className="shop-header">
                            <h2>🏪 Farm Shop</h2>
                            <button className="shop-close" onClick={() => setShowShop(false)}>✕</button>
                        </div>

                        <div className="shop-content">
                            {Object.entries(SHOP_CATEGORIES).map(([categoryId, category]) => (
                                <div key={categoryId} className="shop-category">
                                    <h3>{category.name}</h3>
                                    <div className="shop-items-grid">
                                        {Object.entries(category.items).map(([itemId, item]) => (
                                            <button
                                                key={itemId}
                                                className="shop-item-card"
                                                onClick={() => handleBuyItem(itemId)}
                                            >
                                                <span className="item-emoji">{item.emoji}</span>
                                                <span className="item-name">{item.name}</span>
                                                <span className="item-desc">{item.desc}</span>
                                                <span className="item-cost">{item.cost} 💎</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Show owned upgrades/animals */}
                        {farm.animals && totalAnimals > 0 && (
                            <div className="shop-owned">
                                <h4>🐾 Your Animals ({gemsPerMinute} gems/min)</h4>
                                <div className="owned-animals">
                                    {farm.animals.chickens > 0 && <span>🐔 ×{farm.animals.chickens}</span>}
                                    {farm.animals.ducks > 0 && <span>🦆 ×{farm.animals.ducks}</span>}
                                    {farm.animals.sheep > 0 && <span>🐑 ×{farm.animals.sheep}</span>}
                                    {farm.animals.cows > 0 && <span>🐄 ×{farm.animals.cows}</span>}
                                    {farm.animals.pigs > 0 && <span>🐷 ×{farm.animals.pigs}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={`bingo-farm ${isExpanded ? "expanded" : "collapsed"}`}>
                {/* Header bar */}
                <div className="farm-header" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="farm-title">
                        <span className="farm-icon">🌾</span>
                        <span className="farm-name">Bingo Farm</span>
                        <span className="farm-level">Lv.{farm.farmLevel}</span>
                        {farm.hasBingoBonus && <span className="bingo-bonus">⚡ 2x Speed!</span>}
                    </div>
                    <div className="farm-stats">
                        <span className="farm-gems">💎 {farm.totalGemsEarned}</span>
                        {readyCrops > 0 && (
                            <span className="ready-badge">{readyCrops} ready!</span>
                        )}
                    </div>
                    <button className="expand-btn" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
                        {isExpanded ? "▼" : "▲"}
                    </button>
                </div>

                {/* Main farm area */}
                <div className="farm-main">
                    {/* Plots */}
                    <div className="farm-plots">
                        {farm.plots.slice(0, farm.plotCount).map((plot, index) => {
                            const crop = plot.cropType ? CROPS[plot.cropType] : null;

                            return (
                                <div
                                    key={index}
                                    className={`farm-plot ${plot.isReady ? "ready" : ""} ${!plot.cropType ? "empty" : ""} ${plot.fertilized ? "fertilized" : ""}`}
                                    onClick={() => handlePlant(index)}
                                    title={
                                        plot.cropType
                                            ? plot.isReady
                                                ? "Ready! Click Harvest"
                                                : `${crop?.name} - ${Math.round(plot.progress || 0)}%`
                                            : `Plant ${CROPS[selectedCrop]?.name}`
                                    }
                                >
                                    {plot.cropType ? (
                                        <>
                                            <span className={`crop-emoji ${plot.isReady ? "bounce" : "grow"}`}>
                                                {crop?.emoji}
                                            </span>
                                            {!plot.isReady && (
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{ width: `${plot.progress || 0}%` }}
                                                    />
                                                </div>
                                            )}
                                            {plot.isReady && <span className="sparkle">✨</span>}
                                        </>
                                    ) : (
                                        <span className="empty-plot">+</span>
                                    )}
                                </div>
                            );
                        })}

                        {/* Animals inline */}
                        {totalAnimals > 0 && (
                            <div className="animals-inline" onClick={handleCollectAnimals} title={`${gemsPerMinute} gems/min - Click to collect!`}>
                                {farm.animals.chickens > 0 && <span>🐔{farm.animals.chickens > 1 ? `×${farm.animals.chickens}` : ""}</span>}
                                {farm.animals.ducks > 0 && <span>🦆{farm.animals.ducks > 1 ? `×${farm.animals.ducks}` : ""}</span>}
                                {farm.animals.sheep > 0 && <span>🐑{farm.animals.sheep > 1 ? `×${farm.animals.sheep}` : ""}</span>}
                                {farm.animals.cows > 0 && <span>🐄{farm.animals.cows > 1 ? `×${farm.animals.cows}` : ""}</span>}
                                {farm.animals.pigs > 0 && <span>🐷{farm.animals.pigs > 1 ? `×${farm.animals.pigs}` : ""}</span>}
                            </div>
                        )}
                    </div>

                    {/* Shop button - always visible on right */}
                    <button className="farm-shop-btn" onClick={() => setShowShop(true)}>
                        🏪 Shop
                    </button>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                    <div className="farm-expanded">
                        <div className="crop-selector">
                            <span className="selector-label">Plant:</span>
                            {availableCrops.map(([key, crop]) => (
                                <button
                                    key={key}
                                    className={`crop-option ${selectedCrop === key ? "selected" : ""}`}
                                    onClick={() => setSelectedCrop(key)}
                                    title={`${crop.name}: ${formatTime(crop.growTime)} → ${crop.gemYield} 💎`}
                                >
                                    {crop.emoji}
                                </button>
                            ))}
                        </div>

                        <div className="farm-actions">
                            <button
                                className="harvest-btn"
                                onClick={handleHarvest}
                                disabled={readyCrops === 0}
                            >
                                🌾 Harvest ({readyCrops})
                            </button>

                            {totalAnimals > 0 && (
                                <button className="collect-btn" onClick={handleCollectAnimals}>
                                    🐾 Collect ({gemsPerMinute}/min)
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
