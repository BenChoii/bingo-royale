import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import "./TournamentGate.css";

export default function TournamentGate({ userId, onClose, onOpenReferrals }) {
    const passStatus = useQuery(api.referrals.hasActiveTournamentPass, { userId });

    // If user has pass, don't show gate
    if (passStatus?.hasPass) {
        return null;
    }

    return (
        <motion.div
            className="gate-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="gate-modal"
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="gate-header">
                    <span className="gate-icon">🏆</span>
                    <h2>Tournament Access Required</h2>
                    <p>Unlock exclusive tournaments with massive prize pools!</p>
                </div>

                <div className="gate-options">
                    {/* The Smart Way */}
                    <div className="gate-option referral-option">
                        <div className="option-badge">The Smart Way</div>
                        <div className="option-content">
                            <span className="option-icon">🤝</span>
                            <h3>Invite 1 Friend</h3>
                            <p>When they play 3 games, you BOTH get 7 days free!</p>
                            <ul className="benefits">
                                <li>✓ 7-Day Tournament Pass</li>
                                <li>✓ Your friend gets one too!</li>
                                <li>✓ Unlimited referrals</li>
                            </ul>
                        </div>
                        <button className="option-btn primary" onClick={onOpenReferrals}>
                            Share Invite Code
                        </button>
                    </div>

                    <div className="option-divider">
                        <span>OR</span>
                    </div>

                    {/* Purchase Option */}
                    <div className="gate-option purchase-option">
                        <div className="option-content">
                            <span className="option-icon">💳</span>
                            <h3>Tournament Pass</h3>
                            <p>7 days of unlimited tournament access</p>
                        </div>
                        <button className="option-btn secondary">
                            $19.99 - Buy Now
                        </button>
                    </div>
                </div>

                {/* Social Proof */}
                <div className="social-proof">
                    <span className="proof-icon">🔥</span>
                    <span>247 players earned FREE access today!</span>
                </div>

                <button className="back-btn" onClick={onClose}>
                    Maybe Later
                </button>
            </motion.div>
        </motion.div>
    );
}
