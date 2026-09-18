## 2026-09-18 - Throttle high-frequency React state updates in RAF loop
**Learning:** High-frequency React `setGameState` updates inside a `requestAnimationFrame` loop (60Hz) trigger full component tree re-renders across parent and child components every ~16.6ms, causing major VDOM diffing overhead.
**Action:** Throttle `setGameState` updates to ~100ms (~10Hz) during high-frequency animation phases while preserving 60Hz ref updates (`elapsedRef`) for sub-components that manage direct DOM/canvas rendering.
