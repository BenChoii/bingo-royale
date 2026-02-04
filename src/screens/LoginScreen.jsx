import { SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import "./LoginScreen.css";

export default function LoginScreen() {
    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-header">
                    <span className="logo-icon">👑</span>
                    <h1>BINGO <span className="highlight">ROYALE</span></h1>
                    <p className="tagline">The Ultimate Multiplayer Bingo Experience</p>
                </div>

                <div className="login-actions">
                    <SignInButton mode="modal">
                        <button className="btn btn-primary btn-large">Sign In to Play</button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                        <button className="btn btn-secondary btn-large">Create Account</button>
                    </SignUpButton>
                </div>

                <div className="login-footer">
                    <p>🏆 Compete globally • 💬 Chat with players • 🔥 Build streaks</p>
                </div>
            </div>
        </div>
    );
}
