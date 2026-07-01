## 2026-07-01 - [Decouple high-frequency UI updates from React state]
**Learning:** High-frequency React state updates (e.g., 60fps for a multiplier counter) trigger massive re-render overhead across the component tree, leading to CPU spikes and potential UI lag.
**Action:** Always prefer direct DOM updates via `useRef` and `requestAnimationFrame` for animation-related values. Use `useLayoutEffect` to re-apply manual updates after any declarative React re-renders to prevent visual 'flickering' or 'snapping' to stale state.
