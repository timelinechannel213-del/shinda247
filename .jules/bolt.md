## 2025-05-20 - Throttling WebSocket Ticker State Updates
**Learning:** Calling `setGameState` inside `requestAnimationFrame` at 60fps forces React to re-render the entire component tree 60 times a second. Throttling state updates to 100ms (10Hz) while updating an imperative `elapsedRef` at 60fps cuts re-renders by ~83% without impacting visual smoothness.
**Action:** Keep high-frequency ticks in mutable refs (`elapsedRef`) and only trigger React state setters at throttled display intervals (100ms).
