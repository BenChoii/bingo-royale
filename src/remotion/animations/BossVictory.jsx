import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Boss crack and shatter effect
const BossCrack = ({ bossEmoji = "👹" }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Shake before explode
    const shakeIntensity = frame < 20 ? Math.sin(frame * 3) * (5 + frame * 0.3) : 0;

    // Fade and scale out
    const explodeProgress = interpolate(frame, [20, 35], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    const scale = interpolate(explodeProgress, [0, 0.3, 1], [1, 1.3, 0]);
    const opacity = interpolate(explodeProgress, [0, 0.5, 1], [1, 0.8, 0]);

    // Red glow intensifies
    const glowSize = 20 + frame;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "25%",
                transform: `translate(-50%, 0) translateX(${shakeIntensity}px) scale(${scale})`,
                fontSize: 120,
                opacity,
                filter: `drop-shadow(0 0 ${glowSize}px rgba(239, 68, 68, 0.8))`,
            }}
        >
            {bossEmoji}
        </div>
    );
};

// Explosion particles
const ExplosionParticle = ({ delay, angle, distance, color, size }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const particleFrame = frame - delay;
    if (particleFrame < 0) return null;

    const burst = spring({
        frame: particleFrame,
        fps,
        config: { damping: 15, stiffness: 80 },
    });

    const x = Math.cos((angle * Math.PI) / 180) * distance * burst;
    const y = Math.sin((angle * Math.PI) / 180) * distance * burst + particleFrame * particleFrame * 0.05;

    const opacity = interpolate(particleFrame, [0, 10, 40], [0, 1, 0], {
        extrapolateRight: "clamp",
    });

    const rotation = particleFrame * (angle > 180 ? -10 : 10);

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "25%",
                transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
                width: size,
                height: size,
                background: color,
                borderRadius: size > 10 ? "20%" : "50%",
                opacity,
                boxShadow: `0 0 ${size}px ${color}`,
            }}
        />
    );
};

// Victory crown descends
const VictoryCrown = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const descend = spring({
        frame: frame - 40,
        fps,
        config: { damping: 10, stiffness: 80 },
    });

    const y = interpolate(descend, [0, 1], [-150, 0]);
    const scale = interpolate(descend, [0, 1], [0.5, 1]);
    const rotation = interpolate(frame, [40, 60], [-15, 0], {
        extrapolateRight: "clamp",
    });

    // Golden shimmer
    const shimmer = 1 + Math.sin(frame * 0.3) * 0.1;
    const glowSize = 30 + Math.sin(frame * 0.4) * 10;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "22%",
                transform: `translate(-50%, ${y}px) scale(${scale * shimmer}) rotate(${rotation}deg)`,
                fontSize: 100,
                filter: `drop-shadow(0 0 ${glowSize}px rgba(255, 215, 0, 0.8))`,
            }}
        >
            👑
        </div>
    );
};

// Loot spray
const LootItem = ({ emoji, delay, angle, distance }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const itemFrame = frame - delay;
    if (itemFrame < 0) return null;

    const burst = spring({
        frame: itemFrame,
        fps,
        config: { damping: 12, stiffness: 100 },
    });

    const gravity = itemFrame * itemFrame * 0.08;
    const x = Math.cos((angle * Math.PI) / 180) * distance * burst;
    const y = Math.sin((angle * Math.PI) / 180) * distance * burst * 0.5 - 50 + gravity;

    const rotation = itemFrame * 8 * (angle > 180 ? -1 : 1);
    const opacity = interpolate(itemFrame, [0, 10, 50, 70], [0, 1, 1, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "35%",
                transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
                fontSize: 32,
                opacity,
            }}
        >
            {emoji}
        </div>
    );
};

// VICTORY text
const VictoryText = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 50,
        fps,
        config: { damping: 8, stiffness: 150 },
    });

    const scale = interpolate(appear, [0, 1], [0.3, 1]);
    const shimmer = 1 + Math.sin(frame * 0.5) * 0.05;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) scale(${scale * shimmer})`,
                opacity: appear,
            }}
        >
            <div
                style={{
                    fontSize: 72,
                    fontWeight: 800,
                    color: "#FCD34D",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 0 20px #F59E0B, 0 0 40px #EF4444, 0 4px 20px rgba(0,0,0,0.5)",
                    letterSpacing: 8,
                }}
            >
                VICTORY!
            </div>
        </div>
    );
};

// Damage stats display
const DamageStats = ({ totalDamage = 5000 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 60,
        fps,
        config: { damping: 12 },
    });

    const countUp = interpolate(frame, [60, 80], [0, totalDamage], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                bottom: "20%",
                transform: `translate(-50%, 0) scale(${appear})`,
                opacity: appear,
                textAlign: "center",
            }}
        >
            <div
                style={{
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: 16,
                    padding: "16px 32px",
                    border: "2px solid rgba(255, 215, 0, 0.4)",
                }}
            >
                <div
                    style={{
                        fontSize: 18,
                        color: "rgba(255,255,255,0.8)",
                        fontFamily: "Inter, sans-serif",
                        marginBottom: 4,
                    }}
                >
                    Total Damage Dealt
                </div>
                <div
                    style={{
                        fontSize: 36,
                        fontWeight: 800,
                        color: "#10B981",
                        fontFamily: "Inter, sans-serif",
                        textShadow: "0 0 15px rgba(16, 185, 129, 0.5)",
                    }}
                >
                    {Math.floor(countUp).toLocaleString()}
                </div>
            </div>
        </div>
    );
};

// Main Boss Victory composition
export const BossVictory = ({ bossEmoji = "🐉", totalDamage = 5000 }) => {
    const { width, height } = useVideoConfig();

    // Explosion particles
    const explosionColors = ["#EF4444", "#F59E0B", "#FCD34D", "#FBBF24"];
    const particles = Array.from({ length: 50 }, (_, i) => ({
        delay: 20 + i * 0.5,
        angle: (i / 50) * 360,
        distance: 100 + Math.random() * 150,
        color: explosionColors[i % explosionColors.length],
        size: 8 + Math.random() * 12,
    }));

    // Loot items
    const lootEmojis = ["💎", "🪙", "⭐", "🏆", "🎁", "💰"];
    const lootItems = Array.from({ length: 12 }, (_, i) => ({
        emoji: lootEmojis[i % lootEmojis.length],
        delay: 35 + i * 3,
        angle: i * 30,
        distance: 80 + (i % 3) * 40,
    }));

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Semi-dark overlay */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 80%)",
                }}
            />

            {/* Boss cracks and explodes */}
            <BossCrack bossEmoji={bossEmoji} />

            {/* Explosion particles */}
            {particles.map((p, i) => (
                <ExplosionParticle key={i} {...p} />
            ))}

            {/* Victory crown */}
            <VictoryCrown />

            {/* Loot spray */}
            {lootItems.map((item, i) => (
                <LootItem key={i} {...item} />
            ))}

            {/* VICTORY text */}
            <VictoryText />

            {/* Damage stats */}
            <DamageStats totalDamage={totalDamage} />
        </AbsoluteFill>
    );
};

export default BossVictory;
