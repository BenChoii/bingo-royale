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

export default function BingoFarm({ userId }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState("seeds");
    const [now, setNow] = useState(Date.now());
    const { showNotification } = useNotification();

    const farm = useQuery(api.farm.getFarm, { userId });
    const initializeFarm = useMutation(api.farm.initializeFarm);
    const plantCrop = useMutation(api.farm.plantCrop);
    const harvestCrops = useMutation(api.farm.harvestCrops);

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

    const readyCrops = farm.plots.filter(p => p.isReady).length;
    const availableCrops = Object.entries(CROPS).filter(
        ([key]) => CROP_UNLOCK_LEVELS[key] <= farm.farmLevel
    );

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
                    {readyCrops > 0 && (
                        <span className="ready-badge">{readyCrops} ready!</span>
                    )}
                </div>
                <button className="expand-btn">
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
                            className={`farm-plot ${plot.isReady ? "ready" : ""} ${!plot.cropType ? "empty" : ""}`}
                            onClick={() => !plot.cropType && handlePlant(index)}
                            title={
                                plot.cropType
                                    ? plot.isReady
                                        ? "Click Harvest All!"
                                        : `Growing... ${Math.round(plot.progress || 0)}%`
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
                                </>
                            ) : (
                                <span className="empty-plot">+</span>
                            )}
                        </div>
                    );
                })}
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

                    <button
                        className="harvest-btn"
                        onClick={handleHarvest}
                        disabled={readyCrops === 0}
                    >
                        🌾 Harvest All ({readyCrops})
                    </button>
                </div>
            )}
        </div>
    );
}
