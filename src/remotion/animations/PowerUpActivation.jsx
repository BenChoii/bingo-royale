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

// Peek eye rays effect
const PeekEyeRays = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const rays = Array.from({ length: 8 }, (_, i) => ({
        angle: (i / 8) * 360,
        delay: i * 2,
    }));

    const pulse = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 100 },
    });

    return (
        <>
            {/* Central eye glow */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 150 * pulse,
                    height: 150 * pulse,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%)",
                    transform: "translate(-50%, -50%)",
                }}
            />
            {/* Rays */}
            {rays.map((ray, i) => {
                const rayFrame = frame - ray.delay;
                if (rayFrame < 0) return null;

                const length = interpolate(rayFrame, [0, 20], [0, 120], {
                    extrapolateRight: "clamp",
                });
                const opacity = interpolate(rayFrame, [0, 10, 30, 40], [0, 0.8, 0.8, 0], {
                    extrapolateRight: "clamp",
                });

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: length,
                            height: 4,
                            background: "linear-gradient(90deg, #F59E0B, transparent)",
                            transform: `rotate(${ray.angle}deg) translateX(40px)`,
                            transformOrigin: "left center",
                            opacity,
                        }}
                    />
                );
            })}
        </>
    );
};

// Sabotage warning sparks
const SabotageWarning = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const sparks = Array.from({ length: 15 }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        delay: i * 2,
        size: 20 + Math.random() * 20,
    }));

    // Flash effect
    const flashOpacity = interpolate(frame, [5, 10, 15], [0, 0.3, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <>
            {/* Red flash */}
            <AbsoluteFill
                style={{
                    background: "rgba(239, 68, 68, 0.3)",
                    opacity: flashOpacity,
                }}
            />
            {/* Warning sparks */}
            {sparks.map((spark, i) => {
                const sparkFrame = frame - spark.delay;
                if (sparkFrame < 0) return null;

                const scale = spring({
                    frame: sparkFrame,
                    fps,
                    config: { damping: 10, stiffness: 200 },
                });

                const opacity = interpolate(sparkFrame, [0, 8, 25, 35], [0, 1, 1, 0], {
                    extrapolateRight: "clamp",
                });

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: spark.x,
                            top: spark.y,
                            fontSize: spark.size,
                            transform: `scale(${scale})`,
                            opacity,
                        }}
                    >
                        ⚠️
                    </div>
                );
            })}
        </>
    );
};

// Swap card exchange effect
const SwapCards = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const swap = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 100 },
    });

    const leftX = interpolate(swap, [0, 1], [-80, 80]);
    const rightX = interpolate(swap, [0, 1], [80, -80]);
    const rotation = interpolate(swap, [0, 1], [0, 360]);

    const opacity = interpolate(frame, [0, 10, 35, 45], [0, 1, 1, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <>
            {/* Left card */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "45%",
                    width: 60,
                    height: 80,
                    background: "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)",
                    borderRadius: 8,
                    border: "3px solid white",
                    transform: `translate(${leftX}px, -50%) rotate(${rotation}deg)`,
                    opacity,
                    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5)",
                }}
            />
            {/* Right card */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "45%",
                    width: 60,
                    height: 80,
                    background: "linear-gradient(135deg, #EF4444 0%, #991B1B 100%)",
                    borderRadius: 8,
                    border: "3px solid white",
                    transform: `translate(${rightX}px, -50%) rotate(${-rotation}deg)`,
                    opacity,
                    boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5)",
                }}
            />
            {/* Swap arrows */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "45%",
                    transform: "translate(-50%, -50%)",
                    fontSize: 40,
                    opacity: opacity * 0.8,
                }}
            >
                🔄
            </div>
        </>
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
        peek: {
            emoji: "👁️",
            name: "PEEK",
            color: "#F59E0B",
            Effect: PeekEyeRays,
        },
        sabotage: {
            emoji: "⚠️",
            name: "SABOTAGE",
            color: "#EF4444",
            Effect: SabotageWarning,
        },
        swap: {
            emoji: "🔄",
            name: "SWAP CARDS",
            color: "#10B981",
            Effect: SwapCards,
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
