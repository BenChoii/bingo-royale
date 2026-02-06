import { Player } from "@remotion/player";
import { useState, useEffect } from "react";
import { BingoWin, HarvestCelebration, PowerUpActivation } from "./animations";
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
