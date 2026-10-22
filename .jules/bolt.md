## 2025-05-18 - Throttle 60fps React State Updates in WebSocket Ticker
**Learning:** Calling `setGameState` inside `requestAnimationFrame` on every tick at 60Hz forces full React re-renders across parent and sibling components. Throttling `setGameState` calls to 100ms (10Hz) reduces re-renders by ~83% while keeping canvas animations smooth when sub-components read refs or run independent RAF loops.
**Action:** Always decouple 60fps canvas/animation loops from React state setters. Update refs frame-by-frame and throttle React state updates to 100ms or higher.
