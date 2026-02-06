import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// XP Bar fill animation
const XPBar = ({ fromPercent, toPercent }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Animate fill
    const fillProgress = spring({
        frame,
        fps,
        config: { damping: 20, stiffness: 80 },
    });

    const currentPercent = interpolate(fillProgress, [0, 1], [fromPercent, toPercent]);

    // Glow when filling
    const glowIntensity = 5 + Math.sin(frame * 0.4) * 3;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "35%",
                transform: "translate(-50%, 0)",
                width: 280,
            }}
        >
            {/* Bar background */}
            <div
                style={{
                    height: 24,
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: 12,
                    border: "2px solid rgba(255,255,255,0.2)",
                    overflow: "hidden",
                }}
            >
                {/* Fill */}
                <div
                    style={{
                        height: "100%",
                        width: `${currentPercent}%`,
                        background: "linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)",
                        borderRadius: 10,
                        boxShadow: `0 0 ${glowIntensity}px rgba(59, 130, 246, 0.8)`,
                        position: "relative",
                    }}
                >
                    {/* Shine effect */}
                    <div
                        style={{
                            position: "absolute",
                            top: 2,
                            left: 0,
                            right: 0,
                            height: 6,
                            background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)",
                            borderRadius: 4,
                        }}
                    />
                </div>
            </div>
            {/* Percentage label */}
            <div
                style={{
                    textAlign: "center",
                    marginTop: 8,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                {Math.round(currentPercent)}% to next level
            </div>
        </div>
    );
};

// Level badge
const LevelBadge = ({ level, isLevelUp }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const pop = spring({
        frame: frame - 20,
        fps,
        config: { damping: 8, stiffness: 150 },
    });

    const scale = isLevelUp ? interpolate(pop, [0, 1], [0.5, 1.2]) : 1;
    const glow = isLevelUp ? 30 : 10;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "20%",
                transform: `translate(-50%, 0) scale(${scale})`,
            }}
        >
            <div
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                    border: "3px solid #A78BFA",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 ${glow}px rgba(139, 92, 246, 0.6)`,
                }}
            >
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Inter, sans-serif" }}>
                    LVL
                </span>
                <span style={{ fontSize: 28, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif" }}>
                    {level}
                </span>
            </div>
        </div>
    );
};

// XP gained popup
const XPGainedPopup = ({ amount }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 5,
        fps,
        config: { damping: 12 },
    });

    const float = interpolate(frame, [5, 50], [0, -30], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "55%",
                transform: `translate(-50%, ${float}px) scale(${appear})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#60A5FA",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 0 15px rgba(59, 130, 246, 0.6), 0 2px 8px rgba(0,0,0,0.5)",
                }}
            >
                +{amount} XP
            </div>
        </div>
    );
};

// Sparkle particles on level up
const LevelUpSparkles = ({ isLevelUp }) => {
    const frame = useCurrentFrame();

    if (!isLevelUp) return null;

    const sparkles = Array.from({ length: 20 }, (_, i) => {
        const delay = 20 + i * 2;
        const sparkleFrame = frame - delay;
        if (sparkleFrame < 0 || sparkleFrame > 40) return null;

        const angle = (i / 20) * 360;
        const distance = 60 + i * 5;
        const x = Math.cos((angle * Math.PI) / 180) * distance * (sparkleFrame / 30);
        const y = Math.sin((angle * Math.PI) / 180) * distance * (sparkleFrame / 30);

        const opacity = interpolate(sparkleFrame, [0, 15, 40], [0, 1, 0], {
            extrapolateRight: "clamp",
        });

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "20%",
                    transform: `translate(${x}px, ${y}px)`,
                    fontSize: 14 + (i % 3) * 4,
                    opacity,
                }}
            >
                ✨
            </div>
        );
    });

    return <>{sparkles}</>;
};

// Main XP Bar Level composition
export const XPBarLevel = ({
    fromPercent = 60,
    toPercent = 100,
    level = 15,
    xpGained = 150,
    isLevelUp = true,
}) => {
    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Glow background */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
                }}
            />

            {/* Sparkles */}
            <LevelUpSparkles isLevelUp={isLevelUp} />

            {/* Level badge */}
            <LevelBadge level={level} isLevelUp={isLevelUp} />

            {/* XP Bar */}
            <XPBar fromPercent={fromPercent} toPercent={toPercent} />

            {/* XP gained */}
            <XPGainedPopup amount={xpGained} />
        </AbsoluteFill>
    );
};

export default XPBarLevel;
