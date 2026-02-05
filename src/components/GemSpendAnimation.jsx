import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import "./GemSpendAnimation.css";

// Individual gem particle that floats away
function GemParticle({ index, amount }) {
    const angle = Math.random() * 360;
    const distance = 80 + Math.random() * 60;
    const x = Math.cos(angle * Math.PI / 180) * distance;
    const y = Math.sin(angle * Math.PI / 180) * distance - 50;
    const delay = index * 0.05;
    const scale = 0.5 + Math.random() * 0.5;

    return (
        <motion.div
            className="gem-particle"
            initial={{
                opacity: 1,
                scale: 1,
                x: 0,
                y: 0,
            }}
            animate={{
                opacity: 0,
                scale: scale,
                x: x,
                y: y,
            }}
            transition={{
                duration: 0.8,
                delay: delay,
                ease: "easeOut"
            }}
        >
            💎
        </motion.div>
    );
}

// Main spending animation overlay
export function GemSpendOverlay({ amount, onComplete }) {
    const particleCount = Math.min(Math.ceil(amount / 50), 15);

    return (
        <motion.div
            className="gem-spend-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={onComplete}
        >
            <motion.div
                className="gem-spend-container"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 15 }}
            >
                {/* Particles */}
                {[...Array(particleCount)].map((_, i) => (
                    <GemParticle key={i} index={i} amount={amount} />
                ))}

                {/* Amount display */}
                <motion.div
                    className="gem-spend-amount"
                    initial={{ scale: 0, y: 0 }}
                    animate={{ scale: [1, 1.3, 1], y: -30 }}
                    transition={{ duration: 0.6, times: [0, 0.5, 1] }}
                >
                    <span className="minus">-</span>
                    <span className="amount">{amount.toLocaleString()}</span>
                    <span className="gem">💎</span>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

// Inline gem counter animation (for header/nav)
export function GemCounter({ amount, previousAmount }) {
    const isDecreasing = previousAmount > amount;
    const diff = previousAmount - amount;

    return (
        <div className="gem-counter-wrapper">
            <motion.span
                key={amount}
                className="gem-counter-amount"
                initial={isDecreasing ? { scale: 1.2, color: "#ff6b6b" } : { scale: 1.2, color: "#4ade80" }}
                animate={{ scale: 1, color: "#fbbf24" }}
                transition={{ duration: 0.5 }}
            >
                💎 {amount.toLocaleString()}
            </motion.span>

            <AnimatePresence>
                {isDecreasing && diff > 0 && (
                    <motion.div
                        className="gem-diff-indicator"
                        initial={{ opacity: 1, y: 0, x: 0 }}
                        animate={{ opacity: 0, y: -30, x: 20 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        -{diff.toLocaleString()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Hook to trigger gem spend animation
export function useGemSpendAnimation() {
    const [spendInfo, setSpendInfo] = useState(null);

    const triggerSpend = useCallback((amount, onComplete) => {
        setSpendInfo({ amount, onComplete });

        // Auto-clear after animation
        setTimeout(() => {
            setSpendInfo(null);
            if (onComplete) onComplete();
        }, 1200);
    }, []);

    const SpendAnimation = () => (
        <AnimatePresence>
            {spendInfo && (
                <GemSpendOverlay
                    amount={spendInfo.amount}
                    onComplete={() => setSpendInfo(null)}
                />
            )}
        </AnimatePresence>
    );

    return { triggerSpend, SpendAnimation };
}

export default GemSpendOverlay;
