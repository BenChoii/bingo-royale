import { Player } from "@remotion/player";
import { useState, useEffect } from "react";
import {
    BingoWin,
    HarvestCelebration,
    PowerUpActivation,
    BossIntro,
    BossVictory,
    EggHatch,
    FarmLevelUp,
    TournamentVS,
    LuckyLine,
    DailyReward,
    NumberCalled,
} from "./animations";
import "./AnimationOverlay.css";

// Animation configurations
const ANIMATIONS = {
    bingoWin: {
        component: BingoWin,
        durationInFrames: 90,
        defaultProps: { gemsWon: 100, pattern: "line" },
    },
    harvest: {
        component: HarvestCelebration,
        durationInFrames: 60,
        defaultProps: { cropEmoji: "🥕", gemsEarned: 21, xpGained: 15, harvestCount: 3 },
    },
    powerUp: {
        component: PowerUpActivation,
        durationInFrames: 50,
        defaultProps: { type: "quickdaub" },
    },
    bossIntro: {
        component: BossIntro,
        durationInFrames: 90,
        defaultProps: { bossName: "Dragon King", bossEmoji: "🐉", hp: 5000 },
    },
    bossVictory: {
        component: BossVictory,
        durationInFrames: 100,
        defaultProps: { bossEmoji: "🐉", totalDamage: 5000 },
    },
    eggHatch: {
        component: EggHatch,
        durationInFrames: 80,
        defaultProps: { animalEmoji: "🐥", animalName: "Baby Chick" },
    },
    levelUp: {
        component: FarmLevelUp,
        durationInFrames: 75,
        defaultProps: {
            level: 5,
            unlocks: [
                { emoji: "🌽", name: "Corn" },
                { emoji: "🐷", name: "Pig" },
                { emoji: "🏠", name: "Plot" },
            ]
        },
    },
    tournamentVS: {
        component: TournamentVS,
        durationInFrames: 120,
        defaultProps: {
            player1: { name: "Player 1", avatar: "🎮", gems: 1000 },
            player2: { name: "Player 2", avatar: "🎯", gems: 1200 },
            prizePool: 500,
        },
    },
    luckyLine: {
        component: LuckyLine,
        durationInFrames: 90,
        defaultProps: { result: ["💎", "💎", "💎"], winAmount: 100, isJackpot: false },
    },
    dailyReward: {
        component: DailyReward,
        durationInFrames: 90,
        defaultProps: {
            rewards: [
                { emoji: "💎", label: "Gems", value: 50 },
                { emoji: "⭐", label: "XP", value: 100 },
                { emoji: "🎫", label: "Tickets", value: 1 },
            ],
            streak: 5,
        },
    },
    numberCalled: {
        component: NumberCalled,
        durationInFrames: 60,
        defaultProps: { number: 42, isOnCard: true },
    },
};

export const AnimationOverlay = ({
    animation,
    data = {},
    onComplete,
    autoPlay = true,
}) => {
    const [isEnding, setIsEnding] = useState(false);

    const config = ANIMATIONS[animation];
    if (!config) {
        console.warn(`Unknown animation: ${animation}`);
        onComplete?.();
        return null;
    }

    const handleEnded = () => {
        setIsEnding(true);
        setTimeout(() => {
            onComplete?.();
        }, 200);
    };

    // Auto-complete after duration if onEnded doesn't fire
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!isEnding) {
                handleEnded();
            }
        }, (config.durationInFrames / 30) * 1000 + 500);

        return () => clearTimeout(timeout);
    }, [config.durationInFrames, isEnding]);

    const Component = config.component;
    const props = { ...config.defaultProps, ...data };

    return (
        <div className={`animation-overlay ${isEnding ? "ending" : ""}`}>
            <Player
                component={Component}
                inputProps={props}
                durationInFrames={config.durationInFrames}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                style={{
                    width: "100%",
                    height: "100%",
                }}
                autoPlay={autoPlay}
                loop={false}
                controls={false}
                showVolumeControls={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
                spaceKeyToPlayOrPause={false}
                moveToBeginningWhenEnded={false}
                onEnded={handleEnded}
            />
        </div>
    );
};

export default AnimationOverlay;
