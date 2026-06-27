## 2026-06-27 - Decouple high-frequency multiplier updates from React state
**Learning:** High-frequency React state updates (e.g., 60fps in useGameSocket) trigger massive re-render overhead across the component tree. Always prefer direct DOM updates via refs for animation-related values.
**Action:** Use refs and direct DOM manipulation for values that change every frame, and useLayoutEffect to ensure DOM consistency after React re-renders.
