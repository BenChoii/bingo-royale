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
        desc: "Buy animals to produce eggs & goods!",
        items: {
            chicken: { name: "Chicken", emoji: "🐔", cost: 100, desc: "Lays eggs → sell for 1💎 or hatch in 24h" },
            duck: { name: "Duck", emoji: "🦆", cost: 200, desc: "Lays eggs → sell for 1💎 or hatch in 24h" },
            sheep: { name: "Sheep", emoji: "🐑", cost: 500, desc: "Produces wool → sell for 5💎 each" },
            cow: { name: "Cow", emoji: "🐄", cost: 1000, desc: "Produces milk → sell for 10💎 each" },
            pig: { name: "Pig", emoji: "🐷", cost: 2000, desc: "Finds truffles → sell for 25💎 each" },
        }
    },
    consumables: {
        name: "🌱 Items",
        desc: "Boost your crops!",
        items: {
            seedPack: { name: "Seed Pack", emoji: "🌱", cost: 10, desc: "+10 basic seeds" },
            fertilizer: { name: "Fertilizer", emoji: "💩", cost: 25, desc: "5x fertilizer (2x crop yield)" },
            superFertilizer: { name: "Super Grow", emoji: "✨", cost: 100, desc: "2x instant grow potion" },
        }
    },
    upgrades: {
        name: "⚙️ Upgrades",
        desc: "Permanent farm improvements",
        items: {
            sprinkler: { name: "Sprinkler", emoji: "💦", cost: 1500, desc: "25% faster crop growth" },
            farmBot: { name: "Farm Bot", emoji: "🤖", cost: 5000, desc: "Auto-replant after harvest" },
        }
    }
};

export default function BingoFarm({ userId }) {
    const [isExpanded, setIsExpanded] = useState(false);
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
            showNotification(result.error || "No eggs to sell", "info");
        }
    };

    const handleNurtureEgg = async (index) => {
        const result = await nurtureEgg({ userId, eggIndex: index });
        if (result.success) {
            showNotification(`Started nurturing ${result.type} egg! 24h to hatch 🐣`, "success");
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
            showNotification(`Sold ${result.sold} for ${result.gems} 💎!`, "success");
        } else {
            showNotification(result.error || "Nothing to sell", "info");
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

    const formatTime = (ms) => {
        if (ms <= 0) return "Ready!";
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
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

                        {/* Shop tabs */}
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
                            <button
                                className={`shop-tab ${shopTab === "inventory" ? "active" : ""}`}
                                onClick={() => setShopTab("inventory")}
                            >
                                📦 Inventory
                            </button>
                        </div>

                        <div className="shop-content">
                            {shopTab !== "inventory" && SHOP_CATEGORIES[shopTab] && (
                                <>
                                    <p className="shop-desc">{SHOP_CATEGORIES[shopTab].desc}</p>
                                    <div className="shop-items-grid">
                                        {Object.entries(SHOP_CATEGORIES[shopTab].items).map(([itemId, item]) => (
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
                                </>
                            )}

                            {shopTab === "inventory" && (
                                <div className="inventory-panel">
                                    {/* Animals owned */}
                                    <div className="inventory-section">
                                        <h4>🐾 Your Animals</h4>
                                        <div className="inventory-items">
                                            {farm.animals?.chickens > 0 && <span className="inv-item">🐔 ×{farm.animals.chickens}</span>}
                                            {farm.animals?.ducks > 0 && <span className="inv-item">🦆 ×{farm.animals.ducks}</span>}
                                            {farm.animals?.sheep > 0 && <span className="inv-item">🐑 ×{farm.animals.sheep}</span>}
                                            {farm.animals?.cows > 0 && <span className="inv-item">🐄 ×{farm.animals.cows}</span>}
                                            {farm.animals?.pigs > 0 && <span className="inv-item">🐷 ×{farm.animals.pigs}</span>}
                                            {totalAnimals === 0 && <span className="no-items">No animals yet - buy some!</span>}
                                        </div>
                                        {totalAnimals > 0 && (
                                            <button className="action-btn" onClick={handleCollectAnimals}>
                                                🐾 Collect from Animals
                                            </button>
                                        )}
                                    </div>

                                    {/* Eggs */}
                                    <div className="inventory-section">
                                        <h4>🥚 Eggs ({eggs.length})</h4>
                                        {eggs.length > 0 ? (
                                            <>
                                                <div className="eggs-grid">
                                                    {eggs.slice(0, 20).map((egg, i) => {
                                                        const isReady = egg.nurturing && (now - egg.laidAt) >= 24 * 60 * 60 * 1000;
                                                        const timeLeft = egg.nurturing ? Math.max(0, 24 * 60 * 60 * 1000 - (now - egg.laidAt)) : 0;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`egg-item ${egg.nurturing ? "nurturing" : ""} ${isReady ? "ready" : ""}`}
                                                                onClick={() => !egg.nurturing && handleNurtureEgg(i)}
                                                                title={egg.nurturing ? (isReady ? "Ready to hatch!" : `${formatTime(timeLeft)} left`) : "Click to nurture (24h to hatch)"}
                                                            >
                                                                {egg.type === "chicken" ? "🥚" : "🥚"}
                                                                {egg.nurturing && !isReady && <span className="egg-timer">{formatTime(timeLeft)}</span>}
                                                                {isReady && <span className="egg-ready">🐣</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="egg-actions">
                                                    {sellableEggs.length > 0 && (
                                                        <button className="action-btn sell" onClick={handleSellAllEggs}>
                                                            💰 Sell All ({sellableEggs.length}) = {sellableEggs.length}💎
                                                        </button>
                                                    )}
                                                    {readyToHatch.length > 0 && (
                                                        <button className="action-btn hatch" onClick={handleHatchEggs}>
                                                            🐣 Hatch Ready ({readyToHatch.length})
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="no-items">No eggs - buy chickens or ducks!</span>
                                        )}
                                    </div>

                                    {/* Goods */}
                                    <div className="inventory-section">
                                        <h4>📦 Goods to Sell</h4>
                                        <div className="goods-grid">
                                            {farm.inventory?.wool > 0 && (
                                                <button className="good-item" onClick={() => handleSellGoods("wool")}>
                                                    🧶 ×{farm.inventory.wool} <span className="good-value">= {farm.inventory.wool * 5}💎</span>
                                                </button>
                                            )}
                                            {farm.inventory?.milk > 0 && (
                                                <button className="good-item" onClick={() => handleSellGoods("milk")}>
                                                    🥛 ×{farm.inventory.milk} <span className="good-value">= {farm.inventory.milk * 10}💎</span>
                                                </button>
                                            )}
                                            {farm.inventory?.truffles > 0 && (
                                                <button className="good-item" onClick={() => handleSellGoods("truffles")}>
                                                    🍄 ×{farm.inventory.truffles} <span className="good-value">= {farm.inventory.truffles * 25}💎</span>
                                                </button>
                                            )}
                                            {(!farm.inventory?.wool && !farm.inventory?.milk && !farm.inventory?.truffles) && (
                                                <span className="no-items">No goods - collect from animals!</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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
                        {eggs.length > 0 && <span className="egg-badge">🥚 {eggs.length}</span>}
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
                                    className={`farm-plot ${plot.isReady ? "ready" : ""} ${!plot.cropType ? "empty" : ""}`}
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
                            <div className="animals-inline" onClick={handleCollectAnimals} title="Click to collect!">
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
                                    🐾 Collect
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
