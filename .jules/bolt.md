## 2026-06-29 - High-frequency UI updates decoupled from React state
**Learning:** In real-time games with high-frequency updates (e.g., 60fps), using React state for every frame causes massive re-render overhead. Decoupling these updates by using `useRef` and direct DOM manipulation significantly improves performance.
**Action:** Use `useRef` and `requestAnimationFrame` for high-frequency UI updates. Use `useLayoutEffect` to synchronize the DOM with React state after re-renders to prevent visual 'flickering' or stale values.
