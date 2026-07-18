# Bolt's Journal

## 2025-03-03 - Decoupling High-Frequency React State Updates
**Learning:** High-frequency (60fps) updates of React state in real-time games cause extreme CPU overhead and lag because they re-render the entire component tree. Using `useRef` to store real-time values and directly manipulating DOM elements in a requestAnimationFrame loop bypasses React's virtual DOM reconciliation entirely.
**Action:** When animating or displaying high-frequency values (like multipliers or coordinate offsets), do not store them in React state. Store them in refs, modify DOM elements directly, and use `useLayoutEffect` to synchronize the DOM state immediately after any declarative React re-render.
