import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Level badge with glow
const LevelBadge = ({ level }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const pop = spring({
        frame,
        fps,
        config: { damping: 6, stiffness: 150 },
    });

    const scale = interpolate(pop, [0, 1], [0.3, 1]);

    // Pulsing glow
    const glowSize = 20 + Math.sin(frame * 0.3) * 10;
    const shimmer = 1 + Math.sin(frame * 0.4) * 0.05;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "25%",
                transform: `translate(-50%, 0) scale(${scale * shimmer})`,
            }}
        >
            {/* Glow ring */}
            <div
                style={{
                    width: 150,
                    height: 150,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, rgba(132, 204, 22, 0.4) 0%, transparent 70%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    filter: `drop-shadow(0 0 ${glowSize}px rgba(132, 204, 22, 0.6))`,
                }}
            >
                {/* Badge */}
                <div
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #84CC16 0%, #65A30D 100%)",
                        border: "4px solid #A3E635",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 30px rgba(132, 204, 22, 0.5), inset 0 -4px 10px rgba(0,0,0,0.2)",
                    }}
                >
                    <span
                        style={{
                            fontSize: 16,
                            color: "rgba(255,255,255,0.9)",
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 600,
                        }}
                    >
                        LEVEL
                    </span>
                    <span
                        style={{
                            fontSize: 48,
                            fontWeight: 800,
                            color: "white",
                            fontFamily: "Inter, sans-serif",
                            textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                            lineHeight: 1,
                        }}
                    >
                        {level}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Firework burst
const Firework = ({ delay, x, y, color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const fwFrame = frame - delay;
    if (fwFrame < 0) return null;

    // Multiple particles per firework
    const particles = Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * 360;
        const burst = spring({
            frame: fwFrame,
            fps,
            config: { damping: 15, stiffness: 80 },
        });

        const distance = 40 + Math.random() * 30;
        const px = Math.cos((angle * Math.PI) / 180) * distance * burst;
        const py = Math.sin((angle * Math.PI) / 180) * distance * burst;

        const opacity = interpolate(fwFrame, [0, 10, 30], [0, 1, 0], {
            extrapolateRight: "clamp",
        });

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    left: px,
                    top: py,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: color,
                    opacity,
                    boxShadow: `0 0 8px ${color}`,
                }}
            />
        );
    });

    return (
        <div
            style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
            }}
        >
            {particles}
        </div>
    );
};

// Unlock showcase item
const UnlockItem = ({ emoji, name, delay, index }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - delay,
        fps,
        config: { damping: 10, stiffness: 150 },
    });

    const x = (index - 1) * 100; // Center the 3 items

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                transform: `translateX(${x}px) scale(${appear})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.4)",
                    border: "2px solid rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                }}
            >
                {emoji}
            </div>
            <span
                style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                }}
            >
                {name}
            </span>
        </div>
    );
};

// "Level X Farmer!" title
const FarmerTitle = ({ level }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 25,
        fps,
        config: { damping: 10, stiffness: 120 },
    });

    const shimmer = 1 + Math.sin(frame * 0.5) * 0.03;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "52%",
                transform: `translate(-50%, 0) scale(${appear * shimmer})`,
                opacity: appear,
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: "#A3E635",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 0 20px rgba(163, 230, 53, 0.5), 0 2px 10px rgba(0,0,0,0.5)",
                }}
            >
                Level {level} Farmer!
            </div>
            <div
                style={{
                    fontSize: 16,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "Inter, sans-serif",
                    marginTop: 8,
                }}
            >
                New items unlocked!
            </div>
        </div>
    );
};

// Main Farm Level Up composition
export const FarmLevelUp = ({
    level = 5,
    unlocks = [
        { emoji: "🌽", name: "Corn" },
        { emoji: "🐷", name: "Pig" },
        { emoji: "🏠", name: "Plot" },
    ]
}) => {
    // Fireworks
    const fireworkColors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"];
    const fireworks = [
        { delay: 10, x: 20, y: 30, color: fireworkColors[0] },
        { delay: 15, x: 80, y: 25, color: fireworkColors[1] },
        { delay: 20, x: 30, y: 70, color: fireworkColors[2] },
        { delay: 25, x: 70, y: 65, color: fireworkColors[3] },
        { delay: 30, x: 50, y: 80, color: fireworkColors[4] },
        { delay: 35, x: 15, y: 55, color: fireworkColors[0] },
        { delay: 40, x: 85, y: 50, color: fireworkColors[1] },
    ];

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Celebratory overlay */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at 50% 30%, rgba(132, 204, 22, 0.15) 0%, transparent 60%)",
                }}
            />

            {/* Fireworks */}
            {fireworks.map((fw, i) => (
                <Firework key={i} {...fw} />
            ))}

            {/* Level badge */}
            <LevelBadge level={level} />

            {/* Title */}
            <FarmerTitle level={level} />

            {/* Unlock showcase */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "72%",
                    transform: "translate(-50%, 0)",
                    display: "flex",
                    gap: 20,
                }}
            >
                {unlocks.slice(0, 3).map((item, i) => (
                    <UnlockItem
                        key={i}
                        emoji={item.emoji}
                        name={item.name}
                        delay={40 + i * 8}
                        index={i}
                    />
                ))}
            </div>
        </AbsoluteFill>
    );
};

export default FarmLevelUp;
