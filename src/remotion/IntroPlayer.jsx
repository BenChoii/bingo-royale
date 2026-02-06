import { Player } from "@remotion/player";
import { BingoIntro } from "./BingoIntro";
import { useState } from "react";
import "./IntroPlayer.css";

export const IntroPlayer = ({ onComplete }) => {
    const [isEnding, setIsEnding] = useState(false);

    const handleEnded = () => {
        setIsEnding(true);
        // Small delay for fade out
        setTimeout(() => {
            onComplete?.();
        }, 300);
    };

    return (
        <div className={`intro-player-container ${isEnding ? "ending" : ""}`}>
            <Player
                component={BingoIntro}
                durationInFrames={90}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                style={{
                    width: "100%",
                    height: "100%",
                }}
                autoPlay
                loop={false}
                controls={false}
                showVolumeControls={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
                spaceKeyToPlayOrPause={false}
                moveToBeginningWhenEnded={false}
                onEnded={handleEnded}
            />
            <button className="skip-intro-btn" onClick={handleEnded}>
                Skip ▸
            </button>
        </div>
    );
};

export default IntroPlayer;
