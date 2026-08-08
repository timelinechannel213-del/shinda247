# Bolt's Performance Journal

This journal tracks critical learnings about performance optimizations.

## 2025-03-05 - Decoupled 60fps UI Updates from React State Management
**Learning:** In highly dynamic components (like real-time flight multiplier displays and 60fps canvas animations), updating standard React state inside high-frequency `requestAnimationFrame` loops triggers complete component and sibling re-renders. This results in heavy rendering/layout overhead and high CPU usage.
**Action:** Decouple frequent visual updates from declarative React state. Track the start timestamp or progress via stable `useRef`s, perform DOM mutations directly inside the RAF tick, and use `useLayoutEffect` to synchronize the manual DOM elements with the declarative React state immediately after any React-driven re-render.
