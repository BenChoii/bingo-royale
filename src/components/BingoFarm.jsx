import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNotification } from "./Notifications";
import "./BingoFarm.css";

// Crop definitions with balanced economy
const CROPS = {
    sprout: { name: "Sprouts", emoji: "🌱", growTime: 30000, gemYield: 2, unlockLevel: 1 },
    lettuce: { name: "Lettuce", emoji: "🥬", growTime: 60000, gemYield: 5, unlockLevel: 2 },
    radish: { name: "Radish", emoji: "🫛", growTime: 120000, gemYield: 12, unlockLevel: 3 },
    carrot: { name: "Carrots", emoji: "🥕", growTime: 180000, gemYield: 21, unlockLevel: 4 },
    potato: { name: "Potatoes", emoji: "🥔", growTime: 300000, gemYield: 40, unlockLevel: 5 },
    corn: { name: "Corn", emoji: "🌽", growTime: 600000, gemYield: 90, unlockLevel: 6 },
    tomato: { name: "Tomatoes", emoji: "🍅", growTime: 900000, gemYield: 150, unlockLevel: 8 },
    pepper: { name: "Peppers", emoji: "🌶️", growTime: 1200000, gemYield: 220, unlockLevel: 10 },
    strawberry: { name: "Strawberries", emoji: "🍓", growTime: 1800000, gemYield: 360, unlockLevel: 12 },
    pumpkin: { name: "Pumpkins", emoji: "🎃", growTime: 2700000, gemYield: 580, unlockLevel: 15 },
    sunflower: { name: "Sunflowers", emoji: "🌻", growTime: 3600000, gemYield: 840, unlockLevel: 18 },
    crystalBeet: { name: "Crystal Beets", emoji: "💎", growTime: 7200000, gemYield: 1800, unlockLevel: 20 },
};

// Animal info for shop
const ANIMALS = {
    chicken: { emoji: "🐔", name: "Chicken", cost: 50, producePerHour: 2, sellPrice: 1, roiHours: 25 },
    duck: { emoji: "🦆", name: "Duck", cost: 100, producePerHour: 3, sellPrice: 1, roiHours: 33 },
    sheep: { emoji: "🐑", name: "Sheep", cost: 200, producePerHour: 2, sellPrice: 3, roiHours: 33 },
    cow: { emoji: "🐄", name: "Cow", cost: 500, producePerHour: 2, sellPrice: 8, roiHours: 31 },
    pig: { emoji: "🐷", name: "Pig", cost: 1000, producePerHour: 1, sellPrice: 30, roiHours: 33 },
};

// Animated animal component
function WalkingAnimal({ type, index }) {
    const animal = ANIMALS[type];
    if (!animal) return null;

    return (
        <div
            className="walking-animal"
            style={{
                animationDelay: `${index * 2}s`,
                animationDuration: `${15 + index * 3}s`
            }}
        >
            {animal.emoji}
        </div>
    );
}

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

    const handlePlant = async (plotIndex) => {
        try {
            const result = await plantCrop({ userId, plotIndex, cropType: selectedCrop });
            if (result?.success) {
                showNotification(`Planted ${CROPS[selectedCrop]?.emoji}!`, "success");
            } else {
                showNotification(result?.error || "Failed", "error");
            }
        } catch (e) {
            console.error("Plant error:", e);
        }
    };

    const handleHarvest = async () => {
        try {
            const result = await harvestCrops({ userId });
            if (result?.success) {
                showNotification(`+${result.gemsEarned} 💎!`, "success");
            }
        } catch (e) {
            console.error("Harvest error:", e);
        }
    };

    const handleBuyItem = async (itemId) => {
        try {
            const result = await buyShopItem({ userId, itemId });
            if (result?.success) {
                showNotification(`Bought ${result.item}!`, "success");
                setSelectedItem(null);
            } else {
                showNotification(result?.error || "Not enough gems", "error");
            }
        } catch (e) {
            console.error("Buy error:", e);
            showNotification("Purchase failed", "error");
        }
    };

    const handleCollectAnimals = async () => {
        try {
            const result = await collectAnimalGems({ userId });
            if (result?.success) {
                let msg = "";
                if (result.eggsLaid > 0) msg += `${result.eggsLaid}🥚 `;
                if (result.woolProduced > 0) msg += `${result.woolProduced}🧶 `;
                if (result.milkProduced > 0) msg += `${result.milkProduced}🥛 `;
                if (result.trufflesProduced > 0) msg += `${result.trufflesProduced}🍄 `;
                showNotification(msg || "Collected!", "success");
            }
        } catch (e) {
            console.error("Collect error:", e);
        }
    };

    const handleSellAllEggs = async () => {
        const result = await sellAllEggs({ userId });
        if (result?.success) showNotification(`+${result.gems}💎`, "success");
    };

    const handleHatchEggs = async () => {
        const result = await hatchEggs({ userId });
        if (result?.success) showNotification("Hatched! 🐣", "success");
    };

    const handleSellGoods = async (goodType) => {
        const result = await sellGoods({ userId, goodType });
        if (result?.success) showNotification(`+${result.gems}💎`, "success");
    };

    const handleButcher = async (animalType) => {
        if (!confirm(`Sell ${animalType}?`)) return;
        const result = await butcherAnimal({ userId, animalType });
        if (result?.success) showNotification(`+${result.gems}💎`, "success");
    };

    // Get crops that are ready or nearly ready (>75%)
    const importantCrops = farm.plots
        .filter(p => p.cropType && (p.isReady || (p.progress || 0) > 75))
        .slice(0, 4);

    const readyCrops = farm.plots.filter(p => p.isReady).length;
    const availableCrops = Object.entries(CROPS).filter(
        ([key]) => CROPS[key].unlockLevel <= farm.farmLevel
    );

    const totalAnimals = farm.animals ?
        (farm.animals.chickens + farm.animals.ducks + farm.animals.sheep + farm.animals.cows + farm.animals.pigs) : 0;

    const eggs = farm.eggs || [];
    const sellableEggs = eggs.filter(e => !e.nurturing);
    const readyToHatch = eggs.filter(e => e.nurturing && (now - e.laidAt) >= 86400000);

    const formatTime = (ms) => {
        if (ms <= 0) return "✓";
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        return `${Math.floor(minutes / 60)}h`;
    };

    // Build list of owned animals for walking animation
    const ownedAnimals = [];
    if (farm.animals) {
        for (let i = 0; i < farm.animals.chickens; i++) ownedAnimals.push({ type: 'chicken', i });
        for (let i = 0; i < farm.animals.ducks; i++) ownedAnimals.push({ type: 'duck', i });
        for (let i = 0; i < farm.animals.sheep; i++) ownedAnimals.push({ type: 'sheep', i });
        for (let i = 0; i < farm.animals.cows; i++) ownedAnimals.push({ type: 'cow', i });
        for (let i = 0; i < farm.animals.pigs; i++) ownedAnimals.push({ type: 'pig', i });
    }

    // Full screen farm view
    if (isFullScreen) {
        return (
            <div className="farm-fullscreen">
                <div className="farm-fs-header">
                    <div className="farm-fs-title">
                        🌾 <span>Farm</span>
                        <span className="farm-level-badge">Lv.{farm.farmLevel}</span>
                    </div>
                    <button className="farm-fs-close" onClick={() => setIsFullScreen(false)}>✕</button>
                </div>

                <div className="farm-fs-content">
                    {/* Crop selector */}
                    <div className="farm-fs-section">
                        <h3>🌱 Plant</h3>
                        <div className="crop-selector-large">
                            {availableCrops.map(([key, crop]) => (
                                <button
                                    key={key}
                                    className={`crop-option-large ${selectedCrop === key ? "selected" : ""}`}
                                    onClick={() => setSelectedCrop(key)}
                                >
                                    <span className="crop-emoji-lg">{crop.emoji}</span>
                                    <span className="crop-yield">+{crop.gemYield}💎</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Farm plots */}
                    <div className="farm-fs-section">
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
                                            </>
                                        ) : (
                                            <span className="empty-plot-lg">+</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {readyCrops > 0 && (
                            <button className="harvest-btn-large" onClick={handleHarvest}>
                                🌾 Harvest ({readyCrops})
                            </button>
                        )}
                    </div>

                    {/* Animals & goods */}
                    {(totalAnimals > 0 || eggs.length > 0 || farm.inventory?.wool > 0 || farm.inventory?.milk > 0 || farm.inventory?.truffles > 0) && (
                        <div className="farm-fs-section">
                            <h3>🐾 Animals</h3>
                            <div className="animals-compact">
                                {farm.animals?.chickens > 0 && <span>🐔×{farm.animals.chickens}</span>}
                                {farm.animals?.ducks > 0 && <span>🦆×{farm.animals.ducks}</span>}
                                {farm.animals?.sheep > 0 && <span>🐑×{farm.animals.sheep}</span>}
                                {farm.animals?.cows > 0 && <span>🐄×{farm.animals.cows}</span>}
                                {farm.animals?.pigs > 0 && <span>🐷×{farm.animals.pigs}</span>}
                            </div>
                            {totalAnimals > 0 && (
                                <button className="collect-btn" onClick={handleCollectAnimals}>Collect</button>
                            )}

                            {/* Goods */}
                            <div className="goods-compact">
                                {farm.inventory?.wool > 0 && (
                                    <button onClick={() => handleSellGoods("wool")}>🧶{farm.inventory.wool} → {farm.inventory.wool * 3}💎</button>
                                )}
                                {farm.inventory?.milk > 0 && (
                                    <button onClick={() => handleSellGoods("milk")}>🥛{farm.inventory.milk} → {farm.inventory.milk * 8}💎</button>
                                )}
                                {farm.inventory?.truffles > 0 && (
                                    <button onClick={() => handleSellGoods("truffles")}>🍄{farm.inventory.truffles} → {farm.inventory.truffles * 30}💎</button>
                                )}
                            </div>

                            {/* Eggs */}
                            {eggs.length > 0 && (
                                <div className="eggs-compact">
                                    <span>🥚×{eggs.length}</span>
                                    {sellableEggs.length > 0 && (
                                        <button onClick={handleSellAllEggs}>Sell {sellableEggs.length}💎</button>
                                    )}
                                    {readyToHatch.length > 0 && (
                                        <button onClick={handleHatchEggs}>Hatch {readyToHatch.length}🐣</button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <button className="farm-shop-btn" onClick={() => setShowShop(true)}>🏪 Shop</button>
                </div>

                {/* Shop Modal */}
                {showShop && (
                    <div className="farm-shop-overlay" onClick={() => { setShowShop(false); setSelectedItem(null); }}>
                        <div className="farm-shop-modal" onClick={e => e.stopPropagation()}>
                            <div className="shop-header">
                                <h2>🏪 Shop</h2>
                                <button className="shop-close" onClick={() => setShowShop(false)}>✕</button>
                            </div>

                            <div className="shop-tabs">
                                <button className={`shop-tab ${shopTab === "animals" ? "active" : ""}`} onClick={() => setShopTab("animals")}>🐾</button>
                                <button className={`shop-tab ${shopTab === "boosts" ? "active" : ""}`} onClick={() => setShopTab("boosts")}>⚡</button>
                                <button className={`shop-tab ${shopTab === "upgrades" ? "active" : ""}`} onClick={() => setShopTab("upgrades")}>⚙️</button>
                            </div>

                            <div className="shop-content">
                                {shopTab === "animals" && (
                                    <div className="shop-items-grid">
                                        {Object.entries(ANIMALS).map(([id, animal]) => (
                                            <button
                                                key={id}
                                                className={`shop-item-card ${selectedItem?.id === id ? "selected" : ""}`}
                                                onClick={() => setSelectedItem({ id, ...animal })}
                                            >
                                                <span className="item-emoji">{animal.emoji}</span>
                                                <span className="item-cost">{animal.cost}💎</span>
                                                <span className="item-roi">~{animal.roiHours}h ROI</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {shopTab === "boosts" && (
                                    <div className="shop-items-grid">
                                        <button className="shop-item-card" onClick={() => handleBuyItem("fertilizer")}>
                                            <span className="item-emoji">💩</span>
                                            <span className="item-cost">20💎</span>
                                            <span className="item-desc">2x yield</span>
                                        </button>
                                        <button className="shop-item-card" onClick={() => handleBuyItem("superGrow")}>
                                            <span className="item-emoji">✨</span>
                                            <span className="item-cost">75💎</span>
                                            <span className="item-desc">Instant</span>
                                        </button>
                                        <button className="shop-item-card" onClick={() => handleBuyItem("waterCan")}>
                                            <span className="item-emoji">💧</span>
                                            <span className="item-cost">30💎</span>
                                            <span className="item-desc">50% faster</span>
                                        </button>
                                    </div>
                                )}

                                {shopTab === "upgrades" && (
                                    <div className="shop-items-grid">
                                        <button className="shop-item-card" onClick={() => handleBuyItem("sprinkler")}>
                                            <span className="item-emoji">💦</span>
                                            <span className="item-cost">800💎</span>
                                            <span className="item-desc">-25% time</span>
                                        </button>
                                        <button className="shop-item-card" onClick={() => handleBuyItem("farmBot")}>
                                            <span className="item-emoji">🤖</span>
                                            <span className="item-cost">2000💎</span>
                                            <span className="item-desc">Auto-plant</span>
                                        </button>
                                    </div>
                                )}

                                {selectedItem && (
                                    <div className="item-details">
                                        <h4>{selectedItem.emoji} {selectedItem.name}</h4>
                                        <p>Makes {selectedItem.producePerHour}/hr → {selectedItem.producePerHour * selectedItem.sellPrice}💎/hr</p>
                                        <p>Break-even: ~{selectedItem.roiHours}h</p>
                                        <button className="buy-btn" onClick={() => handleBuyItem(selectedItem.id)}>
                                            Buy {selectedItem.cost}💎
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

    // MINIMAL collapsed bar - just crop icons
    return (
        <>
            {/* Walking animals across screen */}
            <div className="walking-animals-container">
                {ownedAnimals.slice(0, 5).map((a, i) => (
                    <WalkingAnimal key={`${a.type}-${i}`} type={a.type} index={i} />
                ))}
            </div>

            {/* Minimal farm bar */}
            <div className="farm-bar-minimal" onClick={() => setIsFullScreen(true)}>
                {importantCrops.length > 0 ? (
                    <div className="crop-icons">
                        {importantCrops.map((plot, i) => (
                            <span
                                key={i}
                                className={`crop-icon ${plot.isReady ? "ready" : ""}`}
                            >
                                {CROPS[plot.cropType]?.emoji}
                            </span>
                        ))}
                        {readyCrops > 0 && <span className="ready-count">{readyCrops}✓</span>}
                    </div>
                ) : (
                    <span className="farm-hint">🌱</span>
                )}
                <span className="expand-hint">▲</span>
            </div>
        </>
    );
}
