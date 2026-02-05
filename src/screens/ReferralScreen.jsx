import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import "./ReferralScreen.css";

export default function ReferralScreen({ userId, onClose }) {
    const [copied, setCopied] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);

    // Queries - they return undefined while loading
    const referralCode = useQuery(api.referrals.getReferralCode, userId ? { userId } : "skip");
    const referralStats = useQuery(api.referrals.getReferralStats, userId ? { userId } : "skip");
    const myReferrals = useQuery(api.referrals.getMyReferrals, userId ? { userId } : "skip");
    const passStatus = useQuery(api.referrals.hasActiveTournamentPass, userId ? { userId } : "skip");

    // Mutation to create referral code
    const createReferralCode = useMutation(api.referrals.createReferralCode);

    // Auto-generate referral code for existing users who don't have one
    useEffect(() => {
        if (userId && referralCode === null && !generatingCode) {
            setGeneratingCode(true);
            createReferralCode({ userId })
                .then(() => setGeneratingCode(false))
                .catch((err) => {
                    console.error("Failed to create referral code:", err);
                    setGeneratingCode(false);
                });
        }
    }, [userId, referralCode, createReferralCode, generatingCode]);

    // Check if still loading
    const isLoading = referralCode === undefined || passStatus === undefined || generatingCode;

    const copyCode = () => {
        if (referralCode) {
            navigator.clipboard.writeText(referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareCode = async () => {
        if (referralCode && navigator.share) {
            try {
                await navigator.share({
                    title: "Join me in Bingo Royale!",
                    text: `Use my referral code ${referralCode} to get a free 7-day Tournament Pass! 🎱👑`,
                    url: `https://bingoroyale.app?ref=${referralCode}`,
                });
            } catch (e) {
                copyCode(); // Fallback to copy
            }
        } else {
            copyCode();
        }
    };

    // Calculate days remaining on pass
    const getDaysRemaining = () => {
        if (!passStatus?.hasPass) return null;
        if (passStatus.type === "permanent") return "∞";
        if (!passStatus.expiresAt) return null;
        const days = Math.ceil((passStatus.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const daysRemaining = getDaysRemaining();

    return (
        <motion.div
            className="referral-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="referral-modal"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="close-btn" onClick={onClose}>×</button>

                {isLoading ? (
                    <div className="referral-loading">
                        <span className="loading-emoji">🎰</span>
                        <p>Loading...</p>
                    </div>
                ) : (
                    <>
                        <div className="referral-header">
                            <span className="referral-icon">🤝</span>
                            <h2>The Bingo Crew</h2>
                            <p className="referral-subtitle">Invite friends, earn rewards together!</p>
                        </div>

                        {/* Pass Status */}
                        <div className={`pass-status ${passStatus?.hasPass ? "active" : "inactive"}`}>
                            {passStatus?.hasPass ? (
                                <>
                                    <div className="pass-badge">
                                        <span className="pass-type">
                                            {passStatus.type === "permanent" ? "👑 Royale Crown" :
                                                passStatus.type === "premium" ? "⭐ Premium Pass" : "🎟️ Tournament Pass"}
                                        </span>
                                        <span className="pass-source">via {passStatus.source}</span>
                                    </div>
                                    <div className="pass-expiry">
                                        {daysRemaining === "∞" ? (
                                            <span className="permanent">Lifetime Access</span>
                                        ) : (
                                            <span>{daysRemaining} days remaining</span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="no-pass">
                                    <span className="lock-icon">🔒</span>
                                    <span>No Tournament Pass</span>
                                    <span className="hint">Refer a friend to unlock!</span>
                                </div>
                            )}
                        </div>

                        {/* Referral Code Share */}
                        <div className="share-section">
                            <label>Your Referral Code</label>
                            <div className="code-display">
                                <span className="code">{referralCode || "Loading..."}</span>
                                <button
                                    className={`copy-btn ${copied ? "copied" : ""}`}
                                    onClick={copyCode}
                                >
                                    {copied ? "✓ Copied!" : "📋 Copy"}
                                </button>
                            </div>
                            <button className="share-btn" onClick={shareCode}>
                                <span>📤</span> Share Invite Link
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="referral-stats">
                            <div className="stat">
                                <span className="stat-number">{referralStats?.total || 0}</span>
                                <span className="stat-label">Total Invites</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">{referralStats?.pending || 0}</span>
                                <span className="stat-label">Pending</span>
                            </div>
                            <div className="stat highlight">
                                <span className="stat-number">{referralStats?.totalSuccessful || 0}</span>
                                <span className="stat-label">Activated</span>
                            </div>
                        </div>

                        {/* How It Works */}
                        <div className="how-it-works">
                            <h3>How The Handshake Works</h3>
                            <div className="steps">
                                <div className="step">
                                    <span className="step-num">1</span>
                                    <span>Share your code</span>
                                </div>
                                <div className="step">
                                    <span className="step-num">2</span>
                                    <span>Friend joins & plays 3 games</span>
                                </div>
                                <div className="step">
                                    <span className="step-num">3</span>
                                    <span>BOTH get 7-day Tournament Pass! 🎉</span>
                                </div>
                            </div>
                        </div>

                        {/* Referrals List */}
                        {myReferrals && myReferrals.length > 0 && (
                            <div className="referrals-list">
                                <h3>Your Crew</h3>
                                {myReferrals.map((ref) => (
                                    <div key={ref.id} className={`referral-item ${ref.status}`}>
                                        <span className="ref-avatar">{ref.refereeAvatar}</span>
                                        <div className="ref-info">
                                            <span className="ref-name">{ref.refereeName}</span>
                                            <span className="ref-level">Lvl {ref.refereeLevel}</span>
                                        </div>
                                        <div className="ref-status">
                                            {ref.status === "pending" ? (
                                                <div className="progress-ring">
                                                    <span>{ref.gamesPlayed}/{ref.gamesRequired}</span>
                                                    <span className="games-label">games</span>
                                                </div>
                                            ) : ref.status === "rewarded" ? (
                                                <span className="status-badge rewarded">✓ Rewarded</span>
                                            ) : (
                                                <span className="status-badge activated">Activated</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}
