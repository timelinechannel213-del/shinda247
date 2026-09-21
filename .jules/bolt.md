## 2025-05-18 - Throttle React State Updates in Animation Loops

**Learning:** Updating React state inside `requestAnimationFrame` at 60Hz causes severe re-render churn across parent and child components (e.g. 60 FPS re-renders of the entire view tree). Throttling `setGameState` to ~100ms (10Hz) cuts component re-renders by ~83% while keeping high-frequency ref updates (`elapsedRef.current`) at 60Hz for smooth canvas/RAF rendering.

**Action:** Separate high-frequency state (used for animations) from React component state: update ref values at 60Hz for DOM/Canvas drawing loops, and throttle React state updates to 10Hz for reactive UI text/counters.
