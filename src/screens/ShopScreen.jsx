import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNotification } from "../components/Notifications";
import CosmeticPreview from "../components/CosmeticPreview";
import "./ShopScreen.css";

// Visual previews for cosmetics
const COSMETIC_PREVIEWS = {
    // Daub styles
    "daub-gold": "🟡",
    "daub-rainbow": "🌈",
    "daub-fire": "🔥",
    "daub-ice": "❄️",
    "daub-neon": "💜",
    // Card themes
    "card-classic": "🎴",
    "card-vegas": "🎰",
    "card-ocean": "🌊",
    "card-cosmic": "🌌",
    // Avatar frames
    "frame-bronze": "🥉",
    "frame-silver": "🥈",
    "frame-gold": "🥇",
    "frame-diamond": "💎",
    // Victory animations
    "anim-confetti": "🎊",
    "anim-fireworks": "🎆",
    "anim-lightning": "⚡",
};

const TABS = ["gems", "lucky", "cosmetics"];

export default function ShopScreen({ userId, onClose }) {
    const [tab, setTab] = useState("gems");
    const [selectedCosmetic, setSelectedCosmetic] = useState(null);
    const { showNotification } = useNotification();

    const cosmetics = useQuery(api.cosmetics.getAllCosmetics);
    const userCosmetics = useQuery(api.cosmetics.getUserCosmetics, userId ? { userId } : "skip");
    const currentGame = useQuery(api.luckyline.getCurrentGame, userId ? { userId } : "skip");
    const streakInfo = useQuery(api.daily.getStreakInfo, userId ? { userId } : "skip");
    const canClaim = useQuery(api.daily.canClaimReward, userId ? { userId } : "skip");

    const claimDaily = useMutation(api.daily.claimDailyReward);
    const startLuckyLine = useMutation(api.luckyline.startLuckyLine);
    const purchaseCosmetic = useMutation(api.cosmetics.purchaseCosmetic);
    const equipCosmetic = useMutation(api.cosmetics.equipCosmetic);

    const handleClaimDaily = async () => {
        const result = await claimDaily({ userId });
        if (result.success) {
            showNotification(`+${result.amount} Gems! 🎁 Day ${result.streak} streak!`, "success");
            if (result.bonus) {
                showNotification(result.bonus, "success");
            }
        } else {
            showNotification(result.error, "error");
        }
    };

    const handleStartLucky = async () => {
        const result = await startLuckyLine({ userId });
        if (result.success) {
            showNotification("Lucky Line started! Draw your lines!", "success");
        } else {
            showNotification(result.error, "error");
        }
    };

    const handlePurchase = async (cosmeticId) => {
        const result = await purchaseCosmetic({ userId, cosmeticId });
        if (result.success) {
            showNotification(`Purchased ${result.cosmetic.name}!`, "success");
        } else {
            showNotification(result.error, "error");
        }
    };

    const handleEquip = async (cosmeticId) => {
        const result = await equipCosmetic({ userId, cosmeticId });
        if (result.success) {
            showNotification("Equipped!", "success");
        } else {
            showNotification(result.error, "error");
        }
    };

    const ownedIds = new Set(userCosmetics?.map(uc => uc.cosmeticId) || []);

    return (
        <motion.div
            className="shop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="shop-modal"
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                transition={{ type: "spring", damping: 25 }}
            >
                <div className="shop-header">
                    <h2>💎 Gem Shop</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="shop-tabs">
                    {TABS.map(t => (
                        <motion.button
                            key={t}
                            className={`tab ${tab === t ? "active" : ""}`}
                            onClick={() => setTab(t)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {t === "gems" && "💎 Gems"}
                            {t === "lucky" && "🎲 Lucky Line"}
                            {t === "cosmetics" && "✨ Cosmetics"}
                        </motion.button>
                    ))}
                </div>

                <div className="shop-content">
                    <AnimatePresence mode="wait">
                        {tab === "gems" && (
                            <motion.div
                                key="gems"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="tab-content"
                            >
                                {/* Daily Reward */}
                                <div className="daily-section">
                                    <h3>🎁 Daily Reward</h3>
                                    {streakInfo && (
                                        <div className="streak-info">
                                            <span>🔥 {streakInfo.currentStreak} Day Streak</span>
                                            <span className="best">Best: {streakInfo.bestStreak}</span>
                                        </div>
                                    )}
                                    {canClaim?.canClaim ? (
                                        <motion.button
                                            className="claim-btn"
                                            onClick={handleClaimDaily}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            Claim +{canClaim.nextReward} Gems!
                                        </motion.button>
                                    ) : (
                                        <div className="cooldown">
                                            Available in {canClaim?.hoursRemaining || 0}h
                                        </div>
                                    )}
                                </div>

                                {/* Gem Packages */}
                                <h3>💰 Buy Gems</h3>
                                <div className="gem-packages">
                                    {[
                                        { name: "Starter", gems: 120, price: "$0.99", bonus: "+20%" },
                                        { name: "Value", gems: 650, price: "$4.99", bonus: "+30%" },
                                        { name: "Pro", gems: 1400, price: "$9.99", bonus: "+40%", popular: true },
                                        { name: "Whale", gems: 8000, price: "$49.99", bonus: "+60%" },
                                    ].map(pkg => (
                                        <motion.div
                                            key={pkg.name}
                                            className={`gem-package ${pkg.popular ? "popular" : ""}`}
                                            whileHover={{ scale: 1.03, y: -5 }}
                                        >
                                            {pkg.popular && <span className="popular-tag">Most Popular!</span>}
                                            <div className="pkg-gems">💎 {pkg.gems.toLocaleString()}</div>
                                            <div className="pkg-bonus">{pkg.bonus} Bonus</div>
                                            <button className="pkg-buy">{pkg.price}</button>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {tab === "lucky" && (
                            <motion.div
                                key="lucky"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="tab-content lucky-tab"
                            >
                                <div className="lucky-header">
                                    <h3>🎲 Lucky Line</h3>
                                    <p>Predict the winning line for a chance at 2,000 Gems!</p>
                                </div>

                                <div className="lucky-info">
                                    <div className="info-row">
                                        <span>Entry Cost</span>
                                        <span>💎 500</span>
                                    </div>
                                    <div className="info-row jackpot">
                                        <span>1st Pick Jackpot</span>
                                        <span>💎 2,000</span>
                                    </div>
                                    <div className="info-row">
                                        <span>2nd-5th Match</span>
                                        <span>💎 250</span>
                                    </div>
                                </div>

                                {currentGame ? (
                                    <div className="lucky-active">
                                        <p>You have an active game!</p>
                                        <p>Lines drawn: {currentGame.lines.length}/5</p>
                                        {/* Link to game would go here */}
                                    </div>
                                ) : (
                                    <motion.button
                                        className="lucky-start-btn"
                                        onClick={handleStartLucky}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Play Lucky Line (500 Gems)
                                    </motion.button>
                                )}
                            </motion.div>
                        )}

                        {tab === "cosmetics" && (
                            <motion.div
                                key="cosmetics"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="tab-content cosmetics-tab"
                            >
                                {["daub", "card", "frame", "animation"].map(type => (
                                    <div key={type} className="cosmetic-category">
                                        <h4>{type === "daub" ? "🎯 Daub Styles" :
                                            type === "card" ? "🃏 Card Themes" :
                                                type === "frame" ? "🖼️ Avatar Frames" : "🎬 Animations"}</h4>
                                        <div className="cosmetic-grid">
                                            {cosmetics?.filter(c => c.type === type).map(cosmetic => {
                                                const owned = ownedIds.has(cosmetic._id);
                                                return (
                                                    <motion.div
                                                        key={cosmetic._id}
                                                        className={`cosmetic-item ${cosmetic.rarity} ${owned ? "owned" : ""}`}
                                                        whileHover={{ scale: 1.05 }}
                                                        onClick={() => setSelectedCosmetic(cosmetic)}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <div className="cosmetic-preview">
                                                            {COSMETIC_PREVIEWS[cosmetic.asset] || "✨"}
                                                        </div>
                                                        <div className="cosmetic-name">{cosmetic.name}</div>
                                                        <div className="cosmetic-price">
                                                            {owned ? (
                                                                <button
                                                                    className="equip-btn"
                                                                    onClick={() => handleEquip(cosmetic._id)}
                                                                >
                                                                    Equip
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="buy-btn"
                                                                    onClick={() => handlePurchase(cosmetic._id)}
                                                                >
                                                                    💎 {cosmetic.price}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Cosmetic Preview Modal */}
            <AnimatePresence>
                {selectedCosmetic && (
                    <CosmeticPreview
                        cosmetic={selectedCosmetic}
                        onClose={() => setSelectedCosmetic(null)}
                        onPurchase={handlePurchase}
                        onEquip={handleEquip}
                        owned={ownedIds.has(selectedCosmetic._id)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
