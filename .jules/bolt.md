## 2025-05-18 - Direct DOM manipulation for 60fps canvas overlays
**Learning:** Updating React component state (`useState`) at 60fps inside `requestAnimationFrame` loops triggers complete component re-renders on every frame, causing unnecessary DOM reconciliation and high CPU usage.
**Action:** Decouple high-frequency overlay updates (such as animated rocket markers) from React state using `useRef` and direct DOM style updates, combined with `useLayoutEffect` to maintain visual consistency across React renders.
