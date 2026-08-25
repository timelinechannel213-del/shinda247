## 2025-08-25 - Decouple High-Frequency Updates from React State

**Learning:** High-frequency state updates (60fps animation loop in `useGameSocket`) trigger continuous re-render cascades across the entire React component tree (`Home`, `GameCanvas`, `GameControls`, `Topbar`, layout panels), leading to high CPU usage and dropped frames. In declarative component trees, high-frequency values should be stored in `useRef` and updated directly via DOM refs, while using `useLayoutEffect` to immediately re-sync manual DOM updates after React re-renders.

**Action:** Whenever handling 60fps animations or live timers in React, pass stable refs (e.g., `flyStartRef`) to child components and manipulate target DOM elements directly in `requestAnimationFrame` loops rather than calling `setState` at 60Hz.
