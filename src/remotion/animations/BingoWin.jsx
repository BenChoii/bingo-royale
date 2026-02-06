import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Sequence,
    AbsoluteFill,
} from "remotion";

// Pixel-style particle
const Particle = ({ x, y, delay, color, size = 8 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const particleFrame = frame - delay;
    if (particleFrame < 0) return null;

    // Burst outward then fall
    const progress = spring({
        frame: particleFrame,
        fps,
        config: { damping: 20, stiffness: 100 },
    });

    const gravity = Math.pow(particleFrame * 0.05, 2);
    const offsetX = (Math.random() - 0.5) * 300 * progress;
    const offsetY = -150 * progress + gravity * 3;

    const opacity = interpolate(particleFrame, [0, 10, 40], [0, 1, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: x + offsetX,
                top: y + offsetY,
                width: size,
                height: size,
                background: color,
                opacity,
                imageRendering: "pixelated",
            }}
        />
    );
};

// Gem shower effect
const GemShower = ({ startFrame }) => {
    const frame = useCurrentFrame();
    const { width } = useVideoConfig();

    const gems = Array.from({ length: 30 }, (_, i) => ({
        x: Math.random() * width,
        delay: startFrame + i * 2,
        speed: 3 + Math.random() * 4,
        rotation: Math.random() * 360,
    }));

    return (
        <>
            {gems.map((gem, i) => {
                const gemFrame = frame - gem.delay;
                if (gemFrame < 0) return null;

                const y = gemFrame * gem.speed;
                const rotate = gem.rotation + gemFrame * 5;
                const opacity = interpolate(gemFrame, [0, 10, 60, 80], [0, 1, 1, 0], {
                    extrapolateRight: "clamp",
                });

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: gem.x,
                            top: y - 50,
                            fontSize: 24,
                            transform: `rotate(${rotate}deg)`,
                            opacity,
                        }}
                    >
                        💎
                    </div>
                );
            })}
        </>
    );
};

// BINGO letter explosion
const BingoLetter = ({ letter, index, color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const delay = 10 + index * 3;
    const letterFrame = frame - delay;

    const scale = spring({
        frame: letterFrame,
        fps,
        config: { damping: 8, stiffness: 150 },
    });

    const rotation = interpolate(letterFrame, [0, 20], [0, 360 * (index % 2 === 0 ? 1 : -1)], {
        extrapolateRight: "clamp",
    });

    // Spread outward
    const spreadAngle = (index - 2) * 25; // -50, -25, 0, 25, 50
    const spreadDistance = interpolate(letterFrame, [0, 15], [0, 80], {
        extrapolateRight: "clamp",
    });

    const x = Math.sin((spreadAngle * Math.PI) / 180) * spreadDistance;
    const y = -Math.cos((spreadAngle * Math.PI) / 180) * spreadDistance * 0.5;

    const opacity = letterFrame > 0 ? 1 : 0;

    return (
        <div
            style={{
                position: "absolute",
                transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`,
                opacity,
            }}
        >
            <div
                style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 30% 30%, ${color}, ${color}88)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 -3px 10px rgba(0,0,0,0.3)",
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
                    {letter}
                </span>
            </div>
        </div>
    );
};

// Crown drop animation
const CrownDrop = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const drop = spring({
        frame: frame - 5,
        fps,
        config: { damping: 10, stiffness: 100 },
    });

    const y = interpolate(drop, [0, 1], [-100, 0]);
    const scale = interpolate(drop, [0, 1], [0.3, 1]);
    const rotation = interpolate(frame, [5, 30], [-20, 0], {
        extrapolateRight: "clamp",
    });

    // Sparkle effect
    const shimmer = 1 + Math.sin(frame * 0.3) * 0.1;

    return (
        <div
            style={{
                fontSize: 80,
                transform: `translateY(${y}px) scale(${scale * shimmer}) rotate(${rotation}deg)`,
                filter: `drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))`,
            }}
        >
            👑
        </div>
    );
};

// Screen shake effect
const ScreenShake = ({ children, intensity = 5 }) => {
    const frame = useCurrentFrame();

    // Shake decays over time
    const shakeAmount = Math.max(0, intensity - frame * 0.2);
    const x = Math.sin(frame * 2) * shakeAmount;
    const y = Math.cos(frame * 3) * shakeAmount;

    return (
        <div style={{ transform: `translate(${x}px, ${y}px)` }}>
            {children}
        </div>
    );
};

// Main BINGO WIN composition
export const BingoWin = ({ gemsWon = 100, pattern = "line" }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    const letters = ["B", "I", "N", "G", "O"];
    const colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981"];

    // Background flash
    const flashOpacity = interpolate(frame, [0, 5, 15], [0.8, 0.3, 0], {
        extrapolateRight: "clamp",
    });

    // Particles from center
    const particles = Array.from({ length: 40 }, (_, i) => ({
        x: width / 2,
        y: height / 2 - 50,
        delay: 5 + i * 0.5,
        color: colors[i % colors.length],
        size: 6 + Math.random() * 4,
    }));

    // Win text fade in
    const winTextOpacity = interpolate(frame, [40, 55], [0, 1], {
        extrapolateRight: "clamp",
    });
    const winTextScale = spring({
        frame: frame - 40,
        fps: 30,
        config: { damping: 10 },
    });

    return (
        <AbsoluteFill
            style={{
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Initial flash */}
            <AbsoluteFill
                style={{
                    background: "white",
                    opacity: flashOpacity,
                }}
            />

            <ScreenShake intensity={8}>
                {/* Crown */}
                <div
                    style={{
                        position: "absolute",
                        top: "25%",
                        left: "50%",
                        transform: "translateX(-50%)",
                    }}
                >
                    <CrownDrop />
                </div>

                {/* BINGO letters */}
                <div
                    style={{
                        position: "absolute",
                        top: "42%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                        gap: 15,
                    }}
                >
                    {letters.map((letter, i) => (
                        <BingoLetter
                            key={letter}
                            letter={letter}
                            index={i}
                            color={colors[i]}
                        />
                    ))}
                </div>

                {/* Particles */}
                {particles.map((p, i) => (
                    <Particle key={i} {...p} />
                ))}
            </ScreenShake>

            {/* Gem shower */}
            <GemShower startFrame={30} />

            {/* Win amount */}
            <div
                style={{
                    position: "absolute",
                    top: "62%",
                    left: "50%",
                    transform: `translateX(-50%) scale(${winTextScale})`,
                    opacity: winTextOpacity,
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: "white",
                        fontFamily: "Inter, sans-serif",
                        textShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 40px rgba(139, 92, 246, 0.6)",
                        letterSpacing: 2,
                    }}
                >
                    +{gemsWon} 💎
                </div>
                <div
                    style={{
                        fontSize: 20,
                        color: "rgba(255,255,255,0.8)",
                        fontFamily: "Inter, sans-serif",
                        marginTop: 8,
                    }}
                >
                    {pattern.toUpperCase()} BINGO!
                </div>
            </div>
        </AbsoluteFill>
    );
};

export default BingoWin;
