import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Sequence,
    AbsoluteFill,
} from "remotion";

// Bingo ball component
const BingoBall = ({ number, color, delay, xOffset, yOffset }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Ball drops in
    const dropProgress = spring({
        frame: frame - delay,
        fps,
        config: { damping: 12, stiffness: 100 },
    });

    // Bounce effect
    const bounce = Math.sin((frame - delay) * 0.3) * Math.max(0, 5 - (frame - delay) * 0.1);

    // Rotation
    const rotation = interpolate(frame - delay, [0, 30], [0, 360], {
        extrapolateRight: "clamp",
    });

    const y = interpolate(dropProgress, [0, 1], [-200, yOffset + bounce]);
    const opacity = frame > delay ? 1 : 0;

    return (
        <div
            style={{
                position: "absolute",
                left: `calc(50% + ${xOffset}px)`,
                top: y,
                transform: `translateX(-50%) rotate(${rotation}deg)`,
                opacity,
            }}
        >
            <div
                style={{
                    width: 70,
                    height: 70,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 30% 30%, ${color}, ${color}88)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5), inset 0 -5px 15px rgba(0,0,0,0.3)",
                    border: "3px solid rgba(255,255,255,0.4)",
                }}
            >
                <span
                    style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: "white",
                        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    {number}
                </span>
            </div>
        </div>
    );
};

// Crown component
const Crown = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Crown drops from above
    const crownDrop = spring({
        frame: frame - 20,
        fps,
        config: { damping: 10, stiffness: 80 },
    });

    const crownY = interpolate(crownDrop, [0, 1], [-150, 0]);
    const crownScale = interpolate(crownDrop, [0, 1], [0.5, 1]);

    // Shimmer effect
    const shimmer = Math.sin(frame * 0.2) * 5;

    return (
        <div
            style={{
                fontSize: 120,
                transform: `translateY(${crownY}px) scale(${crownScale})`,
                filter: `drop-shadow(0 0 ${20 + shimmer}px rgba(255, 215, 0, 0.8))`,
                textShadow: `0 0 30px rgba(255, 215, 0, 0.6)`,
            }}
        >
            👑
        </div>
    );
};

// Title text
const Title = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const letters = "BINGO ROYALE".split("");

    return (
        <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
            {letters.map((char, i) => {
                const letterFrame = frame - 35 - i * 2;
                const letterSpring = spring({
                    frame: letterFrame,
                    fps,
                    config: { damping: 15 },
                });

                const y = interpolate(letterSpring, [0, 1], [50, 0]);
                const opacity = letterSpring;

                return (
                    <span
                        key={i}
                        style={{
                            fontSize: 60,
                            fontWeight: 800,
                            color: char === " " ? "transparent" : "white",
                            fontFamily: "Inter, sans-serif",
                            transform: `translateY(${y}px)`,
                            opacity,
                            textShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 40px rgba(139, 92, 246, 0.5)",
                            letterSpacing: 4,
                            minWidth: char === " " ? 20 : "auto",
                        }}
                    >
                        {char}
                    </span>
                );
            })}
        </div>
    );
};

// Sparkle particles
const Sparkle = ({ delay, x, y }) => {
    const frame = useCurrentFrame();

    const sparkleFrame = frame - delay;
    if (sparkleFrame < 0) return null;

    const size = interpolate(sparkleFrame, [0, 10, 20], [0, 8, 0], {
        extrapolateRight: "clamp",
    });
    const opacity = interpolate(sparkleFrame, [0, 10, 20], [0, 1, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                width: size,
                height: size,
                borderRadius: "50%",
                background: "white",
                opacity,
                boxShadow: "0 0 10px white",
            }}
        />
    );
};

// Main intro composition
export const BingoIntro = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // Background fade in
    const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: "clamp",
    });

    // Final flash before transition
    const flashOpacity = interpolate(frame, [80, 85, 90], [0, 0.8, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    const balls = [
        { number: "B", color: "#3B82F6", delay: 5, xOffset: -180, yOffset: 200 },
        { number: "I", color: "#8B5CF6", delay: 10, xOffset: -90, yOffset: 180 },
        { number: "N", color: "#EC4899", delay: 15, xOffset: 0, yOffset: 200 },
        { number: "G", color: "#F59E0B", delay: 20, xOffset: 90, yOffset: 180 },
        { number: "O", color: "#10B981", delay: 25, xOffset: 180, yOffset: 200 },
    ];

    const sparkles = Array.from({ length: 20 }, (_, i) => ({
        delay: 40 + i * 3,
        x: Math.random() * width,
        y: Math.random() * height,
    }));

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(135deg, #0f0a1a 0%, #1a0a2e 50%, #0a1a1a 100%)",
                opacity: bgOpacity,
            }}
        >
            {/* Ambient glow */}
            <div
                style={{
                    position: "absolute",
                    top: "30%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 600,
                    height: 600,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
            />

            {/* Bingo balls */}
            {balls.map((ball, i) => (
                <BingoBall key={i} {...ball} />
            ))}

            {/* Center content */}
            <div
                style={{
                    position: "absolute",
                    top: "35%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Crown />
                <Title />
            </div>

            {/* Sparkles */}
            {sparkles.map((sparkle, i) => (
                <Sparkle key={i} {...sparkle} />
            ))}

            {/* Flash overlay */}
            <AbsoluteFill
                style={{
                    background: "white",
                    opacity: flashOpacity,
                }}
            />
        </AbsoluteFill>
    );
};

export default BingoIntro;
