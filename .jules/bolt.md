## 2025-05-20 - Decouple 60fps Socket Updates from React State
**Learning:** Calling `setState` inside a 60fps `requestAnimationFrame` loop in custom hooks like `useGameSocket` re-renders top-level views and all child components 60 times/sec, causing main-thread execution overhead and layout instability.
**Action:** Decouple animation loops from React state by storing real-time values in `useRef` and writing directly to DOM elements (`textContent`, `style`). Use `useLayoutEffect` to synchronize DOM elements after discrete React state transitions.
