import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNotification } from "../components/Notifications";
import "./LuckyLineGame.css";

const GRID_SIZE = 5;
const ALL_LINES = [
    { row: 0, col: -1, direction: "row", label: "Row 1", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { row: 1, col: -1, direction: "row", label: "Row 2", cells: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]] },
    { row: 2, col: -1, direction: "row", label: "Row 3", cells: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]] },
    { row: 3, col: -1, direction: "row", label: "Row 4", cells: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]] },
    { row: 4, col: -1, direction: "row", label: "Row 5", cells: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]] },
    { row: -1, col: 0, direction: "col", label: "Col B", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    { row: -1, col: 1, direction: "col", label: "Col I", cells: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] },
    { row: -1, col: 2, direction: "col", label: "Col N", cells: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]] },
    { row: -1, col: 3, direction: "col", label: "Col G", cells: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]] },
    { row: -1, col: 4, direction: "col", label: "Col O", cells: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]] },
    { row: 0, col: 0, direction: "diag1", label: "Diag ↘", cells: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]] },
    { row: 0, col: 4, direction: "diag2", label: "Diag ↙", cells: [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]] },
];

export default function LuckyLineGame({ userId, gameId, onClose }) {
    const { showNotification } = useNotification();
    const [revealing, setRevealing] = useState(false);
    const [revealIndex, setRevealIndex] = useState(0);
    const [result, setResult] = useState(null);

    const game = useQuery(api.luckyline.getGame, gameId ? { gameId } : "skip");
    const drawLine = useMutation(api.luckyline.drawLine);
    const removeLine = useMutation(api.luckyline.removeLine);
    const revealWinner = useMutation(api.luckyline.revealWinner);

    const selectedLines = game?.lines || [];

    const handleSelectLine = async (line) => {
        if (selectedLines.length >= 5) {
            showNotification("Max 5 lines!", "error");
            return;
        }

        const exists = selectedLines.find(
            l => l.row === line.row && l.col === line.col && l.direction === line.direction
        );
        if (exists) {
            showNotification("Already selected!", "error");
            return;
        }

        const result = await drawLine({
            gameId,
            row: line.row,
            col: line.col,
            direction: line.direction,
        });

        if (!result.success) {
            showNotification(result.error, "error");
        }
    };

    const handleRemoveLine = async (index) => {
        await removeLine({ gameId, index });
    };

    const handleReveal = async () => {
        if (selectedLines.length === 0) {
            showNotification("Draw at least 1 line!", "error");
            return;
        }

        setRevealing(true);
        const res = await revealWinner({ gameId });

        if (res.success) {
            // Animate number reveals
            for (let i = 0; i < Math.min(res.calledNumbers.length, 30); i++) {
                await new Promise(r => setTimeout(r, 100));
                setRevealIndex(i + 1);
            }

            setResult(res);
            if (res.jackpot) {
                showNotification("🎉 JACKPOT! +2,000 Gems!", "success");
            } else if (res.reward > 0) {
                showNotification(`+${res.reward} Gems!`, "success");
            } else {
                showNotification("No match. Better luck next time!", "error");
            }
        } else {
            showNotification(res.error, "error");
            setRevealing(false);
        }
    };

    const isLineSelected = (line) => {
        return selectedLines.findIndex(
            l => l.row === line.row && l.col === line.col && l.direction === line.direction
        );
    };

    const isWinningLine = (line) => {
        if (!result?.winningLine) return false;
        return line.row === result.winningLine.row &&
            line.col === result.winningLine.col &&
            line.direction === result.winningLine.direction;
    };

    if (!game) {
        return (
            <div className="lucky-game-overlay">
                <div className="loading">Loading game...</div>
            </div>
        );
    }

    return (
        <motion.div
            className="lucky-game-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="lucky-game-modal"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
            >
                <div className="lucky-game-header">
                    <h2>🎲 Lucky Line</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="lucky-game-content">
                    {!revealing && !result && (
                        <>
                            <p className="instruction">
                                Select {5 - selectedLines.length} more line{5 - selectedLines.length !== 1 ? 's' : ''}
                            </p>

                            <div className="lines-selector">
                                {ALL_LINES.map((line, i) => {
                                    const selectedIdx = isLineSelected(line);
                                    const isSelected = selectedIdx >= 0;
                                    return (
                                        <motion.button
                                            key={i}
                                            className={`line-btn ${isSelected ? 'selected' : ''}`}
                                            onClick={() => isSelected ? handleRemoveLine(selectedIdx) : handleSelectLine(line)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {isSelected && <span className="pick-num">#{selectedIdx + 1}</span>}
                                            {line.label}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <div className="selected-lines">
                                <h4>Your Picks ({selectedLines.length}/5):</h4>
                                {selectedLines.length === 0 ? (
                                    <p className="empty">No lines selected</p>
                                ) : (
                                    <div className="picks-list">
                                        {selectedLines.map((line, i) => {
                                            const lineInfo = ALL_LINES.find(
                                                l => l.row === line.row && l.col === line.col && l.direction === line.direction
                                            );
                                            return (
                                                <motion.span
                                                    key={i}
                                                    className={`pick ${i === 0 ? 'jackpot' : ''}`}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                >
                                                    #{i + 1}: {lineInfo?.label}
                                                    {i === 0 && <span className="jackpot-tag">🏆</span>}
                                                </motion.span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <motion.button
                                className="reveal-btn"
                                onClick={handleReveal}
                                disabled={selectedLines.length === 0}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                🎰 REVEAL WINNER
                            </motion.button>
                        </>
                    )}

                    {revealing && !result && (
                        <div className="revealing">
                            <motion.div
                                className="ball-counter"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 0.3 }}
                            >
                                🎱 {revealIndex}
                            </motion.div>
                            <p>Drawing balls...</p>
                        </div>
                    )}

                    {result && (
                        <motion.div
                            className={`result ${result.jackpot ? 'jackpot' : result.reward > 0 ? 'win' : 'loss'}`}
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", damping: 15 }}
                        >
                            {result.jackpot ? (
                                <>
                                    <div className="result-icon">🎉</div>
                                    <h3>JACKPOT!</h3>
                                    <p className="reward">+2,000 Gems</p>
                                </>
                            ) : result.reward > 0 ? (
                                <>
                                    <div className="result-icon">✨</div>
                                    <h3>Match Found!</h3>
                                    <p className="reward">+{result.reward} Gems</p>
                                </>
                            ) : (
                                <>
                                    <div className="result-icon">😔</div>
                                    <h3>No Match</h3>
                                    <p className="reward">Better luck next time!</p>
                                </>
                            )}

                            <div className="result-details">
                                <p>Winning Line: {ALL_LINES.find(
                                    l => l.row === result.winningLine?.row &&
                                        l.col === result.winningLine?.col &&
                                        l.direction === result.winningLine?.direction
                                )?.label || "Unknown"}</p>
                            </div>

                            <button className="close-result-btn" onClick={onClose}>
                                Close
                            </button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
