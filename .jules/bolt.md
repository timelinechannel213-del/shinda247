## 2025-05-20 - Bypassing 60 FPS React re-renders with direct DOM updates
**Learning:** Updating React state (e.g. `useState`) inside a 60 FPS `requestAnimationFrame` loop causes significant component re-rendering overhead and unnecessary layout thrashing.
**Action:** Use `useRef` to target animated DOM elements directly and update their style properties (such as `left`, `top`, `transform`, `display`) inside the RAF loop.
