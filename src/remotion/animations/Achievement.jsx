import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Achievement banner
const AchievementBanner = ({ title, description, icon }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Slide in from top
    const slide = spring({
        frame,
        fps,
        config: { damping: 15, stiffness: 120 },
    });

    const y = interpolate(slide, [0, 1], [-150, 0]);

    // Glow pulse
    const glow = 15 + Math.sin(frame * 0.4) * 8;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "20%",
                transform: `translate(-50%, ${y}px)`,
            }}
        >
            <div
                style={{
                    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(109, 40, 217, 0.9) 100%)",
                    borderRadius: 20,
                    padding: "20px 32px",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    border: "3px solid rgba(167, 139, 250, 0.6)",
                    boxShadow: `0 8px 40px rgba(139, 92, 246, 0.4), 0 0 ${glow}px rgba(139, 92, 246, 0.6)`,
                    minWidth: 320,
                }}
            >
                {/* Icon */}
                <div
                    style={{
                        width: 70,
                        height: 70,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 36,
                        border: "2px solid rgba(255,255,255,0.3)",
                    }}
                >
                    {icon}
                </div>
                {/* Text */}
                <div>
                    <div
                        style={{
                            fontSize: 14,
                            color: "rgba(255,255,255,0.8)",
                            fontFamily: "Inter, sans-serif",
                            marginBottom: 4,
                        }}
                    >
                        🏆 ACHIEVEMENT UNLOCKED
                    </div>
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: "white",
                            fontFamily: "Inter, sans-serif",
                        }}
                    >
                        {title}
                    </div>
                    <div
                        style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.7)",
                            fontFamily: "Inter, sans-serif",
                            marginTop: 4,
                        }}
                    >
                        {description}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Star burst behind icon
const StarBurst = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const burst = spring({
        frame: frame - 10,
        fps,
        config: { damping: 15, stiffness: 100 },
    });

    const stars = Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * 360;
        const distance = 100 * burst;
        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;

        const opacity = interpolate(frame, [10, 30, 60], [0, 1, 0], {
            extrapolateRight: "clamp",
        });

        const rotation = frame * 2;

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "25%",
                    transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
                    fontSize: 16,
                    opacity,
                    color: "#FCD34D",
                }}
            >
                ⭐
            </div>
        );
    });

    return <>{stars}</>;
};

// Shimmer effect
const Shimmer = () => {
    const frame = useCurrentFrame();

    const shimmerX = interpolate(frame, [20, 60], [-100, 400], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    const opacity = interpolate(frame, [20, 30, 50, 60], [0, 0.8, 0.8, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "20%",
                width: 320,
                height: 120,
                transform: "translate(-50%, 0)",
                overflow: "hidden",
                borderRadius: 20,
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: shimmerX,
                    top: 0,
                    width: 80,
                    height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                    transform: "skewX(-20deg)",
                    opacity,
                }}
            />
        </div>
    );
};

// Reward display
const RewardDisplay = ({ reward }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 40,
        fps,
        config: { damping: 10, stiffness: 150 },
    });

    if (!reward) return null;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "55%",
                transform: `translate(-50%, 0) scale(${appear})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: 16,
                    padding: "12px 24px",
                    border: "2px solid rgba(255, 215, 0, 0.4)",
                }}
            >
                <span
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#FCD34D",
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    {reward}
                </span>
            </div>
        </div>
    );
};

// Main Achievement composition
export const Achievement = ({
    title = "First Steps",
    description = "Complete your first bingo game",
    icon = "🎯",
    reward = "+50 💎",
}) => {
    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Purple glow */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at 50% 25%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)",
                }}
            />

            {/* Star burst */}
            <StarBurst />

            {/* Banner */}
            <AchievementBanner title={title} description={description} icon={icon} />

            {/* Shimmer */}
            <Shimmer />

            {/* Reward */}
            <RewardDisplay reward={reward} />
        </AbsoluteFill>
    );
};

export default Achievement;
