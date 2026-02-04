import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./CosmeticPreview.css";

// Full preview for a selected cosmetic
export default function CosmeticPreview({ cosmetic, onClose, onPurchase, onEquip, owned }) {
    const [demoActive, setDemoActive] = useState(false);
    const [daubedCells, setDaubedCells] = useState([12]); // Center is always daubed (FREE)

    // Trigger demo animation on mount
    useEffect(() => {
        const timer = setTimeout(() => setDemoActive(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // For daub styles, animate daubing cells
    useEffect(() => {
        if (cosmetic.type === "daub" && demoActive) {
            const cells = [6, 18, 11, 13, 7, 17, 8, 16]; // BINGO pattern
            let i = 0;
            const interval = setInterval(() => {
                if (i < cells.length) {
                    setDaubedCells(prev => [...prev, cells[i]]);
                    i++;
                } else {
                    clearInterval(interval);
                }
            }, 400);
            return () => clearInterval(interval);
        }
    }, [cosmetic.type, demoActive]);

    const getRarityGlow = () => {
        switch (cosmetic.rarity) {
            case "legendary": return "hsla(45, 100%, 55%, 0.6)";
            case "epic": return "hsla(275, 80%, 60%, 0.5)";
            case "rare": return "hsla(210, 100%, 60%, 0.4)";
            default: return "hsla(0, 0%, 70%, 0.3)";
        }
    };

    // Sample bingo numbers
    const sampleCard = [
        [3, 18, 45, 56, 72],
        [7, 22, 34, 53, 68],
        [11, 27, "FREE", 59, 74],
        [2, 16, 41, 48, 61],
        [14, 29, 39, 52, 70]
    ];

    return (
        <motion.div
            className="cosmetic-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="cosmetic-preview-modal"
                initial={{ scale: 0.8, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 100 }}
                transition={{ type: "spring", damping: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{ boxShadow: `0 0 60px ${getRarityGlow()}` }}
            >
                {/* Header */}
                <div className={`preview-header ${cosmetic.rarity}`}>
                    <div className="preview-rarity-badge">{cosmetic.rarity.toUpperCase()}</div>
                    <h2>{cosmetic.name}</h2>
                    <p className="preview-desc">{cosmetic.description}</p>
                    <button className="preview-close" onClick={onClose}>✕</button>
                </div>

                {/* Live Demo Area */}
                <div className="preview-demo-area">
                    {cosmetic.type === "daub" && (
                        <div className="demo-bingo-card">
                            <div className="demo-card-header">
                                {['B', 'I', 'N', 'G', 'O'].map(l => (
                                    <span key={l}>{l}</span>
                                ))}
                            </div>
                            <div className="demo-card-grid">
                                {sampleCard.flat().map((num, idx) => (
                                    <motion.div
                                        key={idx}
                                        className={`demo-cell ${daubedCells.includes(idx) ? 'daubed' : ''} ${num === "FREE" ? 'is-free' : ''} daub-${cosmetic.asset}`}
                                        animate={daubedCells.includes(idx) && num !== "FREE" ? {
                                            scale: [1, 1.3, 1],
                                        } : {}}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {daubedCells.includes(idx) ? (
                                            <span className="daub-mark">{getDaubMark(cosmetic.asset)}</span>
                                        ) : (
                                            num
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                            <p className="demo-hint">Watch the BINGO line form!</p>
                        </div>
                    )}

                    {cosmetic.type === "card" && (
                        <div className={`demo-full-card theme-${cosmetic.asset}`}>
                            <div className="demo-card-header themed">
                                {['B', 'I', 'N', 'G', 'O'].map(l => (
                                    <span key={l}>{l}</span>
                                ))}
                            </div>
                            <div className="demo-card-grid themed">
                                {sampleCard.flat().map((num, idx) => (
                                    <div key={idx} className={`demo-cell ${idx === 12 ? 'is-free' : ''}`}>
                                        {num === "FREE" ? "⭐" : num}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {cosmetic.type === "frame" && (
                        <div className="demo-avatar-area">
                            <div className={`demo-avatar-frame frame-${cosmetic.asset}`}>
                                <div className="demo-avatar-inner">
                                    <span className="demo-avatar-emoji">😎</span>
                                </div>
                            </div>
                            <span className="demo-username">YourName</span>
                        </div>
                    )}

                    {cosmetic.type === "animation" && (
                        <div className="demo-animation-area">
                            <AnimatePresence>
                                {demoActive && (
                                    <AnimationDemo type={cosmetic.asset} />
                                )}
                            </AnimatePresence>
                            <motion.button
                                className="replay-btn"
                                onClick={() => {
                                    setDemoActive(false);
                                    setTimeout(() => setDemoActive(true), 100);
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                🔄 Replay Animation
                            </motion.button>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="preview-actions">
                    {owned ? (
                        <motion.button
                            className="action-btn equip"
                            onClick={() => onEquip(cosmetic._id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            ✓ Equip This Style
                        </motion.button>
                    ) : (
                        <motion.button
                            className="action-btn purchase"
                            onClick={() => onPurchase(cosmetic._id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            💎 {cosmetic.price} - Get It Now!
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// Get daub mark based on style
function getDaubMark(asset) {
    switch (asset) {
        case "daub-gold": return "✨";
        case "daub-rainbow": return "🌈";
        case "daub-fire": return "🔥";
        case "daub-ice": return "❄️";
        case "daub-neon": return "💜";
        default: return "●";
    }
}

// Victory animation demos
function AnimationDemo({ type }) {
    const particles = Array.from({ length: 20 }, (_, i) => i);

    if (type === "anim-confetti") {
        return (
            <div className="victory-demo confetti">
                {particles.map(i => (
                    <motion.div
                        key={i}
                        className="confetti-piece"
                        style={{
                            left: `${Math.random() * 100}%`,
                            background: `hsl(${Math.random() * 360}, 80%, 60%)`,
                        }}
                        initial={{ y: -20, opacity: 1, rotate: 0 }}
                        animate={{
                            y: 300,
                            opacity: 0,
                            rotate: Math.random() * 720 - 360,
                            x: (Math.random() - 0.5) * 100
                        }}
                        transition={{
                            duration: 2 + Math.random(),
                            delay: Math.random() * 0.5,
                            ease: "easeOut"
                        }}
                    />
                ))}
                <motion.div
                    className="victory-text"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                >
                    🎉 BINGO!
                </motion.div>
            </div>
        );
    }

    if (type === "anim-fireworks") {
        return (
            <div className="victory-demo fireworks">
                {[0, 1, 2].map(burst => (
                    <motion.div
                        key={burst}
                        className="firework-burst"
                        style={{
                            left: `${25 + burst * 25}%`,
                            top: `${30 + (burst % 2) * 20}%`
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
                        transition={{ duration: 1.5, delay: burst * 0.3 }}
                    >
                        {Array.from({ length: 12 }).map((_, i) => (
                            <motion.div
                                key={i}
                                className="spark"
                                style={{
                                    transform: `rotate(${i * 30}deg)`,
                                    background: `hsl(${burst * 60 + i * 30}, 100%, 60%)`
                                }}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: [0, 1, 0] }}
                                transition={{ duration: 0.8, delay: burst * 0.3 + 0.2 }}
                            />
                        ))}
                    </motion.div>
                ))}
                <motion.div
                    className="victory-text"
                    initial={{ scale: 0, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", delay: 0.5 }}
                >
                    🎆 BINGO!
                </motion.div>
            </div>
        );
    }

    if (type === "anim-lightning") {
        return (
            <div className="victory-demo lightning">
                <motion.div
                    className="lightning-bolt"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{
                        opacity: [0, 1, 1, 0, 1, 0],
                        scaleY: 1
                    }}
                    transition={{ duration: 0.8, times: [0, 0.1, 0.2, 0.3, 0.4, 1] }}
                >
                    ⚡
                </motion.div>
                <motion.div
                    className="lightning-glow"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.8, 0, 0.6, 0] }}
                    transition={{ duration: 0.6 }}
                />
                <motion.div
                    className="victory-text electric"
                    initial={{ scale: 0, textShadow: "0 0 0 transparent" }}
                    animate={{
                        scale: 1,
                        textShadow: "0 0 20px hsl(200, 100%, 60%)"
                    }}
                    transition={{ type: "spring", delay: 0.3 }}
                >
                    ⚡ BINGO! ⚡
                </motion.div>
            </div>
        );
    }

    return null;
}
