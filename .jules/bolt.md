## 2025-05-18 - Throttle high-frequency React state updates during animation RAF ticker

**Learning:** Updating React state at 60fps inside `requestAnimationFrame` (`useGameSocket` ticker) causes excessive re-renders across the entire React component tree (e.g. `Home`, `Topbar`, `GameControls`, `GameCanvas`). Sub-components that draw frame-by-frame on HTML5 `<canvas>` should read directly from `elapsedRef.current` at 60Hz, while high-level React state (`gameState`) can be throttled to ~100ms (10Hz).

**Action:** In high-frequency animation loops or WebSockets, decouple React state updates from frame-rate execution. Keep high-frequency values in `useRef` for direct canvas or DOM manipulation, and update React state at ~10Hz for reactive React UI elements.
