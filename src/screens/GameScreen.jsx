import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNotification } from "../components/Notifications";
import "./GameScreen.css";

const PVP_POWERUPS = [
    { type: "quickdaub", icon: "🎯", cost: 50, label: "Quick Daub", desc: "Daubs a random number on your card instantly." },
    { type: "peek", icon: "👁️", cost: 60, label: "Peek", desc: "Instantly see the next ball before it's called." },
    { type: "wild", icon: "🃏", cost: 100, label: "Wild", desc: "Automatically daubs two random numbers!" },
    { type: "doublexp", icon: "✨", cost: 75, label: "2x XP", desc: "Doubles the XP earned from this game." },
    { type: "freeze", icon: "🧊", cost: 120, label: "Freeze Ray", desc: "Freeze an opponent's card for 7 seconds!", needsTarget: true },
    { type: "shuffle", icon: "🌀", cost: 100, label: "Chaos Scramble", desc: "Change one random undaubed number on an opponent's card!", needsTarget: true },
    { type: "undaub", icon: "🚫", cost: 110, label: "Undaub", desc: "Remove a daubed number from an opponent's card!", needsTarget: true },
    { type: "shield", icon: "🛡️", cost: 90, label: "Titan Shield", desc: "Protect yourself from attacks for 30 seconds!", needsTarget: false },
];

// Specific patterns for pattern mode - cells are [row, col] pairs converted to flat index
const SPECIFIC_PATTERNS = {
    "diagonal_down": { name: "Diagonal ↘", emoji: "↘️", cells: [0, 6, 12, 18, 24] },
    "diagonal_up": { name: "Diagonal ↗", emoji: "↗️", cells: [20, 16, 12, 8, 4] },
    "x_shape": { name: "X Pattern", emoji: "❌", cells: [0, 4, 6, 8, 12, 16, 18, 20, 24] },
    "four_corners": { name: "Four Corners", emoji: "📐", cells: [0, 4, 20, 24] },
    "top_row": { name: "Top Row", emoji: "⬆️", cells: [0, 1, 2, 3, 4] },
    "bottom_row": { name: "Bottom Row", emoji: "⬇️", cells: [20, 21, 22, 23, 24] },
    "middle_row": { name: "Middle Row", emoji: "➡️", cells: [10, 11, 12, 13, 14] },
    "left_column": { name: "B Column", emoji: "🅱️", cells: [0, 5, 10, 15, 20] },
    "right_column": { name: "O Column", emoji: "🅾️", cells: [4, 9, 14, 19, 24] },
    "t_top": { name: "T Shape ⊤", emoji: "🇹", cells: [0, 1, 2, 3, 4, 7, 12, 17, 22] },
    "t_bottom": { name: "T Shape ⊥", emoji: "🇹", cells: [2, 7, 12, 17, 20, 21, 22, 23, 24] },
    "l_shape": { name: "L Shape", emoji: "🇱", cells: [0, 5, 10, 15, 20, 21, 22, 23, 24] },
    "plus": { name: "Plus +", emoji: "➕", cells: [2, 7, 10, 11, 12, 13, 14, 17, 22] },
    "frame": { name: "Frame", emoji: "🖼️", cells: [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24] },
    "diamond": { name: "Diamond", emoji: "💎", cells: [2, 6, 8, 10, 12, 14, 16, 18, 22] },
    "line": { name: "5 IN A ROW", emoji: "➖", cells: [10, 11, 12, 13, 14] }, // fallback for line mode
};

const getLetter = (num) => {
    if (typeof num === "string") return "";
    if (num <= 15) return "B";
    if (num <= 30) return "I";
    if (num <= 45) return "N";
    if (num <= 60) return "G";
    return "O";
};

function getRankEmoji(rank) {
    switch (rank) {
        case 1: return "🥇";
        case 2: return "🥈";
        case 3: return "🥉";
        default: return `#${rank}`;
    }
}

export default function GameScreen({ userId, roomId, onLeave }) {
    const [message, setMessage] = useState("");
    const [mobileTab, setMobileTab] = useState("race"); // 'race', 'powerups', 'chat'
    const [showMobileOverlay, setShowMobileOverlay] = useState(false);
    const [peekedNumber, setPeekedNumber] = useState(null);
    const [cooldowns, setCooldowns] = useState({});
    const [targeting, setTargeting] = useState(null); // { type, cost, label }
    const [now, setNow] = useState(Date.now());
    const [expandedPlayer, setExpandedPlayer] = useState(null); // For viewing opponent cards large
    const { showNotification } = useNotification();
    const celebrationTriggered = useRef(false);

    const user = useQuery(api.users.getUser, { userId });
    const roomDetails = useQuery(api.rooms.getRoomDetails, { roomId });
    const gameState = useQuery(api.games.getGameState, { roomId });
    const myCard = useQuery(api.games.getMyCard, { roomId, userId });
    const messages = useQuery(api.chat.getMessages, { roomId });
    const reactions = useQuery(api.chat.getReactions);
    const recentPowerups = useQuery(api.powerups.getRecentPowerups,
        gameState?._id ? { gameId: gameState._id } : "skip"
    );
    const activeBoss = useQuery(api.boss.getActiveBoss, { roomId });

    const isHost = roomDetails?.hostId === userId;
    const isPlaying = roomDetails?.status === "playing";
    const isFinished = roomDetails?.status === "finished";
    const isBossBattleActive = activeBoss?.status === "active";

    const startGame = useMutation(api.games.startGame);
    const claimBingo = useMutation(api.games.claimBingo);
    const daubNumber = useMutation(api.games.daubNumber);
    const usePowerup = useMutation(api.powerups.usePowerup);
    const sendMessage = useMutation(api.chat.sendMessage);
    const sendReaction = useMutation(api.chat.sendReaction);
    const leaveRoom = useMutation(api.rooms.leaveRoom);
    const joinBossBattle = useMutation(api.boss.joinBossBattle);
    const startBossBattle = useMutation(api.boss.startBossBattle);
    const daubBossNumber = useMutation(api.boss.daubBossNumber);
    const bossCallNumber = useMutation(api.boss.bossCallNumber);
    const useBossPowerup = useMutation(api.boss.useBossPowerup);
    const claimDailyReward = useMutation(api.daily.claimDailyReward);
    const selectBossVote = useMutation(api.boss.selectBossVote);
    const checkSelectionExpiry = useMutation(api.boss.checkSelectionExpiry);
    const claimBossBingo = useMutation(api.boss.claimBossBingo);

    // Boss selection phase query
    const bossSelectionPhase = useQuery(api.boss.getBossSelectionPhase, { roomId });

    // Track displayed damage events to prevent re-animating
    const [displayedDamageIds, setDisplayedDamageIds] = useState(new Set());
    const [floatingDamage, setFloatingDamage] = useState([]); // [{id, userName, avatar, damage, x, y}]

    const handleTopUp = async () => {
        const result = await claimDailyReward({ userId });
        if (result.success) {
            showNotification(`Top-up successful! Received ${result.amount} Gems. 💎`, "success");
        } else {
            showNotification(result.error, "error");
        }
    };

    const chatRef = useRef(null);

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    // Show notifications for new system messages (but not on initial load)
    const lastMessageCount = useRef(0);
    const hasInitialized = useRef(false);
    useEffect(() => {
        if (!messages) return;

        // On first load, just set the baseline count without showing notifications
        if (!hasInitialized.current) {
            lastMessageCount.current = messages.length;
            hasInitialized.current = true;
            return;
        }

        // Only show notifications for truly NEW messages after initial load
        if (messages.length > lastMessageCount.current) {
            const newMessages = messages.slice(lastMessageCount.current);
            newMessages.forEach(msg => {
                if (msg.type === "system" && msg.userId !== userId) {
                    showNotification(msg.content, "info");
                }
            });
            lastMessageCount.current = messages.length;
        }
    }, [messages, userId, showNotification]);

    const handleStartGame = async () => {
        if (!roomDetails) return;
        await startGame({ roomId, hostId: userId });
    };

    const handleClaimBingo = async () => {
        // Boss battle mode - use boss-specific bingo
        if (activeBoss?.status === "active") {
            try {
                const result = await claimBossBingo({ roomId, odId: userId });
                if (!result.success) {
                    showNotification(result.error || "Not a valid bingo!", "error");
                } else {
                    showNotification(`💥 BINGO! ${result.damage} MASSIVE DAMAGE to the boss!`, "success");
                    if (result.victory) {
                        showNotification("🏆 VICTORY! Boss defeated!", "success");
                    }
                }
            } catch (err) {
                console.error("claimBossBingo error:", err);
                showNotification("Error claiming bingo", "error");
            }
            return;
        }

        // Regular game bingo
        if (!gameState) return;
        const result = await claimBingo({ gameId: gameState._id, userId });
        if (!result.success) {
            showNotification(result.error || "Not a valid bingo!", "error");
        } else {
            showNotification(`BINGO! You earned ${result.xpEarned} XP and ${result.coinsEarned} Gems!`, "success");
            if (result.levelUp) {
                showNotification("LEVEL UP!", "success");
            }
        }
    };

    const handleUsePowerup = async (type, targetId) => {
        // Boss battle mode - use boss-specific powerups
        if (activeBoss?.status === "active") {
            // Only allow boss-compatible powerups
            const bossPowerups = ["quickdaub", "wild", "freeze", "shield"];
            if (!bossPowerups.includes(type)) {
                showNotification("This power-up isn't available during boss battles!", "error");
                return;
            }

            try {
                const result = await useBossPowerup({
                    roomId,
                    userId,
                    type,
                });
                if (result.success) {
                    showNotification(`Power-up activated!`, "info");
                } else {
                    showNotification(result.error || "Failed to use power-up", "error");
                }
            } catch (error) {
                console.error("Failed to use boss power-up:", error);
            }
            return;
        }

        // Regular game mode
        if (!gameState) return;

        const poConfig = PVP_POWERUPS.find(p => p.type === type);
        if (poConfig?.needsTarget && !targetId) {
            setTargeting(poConfig);
            showNotification(`Select a target for ${poConfig.label}!`, "info");
            return;
        }

        try {
            const result = await usePowerup({
                gameId: gameState._id,
                userId,
                type,
                targetUserId: targetId
            });
            if (result.success) {
                setTargeting(null);
                if (type === "peek" && result.peekedNumber) {
                    setPeekedNumber(result.peekedNumber);
                    showNotification(`The next ball is ${result.peekedNumber}!`, "info");
                } else {
                    showNotification(`Power-up activated!`, "info");
                }
            } else {
                setTargeting(null);
                showNotification(result.error || "Failed to use power-up", "error");
            }
        } catch (error) {
            setTargeting(null);
            console.error("Failed to use power-up:", error);
        }
    };


    // Reset peek when a new ball is called
    useEffect(() => {
        setPeekedNumber(null);
    }, [gameState?.currentNumber]);

    // Power-up cooldowns
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const newCooldowns = {};

            gameState?.powerupHistory?.forEach(p => {
                if (p.sourceUserId === userId) {
                    const timeSince = now - p.usedAt;
                    const remaining = Math.max(0, Math.ceil((60000 - timeSince) / 1000));
                    if (remaining > 0) {
                        if (!newCooldowns[p.type] || remaining > newCooldowns[p.type]) {
                            newCooldowns[p.type] = remaining;
                        }
                    }
                }
            });
            setCooldowns(newCooldowns);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState?.powerupHistory, userId]);

    // Global timer pulse
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        await sendMessage({ roomId, userId, content: message.trim() });
        setMessage("");
    };

    const handleReaction = async (reaction) => {
        await sendReaction({ roomId, userId, reaction });
    };

    const handleLeave = async () => {
        await leaveRoom({ roomId, userId });
        onLeave();
    };

    const handleJoinBoss = async (level) => {
        const result = await joinBossBattle({ userId, roomId, bossLevel: level });
        if (result.success) {
            showNotification(`Ready for battle! Wager placed. ⚔️`, "success");
        } else {
            showNotification(result.error, "error");
        }
    };

    const handleStartBossAction = async () => {
        const result = await startBossBattle({ roomId });
        if (!result.success) {
            showNotification(result.error, "error");
        }
    };

    // Handle voting for a boss
    const handleVoteBoss = async (level) => {
        const result = await selectBossVote({ roomId, odId: userId, bossLevel: level });
        if (!result.success) {
            showNotification(result.error, "error");
        } else if (result.consensus) {
            showNotification(`Battle starting! 💥`, "success");
        }
    };

    // Check selection phase expiry periodically
    useEffect(() => {
        if (!bossSelectionPhase || bossSelectionPhase.status !== "selecting") return;

        const interval = setInterval(() => {
            checkSelectionExpiry({ roomId });
        }, 1000);

        return () => clearInterval(interval);
    }, [bossSelectionPhase?.status, roomId, checkSelectionExpiry]);

    // Damage animation effect - triggers floating damage numbers
    useEffect(() => {
        if (!activeBoss?.damageEvents) return;

        const newEvents = activeBoss.damageEvents.filter(
            ev => !displayedDamageIds.has(ev.timestamp)
        );

        if (newEvents.length > 0) {
            // Mark these as displayed
            const newIds = new Set(displayedDamageIds);
            newEvents.forEach(ev => newIds.add(ev.timestamp));
            setDisplayedDamageIds(newIds);

            // Create floating damage numbers
            const newFloaters = newEvents.map(ev => ({
                id: ev.timestamp,
                userName: ev.userName,
                avatar: ev.userAvatar,
                damage: ev.damage,
                isMine: ev.odId === userId,
                x: 50 + (Math.random() - 0.5) * 30, // Random x position (%)
                y: 30 + Math.random() * 20, // Random y position (%)
            }));

            setFloatingDamage(prev => [...prev, ...newFloaters]);

            // Remove after animation completes
            setTimeout(() => {
                setFloatingDamage(prev =>
                    prev.filter(f => !newEvents.some(ev => ev.timestamp === f.id))
                );
            }, 2000);
        }
    }, [activeBoss?.damageEvents, displayedDamageIds, userId]);

    // Host handles boss number calls
    useEffect(() => {
        if (!isHost || activeBoss?.status !== "active") return;

        const interval = setInterval(() => {
            bossCallNumber({ roomId });
        }, 1500); // Hyper speed calling

        return () => clearInterval(interval);
    }, [isHost, activeBoss?.status, roomId]);

    const handleCellClick = async (num) => {
        if (num === "FREE") return; // Can't click free space

        // Boss battle mode
        if (activeBoss?.status === "active") {
            await daubBossNumber({ roomId, userId, number: num });
            return;
        }

        // Regular game mode
        if (isPlaying && gameState?._id) {
            await daubNumber({ gameId: gameState._id, userId, number: num });
        }
    };



    // Show loading while data is being fetched
    if (!roomDetails || !user) {
        return (
            <div className="game-screen loading-screen">
                <div className="loading-content">
                    <span className="loading-spinner">🎱</span>
                    <p>Loading game...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="game-screen">
            {/* Header */}
            <header className="game-header">
                <button className="btn-back" onClick={handleLeave}>← Leave</button>
                <div className="room-info-header">
                    <span className="room-code">{roomDetails?.code}</span>
                    <span className="room-name-small">{roomDetails?.name}</span>
                </div>
                <div className="player-count">
                    👥 {roomDetails?.players?.length || 0}
                </div>
            </header>

            <div className="game-layout">
                {/* Left: Race Tracker + Players + Power-ups */}
                <aside className="game-sidebar">
                    <div className="race-tracker">
                        <h3>🏁 Race to Bingo</h3>
                        <div className="race-list">
                            {gameState?.players?.map((player, index) => {
                                const isFrozen = player.frozenUntil && player.frozenUntil > Date.now();
                                const isShielded = player.shieldUntil && player.shieldUntil > Date.now();
                                const isRecentlyScrambled = player.scrambledAt && (Date.now() - player.scrambledAt < 3000);

                                // Find recent powerup used by this player
                                const recentPowerup = recentPowerups?.find(p => p.sourceUserId === player.odId);
                                const powerupIcons = {
                                    quickdaub: "🎯",
                                    wild: "🃏",
                                    doublexp: "✨",
                                    peek: "👁️",
                                    freeze: "🧊",
                                    shuffle: "🌀",
                                    blind: "😵",
                                    shield: "🛡️",
                                    undaub: "🚫",
                                };

                                return (
                                    <div
                                        key={player.odId || player._id}
                                        className={`race-row ${player.odId === userId ? "is-me" : ""} ${targeting ? "clickable-target" : ""} ${isRecentlyScrambled ? "victim-scramble" : ""} ${player.isBot ? "is-bot" : ""}`}
                                        onClick={() => targeting && player.odId !== userId && !player.isBot && handleUsePowerup(targeting.type, player.odId)}
                                    >
                                        <span className="race-rank">{getRankEmoji(index + 1)}</span>
                                        <div className="avatar-wrapper">
                                            <span className="race-avatar">{player.avatar}</span>
                                            {player.isBot && <span className="bot-badge">🤖</span>}
                                            {isFrozen && <span className="status-mini-icon">🧊</span>}
                                            {isShielded && <span className="status-mini-icon">🛡️</span>}
                                            {isRecentlyScrambled && <span className="status-mini-icon scramble-pulse">🌀</span>}
                                            {recentPowerup && (
                                                <span className="powerup-indicator" title={`Used ${recentPowerup.type}`}>
                                                    {powerupIcons[recentPowerup.type] || "⚡"}
                                                </span>
                                            )}
                                        </div>
                                        <span className="race-name">{player.name}</span>
                                        <div className="race-visual">
                                            <div
                                                className="mini-card-grid clickable"
                                                onClick={(e) => {
                                                    // Don't open expanded view when targeting a powerup
                                                    if (targeting) {
                                                        e.stopPropagation();
                                                        return;
                                                    }
                                                    setExpandedPlayer(player);
                                                }}
                                                title={targeting ? "Click player row to use power-up" : "Click to view full card"}
                                            >
                                                {player.card?.map((row, rIdx) => (
                                                    row.map((cell, cIdx) => (
                                                        <div
                                                            key={`${rIdx}-${cIdx}`}
                                                            className={`mini-cell ${cell.daubed ? 'daubed' : ''} ${cell.value === 'FREE' ? 'is-free' : ''}`}
                                                        >
                                                            {cell.value === 'FREE' ? '⭐' : cell.value}
                                                        </div>
                                                    ))
                                                ))}
                                                <div className="expand-hint">🔍</div>
                                            </div>
                                            <div className="race-stats">
                                                <div className="race-progress">
                                                    <div
                                                        className="race-bar"
                                                        style={{ width: `${((5 - player.distanceToBingo) / 5) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="race-distance">{player.distanceToBingo} away</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="powerups-panel">
                        <h3>⚡ Power-ups</h3>
                        <div className="powerups-grid">
                            {PVP_POWERUPS.map((po) => {
                                const cooldown = cooldowns[po.type];
                                return (
                                    <button
                                        key={po.type}
                                        className={`powerup-btn ${cooldown ? 'on-cooldown' : ''} ${targeting?.type === po.type ? 'active-targeting' : ''}`}
                                        onClick={() => handleUsePowerup(po.type)}
                                        disabled={(!isPlaying && !isBossBattleActive) || (user?.coins || 0) < po.cost || !!cooldown}
                                        title={`${po.label}: ${po.desc} (${po.cost} Gems)${cooldown ? ` - ${cooldown}s left` : ''}`}
                                    >
                                        <span className="p-icon">{po.icon}</span>
                                        <span className="p-label text-[0.6rem] font-bold leading-tight">{po.label}</span>
                                        <span className="p-cost">{po.cost}</span>
                                        {cooldown > 0 && (
                                            <div className="cooldown-overlay">{cooldown}s</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="user-gems">
                            💎 {user?.coins || 0} Gems
                        </div>
                        {targeting && (
                            <button className="cancel-targeting" onClick={() => setTargeting(null)}>
                                Cancel {targeting.label}
                            </button>
                        )}
                    </div>

                    {/* Chat */}
                    <div className="chat-panel">
                        <h3>💬 Chat</h3>
                        <div className="chat-messages" ref={chatRef}>
                            {messages?.map((msg) => (
                                <div
                                    key={msg._id}
                                    className={`chat-msg ${msg.type} ${msg.userId === userId ? "is-me" : ""}`}
                                >
                                    {msg.type !== "system" && (
                                        <span className="msg-avatar">{msg.userAvatar}</span>
                                    )}
                                    <div className="msg-content">
                                        {msg.type !== "system" && (
                                            <span className="msg-name">{msg.userName}</span>
                                        )}
                                        <span className="msg-text">{msg.content}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="chat-reactions">
                            {reactions?.map((r) => (
                                <button key={r} className="reaction-btn" onClick={() => handleReaction(r)}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        <form className="chat-input" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Say something..."
                                maxLength={200}
                            />
                            <button type="submit">Send</button>
                        </form>
                    </div>
                </aside>

                {/* ==== MOBILE-ONLY SECTIONS (Visible on small screens) ==== */}

                {/* Mobile Power-ups Quick Bar - Always visible during game */}
                <div className="mobile-powerups-bar">
                    <div className="powerups-scroll">
                        {PVP_POWERUPS.map((po) => {
                            const cooldown = cooldowns[po.type];
                            const isTargetingThis = targeting?.type === po.type;
                            return (
                                <button
                                    key={po.type}
                                    className={`mobile-powerup-btn ${cooldown ? 'on-cooldown' : ''} ${isTargetingThis ? 'active-targeting' : ''}`}
                                    onClick={() => handleUsePowerup(po.type)}
                                    disabled={(!isPlaying && !isBossBattleActive) || (user?.coins || 0) < po.cost || !!cooldown}
                                    title={po.desc}
                                >
                                    <span className="mp-icon">{po.icon}</span>
                                    <span className="mp-cost">{po.cost}</span>
                                    {cooldown > 0 && <div className="mp-cooldown">{cooldown}</div>}
                                </button>
                            );
                        })}
                    </div>
                    {targeting && (
                        <div className="targeting-banner">
                            <span className="targeting-icon">{targeting.icon || '🎯'}</span>
                            <div className="targeting-info">
                                <span className="targeting-label">{targeting.label}</span>
                                <span className="targeting-hint">👆 Tap an opponent below to target</span>
                            </div>
                            <button className="targeting-cancel" onClick={() => setTargeting(null)}>✕</button>
                        </div>
                    )}
                </div>

                {/* Mobile Opponents Strip - Always visible when targeting */}
                <div className={`mobile-opponents-strip ${targeting ? 'is-targeting' : ''}`}>
                    <div className="opponents-scroll">
                        {gameState?.players?.filter(p => p.odId !== userId).map((player) => {
                            const isFrozen = player.frozenUntil && player.frozenUntil > Date.now();
                            const isShielded = player.shieldUntil && player.shieldUntil > Date.now();
                            const isTargetable = targeting && !player.isBot;
                            return (
                                <div
                                    key={player.odId}
                                    className={`mobile-opponent-card ${isTargetable ? 'targetable' : ''} ${isFrozen ? 'frozen' : ''} ${isShielded ? 'shielded' : ''}`}
                                    onClick={() => isTargetable && handleUsePowerup(targeting.type, player.odId)}
                                >
                                    <div className="mo-header">
                                        <span className="mo-avatar">{player.avatar}</span>
                                        {isFrozen && <span className="mo-status">🧊</span>}
                                        {isShielded && <span className="mo-status">🛡️</span>}
                                    </div>
                                    <span className="mo-name">{player.name?.split(' ')[0] || 'Player'}</span>
                                    <div className="mo-mini-grid">
                                        {player.card?.map((row, rIdx) => (
                                            row.map((cell, cIdx) => (
                                                <div
                                                    key={`${rIdx}-${cIdx}`}
                                                    className={`mo-cell ${cell.daubed ? 'daubed' : ''}`}
                                                />
                                            ))
                                        ))}
                                    </div>
                                    <span className="mo-distance">{player.distanceToBingo} away</span>
                                </div>
                            );
                        })}
                        {(!gameState?.players || gameState.players.filter(p => p.odId !== userId).length === 0) && (
                            <div className="no-opponents">Waiting for opponents...</div>
                        )}
                    </div>
                </div>

                {/* Mobile Bottom Navigation - Simplified to just Race and Chat */}
                <div className="mobile-nav">
                    <button
                        className={`mobile-nav-btn ${mobileTab === 'race' ? 'active' : ''}`}
                        onClick={() => { setMobileTab('race'); setShowMobileOverlay(true); }}
                    >
                        <span className="nav-icon">🏁</span>
                        <span className="nav-label">Race</span>
                    </button>
                    <div className="mobile-gems-display">
                        💎 {user?.coins || 0}
                    </div>
                    <button
                        className={`mobile-nav-btn ${mobileTab === 'chat' ? 'active' : ''}`}
                        onClick={() => { setMobileTab('chat'); setShowMobileOverlay(true); }}
                    >
                        <span className="nav-icon">💬</span>
                        <span className="nav-label">Chat</span>
                    </button>
                </div>

                {/* Mobile Overlay */}
                {showMobileOverlay && (
                    <div className="mobile-overlay" onClick={() => setShowMobileOverlay(false)}>
                        <div className="mobile-overlay-content" onClick={(e) => e.stopPropagation()}>
                            <div className="mobile-overlay-header">
                                <h3>{mobileTab === 'race' ? '🏁 Race' : mobileTab === 'powerups' ? '⚡ Power-ups' : '💬 Chat'}</h3>
                                <button className="close-btn" onClick={() => setShowMobileOverlay(false)}>✕</button>
                            </div>
                            <div className="mobile-overlay-body">
                                {mobileTab === 'race' && (
                                    <div className="race-list">
                                        {gameState?.players?.map((player, index) => (
                                            <div
                                                key={player.odId}
                                                className={`race-row ${player.odId === userId ? 'is-me' : ''}`}
                                            >
                                                <span className="race-rank">{getRankEmoji(index + 1)}</span>
                                                <span className="race-avatar">{player.avatar}</span>
                                                <span className="race-name">{player.name}</span>
                                                <div className="race-visual">
                                                    <div className="mini-card-grid">
                                                        {player.card?.map((row, rIdx) => (
                                                            row.map((cell, cIdx) => (
                                                                <div
                                                                    key={`${rIdx}-${cIdx}`}
                                                                    className={`mini-cell ${cell.daubed ? 'daubed' : ''} ${cell.value === 'FREE' ? 'is-free' : ''}`}
                                                                >
                                                                    {cell.value === 'FREE' ? '⭐' : cell.value}
                                                                </div>
                                                            ))
                                                        ))}
                                                    </div>
                                                    <div className="race-stats">
                                                        <div className="race-progress">
                                                            <div
                                                                className="race-bar"
                                                                style={{ width: `${((5 - player.distanceToBingo) / 5) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="race-distance">{player.distanceToBingo} away</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {mobileTab === 'powerups' && (
                                    <>
                                        <div className="powerups-grid">
                                            {PVP_POWERUPS.map((po) => {
                                                const cooldown = cooldowns[po.type];
                                                return (
                                                    <button
                                                        key={po.type}
                                                        className={`powerup-btn ${cooldown ? 'on-cooldown' : ''} ${targeting?.type === po.type ? 'active-targeting' : ''}`}
                                                        onClick={() => handleUsePowerup(po.type)}
                                                        disabled={(!isPlaying && !isBossBattleActive) || (user?.coins || 0) < po.cost || !!cooldown}
                                                        title={`${po.label}: ${po.desc} (${po.cost} Gems)${cooldown ? ` - ${cooldown}s left` : ''}`}
                                                    >
                                                        <span className="p-icon">{po.icon}</span>
                                                        <div className="p-info-mobile">
                                                            <span className="p-label">{po.label}</span>
                                                            <span className="p-desc-mobile">{po.desc}</span>
                                                        </div>
                                                        <span className="p-cost">{po.cost} 💎</span>
                                                        {cooldown > 0 && (
                                                            <div className="cooldown-overlay">{cooldown}s</div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                            {user?.coins < 100 && (
                                                <button className="topup-btn pulse-anim" onClick={handleTopUp}>
                                                    🆘 Emergency Top-up
                                                </button>
                                            )}
                                        </div>
                                        <div className="user-bank-mobile">
                                            Your Balance: 💎 {user?.coins || 0} Gems
                                        </div>
                                        {targeting && (
                                            <button className="cancel-targeting-mobile" onClick={() => { setTargeting(null); setShowMobileOverlay(false); }}>
                                                Cancel {targeting.label} (Select Target in Race)
                                            </button>
                                        )}
                                    </>
                                )}
                                {mobileTab === 'chat' && (
                                    <>
                                        <div className="chat-messages" ref={chatRef}>
                                            {messages?.map((msg) => (
                                                <div
                                                    key={msg._id}
                                                    className={`chat-msg ${msg.type} ${msg.userId === userId ? 'is-me' : ''}`}
                                                >
                                                    {msg.type !== 'system' && (
                                                        <span className="msg-avatar">{msg.userAvatar}</span>
                                                    )}
                                                    <div className="msg-content">
                                                        {msg.type !== 'system' && (
                                                            <span className="msg-name">{msg.userName}</span>
                                                        )}
                                                        <span className="msg-text">{msg.content}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="chat-reactions">
                                            {reactions?.map((r) => (
                                                <button key={r} className="reaction-btn" onClick={() => handleReaction(r)}>
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                        <form className="chat-input" onSubmit={handleSendMessage}>
                                            <input
                                                type="text"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="Say something..."
                                                maxLength={200}
                                            />
                                            <button type="submit">Send</button>
                                        </form>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Center: Game Area */}
                <main className="game-main">
                    {/* Pattern Indicator */}
                    {(isPlaying || roomDetails?.status === "waiting" || isFinished) && (() => {
                        // Determine pattern based on game mode
                        let patternKey;
                        const mode = roomDetails?.mode || "classic";

                        if (mode === "blackout") {
                            patternKey = "blackout";
                        } else if (mode === "pattern") {
                            // For pattern mode, use the specific pattern from gameState, or show loading
                            patternKey = gameState?.pattern || null;
                        } else {
                            // Classic or speed mode - simple line
                            patternKey = "line";
                        }

                        // Don't show indicator if pattern mode but pattern not yet loaded
                        if (patternKey === null) {
                            return (
                                <div className="pattern-indicator">
                                    <span className="pattern-label">Goal:</span>
                                    <span className="pattern-name">🎨 Loading pattern...</span>
                                </div>
                            );
                        }

                        const isBlackout = patternKey === "blackout";
                        const patternData = SPECIFIC_PATTERNS[patternKey] || SPECIFIC_PATTERNS["line"];

                        return (
                            <div className="pattern-indicator">
                                <span className="pattern-label">Goal:</span>
                                {isBlackout ? (
                                    <>
                                        <div className="pattern-mini-grid blackout">
                                            {[...Array(25)].map((_, i) => (
                                                <div key={i} className="pattern-cell filled" />
                                            ))}
                                        </div>
                                        <span className="pattern-name">BLACKOUT</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="pattern-mini-grid">
                                            {[...Array(25)].map((_, i) => {
                                                const isHighlight = patternData.cells.includes(i);
                                                return <div key={i} className={`pattern-cell ${isHighlight ? "filled" : ""}`} />;
                                            })}
                                        </div>
                                        <span className="pattern-name">{patternData.emoji} {patternData.name}</span>
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    {/* Number Caller */}
                    <div className="caller-display">
                        {isPlaying && gameState?.currentNumber ? (
                            <>
                                <div className="current-number">
                                    <span className="number-letter">{getLetter(gameState.currentNumber)}</span>
                                    <span className="number-value">{gameState.currentNumber}</span>
                                </div>
                                <div className="called-history">
                                    {(gameState.calledNumbers || []).slice(-10).reverse().map((num, i) => (
                                        <span key={i} className="called-num">{num}</span>
                                    ))}
                                </div>
                            </>
                        ) : activeBoss?.status === "active" ? (
                            <div className="boss-battle-stats">
                                <div className="boss-health-container">
                                    <div className="boss-name-tag">👹 BOSS HP: {activeBoss.health}/{activeBoss.maxHealth}</div>
                                    <div className="boss-timer">
                                        ⏳ {Math.max(0, Math.ceil((activeBoss.expiresAt - now) / 1000))}s REMAINING
                                    </div>
                                    <div className="boss-hp-bar">
                                        <div
                                            className={`boss-hp-fill ${floatingDamage.length > 0 ? 'shake' : ''}`}
                                            style={{ width: `${(activeBoss.health / activeBoss.maxHealth) * 100}%` }}
                                        />
                                    </div>

                                    {/* Floating Damage Numbers */}
                                    <div className="floating-damage-container">
                                        {floatingDamage.map(dmg => (
                                            <div
                                                key={dmg.id}
                                                className={`floating-damage ${dmg.isMine ? 'is-mine' : 'is-teammate'}`}
                                                style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}
                                            >
                                                <span className="damage-avatar">{dmg.avatar}</span>
                                                <span className="damage-number">-{dmg.damage}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="boss-numbers-active">
                                    {(activeBoss.calledNumbers || []).slice(-10).reverse().map((num, i) => (
                                        <span key={i} className="boss-num animate-pop">{num}</span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="waiting-display">
                                {isFinished ? (
                                    <div className="game-over-header">
                                        <div className="winner-display">
                                            <span className="winner-emoji">🏆</span>
                                            <span className="winner-text">
                                                {gameState?.winner?.name || "Someone"} WON THE TOURNAMENT!
                                            </span>
                                        </div>
                                        {(!activeBoss || activeBoss?.status === "preparing") && (
                                            <div className="boss-intro">
                                                <h3>🔥 BOSS CHALLENGE PHASE 🔥</h3>
                                                <p>Wager together to defeat the titan!</p>
                                            </div>
                                        )}
                                        {activeBoss?.status === "won" && (
                                            <div className="boss-victory">
                                                <span className="v-icon">✨</span>
                                                <span className="v-text">BOSS DEFEATED!</span>
                                                <button className="btn btn-primary btn-large" onClick={handleStartGame} style={{ marginTop: '16px' }}>
                                                    🔄 Start New Match
                                                </button>
                                            </div>
                                        )}
                                        {activeBoss?.status === "lost" && (
                                            <div className="boss-defeat">
                                                <span className="v-icon">💀</span>
                                                <span className="v-text">THE BOSS ESCAPED...</span>
                                                <button className="btn btn-primary btn-large" onClick={handleStartGame} style={{ marginTop: '16px' }}>
                                                    🔄 Start New Match
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span>Waiting to start...</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Cards Row - Main card + Opponents side by side */}
                    <div className="cards-row">
                        {/* Bingo Card */}
                        <div className="bingo-card-wrapper">
                            <div className="card-header">
                                <span style={{ background: "#3498db" }}>B</span>
                                <span style={{ background: "#2ecc71" }}>I</span>
                                <span style={{ background: "#9b59b6" }}>N</span>
                                <span style={{ background: "#e67e22" }}>G</span>
                                <span style={{ background: "#e74c3c" }}>O</span>
                            </div>
                            <div className="bingo-card">
                                {gameState?.players?.find(p => p.odId === userId)?.frozenUntil > Date.now() && (
                                    <div className="freeze-overlay anim-shimmer">
                                        <span className="freeze-icon">🧊</span>
                                        <span className="freeze-text">FROZEN!</span>
                                    </div>
                                )}
                                {gameState?.players?.find(p => p.odId === userId)?.scrambledAt > Date.now() - 3000 && (
                                    <div className="scramble-overlay glitch-shiver">
                                        <span className="scramble-icon">🌀</span>
                                        <span className="scramble-text">RE-SHUFFLED!</span>
                                    </div>
                                )}
                                {myCard?.map((row, rowIndex) =>
                                    row.map((cell, colIndex) => {
                                        const isCalled = activeBoss?.status === "active"
                                            ? (activeBoss.calledNumbers || []).includes(cell.value)
                                            : (gameState?.calledNumbers || []).includes(cell.value);
                                        const isPeeked = cell.value === peekedNumber;
                                        const isScrambling = gameState?.players?.find(p => p.odId === userId)?.scrambledAt > Date.now() - 2000;
                                        const scrambleDelay = (rowIndex * 5 + colIndex) * 50; // Staggered delay per cell
                                        return (
                                            <div
                                                key={`${rowIndex}-${colIndex}`}
                                                className={`bingo-cell ${isCalled ? "called" : ""} ${cell.daubed ? "daubed" : ""
                                                    } ${cell.value === "FREE" ? "free-space" : ""} ${isPeeked ? "peeked-highlight" : ""} ${isScrambling && !cell.daubed && cell.value !== "FREE" ? "scrambling" : ""}`}
                                                onClick={() => isCalled && handleCellClick(cell.value)}
                                                style={{
                                                    cursor: isCalled && !cell.daubed ? "pointer" : "default",
                                                    animationDelay: isScrambling ? `${scrambleDelay}ms` : "0ms"
                                                }}
                                            >
                                                {cell.value === "FREE" ? "⭐" : cell.value}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Game Controls */}
                    <div className="game-controls">
                        {!isPlaying && !isFinished && (
                            <button className="btn btn-primary btn-large" onClick={handleStartGame}>
                                ▶️ Start Game
                            </button>
                        )}
                        {!isPlaying && !isFinished && roomDetails?.players?.length === 1 && (
                            <div className="solo-hint">You can start solo or wait for others to join!</div>
                        )}
                        {(isPlaying || isBossBattleActive) && (
                            <button className="btn btn-accent btn-large" onClick={handleClaimBingo}>
                                🎉 BINGO!
                            </button>
                        )}
                        {isFinished && !activeBoss?.status && (
                            <div className="boss-battle-selection">
                                {/* Timer bar - shows when selection phase is active */}
                                {bossSelectionPhase?.status === "selecting" && (
                                    <div className="selection-timer-bar">
                                        <div
                                            className="timer-fill"
                                            style={{
                                                width: `${Math.max(0, ((bossSelectionPhase.expiresAt - now) / 10000) * 100)}%`
                                            }}
                                        />
                                        <span className="timer-text">
                                            ⏳ {Math.max(0, Math.ceil((bossSelectionPhase.expiresAt - now) / 1000))}s to agree!
                                        </span>
                                    </div>
                                )}

                                <h3 className="selection-title">🎯 Choose Your Challenge Together!</h3>
                                <p className="selection-subtitle">All players must select the same boss within 10 seconds</p>

                                <div className="boss-vote-grid">
                                    {[
                                        { level: 1, icon: "👹", name: "Slime King", wager: 100, prize: 300 },
                                        { level: 2, icon: "🗿", name: "Giga Golem", wager: 250, prize: 875 },
                                        { level: 3, icon: "🐲", name: "Fire Drake", wager: 500, prize: 2000 },
                                        { level: 4, icon: "🌑", name: "Void Titan", wager: 2500, prize: 12500 },
                                    ].map(boss => {
                                        const myVote = bossSelectionPhase?.playerVotes?.find(v => v.odId === userId)?.bossLevel;
                                        const isMyVote = myVote === boss.level;
                                        const votesForThis = bossSelectionPhase?.playerVotes?.filter(v => v.bossLevel === boss.level) || [];
                                        const canAfford = (user?.coins || 0) >= boss.wager;

                                        return (
                                            <button
                                                key={boss.level}
                                                className={`boss-vote-btn ${isMyVote ? 'is-my-vote' : ''} ${votesForThis.length > 0 ? 'has-votes' : ''}`}
                                                onClick={() => handleVoteBoss(boss.level)}
                                                disabled={!canAfford}
                                            >
                                                <span className="boss-icon">{boss.icon}</span>
                                                <span className="boss-name">{boss.name}</span>
                                                <span className="boss-wager">{boss.wager} 💎</span>
                                                <span className="boss-reward">Win {boss.prize}+</span>

                                                {/* Show who voted for this boss */}
                                                {votesForThis.length > 0 && (
                                                    <div className="vote-avatars">
                                                        {votesForThis.map(v => (
                                                            <span key={v.odId} className="vote-avatar" title={v.userName}>
                                                                {v.userAvatar}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {isMyVote && <span className="your-vote-badge">YOUR VOTE</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {bossSelectionPhase?.status === "expired" && (
                                    <div className="selection-expired">
                                        💨 Time's up! The boss escaped...
                                    </div>
                                )}
                            </div>
                        )}
                        {isFinished && (
                            <button className="btn btn-primary btn-large btn-replay" onClick={handleStartGame}>
                                🔄 Start New Match
                            </button>
                        )}
                    </div>
                </main>

                {/* Floating BINGO Button (Mobile) */}
                {(isPlaying || isBossBattleActive) && (
                    <button className="floating-bingo-btn" onClick={handleClaimBingo}>
                        <span className="fab-icon">🎉</span>
                        <span className="fab-text">BINGO!</span>
                    </button>
                )}

                {/* Floating Start Button (Mobile) */}
                {!isPlaying && !isFinished && (
                    <button className="floating-start-btn" onClick={handleStartGame}>
                        <span className="fab-icon">▶️</span>
                        <span className="fab-text">START</span>
                    </button>
                )}

                {/* Expanded Player Card Modal */}
                <AnimatePresence>
                    {expandedPlayer && (
                        <motion.div
                            className="expanded-card-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setExpandedPlayer(null)}
                        >
                            <motion.div
                                className="expanded-card-modal"
                                initial={{ scale: 0.8, y: 50 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.8, y: 50 }}
                                transition={{ type: "spring", damping: 25 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="expanded-card-header">
                                    <span className="expanded-avatar">{expandedPlayer.avatar}</span>
                                    <span className="expanded-name">{expandedPlayer.name}</span>
                                    <span className="expanded-distance">{expandedPlayer.distanceToBingo} to bingo</span>
                                    <button className="close-expanded" onClick={() => setExpandedPlayer(null)}>✕</button>
                                </div>
                                <div className="expanded-card-grid">
                                    <div className="expanded-header-row">
                                        {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                                            <div key={letter} className="expanded-header-cell">{letter}</div>
                                        ))}
                                    </div>
                                    {expandedPlayer.card?.map((row, rIdx) => (
                                        <div key={rIdx} className="expanded-row">
                                            {row.map((cell, cIdx) => (
                                                <div
                                                    key={`${rIdx}-${cIdx}`}
                                                    className={`expanded-cell ${cell.daubed ? 'daubed' : ''} ${cell.value === 'FREE' ? 'is-free' : ''}`}
                                                >
                                                    {cell.value === 'FREE' ? '⭐' : cell.value}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

