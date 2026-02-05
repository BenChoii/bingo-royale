import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNotification } from "../components/Notifications";
import WelcomeDialog from "../components/WelcomeDialog";
import Sparkline, { generateTrendData } from "../components/Sparkline";
import ShopScreen from "./ShopScreen";
import LuckyLineGame from "./LuckyLineGame";
import "./LobbyScreen.css";
import { UserButton } from "@clerk/clerk-react";

const MODE_DETAILS = {
    classic: "Standard 75-ball bingo. The first player to complete a single row, column, or diagonal wins the pool!",
    speed: "Balls are called twice as fast! You'll need lightning reflexes and smart power-up usage to keep up.",
    pattern: "A random unique pattern is selected (X, Box, or Cross). You must match the pattern exactly to win.",
    blackout: "The ultimate Royale challenge. You must daub every single number on your card to claim victory."
};

export default function LobbyScreen({ userId, onJoinRoom, onLogout }) {
    const [roomCode, setRoomCode] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomMode, setNewRoomMode] = useState("classic");
    const [newRoomBuyIn, setNewRoomBuyIn] = useState(0);
    const [isJoining, setIsJoining] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [luckyGameId, setLuckyGameId] = useState(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const { showNotification } = useNotification();

    const user = useQuery(api.users.getUser, { userId: userId });
    const publicRooms = useQuery(api.rooms.getPublicRooms);
    const leaderboard = useQuery(api.leaderboard.getLeaderboard, { period: "alltime", limit: 5 });

    const createRoom = useMutation(api.rooms.createRoom);
    const joinRoom = useMutation(api.rooms.joinRoom);
    const claimDailyReward = useMutation(api.daily.claimDailyReward);
    const canClaimReward = useQuery(api.daily.canClaimReward, { userId });
    const challenges = useQuery(api.challenges.getTodaysChallenges, { userId });
    const currentLuckyGame = useQuery(api.luckyline.getCurrentGame, { userId });

    // Show welcome dialog for new users
    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem(`bingo_welcome_${userId}`);
        if (!hasSeenWelcome && user) {
            setShowWelcome(true);
        }
    }, [userId, user]);

    const handleWelcomeComplete = () => {
        localStorage.setItem(`bingo_welcome_${userId}`, "true");
        setShowWelcome(false);
    };

    const handleTopUp = async () => {
        try {
            const result = await claimDailyReward({ userId });
            if (result.success) {
                showNotification(`Top-up successful! Received ${result.amount} Gems. 💎`, "success");
            } else {
                showNotification(result.error || "Failed to claim Top-up", "error");
            }
        } catch (error) {
            showNotification("Failed to claim reward", "error");
        }
    };

    const handleCreateRoom = async () => {
        if (!newRoomName.trim()) return;

        try {
            const result = await createRoom({
                hostId: userId,
                name: newRoomName.trim(),
                mode: newRoomMode,
                maxPlayers: 10,
                buyIn: newRoomBuyIn,
                isPrivate: false,
            });

            if (result.success) {
                // Auto-join the room we created
                await joinRoom({ code: result.code, userId: userId });
                onJoinRoom(result.roomId);
            } else {
                showNotification(result.error || "Failed to create room", "error");
            }
        } catch (error) {
            console.error("Failed to create room:", error);
            showNotification("Connection error. Try again.", "error");
        }
    };

    const handleJoinByCode = async () => {
        if (!roomCode.trim()) return;
        setIsJoining(true);

        try {
            const result = await joinRoom({ code: roomCode.trim().toUpperCase(), userId: userId });
            if (result.success) {
                onJoinRoom(result.roomId);
            } else {
                showNotification(result.error || "Failed to join room", "error");
            }
        } catch (error) {
            console.error("Failed to join room:", error);
        }
        setIsJoining(false);
    };

    const handleJoinPublicRoom = async (room) => {
        setIsJoining(true);
        try {
            const result = await joinRoom({ code: room.code, userId: userId });
            if (result.success) {
                onJoinRoom(result.roomId);
            } else {
                showNotification(result.error || "Failed to join room", "error");
            }
        } catch (error) {
            console.error("Failed to join room:", error);
            showNotification("Connection error. Try again.", "error");
        }
        setIsJoining(false);
    };

    return (
        <div className="lobby-screen">
            {/* Welcome Dialog for New Users */}
            {showWelcome && <WelcomeDialog onComplete={handleWelcomeComplete} />}

            {/* Header */}
            <header className="lobby-header">
                <div className="logo">
                    <span>👑</span>
                    <h1>BINGO ROYALE</h1>
                </div>
                {user && (
                    <div className="user-info">
                        <UserButton />
                        <div className="user-details">
                            <div className="user-top-row">
                                <span className="user-name">{user.name}</span>
                                <span className="user-level">Lvl {user.level}</span>
                            </div>
                            <div className="xp-bar-container">
                                <div
                                    className="xp-bar-fill"
                                    style={{ width: `${(user.xp / user.xpToNext) * 100}%` }}
                                />
                                <span className="xp-text">{user.xp}/{user.xpToNext} XP</span>
                            </div>
                            <div className="currency-info">
                                <span className="user-coins">💎 {user.coins?.toLocaleString()} Gems</span>
                                {user.currentStreak > 0 && <span className="user-streak">🔥 {user.currentStreak}</span>}
                                {canClaimReward?.canClaim && (
                                    <button className="claim-reward-btn anim-bounce" onClick={handleTopUp}>
                                        🎁 Daily
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <div className="lobby-content">
                {/* Quick Actions */}
                <section className="quick-actions">
                    <div className="join-code-box">
                        <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            placeholder="Enter Room Code"
                            maxLength={6}
                            className="code-input"
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleJoinByCode}
                            disabled={roomCode.length < 6 || isJoining}
                        >
                            Join
                        </button>
                    </div>

                    <button
                        className="btn btn-accent btn-large"
                        onClick={() => setShowCreate(true)}
                    >
                        <span>➕</span> Create Room
                    </button>

                    <motion.button
                        className="btn btn-shop btn-large"
                        onClick={() => setShowShop(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span>💎</span> Shop
                    </motion.button>
                </section>

                {/* Public Rooms */}
                <section className="rooms-section">
                    <h2>🌐 Public Rooms</h2>
                    <div className="rooms-grid">
                        {publicRooms?.length === 0 && (
                            <div className="empty-state">
                                <p>No public rooms available</p>
                                <p className="hint">Create one to get started!</p>
                            </div>
                        )}
                        {publicRooms?.map((room) => {
                            // Calculate prize pool
                            const prizePool = room.buyIn > 0 ? room.buyIn * room.playerCount : 0;
                            const isBossBattle = room.mode === "blackout" || room.mode === "pattern";

                            // Determine status badge
                            const getStatusBadge = () => {
                                if (room.status === "playing") {
                                    if (isBossBattle) {
                                        return <span className="status-badge boss">👹 Boss Fight!</span>;
                                    }
                                    return <span className="status-badge playing">🔴 LIVE</span>;
                                }
                                if (room.playerCount >= room.maxPlayers * 0.8) {
                                    return <span className="status-badge filling">🔥 Almost Full!</span>;
                                }
                                if (room.playerCount > 1) {
                                    return <span className="status-badge waiting">⏳ Waiting...</span>;
                                }
                                return <span className="status-badge new">✨ New</span>;
                            };

                            return (
                                <div key={room._id} className={`room-card ${room.status} ${isBossBattle ? "boss-room" : ""}`}>
                                    <div className="room-header">
                                        <div className="room-header-top">
                                            <span className="room-mode">{getModeIcon(room.mode)}</span>
                                            {getStatusBadge()}
                                        </div>
                                        <span className="room-name">{room.name}</span>
                                    </div>

                                    <div className="room-info">
                                        <span>👥 {room.playerCount}/{room.maxPlayers}</span>
                                        <span>🎮 {room.mode}</span>
                                    </div>

                                    {/* Buy-in and Prize Display */}
                                    <div className="room-stakes">
                                        {room.buyIn > 0 ? (
                                            <>
                                                <div className="stake-item buy-in">
                                                    <span className="stake-label">Entry</span>
                                                    <span className="stake-value">💎 {room.buyIn.toLocaleString()}</span>
                                                </div>
                                                <div className="stake-item prize">
                                                    <span className="stake-label">Prize Pool</span>
                                                    <span className="stake-value prize-amount">🏆 {prizePool.toLocaleString()}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="stake-item free">
                                                <span className="free-badge">🆓 Free Play</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className={`btn ${room.status === "playing" ? "btn-accent pulse-glow" : "btn-secondary"}`}
                                        onClick={() => handleJoinPublicRoom(room)}
                                        disabled={isJoining}
                                    >
                                        {room.status === "playing" ? "🎮 Spectate" : "Join Lobby"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Leaderboard Preview */}
                <section className="leaderboard-section">
                    <h2>🏆 Top Players</h2>
                    <div className="leaderboard-list">
                        {leaderboard?.map((player, index) => {
                            const trendData = generateTrendData(player.wins, player.totalGames || player.wins + 5, 0);
                            const totalGames = player.totalGames || player.wins + (player.losses || 5);
                            const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;

                            return (
                                <div key={player.odId} className="leaderboard-row">
                                    <span className="rank">{getRankEmoji(index + 1)}</span>
                                    <span className="player-avatar">{player.avatar}</span>
                                    <span className="player-name">{player.name}</span>
                                    <div className="player-trend">
                                        <Sparkline data={trendData} width={50} height={18} />
                                    </div>
                                    <div className="player-stats">
                                        <span className="player-wins">{player.wins} wins</span>
                                        <span className={`player-winrate ${winRate >= 50 ? "good" : "low"}`}>
                                            {winRate}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            {/* Create Room Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal room-create-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>🏰 Build Your Room</h2>

                        <div className="modal-scroll-area">
                            <div className="form-group">
                                <label>What's the name of your empire?</label>
                                <input
                                    type="text"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    placeholder="Enter Room Name..."
                                    maxLength={30}
                                />
                            </div>

                            <div className="form-group">
                                <label>Choose Your Battleground</label>
                                <div className="mode-buttons">
                                    {["classic", "speed", "pattern", "blackout"].map((mode) => (
                                        <button
                                            key={mode}
                                            className={`mode-btn ${newRoomMode === mode ? "active" : ""}`}
                                            onClick={() => setNewRoomMode(mode)}
                                        >
                                            <span className="m-icon">{getModeIcon(mode)}</span>
                                            <span className="m-label">{mode}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="mode-description">
                                    {MODE_DETAILS[newRoomMode]}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Entrance Fee (Buy-In)</label>
                                <div className="buyin-buttons">
                                    {[0, 50, 100, 250].map((amount) => (
                                        <button
                                            key={amount}
                                            className={`buyin-btn ${newRoomBuyIn === amount ? "active" : ""}`}
                                            onClick={() => setNewRoomBuyIn(amount)}
                                        >
                                            {amount === 0 ? "Free" : `💎 ${amount}`}
                                        </button>
                                    ))}
                                </div>
                                <p className="buyin-hint">
                                    {newRoomBuyIn === 0
                                        ? "Anyone can join! Winner gets a 10 Gem Royale Bonus."
                                        : `Competitive! Each player contributes 💎 ${newRoomBuyIn} to the prize pool.`}
                                </p>
                            </div>

                            <div className="powerup-info-box">
                                <label>⚡ Power-ups Included:</label>
                                <div className="p-list-mini">
                                    <span>🎯 Quick Daub</span>
                                    <span>👁️ Peek</span>
                                    <span>🃏 Wild</span>
                                    <span>✨ 2x XP</span>
                                </div>
                                <p>Use your Gems mid-game to gain a massive advantage!</p>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                                Abort
                            </button>
                            <button
                                className="btn btn-accent"
                                onClick={handleCreateRoom}
                                disabled={!newRoomName.trim()}
                            >
                                Start Tournament
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shop Modal */}
            <AnimatePresence>
                {showShop && (
                    <ShopScreen
                        userId={userId}
                        onClose={() => setShowShop(false)}
                    />
                )}
            </AnimatePresence>

            {/* Lucky Line Modal */}
            <AnimatePresence>
                {(luckyGameId || currentLuckyGame) && (
                    <LuckyLineGame
                        userId={userId}
                        gameId={luckyGameId || currentLuckyGame?._id}
                        onClose={() => setLuckyGameId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function getModeIcon(mode) {
    switch (mode) {
        case "classic": return "🎱";
        case "speed": return "⚡";
        case "pattern": return "✨";
        case "blackout": return "🌙";
        default: return "🎱";
    }
}

function getRankEmoji(rank) {
    switch (rank) {
        case 1: return "🥇";
        case 2: return "🥈";
        case 3: return "🥉";
        default: return `#${rank}`;
    }
}
