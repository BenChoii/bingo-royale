import React, { useMemo } from 'react';

// Mini sparkline component for showing player trends
// Generates a visual indicator based on player stats
export default function Sparkline({
    data = [],
    width = 60,
    height = 20,
    color = "#22c55e",
    showDot = true
}) {
    const points = useMemo(() => {
        if (!data || data.length === 0) return "";

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const scaleY = (val) => height - ((val - min) / range) * (height - 4) - 2;
        const scaleX = (i) => (i / (data.length - 1)) * (width - 4) + 2;

        return data.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(" ");
    }, [data, width, height]);

    const lastPoint = useMemo(() => {
        if (!data || data.length === 0) return null;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const x = width - 2;
        const y = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
        return { x, y };
    }, [data, width, height]);

    // Determine trend color
    const trendColor = useMemo(() => {
        if (!data || data.length < 2) return color;
        const start = data[0];
        const end = data[data.length - 1];
        if (end > start) return "#22c55e"; // Green - going up
        if (end < start) return "#ef4444"; // Red - going down
        return "#fbbf24"; // Yellow - flat
    }, [data, color]);

    if (!data || data.length < 2) {
        return <div style={{ width, height }} />;
    }

    return (
        <svg
            width={width}
            height={height}
            className="sparkline"
            style={{ display: 'block' }}
        >
            <polyline
                fill="none"
                stroke={trendColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
            {showDot && lastPoint && (
                <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r="2.5"
                    fill={trendColor}
                />
            )}
        </svg>
    );
}

// Helper to generate simulated trend data from player stats
export function generateTrendData(wins, totalGames, coins) {
    // Generate 10 data points showing a plausible trend
    const points = [];
    const winRate = totalGames > 0 ? wins / totalGames : 0.5;

    // Simulate 10 periods of activity
    for (let i = 0; i < 10; i++) {
        // Add some randomness but trend toward current win rate
        const baseValue = winRate * 100;
        const noise = (Math.random() - 0.5) * 20;
        const trend = ((i / 9) * (winRate * 100 - 30)) + 30; // Trend toward current
        const blended = (baseValue * 0.5) + (trend * 0.3) + noise;
        points.push(Math.max(0, Math.min(100, blended)));
    }

    return points;
}

// Generate gem trend (simulated history)
export function generateGemTrend(currentGems) {
    const points = [];
    // Simulate 10 periods trending toward current gems
    const target = currentGems;
    const startPoint = target * (0.3 + Math.random() * 0.4); // Start at 30-70% of current

    for (let i = 0; i < 10; i++) {
        const progress = i / 9;
        const base = startPoint + (target - startPoint) * progress;
        const noise = (Math.random() - 0.5) * (target * 0.1);
        points.push(Math.max(0, base + noise));
    }

    return points;
}
