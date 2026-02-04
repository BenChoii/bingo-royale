import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./WelcomeDialog.css";

const ONBOARDING_STEPS = [
    {
        id: "welcome",
        title: "Welcome to Bingo Royale! 👑",
        subtitle: "The Ultimate Social Bingo Experience",
        content: (
            <div className="welcome-splash">
                <div className="welcome-logo">🎰</div>
                <p className="welcome-tagline">
                    Play with friends, compete for glory, and <strong>collect epic rewards!</strong>
                </p>
                <div className="welcome-features-preview">
                    <span>🎮 Multiplayer</span>
                    <span>💎 Rewards</span>
                    <span>🏆 Rankings</span>
                </div>
            </div>
        ),
    },
    {
        id: "game-modes",
        title: "Choose Your Battle 🎯",
        subtitle: "4 Exciting Game Modes",
        content: (
            <div className="game-modes-grid">
                <div className="mode-card classic">
                    <span className="mode-icon">🎱</span>
                    <span className="mode-name">Classic</span>
                    <span className="mode-desc">Relaxed pace, 5-in-a-row wins</span>
                </div>
                <div className="mode-card speed">
                    <span className="mode-icon">⚡</span>
                    <span className="mode-name">Speed</span>
                    <span className="mode-desc">Fast calls, quick reflexes!</span>
                </div>
                <div className="mode-card pattern">
                    <span className="mode-icon">🎨</span>
                    <span className="mode-name">Pattern</span>
                    <span className="mode-desc">Match unique shapes to win</span>
                </div>
                <div className="mode-card blackout">
                    <span className="mode-icon">🌑</span>
                    <span className="mode-name">Blackout</span>
                    <span className="mode-desc">Cover entire card. Maximum XP!</span>
                </div>
            </div>
        ),
    },
    {
        id: "features",
        title: "Power Up Your Game ⚡",
        subtitle: "Strategic Items & Boss Battles",
        content: (
            <div className="features-showcase">
                <div className="feature-row">
                    <div className="feature-item">
                        <span className="feature-icon">🧊</span>
                        <span className="feature-name">Freeze Ray</span>
                        <span className="feature-desc">Stop opponents!</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">👁️</span>
                        <span className="feature-name">Peek</span>
                        <span className="feature-desc">See next number</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">🛡️</span>
                        <span className="feature-name">Shield</span>
                        <span className="feature-desc">Block attacks</span>
                    </div>
                </div>
                <div className="boss-preview">
                    <span className="boss-icon">👹</span>
                    <div className="boss-info">
                        <strong>Boss Battles!</strong>
                        <span>Team up after matches to defeat epic bosses and win big!</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: "social",
        title: "Play Together 🎉",
        subtitle: "Real-Time Multiplayer Fun",
        content: (
            <div className="social-showcase">
                <div className="social-features">
                    <div className="social-item">
                        <span className="social-icon">💬</span>
                        <span>Live Chat</span>
                    </div>
                    <div className="social-item">
                        <span className="social-icon">🏆</span>
                        <span>Leaderboards</span>
                    </div>
                    <div className="social-item">
                        <span className="social-icon">🎁</span>
                        <span>Daily Rewards</span>
                    </div>
                    <div className="social-item">
                        <span className="social-icon">✨</span>
                        <span>Cosmetics</span>
                    </div>
                </div>
                <div className="gems-bonus">
                    <span className="bonus-icon">💎</span>
                    <div className="bonus-text">
                        <strong>500 Gems Bonus!</strong>
                        <span>Start with free gems to power up your first games!</span>
                    </div>
                </div>
            </div>
        ),
    },
];

export default function WelcomeDialog({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const step = ONBOARDING_STEPS[currentStep];
    const isLast = currentStep === ONBOARDING_STEPS.length - 1;

    const handleNext = () => {
        if (isLast) {
            onComplete();
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    return (
        <div className="welcome-overlay">
            <motion.div
                className="welcome-dialog"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
            >
                {/* Progress Dots */}
                <div className="welcome-progress">
                    {ONBOARDING_STEPS.map((_, index) => (
                        <div
                            key={index}
                            className={`progress-dot ${index === currentStep ? "active" : ""} ${index < currentStep ? "completed" : ""}`}
                        />
                    ))}
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step.id}
                        className="welcome-content"
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h1 className="welcome-title">{step.title}</h1>
                        <p className="welcome-subtitle">{step.subtitle}</p>
                        <div className="welcome-body">{step.content}</div>
                    </motion.div>
                </AnimatePresence>

                {/* Actions */}
                <div className="welcome-actions">
                    {!isLast && (
                        <button className="btn-skip" onClick={handleSkip}>
                            Skip
                        </button>
                    )}
                    <button className="btn-next" onClick={handleNext}>
                        {isLast ? "🎮 Let's Play!" : "Next →"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
