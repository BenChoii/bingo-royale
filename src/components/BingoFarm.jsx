import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNotification } from "./Notifications";
import "./BingoFarm.css";

// Full crop list with detailed info
const CROPS = {
    seeds: { name: "Basic Seeds", emoji: "🌱", growTime: 30000, gemYield: 1, unlockLevel: 1 },
    lettuce: { name: "Lettuce", emoji: "🥬", growTime: 60000, gemYield: 2, unlockLevel: 2 },
    carrot: { name: "Carrots", emoji: "🥕", growTime: 120000, gemYield: 5, unlockLevel: 3 },
    potato: { name: "Potatoes", emoji: "🥔", growTime: 180000, gemYield: 8, unlockLevel: 4 },
    corn: { name: "Corn", emoji: "🌽", growTime: 300000, gemYield: 12, unlockLevel: 5 },
    tomato: { name: "Tomatoes", emoji: "🍅", growTime: 600000, gemYield: 25, unlockLevel: 6 },
    pepper: { name: "Peppers", emoji: "🌶️", growTime: 900000, gemYield: 40, unlockLevel: 8 },
    strawberry: { name: "Strawberries", emoji: "🍓", growTime: 1200000, gemYield: 55, unlockLevel: 10 },
    grapes: { name: "Grapes", emoji: "🍇", growTime: 1500000, gemYield: 65, unlockLevel: 12 },
    sunflower: { name: "Sunflowers", emoji: "🌻", growTime: 1800000, gemYield: 80, unlockLevel: 14 },
    pumpkin: { name: "Pumpkins", emoji: "🎃", growTime: 2700000, gemYield: 120, unlockLevel: 18 },
    crystalBeet: { name: "Crystal Beets", emoji: "💎", growTime: 3600000, gemYield: 200, unlockLevel: 20 },
};

// Shop items with detailed explanations
const SHOP_ITEMS = {
    animals: {
        name: "🐾 Animals",
        tip: "Animals produce goods over time. Collect every 30min!",
        items: [
            {
                id: "chicken", name: "Chicken", emoji: "🐔", cost: 100,
                desc: "Lays eggs every 30min",
                details: "• Eggs: Sell for 1💎 instantly\n• OR nurture 24h to hatch a FREE chicken!"
            },
            {
                id: "duck", name: "Duck", emoji: "🦆", cost: 200,
                desc: "Lays premium eggs",
                details: "• Eggs: Sell for 1💎 each\n• OR hatch into another duck (24h)"
            },
            {
                id: "sheep", name: "Sheep", emoji: "🐑", cost: 500,
                desc: "Produces wool",
                details: "• Wool sells for 5💎 each\n• Butcher for 75💎 (removes sheep)"
            },
            {
                id: "cow", name: "Cow", emoji: "🐄", cost: 1000,
                desc: "Produces milk",
                details: "• Milk sells for 10💎 each\n• Butcher for 150💎 (removes cow)"
            },
            {
                id: "pig", name: "Pig", emoji: "🐷", cost: 2000,
                desc: "Finds truffles",
                details: "• Truffles sell for 25💎 each\n• Butcher for 100💎 (removes pig)"
            },
        ]
    },
    boosts: {
        name: "⚡ Boosts",
        tip: "Use boosts to speed up growth and increase yields!",
        items: [
            {
                id: "fertilizer", name: "Fertilizer", emoji: "💩", cost: 25,
                desc: "2x crop yield (5 uses)",
                details: "• Apply before harvest\n• Doubles gems earned\n• Works with Sprinkler!"
            },
            {
                id: "superFertilizer", name: "Super Grow", emoji: "✨", cost: 100,
                desc: "Instant harvest! (2 uses)",
                details: "• Immediately readies crop\n• Also gives 2x yield\n• Best for expensive crops!"
            },
            {
                id: "waterCan", name: "Water Can", emoji: "💧", cost: 50,
                desc: "1.5x speed (3 uses)",
                details: "• Apply to growing crop\n• Reduces time by 50%\n• Stacks with Sprinkler!"
            },
        ]
    },
    seeds: {
        name: "🌱 Seeds",
        tip: "Buy seed packs to plant more crops!",
        items: [
            {
                id: "seedPack", name: "Seed Pack", emoji: "🌱", cost: 10,
                desc: "+10 basic seeds",
                details: "• Used to plant crops\n• Auto-replant uses seeds\n• Stock up!"
            },
        ]
    },
    upgrades: {
        name: "⚙️ Upgrades",
        tip: "Permanent farm improvements!",
        items: [
            {
                id: "sprinkler", name: "Sprinkler", emoji: "💦", cost: 1500,
                desc: "25% faster ALL crops",
                details: "• Permanent upgrade\n• Applies to every crop\n• Stacks with Water Can!"
            },
            {
                id: "farmBot", name: "Farm Bot", emoji: "🤖", cost: 5000,
                desc: "Auto-replants crops",
                details: "• Permanent upgrade\n• After harvest, same crop replants\n• Saves time!"
            },
        ]
    },
};

export default function BingoFarm({ userId }) {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState("seeds");
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
            showNotification(`Planted ${result.crop}!`, "success");
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
                showNotification(result.error || "Failed to buy", "error");
            }
        } catch (err) {
            showNotification("Purchase failed - try again", "error");
            console.error("Buy error:", err);
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
            showNotification(`Nurturing ${result.type} egg (24h) 🐣`, "success");
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
        if (!confirm(`Butcher ${animalType}? It will be removed permanently!`)) return;
        const result = await butcherAnimal({ userId, animalType });
        if (result.success) {
            showNotification(`${result.emoji} +${result.gems} 💎`, "success");
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
                    {/* Crop selector with detailed info */}
                    <div className="farm-fs-section">
                        <h3>🌱 Select Crop ({availableCrops.length}/{Object.keys(CROPS).length} unlocked)</h3>
                        <div className="crop-selector-large">
                            {availableCrops.map(([key, crop]) => (
                                <button
                                    key={key}
                                    className={`crop-option-large ${selectedCrop === key ? "selected" : ""}`}
                                    onClick={() => setSelectedCrop(key)}
                                    title={`${crop.name}: ${formatTime(crop.growTime)} → ${crop.gemYield}💎`}
                                >
                                    <span className="crop-emoji-lg">{crop.emoji}</span>
                                    <span className="crop-name">{crop.name}</span>
                                    <span className="crop-info">{formatTime(crop.growTime)}</span>
                                    <span className="crop-yield">{crop.gemYield}💎</span>
                                </button>
                            ))}
                        </div>
                        {farm.helpers?.sprinkler && (
                            <p className="synergy-tip">💦 Sprinkler: -25% grow time on all crops!</p>
                        )}
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

                    {/* Animals */}
                    {(totalAnimals > 0 || eggs.length > 0) && (
                        <div className="farm-fs-section">
                            <h3>🐾 Animals & Eggs</h3>
                            {totalAnimals > 0 && (
                                <div className="animals-grid-large">
                                    {farm.animals?.chickens > 0 && (
                                        <div className="animal-card">
                                            <span className="animal-emoji-lg">🐔 ×{farm.animals.chickens}</span>
                                            <button className="butcher-btn" onClick={() => handleButcher("chicken")}>🍗 15💎</button>
                                        </div>
                                    )}
                                    {farm.animals?.ducks > 0 && (
                                        <div className="animal-card">
                                            <span className="animal-emoji-lg">🦆 ×{farm.animals.ducks}</span>
                                            <button className="butcher-btn" onClick={() => handleButcher("duck")}>🍖 25💎</button>
                                        </div>
                                    )}
                                    {farm.animals?.sheep > 0 && (
                                        <div className="animal-card">
                                            <span className="animal-emoji-lg">🐑 ×{farm.animals.sheep}</span>
                                            <button className="butcher-btn" onClick={() => handleButcher("sheep")}>🍖 75💎</button>
                                        </div>
                                    )}
                                    {farm.animals?.cows > 0 && (
                                        <div className="animal-card">
                                            <span className="animal-emoji-lg">🐄 ×{farm.animals.cows}</span>
                                            <button className="butcher-btn" onClick={() => handleButcher("cow")}>🥩 150💎</button>
                                        </div>
                                    )}
                                    {farm.animals?.pigs > 0 && (
                                        <div className="animal-card">
                                            <span className="animal-emoji-lg">🐷 ×{farm.animals.pigs}</span>
                                            <button className="butcher-btn" onClick={() => handleButcher("pig")}>🥓 100💎</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {totalAnimals > 0 && (
                                <button className="collect-btn-large" onClick={handleCollectAnimals}>
                                    🐾 Collect from Animals
                                </button>
                            )}

                            {/* Eggs */}
                            {eggs.length > 0 && (
                                <>
                                    <h4 style={{ marginTop: '16px', color: 'hsl(40, 60%, 70%)' }}>🥚 Eggs ({eggs.length})</h4>
                                    <div className="eggs-grid-large">
                                        {eggs.slice(0, 20).map((egg, i) => {
                                            const isReady = egg.nurturing && (now - egg.laidAt) >= 24 * 60 * 60 * 1000;
                                            const timeLeft = egg.nurturing ? Math.max(0, 24 * 60 * 60 * 1000 - (now - egg.laidAt)) : 0;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`egg-item-lg ${egg.nurturing ? "nurturing" : ""} ${isReady ? "ready" : ""}`}
                                                    onClick={() => !egg.nurturing && handleNurtureEgg(i)}
                                                    title={egg.nurturing ? (isReady ? "Ready!" : formatTime(timeLeft)) : "Click to nurture"}
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
                                </>
                            )}
                        </div>
                    )}

                    {/* Goods */}
                    {(farm.inventory?.wool > 0 || farm.inventory?.milk > 0 || farm.inventory?.truffles > 0) && (
                        <div className="farm-fs-section">
                            <h3>📦 Goods</h3>
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

                    <button className="farm-shop-btn-large" onClick={() => setShowShop(true)}>
                        🏪 Open Shop
                    </button>
                </div>

                {/* Shop Modal with detailed explanations */}
                {showShop && (
                    <div className="farm-shop-overlay" onClick={() => { setShowShop(false); setSelectedItem(null); }}>
                        <div className="farm-shop-modal" onClick={e => e.stopPropagation()}>
                            <div className="shop-header">
                                <h2>🏪 Farm Shop</h2>
                                <button className="shop-close" onClick={() => { setShowShop(false); setSelectedItem(null); }}>✕</button>
                            </div>

                            <div className="shop-tabs">
                                {Object.entries(SHOP_ITEMS).map(([id, cat]) => (
                                    <button
                                        key={id}
                                        className={`shop-tab ${shopTab === id ? "active" : ""}`}
                                        onClick={() => { setShopTab(id); setSelectedItem(null); }}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <div className="shop-content">
                                <p className="shop-tip">💡 {SHOP_ITEMS[shopTab]?.tip}</p>

                                <div className="shop-items-grid">
                                    {SHOP_ITEMS[shopTab]?.items.map((item) => (
                                        <button
                                            key={item.id}
                                            className={`shop-item-card ${selectedItem?.id === item.id ? "selected" : ""}`}
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            <span className="item-emoji">{item.emoji}</span>
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-desc">{item.desc}</span>
                                            <span className="item-cost">{item.cost} 💎</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Detailed item info */}
                                {selectedItem && (
                                    <div className="item-details">
                                        <h4>{selectedItem.emoji} {selectedItem.name}</h4>
                                        <pre className="item-details-text">{selectedItem.details}</pre>
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
                </div>

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
