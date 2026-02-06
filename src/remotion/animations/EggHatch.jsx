import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Egg wobble animation
const WobblingEgg = () => {
    const frame = useCurrentFrame();

    // Intensity increases over time
    const intensity = Math.min(frame * 0.3, 15);
    const wobble = Math.sin(frame * 0.8) * intensity;

    // Egg gets brighter as it's about to hatch
    const glow = interpolate(frame, [0, 30], [10, 40], {
        extrapolateRight: "clamp",
    });

    const scale = interpolate(frame, [0, 20, 25, 30], [1, 1.02, 0.98, 1.05], {
        extrapolateRight: "clamp",
    });

    // Hide after crack
    const opacity = frame < 35 ? 1 : 0;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "35%",
                transform: `translate(-50%, 0) rotate(${wobble}deg) scale(${scale})`,
                fontSize: 100,
                filter: `drop-shadow(0 0 ${glow}px rgba(255, 255, 200, 0.8))`,
                opacity,
            }}
        >
            🥚
        </div>
    );
};

// Crack lines appearing
const CrackLine = ({ delay, angle, length }) => {
    const frame = useCurrentFrame();

    const crackFrame = frame - delay;
    if (crackFrame < 0) return null;

    const lineLength = interpolate(crackFrame, [0, 5], [0, length], {
        extrapolateRight: "clamp",
    });

    const opacity = interpolate(crackFrame, [0, 5, 30, 35], [0, 1, 1, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "35%",
                width: lineLength,
                height: 4,
                background: "linear-gradient(90deg, #FCD34D, rgba(255,255,200,0.5))",
                transform: `translateX(-30%) rotate(${angle}deg)`,
                transformOrigin: "left center",
                opacity,
                borderRadius: 2,
                boxShadow: "0 0 15px rgba(255, 215, 0, 0.8)",
            }}
        />
    );
};

// Light beam burst
const LightBurst = () => {
    const frame = useCurrentFrame();

    const burstFrame = frame - 35;
    if (burstFrame < 0) return null;

    const scale = interpolate(burstFrame, [0, 10], [0, 3], {
        extrapolateRight: "clamp",
    });

    const opacity = interpolate(burstFrame, [0, 5, 15], [0, 1, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "35%",
                width: 200,
                height: 200,
                transform: `translate(-50%, -30%) scale(${scale})`,
                background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,200,0.5) 30%, transparent 70%)",
                opacity,
                borderRadius: "50%",
            }}
        />
    );
};

// Baby animal reveal
const BabyAnimal = ({ animalEmoji = "🐥" }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 40,
        fps,
        config: { damping: 8, stiffness: 150 },
    });

    const scale = interpolate(appear, [0, 1], [0.3, 1]);

    // Cute bounce
    const bounceY = frame > 50 ? Math.sin((frame - 50) * 0.3) * 8 : 0;

    // Happy sparkle
    const sparkle = 1 + Math.sin(frame * 0.4) * 0.05;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "32%",
                transform: `translate(-50%, ${bounceY}px) scale(${scale * sparkle})`,
                fontSize: 90,
                opacity: appear,
                filter: "drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))",
            }}
        >
            {animalEmoji}
        </div>
    );
};

// Confetti burst
const Confetti = ({ delay, x, color, size }) => {
    const frame = useCurrentFrame();
    const { fps, height } = useVideoConfig();

    const confettiFrame = frame - delay;
    if (confettiFrame < 0) return null;

    const rise = spring({
        frame: confettiFrame,
        fps,
        config: { damping: 20, stiffness: 60 },
    });

    const startY = height * 0.35;
    const y = startY - 150 * rise + confettiFrame * confettiFrame * 0.1;

    const rotation = confettiFrame * 10 * (x > 50 ? 1 : -1);
    const opacity = interpolate(confettiFrame, [0, 10, 50, 70], [0, 1, 1, 0], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                left: `${x}%`,
                top: y,
                width: size,
                height: size * 1.5,
                background: color,
                transform: `rotate(${rotation}deg)`,
                opacity,
                borderRadius: 2,
            }}
        />
    );
};

// Animal name reveal
const AnimalName = ({ name = "Baby Chick" }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 55,
        fps,
        config: { damping: 12 },
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "58%",
                transform: `translate(-50%, 0) scale(${appear})`,
                opacity: appear,
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "Inter, sans-serif",
                    marginBottom: 4,
                }}
            >
                A new friend has hatched!
            </div>
            <div
                style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#FCD34D",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 0 15px rgba(255, 215, 0, 0.5), 0 2px 10px rgba(0,0,0,0.5)",
                }}
            >
                {name}
            </div>
        </div>
    );
};

// Main Egg Hatch composition
export const EggHatch = ({ animalEmoji = "🐥", animalName = "Baby Chick" }) => {
    const { width } = useVideoConfig();

    // Crack lines
    const cracks = [
        { delay: 20, angle: -30, length: 60 },
        { delay: 23, angle: 45, length: 50 },
        { delay: 26, angle: 10, length: 55 },
        { delay: 29, angle: -55, length: 45 },
        { delay: 32, angle: 70, length: 40 },
    ];

    // Confetti pieces
    const confettiColors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
    const confetti = Array.from({ length: 30 }, (_, i) => ({
        delay: 40 + i * 1,
        x: 30 + (i % 10) * 4 + Math.random() * 5,
        color: confettiColors[i % confettiColors.length],
        size: 6 + Math.random() * 6,
    }));

    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Soft glow background */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at 50% 35%, rgba(255,255,200,0.2) 0%, transparent 50%)",
                }}
            />

            {/* Wobbling egg */}
            <WobblingEgg />

            {/* Crack lines */}
            {cracks.map((crack, i) => (
                <CrackLine key={i} {...crack} />
            ))}

            {/* Light burst */}
            <LightBurst />

            {/* Baby animal */}
            <BabyAnimal animalEmoji={animalEmoji} />

            {/* Confetti */}
            {confetti.map((c, i) => (
                <Confetti key={i} {...c} />
            ))}

            {/* Animal name */}
            <AnimalName name={animalName} />
        </AbsoluteFill>
    );
};

export default EggHatch;
