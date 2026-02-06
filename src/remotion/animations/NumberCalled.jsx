import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Bingo ball colors based on letter
const getBallColor = (number) => {
    if (number <= 15) return { bg: "linear-gradient(135deg, #3B82F6, #1E40AF)", letter: "B", glow: "rgba(59, 130, 246, 0.6)" };
    if (number <= 30) return { bg: "linear-gradient(135deg, #EF4444, #991B1B)", letter: "I", glow: "rgba(239, 68, 68, 0.6)" };
    if (number <= 45) return { bg: "linear-gradient(135deg, #8B5CF6, #5B21B6)", letter: "N", glow: "rgba(139, 92, 246, 0.6)" };
    if (number <= 60) return { bg: "linear-gradient(135deg, #10B981, #047857)", letter: "G", glow: "rgba(16, 185, 129, 0.6)" };
    return { bg: "linear-gradient(135deg, #F59E0B, #B45309)", letter: "O", glow: "rgba(245, 158, 11, 0.6)" };
};

// Main bingo ball
const BingoBall = ({ number }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const ballInfo = getBallColor(number);

    // Drop animation
    const drop = spring({
        frame,
        fps,
        config: { damping: 8, stiffness: 100 },
    });

    const y = interpolate(drop, [0, 1], [-200, 0]);

    // Bounce
    const bounceY = frame > 20 && frame < 35
        ? Math.sin((frame - 20) * 0.5) * 20 * Math.exp(-(frame - 20) * 0.1)
        : 0;

    // Rotation on drop
    const rotation = interpolate(frame, [0, 20], [-180, 0], {
        extrapolateRight: "clamp",
    });

    // Pulsing glow
    const glowSize = 20 + Math.sin(frame * 0.3) * 10;

    // Scale pop
    const scalePop = frame > 15 && frame < 25
        ? 1 + (1 - Math.abs(frame - 20) / 5) * 0.2
        : 1;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "40%",
                transform: `translate(-50%, ${y + bounceY}px) rotate(${rotation}deg) scale(${scalePop})`,
            }}
        >
            {/* Ball */}
            <div
                style={{
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    background: ballInfo.bg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 8px 30px rgba(0,0,0,0.4), 0 0 ${glowSize}px ${ballInfo.glow}`,
                    border: "4px solid rgba(255,255,255,0.3)",
                }}
            >
                {/* White center */}
                <div
                    style={{
                        width: 90,
                        height: 90,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, white 0%, #e5e5e5 100%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <span
                        style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#374151",
                            fontFamily: "Inter, sans-serif",
                        }}
                    >
                        {ballInfo.letter}
                    </span>
                    <span
                        style={{
                            fontSize: 36,
                            fontWeight: 800,
                            color: "#1F2937",
                            fontFamily: "Inter, sans-serif",
                            lineHeight: 1,
                        }}
                    >
                        {number}
                    </span>
                </div>
            </div>
        </div>
    );
};

// "On your card!" indicator
const OnCardIndicator = ({ isOnCard }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (!isOnCard) return null;

    const appear = spring({
        frame: frame - 25,
        fps,
        config: { damping: 10, stiffness: 150 },
    });

    const pulse = 1 + Math.sin(frame * 0.5) * 0.05;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "65%",
                transform: `translate(-50%, 0) scale(${appear * pulse})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    background: "linear-gradient(135deg, #10B981 0%, #047857 100%)",
                    borderRadius: 16,
                    padding: "10px 24px",
                    border: "2px solid #34D399",
                    boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
                }}
            >
                <span
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "white",
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    ✓ ON YOUR CARD!
                </span>
            </div>
        </div>
    );
};

// Sparkle particles
const Sparkles = ({ isOnCard }) => {
    const frame = useCurrentFrame();

    if (!isOnCard) return null;

    const sparkles = Array.from({ length: 15 }, (_, i) => {
        const delay = 25 + i * 2;
        const sparkleFrame = frame - delay;
        if (sparkleFrame < 0 || sparkleFrame > 30) return null;

        const angle = (i / 15) * 360;
        const distance = 80 + i * 8;
        const x = Math.cos((angle * Math.PI) / 180) * distance * (sparkleFrame / 20);
        const y = Math.sin((angle * Math.PI) / 180) * distance * (sparkleFrame / 20);

        const opacity = interpolate(sparkleFrame, [0, 10, 30], [0, 1, 0], {
            extrapolateRight: "clamp",
        });

        const rotation = sparkleFrame * 10;

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "40%",
                    transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
                    fontSize: 16 + (i % 3) * 4,
                    opacity,
                }}
            >
                ✨
            </div>
        );
    });

    return <>{sparkles}</>;
};

// Main Number Called composition
export const NumberCalled = ({ number = 42, isOnCard = true }) => {
    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Subtle radial glow */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                }}
            />

            {/* Sparkles (if on card) */}
            <Sparkles isOnCard={isOnCard} />

            {/* Main ball */}
            <BingoBall number={number} />

            {/* On card indicator */}
            <OnCardIndicator isOnCard={isOnCard} />
        </AbsoluteFill>
    );
};

export default NumberCalled;
