## 2025-05-20 - High-frequency WebSocket state throttling in game loop
**Learning:** Updating React state on every requestAnimationFrame frame (60Hz) causes unnecessary re-renders across parent and child components even when visual elements (canvas/rocket) rely on direct DOM manipulation or refs.
**Action:** Throttle high-frequency state updates in custom hooks (e.g. to ~10Hz / 100ms) while keeping a ref updated on every frame for sub-components that need real-time data without triggering React re-renders.
