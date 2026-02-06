import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Coin drain effect
const CoinDrain = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const coins = Array.from({ length: 12 }, (_, i) => {
        const delay = i * 3;
        const coinFrame = frame - delay;
        if (coinFrame < 0) return null;

        const fall = spring({
            frame: coinFrame,
            fps,
            config: { damping: 20, stiffness: 100 },
        });

        // Start position (spread at top)
        const startX = (i - 6) * 25;
        const x = interpolate(fall, [0, 1], [startX, 0]);
        const y = interpolate(fall, [0, 1], [-100, 50]);

        const rotation = coinFrame * 15 * (i % 2 === 0 ? 1 : -1);
        const scale = interpolate(coinFrame, [0, 10, 30], [1, 1.2, 0], {
            extrapolateRight: "clamp",
        });

        const opacity = interpolate(coinFrame, [0, 5, 25, 35], [0, 1, 1, 0], {
            extrapolateRight: "clamp",
        });

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "35%",
                    transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
                    fontSize: 28,
                    opacity,
                }}
            >
                💎
            </div>
        );
    });

    return <>{coins}</>;
};

// Item being purchased
const PurchasedItem = ({ itemIcon, itemName }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const pop = spring({
        frame: frame - 25,
        fps,
        config: { damping: 8, stiffness: 150 },
    });

    const scale = interpolate(pop, [0, 1], [0.3, 1]);

    // Floating
    const float = Math.sin(frame * 0.1) * 5;

    // Glow pulse
    const glow = 20 + Math.sin(frame * 0.4) * 10;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "30%",
                transform: `translate(-50%, ${float}px) scale(${scale})`,
            }}
        >
            {/* Glow ring */}
            <div
                style={{
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 ${glow}px rgba(255, 215, 0, 0.4)`,
                }}
            >
                <div
                    style={{
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)",
                        border: "4px solid white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 50,
                        boxShadow: "0 8px 30px rgba(245, 158, 11, 0.5)",
                    }}
                >
                    {itemIcon}
                </div>
            </div>
            {/* Item name */}
            <div
                style={{
                    textAlign: "center",
                    marginTop: 16,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "white",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                }}
            >
                {itemName}
            </div>
        </div>
    );
};

// Celebration confetti
const Confetti = () => {
    const frame = useCurrentFrame();
    const { fps, height } = useVideoConfig();

    const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

    const confetti = Array.from({ length: 25 }, (_, i) => {
        const delay = 30 + i * 2;
        const confettiFrame = frame - delay;
        if (confettiFrame < 0) return null;

        const rise = spring({
            frame: confettiFrame,
            fps,
            config: { damping: 20, stiffness: 60 },
        });

        const startX = (i % 10 - 5) * 35;
        const x = startX + Math.sin(confettiFrame * 0.2 + i) * 20;
        const y = -200 * rise + confettiFrame * confettiFrame * 0.15;

        const rotation = confettiFrame * 8 * (i % 2 === 0 ? 1 : -1);
        const opacity = interpolate(confettiFrame, [0, 10, 50, 80], [0, 1, 1, 0], {
            extrapolateRight: "clamp",
        });

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "60%",
                    width: 8 + (i % 3) * 4,
                    height: 12 + (i % 3) * 4,
                    background: colors[i % colors.length],
                    transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
                    opacity,
                    borderRadius: 2,
                }}
            />
        );
    });

    return <>{confetti}</>;
};

// "PURCHASED!" text
const PurchasedText = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 35,
        fps,
        config: { damping: 10, stiffness: 150 },
    });

    const shimmer = 1 + Math.sin(frame * 0.5) * 0.03;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "62%",
                transform: `translate(-50%, 0) scale(${appear * shimmer})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: "#10B981",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 0 20px rgba(16, 185, 129, 0.5), 0 4px 15px rgba(0,0,0,0.5)",
                }}
            >
                ✓ PURCHASED!
            </div>
        </div>
    );
};

// Main Purchase Celebration composition
export const PurchaseCelebration = ({
    itemIcon = "👑",
    itemName = "Golden Crown",
}) => {
    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Gold glow */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at 50% 35%, rgba(255, 215, 0, 0.15) 0%, transparent 50%)",
                }}
            />

            {/* Coin drain */}
            <CoinDrain />

            {/* Confetti */}
            <Confetti />

            {/* Purchased item */}
            <PurchasedItem itemIcon={itemIcon} itemName={itemName} />

            {/* Purchased text */}
            <PurchasedText />
        </AbsoluteFill>
    );
};

export default PurchaseCelebration;
