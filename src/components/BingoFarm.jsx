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

const SHOP_ITEMS = {
    seedPack: { name: "Seed Pack", emoji: "🌱", cost: 10, desc: "+10 seeds" },
    fertilizer: { name: "Fertilizer", emoji: "💩", cost: 25, desc: "+5 fertilizer" },
    superFertilizer: { name: "Super Grow", emoji: "✨", cost: 100, desc: "+2 instant grow" },
    chicken: { name: "Chicken", emoji: "🐔", cost: 100, desc: "1 gem/min passive" },
    duck: { name: "Duck", emoji: "🦆", cost: 200, desc: "2 gems/min passive" },
    sheep: { name: "Sheep", emoji: "🐑", cost: 500, desc: "5 gems/min passive" },
    cow: { name: "Cow", emoji: "🐄", cost: 1000, desc: "10 gems/min passive" },
    pig: { name: "Pig", emoji: "🐷", cost: 2000, desc: "15 gems/min passive" },
    sprinkler: { name: "Sprinkler", emoji: "💦", cost: 1500, desc: "25% faster crops" },
    farmBot: { name: "Farm Bot", emoji: "🤖", cost: 5000, desc: "Auto-replant" },
};

export default function BingoFarm({ userId }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState("seeds");
    const [activeTab, setActiveTab] = useState("farm"); // farm, shop, animals
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
                    {totalAnimals > 0 && <span className="animal-badge">🐾 {totalAnimals}</span>}
                    {readyCrops > 0 && (
                        <span className="ready-badge">{readyCrops} ready!</span>
                    )}
                </div>
                <button className="expand-btn" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
                    {isExpanded ? "▼" : "▲"}
                </button>
            </div>

            {/* Plots row - always visible */}
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
                                        ? "Click Harvest All!"
                                        : `Growing... ${Math.round(plot.progress || 0)}%${plot.fertilized ? " (2x yield)" : ""}`
                                    : `Click to plant ${CROPS[selectedCrop]?.emoji}`
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
                                    {plot.fertilized && <span className="fertilized-icon">💩</span>}
                                </>
                            ) : (
                                <span className="empty-plot">+</span>
                            )}
                        </div>
                    );
                })}

                {/* Show animals inline */}
                {farm.animals && totalAnimals > 0 && (
                    <div className="animals-inline" onClick={handleCollectAnimals} title={`${gemsPerMinute} gems/min - Click to collect!`}>
                        {farm.animals.chickens > 0 && <span>🐔{farm.animals.chickens > 1 ? `×${farm.animals.chickens}` : ""}</span>}
                        {farm.animals.ducks > 0 && <span>🦆{farm.animals.ducks > 1 ? `×${farm.animals.ducks}` : ""}</span>}
                        {farm.animals.sheep > 0 && <span>🐑{farm.animals.sheep > 1 ? `×${farm.animals.sheep}` : ""}</span>}
                        {farm.animals.cows > 0 && <span>🐄{farm.animals.cows > 1 ? `×${farm.animals.cows}` : ""}</span>}
                        {farm.animals.pigs > 0 && <span>🐷{farm.animals.pigs > 1 ? `×${farm.animals.pigs}` : ""}</span>}
                    </div>
                )}
            </div>

            {/* Expanded panel */}
            {isExpanded && (
                <div className="farm-expanded">
                    {/* Tab switcher */}
                    <div className="farm-tabs">
                        <button
                            className={`farm-tab ${activeTab === "farm" ? "active" : ""}`}
                            onClick={() => setActiveTab("farm")}
                        >
                            🌱 Farm
                        </button>
                        <button
                            className={`farm-tab ${activeTab === "shop" ? "active" : ""}`}
                            onClick={() => setActiveTab("shop")}
                        >
                            🏪 Shop
                        </button>
                    </div>

                    {activeTab === "farm" && (
                        <div className="farm-controls">
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
                    )}

                    {activeTab === "shop" && (
                        <div className="farm-shop">
                            {Object.entries(SHOP_ITEMS).map(([id, item]) => (
                                <button
                                    key={id}
                                    className="shop-item"
                                    onClick={() => handleBuyItem(id)}
                                    title={item.desc}
                                >
                                    <span className="shop-emoji">{item.emoji}</span>
                                    <span className="shop-cost">{item.cost}💎</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
