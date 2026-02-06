import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Crop burst particle
const CropParticle = ({ emoji, delay, angle, distance }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const particleFrame = frame - delay;
    if (particleFrame < 0) return null;

    const burst = spring({
        frame: particleFrame,
        fps,
        config: { damping: 15, stiffness: 120 },
    });

    // Burst outward then gravity
    const x = Math.cos((angle * Math.PI) / 180) * distance * burst;
    const y = Math.sin((angle * Math.PI) / 180) * distance * burst + Math.pow(particleFrame * 0.08, 2) * 5;

    const rotation = particleFrame * (angle > 180 ? -8 : 8);
    const scale = interpolate(particleFrame, [0, 10, 40], [0.5, 1.2, 0.3], {
        extrapolateRight: "clamp",
    });
    const opacity = interpolate(particleFrame, [0, 10, 35, 45], [0, 1, 1, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "40%",
                transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
                opacity,
                fontSize: 32,
            }}
        >
            {emoji}
        </div>
    );
};

// Gem fly up and accumulate
const GemFlyUp = ({ delay, startX, gems }) => {
    const frame = useCurrentFrame();
    const { fps, height } = useVideoConfig();

    const gemFrame = frame - delay;
    if (gemFrame < 0) return null;

    const rise = spring({
        frame: gemFrame,
        fps,
        config: { damping: 12, stiffness: 80 },
    });

    // Start from crop position, fly to top
    const y = interpolate(rise, [0, 1], [height * 0.4, height * 0.15]);
    const x = interpolate(rise, [0, 1], [startX, 50]);
    const scale = interpolate(gemFrame, [0, 15, 25], [0.5, 1.2, 1], {
        extrapolateRight: "clamp",
    });

    const opacity = gemFrame > 0 ? 1 : 0;

    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `scale(${scale})`,
                opacity,
                display: "flex",
                alignItems: "center",
                gap: 4,
            }}
        >
            <span style={{ fontSize: 28 }}>💎</span>
            <span
                style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#10B981",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
            >
                +{gems}
            </span>
        </div>
    );
};

// XP bar pulse
const XPBarPulse = ({ xpGained }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 15,
        fps,
        config: { damping: 15 },
    });

    const pulse = 1 + Math.sin(frame * 0.3) * 0.05;
    const fillProgress = interpolate(frame, [20, 50], [0.3, 0.6], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                bottom: "18%",
                left: "50%",
                transform: `translateX(-50%) scale(${appear * pulse})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: 12,
                    padding: "12px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <span
                    style={{
                        color: "#A3E635",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    +{xpGained} XP
                </span>
                <div
                    style={{
                        width: 150,
                        height: 8,
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 4,
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${fillProgress * 100}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #84CC16, #A3E635)",
                            transition: "width 0.3s ease",
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

// Combo badge
const ComboBadge = ({ count }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (count <= 1) return null;

    const pop = spring({
        frame: frame - 25,
        fps,
        config: { damping: 8, stiffness: 200 },
    });

    const shake = Math.sin(frame * 0.5) * 3;

    return (
        <div
            style={{
                position: "absolute",
                top: "28%",
                right: "20%",
                transform: `scale(${pop}) rotate(${shake}deg)`,
            }}
        >
            <div
                style={{
                    background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                    borderRadius: 12,
                    padding: "8px 16px",
                    boxShadow: "0 4px 20px rgba(245, 158, 11, 0.5)",
                }}
            >
                <span
                    style={{
                        color: "white",
                        fontSize: 20,
                        fontWeight: 800,
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    COMBO x{count}!
                </span>
            </div>
        </div>
    );
};

// Main Harvest Celebration composition
export const HarvestCelebration = ({
    cropEmoji = "🥕",
    gemsEarned = 21,
    xpGained = 15,
    harvestCount = 3,
}) => {
    const frame = useCurrentFrame();
    const { width } = useVideoConfig();

    // Create particles for each harvested crop
    const particles = [];
    for (let crop = 0; crop < Math.min(harvestCount, 6); crop++) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                emoji: cropEmoji,
                delay: crop * 5 + i * 0.5,
                angle: i * 45 + crop * 15,
                distance: 60 + Math.random() * 40,
            });
        }
    }

    // Add gem fly ups
    const gemFlyUps = Array.from({ length: Math.min(harvestCount, 4) }, (_, i) => ({
        delay: 10 + i * 8,
        startX: width * 0.3 + i * (width * 0.1),
        gems: Math.floor(gemsEarned / harvestCount),
    }));

    // Background flash
    const flashOpacity = interpolate(frame, [0, 5, 12], [0.5, 0.2, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Harvest flash */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle, rgba(132, 204, 22, 0.4) 0%, transparent 70%)",
                    opacity: flashOpacity,
                }}
            />

            {/* Crop particles burst */}
            {particles.map((p, i) => (
                <CropParticle key={i} {...p} />
            ))}

            {/* Gems flying up */}
            {gemFlyUps.map((g, i) => (
                <GemFlyUp key={i} {...g} />
            ))}

            {/* XP gain */}
            <XPBarPulse xpGained={xpGained} />

            {/* Combo badge */}
            <ComboBadge count={harvestCount} />
        </AbsoluteFill>
    );
};

export default HarvestCelebration;
