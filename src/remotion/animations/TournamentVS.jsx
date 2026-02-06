import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    AbsoluteFill,
} from "remotion";

// Player avatar card
const PlayerCard = ({ name, avatar, side, gems }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const slideDelay = side === "left" ? 0 : 5;
    const slide = spring({
        frame: frame - slideDelay,
        fps,
        config: { damping: 12, stiffness: 100 },
    });

    const x = side === "left" ? -300 + 300 * slide : 300 - 300 * slide;

    // Glow pulse
    const glow = 10 + Math.sin(frame * 0.3 + (side === "left" ? 0 : Math.PI)) * 5;

    return (
        <div
            style={{
                position: "absolute",
                left: side === "left" ? "15%" : "auto",
                right: side === "right" ? "15%" : "auto",
                top: "50%",
                transform: `translate(${x}px, -50%)`,
                textAlign: "center",
            }}
        >
            {/* Avatar */}
            <div
                style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${side === "left" ? "#3B82F6" : "#EF4444"} 0%, ${side === "left" ? "#1E40AF" : "#991B1B"} 100%)`,
                    border: `4px solid ${side === "left" ? "#60A5FA" : "#F87171"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 60,
                    boxShadow: `0 0 ${glow}px ${side === "left" ? "rgba(59, 130, 246, 0.6)" : "rgba(239, 68, 68, 0.6)"}`,
                    margin: "0 auto",
                }}
            >
                {avatar}
            </div>
            {/* Name */}
            <div
                style={{
                    marginTop: 16,
                    fontSize: 24,
                    fontWeight: 700,
                    color: "white",
                    fontFamily: "Inter, sans-serif",
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
            >
                {name}
            </div>
            {/* Gems */}
            <div
                style={{
                    marginTop: 8,
                    fontSize: 16,
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                💎 {gems.toLocaleString()}
            </div>
        </div>
    );
};

// VS text in center
const VSText = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const pop = spring({
        frame: frame - 15,
        fps,
        config: { damping: 8, stiffness: 200 },
    });

    const scale = interpolate(pop, [0, 1], [0.3, 1]);
    const rotation = interpolate(frame, [15, 25], [-10, 0], {
        extrapolateRight: "clamp",
    });

    // Fire glow
    const fireGlow = 20 + Math.sin(frame * 0.4) * 10;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
            }}
        >
            <div
                style={{
                    fontSize: 80,
                    fontWeight: 900,
                    color: "#FCD34D",
                    fontFamily: "Inter, sans-serif",
                    textShadow: `0 0 ${fireGlow}px #F59E0B, 0 0 40px #EF4444, 0 4px 20px rgba(0,0,0,0.5)`,
                    letterSpacing: 4,
                }}
            >
                VS
            </div>
        </div>
    );
};

// Prize pool display
const PrizePool = ({ amount }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const appear = spring({
        frame: frame - 30,
        fps,
        config: { damping: 12 },
    });

    const shimmer = 1 + Math.sin(frame * 0.5) * 0.03;

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "75%",
                transform: `translate(-50%, 0) scale(${appear * shimmer})`,
                opacity: appear,
                textAlign: "center",
            }}
        >
            <div
                style={{
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: 16,
                    padding: "12px 32px",
                    border: "2px solid rgba(255, 215, 0, 0.4)",
                }}
            >
                <div
                    style={{
                        fontSize: 14,
                        color: "rgba(255,255,255,0.7)",
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    PRIZE POOL
                </div>
                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 800,
                        color: "#FCD34D",
                        fontFamily: "Inter, sans-serif",
                        textShadow: "0 0 15px rgba(255, 215, 0, 0.5)",
                    }}
                >
                    💎 {amount.toLocaleString()}
                </div>
            </div>
        </div>
    );
};

// Countdown 3-2-1-GO
const Countdown = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const countStart = 50;
    const values = ["3", "2", "1", "GO!"];

    return (
        <>
            {values.map((val, i) => {
                const valFrame = frame - (countStart + i * 15);
                if (valFrame < 0 || valFrame > 15) return null;

                const pop = spring({
                    frame: valFrame,
                    fps,
                    config: { damping: 10, stiffness: 200 },
                });

                const scale = interpolate(pop, [0, 1], [2, 1]);
                const opacity = interpolate(valFrame, [0, 5, 12, 15], [0, 1, 1, 0], {
                    extrapolateRight: "clamp",
                });

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "35%",
                            transform: `translate(-50%, -50%) scale(${scale})`,
                            opacity,
                            fontSize: val === "GO!" ? 72 : 100,
                            fontWeight: 900,
                            color: val === "GO!" ? "#10B981" : "#FCD34D",
                            fontFamily: "Inter, sans-serif",
                            textShadow: `0 0 30px ${val === "GO!" ? "rgba(16, 185, 129, 0.8)" : "rgba(255, 215, 0, 0.8)"}`,
                        }}
                    >
                        {val}
                    </div>
                );
            })}
        </>
    );
};

// Main Tournament VS composition
export const TournamentVS = ({
    player1 = { name: "Player 1", avatar: "🎮", gems: 1000 },
    player2 = { name: "Player 2", avatar: "🎯", gems: 1200 },
    prizePool = 500,
}) => {
    return (
        <AbsoluteFill style={{ background: "transparent" }}>
            {/* Dark dramatic overlay */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 80%)",
                }}
            />

            {/* Player cards */}
            <PlayerCard name={player1.name} avatar={player1.avatar} gems={player1.gems} side="left" />
            <PlayerCard name={player2.name} avatar={player2.avatar} gems={player2.gems} side="right" />

            {/* VS text */}
            <VSText />

            {/* Prize pool */}
            <PrizePool amount={prizePool} />

            {/* Countdown */}
            <Countdown />
        </AbsoluteFill>
    );
};

export default TournamentVS;
