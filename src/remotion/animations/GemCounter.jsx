import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Gem icon with glow
const GemIcon = () => {
    const frame = useCurrentFrame();

    const pulse = 1 + Math.sin(frame * 0.4) * 0.1;
    const glow = 15 + Math.sin(frame * 0.3) * 8;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "30%",
                transform: `translate(-50%, 0) scale(${pulse})`,
                fontSize: 80,
                filter: `drop-shadow(0 0 ${glow}px rgba(96, 165, 250, 0.6))`,
            }}
        >
            💎
        </div>
    );
};

// Rolling counter
const RollingCounter = ({ from, to }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const roll = spring({
        frame,
        fps,
        config: { damping: 25, stiffness: 80 },
    });

    const currentValue = Math.round(interpolate(roll, [0, 1], [from, to]));

    // Scale pop at end
    const pop = to > from && frame > 30 ? 1 + Math.sin((frame - 30) * 0.3) * 0.05 : 1;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "52%",
                transform: `translate(-50%, 0) scale(${pop})`,
                fontSize: 48,
                fontWeight: 800,
                color: "#60A5FA",
                fontFamily: "Inter, sans-serif",
                textShadow: "0 0 20px rgba(96, 165, 250, 0.5), 0 4px 15px rgba(0,0,0,0.5)",
            }}
        >
            {currentValue.toLocaleString()}
        </div>
    );
};

// Change amount popup
const ChangeAmount = ({ amount, isGain }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 10,
        fps,
        config: { damping: 12 },
    });

    const float = interpolate(frame, [10, 60], [0, -40], {
        extrapolateRight: "clamp",
    });

    const color = isGain ? "#10B981" : "#EF4444";
    const prefix = isGain ? "+" : "";

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "68%",
                transform: `translate(-50%, ${float}px) scale(${appear})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color,
                    fontFamily: "Inter, sans-serif",
                    textShadow: `0 0 15px ${color}80, 0 2px 8px rgba(0,0,0,0.5)`,
                }}
            >
                {prefix}{amount.toLocaleString()} 💎
            </div>
        </div>
    );
};

// Flying gems for gain
const FlyingGems = ({ count, isGain }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (!isGain) return null;

    const gems = Array.from({ length: Math.min(count, 15) }, (_, i) => {
        const delay = 5 + i * 3;
        const gemFrame = frame - delay;
        if (gemFrame < 0) return null;

        const fly = spring({
            frame: gemFrame,
            fps,
            config: { damping: 15, stiffness: 100 },
        });

        // Start from edges, fly to center
        const startX = (i % 2 === 0 ? -150 : 150) + (Math.random() - 0.5) * 50;
        const startY = 200 + Math.random() * 100;
        const x = interpolate(fly, [0, 1], [startX, 0]);
        const y = interpolate(fly, [0, 1], [startY, 0]);

        const opacity = interpolate(gemFrame, [0, 10, 25, 35], [0, 1, 1, 0], {
            extrapolateRight: "clamp",
        });

        const scale = interpolate(gemFrame, [0, 15, 35], [0.5, 1, 0.3], {
            extrapolateRight: "clamp",
        });

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "35%",
                    transform: `translate(${x}px, ${y}px) scale(${scale})`,
                    fontSize: 24,
                    opacity,
                }}
            >
                💎
            </div>
        );
    });

    return <>{gems}</>;
};

// Main Gem Counter composition
export const GemCounter = ({
    fromAmount = 1000,
    toAmount = 1150,
}) => {
    const change = toAmount - fromAmount;
    const isGain = change > 0;

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Glow background */}
            <AbsoluteFill
                style={{
                    background: `radial-gradient(circle at 50% 40%, ${isGain ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)"} 0%, transparent 50%)`,
                }}
            />

            {/* Flying gems */}
            <FlyingGems count={Math.abs(change / 10)} isGain={isGain} />

            {/* Main gem icon */}
            <GemIcon />

            {/* Rolling counter */}
            <RollingCounter from={fromAmount} to={toAmount} />

            {/* Change amount */}
            <ChangeAmount amount={Math.abs(change)} isGain={isGain} />
        </AbsoluteFill>
    );
};

export default GemCounter;
