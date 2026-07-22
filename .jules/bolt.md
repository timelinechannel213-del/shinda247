# Bolt's Performance Journal

## 2025-02-23 - Initial Profiling and Decoupling Pattern
**Learning:** High-frequency React state updates (60fps in `useGameSocket` and `GameCanvas` state) trigger massive layout recalculation and re-renders across the entire component tree, causing heavy CPU utilization and potential UI lag. Direct DOM manipulation using `useRef` and `requestAnimationFrame` decouples these high-frequency updates from React's render loop, ensuring smooth 60fps animations. Applying `useLayoutEffect` guarantees that these manual DOM modifications are re-applied immediately after any declarative React re-renders, preventing visual flickering/snapping.
**Action:** Decouple flight multiplier and rocket position updates from React state in `useGameSocket`, `GameCanvas`, and `GameControls`. Pass `flyStartRef` from `useGameSocket` down, and use direct DOM manipulation in `requestAnimationFrame` loops, coupled with `useLayoutEffect` synchronization on state transitions.
