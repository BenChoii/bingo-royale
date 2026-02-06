import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Slot reel symbol
const SlotSymbol = ({ emoji, y, blur }) => {
    return (
        <div
            style={{
                fontSize: 48,
                height: 70,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: blur ? "blur(2px)" : "none",
                transform: `translateY(${y}px)`,
            }}
        >
            {emoji}
        </div>
    );
};

// Single slot reel
const SlotReel = ({ symbols, delay, finalIndex }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const reelFrame = frame - delay;
    if (reelFrame < 0) return null;

    // Spin speed decay
    const spinDuration = 40;
    const spinProgress = Math.min(reelFrame / spinDuration, 1);

    // Eased stop
    const eased = 1 - Math.pow(1 - spinProgress, 3);

    // Calculate position
    const totalSymbols = symbols.length;
    const fullSpins = 3; // Number of full rotations
    const symbolHeight = 70;
    const totalTravel = (fullSpins * totalSymbols + finalIndex) * symbolHeight;
    const currentPos = totalTravel * eased;

    // Bounce at end
    const bounce = spinProgress >= 1 ? Math.sin((reelFrame - spinDuration) * 0.5) * 5 * Math.exp(-(reelFrame - spinDuration) * 0.1) : 0;

    return (
        <div
            style={{
                width: 80,
                height: 70,
                overflow: "hidden",
                background: "rgba(0,0,0,0.4)",
                borderRadius: 12,
                border: "3px solid rgba(255,255,255,0.2)",
            }}
        >
            <div
                style={{
                    transform: `translateY(${-currentPos % (totalSymbols * symbolHeight) + bounce}px)`,
                }}
            >
                {/* Render symbols multiple times for infinite scroll effect */}
                {[...symbols, ...symbols, ...symbols].map((sym, i) => (
                    <SlotSymbol
                        key={i}
                        emoji={sym}
                        y={0}
                        blur={spinProgress < 0.9}
                    />
                ))}
            </div>
        </div>
    );
};

// Win line highlight
const WinLine = ({ isWin }) => {
    const frame = useCurrentFrame();

    if (!isWin) return null;

    const opacity = Math.sin(frame * 0.5) * 0.3 + 0.7;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 300,
                height: 80,
                border: "3px solid #FCD34D",
                borderRadius: 16,
                boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
                opacity,
                pointerEvents: "none",
            }}
        />
    );
};

// Jackpot burst
const JackpotBurst = ({ isJackpot }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (!isJackpot) return null;

    const burstStart = 60;
    const burstFrame = frame - burstStart;
    if (burstFrame < 0) return null;

    // Particle bursts
    const particles = Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * 360;
        const burst = spring({
            frame: burstFrame,
            fps,
            config: { damping: 12, stiffness: 80 },
        });

        const distance = 100 + Math.random() * 100;
        const x = Math.cos((angle * Math.PI) / 180) * distance * burst;
        const y = Math.sin((angle * Math.PI) / 180) * distance * burst;

        const opacity = interpolate(burstFrame, [0, 10, 40], [0, 1, 0], {
            extrapolateRight: "clamp",
        });

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(${x}px, ${y}px)`,
                    fontSize: 24,
                    opacity,
                }}
            >
                {["⭐", "💎", "🪙"][i % 3]}
            </div>
        );
    });

    return <>{particles}</>;
};

// Win amount text
const WinAmount = ({ amount, isJackpot }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const winStart = 55;
    const appear = spring({
        frame: frame - winStart,
        fps,
        config: { damping: 8, stiffness: 150 },
    });

    if (amount <= 0) return null;

    const scale = interpolate(appear, [0, 1], [0.5, 1]);
    const shimmer = 1 + Math.sin(frame * 0.5) * 0.05;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "70%",
                transform: `translate(-50%, 0) scale(${scale * shimmer})`,
                opacity: appear,
                textAlign: "center",
            }}
        >
            {isJackpot && (
                <div
                    style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: "#FCD34D",
                        fontFamily: "Inter, sans-serif",
                        textShadow: "0 0 20px rgba(255, 215, 0, 0.8)",
                        marginBottom: 8,
                    }}
                >
                    🎰 JACKPOT! 🎰
                </div>
            )}
            <div
                style={{
                    fontSize: isJackpot ? 48 : 36,
                    fontWeight: 800,
                    color: "#10B981",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 0 15px rgba(16, 185, 129, 0.5)",
                }}
            >
                +{amount.toLocaleString()} 💎
            </div>
        </div>
    );
};

// Main Lucky Line / Slot composition
export const LuckyLine = ({
    result = ["💎", "💎", "💎"],
    winAmount = 100,
    isJackpot = false,
}) => {
    const symbols = ["🍒", "💎", "⭐", "🪙", "7️⃣", "🍀"];

    // Find indices for final positions
    const finalIndices = result.map(r => symbols.indexOf(r) >= 0 ? symbols.indexOf(r) : 0);

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Slot machine background */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.2) 0%, transparent 60%)",
                }}
            />

            {/* Slot reels */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "45%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    gap: 16,
                }}
            >
                <SlotReel symbols={symbols} delay={5} finalIndex={finalIndices[0]} />
                <SlotReel symbols={symbols} delay={10} finalIndex={finalIndices[1]} />
                <SlotReel symbols={symbols} delay={15} finalIndex={finalIndices[2]} />
            </div>

            {/* Win line */}
            <WinLine isWin={winAmount > 0} />

            {/* Jackpot burst */}
            <JackpotBurst isJackpot={isJackpot} />

            {/* Win amount */}
            <WinAmount amount={winAmount} isJackpot={isJackpot} />
        </AbsoluteFill>
    );
};

export default LuckyLine;
