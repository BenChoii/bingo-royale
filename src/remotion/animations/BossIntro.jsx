import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Sequence,
    AbsoluteFill,
} from "remotion";

// Lightning bolt effect
const Lightning = ({ delay }) => {
    const frame = useCurrentFrame();
    const boltFrame = frame - delay;

    if (boltFrame < 0 || boltFrame > 8) return null;

    const opacity = interpolate(boltFrame, [0, 2, 4, 8], [0, 1, 0.8, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translateX(-50%)",
                fontSize: 120,
                opacity,
                filter: "drop-shadow(0 0 30px #F59E0B) drop-shadow(0 0 60px #FCD34D)",
            }}
        >
            ⚡
        </div>
    );
};

// Boss character slam
const BossCharacter = ({ bossEmoji = "👹" }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const slamProgress = spring({
        frame: frame - 15,
        fps,
        config: { damping: 8, stiffness: 100 },
    });

    const y = interpolate(slamProgress, [0, 1], [-300, 0]);
    const scale = interpolate(slamProgress, [0, 0.8, 1], [0.5, 1.3, 1]);
    const rotation = interpolate(frame, [15, 30], [-10, 0], {
        extrapolateRight: "clamp",
    });

    // Ground shake when landing
    const shakeY = frame > 25 && frame < 35 ? Math.sin(frame * 2) * (35 - frame) * 0.5 : 0;

    // Menacing glow pulse
    const glowSize = 30 + Math.sin(frame * 0.3) * 10;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "30%",
                transform: `translate(-50%, ${y + shakeY}px) scale(${scale}) rotate(${rotation}deg)`,
                fontSize: 150,
                filter: `drop-shadow(0 0 ${glowSize}px rgba(239, 68, 68, 0.8))`,
            }}
        >
            {bossEmoji}
        </div>
    );
};

// Health bar dramatic fill
const HealthBar = ({ bossName = "Dragon King", hp = 5000 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 35,
        fps,
        config: { damping: 15 },
    });

    const fillProgress = interpolate(frame, [40, 70], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "55%",
                transform: `translate(-50%, 0) scale(${appear})`,
                opacity: appear,
                width: 400,
            }}
        >
            {/* Boss name */}
            <div
                style={{
                    textAlign: "center",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "white",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                    marginBottom: 12,
                }}
            >
                {bossName}
            </div>
            {/* Health bar container */}
            <div
                style={{
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: 8,
                    padding: 4,
                    border: "2px solid rgba(239, 68, 68, 0.6)",
                }}
            >
                <div
                    style={{
                        height: 20,
                        background: "rgba(239, 68, 68, 0.3)",
                        borderRadius: 4,
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${fillProgress * 100}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #DC2626, #EF4444, #F87171)",
                            boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)",
                        }}
                    />
                </div>
            </div>
            {/* HP text */}
            <div
                style={{
                    textAlign: "center",
                    fontSize: 16,
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "Inter, sans-serif",
                    marginTop: 8,
                }}
            >
                {Math.floor(hp * fillProgress).toLocaleString()} / {hp.toLocaleString()} HP
            </div>
        </div>
    );
};

// "DEFEAT THE BOSS" text
const BossText = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const text = "DEFEAT THE BOSS";
    const letters = text.split("");

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "75%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                gap: 4,
            }}
        >
            {letters.map((char, i) => {
                const letterFrame = frame - 50 - i * 1.5;
                const letterSpring = spring({
                    frame: letterFrame,
                    fps,
                    config: { damping: 12, stiffness: 200 },
                });

                const y = interpolate(letterSpring, [0, 1], [30, 0]);
                const scale = interpolate(letterSpring, [0, 0.5, 1], [0.5, 1.2, 1]);

                // Fire effect
                const fireGlow = Math.sin(frame * 0.4 + i * 0.5) * 5;

                return (
                    <span
                        key={i}
                        style={{
                            fontSize: 36,
                            fontWeight: 800,
                            color: char === " " ? "transparent" : "#FCD34D",
                            fontFamily: "Inter, sans-serif",
                            transform: `translateY(${y}px) scale(${scale})`,
                            opacity: letterSpring,
                            textShadow: `0 0 ${15 + fireGlow}px #F59E0B, 0 0 30px #EF4444`,
                            letterSpacing: 3,
                            minWidth: char === " " ? 15 : "auto",
                        }}
                    >
                        {char}
                    </span>
                );
            })}
        </div>
    );
};

// Dark overlay with vignette
const DarkOverlay = () => {
    const frame = useCurrentFrame();

    const opacity = interpolate(frame, [0, 10], [0, 0.7], {
        extrapolateRight: "clamp",
    });

    return (
        <AbsoluteFill
            style={{
                background: `radial-gradient(circle at center, 
                    rgba(0,0,0,${opacity * 0.3}) 0%, 
                    rgba(0,0,0,${opacity}) 70%)`,
            }}
        />
    );
};

// Main Boss Intro composition
export const BossIntro = ({ bossName = "Dragon King", bossEmoji = "🐉", hp = 5000 }) => {
    const frame = useCurrentFrame();

    // Multiple lightning strikes
    const lightningDelays = [5, 12, 20];

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Dark dramatic overlay */}
            <DarkOverlay />

            {/* Lightning effects */}
            {lightningDelays.map((delay, i) => (
                <Lightning key={i} delay={delay} />
            ))}

            {/* Boss slam */}
            <Sequence from={15}>
                <BossCharacter bossEmoji={bossEmoji} />
            </Sequence>

            {/* Health bar */}
            <HealthBar bossName={bossName} hp={hp} />

            {/* Call to action text */}
            <BossText />
        </AbsoluteFill>
    );
};

export default BossIntro;
