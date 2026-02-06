---
description: How to create animated intro/loading screens with Remotion
---

# Remotion Animation Workflow

Create professional animated loading/intro screens using Remotion within React projects.

## Prerequisites

- Node.js 14+
- Existing React project (Vite, Next.js, etc.)

## Installation

// turbo
```bash
npm install --save-exact @remotion/player @remotion/cli remotion
```

## Quick Setup

### 1. Create Animation Folder Structure

```
src/
└── remotion/
    ├── Intro.jsx          # Your animation composition
    ├── Root.jsx           # Register your compositions
    └── index.js           # Export compositions
```

### 2. Create Root.jsx

```jsx
import { Composition } from "remotion";
import { IntroAnimation } from "./Intro";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Intro"
      component={IntroAnimation}
      durationInFrames={90}   // 3 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

### 3. Create Your Animation (Intro.jsx)

```jsx
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const IntroAnimation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Spring animation for logo scale
  const scale = spring({ frame, fps, config: { damping: 10 } });
  
  // Fade in
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  
  return (
    <div style={{ 
      flex: 1, 
      background: "linear-gradient(135deg, #1a1a2e, #16213e)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ 
        transform: `scale(${scale})`,
        opacity,
        fontSize: 80,
        color: "white",
      }}>
        👑 BINGO ROYALE
      </div>
    </div>
  );
};
```

### 4. Use Player in Your App

```jsx
import { Player } from "@remotion/player";
import { IntroAnimation } from "./remotion/Intro";

function LoadingScreen({ onComplete }) {
  return (
    <Player
      component={IntroAnimation}
      durationInFrames={90}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={30}
      style={{ width: "100%", height: "100vh" }}
      autoPlay
      loop={false}
      onEnded={onComplete}
    />
  );
}
```

## Key Remotion APIs

### Animation Helpers

| Function | Purpose |
|----------|---------|
| `useCurrentFrame()` | Get current frame number |
| `useVideoConfig()` | Get fps, width, height |
| `spring()` | Physics-based animation |
| `interpolate()` | Map value ranges |
| `Sequence` | Time-based sections |
| `AbsoluteFill` | Full-screen container |

### Example: Staggered Text Animation

```jsx
import { Sequence, useCurrentFrame, spring } from "remotion";

export const StaggeredText = ({ text }) => {
  const frame = useCurrentFrame();
  
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {text.split("").map((char, i) => (
        <Sequence key={i} from={i * 3}>
          <span style={{ 
            transform: `translateY(${spring({ frame: frame - i * 3, fps: 30 }) * -20}px)`,
            opacity: spring({ frame: frame - i * 3, fps: 30 }),
          }}>
            {char}
          </span>
        </Sequence>
      ))}
    </div>
  );
};
```

## Render to Video (Optional)

// turbo
```bash
npx remotion render src/remotion/index.js Intro out/intro.mp4
```

## Tips

1. **Keep animations short** - 2-4 seconds for loading screens
2. **Use spring()** for natural motion
3. **Test with `loop={true}`** during development
4. **Add `onEnded` callback** to transition to your app
