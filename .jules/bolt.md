## 2025-05-20 - High-Frequency RAF State Throttling and Ref Decoupling
**Learning:** Calling React `setState` inside 60 FPS requestAnimationFrame loops (`useGameSocket` ticker and `GameCanvas` rocket position) triggers ~120 component re-renders per second across the application tree, causing excessive CPU usage and visual jitter.
**Action:** Throttle global WebSocket game state updates during the flight phase to ~100ms (~10Hz) and use direct DOM ref manipulation (`rocketRef.style.transform`/`left`/`top`) in RAF loops to preserve silky 60 FPS animations with ~83%+ fewer React re-renders.
