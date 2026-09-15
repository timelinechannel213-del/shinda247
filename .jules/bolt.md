## 2025-09-15 - Throttling High-Frequency React State Updates

**Learning:** Invoking `setGameState` at 60Hz inside `requestAnimationFrame` causes severe component tree re-render overhead across all sub-components destructuring `gameState`. Decoupling high-frequency timing (via `elapsedRef.current`) from React state and throttling `setGameState` updates to ~100ms (~10Hz) cuts re-renders by ~83% without impacting frame rates.
**Action:** When handling real-time animation state in hooks, keep 60Hz precision in refs and throttle React state updates to 10Hz.
