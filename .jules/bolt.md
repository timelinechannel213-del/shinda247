# Bolt's Performance Journal

## 2025-05-20 - Throttling WebSocket high-frequency state updates
**Learning:** Updating React state at 60fps in a top-level hook (`useGameSocket`) triggers complete component tree re-renders, causing severe CPU load and jank. Direct DOM updates via Canvas / requestAnimationFrame using refs (`flyStartRef`, `elapsedRef`) allow 60fps visual rendering while React state updates can be safely throttled to ~10Hz (100ms).
**Action:** Decouple 60fps visual animations into refs/RAF direct DOM manipulation, and throttle top-level React state setters to ~100ms during continuous animation phases.
