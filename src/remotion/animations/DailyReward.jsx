import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Treasure chest
const TreasureChest = ({ isOpen }) => {
    const frame = useCurrentFrame();

    // Shake before opening
    const shakeIntensity = !isOpen && frame < 30 ? Math.sin(frame * 2) * (3 + frame * 0.1) : 0;

    // Glow increases
    const glow = interpolate(frame, [0, 30], [10, 40], {
        extrapolateRight: "clamp",
    });

    // Scale pop when opening
    const scale = isOpen ? 1.1 : 1 + Math.sin(frame * 0.5) * 0.02;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "40%",
                transform: `translate(-50%, 0) translateX(${shakeIntensity}px) scale(${scale})`,
                fontSize: 100,
                filter: `drop-shadow(0 0 ${glow}px rgba(255, 215, 0, 0.6))`,
            }}
        >
            {isOpen ? "🎁" : "📦"}
        </div>
    );
};

// Light beam burst
const LightBeam = () => {
    const frame = useCurrentFrame();

    const beamStart = 30;
    const beamFrame = frame - beamStart;
    if (beamFrame < 0) return null;

    const scale = interpolate(beamFrame, [0, 15], [0, 2], {
        extrapolateRight: "clamp",
    });

    const opacity = interpolate(beamFrame, [0, 10, 25], [0, 0.9, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "40%",
                width: 200,
                height: 400,
                background: "linear-gradient(to top, rgba(255,255,200,0.9) 0%, transparent 100%)",
                transform: `translate(-50%, -100%) scaleX(${scale})`,
                opacity,
                transformOrigin: "bottom center",
            }}
        />
    );
};

// Floating reward item
const RewardItem = ({ emoji, label, value, delay, index }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const itemFrame = frame - delay;
    if (itemFrame < 0) return null;

    const float = spring({
        frame: itemFrame,
        fps,
        config: { damping: 15, stiffness: 100 },
    });

    const y = interpolate(float, [0, 1], [50, 0]);
    const opacity = float;

    // Small bounce
    const bounce = itemFrame > 15 ? Math.sin((itemFrame - 15) * 0.3) * 3 : 0;

    // Position based on index
    const xOffset = (index - 1) * 100;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: `translateX(${xOffset}px) translateY(${y + bounce}px)`,
                opacity,
            }}
        >
            {/* Item */}
            <div
                style={{
                    width: 70,
                    height: 70,
                    borderRadius: 16,
                    background: "rgba(0,0,0,0.5)",
                    border: "2px solid rgba(255, 215, 0, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    boxShadow: "0 0 15px rgba(255, 215, 0, 0.3)",
                }}
            >
                {emoji}
            </div>
            {/* Label */}
            <div
                style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                {label}
            </div>
            {/* Value */}
            <div
                style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#FCD34D",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                +{value}
            </div>
        </div>
    );
};

// Streak bonus badge
const StreakBadge = ({ streak }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 60,
        fps,
        config: { damping: 10, stiffness: 150 },
    });

    const pulse = 1 + Math.sin(frame * 0.4) * 0.05;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "18%",
                transform: `translate(-50%, 0) scale(${appear * pulse})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
                    borderRadius: 24,
                    padding: "8px 24px",
                    border: "2px solid #FCD34D",
                    boxShadow: "0 0 20px rgba(245, 158, 11, 0.5)",
                }}
            >
                <span
                    style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "white",
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    🔥 {streak} Day Streak!
                </span>
            </div>
        </div>
    );
};

// Title text
const DailyTitle = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 35,
        fps,
        config: { damping: 12 },
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "28%",
                transform: `translate(-50%, 0) scale(${appear})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#FCD34D",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 0 20px rgba(255, 215, 0, 0.5), 0 4px 15px rgba(0,0,0,0.5)",
                }}
            >
                DAILY REWARD!
            </div>
        </div>
    );
};

// Main Daily Reward composition
export const DailyReward = ({
    rewards = [
        { emoji: "💎", label: "Gems", value: 50 },
        { emoji: "⭐", label: "XP", value: 100 },
        { emoji: "🎫", label: "Tickets", value: 1 },
    ],
    streak = 5,
}) => {
    const frame = useCurrentFrame();
    const isOpen = frame >= 30;

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Warm glow background */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at 50% 40%, rgba(255, 215, 0, 0.15) 0%, transparent 60%)",
                }}
            />

            {/* Light beam */}
            <LightBeam />

            {/* Treasure chest */}
            <TreasureChest isOpen={isOpen} />

            {/* Title */}
            <DailyTitle />

            {/* Streak badge */}
            <StreakBadge streak={streak} />

            {/* Floating rewards */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "60%",
                    transform: "translate(-50%, 0)",
                    display: "flex",
                    gap: 20,
                }}
            >
                {rewards.slice(0, 3).map((reward, i) => (
                    <RewardItem
                        key={i}
                        emoji={reward.emoji}
                        label={reward.label}
                        value={reward.value}
                        delay={40 + i * 10}
                        index={i}
                    />
                ))}
            </div>
        </AbsoluteFill>
    );
};

export default DailyReward;
