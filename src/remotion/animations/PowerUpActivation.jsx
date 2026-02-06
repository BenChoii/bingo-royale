import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Speed lines for Quick Daub
const SpeedLines = () => {
    const frame = useCurrentFrame();

    const lines = Array.from({ length: 20 }, (_, i) => ({
        angle: (i / 20) * 360,
        length: 100 + Math.random() * 200,
        width: 2 + Math.random() * 3,
        delay: i * 0.5,
    }));

    return (
        <>
            {lines.map((line, i) => {
                const lineFrame = frame - line.delay;
                if (lineFrame < 0) return null;

                const progress = interpolate(lineFrame, [0, 15], [0, 1], {
                    extrapolateRight: "clamp",
                });
                const opacity = interpolate(lineFrame, [0, 5, 15], [0, 0.8, 0], {
                    extrapolateRight: "clamp",
                });

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: line.length * progress,
                            height: line.width,
                            background: "linear-gradient(90deg, transparent, #3B82F6, transparent)",
                            transform: `rotate(${line.angle}deg) translateX(50px)`,
                            transformOrigin: "left center",
                            opacity,
                        }}
                    />
                );
            })}
        </>
    );
};

// Rainbow shimmer for Wild Card
const RainbowShimmer = () => {
    const frame = useCurrentFrame();

    const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
    const shimmerX = interpolate(frame, [0, 30], [-100, 200], {
        extrapolateRight: "clamp",
    });

    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(135deg, ${colors.join(", ")})`,
                opacity: 0.3,
                maskImage: `linear-gradient(135deg, transparent ${shimmerX - 50}%, white ${shimmerX}%, transparent ${shimmerX + 50}%)`,
                WebkitMaskImage: `linear-gradient(135deg, transparent ${shimmerX - 50}%, white ${shimmerX}%, transparent ${shimmerX + 50}%)`,
            }}
        />
    );
};

// Ice crystals for Freeze
const IceCrystals = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const crystals = Array.from({ length: 30 }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        delay: i * 1,
        size: 15 + Math.random() * 25,
        rotation: Math.random() * 360,
    }));

    return (
        <>
            {crystals.map((crystal, i) => {
                const crystalFrame = frame - crystal.delay;
                if (crystalFrame < 0) return null;

                const scale = spring({
                    frame: crystalFrame,
                    fps,
                    config: { damping: 12, stiffness: 150 },
                });

                const opacity = interpolate(crystalFrame, [0, 10, 25, 35], [0, 1, 1, 0], {
                    extrapolateRight: "clamp",
                });

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: crystal.x,
                            top: crystal.y,
                            fontSize: crystal.size,
                            transform: `scale(${scale}) rotate(${crystal.rotation}deg)`,
                            opacity,
                            filter: "drop-shadow(0 0 8px rgba(147, 197, 253, 0.8))",
                        }}
                    >
                        ❄️
                    </div>
                );
            })}
            {/* Ice overlay */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle, rgba(147, 197, 253, 0.2) 0%, transparent 70%)",
                    opacity: interpolate(frame, [0, 10, 30], [0, 0.5, 0], {
                        extrapolateRight: "clamp",
                    }),
                }}
            />
        </>
    );
};

// Shield bubble for Shield power-up
const ShieldBubble = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const expand = spring({
        frame,
        fps,
        config: { damping: 10, stiffness: 80 },
    });

    const scale = interpolate(expand, [0, 1], [0.3, 1]);
    const opacity = interpolate(frame, [0, 10, 35, 45], [0, 0.7, 0.7, 0], {
        extrapolateRight: "clamp",
    });

    // Shimmer ring
    const ringRotation = frame * 3;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) scale(${scale})`,
            }}
        >
            {/* Main bubble */}
            <div
                style={{
                    width: 300,
                    height: 300,
                    borderRadius: "50%",
                    border: "4px solid rgba(139, 92, 246, 0.6)",
                    background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.3) 100%)",
                    opacity,
                    boxShadow: "0 0 40px rgba(139, 92, 246, 0.5), inset 0 0 60px rgba(139, 92, 246, 0.2)",
                }}
            />
            {/* Rotating ring */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 280,
                    height: 280,
                    borderRadius: "50%",
                    border: "2px dashed rgba(139, 92, 246, 0.5)",
                    transform: `translate(-50%, -50%) rotate(${ringRotation}deg)`,
                    opacity: opacity * 0.7,
                }}
            />
        </div>
    );
};

// Power-up icon pop
const PowerUpIcon = ({ emoji, color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const pop = spring({
        frame,
        fps,
        config: { damping: 8, stiffness: 200 },
    });

    const shake = frame < 20 ? Math.sin(frame * 1.5) * 5 : 0;
    const glow = 20 + Math.sin(frame * 0.4) * 10;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "35%",
                transform: `translate(-50%, -50%) scale(${pop}) rotate(${shake}deg)`,
                fontSize: 80,
                filter: `drop-shadow(0 0 ${glow}px ${color})`,
            }}
        >
            {emoji}
        </div>
    );
};

// Power-up name text
const PowerUpText = ({ name, color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 10,
        fps,
        config: { damping: 12 },
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "55%",
                transform: `translate(-50%, -50%) scale(${appear})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "white",
                    fontFamily: "Inter, sans-serif",
                    textShadow: `0 0 20px ${color}, 0 4px 10px rgba(0,0,0,0.5)`,
                    letterSpacing: 3,
                }}
            >
                {name}
            </div>
        </div>
    );
};

// Main Power-Up Activation composition
export const PowerUpActivation = ({ type = "quickdaub" }) => {
    const configs = {
        quickdaub: {
            emoji: "⚡",
            name: "QUICK DAUB",
            color: "#3B82F6",
            Effect: SpeedLines,
        },
        wild: {
            emoji: "🌈",
            name: "WILD CARD",
            color: "#8B5CF6",
            Effect: RainbowShimmer,
        },
        freeze: {
            emoji: "❄️",
            name: "FREEZE",
            color: "#93C5FD",
            Effect: IceCrystals,
        },
        shield: {
            emoji: "🛡️",
            name: "SHIELD",
            color: "#8B5CF6",
            Effect: ShieldBubble,
        },
    };

    const config = configs[type] || configs.quickdaub;
    const { emoji, name, color, Effect } = config;

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Effect layer */}
            <Effect />

            {/* Icon */}
            <PowerUpIcon emoji={emoji} color={color} />

            {/* Text */}
            <PowerUpText name={name} color={color} />
        </AbsoluteFill>
    );
};

export default PowerUpActivation;
